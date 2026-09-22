# 04 — Puente RPC (`js/api-adapter.js`) y Núcleo de la App (`js/app-core.js`)

> Para el dueño del proyecto. Sin tecnicismos innecesarios: qué hacen estos dos archivos, por qué existen y qué tocar cuando quieras cambiar algo.

## 1) Para qué sirve

**`js/api-adapter.js` (el "puente"):** es el único traductor entre la pantalla y los datos. Antes el proyecto usaba `google.script.run`; este archivo lo reemplaza con `window.apiAdapter.executeRpc(operacion, argumentos, modulo)`. Su trabajo:

- Si hay Supabase configurado, intenta resolver la operación contra la base real (`dispatchSupabase`).
- Si no hay Supabase, si falla, o si la operación no tiene versión real, cae al **modo Demo local** (`dispatchLocal`) que guarda todo en `localStorage` (`S360_LOCAL_DATA_CACHE`).
- Traduce filas de Postgres (`snake_case`: `id_venta`, `estado_abono`) a objetos del frontend (`camelCase`: `idVenta`, `estadoAbono`).

**`js/app-core.js` (el "núcleo"):** es el cerebro de la pantalla una vez que abres el `index.html`. Su trabajo:

- Arranca la app (tema, menú lateral, sesión), te pide login si no hay sesión válida.
- Abre el **canal protegido** (`secureRpc`) por donde viajan todas las operaciones.
- Decide **qué ves y qué puedes hacer** según tu rol y el modo "Visualizar como".
- Dibuja navegación, dashboard, controla refresco automático, sesión viva (heartbeat), menú de perfil y modo claro/oscuro.

En una frase: **el puente consigue los datos; el núcleo decide quién entra, qué ve y cuándo se actualiza.**

---

## 2) Mapa

### `js/api-adapter.js` (878 líneas)

