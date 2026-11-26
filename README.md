# Stickers Sonoros

Editor web en español para convertir un video, una imagen con audio o un video/GIF con otro audio en un clip cuadrado de 512 × 512. Permite recortar, ajustar el encuadre y exportar hasta 10 segundos con sonido. El navegador procesa los archivos localmente.

La exportación es MP4 o WebM según el navegador. Para GIF animado se necesita ImageDecoder. Para exportar se necesita MediaRecorder, Web Audio y captura de canvas. Usar Chrome o Edge actualizado es la opción recomendada.

El editor funciona sin extensiones. Un solo botón genera el vídeo cuadrado y, si el navegador admite WebP y Opus, los archivos vinculados de sticker y sonido. La app comprueba las firmas de archivo, tamaños y hash SHA-256 del audio en los metadatos WebP. El vídeo se puede compartir como vídeo (no como sticker). En las cuentas móviles que tengan habilitada la creación de stickers con sonido, guarda el clip en la galería y usa Stickers → Crear → Añadir sonido en WhatsApp para conservar su audio. La función está en despliegue gradual. Si no está habilitada, la web no puede forzar el envío nativo desde una cuenta personal. MP4 es preferible para la galería; WebM es la alternativa en navegadores sin codificación MP4.

Para servirlo localmente, ejecuta `python -m http.server 8000` desde esta carpeta y abre http://localhost:8000. En GitHub Pages, publica la rama principal desde la raíz. El sitio no requiere compilación.

El conversor local de WebP y Ogg/Opus procede de [Shirtep, revisión 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). Se distribuye con el aviso de autoría y la [licencia PolyForm Noncommercial](vendor/shirtep/LICENSE.md). Exportar los archivos no crea por sí solo un mensaje de WhatsApp.

## Importación directa de enlaces

La captura de pestañas se ha eliminado. El editor descarga URLs de video HTTPS que permiten CORS directamente. Para TikTok, Instagram Reels y YouTube Shorts, la interfaz usa un servicio propio con yt-dlp y FFmpeg: GitHub Pages no ejecuta Python ni puede resolver esos enlaces por sí solo.

**Estado:** la URL pública asignada por Render es https://stickers-sonoros.onrender.com. GitHub Pages está configurado para utilizar ese servidor. La disponibilidad real y la descarga desde redes sociales requieren verificación. No es necesario instalar una extensión ni programa en el equipo de quien utiliza el editor.

### Despliegue unificado (administrador)

El editor tiene una sola entrada de URL y comienza a importar automáticamente al pegar. No guarda ni solicita una dirección de servidor al visitante. En el despliegue unificado, la página y `/api/import` comparten origen.

- Render: importa el repositorio como Blueprint (archivo `render.yaml` en la raíz). El plan gratuito se propone para pruebas, no garantiza rendimiento suficiente. El servicio utiliza el Dockerfile de la raíz y proporciona HTTPS. Abre la URL asignada al servicio para utilizar el editor completo.
- Docker local: `docker build -t stickers-sonoros . && docker run --rm -p 8080:8080 stickers-sonoros`. Abre `http://localhost:8080`.
- GitHub Pages: utiliza la URL de Render configurada en el atributo `content` de `meta[name=sticker-import-endpoint]` en `index.html`. El sitio servido por Render utiliza su propio origen. Comprueba `/health` y una importación autorizada antes de considerar el servicio operativo.
- Las pruebas de integración del importador utilizan una respuesta de vídeo simulada; comprobar cada red social contra el servicio real es una prueba distinta.


El servicio admite enlaces individuales, limita una descarga simultánea, cuatro intentos por minuto por instancia, diez minutos de duración, tamaño máximo de 80 MiB (descarga individual de hasta 50 MB, prioridad a formatos de hasta 480p para edición) y aplica plazos máximos al proceso. No usa cookies, cuentas ni credenciales del usuario. Los archivos temporales se eliminan tras la respuesta. CORS no equivale a autenticación: antes de exponerlo ampliamente, aplica límites de tráfico y restricciones de salida de red a nivel del proveedor (bloquear redes privadas, loopback, servicios de metadatos e IP reservadas, también tras redirecciones). Usa una instancia aislada sin secretos. Actualiza y revisa las dependencias periódicamente; fija versiones verificadas para producción. Las redes sociales pueden rechazar las descargas desde centros de datos, requerir autenticación o modificar su funcionamiento; no se garantiza que todas las publicaciones funcionen. El servicio devuelve códigos de diagnóstico distintos para restricciones de acceso, duración, tamaño y formato, sin divulgar registros privados. /health expone la versión del servicio. Descarga solo contenido que tengas derecho a utilizar.

