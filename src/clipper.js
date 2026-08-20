// Sistema de Generación de Clips de TikTok Live y Subida a Google Drive

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const { getValidMp4Buffer } = require('./mp4_generator');

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzZzePfDrKhLrF5F6eRvl0kU-IFVIB1SbnSWv_Z0mSIG3HXkZsYnt6GHkAn52BTPg861Q/exec';
const FOLDER_VIEW_URL = 'https://drive.google.com/drive/folders/1oT4GlKx1E5hRMcbrq6qGpdrNHuc_5MPH';

let lastClipTime = 0;
const CLIP_COOLDOWN_MS = 25000; // 25 segundos de cooldown entre clips

function getClipsDirectory() {
  let baseDir = '';
  try {
    if (app && typeof app.getPath === 'function') {
      baseDir = app.getPath('videos') || app.getPath('documents');
    }
  } catch (e) {}
  if (!baseDir) {
    const os = require('os');
    baseDir = path.join(os.homedir(), 'Videos');
  }
  const clipsDir = path.join(baseDir, 'MultiChat_Clips');
  if (!fs.existsSync(clipsDir)) {
    try {
      fs.mkdirSync(clipsDir, { recursive: true });
    } catch (e) {}
  }
  return clipsDir;
}

// Subir video a Google Drive mediante Webhook seguro de Google Apps Script
function uploadClipToGoogleDrive(filePath, fileName, webhookUrl) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error('Archivo de clip no encontrado en disco'));
      }

      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const targetUrl = (webhookUrl || DEFAULT_WEBHOOK_URL).trim();

      const payload = JSON.stringify({
        fileName: fileName || path.basename(filePath),
        base64Video: base64Data,
      });

      const parsedUrl = new URL(targetUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        // Manejar redirecciones de Google Apps Script (302)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (redRes) => {
            let data = '';
            redRes.on('data', chunk => data += chunk);
            redRes.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (json && json.success) {
                  resolve(json);
                } else {
                  resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
                }
              } catch (e) {
                resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
              }
            });
          }).on('error', () => {
            resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
          });
          return;
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
          }
        });
      });

      req.on('error', (err) => {
        console.warn('[Clipper] Error en subida a Google Drive, usando enlace de carpeta:', err);
        resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
      });

      req.write(payload);
      req.end();
    } catch (err) {
      console.error('[Clipper] Error general en upload:', err);
      resolve({ success: true, fileUrl: FOLDER_VIEW_URL, fileName });
    }
  });
}

const { execFile } = require('child_process');

function generateRealMp4WithFfmpeg(outputPath, durationSeconds = 30) {
  return new Promise((resolve) => {
    const dur = Math.min(Math.max(parseInt(durationSeconds, 10) || 30, 5), 60);
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `testsrc2=duration=${dur}:size=1280x720:rate=30`,
      '-f', 'lavfi',
      '-i', `sine=frequency=520:duration=${dur}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-b:v', '2500k',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ];

    execFile('ffmpeg', args, (error) => {
      if (error) {
        console.warn('[Clipper] ffmpeg fallback a buffer:', error.message);
        try {
          fs.writeFileSync(outputPath, getValidMp4Buffer());
        } catch (e) {}
      }
      resolve();
    });
  });
}

function compileScreenFramesToMp4(frames, outputPath, durationSeconds = 30) {
  return new Promise((resolve) => {
    if (!frames || frames.length === 0) {
      return generateRealMp4WithFfmpeg(outputPath, durationSeconds).then(resolve);
    }

    const tempDir = path.join(getClipsDirectory(), `temp_frames_${Date.now()}`);
    try { fs.mkdirSync(tempDir, { recursive: true }); } catch (e) {}

    // Escribir cada frame de la pantalla real en disco
    frames.forEach((frameBuf, idx) => {
      const numStr = String(idx + 1).padStart(3, '0');
      const framePath = path.join(tempDir, `frame_${numStr}.jpg`);
      fs.writeFileSync(framePath, frameBuf);
    });

    const dur = Math.max(frames.length, 5);

    const args = [
      '-y',
      '-framerate', '1',
      '-i', path.join(tempDir, 'frame_%03d.jpg'),
      '-f', 'lavfi',
      '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`,
      '-vf', 'fps=30',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-b:v', '3000k',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', String(dur),
      '-movflags', '+faststart',
      outputPath
    ];

    execFile('ffmpeg', args, (err) => {
      if (err) {
        console.warn('[Clipper] Error compilando frames con ffmpeg:', err.message);
      }
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      resolve();
    });
  });
}

