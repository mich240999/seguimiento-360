# 03 — Núcleo Supabase: `js/config.js` + `js/supabase-client.js`

> Para el dueño del proyecto. Sin tecnicismos innecesarios, pero con líneas exactas para que un programador sepa dónde tocar.

## 1) Para qué sirve

**`js/config.js` (203 líneas)** es la "placa de datos" de la app:

- Dice cómo se llama la app, qué versión es y en qué entorno está (`APP_CONFIG`, líneas 6-20).
- Dice dónde está Supabase (URL + clave pública) y qué buckets de archivos usar (líneas 10-17).
- Configura el loader/pantalla de carga (`__C360_LOADER_CONFIG__`, líneas 22-26).
- Inyecta por JavaScript todo el estilo visual "vidrio empavonado" (glassmorphism) y el degradado corporativo azul-verde del loader y las tarjetas (función `injectFinalVisualFixes`, líneas 28-203). No hay archivo CSS separado para esto: se crea un `<style>` y se pega al `<head>`.

**`js/supabase-client.js` (769 líneas)** es el "cerebro" que conecta la app con Supabase:

- Te loguea con correo+contraseña, verifica que tu correo exista y esté `ACTIVO` en `seg_usuarios` (`getAuthorizedUser`, líneas 28-54).
- Arma tu "contexto": quién eres, qué módulos ves, qué puedes hacer en cada uno (`loadContext`, líneas 220-263). `SUPERADMIN` lo ve todo.
- Es el **punto único de control**: todo lo que pide la app pasa por `installAdapterBridge` (líneas 285-298) → `executeSupabaseOperation` (líneas 628-761), que decide si lo resuelve directo contra Supabase o lo pasa al adaptador viejo.
- Protege las ventas con un sistema de **alcances**: `PROPIO / PROVEEDOR / ASIGNADOS / OFICINA / GRUPO / GLOBAL` (`alcanceVentas29S_`, líneas 508-546). Si no tienes alcance, **no ves ni tocas** (fail-closed: niega por defecto).
- Tiene guardianes de escritura para abonos y entregas (`exigirAccesoVenta29S_`, `permisoVenta29S_`, `proveedoresDetalleVenta29S_`, líneas 551-627).
- Resuelve las operaciones de ventas: confirmar abono, programar/entregar, listar con mapa enriquecido, despacho, anular, exportar CSV (líneas 632-634, 635-682, 683-707, 756).
- Registra auditoría solo para operaciones sensibles (`OPERACIONES_AUDITABLES`, línea 277 + `registrarEventoSupabase_`, líneas 278-284).

En resumen: `config.js` dice **dónde y cómo se ve**, `supabase-client.js` decide **quién entra, qué ve y qué puede guardar**.

## 2) Mapa

### `js/config.js`

| Bloque / función | Líneas | Qué hace |
|---|---|---|
| `window.APP_CONFIG` | 6-20 | Nombre, versión 2.5.0, entorno PRODUCCION, URL/key Supabase (con override por `localStorage`), buckets, timeout 480 min, moneda PEN. |
| `window.__C360_LOADER_CONFIG__` | 22-26 | Nombre + versión + favicon de Calidda para el loader. |
| `injectFinalVisualFixes()` | 28-203 | Crea `<style id="s360-final-visual-fixes">` y lo pega al head. Todo lo visual de este archivo vive aquí. |
| Fix sidebar colapsado | 32-48 | En PC (≥1025px), centra el logo y oculta texto/botón cerrar cuando el menú está colapsado. |
| Loader corporativo | 50-73 | Degradado azul-verde + puntos + panel blanco translúcido con blur. `.global-loader`, `::before`, `::after`, `.loader-panel`. |
| Glassmorphism general | 80-115 | A ~30 tipos de tarjetas/paneles/tablas/modales les pone fondo blanco 72% + blur 18px + sombra suave. Excluye `sales-main-toolbar`. |
| Catch-all `:is(...)` | 119-121 | Todo lo que tenga "card/panel/surface/container/section" en la clase queda empavonado (excepto sidebar). |
| Inputs | 124-134 | Inputs/selects/textarea en blanco 84% + blur 10px, para que no se vuelvan transparentes. |
| Cabeceras de tabla | 137-144 | `thead` y headers en blanco 58% + blur 14px para legibilidad. |
| Exclusiones funcionales | 147-159 | Botones, badges, estados, chips, alerts, toasts, progress, sidebar y nav: **sin** blur, conservan su color. |
| Modo oscuro | 162-200 | Mismas superficies pero en vidrio oscuro `rgba(16,30,39,.72)`. |

### `js/supabase-client.js`

