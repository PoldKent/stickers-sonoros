/* Spanish/English presentation layer; does not change media or sending logic. */
(() => {
  const pairs = [
    ["Stickers Sonoros · Editor web","Stickers Sonoros · Web editor"],
    ["Crea stickers sonoros de hasta 60 segundos para WhatsApp desde un video, imagen o GIF.","Create sound stickers up to 60 seconds long from video, images or GIFs for WhatsApp."],
    ["Edición local","Local editing"],["Dale sonido","Add sound"],["a tu sticker.","to your sticker."],
    ["Recorta hasta 60 segundos, ajusta el encuadre y prepara tu sticker con sonido.","Trim up to 60 seconds, adjust the frame and create your sticker with sound."],
    ["Tu proyecto","Your project"],["Tipo de proyecto","Project type"],["Video","Video"],["Imagen + audio","Image + audio"],["Video o GIF + audio","Video or GIF + audio"],
    ["Pega un enlace multimedia","Paste a media link"],["Página web, video, imagen o audio","Web page, video, image or audio"],
    ["Importar o reintentar","Import or retry"],["Detectar contenido multimedia","Find media"],["Detectar","Find media"],["Cancelar","Cancel"],
    ["Iniciando el editor…","Starting the editor…"],["Si el video es tuyo, puedes obtener el original desde YouTube Studio. También puedes utilizar el archivo original facilitado por su autor.","If you own the video, download the original from YouTube Studio. You can also use a file provided by its creator."],
    ["Abrir YouTube Studio","Open YouTube Studio"],["Seleccionar archivo original","Choose original file"],["Contenido encontrado","Media found"],["Activa JavaScript para importar y editar videos.","Enable JavaScript to import and edit videos."],
    ["Selecciona o arrastra un video","Choose or drop a video"],["MP4, WebM u otro video compatible","MP4, WebM or other supported video"],
    ["Selecciona o arrastra una imagen","Choose or drop an image"],["PNG, JPEG, WebP u otra imagen compatible","PNG, JPEG, WebP or other supported image"],
    ["Selecciona o arrastra un video o GIF","Choose or drop a video or GIF"],["MP4, WebM o GIF animado","MP4, WebM or animated GIF"],
    ["Pista de audio","Audio track"],["Video desde (s)","Video start (s)"],["Video hasta (s)","Video end (s)"],["Explorar video","Scrub video"],
    ["Marcar inicio","Set start"],["Marcar final","Set end"],["Audio desde (s)","Audio start (s)"],["Audio hasta (s)","Audio end (s)"],
    ["Encuadre","Framing"],["Ajustar","Fit"],["Rellenar","Fill"],["Al terminar la animación","When animation ends"],["Mantener último cuadro","Hold last frame"],["Repetir","Loop"],
    ["Posición y zoom","Position and zoom"],["Horizontal","Horizontal"],["Vertical","Vertical"],["Zoom","Zoom"],
    ["También puedes arrastrar la imagen en la vista previa.","You can also drag the image in the preview."],
    ["Probar un ejemplo","Try an example"],["Crear sticker sonoro","Create sound sticker"],["Cancelar generación","Cancel generation"],
    ["Vista previa","Preview"],["Encuadre del clip","Clip framing"],["Pega un enlace o elige un archivo","Paste a link or choose a file"],
    ["▶ Reproducir tramo","▶ Play selection"],["■ Detener","■ Stop"],["Usar fotograma + audio","Use frame + audio"],["Revisa el video con su sonido antes de generar.","Preview the video with sound before creating."],
    ["Guardar vídeo ↓","Save video ↓"],["Compartir video con WhatsApp u otra app","Share video with WhatsApp or another app"],["Preparar MP4 compatible","Prepare compatible MP4"],
    ["Al pulsar Preparar MP4, solo el clip ya editado se envía temporalmente a nuestro servidor para convertirlo; se elimina al terminar.","Preparing MP4 temporarily uploads only the edited clip to our server for conversion. It is deleted afterwards."],
    ["Archivos del sticker sonoro","Sound sticker files"],["Reintentar conversión","Retry conversion"],["Cancelar conversión","Cancel conversion"],["Sticker generado","Generated sticker"],
    ["Enviar a WhatsApp Web","Send to WhatsApp Web"],["Guardar paquete sonoro ↓","Save sound sticker package ↓"],["Cómo enviar tus stickers","How to send your stickers"],
    ["Una sola vez: muestra la barra de marcadores (Ctrl + Shift + B) y arrastra el marcador de abajo a esa barra. Si no puedes arrastrarlo, copia su dirección y crea un marcador manualmente.","One-time setup on a computer: show the bookmarks bar (Ctrl + Shift + B) and drag the bookmark below onto it. Alternatively, copy its address and create a bookmark manually."],
    ["Enviar sticker sonoro","Send sound sticker"],["Copiar dirección del marcador","Copy bookmark address"],
    ["Abre el chat de tu destinatario en WhatsApp Web, pulsa el marcador Enviar sticker sonoro, selecciona el archivo guardado y confirma el envío.","Open the recipient's chat in WhatsApp Web, click the Send sound sticker bookmark, select your saved file and confirm."],
    ["Abrir WhatsApp Web","Open WhatsApp Web"],
    ["Envío mediante una integración no oficial. Si WhatsApp solicita activar la compatibilidad con sonido, puedes hacerlo temporalmente sin cambiar tu cuenta. La disponibilidad depende de WhatsApp. Tu sesión permanece en tu navegador. Para enviar clips de más de 10 segundos, sustituye el marcador anterior por el nuevo.","Sending uses an unofficial integration. If WhatsApp asks you to enable sound compatibility, you can do so temporarily without changing your account. Availability depends on WhatsApp. Your session stays in your browser. Replace older bookmarks to send clips longer than 10 seconds."],
    ["Animación WebP ↓","WebP animation ↓"],["Audio Ogg ↓","Ogg audio ↓"],
    ["Los archivos WebP y Ogg están vinculados mediante metadatos. Adjuntarlos a un chat como archivos no los convierte en un mensaje de sticker con sonido.","WebP and Ogg files are linked through metadata. Attaching them to a chat as files does not create a sound sticker message."],
    ["Alternativa: crear desde vídeo en el teléfono","Alternative: create from video on your phone"],
    ["Pulsa","Tap"],["Guardar vídeo","Save video"],["y guarda el vídeo en la galería del teléfono (si estás en PC, transfiérelo al teléfono).","and save the video to your phone's gallery (transfer it to your phone if you are on a computer)."],
    ["Abre el chat de WhatsApp en Android o iPhone. Entra en Stickers → Crear sticker y selecciona el vídeo.","Open a WhatsApp chat on Android or iPhone. Go to Stickers → Create sticker and select the video."],
    ["En el editor de WhatsApp, si aparece la opción de sonido, toca el icono de audio, elige la pista disponible y confirma el envío.","In WhatsApp's editor, if the sound option appears, tap the audio icon, choose the available track and confirm."],
    ["Si no aparece el botón de audio, tu cuenta todavía no tiene habilitada esta función. Compartir el vídeo no lo envía como sticker. La web no puede enviar directamente un mensaje de sticker sonoro a tu cuenta personal ni acceder a tus chats.","If there is no audio button, your account does not yet have this feature. Sharing the video does not send it as a sticker. This website cannot access your chats or directly send a sound sticker message from your personal account."],
    ["Edición y conversión locales. La creación del mensaje de sticker sonoro se completa en WhatsApp si la cuenta es compatible.","Editing and conversion are local. Sound sticker messages are completed in WhatsApp when the account supports them."],
    ["Conversor de","Converter by"],["Stickers con sonido, de Shirtep","Shirtep's sound stickers"],["Licencia de uso no comercial","Noncommercial license"],["Comprobar servidor","Check server"],["Idioma","Language"],
    ["En el teléfono, guarda el vídeo para crear el sticker desde WhatsApp si aparece la opción de sonido. El envío mediante marcador está pensado para WhatsApp Web en computadora.","On your phone, save the video and create the sticker in WhatsApp if the sound option is available. Bookmark-based sending is designed for WhatsApp Web on a computer."],
    ["El editor no se inició. Recarga la página con Ctrl + F5 y comprueba que JavaScript esté habilitado.","The editor did not start. Reload the page and check that JavaScript is enabled."],
    ["El archivo es demasiado corto.","The file is too short."],["No pude leer una pista de audio compatible en este archivo.","No supported audio track could be read from this file."],
    ["Para GIF animado, abre el editor en Chrome o Edge actualizado.","For animated GIFs, use an up-to-date Chrome or Edge browser."],
    ["No pude obtener la duración o imagen del video.","Could not read the video duration or image."],["Leyendo archivo…","Reading file…"],["Leyendo la pista de audio…","Reading audio track…"],
    ["Selecciona un tramo válido dentro de la duración del archivo.","Select a valid range within the file duration."],["El navegador devolvió un video vacío.","The browser returned an empty video."],
    ["Este navegador no permite exportar el clip. Prueba con Chrome o Edge actualizado.","This browser cannot export the clip. Try an up-to-date Chrome or Edge browser."],
    ["Selecciona un tramo de audio de hasta 60 segundos.","Select an audio range of up to 60 seconds."],
    ["Creando el clip. Mantén esta pestaña abierta…","Creating clip. Keep this tab open…"],["Vídeo MP4 listo para guardar en la galería.","MP4 ready to save to your gallery."],
    ["Este navegador exportó WebM. Si tu galería no lo admite, utiliza un navegador compatible con exportación MP4.","This browser exported WebM. If your gallery does not support it, use a browser that can export MP4 or prepare a compatible MP4."],
    ["Vídeo preparado. Generando los archivos del sticker sonoro…","Video ready. Creating sound sticker files…"],["Generación cancelada.","Creation canceled."],["No pude crear el clip.","Could not create the clip."],
    ["Vídeo preparado para el editor de stickers de WhatsApp.","Video ready for WhatsApp's sticker editor."],
    ["Archivo compartido como vídeo, no como sticker. Usa Crear sticker en WhatsApp para añadir el sonido.","Shared as a video, not a sticker. Use Create sticker in WhatsApp to add sound."],
    ["El navegador no pudo compartir el archivo. Puedes descargarlo.","The browser could not share the file. You can download it."],
    ["Importación cancelada.","Import canceled."],["Introduce una URL HTTPS válida.","Enter a valid HTTPS URL."],["El archivo supera el límite permitido.","The file exceeds the allowed size."],
    ["El navegador no permite leer esta descarga.","The browser cannot read this download."],["El archivo está vacío.","The file is empty."],
    ["El recurso no devolvió un video, imagen o audio compatible.","The resource did not return supported video, image or audio."],
    ["▶ Video","▶ Video"],["▧ Imagen","▧ Image"],["♫ Audio","♫ Audio"],["Contenido seleccionado","Selected media"],
    ["Audio cargado. Ajusta el tramo.","Audio loaded. Adjust the selection."],["Audio cargado. Selecciona una imagen o GIF para acompañarlo.","Audio loaded. Choose an image or GIF to go with it."],
    ["Imagen cargada. Ajusta el encuadre.","Image loaded. Adjust the framing."],["Imagen cargada. Añade una pista de audio.","Image loaded. Add an audio track."],
    ["Video cargado sin pista de audio compatible. Añade un audio.","Video loaded without a supported audio track. Add audio."],
    ["Video listo. Ajusta el tramo y el encuadre en la vista previa.","Video ready. Adjust the selection and framing in the preview."],
    ["No hay un servidor de importación configurado.","No import server is configured."],["Dirección de servidor no válida.","Invalid server address."],
    ["Render no devolvió el estado JSON del descargador. Revisa su despliegue.","Render did not return the downloader status. Check its deployment."],
    ["El servidor de importación no está disponible.","The import server is unavailable."],
    ["La fuente no permite acceso directo y el servidor alternativo no está configurado.","The source does not allow direct access and no fallback server is configured."],
    ["La fuente no permite acceso directo. Comprobando Render…","Direct access is unavailable. Checking Render…"],["Descargando el recurso público mediante Render…","Downloading public media through Render…"],
    ["Cargando recurso seleccionado…","Loading selected media…"],["No se pudo abrir el recurso.","Could not open the resource."],
    ["El sitio no permite acceder al archivo desde esta web (CORS). Si tienes permiso, importa el archivo original.","The site does not allow this website to access the file (CORS). If authorized, import the original file."],
    ["Espera a que termine la generación antes de importar.","Wait for creation to finish before importing."],["Pega un enlace HTTPS de un video.","Paste an HTTPS video link."],
    ["Comprobando enlace…","Checking link…"],["Pega primero el enlace de un video.","Paste a video link first."],["Pega el enlace de un solo video de YouTube.","Paste a link to a single YouTube video."],
    ["El enlace es de una red social, pero el servidor de descarga todavía no está conectado a esta web. No se ha descargado el video. Puedes seleccionar un MP4 del dispositivo mientras se activa el servicio.","This is a social media link, but the download server is not connected to this website yet. No video was downloaded. You can choose an MP4 from your device."],
    ["Servicio de descarga no disponible.","Download service unavailable."],["Conectando con el servidor de descarga…","Connecting to the download server…"],["Conectando con el video…","Connecting to video…"],["Obteniendo video y audio…","Getting video and audio…"],
    ["Respuesta de detección no válida.","Invalid media detection response."],["Selecciona el video, imagen o audio que quieras utilizar.","Choose the video, image or audio you want to use."],
    ["No se encontraron archivos multimedia directos. El sitio puede utilizar reproducción dinámica.","No direct media files found. The site may use dynamic playback."],["Cargando en el editor…","Loading into the editor…"],
    ["Importación cancelada o tiempo agotado.","Import canceled or timed out."],["No se pudo acceder al enlace. La página puede bloquear el acceso desde otras webs (CORS) o estar desconectada.","Could not access the link. The page may block cross-origin access (CORS) or be offline."],
    ["Selecciona un archivo con audio. Máximo 60 segundos por sticker.","Choose a file with audio. Up to 60 seconds per sticker."],
    ["La animación puede reducir su calidad para caber en 1 MB.","Animation quality may be reduced to fit within 1 MB."],["Reduce el tramo antes de generar.","Shorten the selection before creating."],
    ["El final debe estar después del inicio.","The end must be after the start."],["Los archivos superan el límite del conversor o están vacíos.","The files exceed the converter limit or are empty."],["El formato generado no es válido.","The generated format is invalid."],
    ["WebP incompleto.","Incomplete WebP."],["No se pudo verificar la vinculación del sonido.","Could not verify the sound link."],
    ["Comprobando compatibilidad del navegador…","Checking browser compatibility…"],["No se cargó el conversor. Recarga la página.","The converter did not load. Reload the page."],
    ["Este navegador no puede codificar WebP y Opus. Prueba Chrome o Edge actualizado. El vídeo para WhatsApp sigue disponible.","This browser cannot encode WebP and Opus. Try an up-to-date Chrome or Edge browser. Your video is still available."],
    ["Animación y audio generados. Vinculación SHA-256 verificada.","Animation and audio created. SHA-256 link verified."],["Conversión cancelada. El vídeo sigue disponible.","Conversion canceled. The video is still available."],
    ["No se pudo generar el sticker.","Could not create the sticker."],["Puedes guardar el vídeo y crearlo dentro de WhatsApp.","You can save the video and create the sticker in WhatsApp."],
    ["Ejemplo preparado. Pulsa Crear sticker sonoro.","Example ready. Click Create sound sticker."],["Reduce el tramo a 60 segundos.","Shorten the selection to 60 seconds."],
    ["Pega un enlace para detectar video, imagen o audio.","Paste a link to find video, image or audio."],["Importa un archivo de video mediante un enlace directo. YouTube, TikTok e Instagram requieren el servidor de descarga, todavía sin conectar.","Import a video from a direct link. YouTube, TikTok and Instagram require the download server, which is not connected yet."],
    ["Fotograma seleccionado con el audio original. Puedes ajustar el tramo sonoro.","Frame selected with original audio. Adjust the sound selection."],
    ["Preparando MP4 con sonido…","Preparing MP4 with sound…"],["El servidor aún no admite clips de esta duración. Actualiza Render o guarda el vídeo original.","The server does not yet support clips this long. Update Render or save the original video."],
    ["El servidor no devolvió un MP4.","The server did not return an MP4."],["Guardar vídeo MP4 ↓","Save MP4 video ↓"],["MP4 preparado. En WhatsApp, usa Crear sticker y conserva el audio si la función está disponible.","MP4 ready. In WhatsApp, use Create sticker and retain audio if available."],
    ["Conversión cancelada o agotada.","Conversion canceled or timed out."],["Puedes seguir descargando el clip original.","You can still download the original clip."],
    ["Sticker guardado. Abre WhatsApp Web y usa el marcador para enviarlo.","Sticker saved. Open WhatsApp Web and use the bookmark to send it."],
    ["No se pudo guardar el paquete.","Could not save the package."],["Arrastra el marcador a tu barra de favoritos. Luego úsalo dentro de WhatsApp Web.","Drag the bookmark onto your bookmarks bar. Then use it in WhatsApp Web."],
    ["Dirección copiada. Crea un marcador nuevo y pega esta dirección en su campo URL.","Address copied. Create a new bookmark and paste this address into its URL field."],
    ["No se pudo copiar. Arrastra el enlace a la barra de marcadores.","Could not copy. Drag the link to the bookmarks bar."],["No se cargó la opción de envío. Recarga la página.","The sending option did not load. Reload the page."],
    ["Comprobando servidor…","Checking server…"],["Servidor no configurado.","Server not configured."],["El servidor no respondió a tiempo.","The server did not respond in time."],
    ["El navegador no pudo leer el video.","The browser could not read the video."],["El video tardó demasiado en abrirse.","The video took too long to open."],
    ["Falló la codificación.","Encoding failed."],["La generación tardó demasiado. Mantén la pestaña visible y vuelve a intentar.","Creation timed out. Keep the tab visible and try again."],
    ["Tiempo agotado cargando el video","Timed out loading video"],["El video no tiene imagen (¿es solo audio?)","The video has no image (audio only?)"],
    ["Este navegador no puede leer GIF animados (falta ImageDecoder). Usa Chrome o Edge actualizados.","This browser cannot read animated GIFs. Use updated Chrome or Edge."],
    ["El navegador no puede leer imágenes","The browser cannot read images"],["El navegador no pudo leer la imagen","The browser could not read the image"],
    ["El canvas no devolvió un WebP válido","The canvas did not return a valid WebP"],["WebP sin datos de imagen","WebP contains no image data"],
    ["Este navegador no tiene WebCodecs (AudioEncoder). Usa Chrome o Edge actualizados.","This browser lacks WebCodecs AudioEncoder. Use updated Chrome or Edge."],
    ["El navegador no puede codificar Opus con WebCodecs","The browser cannot encode Opus using WebCodecs"],["Página Ogg con demasiados segmentos","Ogg page has too many segments"],
    ["Leyendo la imagen…","Reading image…"],["Imagen lista","Image ready"],["Calculando opciones…","Calculating options…"],["Opciones listas","Options ready"],
    ["Extrayendo audio…","Extracting audio…"],["Codificando audio…","Encoding audio…"],["Listo","Ready"],
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
    ["La publicación no está disponible para el servidor.","The post is unavailable to the server."],["La descarga superó un límite de recursos del servidor.","The download exceeded a server resource limit."],
    ["No se pudo obtener el video. El servidor no recibió un archivo válido; prueba otro enlace autorizado.","Could not retrieve the video. The server did not receive a valid file; try another authorized link."],
    ["El archivo descargado está vacío o supera 80 MB.","The downloaded file is empty or exceeds 80 MB."],["El video supera el máximo de 10 minutos.","The video exceeds 10 minutes."],
    ["El archivo descargado no contiene ambas pistas: video y sonido. Selecciona otro contenido o combina un video con audio en el editor.","The downloaded file lacks video or audio. Choose other media or combine video with audio in the editor."],
    ["El archivo no contiene video y audio compatibles.","The file does not contain supported video and audio."],
    ["El video se descargó, pero no pudo convertirse a MP4 con audio dentro de los límites del servidor.","The video downloaded but could not be converted to MP4 with audio within server limits."],
    ["El servicio está ocupado. Reintenta en unos segundos.","The service is busy. Try again shortly."],["Límite temporal de importaciones alcanzado.","Import rate limit reached."],
    ["La descarga o conversión excedió el tiempo disponible.","The download or conversion timed out."],["El archivo recibido no tiene metadatos compatibles.","The received file has incompatible metadata."],
    ["El servicio de descarga no está disponible.","The download service is unavailable."],["Introduce un enlace HTTPS público válido.","Enter a valid public HTTPS link."],
    ["Solo se admiten URLs HTTPS de sitios públicos.","Only HTTPS URLs from public sites are supported."],["No se pudo encontrar el sitio.","The site could not be found."],
    ["El recurso supera el tamaño permitido.","The resource exceeds the allowed size."],["El recurso está vacío o incompleto.","The resource is empty or incomplete."],
    ["No se pudo establecer una conexión HTTPS válida con el recurso.","Could not establish a valid HTTPS connection to the resource."],
    ["La publicación no ofrece una dirección de descarga.","The post does not provide a download address."],["TikTok no ofreció un archivo público accesible.","TikTok did not provide an accessible public file."],
    ["La publicación no permite descargar el vídeo.","The post does not allow video downloads."],["Publicación no disponible.","The post is unavailable."],
    ["La publicación no está disponible para descarga pública.","The post is unavailable for public download."],["No se encontraron datos públicos de descarga.","No public download data was found."],
    ["Se necesita un enlace completo de TikTok.","A full TikTok link is required."],["Dirección de descarga no admitida.","Unsupported download address."],["El recurso no es un MP4 válido.","The resource is not a valid MP4."],["La publicación cambió durante la consulta.","The post changed during the request."],["Datos de publicación ambiguos.","Ambiguous post data."],["La dirección no pertenece a una red pública.","The address is not on a public network."],["Tiempo de descarga agotado.","Download timed out."],["Redirección sin destino.","Redirect without a destination."],["Demasiadas redirecciones.","Too many redirects."],["El recurso utiliza una codificación no admitida.","The resource uses unsupported encoding."],["El enlace no ofrece un formato multimedia o HTML compatible.","The link does not provide a supported media or HTML format."],["No se pudo preparar el MP4 con sonido.","Could not prepare MP4 with sound."],["Límite temporal alcanzado.","Rate limit reached."],["Se requiere un WebM de hasta 16 MiB.","A WebM file up to 16 MiB is required."],["El archivo no es un WebM compatible.","The file is not a supported WebM."],["El clip recibido está incompleto.","The received clip is incomplete."],
    ["Alternativa de descarga pública:","Public download fallback:"],
    ["No se pudo preparar el MP4 con sonido.","Could not prepare MP4 with sound."],["La preparación del MP4 tardó demasiado.","MP4 preparation timed out."],["No se pudo preparar el MP4.","Could not prepare MP4."]
  ];
  pairs.push(...[["El video no respondió al recorte.","The video did not respond to seeking."],["La reproducción no entregó cuadros","Playback returned no frames"],["La reproducción se detuvo","Playback stopped"],["sin requestVideoFrameCallback","requestVideoFrameCallback unavailable"],["Primero calcula las opciones del tramo","Calculate the selection options first"],["La duración del audio cambió: vuelve a calcular las opciones","Audio duration changed: recalculate the options"],["El navegador no pudo leer el video","The browser could not read the video"],["No se pudo leer el audio. ¿El archivo tiene sonido?","Could not read audio. Does the file contain sound?"],["Generación cancelada","Creation canceled"],["Cancelado","Canceled"],["No se pudo abrir el recurso:","Could not open resource:"],["Enlace no válido.","Invalid link."],["Solo se admiten enlaces HTTPS públicos.","Only public HTTPS links are supported."],["Dominio no permitido para esta descarga.","Domain not allowed for this download."],["Esta plataforma requiere su importador específico.","This platform requires its specific importer."],["Origen o ruta no permitidos.","Origin or route not allowed."],["Origen no permitido.","Origin not allowed."],["Ruta no encontrada.","Route not found."],["Archivo no disponible.","File unavailable."],["El archivo local supera 80 MiB. Selecciona un archivo más pequeño.","The local file exceeds 80 MiB. Choose a smaller file."],["Apoyar el proyecto","Support the project"],["Comprobar servidor","Check server"],["Revisa la red y el token antes de donar.","Check the network and token before donating."]]);
  pairs.push(["Saltar al editor","Skip to editor"],["Información del proyecto","Project information"],["Guía de uso","User guide"]);
  const exact = new Map(pairs);
  const fragments = [
    [/^Duración: ([\d.]+) s de (\d+) s permitidos\./, "Duration: $1 s of $2 s allowed."],
    [/^Guardar vídeo \(([^)]+)\) ↓$/, "Save video ($1) ↓"],
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
    [/^Tiempo agotado buscando el segundo /,"Timed out seeking to second "],
    [/^No cabe en 1 MB ni con la calidad mínima \(([^)]+)\)\. Elige menos fps o menos resolución\./,"Does not fit within 1 MB even at minimum quality ($1). Shorten the selection or reduce resolution."],
    [/^El audio pesa (\d+) KB \(máximo 1000 KB\)/,"Audio is $1 KB (maximum 1000 KB)"],
    [/^El audio dura ([\d.]+) s y el tramo empieza en ([\d.]+) s/,"Audio is $1 s long and the selection starts at $2 s"],
    [/^El sitio no permite acceder al recurso público \(HTTP (\d+)\)\./,"The site does not allow access to the public resource (HTTP $1)."],
    [/^El navegador no pudo leer el video(?: \(código (\d+): (.*)\))?$/,(_,code,detail)=>"The browser could not read the video"+(code?" (code "+code+": "+(detail==="formato no soportado"?"unsupported format":detail)+")":"")],
    [/^Este navegador no puede generar WebP \(devolvió ([^)]+)\)\. Usa Chrome o Edge\.$/,"This browser cannot generate WebP (returned $1). Use Chrome or Edge."],
    [/^No se pudo leer el audio\. ¿El archivo tiene sonido\? \((.*)\)$/,"Could not read audio. Does the file contain sound? ($1)"],
    [/^Con (\d+) s el audio no cabe en 1 MB \(límite de WhatsApp\)\. Máximo unos (\d+) minutos\.$/,"At $1 s the audio exceeds 1 MB (WhatsApp limit). Maximum about $2 minutes."],
    [/ KB de audio$/," KB audio"],[/ · Versión /," · Version "], [/^Versión /,"Version "]
  ];
  const dynamic = new Set(["link-status","status","selection-info","sticker-state","format-note","bridge-status","service-status","sticker-info","download","play-source"]);
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
    const rendered=language==="en"?english(raw,dynamic.has(parent.id)||!!parent.closest("footer")):raw;
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
      else for(const node of record.addedNodes)scan(node);
    }
  }).observe(document.documentElement,{childList:true,characterData:true,subtree:true});

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
