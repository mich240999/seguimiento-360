# 05 — Módulo de Ventas (`sales.js` + `sales-dashboard.js`)

> Archivos documentados (lectura completa):
> - `js/modules/sales.js` — 5898 líneas. Bandejas REGISTRADAS / ABONOS / ENTREGAS / DESPACHO, formulario Nueva venta / Modificar, carrito y ofertas, detalle, validación de abono, gestión de entrega, anulaciones, exportar, paginación y caché.
> - `js/modules/sales-dashboard.js` — 503 líneas. Dashboard de lectura con KPIs, filtros, gráficos, tabla y exportar a CSV.

## 1) Para qué sirve

**`sales.js` — el módulo operativo de Ventas al contado.** Es donde el negocio vende, cobra y entrega:

- **REGISTRADAS:** consulta y modifica ventas. Es la bandeja general (requiere permiso `puedeListar`).
- **ABONOS (Validación de abonos):** revisa comprobantes pendientes u observados. Aprobar lleva la venta a `POR_ENTREGAR`. Requiere `puedeValidarAbono`.
- **ENTREGAS (Programación de entregas):** programa entregas de ventas con abono aprobado. Solo llega hasta `PROGRAMADA` / `OBSERVADA`. La ejecución (`EN_RUTA` → `ENTREGADA`) se hace en **DESPACHO**. Requiere `puedeGestionarEntrega`.
- **DESPACHO:** pestaña embebida dentro de Ventas que reutiliza `dispatch.js` sin cambiar de módulo. Solo ventas `PROGRAMADA` y `EN_RUTA` del proveedor del usuario.
- **Nueva venta / Modificar:** formulario en 4 pasos (comprador → receptor → contexto comercial → catálogo de ofertas + carrito + pago). Guarda con comprobante de pago (queda `Pendiente` hasta que un aprobador lo valide).
- **Detalle de venta:** ficha completa con productos, estado de cada material, trazabilidad (quién hizo cada etapa + bono del vendedor), documentos de aprobación y evidencias de entrega.
- **Aprobar / Observar abono, Programar entrega, Anular (venta o material), Archivar prueba, Reclasificar, Exportar a Excel.**

**`sales-dashboard.js` — el tablero de lectura para el dueño.** No registra ni modifica nada. Carga las ventas con el mismo RPC del módulo (`listarVentasContadoModulo`), las filtra en el navegador y muestra: 7 KPIs, 3 gráficos (ventas por día, abono, entrega), tabla de detalle (máx. 200 filas) y exportar a CSV.

## 2) Mapa

### 2.1 `sales.js` — estado, arranque y contexto

| Función | Líneas | Qué hace |
|---|---|---|
| `SALES_STATE` | 1–46 | Estado global: `activeView`, `filters`, `rows`, `pagination`, `cart`, `offers`, `editing`, `detailCache`, `viewCache`, `viewFilters`, `syncRevision`, tokens anti-carrera (`listRequestToken`, `modalRequestToken`, `offerRequestToken`, `viewsPrefetchToken`). |
| `prepareSalesModal29W_` / `isSalesModalCurrent29W_` / `closeSalesModal29W_` | 49–94 | Tokens de modal: cada modal recibe un token; si el usuario abre otro modal antes de que llegue la respuesta, la respuesta vieja se descarta. |
| `salesModalLoadingBody29W_` | 96–121 | Cuerpo “Cargando información” que se muestra mientras llega el RPC del modal. |
| `ensureSalesFormContext29W_` | 128–189 | Trae el **contexto comercial completo** (`obtenerContextoVentasContadoModulo` con `modoLigero:false`), válido 5 min. Solo se llama al abrir Nueva venta / Modificar. |
| `prefetchSalesFormContext29W_` | 191–209 | Precarga silenciosa del contexto completo 250 ms después de abrir el módulo (solo si `puedeRegistrar` o `puedeEditar`). |
| `openCashSalesWorkspace` | 211–358 | Entrada al módulo. Resetea filtros/carrito/ofertas, reutiliza contexto si tiene menos de 2 min, si no llama a `loadCashSalesContext`. |
| `refreshCashSalesWorkspace` | 361–367 | Botón Actualizar. Si la vista es DESPACHO delega a `refreshDispatchWorkspace`, si no a `loadCashSalesContext`. |
| `renderCashSalesFrame` | 369–386 | Esqueleto: barra de pestañas (`salesTaskTabs`), botones Actualizar / Nueva venta, `salesContextWarnings`, `salesListRegion`. |
| `loadCashSalesContext` | 388–573 | Carga inicial: RPC `obtenerContextoVentasContadoModulo` en `modoLigero:true` + `listadoInicial`. Define `activeView`, pinta pestañas, filtros y primera tabla. Si no hay permisos muestra “Sin bandejas asignadas”. |
| `renderSalesWarnings` | 576–581 | Muestra advertencias comerciales (`context.comercial.advertencias`). |

### 2.2 `sales.js` — vistas y permisos

