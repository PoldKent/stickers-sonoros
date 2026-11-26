# Auditoría / Audit — 2026.11.26.20

## Alcance / Scope

Revisión del árbol de la rama main: editor, CSS, traducciones, adaptador de WhatsApp, conversor de terceros, servidor y lectores públicos, Dockerfiles, Blueprint de Render, workflows y pruebas. No es una auditoría de seguridad independiente ni una prueba en todas las plataformas.

| Hallazgo / Finding | Cambio / Change |
|---|---|
| README inicial solo describía español y acumulaba información histórica / outdated docs | README ES/EN, guía visual y compatibilidad explícita |
| Mensajes de recorte, conversión y restricciones sin traducción / missing strings | Diccionario y patrones ampliados; pruebas de mensajes compuestos |
| Nombres de archivo podían confundirse con texto traducible / filename translation | Preservar nombres y detalles externos |
| Archivos locales sin límite previo de tamaño / local files lacked an early size guard | Límite de entrada 80 MiB |
| Dockerfile secundario sin módulos nuevos / stale Dockerfile | Alineado con el Dockerfile canónico, contexto raíz |
| Donación por dirección EVM ambigua / ambiguous EVM donation | Tokens USDC y BBTC, Ethereum mainnet, contratos y advertencias; no transacción automática |

## Riesgos residuales / Remaining risks

- El servidor público no autentica clientes: Origin y CORS no impiden peticiones directas. Se necesitan controles de salida, aislamiento, cuotas y monitoreo para un servicio público a gran escala. La lectura pública valida DNS/IP y TLS, pero el proceso externo yt-dlp tiene su propia lógica de red.
- Las dependencias de contenedor se actualizan al construir; no hay garantía de compilaciones reproducibles ni auditoría exhaustiva de CVE. Fijar versiones después de comprobar compatibilidad y revisar actualizaciones periódicamente.
- El conversor local puede usar memoria significativa en clips largos; un límite de archivo no equivale a un límite de memoria decodificada. La conversión de 60 s no garantiza calidad en 1 MB.
- La detección de HTML no ejecuta scripts remotos, pero no puede importar todos los sitios. Los recursos restringidos requieren archivos autorizados.
- WhatsApp Web usa módulos internos sujetos a cambios. El envío a terceros, el reenvío y los stickers de 60 s necesitan validación real; la prueba previa fue en el propio chat. No almacenar sesiones ni credenciales en el servidor.
- Chromium CI no sustituye pruebas físicas de Android/iOS. Los mensajes nativos del navegador o de servicios externos pueden seguir apareciendo en su idioma original.
- PolyForm Noncommercial limita los usos del código de Shirtep. Las donaciones voluntarias no constituyen autorización de explotación comercial; consultar al titular de los derechos antes de aceptar financiación que pueda ser comercial.

## Baseline