| Bloque / función | Líneas | Qué hace |
|---|---|---|
| `initSupabase` / `getClient` / `getAuthUser` | 15-27 | Crea el cliente Supabase con persistencia y auto-refresh; `getClient` lo reintenta; `getAuthUser` exige sesión válida o lanza `NO_AUTH_SESSION`. |
| `getAuthorizedUser` | 28-54 | Puente auth → autorización: busca en `seg_usuarios` por correo (`ilike` + `estado=ACTIVO`); si no existe hace `signOut` y lanza `USUARIO_NO_AUTORIZADO`; valida sesión técnica en `seg_sesiones` (`ACTIVA` y no expirada) o lanza `SESION_EXPIRADA/REEMPLAZADA`. |
| `syncLegacySessionSync` / `syncLegacySession` / `idSesionSupabase_` | 55-68 | Compatibilidad con token viejo `SGT360_AUTH_TOKEN_V1`; deriva `SES-xxx` del JWT (`session_id`) o del `authUser.id`. |
| `closeCurrentSession` | 69-80 | Cierra sesión técnica (`CERRADA`), audita `CIERRE_SESION`, limpia timers y tokens, `signOut local`. |
| `deactivateCurrentUser` | 81-115 | Baja voluntaria: pone `seg_usuarios=INACTIVO` (prohíbe a SUPERADMIN auto-darse de baja), cierra `seg_sesiones`, audita `BAJA_VOLUNTARIA`, `signOut`. |
| `showMessage` / `normalizeAuthError` / `authRedirectUrl` | 116-129 | Mensajes del login; traduce errores inglés Supabase a español; URL de recuperación. |
| `chooseActiveSession` | 130-142 | Modal "Tu cuenta ya está en uso": mantener actual (`signOut local` + `resolve(false)`) o reemplazar (`S360_SESSION_TAKEOVER=1` + `resolve(true)`). Garantiza 1 sola sesión. |
| `installLoginView` | 143-219 | Engancha el formulario existente (`supabaseEmailLogin`): recordar correo, submit `signInWithPassword` → `getAuthorizedUser` → `chooseActiveSession` → guarda legacy token → `reload`; "olvidé contraseña" con `resetPasswordForEmail`; botones OAuth Google/Azure (redirigen). |
| `loadContext` | 220-263 | Construye `{sesion, usuario, aplicacion, interfaz, modulos, permisos}`; lee `app_modulos` + `seg_permisos`; regla SUPERADMIN; tracking en `seg_sesiones` + timer de expiración + auditoría `INICIO_SESION`. |
| `createGoogleScriptCompatibility` / `dispatchLegacyMethod` | 264-276 | Falso `google.script.run` para código viejo GAS: `validarSesionAplicacionPaso13D1`, `actualizarActividad...`, `cerrarSesion...`, `obtenerConfiguracionPantallaLogin...`. |
| `OPERACIONES_AUDITABLES` | 277 | Lista de 18 ops que sí se auditan en `seg_auditoria_eventos` (usuarios, catálogos, permisos, proveedor/oficina/grupo, precios, abono, entrega, sesiones). |
| `registrarEventoSupabase_` | 278-284 | Si la op está en la lista, inserta en `seg_auditoria_eventos` con `id_usuario/correo/rol/modulo/accion/entidad/id_entidad`. Silencioso si falla (`warn`). |
| `installAdapterBridge` | 285-298 | **Punto único de control.** Envuelve `apiAdapter.executeRpc`: exige `getAuthorizedUser`, atajo `obtenerContextoAplicacion→loadContext`, si no `executeSupabaseOperation`, si retorna algo audita y devuelve, si no delega a `originalExecuteRpc` + `normalizeModuleResponse`. Marca `__s360SupabaseBridge`. |
| `showPasswordSetup` | 299-304 | Modal "Actualiza tu contraseña" para flujos `type=invite/recovery`: `updateUser`, `signOut`, redirige al path limpio. |
| `normalizeModuleResponse` | 305-311 | Normaliza respuestas legacy a `{registros, paginacion}` para proveedores/materiales/ventas. |
| `extractSalesCancelReason_` / `base64ToSalesBlob_` / `uploadSalesReceiptComprobante_` | 312-327 | Extrae motivo `ANULACIÓN:` de observaciones; convierte base64→Blob; sube comprobante a bucket `evidencias/comprobantes/<venta>/...` validando PDF/PNG/JPG/WEBP, retorna `{url, nombre, mime, id}`. |
| `ensureProveedorChain*` | 332-507 | Auto-creación en cadena proveedor→oficina→grupo→relación→catálogo (uso exclusivo `guardarMaterialPrecioModulo`). Idempotente, con `warnings`. Detalle en §3. |
| `alcanceVentas29S_` | 508-546 | Calcula `{alcance, test(fila)}` para lectura de ventas. SUPERADMIN=GLOBAL. Resto: busca permiso `VER_LISTADO/VISUALIZAR_MODULO` primero personal luego por rol. Fail-closed (`NINGUNO` niega). |
| `permisoVenta29S_` | 551-563 | Para escritura: recorre `recursos` en orden, primero permiso personal luego por rol. SUPERADMIN permite todo. Retorna `{permitido, alcance, recurso}` o `null`. |
| `proveedoresDetalleVenta29S_` | 564-586 | Deduce proveedores reales de una venta: detalle→`pre_lista_precio_detalle` (match `id_material` + `precio_base=precio_unitario`)→`pre_listas_precios.id_proveedor`. Retorna lista de IDs únicos. |
| `exigirAccesoVenta29S_` | 587-627 | Gate de escritura: 1) lee `seg_permisos` VENTAS_CONTADO, 2) exige recurso, 3) carga venta, 4) evalúa alcance contra la fila (con fallback a gestión). Lanza error específico si falla. |
| `executeSupabaseOperation` + helpers `query/csv/file` | 628-631 | Enrutador gigante de operaciones. `query` = select* simple; `csv/file` = arma CSV con BOM para descargas. `return undefined` (línea 760) = "no lo manejo, pasa al adaptador viejo". |
| `anularVentaContadoModulo` | 632 | Anula venta + gestión. Bloquea si `ENTREGADA/ANULADA`. |
| `guardarGestionEntregaVentaContadoModulo` | 633 | Programa/entrega con gate + override proveedor + evidencias a Storage + actualiza cabecera. |
| `guardarVentaContadoModulo` / `modificarVentaContadoModulo` | 634 | Crea venta: re-precia desde ofertas, sube comprobante, `upsert` cabecera + detalle. |
| `listarVentasContadoModulo` / `obtenerDetalleVentaContadoModulo` | 635-682 | Lee ventas + detalle + gestión + evidencias, mapea a formato UI, filtra por alcance, añade `bonoVendedor` y `alcanceAplicado`. |
| `exportarVentasContadoModulo` | 683-706 | Reusa listar + arma `ventas_360.csv` de 15 columnas. |
| `listarDespachoModulo` | 707 | Reusa listar + filtra `PROGRAMADA/EN_RUTA` + filtro proveedor. |
| Eliminar precio/lista/material | 712-714 | `eliminarDetalleListaPrecioModulo`, `eliminarListaOficialPrecioModulo` (protege catálogo `es_catalogo`), `eliminarMaterialPrecioModulo` (bloquea si está en uso). |
| Admin: módulos/parámetros/catálogos/roles/usuarios/sesiones/auditoría | 715-731 | Lecturas y guardados directos contra `app_modulos`, `sys_parametros`, `app_catalogos`+maestros, `seg_roles/seg_usuarios`, `seg_sesiones`, `seg_auditoria_*`. Incluye `guardarMatrizPermisosAdminMotor` (731) con ID hash. |
| Proveedores/oficinas/grupos/materiales/precios | 732-755 | `obtenerOpcionesProveedor`, plantillas CSV, `cambiarEstado`, `guardarProveedor/Oficina/Grupo/Material/ListaOficial/Detalle/PrecioIndividual`, listados y resúmenes. |
| `confirmarAbonoVentaContadoModulo` / `observarAbonoVentaContadoModulo` | 756 | Valida abono con gate `CONFIRMAR_ABONO`. Confirmar→`ABONO_CONFIRMADO/POR_ENTREGAR`; observar→`ABONO_OBSERVADO/REGISTRADA` (exige observación). |
| `obtenerOpcionesFormularioVentaContadoModulo` | 757 | Catálogo de ofertas vigentes filtrado por negocio/oficina/grupo/fecha + alcance proveedor. |
| `resolverPrecio...` (3 aliases) | 758 | Resuelve mejor precio para material+alcance (prioridad GRUPO 300 > OFICINA 200 > resto 100). |
| `obtenerContextoVentasContadoModulo` | 759 | Permisos resumidos + estados + negocios + oficinas/grupos permitidos + predeterminados. Fail-open comercial (avisa y muestra todo). |
| `installAuthBridge` | 762-766 | Instalador maestro: login + compat GAS + adapter bridge + sync legacy + password-setup + listener `onAuthStateChange`. |
| `window.supabaseClient` / `DOMContentLoaded` | 767-768 | API pública (`getClient`, `getAuthorizedUser`, `closeCurrentSession`, `reconfigure`, `subirArchivoEvidencia`, etc.) + auto-instalación al cargar. |

