# Stickers Sonoros

Editor web en español para convertir un video, una imagen con audio o un video/GIF con otro audio en un clip cuadrado de 512 × 512. Permite recortar, ajustar el encuadre y exportar hasta 30 segundos con sonido. El navegador procesa los archivos localmente.

La exportación es MP4 o WebM según el navegador. Para GIF animado se necesita ImageDecoder. Para exportar se necesita MediaRecorder, Web Audio y captura de canvas. Usar Chrome o Edge actualizado es la opción recomendada.

El editor funciona sin extensiones. Puedes compartir el resultado como video. En las cuentas móviles que tengan habilitada la creación de stickers con sonido, guarda el clip en la galería y usa Stickers → Crear → Añadir sonido en WhatsApp para conservar su audio.

Para servirlo localmente, ejecuta `python -m http.server 8000` desde esta carpeta y abre http://localhost:8000. En GitHub Pages, publica la rama principal desde la raíz. El sitio no requiere compilación.

El conversor local de WebP y Ogg/Opus procede de [Shirtep, revisión 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). Se distribuye con el aviso de autoría y la [licencia PolyForm Noncommercial](vendor/shirtep/LICENSE.md). Exportar los archivos no crea por sí solo un mensaje de WhatsApp.
