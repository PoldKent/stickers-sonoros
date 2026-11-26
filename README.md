# Stickers Sonoros

Editor web en español para convertir un video, una imagen con audio o un video/GIF con otro audio en un clip cuadrado de 512 × 512. Permite recortar, ajustar el encuadre y exportar hasta 30 segundos con sonido. El navegador procesa los archivos localmente.

La exportación es MP4 o WebM según el navegador. Para GIF animado se necesita ImageDecoder. Para exportar se necesita MediaRecorder, Web Audio y captura de canvas. Usar Chrome o Edge actualizado es la opción recomendada.

Se puede compartir el clip como video en WhatsApp. Para enviar stickers con sonido como mensajes nativos, consulta la [extensión original de Shirtep](https://github.com/Shirtep/WA-audio-stickers/releases).

Para servirlo localmente, ejecuta `python -m http.server 8000` desde esta carpeta y abre http://localhost:8000. En GitHub Pages, publica la rama principal desde la raíz. El sitio no requiere compilación.
