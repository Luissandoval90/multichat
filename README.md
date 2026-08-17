# Multi Chat Overlay Pro

App de escritorio (Electron) para streamers y creadores de contenido que unifica en **una sola ventana transparente siempre visible** el chat y eventos en vivo de **TikTok, Twitch, Kick y YouTube** simultáneamente.

---

## ✨ Características Principales

- 🌟 **Alerta de Nuevos Seguidores (Follow Alert)**:
  - Tarjeta animada flotante con efecto glow y pop-in.
  - Muestra la foto de perfil (avatar), el nombre del seguidor y la insignia de la plataforma.
  - **Sonido de alerta (chime)** nítido y claro generado en tiempo real.
- ⚡ **Auto-Conexión y Guardado Automático**:
  - Guarda automáticamente tus canales, usuarios, claves de API (TikTool / Twitch) y preferencias.
  - Al abrir el programa, se conecta de inmediato a todas tus redes sin tener que reescribir nada.
- 📺 **Multi-Plataforma 4 en 1**:
  - **TikTok Live**: Chat, emotes, regalos reales y eventos de follow.
  - **Twitch**: Chat anónimo, emotes oficiales, bits, suscripciones, subgifts y avatares.
  - **Kick**: Chat mediante WebSocket en tiempo real, emotes de canal y eventos de comunidad.
  - **YouTube Live**: Chat en directo y SuperChats (usando `@canal`, enlace del directo o ID).
- 🔊 **Lectura por Voz (TTS - Text to Speech)**:
  - Lee los mensajes de chat en voz alta con la voz del sistema, omitiendo comandos de bots.
- 🛡️ **Filtro Anti-Spam / Comandos**:
  - Opción para ocultar comandos de bots tipo `!sr`, `!comandos`, etc.
- 🖱️ **Controles y Atajos de Teclado**:
  - `Ctrl + Alt + T`: Activa/desactiva **clic-a-través** (los clics pasan directamente al juego).
  - `Ctrl + Alt + ↑ / ↓`: Aumenta o disminuye la opacidad del fondo.
  - `Ctrl + Alt + → / ←`: Mueve la ventana horizontalmente.
  - Botón **★**: Prueba la animación y el sonido de nuevo seguidor en cualquier momento.
  - `F12`: Abre la consola de depuración si es necesario.

---

## 🚀 Uso Rápido

1. Haz doble clic en **`iniciar.bat`**.
2. Marca las casillas de las plataformas que desees, escribe tus usuarios o canales y dale a **Guardar y Conectar**.
3. ¡Listo! La próxima vez que abras el programa se conectará solo automáticamente.

---

## 📁 Estructura del Proyecto

```
multichat/
├── main.js                  # Proceso principal de Electron y atajos globales
├── preload.js               # Puente IPC seguro
├── overlay.html             # Interfaz semántica y limpia
├── styles/
│   ├── style.css            # Estilos base, barra de título y panel de ajustes
│   ├── chat.css             # Estilos de mensajes, avatares y emotes
│   └── alerts.css           # Animaciones y diseño de alertas de seguidores
├── src/
│   ├── renderer.js          # Lógica principal del overlay
│   ├── audio.js             # Generador Web Audio API para alertas sonoras
│   ├── storage.js           # Guardado y carga de configuración
│   └── tts.js               # Lectura por voz de mensajes (TTS)
├── platforms/
│   ├── tiktok.js            # Conexión TikTok Live
│   ├── twitch.js            # Conexión Twitch Chat & Helix
│   ├── kick.js              # Conexión Kick Pusher WebSocket
│   └── youtube.js           # Conexión YouTube Live Chat
├── iniciar.bat              # Script de ejecución
└── package.json             # Dependencias y configuración de compilación
```