| Función | Líneas | Qué hace |
|---|---|---|
| `salesCanViewDispatchTab29D_` | 589–603 | Dice si se muestra la pestaña DESPACHO: permiso `PROGRAMAR_ENTREGA` o `CONFIRMAR_ENTREGA`, o rol `DESPACHADOR`. |
| `salesCanOpenView29M_` | 605–630 | Portero por vista: ABONOS exige `puedeValidarAbono`, ENTREGAS exige `puedeGestionarEntrega`, DESPACHO usa la regla anterior, el resto exige `puedeListar`. |
| `salesFirstAllowedView29M_` | 632–640 | Primera vista permitida: REGISTRADAS → ABONOS → ENTREGAS (si no hay ninguna, cadena vacía). |
| `renderSalesTaskTabs` | 642–712 | Dibuja las pestañas (`data-sales-view`) y valida permiso al hacer clic antes de llamar a `cambiarBandejaVentasPaso29G_`. |
| `cambiarBandejaVentasPaso29G_` | 1311–1327 | Cambia de bandeja: guarda filtros de la actual, restaura/base de la nueva, repinta pestañas + filtros y carga (DESPACHO va por otro camino). |
| `renderSalesDispatchFrame29D_` | 1334–1343 | DESPACHO embebido: llama a `openDispatchWorkspace(module, {embedded:true})` dentro de `salesListRegion`. No toca el flujo REGISTRADAS/ABONOS/ENTREGAS. |
| `salesViewTitle` | 1345–1350 | Título y subtítulo de cada vista. |
| `salesAllowedViewsPaso30B_` | 816–837 | Lista de vistas permitidas (REGISTRADAS/ABONOS/ENTREGAS) para la precarga batch. |

### 2.3 `sales.js` — filtros, tabla, paginación

| Función | Líneas | Qué hace |
|---|---|---|
| `filtrosBaseBandejaVentasPaso29G_` | 714–729 | Filtros por defecto de cada vista (o restaura los guardados en `viewFilters`). |
| `collectSalesFilters` | 1384–1393 | Lee los inputs al DOM: `salesFilterText`, `salesFilterState`, `salesFilterPayment`, `salesFilterRecordType`, `salesFilterFrom`, `salesFilterTo`. |
| `renderSalesListFrame` | 1352–1379 | Pinta cabecera + barra de filtros + `salesTableRegion` + `salesPagination`. Los selects de estado se llenan con `context.estados` y `context.estadosAbono`. El botón Exportar solo aparece si `puedeExportar`. El selector COMERCIAL/PRUEBA solo aparece si `puedeGestionarPruebas`. |
| `renderSalesTable29` | 1801–1900 | Tabla con columnas: Código venta, Fecha, Tipo, Cliente (Cuenta contrato), Nombre del cliente, **Vendido por (`item.nombreUsuario`)**, Importe, Abono, Estado de venta, Opciones. En vista ENTREGAS la columna de estado muestra `estadoEntrega`. Enlaza los botones `data-*` (con pre-carga al pasar el mouse). |
| `renderSalesRowActions29` + `wrapRows` | 1902–1992 | Construye los botones de cada fila en una línea (`wrapRows`, 1906–1917). Ver detalle abajo. |
| `salesPaymentBadge29` | 1994–1999 | Pastilla de abono: Aprobado / Observado / Pendiente. |
| `salesStatusBadge29` | 2000–2026 | Pastilla de venta: Registrada, Por entregar, Programada, Observada, Entregada, Anulada. |
| `salesMaterialDeliveryBadge29` / `salesMaterialDeliveryDetail29` | 2028–2116 | Pastilla y detalle por material (fecha acordada, observación, entrega confirmada). Si el abono no está confirmado muestra “Pendiente de abono”. |
| `renderSalesPagination29` | 3206–3212 | Paginación: “Página X de Y · N registros” + Anterior / Siguiente (`salesPrevPage`, `salesNextPage`), cambia `filters.pagina` y recarga. |
| `getSalesRowById29` | 2118–2123 | Busca una fila en `SALES_STATE.rows` por `idVenta` (lo usan los modales para no pedir todo de nuevo). |

### 2.4 `sales.js` — caché, precarga y sincronización

| Función | Líneas | Qué hace |
|---|---|---|
| `claveCacheBandejaVentasPaso29G_` | 731–744 | Clave de caché = vista\|texto\|estado\|estadoAbono\|segmento\|desde\|hasta\|página\|tamaño. |
| `guardarFiltrosBandejaActualPaso29G_` | 746–750 | Guarda los filtros actuales en `viewFilters[activeView]` antes de cambiar de pestaña. |
| `invalidarCacheBandejasVentasPaso29G_` | 752–773 | Vacía `viewCache`, resetea `syncRevision` y cancela la precarga (invalida su token). Se llama al guardar/anular/exportar. |
| `verificarRevisionVentasPaso29G_` | 775–803 | Pregunta `obtenerEstadoSincronizacionMotor` (máx. 1 vez cada 15 s). Si la revisión cambió, la bandeja se recarga. |
| `mostrarBandejaCacheadaPaso29G_` | 805–813 | Pinta una bandeja guardada al instante (stale-while-revalidate). |
| `loadSalesList` | 1395–1456 | Pide `listarVentasContadoModulo` con los filtros + token anti-carrera; guarda en `viewCache` y llama a `renderSalesListResult`. |
| `renderSalesListResult` | 1693–1739 | Guarda `rows` + `pagination`, pinta tabla y paginación, y programa: refresh de índice, precarga de bandejas y warmup de modales. |
| `salesFiltersAreBasePaso30B_` / `salesBaseFiltersPaso30B_` / `salesViewsPrefetchKeyPaso30B_` | 839–904 | Detectan si los filtros están “en base” (sin texto/fechas, página 1, TODOs) para permitir la precarga batch. |
| `guardarPrecargaBandejasPaso30B_` | 906–1021 | Guarda el batch `precargarBandejasVentasContadoModulo`: bandejas + hasta 3 detalles calientes por bandeja en `detailCache`. |
| `runSalesViewsPrefetchPaso30B_` / `scheduleSalesViewsPrefetchPaso30B_` | 1023–1178 | Precarga las otras pestañas 150 ms después del primer pintado (solo si hay >1 vista y filtros en base). |
| `cargarBandejaSiCambioPaso29G_` | 1180–1309 | Al cambiar de pestaña: si hay caché la muestra y revalida; si no, intenta el batch y si falla va a `loadSalesList`. |
| `scheduleSalesIndexRefresh29Y_` | 1459–1519 | Si el backend dice `indiceDesactualizado`, llama a `refrescarIndiceVentasContadoModulo` (máx. 1 vez cada 20 s) e invalida caché. |
| `scheduleSalesModalWarmup29Y_` | 1521–1691 | 650 ms después de pintar, precalienta con `precalentarDetallesVentasContadoModulo` los 5 primeros detalles no cacheados. |
| `salesDetailCacheKey29M_` / `getSalesDetailCached29` / `invalidateSalesDetailCache29` | 2125–2251 | Caché de detalle por `idVenta|VISTA` (60 s, con promesa compartida). `invalidate` se llama tras guardar/validar/anular. |