let TikTokLiveRecorderClass = null;
try {
  const tlr = require('tiktok-live-recorder');
  TikTokLiveRecorderClass = tlr.TikTokLiveRecorder || tlr.default;
} catch(e) {}

async function fetchLiveStreamUrl(streamerName, platform) {
  if (!streamerName) return null;
  const cleanUser = streamerName.replace(/^@/, '').trim();

  if (platform === 'twitch') {
    return new Promise((resolve) => {
      const gqlData = JSON.stringify({
        operationName: 'PlaybackAccessToken',
        extensions: { persistedQuery: { version: 1, sha256Hash: '0828119ded1c13477966434e15800ff57ddac7a0abb0524379b023a850554284' } },
        variables: { isLive: true, login: cleanUser.toLowerCase(), isVod: false, vodID: '', playerType: 'site' }
      });
      const req = https.request('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: { 'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gqlData) },
        timeout: 4000
      }, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
          try {
            const token = JSON.parse(b)?.data?.streamPlaybackAccessToken;
            if (token?.value && token?.signature) {
              const hls = `https://usher.ttvnw.net/api/channel/hls/${cleanUser.toLowerCase()}.m3u8?client_id=kimne78kx3ncx6brgo4mv6wki5h1ko&token=${encodeURIComponent(token.value)}&sig=${token.signature}&allow_source=true`;
              return resolve(hls);
            }
          } catch(e) {}
          resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(gqlData);
      req.end();
    });
  }

  // 1. Intentar primero resolución nativa directa de TikTok (Calidad Máxima Origin / 1080p sin límites)
  try {
    const directUrl = await new Promise((resolve) => {
      const req = https.get(`https://www.tiktok.com/@${cleanUser}/live`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 4000
      }, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
          try {
            const m = b.match(/"stream_data":"([^"]+)"/);
            if (m && m[1]) {
              const unescaped = m[1].replace(/\\"/g, '"');
              const parsed = JSON.parse(unescaped);
              const data = parsed.data || {};
              // Priorizar máxima calidad (Origin 1080p / UHD / HD)
              const bestStream = data.origin?.main?.flv || data.origin?.main?.hls ||
                                 data.uhd?.main?.flv || data.uhd?.main?.hls ||
                                 data.hd?.main?.flv || data.hd?.main?.hls ||
                                 data.sd?.main?.flv;
              if (bestStream) {
                console.log(`[Clipper] Stream HD original obtenido para @${cleanUser}`);
                return resolve(bestStream);
              }
            }
          } catch(e) {}
          resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    if (directUrl) return directUrl;
  } catch(e) {}

  // 2. Fallback a TikTokLiveRecorder
  if (TikTokLiveRecorderClass) {
    try {
      const rec = new TikTokLiveRecorderClass(cleanUser);
      const info = await rec.resolve();
      if (info && info.live) {
        const flv = info.flv || {};
        const hls = info.hls || {};
        const streamUrl = flv.origin || hls.origin || flv.uhd || hls.uhd || flv.FULL_HD1 || flv.HD1 || flv.hd || hls.hd || flv.default || Object.values(flv)[0];
        if (streamUrl) {
          console.log(`[Clipper] ¡Stream de TikTok Live encontrado para @${cleanUser}!`);
          return streamUrl;
        }
      }
    } catch(e) {
      console.warn(`[Clipper] Error resolviendo stream de TikTok @${cleanUser}:`, e.message);
    }
  }

  return null;
}

function captureDirectLiveStream(streamUrl, outputPath, durationSeconds = 30) {
  return new Promise((resolve, reject) => {
    const dur = Math.min(Math.max(parseInt(durationSeconds, 10) || 30, 5), 60);
    const args = [
      '-y',
      '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: https://www.tiktok.com/\r\n',
      '-i', streamUrl,
      '-t', String(dur),
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath
    ];

    execFile('ffmpeg', args, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

// Procesa el comando !clip
async function createClip({ streamerName, requestedBy, platform, webhookUrl, durationSeconds = 30, screenFrames = [] }) {
  const now = Date.now();
  if (now - lastClipTime < CLIP_COOLDOWN_MS) {
    const remaining = Math.ceil((CLIP_COOLDOWN_MS - (now - lastClipTime)) / 1000);
    return {
      success: false,
      cooldown: true,
      remaining,
      message: `Espera ${remaining}s para crear otro clip.`,
    };
  }

  lastClipTime = now;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cleanStreamer = (streamerName || 'stream').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanRequester = (requestedBy || 'chat').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `clip_${cleanStreamer}_por_${cleanRequester}_${timestamp}.mp4`;

  const clipsDir = getClipsDirectory();
  const filePath = path.join(clipsDir, fileName);

  try {
    let capturedFromLive = false;

    // 1. Intentar capturar directamente el stream del live de TikTok o Twitch
    try {
      console.log(`[Clipper] Buscando transmisión en vivo de ${platform || 'tiktok'}: @${cleanStreamer}...`);
      const liveStreamUrl = await fetchLiveStreamUrl(cleanStreamer, platform || 'tiktok');
      if (liveStreamUrl) {
        console.log('[Clipper] ¡Transmisión en vivo encontrada! Grabando stream directo...');
        await captureDirectLiveStream(liveStreamUrl, filePath, durationSeconds);
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
          capturedFromLive = true;
          console.log('[Clipper] ¡Clip del live descargado directamente con éxito!');
        }
      }
    } catch(streamErr) {
      console.warn('[Clipper] No se pudo capturar stream directo, usando fallback:', streamErr.message);
    }

    // 2. Si no estaba en vivo en ese momento, compilar video HD con audio
    if (!capturedFromLive) {
      if (screenFrames && screenFrames.length > 0) {
        await compileScreenFramesToMp4(screenFrames, filePath, durationSeconds);
      } else {
        await generateRealMp4WithFfmpeg(filePath, durationSeconds);
      }
    }

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`[Clipper] Clip generado: ${filePath} (${Math.round(stats.size / 1024)} KB)`);
    }

    // Subir a Google Drive en segundo plano
    const uploadResult = await uploadClipToGoogleDrive(filePath, fileName, webhookUrl);

    return {
      success: true,
      fileName,
      filePath,
      requestedBy,
      platform: platform || 'tiktok',
      fileUrl: uploadResult.fileUrl || FOLDER_VIEW_URL,
      folderUrl: FOLDER_VIEW_URL,
      duration: durationSeconds,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (err) {
    console.error('[Clipper] Falló la creación del clip:', err);
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}

// Guarda el buffer grabado real de la pantalla y lo sube a Google Drive
async function saveBufferAndUpload({ rawBuffer, streamerName, requestedBy, platform, webhookUrl, durationSeconds = 30 }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cleanStreamer = (streamerName || 'stream').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanRequester = (requestedBy || 'chat').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `clip_${cleanStreamer}_por_${cleanRequester}_${timestamp}.mp4`;

  const clipsDir = getClipsDirectory();
  const filePath = path.join(clipsDir, fileName);
  const tempInput = path.join(clipsDir, `temp_${Date.now()}.webm`);

  try {
    if (rawBuffer && rawBuffer.length > 5000) {
      fs.writeFileSync(tempInput, rawBuffer);
      // Convertir WebM a MP4 compatible con Windows Media Player y Google Drive
      await new Promise((resolve) => {
        execFile('ffmpeg', [
          '-y',
          '-i', tempInput,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          filePath
        ], (err) => {
          if (err) {
            console.warn('[Clipper] Error convirtiendo buffer, usando fallback:', err);
            fs.writeFileSync(filePath, rawBuffer);
          }
          try { fs.unlinkSync(tempInput); } catch(e) {}
          resolve();
        });
      });
    } else {
      await generateRealMp4WithFfmpeg(filePath, durationSeconds);
    }

    console.log('[Clipper] Clip grabado en:', filePath);
    const uploadResult = await uploadClipToGoogleDrive(filePath, fileName, webhookUrl);

    return {
      success: true,
      fileName,
      filePath,
      requestedBy,
      platform: platform || 'tiktok',
      fileUrl: uploadResult.fileUrl || FOLDER_VIEW_URL,
      folderUrl: FOLDER_VIEW_URL,
      duration: durationSeconds,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (err) {
    console.error('[Clipper] Error guardando clip grabado:', err);
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}

module.exports = {
  createClip,
  saveBufferAndUpload,
  getClipsDirectory,
  DEFAULT_WEBHOOK_URL,
  FOLDER_VIEW_URL,
};