## 3) Detalle por bloques/funciones

### 3.1 `js/config.js` — líneas 6-20: `APP_CONFIG`

```js
SUPABASE_URL: localStorage "S360_SUPABASE_URL" || "https://acmfxabypytwcxhuxjti.supabase.co"
SUPABASE_ANON_KEY: localStorage "S360_SUPABASE_ANON_KEY" || "sb_publishable_..."
ENABLE_AUTO_DEMO_FALLBACK: true
STORAGE_BUCKETS: evidencias / recursos / importaciones
SESSION_TIMEOUT_MINUTES: 480 (8h)
MONEDA_DEFECTO: "PEN"
```

Para el dueño: aquí se cambia a qué Supabase apunta la app sin tocar código (borrando/poniendo esos `localStorage`). Los buckets son las "carpetas" de archivos en Supabase Storage.

### 3.2 `js/config.js` — líneas 22-26: loader config

Solo nombre, versión y favicon de `calidda.com.pe`. Lo lee el loader animado.

### 3.3 `js/config.js` — líneas 28-203: `injectFinalVisualFixes()`

Crea un `<style>` una sola vez y lo inyecta. Tres efectos:

1. **Sidebar (32-48):** cuando colapsas el menú en PC, el logo queda centrado en cuadro de 34px y se oculta el texto y la X.
2. **Loader (51-73):** fondo con 3 brillos radiales + degradado `#07354d → #0a7aa5 → #129a6c`, textura de puntos (`::before`), sombra de luz (`::after`), panel blanco 70% con `blur(24px)`.
3. **Glassmorphism (80-200):** tarjetas al 72% blanco + `blur(18px)`. Los inputs quedan un poco más sólidos (84%) para que se lean. Botones/badges/chips/alerts **no** se tocan para no romper rojo/verde/amarillo de estados. En `body.dark-mode` el vidrio pasa a oscuro.