### 2.5 `sales.js` — carrito, ofertas y formulario de venta

| Función | Líneas | Qué hace |
|---|---|---|
| `openNewCashSaleModal` | 3214–3319 | Nueva venta: verifica `puedeRegistrar`, abre modal de carga, espera contexto completo y llama a `renderSaleForm29`. |
| `openEditCashSale29` | 3322–3516 | Modificar: pide detalle + contexto en paralelo; si `puedeModificar` es falso bloquea; reconstruye `cart` desde `detalles` y llama a `renderSaleForm29`. |
| `renderSaleForm29` | 3519–3608 | Formulario en 4 secciones: 1) comprador, 2) receptor, 3) contexto comercial (negocio/oficina/grupo), 4) catálogo + sidebar (carrito, pago, guardar). |
| `populateSalesCommercial29` / `populateSalesGroups29` | 3612–3681 | Llena oficinas y grupos (grupos dependen de la oficina; aplica predeterminados). |
| `hasCompleteSalesCommercialContext29_` / `syncSalesCatalogAvailability29_` | 3683–3722 | El catálogo se desbloquea solo con negocio + oficina + grupo. Si falta algo muestra el candado `salesCatalogGate`. |
| `bindSaleForm29` | 3724–3798 | Eventos del formulario: receptor, negocio/oficina/grupo (recargan ofertas), buscador con debounce 120 ms, submit → `saveCashSale29`. |
| `salesOfferContextKey29P_` / `loadOffers29` | 3828–3936 | Catálogo: RPC `obtenerOpcionesFormularioVentaContadoModulo` (límite 1000), caché por negocio\|oficina\|grupo durante 5 min (`offerContextCache`). |
| `populateOfferFilters29` / `fillSelect29` | 3937–3938 | Llena Producto / Tipo / Subtipo. |
| `salesOfferScope29_` / `salesOfferInScope29_` | 3939–3978 | Alcance: el admin ve todo; el resto solo su proveedor/oficina/grupo. |
| `filterOffersClient29` | 3980–4033 | Filtro en navegador por producto/tipo/subtipo + texto normalizado (código, marca, proveedor, combo). |
| `renderOffers29` | 4090–4173 | Tarjetas de oferta con precio, proveedor y botón `data-add-offer`. |
| `addOfferToCart29` | 4175 | Agrega al carrito (valida alcance; si ya existe suma cantidad hasta 99). |
| `renderCart29` | 4176–4329 | Carrito con `data-cart-minus` / `data-cart-plus` / `data-cart-remove`, total en S/ y conteo de unidades. |
| `prefillSaleEdit29` | 4331–4371 | Rellena el formulario al editar (incluye receptor y observación). |
| `saveCashSale29` | 4374–4529 | Guarda: exige contexto + carrito + comprobante (solo en nueva); arma `detalles`; si receptor = COMPRADOR copia datos del comprador; RPC `guardarVentaContadoModulo` o `modificarVentaContadoModulo`; invalida cachés y recarga. |
| `readFileSales29` | 4531 | Lee adjuntos a base64, valida máx. 5 MB. |
| `updateSalesReceiverVisibility29` | 3801–3819 | Muestra/oculta los campos del receptor según COMPRADOR / OTRA_PERSONA. |

### 2.6 `sales.js` — detalle, trazabilidad y archivos

