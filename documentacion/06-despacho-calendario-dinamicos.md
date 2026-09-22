# 06 — Despacho, Calendario de Entregas y Módulos Dinámicos

> Archivos: `js/modules/dispatch.js` (608 líneas) · `js/modules/delivery-calendar.js` (347 líneas) · `js/modules/dynamic.js` (340 líneas). Manual para el dueño del proyecto, en español claro y sin tecnicismos innecesarios.

---

## 1) Para qué sirve

### dispatch.js — Bandeja de Despacho (`DISP360`)
Es la pantalla de trabajo del personal de reparto / despacho. Solo muestra las ventas que están **PROGRAMADA** o **EN_RUTA** y que son **de tu propio proveedor**.

- **Bandeja:** tabla con Código, Programada (fecha), Cliente, Dirección, Oficina, Vendido por, Estado y Acciones.
- **KPIs arriba:** cuántas Programadas (pendientes de tomar), cuántas En ruta (pendientes de entregar) y Total en despacho.
- **Filtros:** buscador (código, cliente o dirección) + Estado (Todos/Programada/En ruta) + Oficina (se llena sola según los datos).
- **Tomar despacho:** pasa la venta de `PROGRAMADA → EN_RUTA` (botón camión `local_shipping`).
- **Confirmar entrega:** pasa la venta de `EN_RUTA → ENTREGADA` y **exige evidencia** (al menos un adjunto nuevo o ya registrado: boleta, foto de recepción o acta; PDF/PNG/JPG/WEBP, máx. 5 MB).
- **Detalle solo lectura:** botón ojo `visibility` con cliente, dirección, oficina, vendedor, fecha, estado, receptor, monto y evidencias. No edita nada de ventas.
- **Seguridad:** solo quien puede gestionar despachos ve los botones de acción (`disp360CanManage`); si la venta es de otro proveedor, los botones salen deshabilitados (`bloqueo por proveedor`).
- **Dos modos:**
  - **Embebido en Ventas:** pestaña DESPACHO dentro de Ventas Contado, pinta dentro de `#salesListRegion`, versión compacta (`is-embedded`), solo botón Exportar.
  - **Standalone (histórico):** módulo propio OPERACIONES → Despacho de Entregas, pinta en `#dynamicModuleView`, con botones Actualizar + Exportar.

### delivery-calendar.js — Calendario de Entregas (`DC360`)
Es un calendario mensual **de solo lectura** para ver de un vistazo qué entregas tocan cada día. No modifica ningún registro.

- **Calendario:** grilla Lun–Dom del mes actual, con hasta 3 “píldoras” (chips) por día con el código de venta + `+N más` si hay más de 3. Colores: celeste = PROGRAMADA, amarillo = EN_RUTA/POR_ENTREGAR, verde = ENTREGADA, gris = otra.
- **Tarjetas por día:** al hacer clic en un día, al lado derecho aparecen tarjetas con código, cliente, distrito, dirección, oficina, receptor, **Vendido por** (nombre del vendedor) y estado. Cada tarjeta tiene botón ojo para ver la venta completa.
- **Filtros:** buscador (código, cliente o dirección) + Estado + Oficina (ambos se llenan solos según los datos).
- **Navegación:** flechas mes anterior/siguiente, botón Hoy, etiqueta “Enero 2026…” y contador “N entregas con filtros”.

### dynamic.js — Módulos Dinámicos Genéricos (`DYNAMIC_STATE`)
Es el “molde” que sirve para cualquier módulo simple creado por metadatos (tablas de apoyo, catálogos, registros administrativos), sin programar una pantalla nueva cada vez.

- **Listar:** tabla automática con las columnas que la definición diga (`visibleTabla`), buscador, filtro Estado (Todos/Activo/Inactivo) y paginación (Anterior/Siguiente, 50 por página por defecto).
- **Crear / Editar:** botón “Nuevo registro” + botón lápiz `edit` por fila. Abre un panel lateral con el formulario armado según la definición (texto, número, fecha, correo, teléfono, textarea, checkbox, select de catálogo). Respeta obligatorios y solo-editables.
- **Estado:** botón `toggle_on` por fila para pasar ACTIVO ↔ INACTIVO con un diálogo de confirmación.
- **Botones estilo sistema:** todos usan `table-button has-tooltip` con globo de ayuda (“Editar”, “Cambiar estado”, “Guardar”, etc.).
- **Permisos:** todo pasa por `dynamicPermission` (CREAR / EDITAR / CAMBIAR_ESTADO o ADMINISTRAR). Si estás en “vista simulada de rol”, bloquea con aviso de solo lectura.