| Función / bloque | Líneas | Qué hace |
|---|---|---|
| `getInitialStore()` | 13-112 | Crea los datos Demo iniciales: 4 usuarios, 6 roles, 2 proveedores, 4 oficinas, 3 grupos, 3 materiales, 1 venta de ejemplo, 1 auditoría, 5 parámetros. |
| `loadStore()` / `saveStore()` | 115-132 | Lee / guarda el Demo en `localStorage` (`S360_LOCAL_DATA_CACHE`). Si el guardado se corrompe, vuelve a los iniciales. |
| `executeRpc()` | 136-155 | Puerta única. Detecta si Supabase está configurado; si sí, prueba `dispatchSupabase`; si devuelve `undefined` o lanza error, cae a `dispatchLocal`. |
| `directCall()` | 157-159 | Atajo que llama a `executeRpc` sin código de módulo (lo usan los botones OAuth). |
| `dispatchLocal()` | 165-523 | Versión Demo/interactiva de cada operación. No necesita internet. |
| `obtenerContextoAplicacion` (demo) | 169-213 | Devuelve un SUPERADMIN ficticio (`s.usuarios[0]`) con los 9 módulos y todos los permisos en `true`. Solo para probar sin backend. |
| `obtenerEstadoSincronizacionMotor` / `obtenerResumenAdministracionMotor` (demo) | 215-229 | Responden "sincronizado: sí" y cuentan usuarios/roles/proveedores/oficinas/grupos del store local. |
| `listarUsuariosAdminMotor`, `listarRoles*`, `guardarUsuarioAdminMotor` (demo) | 231-250 | Listan y crean/actualizan usuarios en memoria (`USR-` + fecha si es nuevo). |
| `obtenerEstructuraAsignaciones*`, `listarProveedoresModulo`, `cambiarEstadoProveedorModulo`, `guardarProveedorModulo` (demo) | 252-287 | Devuelven proveedores/oficinas/grupos; cambian ACTIVO/INACTIVO; crean con `PRV-` + fecha. |
| `obtenerResumenMaterialesPreciosModulo`, `listarMateriales*` (demo) | 290-303 | Contadores y listado del catálogo local. |
| `resolverPrecio*` (demo, con gates de alcance) | 305-339 | Busca el material por `idMaterial` o `codigoMaterial`. Si no eres SUPERADMIN/ADMIN, valida que el material sea de tu proveedor/oficina/grupo; si no, devuelve `precioEncontrado: false` con mensaje. Si el material no tiene alcance, avisa en consola y responde en modo permisivo (`fail-open`). |
| `obtenerContextoVentasContadoModulo` (demo) | 342-370 | Catálogos de la pantalla de ventas: proveedores, oficinas, grupos, materiales + listas de estados de abono y entrega. |
| `listarVentasContadoModulo` / `precargarBandejas*` / `obtenerDetalleVentaContadoModulo` (demo) | 372-380 | Devuelven `s.ventas` y el detalle (detalles, evidencias, gestiones) por `idVenta` o `codigoVenta`. |
| `guardarVentaContadoModulo` (demo) | 382-408 | Crea `VTA-` + fecha y `PED-360-XXXX`. Estado inicial `PENDIENTE_CONFIRMACION` / `REGISTRADA`. Si trae `comprobante.base64`, lo convierte a `data:` URL y lo guarda como `urlComprobante`. Inserta al inicio del arreglo. |
| `confirmarAbonoVentaContadoModulo` (demo, con gate) | 410-427 | Solo si la venta existe. Regla: si no eres SUPERADMIN y tu `idProveedor` no coincide con ninguno de los proveedores de la venta (cabecera, gestión o detalles), rechaza con "Solo una cuenta del proveedor de esta venta puede validar el abono". Si pasa, pone `ABONO_CONFIRMADO` y registra quién aprobó. |
| `guardarGestionEntregaVentaContadoModulo` (demo, con doble gate) | 429-474 | Gate 1: exige `ABONO_CONFIRMADO`, si no rechaza con "Confirma el abono… antes de gestionar su entrega". Gate 2: misma regla de proveedor que abono. Luego actualiza `estadoEntrega` (si es `ENTREGADA`, cierra `estadoGeneral`), registra `programadoId/Nombre` o `entregadoId/Nombre` según estado, fusiona `gestionEntrega` y agrega/actualiza `gestionesEntrega` por `idProveedor`. |
| `anularVentaContadoModulo` (demo) | 476-491 | Marca `estado/estadoEntrega/estadoGeneral = ANULADA`, guarda motivo y fecha. |
| `listarAuditoriaAdminMotor`, `listarParametrosAdminMotor`, `guardarParametroAdminMotor`, `listarSesionesAuditoria*` (demo) | 493-517 | Auditoría local; parámetros (convierte `boolean` a `"TRUE"/"FALSE"`); sesiones devuelve `[]`. |
| `default` (demo) | 519-522 | Cualquier operación desconocida responde `{ correcto: true, datos: [] }` genérico para no romper la UI. |
| `dispatchSupabase()` | 528-772 | Versión real contra Postgres. Cada `case` hace consultas con `client.from(...)`. Si un `case` no existe, devuelve `undefined` para que `executeRpc` caiga al Demo. |
| `listarUsuariosAdminMotor`, `listarRolesAdminMotor`, `listarProveedoresModulo`, `listarMaterialesPrecioModulo`, `listarVentasContadoModulo` (real) | 530-557 | `SELECT *` a `seg_usuarios`, `seg_roles`, `mae_proveedores`, `mae_materiales`; ventas con `join` a detalle y gestión (`vta_ventas_contado_detalle`, `vta_gestion_entrega`) ordenadas por `fecha_registro` descendente. |
| `guardarVentaContadoModulo` (real) | 558-626 | Arma fila `snake_case` (`id_venta`, `codigo_venta`, cliente, montos, receptor). Si hay `comprobante.base64`, lo decodifica, lo sube a Storage `evidencias/comprobantes/{idVenta}/...`, guarda `url_comprobante` pública. Luego `upsert` en `vta_ventas_contado` y `upsert` de detalles (`{idVenta}-DET-{n}`). |
| `anularVentaContadoModulo` (real) | 627-642 | `UPDATE vta_ventas_contado` (`estado_general/estado_entrega = ANULADA` + motivo + fecha) y `UPDATE vta_gestion_entrega` a `ANULADA`. |
| `guardarParametroAdminMotor` (real) | 643-653 | `upsert` en `sys_parametros` con `onConflict: clave`. Normaliza boolean a `"TRUE"/"FALSE"`. |
| `guardarGestionEntregaVentaContadoModulo` (real, con gates finos) | 654-735 | Gate 1: lee `estado_abono` real en BD y exige `ABONO_CONFIRMADO`. Gate 2 (si no SUPERADMIN): lee `seg_permisos` para `GESTIONAR/PROGRAMAR/CONFIRMAR_ENTREGA` (primero por usuario, luego por rol), obtiene `alcance` (`GLOBAL/TOTAL/PROPIO/PROVEEDOR/ASIGNADOS/OFICINA/GRUPO`) y lo valida contra la venta real (dueño, proveedor, lista de precios, oficina, grupo). Luego `upsert` en `vta_gestion_entrega` y `UPDATE` en `vta_ventas_contado` (programado/entregado). |
| `listarDespachoModulo` (real) | 736-743 | Reutiliza `listarVentasContadoModulo` y filtra solo `PROGRAMADA` / `EN_RUTA`. Devuelve `registros` y `ventas`. |
| `cambiarEstadoProveedorModulo` (real) | 744-751 | `UPDATE mae_proveedores SET estado` por `id_proveedor`. |
| `exportarVentasContadoModulo` (real, genera CSV) | 752-768 | Construye `ventas_360.csv` en memoria desde el caché local (cabecera CODIGO/FECHA/CLIENTE/…/BONO) escapando comillas. No consulta BD. |
| `default` (real) | 769-771 | Devuelve `undefined` = "no sé hacerlo en real, usa el Demo". |
| `mapUsuario`, `mapRol`, `mapProveedor`, `mapMaterial`, `mapVenta` | 775-875 | Traductores `snake_case → camelCase`. `mapVenta` además aplana detalle, gestión, comprobante y receptor. |
| `window.apiAdapter = apiAdapter` | 877 | Expone el puente al resto de la app. |