Si un módulo "no se ve como vidrio", casi siempre es porque su clase no está en la lista 80-109: hay que agregarla ahí, no en CSS.

### 3.4 `supabase-client.js` — líneas 28-54: `getAuthorizedUser()` paso a paso

1. `getAuthUser()` (27): pide `auth.getUser()`. Sin sesión → `NO_AUTH_SESSION`.
2. Normaliza `email` a minúsculas (30).
3. Busca en `seg_usuarios`: `ilike(correo,email)` + `eq(estado,ACTIVO)` + `maybeSingle` (32). Trae `id_usuario, correo, nombre, telefono, rol, id_proveedor, id_oficina, id_grupo, estado, docs`.
4. Si no hay fila → `signOut` + `USUARIO_NO_AUTORIZADO` (34). Nadie entra si no está registrado y activo, aunque tenga cuenta Supabase.
5. Valida sesión técnica en `seg_sesiones` por `idSesionSupabase_` (37-47): si `estado!=ACTIVA` o `fecha_fin` vencida → `signOut` + `SESION_EXPIRADA/REEMPLAZADA`. Si está `ACTIVA` pero vencida, la marca `EXPIRADA`.
6. Si la tabla falla por red/permisos, **no bloquea**: avisa en consola y deja pasar (48-52). Retorna `{authUser, usuario}`.

### 3.5 `supabase-client.js` — líneas 220-263: `loadContext()` — permisos por rol y SUPERADMIN

1. Llama a `getAuthorizedUser`, normaliza `rol` a mayúsculas (221).
2. Arma el esqueleto `context` con `sesion` (id/correo/nombre/rol/proveedor/oficina/grupo), `usuario`, `aplicacion` (nombre/versión/entorno/fecha), `interfaz`, `modulos=[]`, `permisos={}` (222).
3. Lee `app_modulos` activos ordenados (223) y `seg_permisos` activos donde `id_sujeto` sea tu rol o tu `id_usuario` (224).
4. Filtra módulos visibles (230): `allModules = (rol==SUPERADMIN)`; además ADMIN/SUPERADMIN ven `ADMIN_AUDITORIA`; el resto solo si hay permiso con `permitido=true`. Si eres SUPERADMIN se **ocultan** `ADMIN_USUARIOS, ADMIN_PERMISOS, ADMIN_ESTRUCTURA` porque ya viven dentro de `ADMIN_CONFIG_APP`.
5. Construye `permisos[modulo][recurso]` (233-235):
   - Si SUPERADMIN: para cada módulo activo, marca los 32 recursos de `superadminResources` como `{permitido:true, alcance:"TOTAL"}` (incluye `REGISTRAR_VENTA, CONFIRMAR_ABONO, PROGRAMAR_ENTREGA, CONFIRMAR_ENTREGA, ANULAR_VENTA`, etc.).
   - Luego aplica tus permisos reales de `seg_permisos` con su `alcance` (defecto `PROPIO`).
   - Parche ADMIN: `ADMIN_AUDITORIA` con `VISUALIZAR_MODULO, VER_AUDITORIA, VER_LISTADO, VER_DETALLE, CERRAR_SESIONES, LIMPIAR_SESIONES_EXPIRADAS` en `TOTAL`.
6. Tracking de sesión única (239-261): calcula `sessionId`, verifica que siga `ACTIVA`, lee `sys_parametros.EXPIRACION_SESION_MINUTOS` (mín 5, defecto 480), cierra **otras** sesiones activas del mismo usuario (`SESION_REEMPLAZADA`), hace `upsert` en `seg_sesiones`, programa `__S360_SESSION_EXPIRY_TIMER__` para auto-salir, e inserta `INICIO_SESION` en `seg_auditoria_accesos` una vez por pestaña (`S360_AUDIT_LOGIN`).

### 3.6 `supabase-client.js` — líneas 285-298: `installAdapterBridge()` — punto único de control

Es el "peaje" por donde pasa **toda** operación que pide la UI vía `apiAdapter.executeRpc(operation, args, modulo)`:

```
1. authorized = await getAuthorizedUser()   // sin usuario válido, nada pasa
2. si operation == "obtenerContextoAplicacion" → return loadContext()
3. direct = await executeSupabaseOperation(client, operation, args, usuario)
4. si direct !== undefined → await registrarEventoSupabase_(...) → return direct
5. si no → result = await originalExecuteRpc(...) → return normalizeModuleResponse(...)
```

Guarda el original con `bind` y marca `__s360SupabaseBridge=true` para no instalarse dos veces. Para el dueño: si quieres saber "¿por dónde pasó esta acción?", la respuesta siempre es aquí.