---

## 2) Mapa

### Mapa dispatch.js

| Función | Líneas | Qué hace |
|---|---|---|
| `DISP360_STATE` | 13–19 | Memoria de la bandeja: módulo, filas, proveedor propio, filtros y si es embebido. |
| `openDispatchWorkspace(module, options)` | 27–43 | Entrada principal. Resetea filtros, detecta proveedor, elige modo embebido vs standalone y carga datos. |
| `refreshDispatchWorkspace(silent)` | 48–51 | Recarga la bandeja si la tabla existe (la usa el botón Actualizar global). |
| `disp360CurrentProvider()` | 58–66 | Lee `APP_STATE.context.usuario.idProveedor` para saber tu proveedor propio. |
| `disp360RowBlocked29_(row)` | 73–89 | Decide si la fila es de otro proveedor (alcance PROVEEDOR/ASIGNADOS). Si sí, bloquea acciones. |
| `disp360CanManage()` | 96–113 | Dice si puedes actuar: permiso `VENTAS_CONTADO/PROGRAMAR_ENTREGA` o `CONFIRMAR_ENTREGA`, o `DESPACHO/GESTIONAR_DESPACHO`, o rol `DESPACHADOR`. |
| `renderDispatchFrame()` | 120–168 | Dibuja KPIs, filtros y tabla. Cambia botones y estilos según embebido o standalone. |
| `bindDispatchControls()` | 173–194 | Conecta buscador (con espera 300 ms), selects Estado/Oficina, Actualizar y Exportar. |
| `loadDispatchData(silent)` | 200–220 | Pide al servidor `listarDespachoModulo`, normaliza filas y repinta. Muestra “Cargando…” o error. |
| `disp360NormalizeRow(row)` | 226–253 | Unifica nombres distintos (demo/producción) en una fila estándar: cliente, dirección, oficina, Vendido por, estado, fecha, proveedor, evidencias. |
| `fillDispatchFilterOptions()` | 255–267 | Llena el filtro Oficina con las oficinas que llegaron en los datos. |
| `disp360FilteredRows()` | 269–282 | Aplica proveedor propio + Estado + Oficina + texto localmente. |
| `renderDispatchResults()` | 287–350 | Pinta KPIs, contador, alcance y tabla. Dibuja botones Ver / Tomar / Confirmar según estado y permisos. |
| `disp360TakeDelivery(idVenta)` | 355–399 | Modal “Tomar despacho” y RPC `guardarGestionEntregaVentaContadoModulo` con `EN_RUTA`. |
| `disp360OpenConfirmDelivery(idVenta)` | 405–429 | Modal “Confirmar entrega” con observación + 3 campos de archivo. |
| `disp360ConfirmDelivery(idVenta)` | 431–492 | Lee archivos, valida que haya al menos 1 evidencia y guarda `ENTREGADA` por RPC. |
| `disp360ShowDetail(idVenta)` | 497–525 | Modal solo lectura con todos los datos + lista de evidencias. |
| `disp360BindModalClose()` | 527–533 | Conecta todos los botones Cerrar/Entendido del modal. |
| `exportDispatchCsv()` | 538–565 | Exporta las filas filtradas a `despacho-360.csv` (separado por `;`, con BOM para Excel). |
| `disp360StatusTone / disp360StatusChip` | 569–580 | Color y pastilla de estado (`ACTIVO`/`EN_REVISION`/`RECHAZADO`). |
| `disp360Money` | 582–588 | Formato `S/ 1,234.00` (es-PE). |
| `disp360ReadFile(file)` | 590–603 | Lee archivo a base64, rechaza si pasa 5 MB. |
| `disp360CsvCell(value)` | 605–608 | Escapa celdas CSV (comillas y `;`). |

### Mapa delivery-calendar.js

