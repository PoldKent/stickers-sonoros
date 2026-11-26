# Guía móvil / Mobile guide

[Español](#español) · [English](#english) · [Web oficial / Official app](https://poldkent.github.io/stickers-sonoros/) · [README](../README.md) · [English README](../README.en.md)

## Español

### Usar Stickers Sonoros desde el teléfono

1. **Importar:** selecciona el contenido y audio; pulsa Siguiente.
2. **Editar:** recorta y ajusta el encuadre en la vista previa; pulsa Siguiente.
3. **Crear:** elige calidad, tamaño y firma; genera el sticker y revisa el resultado.
4. **Enviar:** guarda el archivo `.sonoro.json`, abre [la herramienta móvil](https://poldkent.github.io/stickers-sonoros/mobile.html), selecciónalo y guarda el video preparado o PNG/audio. En WhatsApp, abre tu propio chat → stickers → Crear → selecciona el medio y añade sonido si está disponible. También puedes seguir la [guía de WhatsApp Web](../README.md#enviar-a-whatsapp) para enviar el paquete original.

El editor conserva los cambios al retroceder. El paquete tiene un presupuesto de hasta 2 MB de WebP + Ogg y al menos 9 FPS para animaciones, sin tope temporal fijo. El envío directo de este JSON desde la app móvil no está implementado.

### Editor nativo e investigación

Según los informes registrados el 25 de noviembre de 2026, WhatsApp distribuye gradualmente creación nativa de stickers con audio en [Android beta 2.26.47.1](https://wabetainfo.com/whatsapp-is-rolling-out-new-sound-sticker-messages-on-android/) y [iOS beta 26.46.10.70](https://wabetainfo.com/whatsapp-is-rolling-out-sticker-messages-with-audio-on-ios/). Si tu cuenta ofrece la función, abre el teclado de stickers, elige Crear, selecciona el video, pulsa audio, conserva el original o selecciona otro archivo y envía. No se ha probado el traspaso del paquete JSON ni los límites del editor nativo.

Las APIs públicas de paquetes [Android](https://github.com/WhatsApp/stickers/tree/main/Android) e [iOS](https://github.com/WhatsApp/stickers/tree/main/iOS) no documentan una pista sonora vinculada. La hoja de compartir y una PWA no crean por sí solas un sticker sonoro; WhatsApp Business no sustituye la cuenta personal. No se copiarán sesiones, permisos ni credenciales.

### Pruebas de aceptación

Registra dispositivo, versión, duración, bytes WebP + Ogg, FPS codificados, envío, recepción, reproducción y reenvío. Prueba primero en tu propio chat y después con un destinatario que consienta. Casos: 2, 30, 61 y 240 s y un paquete próximo a 2 MB. Anota rechazos y errores sin compartir credenciales ni QR. No se considera verificado el envío nativo hasta probarlo en equipos reales.

## English

### Using Stickers Sonoros on your phone

1. **Import:** select content and audio; choose Next.
2. **Edit:** trim and adjust framing in the preview; choose Next.
3. **Create:** choose quality, size and signature; generate the sticker and inspect the result.
4. **Send:** save the `.sonoro.json` file, open [the mobile tool](https://poldkent.github.io/stickers-sonoros/mobile.html), select it and save prepared video or PNG/audio. In WhatsApp, open your own chat → stickers → Create → select media and add sound if available. You can also use the [WhatsApp Web guide](../README.en.md#send-to-whatsapp) to send the original package.

Going back preserves your edits. The package has a budget of up to 2 MB of WebP + Ogg and at least 9 FPS for animations, with no fixed time cap. Direct sending of this JSON from the mobile app is not implemented.

### Native editor and research

According to the reports recorded on November 25, 2026, WhatsApp is gradually rolling out native sound sticker creation on [Android beta 2.26.47.1](https://wabetainfo.com/whatsapp-is-rolling-out-new-sound-sticker-messages-on-android/) and [iOS beta 26.46.10.70](https://wabetainfo.com/whatsapp-is-rolling-out-sticker-messages-with-audio-on-ios/). If available for your account, open the sticker keyboard, choose Create, select a video, tap audio, keep the original sound or choose another file, then send. JSON handoff and native editor limits have not been tested.

Public [Android](https://github.com/WhatsApp/stickers/tree/main/Android) and [iOS](https://github.com/WhatsApp/stickers/tree/main/iOS) sticker pack APIs do not document a linked sound track. Share sheets and PWAs do not create sound stickers by themselves; WhatsApp Business is not a replacement for personal accounts. No sessions, permissions or credentials will be copied.

### Acceptance tests

Record device, version, duration, WebP + Ogg bytes, encoded FPS, sending, receiving, playback and forwarding. Test your own chat first, then a consenting recipient. Cases: 2, 30, 61 and 240 s, plus a package near 2 MB. Record rejections and errors without sharing credentials or QR codes. Native sending is not verified until tested on real devices.

## Puente local / Local handoff

El puente verifica el formato, tamaño combinado, dimensiones y SHA-256 del audio vinculado en EXIF. Los archivos originales no se modifican ni se suben. La exportación de video es una ruta independiente para el editor móvil (MP4 cuando el navegador lo permite; WebM como alternativa), no el mecanismo de envío del sticker. El editor nativo puede volver a comprimir o recortar y perder la atribución. El informe de [Infobae del 26/11/2026](https://www.infobae.com/tecno/2026/11/26/stickers-con-sonido-en-whatsapp-si-tienen-restricciones-que-no-puedo-hacer-en-sound-stickers/) menciona 5 s para video y 10 s para imagen; no son límites verificados de la API ni del paquete JSON. No se imponen al conversor. Probar en dispositivos reales.

The handoff checks format, combined size, dimensions and SHA-256 linkage in EXIF. Original files remain unchanged and are not uploaded. Video export is a separate input-preparation route (MP4 if supported; otherwise WebM), not sticker sending. Native editing may recompress, trim or lose attribution. The November 26 Infobae report mentions 5 seconds for video and 10 for still images; these are not verified API or JSON package limits and are not imposed on the converter. Real-device testing is required.

### Después de preparar el medio / After preparing media

Reproduce la vista previa del video, pulsa Guardar video preparado y después Abrir WhatsApp. El botón intenta abrir la aplicación mediante su esquema de URL; si no funciona, ábrela manualmente. Selecciona el archivo descargado desde Stickers → Crear, nunca desde el selector de documentos del chat. Si el editor no tiene audio, el puente no puede enviar un sticker sonoro por sí mismo. El marcador de escritorio permite enviar el paquete a tu propio chat y reutilizarlo en el teléfono, sujeto a aceptación por WhatsApp.

Play the video preview, save the prepared video, then open WhatsApp. The button attempts to launch the app via its URL scheme; open it manually if unsupported. Select the downloaded media inside Stickers → Create, not the chat document picker. If the editor lacks sound, the handoff cannot send sound stickers itself. The desktop bookmark can send the package to your own chat for reuse on mobile, subject to WhatsApp acceptance.

### Presupuesto experimental / Experimental budget (.43)

Los paquetes nuevos usan hasta 2 MB combinados (WebP + Ogg); los lectores siguen aceptando paquetes anteriores de hasta 4 MB. Esto no habilita el envío nativo de JSON ni garantiza que WhatsApp acepte 2 MB.

New packages use up to 2 MB combined (WebP + Ogg); readers still accept older packages up to 4 MB. This does not enable native JSON sending or guarantee WhatsApp acceptance at 2 MB.

### Prueba de envío privado desde la web / Private web delivery trial (.44)

El panel experimental de la etapa Enviar y del lector móvil permite conectar un puente privado separado por código de vinculación, sin ordenador. Requiere que el propietario despliegue y configure el servicio, una cuenta secundaria propia y una prueba real. No es una importación nativa oficial. [Configuración y riesgos](../experiments/mobile-bridge/README.md#prueba-web-móvil--mobile-web-trial).

The experimental Send-stage and mobile-reader panel can connect a separately deployed private bridge by pairing code, without a computer. Requires operator deployment, an owned secondary account and real acceptance testing. Not official native import. [Setup and risks](../experiments/mobile-bridge/README.md#prueba-web-móvil--mobile-web-trial).