| Función | Líneas | Qué hace |
|---|---|---|
| `openSalesDetail29` | 4828–5030 | Modal Detalle: pide `getSalesDetailCached29`, pinta resumen + trazabilidad + productos + ajuste financiero + documentos + comprobante + evidencias. El botón por material `data-sales-cancel-item` abre anulación de material. |
| `salesSummaryCards29` | 2227–2241 | Tarjetas resumen: código, cliente, cuenta contrato, importe, tipo, clasificación, estado, abono, fecha. |
| `salesTraceability29` | 1783–1799 | **Trazabilidad y bono:** Venta efectuada por, Abono aprobado por, Programación efectuada por, Entrega realizada por, Bono del vendedor + observación de entrega. |
| `salesRecordTypeCode29T` / `salesRecordTypeBadge29T` / `salesRecordTypeNotice29T` | 1742–1770 | Clasificación COMERCIAL vs PRUEBA (pastilla y banner; archivada = “solo historial”). |
| `salesCancellationNotice29` | 1772–1781 | Banner “Venta anulada” con motivo y fecha. |
| `salesFinancialAdjustment29` | 4588–4654 | Importe original vs vigente vs anulado + alerta de regularización financiera si el abono aprobado ya no cuadra. |
| `salesItemStateBadge29` / `salesItemCancellationDetail29` | 4534–4586 | Estado Activo / Anulado por línea + motivo de anulación del material. |
| `renderApprovalDocuments29N` | 5073–5174 | Documentos de aprobación: Depósito al proveedor + Boleta al cliente (CARGADO / NO CARGADO). |
| `extractSalesDriveFileId29U` / `mimeTypeOfSalesUrl29U` / `salesDownloadName29U` | 2244–2290 | Utilidades de archivos: extrae ID de Drive, detecta PDF/imagen, construye nombre de descarga. |
| `openSalesFilePreview29U` + zoom | 2294–2366 | Visor de comprobante (PDF embebido o imagen con zoom 50%–400%, doble clic, rueda). |
| `salesSecureFileButtons29U` / `openSalesSecureFile29U` / `bindSalesSecureFileButtons29U` | 2368–2647 | Botones Ver / Descargar seguros: si es ID de Drive pide `obtenerArchivoVentaContadoModulo` (base64 → Blob); si es URL directa la abre. |
| `bindSalesModalClose29` | 5865–5893 | Cierra modales con `data-modal-close` y enlaza botones de archivo dentro del modal. |

### 2.7 `sales.js` — abono, entrega, anulaciones, exportar

| Función | Líneas | Qué hace |
|---|---|---|
| `renderPaymentValidationBody29` | 2666–2699 | Cuerpo del modal de abono: comprobante del cliente + 2 adjuntos obligatorios para aprobar (depósito al proveedor, boleta al cliente) + observación (obligatoria solo si se observa). |
| `openPaymentValidation29` | 5176–5197 | Abre validación al instante con la fila (sin RPC previo) + botones Aprobar / Observar. |
| `submitPayment29` | 5228–5418 | Valida reglas, lee adjuntos y llama a `confirmarAbonoVentaContadoModulo` u `observarAbonoVentaContadoModulo`; refresca optimistamente y recarga a los 700 ms. |
| `applyPaymentResultOptimistically29_` | 5199–5226 | Pinta el resultado sin esperar: aprobado → `ABONO_CONFIRMADO`/`POR_ENTREGAR` (y saca la fila de ABONOS); observado → `ABONO_OBSERVADO`. |
| `deliveryProviderOptions29` / `renderDeliveryProviderBlock29` / `deliveryProductsForProvider29` | 2701–2788 | Proveedores que participan en la venta (por precio) y filtrado de productos por proveedor. |
| `renderDeliveryClientData29` | 2790–2893 | Datos para coordinar: comprador, dirección de entrega, receptor autorizado (o aviso “venta legacy” sin receptor). |
| `renderDeliveryProductsBlock29` | 2895–2973 | Tarjetas de productos del proveedor (con marca “Material anulado · No entregar”). |
| `getDeliveryManagementForProvider29` | 2975–2985 | Gestión de entrega actual de ese proveedor. |
| `renderDeliveryStatusFields29` | 3012–3073 | Selector PENDIENTE / PROGRAMADA / OBSERVADA + campos dinámicos (fecha acordada, observación, sustento). Si ya está EN_RUTA/ENTREGADA avisa que eso solo se toca en Despacho. |
| `openDeliveryManagement29` | 5420–5493 | Modal Gestión de entrega: primero esqueleto con loader, luego detalle real (`ENTREGAS`) + botón Guardar gestión. |
| `saveDelivery29` | 5495–5630 | Guarda con `guardarGestionEntregaVentaContadoModulo`. Exige proveedor, abono confirmado, fecha si PROGRAMADA, observación + sustento si OBSERVADA. Bloquea ENTREGADA/EN_RUTA (solo Despacho). |
| `refreshDeliveryProviderContext29_` / `syncSalesDeliveryStatusFields29` / `bindSalesDeliveryStatus29` | 3075–3204 | Refrescan productos y campos al cambiar proveedor o estado. |
| `openCancelObservedSale29` | 5632–5694 | Anula **toda la venta** (`anularVentaContadoModulo`) con motivo obligatorio. Bloquea si ENTREGADA/ANULADA. Conserva todo como trazabilidad. |
| `openCancelSaleItem29` | 4656–4826 | Anula **un material** (`anularMaterialVentaContadoModulo`) con motivo + observación; actualiza total, invalida caché, reabre el detalle. |
| `openArchiveTestSale29T` | 5697–5706 | Archiva venta de prueba (`archivarVentaPruebaModulo`): no borra, la saca de bandejas activas. |
| `openReclassifySale29T` | 5708–5863 | Cambia clasificación COMERCIAL ↔ PRUEBA (`reclasificarVentaContadoModulo`) con motivo obligatorio. No cambia estado/abono/entrega. |
| `exportSalesCashXls` / `downloadSalesFile29` | 5896–5897 | Exporta con filtros actuales (`exportarVentasContadoModulo`) y descarga el `.xls`. |
| `formatSalesMoney` | 5898 | Formato `S/ 1,234.56` (es-PE, 2 decimales). |