| Función | Líneas | Qué hace |
|---|---|---|
| `DC360_STATE` | 10–17 | Memoria: módulo, filas, año/mes, día seleccionado, filtros. |
| `DC360_MONTHS / DC360_WEEKDAYS` | 19–20 | Nombres de meses y Lun–Dom para la cabecera. |
| `openDeliveryCalendarWorkspace(module)` | 25–41 | Entrada desde app-core. Fija mes actual, selecciona hoy, pone título y carga datos. |
| `refreshDeliveryCalendarWorkspace(silent)` | 46–49 | Recarga si el calendario está visible (botón global Actualizar). |
| `renderDeliveryCalendarFrame()` | 54–113 | Dibuja buscador, filtros, barra de mes, grilla y panel del día. Incluye estilos propios. |
| `bindDeliveryCalendarControls()` | 118–151 | Conecta buscador, selects, flechas de mes, Hoy y Actualizar. |
| `dc360MoveMonth(delta)` | 153–158 | Avanza/retrocede un mes y repinta. |
| `dc360DayKey(year, month, day)` | 160–163 | Clave `AAAA-MM-DD` para comparar días. |
| `loadDeliveryCalendarData(silent)` | 168–184 | Pide `listarVentasContadoModulo`, normaliza y filtra las que tienen fecha. |
| `dc360NormalizeDelivery(row)` | 189–209 | Unifica cada venta en entrega con fecha, cliente, dirección, oficina, Vendido por (`nombreUsuario`), estado y receptor. |
| `fillDeliveryCalendarFilterOptions()` | 211–221 | Llena Estado (más 6 fijos) y Oficina según datos. |
| `dc360FillSelect(id, values, current)` | 223–230 | Rellena un `<select>` manteniendo la selección actual. |
| `dc360FilteredDeliveries()` | 232–244 | Aplica Estado + Oficina + texto localmente. |
| `dc360ChipTone(estado)` | 246–252 | Color de la píldora del día según estado. |
| `renderDeliveryCalendarResults()` | 257–305 | Pinta etiqueta de mes, contador, grilla con huecos de inicio de mes, marca hoy/seleccionado y delega el día. |
| `renderDeliveryCalendarDay(items)` | 307–339 | Pinta tarjetas del día seleccionado (con “Vendido por” y botón Ver venta). Mensaje amable si no hay. |
| `dc360StatusTone(estado)` | 341–347 | Color de pastilla `mp-status` para la tarjeta. |

### Mapa dynamic.js

| Función | Líneas | Qué hace |
|---|---|---|
| `DYNAMIC_STATE` | 1–8 | Memoria: módulo, definición, filas, paginación, registro actual, filtros (texto, estado, página, tamaño). |
| `openDynamicModule(module)` | 13–28 | Entrada. Resetea filtros (tamaño desde `APP_STATE.context.interfaz.pageSize` o 50), pone título y carga. |
| `dynamicPermission(resource)` | 34–39 | Verifica permiso del módulo (`recurso` o `ADMINISTRAR`). |
| `ensureWritableDynamicView()` | 41–51 | Bloquea escritura si hay vista simulada de rol activa. |
| `renderDynamicModuleFrame()` | 53–89 | Dibuja botón Nuevo (si CREAR), buscador, filtro Estado, botón Actualizar, región de datos y paginación. |
| `refreshDynamicModule(silent)` | 94–115 | Pide `listarRegistrosModuloDinamico`, guarda definición/filas/paginación y repinta. |
| `renderDynamicData()` | 120–177 | Arma columnas desde `definicion.campos` (`visibleTabla`) + columna Acciones con `table-button has-tooltip` (Editar / Cambiar estado). |
| `renderDynamicCell(field, value)` | 182–191 | Pinta celda: `—` si vacío, Sí/No para checkbox, pastilla para estado, fecha es-PE o texto. |
| `renderDynamicPagination()` | 196–205 | Texto “Mostrando página X de Y · N registros” + Anterior/Siguiente. |
| `loadDynamicRecordForEdit(id)` | 210–219 | Pide `obtenerRegistroModuloDinamico` y abre el editor. |
| `openDynamicRecordEditor(record)` | 224–250 | Panel lateral Nuevo/Editar con formulario según `visibleFormulario`, verifica permiso CREAR/EDITAR. |
| `populateDynamicCatalogFields(record)` | 255–272 | Llena selects de catálogo vía `listarValoresCatalogoModuloDinamico`. |
| `dynamicFieldHtml(field, value)` | 277–290 | Genera HTML por tipo: TEXTAREA, CHECKBOX, SELECT (catálogo) o input (number/date/datetime/email/tel/text). |
| `saveDynamicRecord()` | 295–315 | Valida, junta datos (ignora no-editables), guarda con `guardarRegistroModuloDinamico` y recarga. |
| `openDynamicStatusDialog(id)` | 320–340 | Modal ACTIVO/INACTIVO y guarda con `cambiarEstadoRegistroModuloDinamico`. |

