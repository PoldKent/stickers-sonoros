# Stickers Sonoros

![Stickers Sonoros — identidad visual](docs/images/brand.svg)

**Crea stickers con sonido para WhatsApp desde tu navegador.**  
Video, imagen o GIF + audio · sin duración fija · Español / English.

[**Abrir aplicación**](https://poldkent.github.io/stickers-sonoros/) · [Servidor Render](https://stickers-sonoros.onrender.com/) · [English README](README.en.md) · [❤️ Apoyar el proyecto](SUPPORT.md)

[![Pruebas automatizadas](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml/badge.svg)](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml)

![Esquema ilustrativo del editor en computadora y teléfono](docs/images/interface.svg)

[Capturas reales de las pruebas de interfaz](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) (artefactos temporales de cada ejecución).

## Cómo funciona

![Flujo: importar, editar, crear y enviar](docs/images/workflow.svg)

1. Pega un enlace multimedia HTTPS o selecciona un archivo de tu dispositivo.
2. Reproduce el tramo, elige el inicio y el final (o selecciona el archivo completo) y ajusta el encuadre, posición o zoom.
3. Pulsa **Crear sticker sonoro**. El editor prepara localmente un paquete con WebP y Ogg/Opus vinculados, si el navegador dispone de los códecs necesarios.
4. Sigue los cuatro pasos de envío que aparecen debajo de la vista previa. La única descarga del editor es `nombre-original.sonoro.json`.

El archivo descargado conserva el nombre base del archivo de origen: `mi-video.mp4` → `mi-video.sonoro.json`. El marcador valida el contenido del JSON, no su nombre.

## Firma del sticker

Añade opcionalmente tu nombre o alias (hasta 40 caracteres). Cada sticker generado contiene en el EXIF el nombre de paquete **Creado en Stickers Sonoros** y el enlace de la aplicación en el campo de autor, junto con tu firma si la indicas. No se modifica la imagen ni el audio; se conserva la vinculación SHA-256. La firma es pública para quienes reciban el sticker. WhatsApp puede variar cómo muestra esos campos y si el enlace es pulsable. No se simulan enlaces de tiendas de aplicaciones.

## Encuadre preciso

Los controles de posición se expresan en píxeles del lienzo de 512 × 512 y admiten pasos de 0,1 px; el zoom admite pasos de 0,01 %. Al arrastrar el vídeo o un deslizador, un imán suave ayuda a alinear el centro o los bordes reales con el lienzo, según el modo de encuadre y el zoom. Sigue arrastrando para liberar el ajuste; también puedes introducir un valor exacto o utilizar las flechas del teclado sin el imán. **Centrar** restablece solo la posición. Las guías visibles son temporales y no aparecen en el sticker. Gira el contenido 90° a la izquierda o derecha, 180°, o selecciona 0°, 90°, 180° o 270°. El encuadre magnético se adapta a la orientación y la rotación se conserva al generar el sticker. El zoom y la posición se mantienen al girar; usa **Centrar** si lo necesitas.

## Calidad del sticker

No hay un máximo fijo de duración del sticker: se selecciona el archivo completo por defecto y se recorta con barras de inicio y final. Los límites de peso, memoria y compresión siguen vigentes; los clips muy largos pueden necesitar un recorte o un perfil diferente. WhatsApp puede rechazar duraciones largas. Actualiza el favorito antes de probar. El importador web conserva su protección de 10 minutos y 80 MiB; para archivos locales de hasta 80 MiB no hay un límite temporal fijo.

**Calidad ampliada:** permite hasta 4.000.000 bytes combinados entre WebP y Ogg (audio hasta 1 MB), con mayor calidad inicial y más FPS de captura para clips cortos. El modo Compatible permanece predeterminado y limita cada componente a 1 MB. La aceptación de imágenes de más de 1 MB por WhatsApp no está verificada; el conversor original advierte de HTTP 413. Sustituye el favorito para probar paquetes grandes, primero en tu propio chat. Si falla, vuelve al modo Compatible. El JSON Base64 pesa más que los medios originales.

El modo predeterminado **Máxima nitidez** prioriza la resolución (mínimo de salida 192 px para animaciones; objetivo 512 px), con una frecuencia de muestreo y codificación de al menos **9 FPS** en animaciones, también para clips largos. No se inventan fotogramas distintos si el origen es estático o tiene menos movimiento. Si no caben ambas condiciones, el modo nitidez no exporta el sticker. **Equilibrado** y **Máxima fluidez** permiten otras combinaciones. La calidad final depende del contenido y del límite elegido; no se garantiza HD en todos los vídeos largos. Si no cabe, reduce la duración o usa fotograma + audio. La vista del resultado indica la resolución y los FPS reales.

Si falla una importación de TikTok, se ofrece [SnapTik](https://snaptik.fi/) como alternativa manual externa: descarga únicamente contenido autorizado y selecciona el archivo local. No se envía el enlace automáticamente ni se integra su API.

## Funciones

- Importación directa de video, imagen y audio; detección de recursos públicos en páginas compatibles.
- Importador propio con yt-dlp y alternativa para direcciones públicas de descarga de TikTok.
- Editor cuadrado de 512 × 512, reproducción previa, selección de fotograma, imagen o GIF con audio.
- Recorte mediante barras; selección inicial del archivo completo. Calidad ajustada para los límites del conversor: 1 MB por componente en Compatible, o 4 MB combinados en Calidad ampliada.
- Interfaz adaptable a celulares, tablets y computadoras. Selector Español/English persistente.
- Edición y generación locales; no se requiere instalar programas ni extensiones.

## Enviar a WhatsApp

### Computadora (WhatsApp Web)

1. **Guarda tu sticker.** Pulsa **Guardar sticker sonoro** para descargar `nombre-original.sonoro.json`. No abras el archivo ni lo adjuntes al chat.
2. **Prepara el botón de envío (solo la primera vez).** Muestra la barra de favoritos con Ctrl + Shift + B (Mac: ⌘ + Shift + B) y arrastra el enlace **Enviar sticker sonoro** de la app a esa barra. Si no puedes arrastrarlo, pulsa **Copiar dirección del marcador**, crea un favorito nuevo llamado Enviar sticker sonoro y pega la dirección en su campo URL. Si ya tienes el favorito, salta este paso.
3. **Abre el chat de WhatsApp.** Pulsa **Abrir WhatsApp Web**, inicia sesión y abre el chat deseado. Para tu primera prueba, usa tu propio chat.
4. **Selecciona el archivo y envía.** Dentro de WhatsApp Web, pulsa el favorito, selecciona el archivo del paso 1 y pulsa **Enviar sticker con sonido**. Si se ofrece Activar compatibilidad con sonido, márcala antes de enviar. Confirma el destinatario y comprueba la reproducción.

El marcador usa una integración no oficial basada en Shirtep, dentro de la sesión del navegador. No envía la sesión al servidor ni cambia permanentemente la configuración de la cuenta. Los paquetes anteriores son compatibles. Los marcadores antiguos deben sustituirse para obtener mejoras de idioma o duración. **El archivo JSON no se adjunta directamente a un chat.**

### Android y iPhone

Puedes importar, editar y guardar el archivo `.sonoro.json` desde un navegador compatible. Transfiérelo a tu computadora y sigue los cuatro pasos de WhatsApp Web. El envío nativo desde Android o iPhone no está implementado.

## Estado y compatibilidad

| Función | Verificación |
|---|---|
| Envío de sticker sonoro al propio chat | Prueba real confirmada por el usuario en .12 |
| Importación de TikTok | Prueba real confirmada por el usuario con un clip de 27,14 s en .18 |
| Paquete largo y envío | Pruebas de generación imagen + audio y envío simulado en CI; falta validar el envío real de clips largos y animaciones largas |
| Diseño móvil e idioma | Pruebas Chromium con 320, 390, 740 y 1024 px; no equivalen a pruebas físicas de todos los teléfonos |
| Importación universal de redes sociales | No garantizada; depende del origen |
| Envío a todas las cuentas de WhatsApp | No garantizado; depende del cliente y servidor |

Usa Chrome o Edge actualizados para la mejor compatibilidad con WebCodecs, WebP y Opus. Para GIF animado se requiere ImageDecoder. Descarga solamente contenido que tengas derecho a utilizar. Si un sitio exige autenticación o restringe la descarga, usa el archivo original autorizado.

## Desarrollo y despliegue

**Editor estático:** desde la raíz, ejecuta `python -m http.server 8000` y abre `http://localhost:8000`. Para importar redes sociales, usa el servicio completo.

```sh
docker build -t stickers-sonoros .
docker run --rm -p 8080:8080 stickers-sonoros
```

Abre `http://localhost:8080`. El Dockerfile de la raíz es el único archivo de construcción.

- GitHub Pages sirve el frontend desde `main`; la URL de Render se define en `index.html`.
- Render utiliza `render.yaml`, Docker y el plan gratuito con despliegue tras superar las comprobaciones. Si no se actualiza automáticamente, usa **Manual sync** en el Blueprint y **Manual Deploy** en el servicio.
- `/health` informa de versión, capacidades y versión de yt-dlp. El plan gratuito puede entrar en reposo.

| Ruta | Propósito |
|---|---|
| GET `/health` | Estado y capacidades |
| POST `/api/import` | Video social público compatible |
| POST `/api/media` | Recurso HTTPS público o HTML inerte |

## Pruebas

```sh
node --check app.js
node --check i18n.js
python -m unittest discover -s importer -p 'test_*.py'
python tests/test_http.py
python tests/test_format_selection.py
```

Para las pruebas de navegador instala Playwright y Chromium en el entorno de desarrollo, inicia el servidor estático en el puerto 8000 y ejecuta `node tests/smoke.mjs`. Las pruebas de navegador utilizan FFmpeg para crear medios de prueba; las de selección necesitan yt-dlp. [Consulta las ejecuciones de CI](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) y [el diagnóstico del servicio real](https://github.com/PoldKent/stickers-sonoros/actions/workflows/render-diagnostic.yml). Las imágenes del README son esquemas ilustrativos; las capturas reales de Chromium se adjuntan a las ejecuciones de CI como artefactos cuando se generan.

## Privacidad y límites

El procesamiento de archivos ocurre localmente por defecto. La importación mediante servidor consulta la URL pública y elimina los archivos temporales después de responder. Los clips editados no se suben al servidor. El importador limita tamaño, tiempo y concurrencia, y el lector HTTPS comprueba dominios, DNS público y TLS. CORS no es autenticación ni sustituye controles de salida de red y aislamiento de infraestructura. No se deben configurar secretos en la instancia pública de importación. Véase [auditoría y seguridad](docs/AUDIT.md).

## ❤️ Apoya el proyecto

Si deseas apoyar voluntariamente el mantenimiento no comercial, consulta [las instrucciones de donación USDC o BBTC por Ethereum (ERC-20)](SUPPORT.md). No uses BTC nativo, otros tokens ni otras redes. La aplicación no vende funciones, no requiere pagos y no automatiza transferencias.

## Créditos y licencia

El conversor y el mecanismo de publicación adaptado proceden de [Shirtep/WA-audio-stickers, commit 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). Se conserva el [aviso de autoría y licencia PolyForm Noncommercial 1.0.0](vendor/shirtep/LICENSE.md); no se otorgan derechos de uso comercial ni se implica asociación oficial con WhatsApp, TikTok o Binance. Confirma con el titular de los derechos cualquier uso o financiación que pueda constituir explotación comercial.

## Investigación móvil

Consulta [envío móvil sin WhatsApp Web](docs/MOBILE.md). El envío directo con sonido desde Android/iOS aún no está implementado; se mantiene el flujo verificado de escritorio.

## Línea de tiempo de edición

Debajo de la vista previa, la barra muestra la posición actual y la duración total del vídeo o GIF, con centésimas de segundo. Arrástrala para explorar fotogramas; al reproducir el tramo, el indicador avanza con el contenido. Si la posición está dentro del tramo elegido, la reproducción comienza desde allí. Los botones Marcar inicio/final aplican el recorte en esa posición. El reproductor del clip generado conserva sus propios controles.
