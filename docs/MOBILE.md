# Envío móvil sin WhatsApp Web / Mobile sending without WhatsApp Web

## Objetivo / Goal

Crear un sticker con sonido en el teléfono y enviarlo desde la aplicación oficial de WhatsApp, sin ordenador, sin WhatsApp Web y sin compartir un vídeo en lugar de un sticker. No se considera completado hasta verificar animación, sonido y recepción en un dispositivo real.

## Investigación / Research

| Método / Method | Estado / Status |
|---|---|
| [WhatsApp Android sticker API](https://github.com/WhatsApp/stickers/tree/main/Android) | Importa paquetes mediante un ContentProvider y confirmación del usuario. No documenta una pista de audio vinculada. |
| [WhatsApp iOS sticker API](https://github.com/WhatsApp/stickers/tree/main/iOS) | Importa paquetes desde una aplicación nativa. No documenta stickers sonoros. |
| Web Share API / Android share sheet / iOS share sheet | Comparte archivos; no crea por sí mismo mensajes de sticker con sonido. |
| WhatsApp editor on phone | Probar con una cuenta que ofrezca creación de stickers con audio; no asumir disponibilidad ni duración. |
| [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/) | No sustituye la cuenta personal; no se ha identificado una API oficial pública para enviar el formato sonoro. |

## Fase inicial / Initial phase

1. Probar en Android y iOS el editor oficial de stickers con un vídeo propio corto que contenga audio.
2. Registrar versión, disponibilidad del selector de audio, reproducción en chat propio y recepción desde otra cuenta.
3. Si el editor permite sonido, investigar un flujo de transferencia explícita del clip desde la web al editor nativo; no etiquetar un envío de vídeo como sticker.
4. Si existe un contrato oficial de importación sonora, crear un prototipo nativo aislado con consentimiento y sin copiar credenciales. Una PWA o un wrapper nativo por sí solos no añaden soporte al protocolo.
5. Validar clips de 2, 10, 30 y 60 segundos y resoluciones reales, límites de tamaño, envío, reenvío y reproducción.

No se modificarán permisos de cuenta, no se extraerán sesiones ni se añadirá un cliente no oficial en el servidor. El paquete actual sigue disponible para WhatsApp Web. El envío directo móvil aún no está implementado.

## English summary

The goal is a real sound sticker sent from the official mobile app, not a video attachment. Public Android/iOS sticker-pack samples do not document the audio linkage. Test the official phone editor on actual devices first; investigate an authorized handoff or documented native sound-sticker import if available. Validate 2–60-second clips, size, playback and receiving-account compatibility before shipping. No session extraction, server-side unofficial client, or automatic sending. Existing desktop sending remains unchanged.