---

## 3) Detalle

### Flujo A — Ver la bandeja de despacho (dispatch.js:27–43 → 120–168 → 200–220 → 287–350)
1. `openDispatchWorkspace` (27–43): guarda el módulo, lee tu proveedor (`disp360CurrentProvider`, 58–66), resetea filtros a `TODOS`, marca `embedded` si viene de Ventas.
2. Si **no** es embebido, cambia la vista a `dynamicModuleView` y pone encabezado OPERACIONES / Despacho (33–39). Si es embebido, pinta dentro de `#salesListRegion` sin tocar el encabezado (121–123).
3. `renderDispatchFrame` (120–168): dibuja toolbar (Exportar, y Actualizar solo en standalone, 126–128), KPIs vacíos, filtros y tabla vacía con cabecera Código/Programada/Cliente/Dirección/Oficina/Vendido por/Estado/Acciones (163).
4. `loadDispatchData` (200–220): muestra “Cargando despachos…”, llama `secureRpc("listarDespachoModulo", [], "VENTAS_CONTADO")` (205). El servidor ya devuelve solo PROGRAMADA y EN_RUTA propias.
5. Cada fila pasa por `disp360NormalizeRow` (226–253): junta nombres/apellidos, une dirección+distrito, prioriza `gestionEntrega.estadoEntrega`, corta la fecha en `AAAA-MM-DD` (242) y junta evidencias.
6. `fillDispatchFilterOptions` (255–267) llena Oficina; `renderDispatchResults` (287–350) calcula Programadas/En ruta/Total (295–296), pinta alcance “Solo ventas PROGRAMADA y EN_RUTA de tu proveedor” (304–307) y la tabla o el mensaje “Sin despachos…” (312–315).

### Flujo B — Filtrar (dispatch.js:173–194 → 269–282)
1. `bindDispatchControls` (173–194): buscador con retardo 300 ms (176–180), selects Estado/Oficina (181–189).
2. `disp360FilteredRows` (269–282): si tienes proveedor y la fila trae otro `idProveedor`, se oculta (273); luego Estado (274), Oficina (275) y texto en código/cliente/dirección/distrito/oficina (276–279).
3. `renderDispatchResults` repinta KPIs y tabla con lo filtrado; `exportDispatchCsv` (538–565) exporta exactamente esas filas filtradas.

### Flujo C — Tomar despacho PROGRAMADA → EN_RUTA (dispatch.js:323–326 → 355–399)
1. En `renderDispatchResults` (323–326) solo si `canManage` y estado es `PROGRAMADA` aparece el botón camión. Si la fila es de otro proveedor, sale `disabled` con globo “Solo el proveedor de esta venta puede gestionarla” (320–322).
2. `disp360TakeDelivery` (355–399): valida que siga en PROGRAMADA (357–360), abre modal con cliente y fecha (361–369).
3. Al confirmar (372–398): deshabilita el botón con icono `progress_activity` (373–377), llama `guardarGestionEntregaVentaContadoModulo` con `{ idVenta, idProveedor, estadoEntrega:"EN_RUTA", detalleObservacion, fechaProgramadaEntrega, evidencias:[] }` (378–385).
4. Éxito: cierra modal, toast “Despacho en ruta” y recarga silenciosa `loadDispatchData(true)` (386–389). Error: toast de error y reactiva el botón (391–397).