### 3.7 `supabase-client.js` — líneas 628-761: `executeSupabaseOperation()` — qué maneja

- Helpers locales (629-631): `query(tabla)` = trae todo; `csv/file` = arma CSV con BOM `\ufeff` y comillas dobles.
- Si reconoce la `operation`, la resuelve directo contra tablas/Storage y retorna objeto. Si **no** la reconoce, retorna `undefined` (760) y el bridge la delega al adaptador viejo.
- Familias que maneja: ventas contado (guardar/listar/detalle/anular/abono/entrega/despacho/exportar/opciones/resolver/contexto), materiales-precios (CRUD + listas oficiales + eliminaciones), proveedores/oficinas/grupos, catálogos/parámetros, roles/usuarios, sesiones/auditoría, matriz de permisos. Ver tabla del §2 para el inventario exacto por línea.

### 3.8 `supabase-client.js` — líneas 508-546: `alcanceVentas29S_()` y semántica de alcances

Calcula qué filas puedes **ver** al listar:

```js
SUPERADMIN → {alcance:"GLOBAL", test:()=>true}  // todo
resto → busca VER_LISTADO o VISUALIZAR_MODULO, primero personal (id_sujeto==tu id) luego por rol
alcance = (found.alcance || "NINGUNO")
```

`test(fila)` por alcance:

| Alcance | Regla (`f` = venta mapeada) | Ejemplo dueño |
|---|---|---|
| `GLOBAL` / `TOTAL` | `true` siempre | Gerencia ve todo. |
| `PROPIO` | `f.idUsuario == tu id` | Vendedor solo ve lo que él registró. |
| `PROVEEDOR` o `ASIGNADOS` | `f.idProveedor == tu id_proveedor` **o** tu proveedor está en `f.proveedoresDetalle` | Proveedor ve ventas donde su material fue usado, aunque la cabecera sea de otro. `ASIGNADOS` se trata igual que `PROVEEDOR` en este puente (en GAS viejo significaba oficinas). |
| `OFICINA` | `f.idOficina == tu id_oficina` (ambos no vacíos) | Jefe de oficina ve su sede. |
| `GRUPO` | `f.idGrupo == tu id_grupo` | Líder de grupo ve su equipo. |
| Otro / `NINGUNO` / sin IDs | `false` | **Fail-closed:** si no hay permiso o falta tu ID, no ves nada. Niega por defecto. |

⚠️ Excepción consciente (fail-open, solo catálogo/comercial, no ventas): `obtenerOpcionesFormulario` (757), `resolverPrecio` (758) y `obtenerContextoVentas` (759) avisan en consola y muestran todo si el usuario no tiene proveedor o falta `rel_proveedor_oficinas`. Las ventas listadas/detalle sí son fail-closed.

### 3.9 Gates de escritura — líneas 551-627

**`permisoVenta29S_(scopeRows, user, recursos)` (551-563):** ¿tienes el sello? Recorre `recursos` en orden (ej. `["GESTIONAR_ENTREGA","PROGRAMAR_ENTREGA","CONFIRMAR_ENTREGA"]`); para cada uno busca primero permiso personal (`id_sujeto==tu id`) y luego por rol. SUPERADMIN pasa directo. Retorna el primer match o `null`.

**`proveedoresDetalleVenta29S_(client, idVenta)` (564-586):** ¿qué proveedores están "dentro" de la venta?

1. Lee `vta_ventas_contado_detalle(id_material, precio_unitario)` de la venta.
2. Junta `id_material` únicos, lee `pre_lista_precio_detalle` para esos materiales.
3. Empareja por `id_material` **y** `precio_base == precio_unitario` → obtiene `id_lista_precio`.
4. Lee `pre_listas_precios` para esas listas → deduce `id_proveedor` únicos. Ese es el "quién surtió".

**`exigirAccesoVenta29S_(client, user, recursos, idVenta, accionNombre)` (587-627):** el guardia completo, en este orden:

1. Lee tus permisos VENTAS_CONTADO activos (`in(id_sujeto, [tu id, tu rol])`).
2. `permisoVenta29S_` → si `null`, lanza `"No tienes permiso para <acción>."`.
3. Carga la venta (`id_usuario, id_proveedor, id_oficina, id_grupo, estados`); si no existe, lanza.
4. Evalúa según `alcance`:
   - `GLOBAL/TOTAL` → pasa.
   - `PROPIO` → `venta.id_usuario == tu id`.
   - `PROVEEDOR/ASIGNADOS` → `venta.id_proveedor == tu proveedor` **o** tu proveedor en `proveedoresDetalleVenta29S_` **o** (si cabecera vacía y sin detalle) `vta_gestion_entrega.id_proveedor == tu proveedor`.
   - `OFICINA/GRUPO` → igualdad de IDs no vacíos.
5. Si no pasa: mensaje específico para proveedor (`"Solo una cuenta del proveedor de esta venta puede..."`) o genérico con tu alcance. Retorna `{venta, alcance, proveedorUsuario, recurso}` para que el llamador lo use (ej. override).

