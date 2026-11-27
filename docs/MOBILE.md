# Guía móvil / Mobile guide

## Español

Desde [la web oficial](https://poldkent.github.io/stickers-sonoros/), importa, edita y crea tu sticker. El tamaño máximo de 1 MB total se aplica automáticamente. En Enviar elige WhatsApp App, pulsa Comenzar, introduce tu propio número internacional, acepta los riesgos y completa la verificación de seguridad. Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono e introduce el código mostrado en la web. Regresa a la web; cuando conecte, pulsa Enviar a mi propio chat y confirma. No necesitas una clave del administrador ni compartir contraseñas, SMS o PIN. Solo se permite enviar al chat propio de la cuenta vinculada.

Si tienes un paquete anterior, abre [Enviar sticker guardado](https://poldkent.github.io/stickers-sonoros/mobile.html). El archivo se valida y previsualiza localmente; se transmite al puente al confirmar el envío. En computadora, WhatsApp App es el método principal; el marcador de WhatsApp Web queda dentro de «Otros métodos de envío». Esta alternativa no aparece en celulares.

La vinculación autoriza un dispositivo alojado en el servidor, que podría acceder a mensajes aunque no se solicite el historial completo ni se almacene una bandeja de entrada. El cliente es no oficial y puede causar restricciones. Se recomienda una cuenta secundaria propia. La sesión dura hasta 15 minutos y cinco envíos; capacidad beta de dos sesiones. Cierra la sesión y comprueba Dispositivos vinculados al terminar. Si la entrega es incierta, revisa el chat antes de repetirla. El operador reportó envíos correctos hasta 1 MB y fallos con 2 MB. El límite de 1 MB se aplica a todos los métodos; no garantiza cada entrega.

Estado: Turnstile activo y primer autoenvío .49 confirmado por el operador. Sigue pendiente una prueba simultánea con dos cuentas distintas y cierre verificable. [Configuración](../experiments/mobile-bridge/README.md).

## English

On the [official site](https://poldkent.github.io/stickers-sonoros/), import, edit and create your sticker. The combined 1 MB limit is applied automatically. In Send choose WhatsApp App, Get started, enter your own international number, consent and complete the security check. Open WhatsApp → Linked devices → Link a device → Link with phone number and enter the code displayed on the website. Return to the site, choose Send to my own chat and confirm once linked. No administrator access key, password, SMS or PIN is required. Only the authenticated account's own chat is allowed.

For a saved package, use [Send saved sticker](https://poldkent.github.io/stickers-sonoros/mobile.html). Validation and preview are local; the package is transmitted to the bridge only after confirming. On desktop, WhatsApp App is the default; the WhatsApp Web bookmark is under “Other ways to send”. This alternative is hidden on mobile.

Linking authorizes a server-hosted device that may access messages even with full history sync disabled and no inbox storage. This unofficial client may cause restrictions; use an owned secondary account. Sessions last up to 15 minutes and five sends; beta capacity is two sessions. Disconnect and check Linked devices afterward. If delivery is uncertain, check the chat before retrying. The operator reported successful sends up to 1 MB and failures with 2 MB. All methods now enforce 1 MB; this does not guarantee every delivery.

Status: Turnstile active and first .49 self-send confirmed by the operator. Simultaneous two-account testing and verified closure remain pending. [Setup](../experiments/mobile-bridge/README.md).

Interfaz .51: las instrucciones esenciales permanecen visibles y la ayuda se abre cuando la necesitas. Los riesgos de vincular y la autorización siguen visibles antes de conectar. / .51 interface: essential actions stay visible and help opens when needed. Linking risks and consent remain visible before connecting.

En .55, el marcador de escritorio intenta el envío nativo sin casilla ni bloqueo por el indicador de creación, sin modificar las funciones de WhatsApp Web. Si falla o no confirma el audio, revisa el chat y usa el método principal. La validación binaria del paquete se comparte entre editor, lector y marcador; el servidor verifica de nuevo. / In .55 the desktop bookmark attempts native delivery without a checkbox or creation-flag block, without overriding WhatsApp Web internals. If sending fails or sound is not confirmed, check the chat and use the main method. Editor, reader and bookmark share binary package validation; the server independently validates again.