Tras la importación, el video se carga en el editor existente para elegir el inicio y final, explorar cuadros, ajustar el encuadre, zoom y desplazamiento, y exportar. Se conservan las limitaciones de WhatsApp descritas arriba.

## Verificación manual

1. Abre un vídeo con audio de menos de 10 s; ajusta encuadre e inicio/final.
2. Pulsa Crear sticker sonoro. Comprueba que el vídeo se reproduce, que el sonido es audible y que aparecen la animación WebP y el audio Ogg con vinculación verificada.
3. Guarda el MP4 en un teléfono compatible; abre WhatsApp, Crea un sticker y conserva su audio. Envía a tu propio chat y comprueba el icono de audio.
4. Repite con imagen + audio, GIF + audio y un navegador sin WebCodecs. Comprueba cancelación y cambio de fuente sin resultados obsoletos.

## Detector multimedia

Inspirado en la selección de recursos de Media Finder y FlowPick, sin copiar código de extensiones. Una URL directa de vídeo, imagen o audio se abre en el modo de edición correspondiente. Las páginas HTML públicas que permiten lectura entre orígenes (CORS) se analizan en una plantilla inerte, sin ejecutar JavaScript remoto; muestran hasta 60 recursos HTTPS detectados en etiquetas multimedia y metadatos Open Graph. El usuario puede elegir recursos y combinar imagen/video con audio. Se utiliza un lector limitado de HTTPS público, con controles de red, como alternativa al navegador. La detección no equivale a interceptar el tráfico de una pestaña ni garantiza acceso a contenido dinámico, privado, protegido o que bloquee CORS. Los enlaces de las redes sociales admitidas conservan el importador existente; Cobalt es una posible alternativa futura como servicio propio, no una dependencia activa.

El editor también permite tomar el fotograma actual de un vídeo y combinarlo con el sonido del tramo seleccionado, sin descargar un segundo archivo.

## Acceso a medios públicos sin CORS

Si falla la petición directa del navegador, el editor puede consultar la URL HTTPS pública mediante `/api/media`. El lector no utiliza cookies, credenciales ni proxies, rechaza redes privadas y direcciones no globales en cada resolución y redirección, fija la IP del socket, valida TLS, limita tiempo y tamaño y solo devuelve tipos multimedia permitidos o HTML en JSON. No se ejecuta contenido remoto. No se utiliza este camino para saltar autenticación ni para extraer vídeo restringido de YouTube, TikTok o Instagram. Sigue siendo necesario aislar el servicio y limitar tráfico a nivel de infraestructura antes de ofrecerlo a gran escala.

El contenedor actualiza yt-dlp a la versión disponible del canal de pruebas en la compilación; Node 22 y yt-dlp-ejs se mantienen como dependencias. `/health` informa de la versión instalada. Esto reduce incompatibilidades por cambios del sitio, pero no elimina restricciones de acceso de la plataforma. Para un despliegue estable, fija una versión verificada después de las pruebas reales.

## Compatibilidad con WhatsApp

Cuando el navegador solo graba WebM, el usuario puede solicitar **Preparar MP4 compatible**. El botón envía exclusivamente el clip editado (hasta 16 MiB) a `/api/clip-mp4`, que valida la cabecera WebM y genera H.264/AAC de hasta diez segundos. Los archivos temporales se eliminan al finalizar. La conversión local sigue siendo la opción por defecto. Compartir el MP4 sigue siendo compartir un vídeo, no un mensaje de sticker sonoro. Si el acceso a YouTube está restringido, se ofrece acceso a YouTube Studio para descargar vídeos propios y seleccionar el archivo original. No se introducen sesiones de WhatsApp, cookies de YouTube ni mecanismos para eludir sus restricciones.
