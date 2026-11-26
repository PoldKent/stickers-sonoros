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
| Donación por dirección EVM ambigua / ambiguous EVM donation | Token BBTC, Ethereum mainnet, contrato y advertencias; no transacción automática |

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