### Flujo D — Confirmar entrega EN_RUTA → ENTREGADA con evidencias (dispatch.js:327–330 → 405–492)
1. Botón `task_alt` solo si `canManage` y estado `EN_RUTA` (327–330), con mismo bloqueo por proveedor.
2. `disp360OpenConfirmDelivery` (405–429): valida EN_RUTA (407–410), abre modal con observación + 3 archivos: Boleta / Evidencia recepción / Acta u otro (414–418) y nota “al menos un sustento… máx. 5 MB” (420).
3. `disp360ConfirmDelivery` (431–492): lee los 3 inputs en cadena con `disp360ReadFile` (443–454, valida 5 MB en 591–596 y convierte a base64 en 597–601), les asigna tipo `BOLETA_ENTREGA` / `EVIDENCIA_RECEPCION` / `OTRO` (437–441).
4. Filtra evidencias ya registradas que no sean `SUSTENTO_OBSERVACION` (457–459). Si no hay nuevas ni previas, toast “Evidencia requerida” y se detiene (460–463).
5. Guarda por RPC con `estadoEntrega:"ENTREGADA"` (469–476), cierra, toast “Entrega confirmada” y recarga (477–480). La venta sale de la bandeja porque ya no es PROGRAMADA ni EN_RUTA.

### Flujo E — Permisos y bloqueo por proveedor (dispatch.js:73–113)
1. `disp360CanManage` (96–113): devuelve `true` si tienes `VENTAS_CONTADO/PROGRAMAR_ENTREGA` (99), o `CONFIRMAR_ENTREGA` (100), o `DESPACHO/GESTIONAR_DESPACHO` (101); si no hay sistema de permisos, permite (103); si tu rol es `DESPACHADOR`, permite (109). Si nada, `false` y no ves Tomar/Confirmar.
2. `disp360RowBlocked29_` (73–89): solo actúa si tu alcance en `GESTIONAR_ENTREGA`/`PROGRAMAR_ENTREGA`/`CONFIRMAR_ENTREGA` es `PROVEEDOR` o `ASIGNADOS` (78). Compara tu proveedor con `row.idProveedor` (83), con `proveedoresDetalle` (85) y permite si la fila no trae proveedor (86). Si es de otro, botón deshabilitado (322, 325, 329). El servidor vuelve a rechazar por seguridad (comentario 70–71).

### Flujo F — Embebido en Ventas vs standalone (dispatch.js:31, 121–128, 144–151)
1. `DISP360_STATE.embedded` (31) lo decide el llamador: Ventas pasa `{ embedded:true }`, app-core no.
2. Contenedor (121–123): embebido → `#salesListRegion`, standalone → `#dynamicModuleView`.
3. Botones (126–128): embebido solo Exportar; standalone Actualizar + Exportar.
4. Estilos (144–151): embebido agrega `is-embedded`, más compacto (menos relleno, KPIs y tabla más chicos).

### Flujo G — Calendario mensual y día seleccionado (delivery-calendar.js:25–41 → 54–113 → 257–305)
1. `openDeliveryCalendarWorkspace` (25–41): fija año/mes de hoy, marca hoy como `selectedDay` con `dc360DayKey` (160–163), resetea filtros, pone título y llama a cargar.
2. `renderDeliveryCalendarFrame` (54–113): dibuja filtros, barra con flechas + Hoy + contador, grilla `#dc360Grid` y panel `#dc360DayList`.
3. `loadDeliveryCalendarData` (168–184): llama `listarVentasContadoModulo` (172), normaliza con `dc360NormalizeDelivery` (189–209) y descarta las sin fecha (175).
4. `renderDeliveryCalendarResults` (257–305): agrupa por fecha `byDay` (267–271), calcula huecos de inicio `(getDay()+6)%7` para que Lunes sea columna 1 (276), días del mes (277), marca `is-today` e `is-selected` (286), pinta hasta 3 chips ordenados por código (285–291) y `+N más` (292).
5. Clic en día (297–302): guarda `selectedDay` y repinta (el seleccionado queda celeste `is-selected`).

### Flujo H — Tarjetas del día y Vendido por (delivery-calendar.js:307–339)
1. `renderDeliveryCalendarDay` (307–339): titula “Entregas del DD/MM/AAAA” (312–313). Si no hay, muestra estado vacío con icono `event_available` (316).
2. Cada tarjeta (321–329): código en negrita, cliente + distrito, dirección, oficina + receptor, **“Vendido por: nombreUsuario”** (326, viene de `row.nombreUsuario` en 204), pastilla de estado (327) y botón ojo `data-dc360-detail` (328).
3. Clic en ojo (332–338): llama `openSalesDetail29(idVenta)` si existe, para ver la venta completa. El calendario en sí no edita.

