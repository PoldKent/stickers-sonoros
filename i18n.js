/* Spanish/English presentation layer; does not change media or sending logic. */
(() => {
  const pairs = [
    ["Enviar sticker guardado (.sonoro.json)","Send saved sticker (.sonoro.json)"],
    ["Selecciona nuevamente los archivos originales.","Select the original files again."],
    ["Ejemplo preparado. Pulsa Siguiente.","Example ready. Select Next."],
    ["Imagen fija","Still image"],
    ["Crea stickers con sonido para WhatsApp en cuatro pasos: importa, edita, crea y envía. Animaciones desde 9 FPS, hasta 2 MB.","Create sound stickers for WhatsApp in four steps: import, edit, create and send. Animations at 9 FPS or more, up to 2 MB."],
    ["Stickers Sonoros · Creador de stickers con sonido","Stickers Sonoros · Sound sticker maker"],
    ["Importa, edita, crea y envía tu sticker con sonido, una etapa a la vez.","Import, edit, create and send your sound sticker, one step at a time."],
    ["Usa un enlace individual de TikTok, Instagram Reel o YouTube Short.","Use an individual TikTok, Instagram Reel or YouTube Short link."],
    ["Solicitud no válida.","Invalid request."],
    ["El audio generado no se puede reproducir","The generated audio cannot be played"],
    ["Importar contenido","Import content"],
    ["Editar sticker","Edit sticker"],
    ["Crear sticker","Create sticker"],
    ["Enviar sticker","Send sticker"],
    ["Selecciona el contenido y su sonido para continuar.","Select your content and its audio to continue."],
    ["Navegación entre etapas","Step navigation"],
    ["← Anterior","← Back"],
    ["Siguiente →","Next →"],
    ["La animación conserva una cadencia uniforme. Si el original tiene fotogramas repetidos, no se inventa movimiento.","The animation preserves a uniform frame cadence. If the original contains repeated frames, no motion is invented."],
    ["Usar completo","Use full source"],
    ["Si ya tienes el favorito de esta versión, salta este paso. Actualiza los favoritos antiguos.","Skip this step if you have the bookmark for this version. Update older bookmarks."],
    ["En el celular, utiliza Enviar a mi WhatsApp.","On a phone, use Send to my WhatsApp."],
    ["Línea de tiempo","Timeline"],
    ["El tramo supera la memoria de captura disponible. Reduce la resolución del archivo original o acorta el tramo.","The selection exceeds available capture memory. Reduce the source resolution or shorten the selection."],
    ["Inicio del video","Video start"],
    ["Final del video","Video end"],
    ["Inicio del audio","Audio start"],
    ["Final del audio","Audio end"],
    ["Recomendado (hasta 1 MB total)","Recommended (up to 1 MB total)"],
    ["Ampliado experimental (hasta 2 MB total)","Experimental extended (up to 2 MB total)"],
    ["Guarda el archivo .sonoro.json. No lo adjuntes al chat.","Save the .sonoro.json file. Do not attach it to the chat."],
    ["El video no tiene una duración válida o es una transmisión en directo.","The video has no valid duration or is a live stream."],
    ["Crea stickers sonoros para WhatsApp desde un video, imagen o GIF.","Create sound stickers for WhatsApp from video, images or GIFs."],
    ["Elige un archivo, recorta y personaliza tu sticker con sonido.","Choose a file, trim and customize your sound sticker."],
    ["Todos los modos mantienen al menos 9 FPS en animaciones. La resolución se adapta al tamaño.","All modes maintain at least 9 FPS for animations. Resolution adapts to the size."],
    ["1 MB recomendado para imagen y audio juntos. Usa 2 MB solo para probar stickers más pesados.","1 MB recommended for combined image and audio. Use 2 MB only to test larger stickers."],
    ["Más de 1 MB total: compatibilidad experimental. Si falla, vuelve a Crear y elige 1 MB.","Over 1 MB total: experimental compatibility. If sending fails, return to Create and choose 1 MB."],
    ["Selecciona un archivo con audio. Animaciones: mínimo 9 FPS; máximo 2 MB.","Choose a file with audio. Animations: at least 9 FPS; maximum 2 MB."],
    ["El audio no cabe en el presupuesto de tamaño. Reduce el tramo.","Audio does not fit the size budget. Shorten the selection."],
    ["Las animaciones requieren al menos 9 FPS.","Animations require at least 9 FPS."],
    ["El tramo no cabe en el presupuesto de tamaño con al menos 9 FPS. Acórtalo o cambia el modo de calidad.","The selection does not fit the size budget at 9 FPS or more. Shorten it or change quality mode."],
    ["Creado en Stickers Sonoros","Created with Stickers Sonoros"],
    ["Flujo de trabajo","Workflow"],
    ["1. Importar","1. Import"],
    ["2. Editar","2. Edit"],
    ["3. Crear","3. Create"],
    ["4. Enviar","4. Send"],
    ["Stickers Sonoros · Editor web","Stickers Sonoros · Web editor"],
    ["Edición local","Local editing"],
    ["Dale sonido","Add sound"],
    ["a tu sticker.","to your sticker."],
    ["Tu proyecto","Your project"],
    ["Tipo de proyecto","Project type"],
    ["Video","Video"],
    ["Imagen + audio","Image + audio"],
    ["Video o GIF + audio","Video or GIF + audio"],
    ["Pega un enlace multimedia","Paste a media link"],
    ["Página web, video, imagen o audio","Web page, video, image or audio"],
    ["Importar o reintentar","Import or retry"],
    ["Detectar contenido multimedia","Find media"],
    ["Detectar","Find media"],
    ["Cancelar","Cancel"],
    ["Iniciando el editor…","Starting the editor…"],
    ["Si el video es tuyo, puedes obtener el original desde YouTube Studio. También puedes utilizar el archivo original facilitado por su autor.","If you own the video, download the original from YouTube Studio. You can also use a file provided by its creator."],
    ["Abrir YouTube Studio","Open YouTube Studio"],
    ["Seleccionar archivo original","Choose original file"],
    ["Contenido encontrado","Media found"],
    ["Activa JavaScript para importar y editar videos.","Enable JavaScript to import and edit videos."],
    ["Selecciona o arrastra un video","Choose or drop a video"],
    ["MP4, WebM u otro video compatible","MP4, WebM or other supported video"],
    ["Selecciona o arrastra una imagen","Choose or drop an image"],
    ["PNG, JPEG, WebP u otra imagen compatible","PNG, JPEG, WebP or other supported image"],
    ["Selecciona o arrastra un video o GIF","Choose or drop a video or GIF"],
    ["MP4, WebM o GIF animado","MP4, WebM or animated GIF"],
    ["Pista de audio","Audio track"],
    ["Video desde (s)","Video start (s)"],
    ["Video hasta (s)","Video end (s)"],
    ["Explorar video","Scrub video"],
    ["Marcar inicio","Set start"],
    ["Marcar final","Set end"],
    ["Audio desde (s)","Audio start (s)"],
    ["Audio hasta (s)","Audio end (s)"],
    ["Encuadre","Framing"],
    ["Ajustar","Fit"],
    ["Rellenar","Fill"],
    ["Al terminar la animación","When animation ends"],
    ["Mantener último cuadro","Hold last frame"],
    ["Repetir","Loop"],
    ["Posición y zoom","Position and zoom"],
    ["Horizontal","Horizontal"],
    ["Vertical","Vertical"],
    ["Zoom","Zoom"],
    ["También puedes arrastrar la imagen en la vista previa.","You can also drag the image in the preview."],
    ["Probar un ejemplo","Try an example"],
    ["Crear sticker sonoro","Create sound sticker"],
    ["Vista previa","Preview"],
    ["Encuadre del clip","Clip framing"],
    ["Pega un enlace o elige un archivo","Paste a link or choose a file"],
    ["▶ Reproducir tramo","▶ Play selection"],
    ["■ Detener","■ Stop"],
    ["Usar fotograma + audio","Use frame + audio"],
    ["Revisa el video con su sonido antes de generar.","Preview the video with sound before creating."],
    ["Archivos del sticker sonoro","Sound sticker files"],
    ["Reintentar conversión","Retry conversion"],
    ["Cancelar conversión","Cancel conversion"],
    ["Sticker generado","Generated sticker"],
    ["Enviar a WhatsApp Web","Send to WhatsApp Web"],
    ["Enviar sticker sonoro","Send sound sticker"],
    ["Copiar dirección del marcador","Copy bookmark address"],
    ["Abrir WhatsApp Web","Open WhatsApp Web"],
    ["Conversor de","Converter by"],
    ["Stickers con sonido, de Shirtep","Shirtep's sound stickers"],
    ["Licencia de uso no comercial","Noncommercial license"],
    ["Comprobar servidor","Check server"],
    ["Idioma","Language"],
    ["El editor no se inició. Recarga la página con Ctrl + F5 y comprueba que JavaScript esté habilitado.","The editor did not start. Reload the page and check that JavaScript is enabled."],
    ["El archivo es demasiado corto.","The file is too short."],
    ["No pude leer una pista de audio compatible en este archivo.","No supported audio track could be read from this file."],
    ["Para GIF animado, abre el editor en Chrome o Edge actualizado.","For animated GIFs, use an up-to-date Chrome or Edge browser."],
    ["No pude obtener la duración o imagen del video.","Could not read the video duration or image."],
    ["Leyendo archivo…","Reading file…"],
    ["Leyendo la pista de audio…","Reading audio track…"],
    ["Selecciona un tramo válido dentro de la duración del archivo.","Select a valid range within the file duration."],
    ["Generación cancelada.","Creation canceled."],
    ["Importación cancelada.","Import canceled."],
    ["Introduce una URL HTTPS válida.","Enter a valid HTTPS URL."],
    ["El archivo supera el límite permitido.","The file exceeds the allowed size."],
    ["El navegador no permite leer esta descarga.","The browser cannot read this download."],
    ["El archivo está vacío.","The file is empty."],
    ["El recurso no devolvió un video, imagen o audio compatible.","The resource did not return supported video, image or audio."],
    ["▶ Video","▶ Video"],
    ["▧ Imagen","▧ Image"],
    ["♫ Audio","♫ Audio"],
    ["Contenido seleccionado","Selected media"],
    ["Audio cargado. Ajusta el tramo.","Audio loaded. Adjust the selection."],
    ["Audio cargado. Selecciona una imagen o GIF para acompañarlo.","Audio loaded. Choose an image or GIF to go with it."],
    ["Imagen cargada. Ajusta el encuadre.","Image loaded. Adjust the framing."],
    ["Imagen cargada. Añade una pista de audio.","Image loaded. Add an audio track."],
    ["Video cargado sin pista de audio compatible. Añade un audio.","Video loaded without a supported audio track. Add audio."],
    ["Video listo. Ajusta el tramo y el encuadre en la vista previa.","Video ready. Adjust the selection and framing in the preview."],
    ["No hay un servidor de importación configurado.","No import server is configured."],
    ["Dirección de servidor no válida.","Invalid server address."],
    ["Render no devolvió el estado JSON del descargador. Revisa su despliegue.","Render did not return the downloader status. Check its deployment."],
    ["El servidor de importación no está disponible.","The import server is unavailable."],
    ["La fuente no permite acceso directo y el servidor alternativo no está configurado.","The source does not allow direct access and no fallback server is configured."],
    ["La fuente no permite acceso directo. Comprobando Render…","Direct access is unavailable. Checking Render…"],
    ["Descargando el recurso público mediante Render…","Downloading public media through Render…"],
    ["Cargando recurso seleccionado…","Loading selected media…"],
    ["No se pudo abrir el recurso.","Could not open the resource."],
    ["El sitio no permite acceder al archivo desde esta web (CORS). Si tienes permiso, importa el archivo original.","The site does not allow this website to access the file (CORS). If authorized, import the original file."],
    ["Espera a que termine la generación antes de importar.","Wait for creation to finish before importing."],
    ["Pega un enlace HTTPS de un video.","Paste an HTTPS video link."],
    ["Comprobando enlace…","Checking link…"],
    ["Pega primero el enlace de un video.","Paste a video link first."],
    ["Pega el enlace de un solo video de YouTube.","Paste a link to a single YouTube video."],
    ["El enlace es de una red social, pero el servidor de descarga todavía no está conectado a esta web. No se ha descargado el video. Puedes seleccionar un MP4 del dispositivo mientras se activa el servicio.","This is a social media link, but the download server is not connected to this website yet. No video was downloaded. You can choose an MP4 from your device."],
    ["Servicio de descarga no disponible.","Download service unavailable."],
    ["Conectando con el servidor de descarga…","Connecting to the download server…"],
    ["Conectando con el video…","Connecting to video…"],
    ["Obteniendo video y audio…","Getting video and audio…"],
    ["Respuesta de detección no válida.","Invalid media detection response."],
    ["Selecciona el video, imagen o audio que quieras utilizar.","Choose the video, image or audio you want to use."],
    ["No se encontraron archivos multimedia directos. El sitio puede utilizar reproducción dinámica.","No direct media files found. The site may use dynamic playback."],
    ["Cargando en el editor…","Loading into the editor…"],
    ["Importación cancelada o tiempo agotado.","Import canceled or timed out."],
    ["No se pudo acceder al enlace. La página puede bloquear el acceso desde otras webs (CORS) o estar desconectada.","Could not access the link. The page may block cross-origin access (CORS) or be offline."],
    ["La animación puede reducir su calidad para caber en 1 MB.","Animation quality may be reduced to fit within 1 MB."],
    ["Reduce el tramo antes de generar.","Shorten the selection before creating."],
    ["El final debe estar después del inicio.","The end must be after the start."],
    ["Los archivos superan el límite del conversor o están vacíos.","The files exceed the converter limit or are empty."],
    ["El formato generado no es válido.","The generated format is invalid."],
    ["WebP incompleto.","Incomplete WebP."],
    ["No se pudo verificar la vinculación del sonido.","Could not verify the sound link."],
    ["Comprobando compatibilidad del navegador…","Checking browser compatibility…"],
    ["No se cargó el conversor. Recarga la página.","The converter did not load. Reload the page."],
    ["No se pudo generar el sticker.","Could not create the sticker."],
    ["Pega un enlace para detectar video, imagen o audio.","Paste a link to find video, image or audio."],
    ["Importa un archivo de video mediante un enlace directo. YouTube, TikTok e Instagram requieren el servidor de descarga, todavía sin conectar.","Import a video from a direct link. YouTube, TikTok and Instagram require the download server, which is not connected yet."],
    ["Fotograma seleccionado con el audio original. Puedes ajustar el tramo sonoro.","Frame selected with original audio. Adjust the sound selection."],
    ["Conversión cancelada o agotada.","Conversion canceled or timed out."],
    ["No se pudo guardar el paquete.","Could not save the package."],
    ["Arrastra el marcador a tu barra de favoritos. Luego úsalo dentro de WhatsApp Web.","Drag the bookmark onto your bookmarks bar. Then use it in WhatsApp Web."],
    ["Dirección copiada. Crea un marcador nuevo y pega esta dirección en su campo URL.","Address copied. Create a new bookmark and paste this address into its URL field."],
    ["No se pudo copiar. Arrastra el enlace a la barra de marcadores.","Could not copy. Drag the link to the bookmarks bar."],
    ["No se cargó la opción de envío. Recarga la página.","The sending option did not load. Reload the page."],
    ["Comprobando servidor…","Checking server…"],
    ["Servidor no configurado.","Server not configured."],
    ["El servidor no respondió a tiempo.","The server did not respond in time."],
    ["El navegador no pudo leer el video.","The browser could not read the video."],
    ["El video tardó demasiado en abrirse.","The video took too long to open."],
    ["Tiempo agotado cargando el video","Timed out loading video"],
    ["El video no tiene imagen (¿es solo audio?)","The video has no image (audio only?)"],
    ["Este navegador no puede leer GIF animados (falta ImageDecoder). Usa Chrome o Edge actualizados.","This browser cannot read animated GIFs. Use updated Chrome or Edge."],
    ["El navegador no puede leer imágenes","The browser cannot read images"],
    ["El navegador no pudo leer la imagen","The browser could not read the image"],
    ["El canvas no devolvió un WebP válido","The canvas did not return a valid WebP"],
    ["WebP sin datos de imagen","WebP contains no image data"],
    ["Este navegador no tiene WebCodecs (AudioEncoder). Usa Chrome o Edge actualizados.","This browser lacks WebCodecs AudioEncoder. Use updated Chrome or Edge."],
    ["El navegador no puede codificar Opus con WebCodecs","The browser cannot encode Opus using WebCodecs"],
    ["Página Ogg con demasiados segmentos","Ogg page has too many segments"],
    ["Leyendo la imagen…","Reading image…"],
    ["Imagen lista","Image ready"],
    ["Calculando opciones…","Calculating options…"],
    ["Opciones listas","Options ready"],
    ["Extrayendo audio…","Extracting audio…"],
    ["Codificando audio…","Encoding audio…"],
    ["Listo","Ready"],
    ["Ninguna combinación cabe en 1 MB para este tramo","No combination fits within 1 MB for this selection"],
    ["El audio generado no se puede reproducir:","The generated audio cannot be played:"],
    ["YouTube ha bloqueado la descarga desde el servidor y exige una comprobación de acceso. No se puede importar este enlace automáticamente. Si tienes permiso para usar el video, sube el archivo original.","YouTube blocked the server download and requires access verification. This link cannot be imported automatically. If authorized, upload the original file."],
    ["La plataforma exige iniciar sesión o concede acceso restringido a este video. Importa un archivo que tengas permiso para utilizar.","The platform requires sign-in or restricts access. Import a file you are authorized to use."],
    ["El video supera 10 minutos, es una transmisión en directo o no cumple el límite de duración.","The video exceeds 10 minutes, is live, or does not meet the duration limit."],
    ["El video supera el tamaño permitido para la descarga. Selecciona un archivo más corto o comprimido.","The video exceeds the download size limit. Choose a shorter or compressed file."],
    ["La plataforma rechazó la solicitud del servidor (acceso limitado o demasiadas peticiones). Prueba con otro video autorizado o importa el archivo.","The platform rejected the server request (restricted access or too many requests). Try another authorized video or import the file."],
    ["El descargador no pudo procesar la respuesta de la plataforma. Requiere revisión de compatibilidad.","The downloader could not process the platform response. Compatibility needs review."],
    ["No se encontró un formato de video con sonido accesible. Puede que la publicación no ofrezca ambos recursos.","No accessible video format with sound was found. The post may not provide both tracks."],
    ["La plataforma no ofrece un formato de video y audio compatible con el editor.","The platform does not offer a video and audio format compatible with the editor."],
    ["La publicación no está disponible para el servidor.","The post is unavailable to the server."],
    ["La descarga superó un límite de recursos del servidor.","The download exceeded a server resource limit."],
    ["No se pudo obtener el video. El servidor no recibió un archivo válido; prueba otro enlace autorizado.","Could not retrieve the video. The server did not receive a valid file; try another authorized link."],
    ["El archivo descargado está vacío o supera 80 MB.","The downloaded file is empty or exceeds 80 MB."],
    ["El video supera el máximo de 10 minutos.","The video exceeds 10 minutes."],
    ["El archivo descargado no contiene ambas pistas: video y sonido. Selecciona otro contenido o combina un video con audio en el editor.","The downloaded file lacks video or audio. Choose other media or combine video with audio in the editor."],
    ["El archivo no contiene video y audio compatibles.","The file does not contain supported video and audio."],
    ["El video se descargó, pero no pudo convertirse a MP4 con audio dentro de los límites del servidor.","The video downloaded but could not be converted to MP4 with audio within server limits."],
    ["El servicio está ocupado. Reintenta en unos segundos.","The service is busy. Try again shortly."],
    ["Límite temporal de importaciones alcanzado.","Import rate limit reached."],
    ["La descarga o conversión excedió el tiempo disponible.","The download or conversion timed out."],
    ["El archivo recibido no tiene metadatos compatibles.","The received file has incompatible metadata."],
    ["El servicio de descarga no está disponible.","The download service is unavailable."],
    ["Introduce un enlace HTTPS público válido.","Enter a valid public HTTPS link."],
    ["Solo se admiten URLs HTTPS de sitios públicos.","Only HTTPS URLs from public sites are supported."],
    ["No se pudo encontrar el sitio.","The site could not be found."],
    ["El recurso supera el tamaño permitido.","The resource exceeds the allowed size."],
    ["El recurso está vacío o incompleto.","The resource is empty or incomplete."],
    ["No se pudo establecer una conexión HTTPS válida con el recurso.","Could not establish a valid HTTPS connection to the resource."],
    ["La publicación no ofrece una dirección de descarga.","The post does not provide a download address."],
    ["TikTok no ofreció un archivo público accesible.","TikTok did not provide an accessible public file."],
    ["La publicación no permite descargar el vídeo.","The post does not allow video downloads."],
    ["Publicación no disponible.","The post is unavailable."],
    ["La publicación no está disponible para descarga pública.","The post is unavailable for public download."],
    ["No se encontraron datos públicos de descarga.","No public download data was found."],
    ["Se necesita un enlace completo de TikTok.","A full TikTok link is required."],
    ["Dirección de descarga no admitida.","Unsupported download address."],
    ["El recurso no es un MP4 válido.","The resource is not a valid MP4."],
    ["La publicación cambió durante la consulta.","The post changed during the request."],
    ["Datos de publicación ambiguos.","Ambiguous post data."],
    ["La dirección no pertenece a una red pública.","The address is not on a public network."],
    ["Tiempo de descarga agotado.","Download timed out."],
    ["Redirección sin destino.","Redirect without a destination."],
    ["Demasiadas redirecciones.","Too many redirects."],
    ["El recurso utiliza una codificación no admitida.","The resource uses unsupported encoding."],
    ["El enlace no ofrece un formato multimedia o HTML compatible.","The link does not provide a supported media or HTML format."],
    ["Límite temporal alcanzado.","Rate limit reached."],
    ["Alternativa de descarga pública:","Public download fallback:"],
    ["El video no respondió al recorte.","The video did not respond to seeking."],
    ["La reproducción no entregó cuadros","Playback returned no frames"],
    ["La reproducción se detuvo","Playback stopped"],
    ["sin requestVideoFrameCallback","requestVideoFrameCallback unavailable"],
    ["Primero calcula las opciones del tramo","Calculate the selection options first"],
    ["La duración del audio cambió: vuelve a calcular las opciones","Audio duration changed: recalculate the options"],
    ["El navegador no pudo leer el video","The browser could not read the video"],
    ["No se pudo leer el audio. ¿El archivo tiene sonido?","Could not read audio. Does the file contain sound?"],
    ["Generación cancelada","Creation canceled"],
    ["Cancelado","Canceled"],
    ["No se pudo abrir el recurso:","Could not open resource:"],
    ["Enlace no válido.","Invalid link."],
    ["Solo se admiten enlaces HTTPS públicos.","Only public HTTPS links are supported."],
    ["Dominio no permitido para esta descarga.","Domain not allowed for this download."],
    ["Esta plataforma requiere su importador específico.","This platform requires its specific importer."],
    ["Origen o ruta no permitidos.","Origin or route not allowed."],
    ["Origen no permitido.","Origin not allowed."],
    ["Ruta no encontrada.","Route not found."],
    ["Archivo no disponible.","File unavailable."],
    ["El archivo local supera 80 MiB. Selecciona un archivo más pequeño.","The local file exceeds 80 MiB. Choose a smaller file."],
    ["Apoyar el proyecto","Support the project"],
    ["Revisa la red y el token antes de donar.","Check the network and token before donating."],
    ["Saltar al editor","Skip to editor"],
    ["Información del proyecto","Project information"],
    ["Guía de uso","User guide"],
    ["Tu sticker sonoro","Your sound sticker"],
    ["Enviar tu sticker","Send your sticker"],
    ["Enviar desde una computadora (WhatsApp Web)","Send from a computer (WhatsApp Web)"],
    ["En el celular, guarda el archivo del sticker y pásalo a una computadora. El envío se realiza desde WhatsApp Web.","On your phone, save the sticker file and transfer it to a computer. Sending takes place in WhatsApp Web."],
    ["Guarda tu sticker","Save your sticker"],
    ["Descarga el archivo .sonoro.json. No lo abras ni lo adjuntes al chat.","Download the .sonoro.json file. Do not open it or attach it to the chat."],
    ["Guardar sticker sonoro ↓","Save sound sticker ↓"],
    ["Prepara el botón de envío","Set up the send button"],
    ["Solo la primera vez","First time only"],
    ["Muestra la barra de favoritos del navegador con Ctrl + Shift + B (en Mac, ⌘ + Shift + B). Arrastra el siguiente botón hasta esa barra.","Show your browser bookmarks bar with Ctrl + Shift + B (on Mac, ⌘ + Shift + B). Drag the following button onto that bar."],
    ["¿No puedes arrastrarlo?","Can't drag it?"],
    ["Copia la dirección del marcador. Crea un favorito nuevo en el navegador, ponle el nombre Enviar sticker sonoro y pega la dirección copiada en el campo URL. Guarda el favorito.","Copy the bookmark address. Create a new browser bookmark, name it Send sound sticker, paste the copied address into the URL field, and save it."],
    ["Si ya tienes el favorito guardado, salta este paso.","If you already saved the bookmark, skip this step."],
    ["Abre el chat de WhatsApp","Open the WhatsApp chat"],
    ["Inicia sesión en WhatsApp Web y abre el chat de la persona a la que quieres enviar el sticker. Para tu primera prueba, usa tu propio chat.","Sign in to WhatsApp Web and open the recipient's chat. For your first test, use your own chat."],
    ["Abrir WhatsApp Web ↗","Open WhatsApp Web ↗"],
    ["Selecciona el archivo y envía","Choose the file and send"],
    ["Dentro de WhatsApp Web, pulsa el favorito Enviar sticker sonoro. Selecciona el archivo .sonoro.json que descargaste en el paso 1 y pulsa Enviar sticker con sonido. Confirma el destinatario.","In WhatsApp Web, click the Send sound sticker bookmark. Choose the .sonoro.json file downloaded in step 1, click Send sticker with sound, and confirm the recipient."],
    ["Si aparece Activar compatibilidad con sonido, marca esa opción antes de enviar. Comprueba que el sticker se reproduce con sonido.","If Enable sound compatibility appears, check it before sending. Make sure the sticker plays with sound."],
    ["Integración no oficial. La disponibilidad depende de WhatsApp. Tu sesión permanece en tu navegador.","Unofficial integration. Availability depends on WhatsApp. Your session stays in your browser."],
    ["Preparando tu sticker con sonido…","Preparing your sound sticker…"],
    ["Tu sticker está listo para enviar.","Your sticker is ready to send."],
    ["Sticker listo. Sigue los pasos para enviarlo a WhatsApp.","Sticker ready. Follow the steps to send it to WhatsApp."],
    ["Sticker guardado. Puedes enviarlo más tarde desde la web.","Sticker saved. You can send it later from the website."],
    ["Conversión cancelada. Puedes reintentar.","Conversion canceled. You can retry."],
    ["No se pudo preparar el sticker. Revisa el aviso junto a la vista previa.","Could not prepare the sticker. Check the message next to the preview."],
    ["Vista previa del sticker final","Final sticker preview"],
    ["Esta es la calidad real del sticker. Los clips largos pueden necesitar una resolución menor.","This is the actual sticker quality. Long clips may need a lower resolution."],
    ["Este navegador no puede crear el sticker con sonido. Prueba Chrome o Edge actualizado.","This browser cannot create the sound sticker. Try updated Chrome or Edge."],
    ["Puedes reintentar o elegir un tramo más corto.","You can retry or choose a shorter selection."]
  ];
  pairs.push(...[["¿No se pudo importar el video?","Couldn't import the video?"],["Si tienes permiso para descargarlo, abre SnapTik, pega el enlace y guarda el video. Después vuelve aquí y selecciona el archivo descargado.","If you have permission to download it, open SnapTik, paste the link and save the video. Then return here and choose the downloaded file."],["Abrir SnapTik ↗","Open SnapTik ↗"],["Seleccionar video descargado","Choose downloaded video"],["Servicio externo. No enviamos tu enlace automáticamente.","External service. We do not automatically send your link."],["Calidad del sticker","Sticker quality"],["Máxima nitidez (recomendado)","Maximum sharpness (recommended)"],["Equilibrado","Balanced"],["Máxima fluidez","Maximum smoothness"],["El tramo no cabe con la calidad elegida. Acórtalo, cambia el modo de calidad o usa fotograma + audio.","The selection does not fit with the chosen quality. Shorten it, change quality mode, or use frame + audio."],["Resolución reducida. Para mejorar la nitidez, elige un tramo más corto.","Reduced resolution. Choose a shorter selection to improve sharpness."],]);
  pairs.push(...[["Posición horizontal en píxeles","Horizontal position in pixels"],["Posición vertical en píxeles","Vertical position in pixels"],["Zoom en porcentaje","Zoom percentage"],["Imán suave al centro y a los bordes. Arrastra la imagen o escribe un valor exacto.","Soft snap to center and edges. Drag the image or enter an exact value."],["Centrar","Center"]]);
  pairs.push(...[["Posición, zoom y rotación","Position, zoom and rotation"],["Rotación","Rotation"],["Girar 90° a la izquierda","Rotate 90° left"],["Girar 90° a la derecha","Rotate 90° right"],["Girar 180°","Rotate 180°"],["Ángulo de rotación","Rotation angle"]]);
  pairs.push(...[["Firma del creador (opcional)","Creator signature (optional)"],["Tu nombre o alias","Your name or nickname"],["La firma se incluye en los datos del sticker. Todos incluyen la atribución y el enlace de la app. No se añade texto sobre la imagen.","The signature is included in sticker metadata. All stickers include the app credit and link. No text is added over the image."],["Metadatos del sticker no válidos.","Invalid sticker metadata."],["No se pudo verificar la firma del sticker.","Could not verify the sticker signature."]]);
  pairs.push(["El tramo no cabe en 1 MB con al menos 9 FPS y 192 px. Acórtalo o cambia el modo de calidad.","The selection does not fit within 1 MB at 9 FPS or more and 192 px or more. Shorten it or change quality mode."]);
  pairs.push(...[["Límite de tamaño","Size limit"],["Compatible (imagen hasta 1 MB)","Compatible (image up to 1 MB)"],["Calidad ampliada (hasta 2 MB con audio)","Extended quality (up to 2 MB including audio)"],["WhatsApp podría rechazar imágenes de más de 1 MB. Si sucede, usa Compatible. Para enviar archivos grandes, sustituye el favorito de WhatsApp por el nuevo.","WhatsApp may reject images larger than 1 MB. If that happens, use Compatible. Replace your WhatsApp bookmark to send larger files."],["Este sticker supera 1 MB de imagen. Prueba el envío en tu propio chat. Si falla, usa Compatible.","This sticker exceeds 1 MB of image data. Test in your own chat. If it fails, use Compatible."],["La animación puede reducir su calidad para respetar el tamaño elegido.","Animation quality may be reduced to fit the selected size."],]);
  const exact = new Map(pairs);
  const fragments = [
    [/^Duración: ([\d.]+) s\./, "Duration: $1 s."],
    [/^Cargando… /, "Loading… "],
    [/^Error de descarga \((\d+)\)\./, "Download error ($1)."],
    [/^No se puede conectar con Render \(([^)]+)\)\. Comprueba el servidor al pie de la página; puede estar suspendido o no permitir el origen de esta web\./,"Cannot connect to Render ($1). Check the server at the bottom of the page; it may be suspended or not allow this website."],
    [/^Render respondió HTTP (\d+) al comprobar el servidor\./,"Render returned HTTP $1 during the server check."],
    [/^Render está ejecutando una versión antigua \(([^)]+)\)\. No tiene habilitada la importación alternativa de medios\. Despliega el último commit de main en Render\./,"Render is running an older version ($1). Public media import is not enabled. Deploy the latest main commit on Render."],
    [/^Servidor (.+) · importador público disponible$/,"Server $1 · public importer available"],
    [/^Servidor (.+) · editor (.+)\. Actualiza Render si no coinciden\.$/,"Server $1 · editor $2. Update Render if the versions differ."],
    [/^No se pudo abrir el recurso: /,"Could not open resource: "],
    [/^Leyendo cuadros del GIF /,"Reading GIF frames "],[/^Leyendo cuadros /,"Reading frames "],
    [/^Codificando \((\d+) px, (\d+) fps, calidad (\d+)\)/,"Encoding ($1 px, $2 fps, quality $3)"],
    [/^El navegador no puede leer imágenes /,"The browser cannot read images "],
    [/^El navegador no pudo leer la imagen /,"The browser could not read the image "],
    [/^El audio generado no se puede reproducir: /,"The generated audio cannot be played: "],
    [/^Tiempo agotado buscando el segundo /,"Timed out seeking to second "],
    [/^No cabe en el límite de tamaño ni con la calidad mínima \(([^)]+)\)\. Acorta el tramo o reduce la resolución\./,"Does not fit the size limit even at minimum quality ($1). Shorten the selection or reduce resolution."],
    [/^El audio pesa (\d+) KB \(máximo 1000 KB\)/,"Audio is $1 KB (maximum 1000 KB)"],
    [/^El audio dura ([\d.]+) s y el tramo empieza en ([\d.]+) s/,"Audio is $1 s long and the selection starts at $2 s"],
    [/^El sitio no permite acceder al recurso público \(HTTP (\d+)\)\./,"The site does not allow access to the public resource (HTTP $1)."],
    [/^El navegador no pudo leer el video(?: \(código (\d+): (.*)\))?$/,(_,code,detail)=>"The browser could not read the video"+(code?" (code "+code+": "+(detail==="formato no soportado"?"unsupported format":detail)+")":"")],
    [/^Este navegador no puede generar WebP \(devolvió ([^)]+)\)\. Usa Chrome o Edge\.$/,"This browser cannot generate WebP (returned $1). Use Chrome or Edge."],
    [/^No se pudo leer el audio\. ¿El archivo tiene sonido\? \((.*)\)$/,"Could not read audio. Does the file contain sound? ($1)"],
    [/^Con (\d+) s el audio no cabe en 1 MB \(límite de WhatsApp\)\. Máximo unos (\d+) minutos\.$/,"At $1 s the audio exceeds 1 MB (WhatsApp limit). Maximum about $2 minutes."],
    [/^Calidad final: /,"Final quality: "], [/^Peso total: /,"Total size: "],
    [/Imagen fija/g,"Still image"], [/ KB de audio$/," KB audio"],[/ · Versión /," · Version "], [/^Versión /,"Version "]
  ];
  const dynamic = new Set(["link-status","status","selection-info","sticker-state","bridge-status","bookmark-status","service-status","sticker-info","quality-result","size-result","play-source"]);
  const longPhrases = pairs.filter(([a,b]) => a!==b && a.length>=25).sort((a,b)=>b[0].length-a[0].length);
  function english(raw, allowFragments=false) {
    const trimmed=raw.trim();
    let translated=exact.get(trimmed);
    if(translated===undefined && allowFragments){
      translated=trimmed;
      for(const [pattern,replacement] of fragments) translated=translated.replace(pattern,replacement);
      for(const [from,to] of longPhrases) if(translated.includes(from)) translated=translated.split(from).join(to);
      translated=translated.replace(/sin versión/g,"no version").replace(/ KB de audio$/," KB audio");
    }
    if(translated===undefined) return raw;
    return raw.replace(trimmed,()=>translated);
  }
  const stored = new WeakMap(), attrStored = new WeakMap();
  let language="es";
  try { language=localStorage.getItem("stickers.language")==="en"?"en":"es"; } catch {}
  const picker=document.getElementById("language");
  if(!picker)return;
  function translateText(node) {
    if(!node.parentElement || node.parentElement.closest("script,style,textarea,[data-no-translate]") || !node.data.trim())return;
    const parent=node.parentElement, previous=stored.get(node);
    const raw=previous && node.data===previous.rendered ? previous.raw : node.data;
    const rendered=language==="en"?english(raw,dynamic.has(parent.id)||!!parent.closest("footer")||parent.tagName==='TITLE'):raw;
    stored.set(node,{raw,rendered});
    if(node.data!==rendered)node.data=rendered;
  }
  function translateAttrs(el){
    if(!el || el.nodeType!==1)return;
    const history=attrStored.get(el)||{};
    for(const key of ["title","aria-label","alt","placeholder","content"]){
      if(key==="content"&&!el.matches('meta[name="description"]'))continue;
      const value=el.getAttribute(key);if(value===null)continue;
      const previous=history[key],raw=previous&&value===previous.rendered?previous.raw:value;
      const rendered=language==="en"?english(raw):raw;
      history[key]={raw,rendered};if(value!==rendered)el.setAttribute(key,rendered);
    }
    attrStored.set(el,history);
  }
  function scan(root){
    if(root.nodeType===3){translateText(root);return;}
    if(root.nodeType!==1&&root.nodeType!==9)return;
    if(root.nodeType===1)translateAttrs(root);
    root.querySelectorAll("[title],[aria-label],[alt],[placeholder],meta[name=description]").forEach(translateAttrs);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())translateText(walker.currentNode);
  }
  function setLanguage(next){
    language=next==="en"?"en":"es";
    document.documentElement.lang=language;
    picker.value=language;
    document.getElementById("guide-link").href="https://github.com/PoldKent/stickers-sonoros/blob/main/"+(language==="en"?"README.en.md":"README.md");
    document.getElementById("support-link").href="https://github.com/PoldKent/stickers-sonoros/blob/main/SUPPORT.md"+(language==="en"?"#english":"");
    try{localStorage.setItem("stickers.language",language);}catch{}
    scan(document.documentElement);
    document.dispatchEvent(new CustomEvent("sticker-language",{detail:language}));
  }
  picker.addEventListener("change",()=>setLanguage(picker.value));
  window.StickerUI={language:()=>language, translate:(message)=>language==="en"?english(message,true):message};
  setLanguage(language);
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==="characterData")translateText(record.target);
      else if(record.type==="attributes")translateAttrs(record.target);
      else for(const node of record.addedNodes)scan(node);
    }
  }).observe(document.documentElement,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['title','aria-label','alt','placeholder','content']});

  // Move the same preview, not a second player or canvas, into the mobile editor.
  const media=document.getElementById("preview-media");
  const desktop=document.getElementById("desktop-preview-slot");
  const mobile=document.getElementById("mobile-preview-slot");
  const narrow=matchMedia("(max-width: 740px)");
  function layout(){
    const target=narrow.matches?mobile:desktop;
    if(media.parentElement!==target)target.append(media);
  }
  narrow.addEventListener?.("change",layout);
  layout();
})();