### 2.8 `sales-dashboard.js` — mapa completo

| Función | Líneas | Qué hace |
|---|---|---|
| `SD360_STATE` | 10–23 | Estado: `rows`, `filters` (texto, estadoAbono, estadoEntrega, oficina, fechas), `charts`, `loadedAt`. |
| `openSalesDashboardWorkspace` | 28–47 | Entrada: resetea filtros, pone título, pinta estructura y carga datos. |
| `refreshSalesDashboardWorkspace` | 52–55 | Botón Actualizar global. |
| `renderSalesDashboardFrame` | 60–112 | Estructura: toolbar (Actualizar/Exportar), KPIs, filtros, 3 gráficos, tabla Detalle (Código, Fecha, Cliente, Oficina, Vendido por, Monto, Abono, Entrega). |
| `bindSalesDashboardControls` | 117–165 | Filtros combinables que re-pintan al instante (buscador con debounce 300 ms) + Limpiar + Exportar. |
| `loadSalesDashboardData` | 170–190 | RPC `listarVentasContadoModulo` (sin filtros; filtra en navegador), normaliza filas, llena selects y pinta. |
| `fillSalesDashboardFilterOptions` / `fillSalesDashboardSelect` | 195–221 | Selects de Abono/Entrega/Oficina con valores reales + valores canónicos fijos. |
| `sd360NormalizeRow` | 227–249 | Normaliza demo vs producción (nombres de cliente, montos, estados) para no dejar celdas vacías. |
| `applySalesDashboardFilters` | 254–278 | Filtra en navegador por abono, entrega, oficina, rango de fechas y texto (código, SAP, cliente, documento, distrito, oficina). |
| `renderSalesDashboardResults` | 283–288 | Orquesta: KPIs + gráficos + tabla. |
| `renderSalesDashboardKpis` | 290–322 | 7 KPIs: Ventas, Monto total, Ticket promedio, Abonos confirmados %, Entregas completadas %, Monto completado, Pendientes. |
| `sd360FitKpiNumbers` | 328–347 | Encoge la cifra (26→12 px) hasta que quepa en una línea; se re-ejecuta al redimensionar. |
| `renderSalesDashboardCharts` | 349–383 | Agrupa por día (últimos 14) y por estado; dibuja barra + 2 doughnuts con Chart.js. |
| `sd360DrawChart` | 385–400 | Crea/destruye gráficos (evita duplicados). |
| `renderSalesDashboardTable` | 402–432 | Tabla con las primeras 200 filas + contador (“N ventas con los filtros actuales”); motivo de anulación como tooltip. |
| `exportSalesDashboardCsv` | 437–466 | Exporta filtradas a `dashboard-ventas-360.csv` (separador `;`, BOM para Excel). |
| `sd360Money` / `sd360PrettyStatus` / `sd360StatusChip` / `sd360CsvCell` / `sd360LoadingHtml` | 470–503 | Utilidades: moneda S/, “ABONO_CONFIRMADO”→“Abono Confirmado”, chip de color, celda CSV con comillas, skeleton de carga. |

## 3) Detalle — flujos clave paso a paso

### 3.1 Abrir el módulo y ver la primera bandeja (`sales.js` 211–258, 388–528)

1. `openCashSalesWorkspace` (211) resetea vista a REGISTRADAS y filtros base (5–6, 226–236).
2. Si el contexto tiene menos de 2 min lo reutiliza (212–220); si no, `loadCashSalesContext` (388) pide `obtenerContextoVentasContadoModulo` en modo ligero con `incluirListadoInicial:true`.
3. El backend devuelve `permisos`, `estados`, `estadosAbono`, `vistaInicial`, `revisionDatos` y opcionalmente `listadoInicial`.
4. Se elige la vista con `ctx.vistaInicial` o `salesFirstAllowedView29M_` (437–442): REGISTRADAS si `puedeListar`, si no ABONOS, si no ENTREGAS.
5. Se pintan pestañas (`renderSalesTaskTabs`, 448), filtros (`renderSalesListFrame`, 449) y el botón Nueva venta se oculta si no hay `puedeRegistrar` (451–458).
6. Si vino `listadoInicial` se pinta directo con `renderSalesListResult` (495–503); si no, `loadSalesList` (507–510).

### 3.2 Cambiar de pestaña con caché stale-while-revalidate (`sales.js` 1311–1327, 1180–1309, 775–813)

1. `cambiarBandejaVentasPaso29G_` (1311) guarda los filtros actuales (`guardarFiltrosBandejaActualPaso29G_`, 746) y carga los de la nueva vista (`filtrosBaseBandejaVentasPaso29G_`, 714).
2. Si la vista es DESPACHO, va a `renderSalesDispatchFrame29D_` (1334) y termina ahí.
3. `cargarBandejaSiCambioPaso29G_` (1180) calcula la clave (731) y busca en `viewCache`.
4. **Con caché:** la muestra al instante (`mostrarBandejaCacheadaPaso29G_`, 805) y revalida con `verificarRevisionVentasPaso29G_` (775, RPC `obtenerEstadoSincronizacionMotor`); si la revisión cambió, `loadSalesList` en silencioso.
5. **Sin caché y filtros en base:** intenta el batch `runSalesViewsPrefetchPaso30B_` (1023, RPC `precargarBandejasVentasContadoModulo`) y pinta lo precargado; si falla, `loadSalesList` forzado.
6. Todo viaje lleva `listRequestToken` (1399) y `viewsPrefetchToken` (1086): la respuesta vieja se descarta si el usuario ya cambió de vista.