### 3.10 Operación `confirmarAbono...` — línea 756, paso a paso

Vale para `confirmarAbonoVentaContadoModulo` (aprueba) y `observarAbonoVentaContadoModulo` (devuelve con observación):

1. Exige `idVenta`; si es observar exige `observacion` no vacía.
2. `exigirAccesoVenta29S_(..., ["CONFIRMAR_ABONO"], id, "validar el abono")` → aquí se aplica la regla de negocio: **solo una cuenta del proveedor de esa venta** (alcance PROVEEDOR) puede validar, salvo GLOBAL/TOTAL o PROPIO si así está configurado.
3. Si ya está `ABONO_CONFIRMADO` y quieres confirmar → error. Si la venta está `ANULADA` → error.
4. Arma `changes`: aprobado → `{estado_abono:ABONO_CONFIRMADO, estado_entrega:POR_ENTREGAR, abono_aprobado_id/nombre=tú}`; observado → `{ABONO_OBSERVADO, REGISTRADA}`. Guarda `observaciones` si viene.
5. `update` en `vta_ventas_contado` y retorna `{correcto, estadoAbono, estado, mensaje}`.

Efecto: confirmar **habilita** la entrega (`POR_ENTREGAR`); observar la **devuelve** a `REGISTRADA`.

### 3.11 Operación `guardarGestionEntrega...` — línea 633, paso a paso

1. Exige `idVenta`; verifica que la venta exista y que `estado_abono == ABONO_CONFIRMADO`. Sin abono confirmado no hay entrega.
2. Gate `exigirAccesoVenta29S_(..., ["GESTIONAR_ENTREGA","PROGRAMAR_ENTREGA","CONFIRMAR_ENTREGA"], ...)`.
3. Bloquea si `estado_entrega` es `ENTREGADA/ANULADA` o `estado_general==ANULADA`.
4. **Override de proveedor:** toma `g.idProveedor`, pero si tu alcance es `PROVEEDOR/ASIGNADOS` y tienes `proveedorUsuario`, **lo fuerza** a tu proveedor (no puedes programar como otro).
5. `estadoG = g.estadoEntrega || "PROGRAMADA"`; busca gestión existente por `id_venta` o crea `ENT-<timestamp>`; arma fila `{id_gestion_entrega, id_venta, id_proveedor, estado_entrega, detalle_observacion, fecha_programada_entrega}`; si `ENTREGADA` pone `fecha_real_entrega=ahora`; `upsert` en `vta_gestion_entrega`.
6. Por cada evidencia con `base64`: convierte a Blob, sube a `evidencias/entregas/<venta>/<ts>_<i>_<nombre>`, obtiene URL pública e inserta en `vta_evidencias_entrega` con tu nombre.
7. Actualiza cabecera `vta_ventas_contado.estado_entrega=estadoG`; si `ENTREGADA` también `estado_general=ENTREGADA`; si `PROGRAMADA/EN_RUTA` sella `programado_id/nombre=tú`; si `ENTREGADA` sella `entregado_id/nombre=tú`. Retorna `{correcto, mensaje}`.

### 3.12 Operaciones `listarVentas...` + `map` — líneas 635-682

1. Lee `vta_ventas_contado` ordenado por `fecha_registro desc` (o una sola si es `obtenerDetalle`).
2. Con los IDs, trae `vta_ventas_contado_detalle`, `vta_gestion_entrega`, `vta_evidencias_entrega` (641-646).
3. Trae `seg_usuarios` para nombres (647-652) + en paralelo `mae_materiales, pre_lista_precio_detalle, pre_listas_precios, mae_proveedores` (653).
4. `map(s)` (654-666) por venta:
   - Detalles: cruza material + precio (match `precio_base==precio_unitario`) + lista + proveedor → `{idDetallePrecio, idListaPrecio, idMaterial, codigoMaterial, descripcionMaterial, cantidad, precioUnitario, totalLinea, idProveedorPrecio, nombreComercialProveedor, codigoSapProveedor...}`.
   - `editable = estado_entrega/estado_general no es ENTREGADA/ANULADA`.
   - Gestiones + evidencias anidadas; `gestionEntrega = gests[0]`.
   - Campos planos: `codigoVenta, nombreCliente, cuentaContrato (numero_solicitud_sap||codigo_suministro), dni, telefono, direccion, estados (abono/entrega/general), motivoAnulacion (motivo_anulacion || ANULACIÓN: en observaciones), comprobante, receptor, puedeModificar...`.
   - **De dónde sale cada cosa pedida:**
     - `nombreUsuario` (línea 665): `sellerName29S_(s.id_usuario)` → busca en `seg_usuarios` por `id_usuario`, usa `nombre` o `correo`.
     - `idProveedor` (línea 665): directo de la cabecera `s.id_proveedor` (puede ser null en ventas viejas).
     - `proveedoresDetalle` (línea 665, IIFE final): deduce de `rows[].idProveedorPrecio` (los proveedores de cada línea vía lista de precio), dedup por `seen`.