### Flujo I — Filtros del calendario (delivery-calendar.js:118–134 → 211–244)
1. `bindDeliveryCalendarControls` (118–151): buscador con 300 ms (121–125), selects (126–134), flechas (136–138), Hoy (139–148).
2. `fillDeliveryCalendarFilterOptions` (211–221): junta estados y oficinas reales + fuerza 6 estados fijos (`REGISTRADA…ANULADA`, 218) para que el filtro Estado siempre ofrezca opciones.
3. `dc360FilteredDeliveries` (232–244): filtra por Estado, Oficina y texto (código/cliente/dirección/distrito/oficina). Todo es local, sin pedir de nuevo al servidor.

### Flujo J — Módulo dinámico: listar (dynamic.js:13–28 → 53–89 → 94–115 → 120–205)
1. `openDynamicModule` (13–28): guarda módulo, resetea a página 1, tamaño desde interfaz o 50 (21), pone encabezado y dibuja marco.
2. `renderDynamicModuleFrame` (53–89): botón Nuevo solo si `dynamicPermission("CREAR")` (56, 60–62), buscador con 360 ms (79–83), filtro Estado (84–88).
3. `refreshDynamicModule` (94–115): evita doble carga (`requestPending`, 96–97), pide `listarRegistrosModuloDinamico` con `[codigo, filters]` (101), guarda definición/filas/paginación (103–105).
4. `renderDynamicData` (120–177): columnas desde `campos.filter(visibleTabla)` (123–125), celda vía `renderDynamicCell` (130–132). Si puedes EDITAR o CAMBIAR_ESTADO, agrega columna Acciones con `table-button has-tooltip` (138–161).
5. `renderDynamicPagination` (196–205): “Mostrando página X de Y · N registros” + Anterior/Siguiente deshabilitados en bordes.

### Flujo K — Módulo dinámico: crear / editar / estado (dynamic.js:210–340)
1. Nuevo (72–75): verifica `ensureWritableDynamicView` (43–47, bloquea vista simulada) y abre editor vacío.
2. Editar (163–169): `loadDynamicRecordForEdit` (210–219) pide `obtenerRegistroModuloDinamico`, muestra “Cargando registro…” y abre editor con datos.
3. `openDynamicRecordEditor` (224–250): exige CREAR o EDITAR (226–230), exige definición (233), filtra `visibleFormulario` (236), arma `<form>` con `dynamicFieldHtml` (239, 277–290: textarea/checkbox/select-catálogo/inputs tipados, respeta `obligatorio` y `editable`), abre panel lateral y conecta Guardar.
4. `populateDynamicCatalogFields` (255–272): cada `select[data-dynamic-catalog]` se llena con `listarValoresCatalogoModuloDinamico`; si falla, deja el valor actual.
5. `saveDynamicRecord` (295–315): valida (`reportValidity`, 298), junta solo campos editables (300–304, checkbox como booleano), marca `__ES_NUEVO` y clave (305–309), guarda con `guardarRegistroModuloDinamico` (312) y recarga silenciosa.
6. Estado (170–175 → 320–340): `openDynamicStatusDialog` exige `CAMBIAR_ESTADO` (321–324), modal ACTIVO/INACTIVO (329), guarda con `cambiarEstadoRegistroModuloDinamico` (336) y recarga.

---

## 4) Conexiones