### `js/app-core.js` (1923 líneas)

| Función / bloque | Líneas | Qué hace |
|---|---|---|
| `APP_STORAGE` | 1-7 | Nombres de llaves en `localStorage`: token, sesión, sidebar colapsado, tema, caché por módulo. |
| `APP_STATE` | 9-25 | Memoria viva: `token`, `session`, `context` (visible), `realContext` (real), `rolePreview`, `module`, timers, `dataRevision`. |
| `LOADER_RUNTIME` / `APP_LOADER_RUNTIME` | 27-39 | Estado del splash inicial y del overlay interno (con retardo de 180 ms para no parpadear). |
| Arranque `DOMContentLoaded` | 45-50 | Al cargar: `initTheme()` + `bindGlobalInterface()` + `restoreSidebarPreference()` + `bootApplication()`. El branding del loader se aplica antes (lín. 43). |
| `bootApplication()` | 55-87 | Arranque y sesión. Si hay flag de crear contraseña, limpia y sale. Si no hay Supabase, muestra login con error. Si hay sesión Supabase válida, guarda `token` y llama a `initializeProtectedApplication()`; si no, muestra login. |
| `initializeProtectedApplication()` | 92-121 | Carga protegida: pide `obtenerContextoAplicacion` con timeout de 15 s, guarda `realContext` y `context`, pinta (`applyContext`, `renderNavigation`, `renderDashboard`), arranca `heartbeat` y refresco incremental, oculta login y muestra el shell. Si falla, limpia sesión y vuelve a login. |
| `secureRpc()` | 126-163 | Canal protegido. Exige `token`; arma objeto `simulacion` si hay "Visualizar como" con usuario de referencia; llama a `apiAdapter.executeRpc`. Si el error huele a sesión/token/no autorizado, cierra sesión y muestra login. |
| `applyContext()` | 168-219 | Pinta usuario, colores, logo, saludo y badge de Supabase con los datos del contexto. |
| `isAutomaticRefreshEnabled`, `applyRefreshConfigurationFromAdmin`, `updateAutomaticRefreshInterface`, `applySynchronizationConfiguration` | 224-293 | Leen y aplican los parámetros `APP_REFRESH_ENABLED` / `APP_REFRESH_SECONDS` (mínimo 60 s) sin recargar la vista. |
| `renderNavigation()` | 298-330 | Dibuja el menú lateral agrupado por `grupoMenu` con botón por módulo; marca el activo. |
| `renderDashboard()` | 335-342 | Vista "Inicio": activa `dashboardView`, título GENERAL/Inicio, marca sincronización. |
| `isAdministrationModule()` | 348-357 | Dice si un código es del workspace de administración (`ADMIN_*`). |
| `openModule()` | 362-445 | Abre un módulo si está en `context.modulos`; si hay vista previa sin usuario de referencia, lo bloquea; delega a cada workspace (`openAdministrationWorkspace`, `openProvidersWorkspace`, etc.) o a `openDynamicModule`. |
| `setActiveView`, `setModuleHeading`, `updateActiveNavigation` | 450-472 | Muestran/ocultan vistas, cambian título y resaltan el menú activo. |
| `clearClientModuleCache()` | 479-503 | Borra cachés por prefijo (`SGT360_MP_/SALES_/PROV_/ADM_`). El botón global usa `ALL`; los internos solo su módulo. |
| `bindGlobalInterface()` | 508-562 | Conecta todos los botones globales: sidebar, actualizar, logout, tema, perfil, "visualizar como", modales, `Escape`, clic fuera del menú, y `visibilitychange` (al volver a la pestaña solo renueva actividad + reinicia contador, no recarga). |
| `showLogin()` | 567-575 | Pantalla de acceso: para timers, cierra menú perfil, oculta shell, muestra `authView`, apaga loader, muestra mensaje y prepara proveedores OAuth. |
| `prepareLoginProviders`, `configureOAuthButton` | 580-631 | Pregunta qué login social está habilitado (usa el canal legacy `google.script.run`) y configura botones Google/Microsoft que redirigen a `urlAutorizacion`. |
| `showAuthMessage()` | 636-642 | Pinta el mensaje de error/info bajo el login; lo oculta si no hay mensaje. |
| `activePermission()` | 653-665 | Permiso efectivo del **contexto visible**. Bypass: si `context.usuario.rol === SUPERADMIN` devuelve `{ permitido: true, alcance: "GLOBAL" }` sin mirar `seg_permisos`. Bajo "visualizar como" el rol visible es el simulado, por eso el bypass no se aplica (ver Detalle). |
| `hasActivePermission()` | 667-670 | `true` solo si `activePermission(...).permitido === true`. Lo usan los módulos para mostrar/ocultar botones. |
| `activePermissionScope()` | 672-677 | Devuelve el alcance (`GLOBAL/PROVEEDOR/OFICINA/…`) o `"NINGUNO"` si no hay permiso. Lo usan los filtros de datos. |
| `rolePreviewCacheKey`, `loadRolePreview` | 679-708 | Caché de vistas previas por `ROL\|usuario` + control de secuencia para ignorar respuestas viejas si cambias rápido el selector. |
| `configureRolePreview()` | 710-733 | Arma el selector "Visualizar como": solo visible si eres SUPERADMIN real, la función está habilitada y hay roles activos distintos a SUPERADMIN y al tuyo. |
| `handleRolePreviewChange()` | 738-770 | Al elegir rol: bloquea selector, muestra loader, pide `obtenerVistaPreviaRolAdminMotor`, activa la vista o muestra toast de error. Vacío = salir de la vista. |
| `handleRolePreviewUserChange()` | 779-801 | Al elegir usuario de referencia dentro del rol: recarga la vista con ese contexto organizativo (proveedor/oficina/grupo). |
| `activateRolePreview()` | 803-890 | Cambia `APP_STATE.context` al simulado (usuario + `seguridad` + `modulos`), guarda lo real en `realContext`, repinta menú/dashboard, muestra banner. Si no hay usuario de referencia, avisa que los datos no cargarán. Toast de confirmación. La sesión real no se toca. |
| `exitRolePreview()` | 895-919 | Restaura `context = realContext`, limpia `rolePreview`, oculta banner, repinta. |
| `isRolePreviewActive()`, `showRoleModuleAccessPreview()`, `openRoleAccessSummary()`, `findPreviewModule()`, `buildPreviewModuleHtml()` | 924-1021 | Utilidades de la vista previa: saber si está activa, modal por módulo (Visible/Oculto + Permitido/Denegado + alcance) y resumen con contadores (visibles/ocultos/permitidos/denegados). |
| `startHeartbeat()` | 1026-1029 | Cada 120 s llama a `executeHeartbeat()`. |
| `executeHeartbeat()` | 1034-1053 | Renueva actividad de sesión en servidor (`actualizarActividadSesionPaso13D1`, vía `google.script.run`). Si el servidor dice no autenticado o falla, cierra sesión y pide login. No hace nada si no hay token o la pestaña está oculta. |
| `configureIncrementalRefresh()` | 1061-1075 | Programa revisión ligera cada N segundos (mínimo 60, según `actualizacionSegundos`). Si el refresco automático está apagado, no programa nada. |
| `synchronizeApplicationChanges()` | 1081-1132 | Revisión en 2 pasos: 1) `obtenerEstadoSincronizacionMotor` (¿cambió `revision`?), 2) solo si cambió o es forzado, recarga `obtenerContextoAplicacion` y lo aplica. Respeta modo manual (solo botón Actualizar reconstruye). Evita doble ejecución con `syncPending`/`requestPending`. |
| `applySynchronizedContext()` | 1138-1194 | Aplica el contexto nuevo conservando el módulo si sigue permitido; si hay vista previa, la reconstruye o la abandona si el rol ya no existe. |
| `refreshCurrentModule()` | 1199-1236 | Re-pide datos del módulo visible (`refreshAdministrationWorkspace`, `refreshCashSalesWorkspace`, etc.). En vista previa o dashboard solo marca sincronización, no consulta datos operativos. |
| `closeApplicationSession()` | 1245-1273 | Cierre con respuesta inmediata: registra cierre en Supabase en segundo plano, para timers, limpia token, resetea a DASHBOARD, cierra modales y muestra login. |
| `requestSelfDeactivation()` | 1276-1303 | "Dar de baja mi acceso": pide confirmación, llama a `deactivateCurrentUser()`, cierra sesión. Requiere reactivación por un admin. |
| `withTimeout`, `readStoredToken`, `clearLocalSession`, `stopTimers` | 1305-1352 | Utilidades: promesa con timeout; leer token; borrar token/sesión/contexto/vista previa; detener heartbeat + refresco. |
| `applyInitialLoaderBranding`, `setElementText`, `resolveLoaderStep`, `updateLoaderStep` | 1357-1446 | Personalizan el splash inicial (color, logo, nombre, versión, 3 etapas: validando → cargando → listo). |
| `setLoader`, `setInitialLoader`, `setAppLoader`, `resolveAppLoaderTitle` | 1453-1609 | `setLoader` dirige al splash solo en el primer arranque; después usa el overlay interno con retardo anti-parpadeo y título amable ("Guardando cambios", "Sincronizando", etc.). |
| `restoreSidebarPreference`, `initTheme`, `toggleTheme`, `applyTheme` | 1614-1659 | Sidebar colapsado y tema claro/oscuro persistidos en `localStorage`. El icono cambia sol/luna. |
| `toggleSidebarCollapse`, `applySidebarCollapsed`, `openSidebar`, `closeSidebar`, `markSync` | 1664-1715 | Colapsar/expandir menú (no colapsa en móvil), abrir/cerrar en móvil, y hora de última sincronización (`lastSyncLabel`). |
| `metricCardHtml`, `tableHtml`, `emptyStateHtml`, `loadingHtml`, `toast` | 1720-1768 | Piezas visuales compartidas: tarjetas, tablas, "sin registros", esqueletos de carga, notificaciones (5,2 s). |
| `openModal`, `closeModal`, `openSideSheet`, `closeSideSheet` | 1773-1802 | Modal central y panel lateral: rellenan título/cuerpo/pie y muestran/ocultan. `Escape` los cierra. |
| `toggleProfileMenu`, `closeProfileMenu` | 1807-1819 | Menú del avatar (cambiar contraseña / cerrar sesión). Se cierra con clic fuera o `Escape`. |
| `openChangePasswordModal`, `submitPasswordChange` | 1824-1879 | Modal de nueva contraseña (mínimo 6, deben coincidir) y guardado vía `client.auth.updateUser()`. |
| `text`, `on`, `initials`, `firstName`, `formatValue`, `escapeHtml`, `moduleIconHtml`, `errorMessage`, `debounce` | 1884-1923 | Ayudantes: escribir texto seguro, enganchar eventos, iniciales/avatar, primer nombre para saludo, `—` para vacíos, escape anti-XSS, iconos Material/FontAwesome, mensajes de error limpios, anti-rebote. |

