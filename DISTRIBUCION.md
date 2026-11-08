# Preparar MultiChat para otras personas

## Twitch: configuración única del distribuidor

Esta versión lleva únicamente el identificador público de MultiChat en `src/music/app-config.json`. No se deben incluir secretos de cliente, tokens de acceso ni archivos de usuario en una distribución.

El registro de Twitch que corresponda a ese ID debe tener **Tipo de cliente: Público**. Twitch recomienda ese tipo para aplicaciones de escritorio y permite renovar los tokens del flujo de código de dispositivo sin una clave secreta.

El registro usado en 2.5.0 se creó como Confidencial. Antes de distribuir 2.6.0 comprueba su tipo en Twitch Developers. Si la consola permite cambiarlo, configúralo como Público. Si exige crear un registro nuevo, usa categoría Chat Bot y tipo Público, sustituye el ID en `src/music/app-config.json` y vuelve a compilar. Es un paso del distribuidor; los usuarios finales no deben realizarlo.

Documentación oficial: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow

Cada creador autoriza su propia cuenta, incluso desde su teléfono. Los tokens se guardan cifrados en su Windows y se renuevan por separado. Una cuenta sin afiliación puede conectar y probar Spotify, pero los canjes oficiales necesitan un canal Afiliado o Partner.

## Extensión de Brave

Se incluye una extensión sin credenciales de Twitch. Actualmente cada usuario debe cargarla una vez como extensión descomprimida siguiendo MUSICA.md. Para una instalación desde tienda será necesario publicar y obtener aprobación en una tienda compatible; eso todavía no se ha realizado.

El paquete ZIP preparado contiene únicamente los archivos de la extensión. La vinculación requiere aprobar en MultiChat una solicitud del navegador con un número coincidente. No se expone una clave estática compartida entre usuarios.

## Compilar y comprobar

`npm test -- --screenshots`

`node node_modules/electron-builder/cli.js --win portable --publish never --config.compression=store --config.directories.output=dist/2.6.2`

La extensión se copia fuera de ASAR y el botón de la aplicación la exporta a una carpeta estable de datos del usuario. Los archivos de datos personales quedan fuera del instalador.

Antes de compartir el programa, comprueba con al menos dos usuarios distintos la autorización de Twitch, la renovación, un canje y su reembolso, y la reproducción real en Spotify web. Las pruebas locales no sustituyen esa validación.