### 3.3 Filtros y tabla, incluida columna “Vendido por” (`sales.js` 1352–1393, 1801–1812, 1902–1992)

1. `renderSalesListFrame` (1352) arma la barra: Buscar (código, cuenta contrato o cliente), Estado venta (desde `context.estados`), Abono (desde `context.estadosAbono`), Registros COMERCIAL/PRUEBA (solo `puedeGestionarPruebas`, 1359–1362), Desde/Hasta, Aplicar, Exportar (solo `puedeExportar`, 1364).
2. Aplicar (1377) → `collectSalesFilters` (1384) → página 1 → `loadSalesList` forzado.
3. `renderSalesTable29` (1801) pinta por fila: código + pastilla de prueba, fecha, tipo, cuenta contrato, nombre cliente, **Vendido por = `item.nombreUsuario`**, importe (`importeVisible` o `totalVenta`), pastilla de abono (1994), pastilla de estado (2000; en ENTREGAS muestra `estadoEntrega`, 1805–1810), Opciones.
4. `renderSalesRowActions29` (1902) mete todos los botones **en una sola línea** vía `wrapRows` (1906–1917, un solo `div.sales29-actions-row--main`):
   - `data-sales-view-detail` → `openSalesDetail29` (Ver, todas las vistas).
   - `data-sales-edit` → `openEditCashSale29` (Modificar, REGISTRADAS si editable).
   - `data-sales-pay` → `openPaymentValidation29` (Validar abono, ABONOS; se deshabilita si el alcance es PROVEEDOR/ASIGNADOS y la venta es de otro proveedor, 1922–1934).
   - `data-sales-delivery` → `openDeliveryManagement29` (Gestionar, ENTREGAS).
   - `data-sales-cancel-observed` → `openCancelObservedSale29` (Anular, REGISTRADAS si no ENTREGADA/ANULADA; en ABONOS también si no ENTREGADA/ANULADA).
   - `data-sales-archive-test` → `openArchiveTestSale29T` (Archivar prueba, solo `puedeArchivarPrueba`).
   - `data-sales-reclassify` → `openReclassifySale29T` (Clasificación, solo `puedeReclasificarTipoRegistro`).
   - `data-sales-cancel-item` (solo dentro del Detalle, 4925) → `openCancelSaleItem29` (Anular material).
5. Los botones Ver/Editar/Delivery hacen **precarga al pasar el mouse** (`mouseenter once`, 1814–1886) para que el modal abra instantáneo.

### 3.4 Nueva venta: carrito + ofertas + guardado (`sales.js` 3214–3319, 3519–3608, 3836–3936, 4175–4329, 4374–4529)

1. `openNewCashSaleModal` (3214) exige `puedeRegistrar`, abre modal de carga y espera `ensureSalesFormContext29W_` (128, contexto completo).
2. `renderSaleForm29` (3519) pinta: clasificación (solo si `puedeGestionarPruebas`, 3524–3526), comprador (nombre/DNI/teléfono/cuenta/dirección/referencia obligatorios salvo cuenta), receptor (COMPRADOR u OTRA_PERSONA, 3801), contexto comercial (negocio/oficina/grupo, 3556), catálogo oculto hasta completar contexto (3561–3569, 3691).
3. Al completar negocio+oficina+grupo, `loadOffers29` (3836) pide `obtenerOpcionesFormularioVentaContadoModulo` (límite 1000) y cachea 5 min por contexto (3855–3869).
4. `filterOffersClient29` (3980) filtra en navegador por producto/tipo/subtipo + texto (código, marca, proveedor, combo) respetando alcance (`salesOfferScope29_`/`salesOfferInScope29_`, 3939–3978).
5. `data-add-offer` → `addOfferToCart29` (4175); `renderCart29` (4176) con `data-cart-minus/plus/remove`, total y unidades.
6. `saveCashSale29` (4374): exige contexto + carrito + comprobante (en nueva); si receptor es COMPRADOR copia sus datos (4458–4464); envía `detalles` con `idDetallePrecio/idMaterial/cantidad` + comprobante base64 (máx. 5 MB, 4531); RPC guardar o modificar; invalida `detailCache` + `viewCache` (4480–4485, 4493) y recarga el contexto en silencioso (4494).

### 3.5 Detalle de venta + trazabilidad (`sales.js` 4828–5030, 1783–1799, 2227–2241)

1. `openSalesDetail29` (4828) abre modal con loader y pide `getSalesDetailCached29(id, false, activeView)` (2153, RPC `obtenerDetalleVentaContadoModulo`, caché 60 s por vista).
2. Pinta (4895–4992): aviso de prueba (1765), aviso de anulación (1772), tarjetas resumen (2227), **trazabilidad** (1783: quién vendió / aprobó abono / programó / entregó + bono en S/ + observación de entrega), tabla de productos con estado de material (4534) y estado de entrega por material (2059; anulados = “No aplica”), ajuste financiero (4588), documentos de aprobación (5073), comprobante del cliente + observación de abono + evidencias de entrega.
3. Archivos con `salesSecureFileButtons29U` (2368): Drive → RPC `obtenerArchivoVentaContadoModulo` (2455); URL directa → visor con zoom (2306).