5. Filtro de alcance (668-673): lee tus permisos VENTAS_CONTADO, `alcanceVentas29S_`, `mapped.filter(test)`. Fail-closed.
6. Añade `BONO_VENDEDOR_MONTO` desde `sys_parametros` + `alcanceAplicado` (674-679).
7. Si es `obtenerDetalle` y mapeó pero nada visible → lanza `"No tienes acceso..."`. Si es listar → `{registros: visibles, paginacion}`; si es detalle → `{venta, detalles, puedeModificar, evidenciasEntrega, gestionesEntrega}` (680-681).

### 3.13 Operación `listarDespachoModulo` — línea 707

1. Llama a `listarVentasContadoModulo` (ya filtrada por tu alcance).
2. Filtra a `gestionEntrega.estadoEntrega || estadoEntrega || estado` en `PROGRAMADA/EN_RUTA`.
3. Si tienes `id_proveedor`: exige que `gestion.idProveedor` sea el tuyo; si la gestión aún no tiene proveedor, exige `idProveedor==tuyo` o tuyo en `proveedoresDetalle`. Retorna `{registros, paginacion}`. Es la "cola de reparto" del proveedor.

### 3.14 Operación `anularVentaContadoModulo` — línea 632

1. Exige `id` + `motivo` no vacíos.
2. Lee `estado_entrega, estado_general, observaciones`; si no existe → error; si ya `ENTREGADA/ANULADA` → `"ya no puede anularse"`.
3. Anexa `"\nANULACIÓN: <motivo>"` a `observaciones` (trazabilidad, luego legible por `extractSalesCancelReason_`).
4. `update` cabecera a `{estado_general:ANULADA, estado_entrega:ANULADA, motivo_anulacion, fecha_anulacion:ahora, id_usuario_actualizacion=tú}` + `update` gestión a `ANULADA`. Retorna confirmación.

### 3.15 Operación `exportarVentasContadoModulo` — líneas 683-706

1. Reusa `listarVentasContadoModulo` (respeta tu alcance: solo exportas lo que ves).
2. Lee `BONO_VENDEDOR_MONTO` + `mae_proveedores` + `seg_usuarios` (con `catch→[]` para no romper).
3. Arma CSV `ventas_360.csv` de 15 columnas: `CODIGO, FECHA(YYYY-MM-DD), CLIENTE, DOCUMENTO, PROVEEDOR(nombre), OFICINA, MONTO, ABONO, ENTREGA, VENTA_EFECTUADA_POR, ABONO_APROBADO_POR, PROGRAMADO_POR, ENTREGA_REALIZADA_POR, OBSERVACION, BONO_VENDEDOR`.

### 3.16 Auditoría — línea 277 + 278-284 (+ sesiones 260, 75, 99-110, 724-725)

- `OPERACIONES_AUDITABLES` (18): `guardarUsuario, guardarValorCatalogo, guardarMatrizPermisos, guardarProveedor (modulo+admin), guardarOficina, guardarGrupo, guardarMaterialPrecio, guardarPrecioIndividual, confirmarAbono, observarAbono, guardarGestionEntrega, cerrarSesion, limpiarSesionesExpiradas`.
- `registrarEventoSupabase_` solo audita esas: inserta en `seg_auditoria_eventos` `{id_usuario, correo, rol, modulo, accion=operation, entidad=derivada, id_entidad, resultado:EXITOSO, detalle:{operacion, identificador, moduloSolicitado}}`. El `id` lo saca de `idUsuario/idSesion/idMaterial/idProveedor/idOficina/idGrupo/idVenta/idValor`.
- Aparte: `loadContext` audita `INICIO_SESION` en `seg_auditoria_accesos`; `closeCurrentSession`/`deactivateCurrentUser`/`cerrarSesionAuditoriaAdminMotor` auditan cierres/bajas; `listarAuditoriaAdminMotor` (725) une accesos+eventos+permisos para la consola.

### 3.17 Cadena auto-proveedor — líneas 332-507 (contexto, no ventas directo)

`ensureProveedorChain_(client, user, {proveedor, oficina, grupo, ids...})` solo la usa `guardarMaterialPrecioModulo` (738): busca por ID o por nombre exacto (`ilike`) y segunda oportunidad plegando tildes (`ensureProveedorChainFindFolded_`); si no existe crea `PRV-AUTO-/OFI-AUTO-/GRP-AUTO-`, crea/actualiza `rel_proveedor_oficinas`, sincroniza `codigo_canales_venta/grupos_vendedores` del proveedor, y garantiza un catálogo en `pre_listas_precios` (`es_catalogo=true`, con fallback si la columna no existe). Todo acumula `advertencias[]` ("Proveedor creado...", "Sin oficina: se completará después.", etc.) en vez de fallar.

## 4) Conexiones