---

## 3) Detalle — flujos clave paso a paso

### Flujo A — Entrar a la app: login → contexto → módulo

Ubicación: `app-core.js` lín. 45-50, 55-87, 92-121, 126-163, 168-219, 298-330, 362-445.

1. **Abres la página.** El navegador dispara `DOMContentLoaded` (lín. 45-50): aplica tu tema guardado (`initTheme`), conecta botones (`bindGlobalInterface`), restaura si el menú estaba minimizado (`restoreSidebarPreference`) y llama a `bootApplication()`. El logo y color del splash ya se habían aplicado antes (lín. 43).
2. **Valida tu sesión** (`bootApplication`, lín. 55-87). Pregunta a Supabase Auth si hay sesión (`supabase.auth.getSession()`). Casos:
   - No hay Supabase configurado → `showLogin("Supabase no está configurado.", true)`.
   - No hay sesión/token → limpia restos (`clearLocalSession`) y muestra login vacío.
   - Sí hay sesión → guarda `APP_STATE.token` + `APP_STATE.session` (y el token en `localStorage`) y pasa a `initializeProtectedApplication()`.
3. **Carga tu identidad real** (`initializeProtectedApplication`, lín. 92-121). Pide por el canal protegido `secureRpc("obtenerContextoAplicacion", [], "SISTEMA")` con límite de 15 segundos. Esa respuesta trae `usuario`, `modulos`, `seguridad.permisos`, `interfaz`, `sincronizacion.revision`. Se guarda **dos veces**: en `realContext` (tu verdad, nunca se simula) y en `context` (lo que se ve, que luego puede simularse).
4. **Pinta la app** (`applyContext` + `renderNavigation` + `renderDashboard`, lín. 168-219, 298-342). Pone tu nombre/rol/avatar, color, logo, saludo ("Hola, …"), oculta `authView`, muestra `appShell`, dibuja el menú solo con tus módulos y abre el Inicio. Arranca `startHeartbeat()` (cada 2 min) y `configureIncrementalRefresh()` (revisión ligera cada N segundos).
5. **Abrir un módulo** (`openModule`, lín. 362-445). Busca el código en `context.modulos`. Si no está, toast "Módulo no disponible". Si estás en "Visualizar como" sin usuario de referencia y no es DASHBOARD, lo bloquea. Si pasa, delega al workspace que corresponda (`VENTAS_CONTADO → openCashSalesWorkspace`, `MATERIALES_PRECIOS → openMaterialsPricesWorkspace`, etc.).
6. **Cada clic viaja por `secureRpc`** (lín. 126-163). Verifica que haya `token`; si hay vista previa activa con usuario de referencia, adjunta `{ activa: true, rol, idUsuarioReferencia }` para que el backend filtre por ese alcance. Si el backend responde error de sesión/token/no autorizado, te saca a login automáticamente.
7. **Salir** (`closeApplicationSession`, lín. 1245-1273). Primero limpia y te muestra login ("Sesión cerrada correctamente"), y en paralelo avisa a Supabase. No esperas.

