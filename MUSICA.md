# Música por puntos

Actualización 2.6.1: si una canción sonaba pero aparecía un error de controles, recarga la extensión desde brave://extensions, recarga Spotify y pulsa Reintentar en el pedido. La siguiente canción de la cola empieza automáticamente cuando termina la actual. Si el contador de siguientes canciones es 0, no hay más pedidos pendientes.

MultiChat 2.6.0 permite que cada persona autorice su propia cuenta. Los usuarios no necesitan crear aplicaciones en Twitch Developers, introducir Client ID ni conocer un Client Secret.

## Conectar tu canal

1. En MultiChat entra en Ajustes → Música y pulsa **Conectar Twitch**.
2. Autoriza tu cuenta en la página oficial que se abre. El código también permite autorizar desde otro equipo o desde tu teléfono en `twitch.tv/activate`.
3. De vuelta en MultiChat verás el usuario conectado. Si tu canal es Afiliado o Partner podrás crear la recompensa de 500 puntos. Si no tiene puntos del canal, podrás seguir probando Spotify sin canjes.

Puedes pulsar **Cambiar cuenta de Twitch** para conectar otro canal. Si quedan pedidos de un canal anterior, resuélvelos antes de cambiar para no perder sus canjes.

## Vincular Spotify en Brave

La extensión se instala una vez en cada equipo. Actualmente se entrega como carpeta; no está publicada en una tienda.

1. Despliega **Instalar la extensión por primera vez** y pulsa **Abrir carpeta de extensión**.
2. En `brave://extensions`, activa **Modo de desarrollador**, pulsa **Cargar descomprimida** y selecciona esa carpeta. Si ya tenías la versión anterior de la extensión, pulsa su botón de recarga para actualizarla.
3. Abre Spotify y pulsa el icono de la extensión MultiChat → **Conectar Spotify**.
4. Comprueba que el número mostrado coincide con el de MultiChat y pulsa **Vincular Spotify** en la aplicación. No hay claves que copiar. El enlace se recuerda en ese equipo.
5. Reproduce algo manualmente una vez en Spotify. Después usa **Probar canción** en MultiChat antes de habilitar canjes reales.

La extensión busca la primera coincidencia por nombre; incluir el artista reduce versiones equivocadas. La conexión con cuentas gratuitas sigue siendo experimental: depende de los controles de Spotify web y no cambia anuncios ni límites de la cuenta.

## Activar pedidos

Pulsa **Crear recompensa** con coste 500. Se crea **Pedir canción** y el espectador debe escribir un nombre de canción y artista.

Los pedidos entran en una cola de hasta 30 canciones, con un máximo de 3 por espectador. Los canjes se consultan cada cinco segundos. Solo se marcan completados cuando la extensión detecta que avanza la reproducción de la canción seleccionada.

Los pedidos pendientes se pueden omitir y reembolsar. Los ya confirmados en reproducción no se reembolsan. **Pausar cola** evita iniciar el siguiente pedido; no pausa la canción que ya está sonando. Para impedir nuevos canjes mientras cierras MultiChat, pausa la recompensa en el panel de Twitch.

## Estado de verificación

Se probaron el acceso público mediante un servidor local, la renovación de tokens, la cola y sus límites, la aprobación del navegador, la recuperación tras reinicio y la interfaz. Los controles de Spotify se comprobaron sobre una página local representativa. Falta validar la autorización completa y la reproducción con cuentas reales usando esta versión.

La configuración del distribuidor está explicada en [DISTRIBUCION.md](DISTRIBUCION.md).