- **`config.js` → `supabase-client.js`:** `APP_CONFIG.SUPABASE_URL/ANON_KEY`, `STORAGE_BUCKETS.EVIDENCIAS`, `APP_NAME/VERSION/ENTORNO` los consume `initSupabase`, `uploadSalesReceiptComprobante_`, `loadContext`, `subirArchivoEvidencia`.
- **`supabase-client.js` → `js/api-adapter.js`:** `installAdapterBridge` envuelve `apiAdapter.executeRpc`. Toda la UI llama al adapter; el bridge decide Supabase-directo vs legacy.
- **`supabase-client.js` → `js/app-core.js` y `js/modules/*`:** `loadContext` les da `modulos/permisos`; operaciones `*Modulo/*Motor` les devuelven `registros/venta/archivo`.
- **Tablas Supabase que toca:** `seg_usuarios, seg_permisos, seg_sesiones, seg_auditoria_accesos/eventos/permisos, app_modulos, app_catalogos/valores, sys_parametros, mae_proveedores/oficinas/grupos/negocios/marcas/productos/tipos/subtipos/materiales, rel_proveedor_oficinas, pre_listas_precios/detalle, pre_solicitudes_lista_precio, vta_ventas_contado/detalle/gestion_entrega/evidencias_entrega`.
- **Storage:** bucket `evidencias` (rutas `comprobantes/<venta>/...` y `entregas/<venta>/...`). Buckets `recursos/importaciones` declarados pero no usados en este archivo.
- **Edge Function `invite-user`:** `guardarUsuarioAdminMotor` (726) la invoca para invitar o cambiar contraseña; si no está desplegada, crear usuarios falla con mensaje explícito.
- **`index.html`:** debe cargar `config.js` antes que `supabase-client.js` y tener `.auth-actions`, `#supabaseEmailLogin`, `#authEmail/#authPassword`, `#authMessage` para que el login enganche.

## 5) Si quieres cambiar X, toca Y

1. **Nuevo permiso (ej. `ANULAR_VENTA` a otro rol o nuevo `REABRIR_VENTA`):**
   Toca `seg_permisos` (fila `ROL/modulo/recurso/alcance`) + `obtenerMatrizPermisosAdminMotor` fallback (línea 730) para que aparezca en la matriz + `superadminResources` (línea 232) si SUPERADMIN debe tenerlo + el gate que lo exige (`permisoVenta29S_`/`exigirAccesoVenta29S_`, 551-627, ej. lista `["CONFIRMAR_ABONO"]` en 756). Sin la fila en DB, el código solo no basta.

2. **Nuevo alcance (ej. `SEDE` o `ZONA`):**
   Toca `alcanceVentas29S_.test` (524-544) + el `else if` espejo en `exigirAccesoVenta29S_` (620-621) + `alcancesDisponibles` en `obtenerMatrizPermisosAdminMotor` (730) + `seg_usuarios` (columna del nuevo ID) y el `map` de `listarVentas` (665) para exponer `f.idSede`. Si solo tocas uno, lectura y escritura se desincronizan.

3. **Nuevo estado de venta/entrega (ej. `EN_REPARTO` o `DEVUELTA`):**
   Toca `guardarGestionEntrega` (633: `estadoG`, bloqueos `ENTREGADA/ANULADA`, sellos `programado/entregado`), `anularVenta` (632: qué bloquea), `listarDespacho` (707: lista `["PROGRAMADA","EN_RUTA"]`), `map.editable` (662) y `obtenerContextoVentasContadoModulo` (759: arreglo `estados`). Si olvidas despacho, el nuevo estado nunca aparece en la cola de reparto.

4. **Cambiar quién aprueba abonos o entregas (ej. que oficina pueda confirmar):**
   Toca `exigirAccesoVenta29S_` (587-627) y las listas de recursos en `guardarGestionEntrega` (633: `["GESTIONAR_ENTREGA","PROGRAMAR_ENTREGA","CONFIRMAR_ENTREGA"]`) y `confirmarAbono` (756: `["CONFIRMAR_ABONO"]`), más los `alcances` en `seg_permisos`. El override de proveedor (línea 633: fuerza `proveedorUsuario`) es el que impide suplantar a otro proveedor: quítalo solo si quieres permitir gestión centralizada.

5. **Cambiar comprobantes/evidencias (tipos, bucket o ruta):**
   Toca `uploadSalesReceiptComprobante_` (314-327: lista MIME + extensión + `evidencias/comprobantes/...`) y el bloque de evidencias en `guardarGestionEntrega` (633: `evidencias/entregas/...` + `vta_evidencias_entrega`) + `APP_CONFIG.STORAGE_BUCKETS` (13-16). Recuerda crear la política pública/lectura del bucket en Supabase o las URLs quedarán rotas.

6. **Cambiar sesión/tiempos (ej. 8h → 2h o desactivar sesión única):**
   Toca `APP_CONFIG.SESSION_TIMEOUT_MINUTES` (18) + `sys_parametros.EXPIRACION_SESION_MINUTOS` (leído en 249-250, mínimo 5) + `chooseActiveSession` (130-142) y el bloque de `loadContext` que cierra otras sesiones (253-255). Para desactivar sesión única, comenta `chooseActiveSession` en `installLoginView` (185) y el cierre de `others` en `loadContext`.

---

*Fuentes: `js/config.js` (1-203) y `js/supabase-client.js` (1-769) leídos completos. Este manual no modifica código; cualquier cambio hacerlo en esos dos archivos y en las tablas `seg_* / sys_parametros` indicadas.*
