# Manual de Seguimiento 360 — Índice

Plataforma de Seguimiento Comercial - Calidda Hogar. App web sin build (HTML + CSS + JS) con backend Supabase, desplegada en Vercel desde la rama `main`.

Cada manual explica su parte en español claro: para qué sirve, mapa con nº de línea, detalle por bloques, conexiones con el resto y una sección práctica "Si quieres cambiar X, toca Y".

| Archivo | Qué documenta |
|---|---|
| `01-index-html.md` | Estructura de `index.html`: login, app shell, templates, estilos inline, scripts |
| `02-estilos-css.md` | `css/app-styles.css` y `css/prov-styles.css`: paleta, layout, botones, tooltips, modo oscuro |
| `03-nucleo-supabase.md` | `js/config.js` y `js/supabase-client.js`: config, contexto, permisos, alcances y gates de aprobación |
| `04-puente-y-app-core.md` | `js/api-adapter.js` y `js/app-core.js`: ruta demo, arranque, RPC protegido, roles, tema |
| `05-modulo-ventas.md` | `js/modules/sales.js` y `sales-dashboard.js`: bandejas, filtros, KPIs, abonos, entregas |
| `06-despacho-calendario-dinamicos.md` | `dispatch.js`, `delivery-calendar.js`, `dynamic.js` |
| `07-admin-proveedores-materiales.md` | `admin.js`, `providers.js`, `materials-prices.js` |
| `08-base-de-datos.md` | Carpeta `supabase/`: tablas, migraciones, seed, Edge Function, RLS |

## Reglas de seguridad (resumen)

- El abono lo aprueba y la entrega la gestiona una cuenta **del proveedor de la venta** (alcance `PROVEEDOR`). Ni `PROPIO` (solo el creador) ni `ASIGNADO` (ambiguo entre capas) sirven para esto.
- `SUPERADMIN` tiene acceso global a todo; bajo "Visualizar como" se respeta el rol simulado.
- Sin permiso o sin alcance aplicable, el sistema **niega** (fail-closed). El RLS de Supabase sigue abierto: la seguridad vive en el código JS.

## Notas

- Los nº de línea son de la versión actual y pueden moverse con futuros cambios; usa el buscador con los nombres de función.
- Los archivos `source_gas/` son el código legacy original (referencia, no se ejecuta en producción).
- Versiones anti-caché `?v=` en CSS/JS: súbelas cuando cambies esos archivos.