> Nota para el dueño: `prepareLoginProviders` (lín. 580-589) y `executeHeartbeat` (lín. 1034-1053) todavía usan el canal antiguo `google.script.run`. Todo lo demás ya usa el puente `apiAdapter`. Si algún día falla el login social o el heartbeat, es ahí donde hay que migrar.

### Flujo B — Aprobar un abono de punta a punta (ejemplo: venta al contado)

Puente: `api-adapter.js` lín. 382-408 (guardar), 410-427 (confirmar demo), 558-626 (guardar real), 654-735 (gestión real). Núcleo: `secureRpc` lín. 126-163 + permisos lín. 653-677.

**B1. Registrar la venta.**

1. El vendedor llena el formulario en el módulo `VENTAS_CONTADO` y adjunta el comprobante (foto/PDF). El módulo llama `secureRpc("guardarVentaContadoModulo", [payload], "VENTAS_CONTADO")`.
2. `secureRpc` valida token y reenvía a `apiAdapter.executeRpc` (puente lín. 136-155).
3. **Si hay Supabase:** `dispatchSupabase` (lín. 558-626) arma la fila, sube el comprobante a Storage `evidencias/comprobantes/{idVenta}/…`, guarda la URL pública, hace `upsert` de la venta y de sus detalles. Responde `{ correcto: true, idVenta, codigoVenta }`.
4. **Si no hay Supabase (Demo):** `dispatchLocal` (lín. 382-408) genera `VTA-<fecha>` y `PED-360-XXXX`, pone `estadoAbono = PENDIENTE_CONFIRMACION`, convierte el `base64` a `data:` URL local y lo inserta al inicio de `s.ventas`. Misma forma de respuesta para que la pantalla no note la diferencia.

