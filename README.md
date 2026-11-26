# Stickers Sonoros

Editor web en español para convertir un video, una imagen con audio o un video/GIF con otro audio en un clip cuadrado de 512 × 512. Permite recortar, ajustar el encuadre y exportar hasta 30 segundos con sonido. El navegador procesa los archivos localmente.

La exportación es MP4 o WebM según el navegador. Para GIF animado se necesita ImageDecoder. Para exportar se necesita MediaRecorder, Web Audio y captura de canvas. Usar Chrome o Edge actualizado es la opción recomendada.

El editor funciona sin extensiones. Puedes compartir el resultado como video. En las cuentas móviles que tengan habilitada la creación de stickers con sonido, guarda el clip en la galería y usa Stickers → Crear → Añadir sonido en WhatsApp para conservar su audio.

Para servirlo localmente, ejecuta `python -m http.server 8000` desde esta carpeta y abre http://localhost:8000. En GitHub Pages, publica la rama principal desde la raíz. El sitio no requiere compilación.

El conversor local de WebP y Ogg/Opus procede de [Shirtep, revisión 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). Se distribuye con el aviso de autoría y la [licencia PolyForm Noncommercial](vendor/shirtep/LICENSE.md). Exportar los archivos no crea por sí solo un mensaje de WhatsApp.

## Importación directa de enlaces

La captura de pestañas se ha eliminado. El editor descarga URLs de video HTTPS que permiten CORS directamente. Para TikTok, Instagram Reels y YouTube Shorts, la interfaz usa un servicio propio con yt-dlp y FFmpeg: GitHub Pages no ejecuta Python ni puede resolver esos enlaces por sí solo.

**Estado:** el código del servicio está incluido, pero necesita alojamiento HTTPS independiente. No hay una instancia pública preconfigurada. No es necesario instalar una extensión ni programa en el equipo de quien utiliza el editor.

### Despliegue del servicio (administrador del sitio)

1. Despliega el directorio `importer/` como servicio Docker HTTPS (por ejemplo, en un proveedor compatible con Docker). Usa el Dockerfile de esa carpeta y su contexto de compilación.
2. Configura `ALLOWED_ORIGIN=https://poldkent.github.io` y permite que el proveedor determine `PORT`. La ruta `GET /health` permite verificar que el servicio responde.
3. En el editor, abre **Servicio de descarga de redes sociales**, introduce la URL base HTTPS del servicio y pega un enlace público. La configuración se guarda localmente en el navegador. Para preconfigurar el servicio para todos los visitantes, el administrador puede rellenar una sola vez el atributo `content` de la etiqueta `meta[name=sticker-import-endpoint]` en `index.html` y publicar el cambio.
4. Para desarrollo del servidor: `cd importer && python -m unittest test_server.py`. Construcción local: `docker build -t sticker-importer importer`. El despliegue público requiere TLS; no basta con ejecutar el contenedor HTTP.

El servicio admite enlaces individuales, limita una descarga simultánea, cuatro intentos por minuto por instancia, tres minutos de duración, tamaño máximo de 80 MiB y aplica plazos máximos al proceso. No usa cookies, cuentas ni credenciales del usuario. Los archivos temporales se eliminan tras la respuesta. CORS no equivale a autenticación: antes de exponerlo ampliamente, aplica límites de tráfico y restricciones de salida de red a nivel del proveedor (bloquear redes privadas, loopback, servicios de metadatos e IP reservadas, también tras redirecciones). Usa una instancia aislada sin secretos. Actualiza y revisa las dependencias periódicamente; fija versiones verificadas para producción. Las redes sociales pueden rechazar las descargas desde centros de datos, requerir autenticación o modificar su funcionamiento; no se garantiza que todas las publicaciones funcionen. Descarga solo contenido que tengas derecho a utilizar.

Tras la importación, el video se carga en el editor existente para elegir el inicio y final, explorar cuadros, ajustar el encuadre, zoom y desplazamiento, y exportar. Se conservan las limitaciones de WhatsApp descritas arriba.
