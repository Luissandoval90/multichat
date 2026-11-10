# MultiChat

Versión 3.1.4: botón Bloquear para jugar. El bloqueo pasa los clics al juego, desactiva el foco, el arrastre y el cambio de tamaño. Ctrl + Alt + T permite desbloquear desde el juego. El estado se indica en la ventana y se inicia desbloqueado al abrir la aplicación.

Versión 3.1.3: audiencia de Twitch mediante la cuenta autorizada en Música o credenciales de aplicación, con actualización cada 30 segundos. Si no hay datos, aparece un guion y una indicación para conectar Twitch; el total indica cuando está incompleto. Los errores de consulta dejan de mostrarse como cero.

Versión 3.1.2: la lectura omite emojis y emotes identificados por la plataforma, sin alterar el chat ni consultar servicios externos. Los mensajes de solo emotes quedan en silencio. Además, la voz omite por defecto Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Wizebot y BotRix, además de mensajes identificados explícitamente como bots. En Voz se pueden indicar bots adicionales por nombre o identificador, separados por comas. El filtro solo afecta a la lectura; los mensajes siguen apareciendo en el chat y no se hacen consultas externas para reconocer bots.

«Leer nombre del usuario» permite elegir entre «Ana dice: hola» y «hola». El botón Probar respeta esa elección. Al cambiarla se descarta la lectura pendiente para aplicar el ajuste de inmediato. Ambas preferencias y la lista de bots se guardan automáticamente.

Versión 3.1.0: vista compacta sin barra de búsqueda, filtros ni controles de pausa. Cabecera con el logo original y ajustes, minimizar y cerrar. Los estados de conexión se muestran en avisos de 4,5 segundos; un directo terminado o una conexión perdida produce una alerta sonora una sola vez por cambio de estado, respetando los ajustes de sonido.

Insignias de roles e imágenes originales recibidas por cada conexión; las insignias globales de creador, moderador y VIP de Twitch se incluyen localmente. No se consulta un catálogo de insignias por mensaje y se eliminan las búsquedas de avatares por usuario de Twitch. Los regalos conservan nombre, imagen, sticker e importe originales cuando el evento los entrega; no se inventan imágenes ni valores ni se activa el catálogo de pago de Euler.

Twitch anónimo confirma el acceso al chat, que puede seguir conectado con el canal fuera de directo. Solo se anuncia «en vivo» cuando la plataforma confirma el estado (TikTok, YouTube y los datos de estado ya disponibles de Kick/Twitch). No se añaden consultas para averiguar ese estado. La conexión inicial y las reconexiones de TikTok siguen usando la firma de Euler; mostrar las imágenes recibidas no hace consultas al catálogo de Euler.

Versión 3.0.0: actualiza Electron y las dependencias (0 avisos conocidos en npm audit durante esta revisión), endurece los mensajes y el acceso local de OBS, añade búsqueda con acentos, filtro por plataforma, pausa con contador, vuelta al directo y limpieza de vista. El historial visible, los avatares y las colas tienen límites. La captura de clips se detiene al desactivarla y evita duplicarse.

Para abrir la revisión local: dist/3.1.4. Las pruebas incluyen chat, contenido malicioso, OBS, control de acceso IPC, restauración de ajustes, Piper, Spotify y Twitch. Se corrige que la inicialización pudiera sobrescribir ajustes del disco antes de cargarlos. npm audit revisa dependencias npm conocidas; no equivale a una garantía de ausencia de fallos.

Versión 2.8.0: voz Piper Claude, español de México, incluida en la aplicación. Funciona sin internet, claves ni cuotas. En Voz, selecciona Claude y pulsa Probar; activa Leer mensajes para el chat. Se mantienen las voces de Windows, filtros por plataforma, volumen y velocidad. Consulta [PIPER.md](PIPER.md) para preparar y compilar el motor local.

Versión 2.7.1: corrige la conexión con claves Community de Euler Stream. Se elimina la consulta opcional del catálogo extendido de regalos, que requiere Business; los eventos normales de regalos se mantienen. Verificado con una conexión real. Si Euler rechaza una consulta de pago, se muestra la causa y se detienen los reintentos.

Versión 2.7.0: conexión de TikTok mediante Euler Stream, con mensajes, emotes, regalos, seguidores, entradas, compartidos y contadores de audiencia. En Canales, marca TikTok, escribe tu usuario y pega tu clave del [panel de Euler Stream](https://www.eulerstream.com/dashboard). Pulsa Guardar y Conectar. La clave anterior de tik.tools no sirve para Euler y no se reutiliza. Tus demás ajustes se conservan.

Las reconexiones usan una espera progresiva; si el directo termina se vuelve a comprobar después de 30 segundos. Una clave rechazada requiere corregirla antes de reconectar. Los límites de solicitudes respetan el plazo de reintento comunicado por Euler. Esto no garantiza una conexión ininterrumpida: depende de TikTok y del proveedor. La comprobación con una cuenta y directo reales requiere introducir una clave válida en la aplicación.

Versión 2.6.2: publicación con comando de pruebas compatible con Node 20 en Windows.

Versión 2.6.1: detección de canciones ya en reproducción, enlaces de álbum y transición automática de la cola. Para actualizar la extensión existente, recárgala desde brave://extensions y recarga también Spotify.

Versión 2.6.0: conexión individual de Twitch desde un botón, sin claves para el usuario; enlace de Brave con aprobación dentro de MultiChat; aviso claro para canales sin puntos. La preparación del distribuidor se describe en [DISTRIBUCION.md](DISTRIBUCION.md) y el uso en [MUSICA.md](MUSICA.md).

Versión 2.5.0: pedidos de canciones por nombre con una recompensa de Twitch de 500 puntos y extensión local para Spotify web en Brave. La reproducción con cuenta gratuita es experimental y requiere probarla en tu sesión. Consulta [MUSICA.md](MUSICA.md) para vincular las cuentas y la extensión.

Versión 2.4.3: chat sin barra inferior de atajos, entradas consecutivas agrupadas por plataforma durante 15 segundos y nombres separados del texto. Los atajos se pueden consultar en Acerca de.

La interfaz de escritorio usa navegación lateral, controles en escala de grises y mensajes con distintivos discretos. Los ajustes de apariencia, voz, clips y canales conservan sus funciones.

Para abrir el proyecto: `npm start`. Para comprobar la interfaz sin conectar cuentas ni grabar la pantalla: `npm test`. Las capturas de revisión se generan con `npm test -- --screenshots`.

La compilación de esta revisión se encuentra en `dist/3.1.4`. Para volver a generarla sin publicar: `npm run dist -- --publish never --config.directories.output=dist/3.1.4`.


App de escritorio (Electron) para streamers y creadores de contenido que unifica en **una sola ventana transparente siempre visible** el chat y eventos en vivo de **TikTok, Twitch, Kick y YouTube** simultáneamente.

---

## ✨ Características Principales

- 🌟 **Alerta de Nuevos Seguidores (Follow Alert)**:
  - Tarjeta animada flotante con efecto glow y pop-in.
  - Muestra la foto de perfil (avatar), el nombre del seguidor y la insignia de la plataforma.
  - **Sonido de alerta (chime)** nítido y claro generado en tiempo real.
- ⚡ **Auto-Conexión y Guardado Automático**:
  - Guarda automáticamente tus canales, usuarios, clave de Euler Stream y preferencias.
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