**B2. Confirmar (aprobar) el abono.**

1. Un revisor abre la venta y pulsa "Confirmar abono". El módulo primero pregunta al núcleo `hasActivePermission("VENTAS_CONTADO", "CONFIRMAR_ABONO")` (lín. 667-670): si es `false`, el botón ni aparece o se bloquea.
2. Si tiene permiso, llama `secureRpc("confirmarAbonoVentaContadoModulo", [idVenta], "VENTAS_CONTADO")`.
3. **En Demo** (lín. 410-427): busca la venta; si tu `idProveedor` no coincide con ningún proveedor ligado a la venta (cabecera, gestión o detalles) y no eres SUPERADMIN, rechaza: *"Solo una cuenta del proveedor de esta venta puede validar el abono."* Si coincide, pone `ABONO_CONFIRMADO` y anota `abonoAprobadoId/Nombre`.
4. **En real:** esta operación hoy no tiene `case` en `dispatchSupabase`, así que `dispatchSupabase` devuelve `undefined` (lín. 769-771) y `executeRpc` cae automáticamente al Demo. Efecto práctico: **el abono real debe implementarse como `UPDATE vta_ventas_contado SET estado_abono = ABONO_CONFIRMADO`** (hoy solo funciona en Demo). Ver sección 5, ejemplo 1.
5. La pantalla muestra toast "Abono confirmado" y la venta queda lista para el siguiente paso.

**B3. Gestionar la entrega (el "doble candado").**