La versión .19 superó [CI](https://github.com/PoldKent/stickers-sonoros/actions/runs/45849933141) y [GitHub Pages](https://github.com/PoldKent/stickers-sonoros/actions/runs/45849929943). La versión .20 tiene nuevas verificaciones de traducciones, archivos y capturas; consulta el resultado del workflow correspondiente. La versión de Render debe confirmarse por separado en /health.

## Revisión visual y publicaciones — 2026.11.26.21

Se inspeccionaron las capturas reales de la versión .20 de escritorio y móvil (español e inglés) generadas por [CI](https://github.com/PoldKent/stickers-sonoros/actions/runs/45852351963). Se detectaron instrucciones extensas en móvil, un mensaje de importación anterior al cargar el ejemplo, ausencia de favicon e identidad compartida y navegación al README español en modo inglés. Se ajustan estos puntos, se mantienen los controles y el puente de WhatsApp, y se comprueban las rutas relativas de ambos README y los assets de la web. Los controles nativos del navegador conservan el idioma del sistema. El [diagnóstico público](https://github.com/PoldKent/stickers-sonoros/actions/runs/45853276654) verificó Pages, web Render y API en .20, CORS y descarga MP4 de 788493 bytes. No comprueba la aceptación de todos los enlaces sociales ni sustituye pruebas en teléfonos reales. La nueva versión .21 requiere su propia confirmación de despliegue. El repositorio no tiene homepage ni topics en About; se requiere permiso administrativo para configurarlos.

## Flujo de envío — 2026.11.26.22

El resultado presenta cuatro pasos visibles de envío a WhatsApp Web en ES/EN. El archivo `.sonoro.json` es la acción principal, con favorito de instalación única, acceso al chat y confirmación del envío. Se elimina la opción de compartir vídeo y se ocultan las descargas MP4/WebM y los componentes técnicos en secciones plegadas. El vídeo se conserva únicamente como alternativa para el teléfono; no equivale a un mensaje de sticker sonoro. El puente y el conversor no cambian. Las pruebas comprueban la visibilidad de los pasos y el paquete real con envío simulado; el envío real continúa dependiendo de WhatsApp.

## Depuración del núcleo — 2026.11.26.23

Se retiran la exportación secundaria de vídeo, la descarga independiente WebP/Ogg y el endpoint de subida y conversión de clips `/api/clip-mp4`, junto con su prueba anterior y traducciones obsoletas. El único archivo final descargable es `.sonoro.json`. La previsualización mantiene el vídeo interno y los componentes finales para comprobar la calidad, sin subir el clip al servidor. El Dockerfile de raíz es el único archivo de construcción; se elimina el duplicado de `importer/`. Se conserva la importación MP4 de origen y FFmpeg para normalizar vídeos, así como el conversor, puente, licencia y donaciones. Se añaden pruebas HTTP de recursos, versión, CORS, rutas retiradas e importación con fixtures, y se conserva la prueba de envío simulado y generación de 60 segundos. En el móvil se crea y guarda el paquete; el envío se realiza en computadora. El diagnóstico público comprueba las publicaciones activas, no certifica todos los orígenes sociales.

## Calidad y alternativa de importación — 2026.11.26.24

Perfiles de calidad con ranking de resolución/FPS, captura adaptativa y hasta cuatro reintentos por tamaño; los límites de 1 MB permanecen. El modo nitidez rechaza animaciones inferiores a 192 px en lugar de degradarlas silenciosamente. Se incrementa la tasa solicitada de codificación del vídeo intermedio de 1,2 a 4 Mbps; no se elimina la doble codificación ni se implementan regiones diferenciales en esta versión. El botón SnapTik solo se muestra ante errores de importación de TikTok y abre el servicio externo manualmente. Se documenta la investigación móvil sin afirmar que exista un método nativo verificado.

## 2026.11.26.30 — Simplificación / Simplification

Editor y puente: sin límite fijo de 60 s; todos los perfiles de animación mantienen al menos 9 FPS. Presupuesto ampliado predeterminado de 4.000.000 bytes combinados. Compatible sigue disponible para WhatsApp. Las imágenes fijas no son animaciones. Los límites de importación, memoria y aceptación externa son independientes. La envoltura JSON pesa más. La publicación requiere confirmar CI y dispositivos reales.

Editor and local bridge: no fixed 60-second cutoff; every animation quality profile targets at least 9 FPS. Default extended budget: 4,000,000 combined WebP and Ogg bytes. Optional compatible profile remains for WhatsApp. Static images are not animations. Source import limits, browser memory and external acceptance remain separate constraints. The JSON envelope is larger than the media. Deployment and physical-device tests remain required.

### 2026.11.26.31

Se actualizan diagramas y README, nombre de descarga basado en el original, controles deslizantes de recorte y estado visual del flujo. El importador deja de imponer 10 minutos, pero conserva límites de bytes, tiempo de solicitud y protección de red. Se mantiene un límite explícito de memoria de captura, no un límite de segundos. / Updated diagrams, source-based filenames, trim sliders and workflow state; import duration cutoff removed while keeping byte, request-time and network protections. Capture memory remains bounded. Added regression checks for a 61-second package and trim sliders.

### 2026.11.26.32 — Web oficial única / Single official website

GitHub Pages es el único frontend público. Render conserva las rutas de importación y salud; la raíz y las rutas históricas del editor redirigen con HTTP 308, los antiguos activos devuelven 404 y las respuestas incluyen `X-Robots-Tag: noindex, nofollow`. La imagen Docker de producción no contiene el editor; el target `local-editor` conserva el flujo de desarrollo. Se añade URL canónica y pruebas HTTP de redirección, HEAD, CORS, importación y ausencia de activos. / GitHub Pages is the sole public frontend; Render is API-only with permanent redirects, noindex headers, and no production frontend assets. Local editor target retained. Live deployment must be verified separately.

### 2026.11.26.33

Pages .32 deployed; browser CI failed at 320px after generating a rotated sticker. Corrected intrinsic grid widths, native select sizing and result wrapping; retained the overflow assertion with diagnostic details. Moved the timeline under the preview, enabled full-source initial selection and cursor-based playback. Updated ES/EN docs and tests. Render remains API-only; actual deployment, real WhatsApp send and physical devices require separate verification.

### 2026.11.26.34

CI .33 passed the previously failing 320px crop check but failed a strict 61s fixture assertion (browser decoding/rounding). The updated test asserts full selection against the actual max and explicitly selects 60.5s. Added early ES/EN desktop and mobile screenshot capture, a 240s image/audio conversion and mock send test, native mobile research update and post-CI production diagnostics. No real WhatsApp send or Render production result is asserted here.

### 2026.11.26.35 — PR #29 reconciliation

Preserved the useful changes from the obsolete branch without restoring its 1 MB audio cap, 192px fixed resolution floor or 10-minute import cap. Added full-source reset controls, long/large-send compatibility warning, bounded Opus bitrate retries, 241s source selection and decoded 240s audio test. Existing numeric precision controls remain instead of replacing them with range-only fields. The earlier branch remains in Git history for reference. Production and real WhatsApp acceptance still require verification.

### 2026.11.26.36 — Frame cadence regression

User reported progressive motion loss on a 38s 448px/9FPS sticker. Final Video-mode conversion now reads the original rather than the real-time canvas recording, uses crop/zoom/rotation at capture time, disables playback fallback for exact source sampling, and writes each animation interval without merging repeated frames. Budget estimates count actual frame chunks; physical frame cadence and size are checked. Added a 38s moving-fixture regression inspecting ANMF durations, frame count and changing content in all thirds. User clip itself not available for reproduction. / Se conserva la cadencia y se adapta la calidad sin inventar movimiento.

### 2026.11.26.37 — Four-screen wizard / Asistente por etapas

Separates import, editing, generation and sending, with explicit Back/Next navigation, guarded progression, retained project state and ES/EN labels. Existing crop, timeline, quality, signature, conversion and sending controls are reused. Regression tests exercise navigation, result preservation and responsive screenshots. .36 CI, Pages and Render diagnostic all passed before this change.