### 3.6 Aprobar / observar abono (`sales.js` 5176–5197, 2666–2699, 5228–5418, 5199–5226)

1. `openPaymentValidation29` (5176) abre con la **fila ya cargada** (sin RPC previo) + `renderPaymentValidationBody29` (2666).
2. Reglas (5228+): observar exige observación; aprobar exige **los 2 adjuntos** (depósito al proveedor + boleta al cliente, 5265–5281, 5 MB c/u).
3. RPC `confirmarAbonoVentaContadoModulo` (aprueba → venta a `POR_ENTREGAR`) u `observarAbonoVentaContadoModulo` (observa, sin adjuntos).
4. `applyPaymentResultOptimistically29_` (5199) actualiza la tabla sin esperar (en ABONOS la aprobada desaparece de la lista); a los 700 ms `loadSalesList` reconcilia con el servidor (5365).

### 3.7 Programar entrega (`sales.js` 5420–5493, 3092–3149, 3012–3073, 5495–5630)

1. `openDeliveryManagement29` (5420) abre esqueleto con loader y pide detalle en vista ENTREGAS; al llegar pinta `renderDeliveryManagementBody29` (3092): datos del cliente/receptor (2790), productos del proveedor (2895, filtrados por `deliveryProductsForProvider29`, 2778), estado actual (3012).
2. Proveedor: si el usuario tiene uno se fija (3099–3106); si hay varios se elige en `salesDeliveryProvider` (2764–2775).
3. `renderDeliveryStatusFields29` (3012) solo ofrece PENDIENTE/PROGRAMADA/OBSERVADA. PROGRAMADA pide fecha acordada; OBSERVADA pide observación + sustento. Si ya está EN_RUTA/ENTREGADA muestra aviso “solo en Despacho” (3027–3029).
4. `saveDelivery29` (5495): bloquea sin proveedor, sin abono confirmado (5507) o si se intenta ENTREGADA/EN_RUTA (5512); exige fecha/observación/sustento según estado; RPC `guardarGestionEntregaVentaContadoModulo` con evidencias; invalida cachés y recarga.

### 3.8 Anular, archivar, reclasificar, exportar, paginar (`sales.js` 5632–5863, 4656–4826, 5896–5898, 3206–3212)

1. **Anular venta** `openCancelObservedSale29` (5632): motivo obligatorio → `anularVentaContadoModulo`; pinta ANULADA optimistamente (5671–5678) y recarga a los 500 ms. Bloqueada si ENTREGADA/ANULADA (5637).
2. **Anular material** `openCancelSaleItem29` (4656): motivo + observación → `anularMaterialVentaContadoModulo`; actualiza total de la fila (4773–4786), invalida detalle, reabre el detalle a los 180 ms y recarga la lista a los 600 ms.
3. **Archivar prueba** (5697): `archivarVentaPruebaModulo`, la saca de bandejas activas (conserva historial).
4. **Reclasificar** (5708): `reclasificarVentaContadoModulo` COMERCIAL↔PRUEBA con motivo; no toca estado/abono/entrega.
5. **Exportar** (5896): `exportarVentasContadoModulo` con **filtros actuales** → descarga `.xls` (5897).
6. **Paginar** (3206): Anterior/Siguiente cambian `filters.pagina` y recargan; el total viene de `pagination` del backend (1719–1725).

### 3.9 Dashboard: KPIs, filtros, gráficos, tabla, exportar (`sales-dashboard.js`)

1. `openSalesDashboardWorkspace` (28) resetea filtros y `loadSalesDashboardData` (170) trae **todo** con `listarVentasContadoModulo` (sin filtros de servidor).
2. `sd360NormalizeRow` (227) unifica demo/producción; `fillSalesDashboardFilterOptions` (195) llena Abono/Entrega/Oficina.
3. Cada cambio (`bindSalesDashboardControls`, 117, buscador con 300 ms) → `applySalesDashboardFilters` (254: abono + entrega + oficina + fechas + texto) → `renderSalesDashboardResults` (283).
4. `renderSalesDashboardKpis` (290): Ventas, Monto total, Ticket promedio, % Abonos confirmados, % Entregas completadas, Monto completado (solo ENTREGADA), Pendientes (abono no confirmado o no entregada). `sd360FitKpiNumbers` (328) ajusta el tamaño.
5. `renderSalesDashboardCharts` (349): ventas por día (barra, últimos 14 días) + Abono y Entrega (doughnuts) con Chart.js; `sd360DrawChart` (385) destruye el anterior.
6. `renderSalesDashboardTable` (402): columnas Código/Fecha/Cliente/Oficina/**Vendido por**/Monto/Abono/Entrega, máx. 200 filas + contador + tooltip de motivo de anulación.
7. `exportSalesDashboardCsv` (437): las **filtradas** a `dashboard-ventas-360.csv` con `;` y BOM (abre bien en Excel).

## 4) Conexiones