1. Con el abono en `ABONO_CONFIRMADO`, el gestor programa la entrega: `secureRpc("guardarGestionEntregaVentaContadoModulo", [payload], "VENTAS_CONTADO")`.
2. **Candado 1 — abono:** tanto Demo (lín. 433-435) como real (lín. 658-661) leen el estado y si no es `ABONO_CONFIRMADO` responden *"Confirma el abono… antes de gestionar su entrega."* No hay forma de saltárselo desde la UI normal.
3. **Candado 2 — proveedor/alcance:**
   - Demo (lín. 436-441): compara tu `idProveedor` con los de la venta; SUPERADMIN pasa siempre.
   - Real (lín. 662-718): lee `seg_permisos` (permiso por usuario, si no por rol), obtiene el `alcance` y lo valida: `GLOBAL/TOTAL` pasa; `PROPIO` exige ser el dueño (`id_usuario`); `PROVEEDOR/ASIGNADOS` exige mismo proveedor (incluye verificación por lista de precios y gestión); `OFICINA`/`GRUPO` exigen coincidencia exacta.
4. Si pasa, guarda: `upsert` en `vta_gestion_entrega` (+ `fecha_real_entrega` si es `ENTREGADA`) y `UPDATE` en la venta (`estado_entrega`, `programado_id/nombre` o `entregado_id/nombre`). Responde "Gestión de entrega actualizada."
5. **Anular** es el camino aparte: `anularVentaContadoModulo` (demo lín. 476-491 / real lín. 627-642) marca todo `ANULADA` con motivo y fecha.

### Flujo C — "Visualizar como" (por qué el SUPERADMIN respeta la simulación)

Ubicación: `app-core.js` lín. 653-677, 710-919; puente lín. 662-718.

1. Solo el SUPERADMIN real ve el selector (`configureRolePreview`, lín. 710-733). Al elegir un rol, `handleRolePreviewChange` pide la vista al backend y `activateRolePreview` (lín. 803-890) **reemplaza** `APP_STATE.context` por el simulado, pero **conserva** lo real en `APP_STATE.realContext`. La sesión/token no cambian.
2. `activePermission` (lín. 653-665) lee el rol del **contexto visible**, no del real:
   ```js
   const contextRole = String(ctx && ctx.usuario ? ctx.usuario.rol || "" : "").toUpperCase();
   if (contextRole === "SUPERADMIN") return { permitido: true, alcance: "GLOBAL" };
   ```
   Bajo simulación, `context.usuario.rol` es p. ej. `VENDEDOR`, así que el bypass no se activa y se usan los permisos simulados (`ctx.seguridad.permisos`). Por eso un SUPERADMIN "viendo como Vendedor" realmente ve lo que ve un vendedor.
3. Además `secureRpc` (lín. 139-150) excluye de simulación solo 3 operaciones (`obtenerContextoAplicacion`, `obtenerEstadoSincronizacionMotor`, `obtenerVistaPreviaRolAdminMotor`); todo lo demás viaja con `{ rol, idUsuarioReferencia }`, y el puente real (lín. 662-718) filtra por ese alcance. Y `openModule` (lín. 377-388) + `refreshCurrentModule` (lín. 1201-1205) bloquean cargar datos operativos si el rol simulado no tiene usuario de referencia.
4. Salir (`exitRolePreview`, lín. 895-919) restaura `context = realContext` y el bypass SUPERADMIN vuelve a aplicar.

---

## 4) Conexiones