- **Despacho ↔ Ventas Contado:** despacho no tiene tabla propia; lee con `listarDespachoModulo` (dispatch.js:205) y escribe con `guardarGestionEntregaVentaContadoModulo` (dispatch.js:378, 469), la misma RPC de la gestión normal de entregas. Por eso tomar/confirmar se refleja en Ventas.
- **Despacho embebido ↔ Ventas:** la pestaña DESPACHO de `VENTAS_CONTADO` llama `openDispatchWorkspace(module, { embedded:true })` (dispatch.js:27–31) y pinta en `#salesListRegion` (121–122). El botón Actualizar de ventas usa `refreshDispatchWorkspace` (48–51).
- **Despacho standalone ↔ app-core:** app-core llama `openDispatchWorkspace(module)` sin opciones para el módulo histórico OPERACIONES → Despacho (33–38, 122–123).
- **Calendario ↔ Ventas Contado:** lee con `listarVentasContadoModulo` (delivery-calendar.js:172) y el botón Ver de cada tarjeta abre `openSalesDetail29(idVenta)` (332–338). No escribe nada.
- **Módulos dinámicos ↔ backend genérico:** `listarRegistrosModuloDinamico` (dynamic.js:101), `obtenerRegistroModuloDinamico` (212), `guardarRegistroModuloDinamico` (312), `cambiarEstadoRegistroModuloDinamico` (336) y `listarValoresCatalogoModuloDinamico` (262). La forma (campos, tabla, formulario) la manda el servidor en `definicion`.
- **Permisos y sesión (los 3):** usan `hasActivePermission` / `activePermissionScope` (dispatch.js:76, 98–101; dynamic.js:34–39), `APP_STATE.context.usuario` y `APP_STATE.context.interfaz.pageSize` (dynamic.js:21), `secureRpc`, `toast`, `escapeHtml`, `debounce`, `openModal`/`closeModal`, `openSideSheet`, `setActiveView`/`setModuleHeading`, `tableHtml`, `statusChip`, `loadingHtml`.
- **Utilidades compartidas de estado:** `disp360StatusTone` (dispatch.js:569) y `dc360StatusTone` (delivery-calendar.js:341) usan la misma regla (ENTREGAD/ACTIVO→verde, PROGRAMADA/RUTA→amarillo revisión, ANULAD/RECHAZAD→rojo). Cambiar una no cambia la otra.

---

## 5) Si quieres cambiar X, toca Y

1. **Si quieres agregar un filtro a la bandeja de despacho (ej. por distrito o por vendedor), toca `renderDispatchFrame` (157–161), `DISP360_STATE.filters` (17), `bindDispatchControls` (173–194) y `disp360FilteredRows` (269–282).** Ejemplo: agrega el `<select>` en 157–161, su valor inicial en 17, su `change` en 181–189 y su condición en 274–275. No toques el servidor si es filtro local.
2. **Si quieres pedir otro dato al confirmar entrega (ej. nombre de quien recibe o foto obligatoria), toca `disp360OpenConfirmDelivery` (405–429) y `disp360ConfirmDelivery` (431–492).** Ejemplo: agrega un `<input id="disp360Receptor">` en el `body` de 414–419 y léelo en 433–435 para enviarlo en el objeto de 469–476. Si el servidor lo exige, coordina el campo nuevo en `guardarGestionEntregaVentaContadoModulo`.
3. **Si quieres cambiar quién puede tomar/confirmar despachos, toca `disp360CanManage` (96–113) y `disp360RowBlocked29_` (73–89).** Ejemplo: para dar acceso a un nuevo rol, agrega una línea como la 109 (`rol === "DESPACHADOR"`); para relajar el bloqueo por proveedor, ajusta la condición de alcance en 78 o la comparación en 83–86. Recuerda que el servidor también valida (comentario 70–71).
4. **Si quieres cambiar cómo se ve el calendario (más chips por día, otros colores, otro orden), toca `renderDeliveryCalendarResults` (257–305), `dc360ChipTone` (246–252) y `renderDeliveryCalendarDay` (307–339).** Ejemplo: para mostrar 5 en vez de 3, cambia `slice(0,3)` y `length > 3` en 289–292; para otro color de EN_RUTA, cambia la clase en 249; para agregar “Vendido por” en otro formato, edita la línea 326.
5. **Si quieres cambiar un módulo dinámico (agregar campo, ocultar columna, cambiar catálogo), primero revisa si es dato o código: campo visible/tipo/obligatorio → se cambia en la definición del servidor (no en `dynamic.js`); solo si es presentación toca `renderDynamicCell` (182–191), `dynamicFieldHtml` (277–290) o `renderDynamicData` (120–177).** Ejemplo: para ocultar la columna Acciones a cierto rol, ajusta `canEdit`/`canChangeStatus` en 136–137; para un nuevo tipo de campo, agrega un `if` en 285–289; para cambiar pageSize por defecto, toca la línea 21.