- **Backend (RPC vía `secureRpc`, módulo `VENTAS_CONTADO`):**
  - `obtenerContextoVentasContadoModulo` (ligero 388 / completo 128) — permisos, `estados`, `estadosAbono`, oficinas/grupos/negocios, `listadoInicial`, `revisionDatos`.
  - `listarVentasContadoModulo` (1395, y dashboard 174) — bandejas + paginación.
  - `precargarBandejasVentasContadoModulo` (1093) — batch de bandejas + detalles calientes.
  - `precalentarDetallesVentasContadoModulo` (1641) — warmup de 5 detalles.
  - `obtenerDetalleVentaContadoModulo` (2201) — detalle por vista.
  - `obtenerOpcionesFormularioVentaContadoModulo` (3887) — catálogo de ofertas.
  - `guardarVentaContadoModulo` / `modificarVentaContadoModulo` (4469) — crear/editar.
  - `confirmarAbonoVentaContadoModulo` / `observarAbonoVentaContadoModulo` (5283) — validación.
  - `guardarGestionEntregaVentaContadoModulo` (5594) — programación.
  - `anularVentaContadoModulo` (5668), `anularMaterialVentaContadoModulo` (4762), `archivarVentaPruebaModulo` (5705), `reclasificarVentaContadoModulo` (5825).
  - `exportarVentasContadoModulo` (5896) — Excel.
  - `obtenerArchivoVentaContadoModulo` (2483) — archivos seguros de Drive.
  - `obtenerEstadoSincronizacionMotor` (788) + `refrescarIndiceVentasContadoModulo` (1492) — revisión e índice.
- **Frontend:**
  - `dispatch.js` — DESPACHO embebido vía `openDispatchWorkspace(module, {embedded:true})` (1335) y `refreshDispatchWorkspace` (362).
  - Utilidades globales: `secureRpc`, `openModal`/`closeModal`, `toast`, `escapeHtml`, `loadingHtml`, `on`, `setActiveView`, `setModuleHeading`, `hasActivePermission`/`activePermissionScope`, `APP_STATE`, `markSync`, `debounce`.
  - `sales-dashboard.js` reutiliza `listarVentasContadoModulo` y la línea visual (`sales-card`, `mp-table`), más `Chart.js` si existe (349–350).
- **Permisos que gobiernan todo:** `puedeListar`, `puedeValidarAbono`, `puedeGestionarEntrega`, `puedeRegistrar`, `puedeEditar`, `puedeExportar`, `puedeGestionarPruebas` (contexto) + `puedeModificar`, `puedeAnularObservada`, `puedeArchivarPrueba`, `puedeReclasificarTipoRegistro`, `puedeAnularMaterial` (por fila/detalle) + alcance de proveedor (`activePermissionScope` PROVEEDOR/ASIGNADOS, 1922–1931) + rol `DESPACHADOR` / permisos `PROGRAMAR_ENTREGA`/`CONFIRMAR_ENTREGA` para Despacho.

## 5) Si quieres cambiar X, toca Y

1. **Agregar una columna a la tabla (p. ej. “Oficina”):** toca `renderSalesTable29` (`sales.js` 1801–1812: añade el `<th>` y el `<td>` con `item.xxx`). Si la columna depende de la vista (como ENTREGAS que cambia la columna de estado en 1805–1810), añade tu condición ahí. En el dashboard es `renderSalesDashboardFrame` (60–112, `<thead>`) + `renderSalesDashboardTable` (402–432, `<tr>`) + `sd360NormalizeRow` (227–249) si el campo viene con otro nombre en demo/producción.
2. **Agregar un nuevo estado de venta o de abono:** los combos se llenan solos desde `context.estados` / `context.estadosAbono` (`renderSalesListFrame`, 1356–1368), así que el cambio real está en el backend. En frontend solo añade la etiqueta y color en `salesStatusBadge29` (2000–2026) o `salesPaymentBadge29` (1994–1999), y en el dashboard en `fillSalesDashboardFilterOptions` (195–210, listas fijas) + `sd360StatusChip` (491–498, colores).
3. **Agregar un nuevo botón por fila (p. ej. “Duplicar”):** añade el `<button data-sales-duplicate="id">` en `renderSalesRowActions29` (`sales.js` 1902–1992, dentro de `wrapRows`), enlázalo junto a los demás en `renderSalesTable29` (1834–1899: `querySelectorAll('[data-sales-duplicate]')` + listener), y crea tu `openDuplicateSale29` siguiendo el molde de `openEditCashSale29` (3322) con tokens `prepareSalesModal29W_`/`isSalesModalCurrent29W_` (49–83).
4. **Cambiar reglas de aprobar/observar (p. ej. pedir un tercer documento):** toca `renderPaymentValidationBody29` (2666–2699, el HTML de adjuntos), `submitPayment29` (5228–5418, validaciones 5265–5281 y lectura de archivos 5389–5407) y el payload `comprobanteDepositoProveedor`/`boletaVentaCliente`. El resultado optimista está en `applyPaymentResultOptimistically29_` (5199–5226).
5. **Cambiar qué KPI o gráfico muestra el dashboard (p. ej. “ventas por oficina”):** KPIs en `renderSalesDashboardKpis` (`sales-dashboard.js` 290–322, añade tu tarjeta al arreglo `cards`); gráficos en `renderSalesDashboardCharts` (349–383, agrupa y llama a `sd360DrawChart` 385–400); filtros nuevos en `SD360_STATE.filters` (13–20) + `renderSalesDashboardFrame` (91–100) + `bindSalesDashboardControls` (117–165) + `applySalesDashboardFilters` (254–278) + `fillSalesDashboardFilterOptions` (195–210). Recuerda que el CSV (`exportSalesDashboardCsv`, 437–466) usa lo filtrado: añade la columna al `header` y al `map`.