- **Con `index.html`:** el núcleo espera los IDs `authView`, `appShell`, `moduleNavigation`, `dashboardView`, `dynamicModuleView`, `globalLoader`, `appLoader`, `rolePreviewSelect/UserSelect/Control/Banner`, `profileMenu/Button`, `themeToggleButton/Icon`, `refreshButton`, `toastRegion`, `modalRoot`, `sideSheetRoot`, `lastSyncLabel`. Si renombras uno en el HTML, el núcleo deja de pintar esa pieza.
- **Con `js/supabase-client.js`:** `bootApplication` (lín. 62-63), `closeApplicationSession` (lín. 1250-1260), `submitPasswordChange` (lín. 1864-1871) y todo `dispatchSupabase` dependen de `window.supabaseClient.isConfigured()` / `getClient()`. Sin cliente configurado, el puente opera 100 % en Demo y el núcleo no deja entrar (muestra login con error).
- **Con `js/config.js`:** el contexto Demo usa `window.APP_CONFIG.APP_NAME/VERSION/ENTORNO` (puente lín. 184-186) y el branding del loader usa `window.__C360_LOADER_CONFIG__` (núcleo lín. 1361-1364).
- **Con `js/modules/*`:** los workspaces llaman a `secureRpc(...)` y a `hasActivePermission / activePermissionScope` para decidir qué botones y datos mostrar; llaman a `refresh*Workspace(silent)` cuando el núcleo detecta cambios; el botón global Actualizar limpia cachés vía `clearClientModuleCache("ALL")`.
- **Con Supabase (tablas y Storage):** `seg_usuarios`, `seg_roles`, `seg_permisos`, `mae_proveedores`, `mae_materiales`, `vta_ventas_contado` (+ `vta_ventas_contado_detalle`, `vta_gestion_entrega`), `pre_lista_precio_detalle`, `pre_listas_precios`, `sys_parametros`; bucket `evidencias` (carpeta `comprobantes/`). Los `map*` (lín. 775-875) son el diccionario entre BD y pantalla.
- **Con el canal legacy `google.script.run`:** `prepareLoginProviders` y `executeHeartbeat` aún lo usan. Si migras a Supabase puro, esos dos son los pendientes.
- **Entre ambos archivos:** `secureRpc` (núcleo) → `apiAdapter.executeRpc` (puente) → `dispatchSupabase` o `dispatchLocal` → respuesta `{ correcto, ... }` → el módulo pinta o muestra toast. El núcleo nunca habla directo a Supabase para datos de negocio; siempre pasa por el puente.

---

## 5) Si quieres cambiar X, toca Y (5 ejemplos)

1. **"Quiero que el botón Confirmar abono funcione con datos reales, no solo en Demo."**
   Toca `js/api-adapter.js`, función `dispatchSupabase` (entre lín. 626 y 627, junto a `anularVentaContadoModulo`). Agrega un `case "confirmarAbonoVentaContadoModulo"` que haga `UPDATE vta_ventas_contado SET estado_abono = 'ABONO_CONFIRMADO'` + quién aprobó, replicando el gate de proveedor de `guardarGestionEntrega` real (lín. 662-718). Hoy ese `case` no existe y por eso cae al Demo (lín. 769-771).

2. **"Quiero que tal rol vea tal módulo o botón."**
   No toques el núcleo. Toca los datos de permisos (`seg_permisos` en Supabase o la matriz del módulo ADMIN_PERMISOS). El núcleo solo lee: `activePermission / hasActivePermission / activePermissionScope` (`app-core.js` lín. 653-677). Si eres SUPERADMIN lo ves todo por el bypass; para verificar como otro rol usa "Visualizar como" en vez de pedir una cuenta prestada.

3. **"La actualización automática molesta / tarda / quiero otro intervalo."**
   Toca parámetros `APP_REFRESH_ENABLED` y `APP_REFRESH_SECONDS` (mínimo 60). Se aplican en caliente vía `applyRefreshConfigurationFromAdmin` y `applySynchronizationConfiguration` (`app-core.js` lín. 234-293) y el temporizador `configureIncrementalRefresh` (lín. 1061-1075). No toques `synchronizeApplicationChanges` salvo que quieras cambiar la lógica de revisión por `revision`.

4. **"Quiero cambiar el comprobante: dónde se guarda o qué nombre usa."**
   Toca `guardarVentaContadoModulo` en el puente: versión real lín. 591-605 (ruta `comprobantes/{idVenta}/…`, bucket `evidencias`, `upsert: true`) y versión Demo lín. 395-404 (convierte `base64` a `data:` URL). Si cambias el bucket o la ruta en real, actualiza también `mapVenta` (lín. 837-842) que lee `url_comprobante`.

5. **"Quiero cambiar el tema inicial, el logo, el color o cada cuánto se renueva la sesión."**
   Tema: `initTheme / applyTheme / toggleTheme` (`app-core.js` lín. 1625-1659, llave `SGT360_UI_THEME_V1`); logo/color del splash: `applyInitialLoaderBranding` (lín. 1357-1409, lee `window.__C360_LOADER_CONFIG__`); sesión viva: `startHeartbeat` (lín. 1026-1029, intervalo 120 s) + `executeHeartbeat` (lín. 1034-1053). Menú lateral: `applySidebarCollapsed` (lín. 1673-1692). Nada de esto toca datos ni permisos.

---

*Archivos documentados: `js/api-adapter.js` (878 líneas) y `js/app-core.js` (1923 líneas). Regla de oro: el puente traduce y protege datos; el núcleo protege la sesión y la vista. Si cambias reglas de negocio (quién aprueba, qué exige qué), toca el puente; si cambias experiencia (qué se ve, cuándo se actualiza, cómo se entra/sale), toca el núcleo.*
