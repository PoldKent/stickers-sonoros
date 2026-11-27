# Guía móvil / Mobile guide

[Español](#español) · [English](#english) · [Web oficial / Official app](https://poldkent.github.io/stickers-sonoros/)

## Español

1. Importa el contenido y audio.
2. Edita el recorte y encuadre.
3. Crea el sticker y revisa su vista previa.
4. En la pantalla Enviar, abre el puente privado, introduce la clave, vincula tu cuenta secundaria si corresponde, selecciona el nivel y confirma el envío individual.

Si ya tienes un paquete, abre [Enviar sticker guardado](https://poldkent.github.io/stickers-sonoros/mobile.html), selecciona el JSON y continúa directamente desde el panel de envío. El lector verifica WebP, Ogg, dimensiones y SHA-256; admite hasta 2 MB combinados y conserva los archivos sin reconversión. La carga y vista previa son locales; solo al confirmar el envío se transmite el paquete al puente privado. No adjuntes el JSON al chat esperando un sticker. Las exportaciones PNG, WAV y video y las instrucciones de creación en el editor nativo fueron retiradas en .46.

El puente es experimental y no oficial: usa solo una cuenta secundaria propia; existe riesgo de restricciones. Protege la clave, cierra la sesión y desvincula el dispositivo después de probar. Consulta [configuración](../experiments/mobile-bridge/README.md). El conversor mantiene 9 FPS mínimos y 2 MB combinados sin límite fijo de duración; el puente aplica límites experimentales adicionales. Para escritorio sigue disponible el marcador.

## English

1. Import content and audio.
2. Edit trim and framing.
3. Create the sticker and inspect the preview.
4. On the Send screen, open the private bridge, enter your key, link your secondary account if needed, select the tier and authorize each send.

For an existing package, open [Send saved sticker](https://poldkent.github.io/stickers-sonoros/mobile.html), select the JSON and continue directly to the sending panel. The reader validates WebP, Ogg, dimensions and SHA-256; it accepts up to 2 MB combined and preserves original files. Loading and preview are local; the package is transmitted to the private bridge only when sending is confirmed. Do not attach JSON to a chat expecting a sticker. PNG, WAV and video exports and native-editor creation instructions were removed in .46.

This experimental bridge is unofficial: use an owned secondary account only; restrictions are possible. Protect the key, close the session and unlink the device after testing. See [setup](../experiments/mobile-bridge/README.md). The converter retains the 9 FPS floor and 2 MB combined budget without a fixed duration cap; the bridge has additional experimental limits. The desktop bookmark remains available.

### Validación inicial / Initial acceptance (2026-11-27)

El operador confirmó desde su celular el primer envío mediante el puente privado, recepción como sticker, reproducción del sonido, favoritos y reenvío con sonido. Render confirma el despliegue activo y GitHub confirma las pruebas automatizadas de la revisión bcf7d48. No se registraron los bytes exactos, duración, versión de WhatsApp ni dispositivo, ni se comparó el contenido después de la entrega. La prueba de 2 MB, los envíos repetidos, otras cuentas y la importación nativa oficial siguen pendientes. El puente sigue limitado a una prueba de 1–3 s y menos de 500 KB por componente; usa una cuenta secundaria propia y desvincula el dispositivo al terminar.

The operator confirmed mobile-only sending, receipt as a sticker, audio playback, favorites and forwarding with sound. Render deployment and GitHub CI for bcf7d48 are verified; physical-device behavior is operator-reported. Exact sample bytes, duration, WhatsApp version, device and post-delivery content identity were not recorded. The 2 MB trial, repeat sends, other accounts and official native import remain unverified. The bridge remains a private one-shot trial of 1–3 s and under 500 KB per component. Use an owned secondary account and unlink after testing.

### .45 — Sesión privada reutilizable / Reusable private session

La URL del puente se fija a su servicio Render oficial; la clave se mantiene en memoria de la página. Vinculación por código con consulta automática mientras el panel está abierto. Hasta cinco intentos de envío por sesión de 15 minutos, cinco segundos entre intentos, sin duplicados del mismo par de medios, destinatario fijo y confirmación individual. Niveles experimentales: inicial 1–3 s y <500 KB por componente; intermedio ≤15 s y ≤1 MB total; ampliado ≤60 s y ≤2 MB total. Estos límites son del puente, no del conversor ni de WhatsApp. No se ha validado todavía la aceptación real de los niveles ampliados ni los envíos múltiples. La sesión es efímera y se debe desvincular manualmente. En caso de envío incierto, no se reintenta automáticamente. El transporte no es oficial.

The official bridge URL is fixed; the access key stays in page memory. Pairing status polls while the panel is open. Up to five send attempts per 15-minute session, five seconds between attempts, duplicate media rejected, fixed recipient and individual consent. Trial tiers: initial 1–3 s and <500 KB per component; intermediate ≤15 s and ≤1 MB combined; extended ≤60 s and ≤2 MB combined. These are bridge limits, not converter or WhatsApp limits. Larger tiers and repeat sends still require real device acceptance. Ephemeral session; manually unlink afterward. No automatic retry after uncertain delivery. Unofficial transport.
