# 07 — Administración, Proveedores y Materiales/Precios

> Archivos cubiertos: `js/modules/admin.js` (3861 líneas), `js/modules/providers.js` (1566 líneas), `js/modules/materials-prices.js` (4980 líneas). Manual para el dueño del proyecto, en lenguaje claro y sin tecnicismos innecesarios.

## 1) Para qué sirve

**`admin.js` — La consola de control del sistema.** Es donde el superadministrador y los administradores gestionan todo lo estructural: usuarios y sus asignaciones (proveedor/oficina/grupo), roles, la matriz de permisos con alcances, los maestros de proveedores/oficinas/grupos, los módulos y sus campos, los catálogos y sus valores (incluido el árbol de materiales Producto → Tipo → Subtipo), los recursos visuales (logos, íconos, banners), los parámetros de configuración, las sesiones activas y la auditoría, y las importaciones masivas con prevalidación.

**`providers.js` — El maestro de proveedores.** Es la ficha oficial de cada proveedor: razón social, nombre comercial, SAP, RUC, canal de ventas (oficinas) y grupos de vendedores. Incluye búsqueda, paginación, alta/edición, activar/inactivar, detalle con responsables de venta, plantillas CSV, importación/exportación y una carga masiva especial para actualizar canal/grupos creando oficinas y grupos que falten.

**`materials-prices.js` — El centro comercial.** Tiene 4 pestañas: Resumen, Materiales, Precios y Listas. Aquí viven el maestro universal de materiales, los precios vigentes por proveedor/negocio/alcance, las solicitudes de lista de precios (flujo tomar → aprobar/observar/rechazar → publicar) y las tres cargas masivas XLSX (materiales, precios, listas) que siempre hacen primero una prevalidación local y solo graban al confirmar. Casi todos los botones de acción son solo-ícono (lápiz, tacho, lupa, check) con tooltip.

---

## 2) Mapa

### 2.1 `js/modules/admin.js`

| Función | Líneas | Qué hace |
|---|---|---|
| `ADMIN_STATE` | 1–29 | Memoria de la consola: qué módulo está abierto, usuarios, roles, catálogos, permisos, sesiones, auditoría. |
| `ASSIGNMENT_IMPORT_CONFIG` | 31–56 | Define las 4 plantillas CSV de estructura: proveedores, oficinas, grupos y relaciones proveedor-oficina. |
| `ADMIN_MODULE_CONFIGURATION` | 58–101 | Define las 6 consolas: General, Usuarios, Permisos, Estructura, Config App y Auditoría, con sus secciones. |
| `adminRpcModuleCode` | 103–105 | Dice con qué código de módulo se llama al servidor (para permisos). |
| `getAdministrationModuleConfiguration` | 107–121 | Si eres SUPERADMIN en Config App, te abre la vista integral con todas las secciones juntas. |
| `resetAdministrationStateForSession` | 124–142 | Limpia la memoria al cambiar de usuario para no mezclar datos de otra identidad. |
| `adminUsersContextKey` / `canAdministerUsers` | 144–157 | Calcula tu contexto (usuario+rol+alcance) y pregunta si puedes ver/crear/editar usuarios. |
| `applyAdministrationPermissionVisibility` | 159–181 | Oculta los botones Nuevo usuario, Guardar permisos y Limpiar sesiones si no tienes permiso. |
| `ensureWritableAdministrationView` | 183–193 | Bloquea cambios si estás en vista simulada de otro rol (solo lectura). |
| `openAdministrationWorkspace` | 198–237 | Abre la consola: limpia estado si cambió el módulo, clona la plantilla HTML y refresca. |
| `configureAdministrationSections` | 239–278 | Muestra solo las secciones del módulo activo; todas empiezan colapsadas (acordeón cerrado). |
| `bindAdministrationInterface` | 283–318 | Conecta clics de acordeones, botones `data-admin-action`, buscadores y filtros con debounce. |
| `refreshAdministrationWorkspace` | 323–376 | Decide qué cargar según el módulo (resumen, usuarios, roles, estructura, catálogos, sesiones). |
| `handleAdminAction` | 381–416 | Despacha cada botón: refresh, nuevo usuario/proveedor/oficina/grupo/rol/módulo/catálogo/recurso, plantillas, importar, guardar permisos. |
| `loadAdminSummary` | 421–435 | Trae contadores (usuarios activos, roles, módulos, sesiones) vía `obtenerResumenAdministracionMotor`. |
| `normalizeAdminUserSearch` / `prepareAdminUserForSearch` / `filterAdminUsersLocal` | 443–486 | Búsqueda local sin tildes ni mayúsculas: filtra los usuarios ya cargados sin ir al servidor. |
| `validateAdminUsersResponse` | 491–535 | Verifica que la lista sea de tu identidad y aplica el alcance (SUPERADMIN ve todo; otros filtran por proveedor/grupo/propio y nunca ven SUPERADMIN). |
| `loadAdminUsers` | 537–572 | Carga una sola vez el catálogo completo (`listarUsuariosAdminMotor`) y luego filtra en memoria. |
| `renderAdminUsers` | 577–654 | Dibuja la tabla Usuario/Correo/Rol/Proveedor/Oficina/Estado con botones solo-ícono ver (ojo) y editar (lápiz). |
| `loadAdminRoles` / `renderAdminRoles` | 659–720 | Carga roles (`listarRolesAdminMotor` o asignables) y los muestra con chip Protegido/Configurable. |
| `loadAdminModules` / `renderAdminModules` | 725–759 | Lista módulos (`listarModulosAdminMotor`) como tarjetas con botón editar y ver campos si es DINAMICA. |
| `loadAdminCatalogs` / `renderAdminCatalogs` | 764–860 | Lista catálogos + listas-catálogo de proveedores agrupadas por proveedor con badge CATÁLOGO. Las filas `SYSTEM-*` se marcan Sistema y no se borran. |
| `loadAdminResources` | 865–875 | Carga recursos visuales (`listarRecursosVisualesAdminMotor`). |
| `getVisualResourceDictionary` / `findVisualResourceDefinition` / `visualResourceDictionaryHtml` | 880–948 | Lee el diccionario funcional (qué logo va dónde, formato, proporción) y lo muestra como acordeón de ayuda. |
| `renderAdminResources` | 953–991 | Tabla de recursos con nombre funcional + referencia técnica. |
| `visualResourceOptionsHtml` / `getResourceEditorKey` / `updateResourceEditorReference` | 996–1091 | Selector de uso del recurso: si eliges del diccionario se autocompleta tipo/nombre; si es personalizado pide clave en mayúsculas. |
| `openResourceEditor` / `saveResourceEditor` | 1096–1215 | Modal lateral para crear/editar recurso, con vista previa, validación 2 MB (favicon solo PNG) y guardado vía `guardarRecursoVisualAdminMotor`. |
| `loadAdminSettings` / `renderAdminSettings` | 1220–1305 | Lista parámetros (`listarParametrosAdminMotor`); `APP_REFRESH_ENABLED` se muestra como interruptor y el resto como campos. Solo SUPERADMIN ve los de refresco. |
| `populatePermissionRoleSelector` | 1310–1329 | Llena el selector de roles delegables (excluye SUPERADMIN e inactivos) y carga la primera matriz. |
| `snapshotPermissionMatrix` | 1335–1346 | Guarda foto del estado original (permitido+alcance por módulo\|recurso) para detectar solo cambios. |
| `loadPermissionMatrix` | 1348–1371 | Trae la matriz del rol (`obtenerMatrizPermisosAdminMotor`) y la dibuja. |
| `renderPermissionMatrix` | 1376–1435 | Dibuja por módulo: interruptor maestro + alcance masivo + filas por recurso. Apagar `VISUALIZAR_MODULO` apaga todo el módulo. |
| `savePermissionMatrix` | 1440–1515 | Compara actual vs. foto, envía solo lo cambiado (`guardarMatrizPermisosAdminMotor`) y limpia caché de vista previa de rol. |
| `openUserReadonlyDetail` | 1521–1544 | Modal de solo lectura con los datos del usuario. |
| `openUserEditor` | 1546–1614 | Formulario lateral: tipo/número documento, nombre, correo, rol, proveedor/oficina/grupo, estado. Si falta estructura la carga primero. |
| `saveUserEditor` | 1619–1653 | Valida documento y asignaciones y guarda (`guardarUsuarioAdminMotor`); al crear, invita por correo. |
| `openRoleEditor` | 1658–1719 | Crea/edita roles: código técnico inmutable en mayúsculas, nombre visible editable (protegidos solo lectura), nivel administrativo. |
| `openModuleEditor` | 1724–1752 | Constructor de módulos: código, nombre, ícono, grupo menú, tipo vista, base, hoja/campos clave, administrable. |
| `openModuleFields` / `openFieldEditor` | 1757–1806 | Lista campos del módulo dinámico y editor de campo (tipo, catálogo, orden, obligatorio, visible/editable/buscable). |
| `openCatalogEditor` | 1811–1827 | Crea/edita cabecera de catálogo (código, nombre, descripción, estado). |
| `openProviderCatalogCreator` | 1833–1880 | Crea la lista “Catálogo &lt;proveedor&gt;” del mes (`guardarListaOficialPrecioModulo` con `es_catalogo:true`). |
| `openCatalogValues` / `refreshCatalogValuesList` | 1886–1936 | Abre panel lateral de valores con caché; recarga solo el panel sin bloquear la app. |
| `catalogValuesTableHtml` / `bindCatalogValueActions` | 1959–2021 | Tabla de valores; para `MP_TIPOS` muestra Producto padre y para `MP_SUBTIPOS` Producto+Tipo. |
| `renderCatalogValueEditorAdmin` / `openCatalogValueEditor` | 2062–2318 | Editor con jerarquía: Tipos exige Producto padre; Subtipos exige Producto → Tipo filtrado. Impide huérfanos cargando padres antes. |
| `saveSetting` | 2323–2343 | Guarda parámetro (`guardarParametroAdminMotor`) y aplica refresco automático si corresponde. |
| `downloadAssignmentTemplate` | 2347–2360 | Descarga CSV con solo cabeceras (`;` separado, con BOM). |
| `selectAssignmentImportFile` / `openAssignmentImportConfirmation` / `runAssignmentImport` | 2363–2422 | Elige CSV (máx 5 MB), lo lee y abre la previsualización masiva genérica. |
| `loadAdminAssignmentStructure` | 2435–2479 | Trae proveedores/oficinas/grupos/relaciones/tipos documento (`obtenerEstructuraAsignaciones*`); si faltan oficinas usa `obtenerOpcionesProveedorModulo` como respaldo. |
| `renderAdminAssignmentStructure` | 2484–2594 | Tres tablas: proveedores (con canal y alcance catálogo), oficinas y grupos, cada una con botón editar solo-ícono. |
| `openProviderEditor` / `saveProviderEditor` | 2597–2695 | Editor admin de proveedor: razón social, comercial, alcance catálogo (Solo proveedor vs. Todos/I BR), oficinas múltiples, descripción. El código interno nunca cambia. |
| `openOfficeEditor` / `openGroupEditor` / `saveAssignmentMaster` | 2697–2766 | Editores de oficina (ID editable solo al crear) y grupo (exige oficina activa). Guardan vía `guardarOficinaAdminMotor` / `guardarGrupoAdminMotor`. |
| `bindUserEditorDependencies` / `configureUserDocumentField` / `validateUserDocumentField` | 2795–2893 | Conecta tipo documento → patrón/longitud/ejemplo/ayuda; valida con expresión regular antes de enviar. |
| `refreshUserAssignmentOptions` / `updateUserAssignmentRequirements` | 2896–2992 | Filtra oficinas por proveedor (vendedores ven toda la red; otros se limitan al canal del proveedor) y exige proveedor para roles configurables y oficina+grupo para Vendedor/Coordinador. |
| `loadAdminSessions` / `renderAdminSessions` | 2997–3064 | Lista sesiones (`listarSesionesAuditoriaAdminMotor`, 150 por página) con ver detalle y forzar cierre. |
| `openAdminSessionDetail` / `sessionDetailHtml` | 3066–3152 | Detalle técnico (ID enmascarado, usuario, rol, navegador, user-agent) + auditoría relacionada. |
| `forceCloseAdminSession` / `cleanExpiredAdminSessions` | 3154–3202 | Cierra una sesión con confirmación o limpia vencidas; recarga sesiones+auditoría+resumen. |
| `loadAdminAudit` / `renderAdminAudit` | 3207–3242 | Lista eventos (`listarAuditoriaAdminMotor`) con chips por tipo y resultado. |
| `MASS_IMPORT_STATE` / `openMassImportPreview` | 3295–3349 | Estado genérico de importación: abre modal “Validando…” y llama al `previewOperation` en segundo plano. |
| `renderMassImportPreview` | 3372–3456 | Muestra tarjetas (leídas/nuevos/actualizaciones/sin cambios/errores), filtros por resultado, tabla paginada (25 por página) y aviso de aprobación. |
| `approveMassImportPreview` / `renderMassImportSuccess` | 3604–3688 | Aprueba (`approveOperation` con token): revalida en servidor y aplica atómicamente; muestra creados/actualizados y códigos generados. |
| Descargas masivas (`downloadMassImportErrors`, `CorrectionRows`, `Changes`, `Result`, `Csv`) | 3690–3813 | Exportan CSV con `;`, BOM y escape anti-inyección (`'=+-@`). |

### 2.2 `js/modules/providers.js`

| Función | Líneas | Qué hace |
|---|---|---|
| `PROVIDERS_STATE` | 1–14 | Memoria: página, tamaño (25), búsqueda, estado, registros, opciones, secuencia anti-carreras. |
| `openProvidersWorkspace` | 16–31 | Abre la vista clonando la plantilla, conecta eventos, aplica permisos y refresca. |
| `bindProvidersWorkspace` | 33–57 | Buscador con debounce 300 ms, filtro estado, botones nuevo/importar/exportar/plantilla + botón canal/grupos. |
| `providerPermission` / `applyProvidersPermissions` | 59–79 | Oculta botones según permisos CREAR/IMPORTAR/EXPORTAR/EDITAR. |
| `refreshProvidersWorkspace` / `applyProvidersResult` | 81–139 | Lista paginada (`listarProveedoresModulo`); ignora respuestas viejas por `requestSequence`. |
| `renderProvidersSummary` | 145–157 | 4 tarjetas: encontrados, activos, con canal, solo proveedores. |
| `renderProvidersTable` / `providerActionsHtml` | 159–253 | Tabla con código interno, nombre+razón, SAP, RUC, canal, grupos, estado, modificación. Acciones solo-ícono: ver, editar, activar/inactivar. |
| `renderProvidersPagination` | 255–265 | “Página X de Y · N registros” con anterior/siguiente solo-ícono. |
| `openProviderModuleDetail` / `providerDetailHtml` | 267–347 | Ficha lateral: datos + chips de oficinas y grupos + sección Responsables de venta. |
| `loadProviderSalesResponsibles_` / `renderProviderSalesResponsibles_` | 356–416 | Agrupa precios del proveedor por `responsable_venta`, con chips filtro por persona y tabla de sus precios. |
| `bindProviderSalesResponsibles_` / `loadProviderRespMaterialOptions_` | 418–456 | Filtro visual (quitar filtro no borra nada) y carga de materiales para el alta rápida. |
| `saveProviderSalesResponsible_` | 458–501 | Alta rápida: valida nombre+material+precio, evita duplicado vigente y graba vía `guardarPrecioIndividualMaterialesPreciosModulo`; limpia caché de precios. |
| `loadProviderModuleEditor` / `openProviderModuleEditor` | 503–640 | Abre editor: nuevo (código auto) o existente (código y fechas solo lectura). Valida SAP alfanumérico mayúsculas y RUC 11 dígitos. |
| `renderProviderAssignmentSelectors` / `renderProviderMultiChecklist` / `renderProviderMultiOptions` | 642–698 | Dos combos con buscador: canal (oficinas) y grupos, con contar seleccionados, Todos/Limpiar. |
| `hydrateProviderAssignmentOptions` / `bindProviderAssignmentSelectors` | 700–749 | Rellena opciones cuando llegan del servidor y conecta abrir/cerrar, buscar, seleccionar. |
| `syncProviderGroupOptions` / `updateProviderMultiSummaries` | 769–799 | Regla clave: sin oficina no hay grupos; al cambiar oficinas se apagan grupos de otras oficinas. |
| `loadProviderOptions` | 812–836 | Caché de oficinas/grupos (`obtenerOpcionesProveedorModulo`) con promesa compartida y reintento. |
| `saveProviderModuleForm` | 838–906 | Arma payload (idsOficina/idsGrupo) y guarda (`guardarProveedorModulo`); muestra confirmación con conteos. |
| `showProviderSavedConfirmation` / `confirmProviderStatusChange` | 908–949 | Modal “Registro confirmado” con ver detalle, y modal activar/inactivar (`cambiarEstadoProveedorModulo`). |
| `handleProvidersImportFile` | 951–1003 | Importa CSV (máx 5 MB) vía `previsualizarImportacionProveedoresModulo` → `aprobarImportacionProveedoresModulo`. Sin ID ni ESTADO en plantilla: el ID lo genera el sistema y todo queda ACTIVO. |
| `exportProvidersModule` / `downloadProvidersTemplate` | 1005–1015 | Exporta con filtros actuales y descarga plantilla (usa `|` para varios canales/grupos). |
| `ensureProvidersChannelBulkUI` / `openProvidersChannelBulkIntro_` | 1058–1110 | Crea el botón “Actualizar canal/grupos” y su modal explicativo (PROVEEDOR/OFICINA/GRUPO). |
| `handleProvidersChannelBulkFile` / `mapProvidersChannelRows_` / `parseProvidersChannelCsv_` | 1121–1237 | Lee CSV o Excel (XLSX necesita la librería cargada), detecta encabezado tolerante y omite filas EJEMPLO/vacías. |
| `validateProvidersChannelRows_` | 1290–1319 | Valida cada fila: proveedor debe existir, grupo exige oficina, detecta ya-asignados y marca qué se creará. |
| `openProvidersChannelPreview_` / `renderProvidersChannelPreview_` | 1321–1387 | Previsualiza con contadores (listas/crearán/errores); solo filas OK+advertencia se pueden confirmar. |
| `applyProvidersChannelRow_` / `confirmProvidersChannelBulk_` | 1389–1536 | Crea oficinas/grupos faltantes (`guardarOficinaAdminMotor`/`guardarGrupoAdminMotor`), fusiona sin borrar lo existente y guarda por proveedor con barra de progreso. |
| `renderProvidersChannelReport_` | 1538–1566 | Reporte final: asignadas, oficinas/grupos creados, errores, omitidas, tabla por línea. |

### 2.3 `js/modules/materials-prices.js`

| Función | Líneas | Qué hace |
|---|---|---|
| `MP_STATE` + constantes caché | 1–33 | Memoria: pestaña activa, filtros, página (30 por página), cachés de opciones/tablas/resumen y pendientes GSD en memoria. |
| `openMaterialsPricesWorkspace` / `bindMaterialsPricesWorkspace` | 35–65 | Abre las 4 pestañas, oculta las que no tienes permiso y conecta el botón Actualizar. |
| `mpPermission` / `mpCanSeeTab` / `renderMaterialsPricesTab` | 79–125 | Permisos por pestaña (Resumen/Materiales/Precios/Listas); si no ves la activa te mueve a la primera permitida. |
| Cachés (`loadMaterialsPricesOptions`, `read/writeMpTableCache`, `read/writeMpSummaryCache`, `clear*`) | 178–344 | Guarda opciones/tablas/resumen en memoria + session/localStorage con TTL (30/30/10 min) para no recargar de más. |
| `renderMaterialsPricesSummary` / `mpSummaryHtml` | 377–410 | Tarjetas: materiales, activos, listas oficiales, solicitudes pendientes + nota del modelo General/Oficina/Grupo. |
| `renderMaterialsPricesMaterials` / `loadMaterialsTable` / `renderMaterialsTableResult` | 439–549 | Pestaña Materiales: buscador+estado, botones Descargar/Carga masiva/Nuevo, tabla Código/SAP/Producto/Tipo-Material/Marca/Estado con editar y eliminar (con confirmación; el servidor bloquea si está en uso). |
| `openMaterialModal` / `renderMaterialModalBody` | 551–829 | Modal Nuevo/Modificar material con árbol Negocio→Producto→Tipo→Subtipo, marca libre o existente, validación y guardado (`guardarMaterialPrecioModulo`). |
| `renderMaterialsPricesPrices` / `loadOfficialPricesTable` / `renderOfficialPricesTableResult` | 871–974 | Pestaña Precios: tabla por material (no cabeceras) con proveedor, responsable, negocio, alcance, SAP, precio, fee, vigencia. El fee se oculta al rol proveedor. Editar abre precio individual; eliminar pide confirmación (`eliminarDetalleListaPrecioModulo`). |
| `renderMaterialsPricesLists` / `loadMpOfficialListsSection_` / `renderMpOfficialListsSection_` | 976–1060 | Pestaña Listas: arriba solicitudes, abajo listas oficiales agrupadas por cabecera con eliminar en cascada (`eliminarListaOficialPrecioModulo`). |
| `loadRequestsTable` | 1062–1079 | Tabla de solicitudes: código, proveedor, negocio, alcance, origen, vigencia, errores/advertencias, estado, abrir. |
| `openUploadListModal` / `renderUploadListModalBody` / `submitUploadListForm` | 1081–1147 | Cargar lista CSV: cabecera (proveedor/negocio/oficina/grupo/vigencia/comentario) + archivo; crea solicitud pendiente (`crearSolicitudListaPrecioModulo`). Grupo exige oficina. |
| Carga masiva Listas XLSX (`openMpListsBulkModal`, `mpListasBulkValidarFilas_`, `prevalidarListasBulkLocal_`, `renderMpListsBulkPreview_`, `confirmarListasBulk_`) | 1537–1803 | Valida hoja `CARGA_LISTAS` (proveedor/oficina/grupo/negocio/nombre/moneda/vigencia/código HANA/precio/responsable/fee), agrupa filas en listas y graba cabecera (`guardarListaOficialPrecioModulo`) + detalles (`guardarDetalleListaPrecioModulo`). |
| `openRequestDetail` / `renderRequestDetail` | 1806–1836 | Detalle de solicitud con tabla por fila (código, clasificación, combo, precio, errores) y botones solo-ícono: volver, descargar, tomar, aprobar, observar, rechazar, publicar. |
| `resolveRequest` / `runRequestAction` | 1838–1849 | Pide comentario con `prompt` y ejecuta `resolverRevisionSolicitudListaPrecioModulo` o la acción directa (tomar/publicar); recarga el detalle. |
| `openIndividualPriceModal` / `renderIndividualPriceModalBody` | 1863–2181 | Formulario en 3 pasos: 1) contexto (proveedor/responsable/negocio/oficina/grupo con tarjeta de alcance), 2) material (buscador con mínimo 2 letras), 3) precio/vigencia/fee/combo. Valida y guarda (`guardarPrecioIndividualMaterialesPreciosModulo`) con actualización optimista de tabla. |
| `validateIndividualPriceForm` / `setMpMonthlyVigenciaDefaults_` | 2297–2322 | Reglas: proveedor+negocio+material+precio ≥ 0+fechas coherentes+grupo exige oficina+fee 0–100. Fechas vacías = día 1 a fin de mes. |
| Carga masiva Precios XLSX (`openBulkPriceModal`, `renderBulkPriceModalBody`, `submitBulkPriceForm`, `prevalidarPreciosGsdLocal_`, `confirmarBulkPriceLoadPaso28O_`, `confirmarPreciosGsdLocal_`) | 2418–3181 | Lee `CARGA_PRECIOS` o Excel GSD de una hoja; prevalida local (material existe, precio ≥ 0, proveedor/negocio) y confirma creando/actualizando material + precio fila por fila, con espejo en “Catálogo &lt;proveedor&gt;”. Barra de progreso global. |
| Carga masiva Materiales XLSX (`openBulkMaterialModal`, `renderBulkMaterialModalBody`, `submitBulkMaterialForm`, `prevalidarMaterialesGsdLocal_`, `renderBulkMaterialPreview`, `confirmarBulkMaterialLoad`, `confirmarMaterialesGsdLocal_`) | 3418–4421 | Lee `CARGA_MATERIALES` o GSD; valida ruta de tipificación y código HANA (=SAP); confirma con `guardarMaterialPrecioModulo` fila por fila. No crea precios. |
| Soporte GSD (`mpGsdNorm_`, `mpGsdMapColumns_`, `mpGsdFindHeaderRow_`, `mpGsdParseNumber_`, `mpGsdParseFee_`, `mpGsdParseWorkbook_`, `mpGsdValidarFila_`, `mpGsdMaterialPayload_`, `mpGsdStore/Take/DropPending_`, plantillas locales) | 4423–4890 | Normaliza encabezados (sin tildes/mayúsculas, orden libre), ignora N°/cuotas/columnas *original, parsea montos US/EU y fees, detecta duplicados y guarda pendientes con token `GSDLOCAL-…` hasta confirmar. |
| Utilidades (`mpScopeLabel`, `mpSelect`, `mpInput`, `downloadCsvResult`, `openMpModal`, exportadores) | 3924–4001 | Etiqueta de alcance General/Oficina/Grupo, constructores de campos, descargas CSV y modales. Exigen filtro (búsqueda ≥ 2 letras o estado/negocio) antes de descargar para evitar archivos pesados. |

---

## 3) Detalle — flujos clave paso a paso

### 3.1 Cómo se guarda la matriz de permisos (admin.js:1310–1515)

1. Eliges un rol en `#adminPermissionRole` → `loadPermissionMatrix(rol)` (1348) llama `obtenerMatrizPermisosAdminMotor[rol]`.
2. Al llegar, `snapshotPermissionMatrix` (1335) guarda la foto original `modulo|recurso → {permitido, alcance}` en `ADMIN_STATE.permissionOriginal`.
3. `renderPermissionMatrix` (1376) dibuja cada módulo con sus recursos ordenados (`VISUALIZAR_MODULO` primero). Cada fila tiene interruptor + selector de alcance (`PROPIO, PROVEEDOR, GRUPO, ASIGNADOS, GLOBAL`).
4. Interacciones: apagar `VISUALIZAR_MODULO` apaga todo el módulo (1403–1410); el interruptor maestro enciende/apaga todas las filas (1418–1426); el selector de cabecera aplica un alcance a todo el módulo (1427–1434).
5. Pulsas Guardar (botón solo-ícono) → `savePermissionMatrix` (1440): verifica permiso `ADMIN_PERMISOS/EDITAR_PERMISOS` y que no sea vista simulada; lee cada `.permission-row`, compara con la foto y se queda **solo con lo cambiado**.
6. Si no hay cambios avisa “Sin cambios”. Si hay, llama `guardarMatrizPermisosAdminMotor[{rol, permisos:cambios}]`, re-dibuja, hace nueva foto y limpia `APP_STATE.rolePreviewCache` (1510) para que la simulación de roles no use datos viejos.

### 3.2 Cómo se aprueba una solicitud de precio (materials-prices.js:1806–1849 + 1062–1079)

1. En pestaña Listas, `loadRequestsTable` (1062) lista solicitudes con `listarSolicitudesListaPrecioModulo` y cada fila tiene botón solo-ícono abrir (`open_in_new`).
2. `openRequestDetail(id)` (1806) trae `obtenerDetalleSolicitudListaPrecioModulo` y `renderRequestDetail` (1820) muestra cabecera (código, proveedor, negocio, alcance, origen, estado) + tabla de filas con errores/advertencias.
3. Botones según permiso (todos solo-ícono con tooltip): Tomar revisión (`TOMAR_REVISION_PRECIO`), Aprobar (`APROBAR_LISTA_PRECIO`), Observar (`OBSERVAR_LISTA_PRECIO`), Rechazar (`RECHAZAR_LISTA_PRECIO`), Publicar y Descargar observaciones.
4. Tomar: `runRequestAction(tomarRevisionSolicitudListaPrecioModulo[id])` (1831). Publicar: `runRequestAction(publicarSolicitudListaPrecioModulo[id])` (1835). Solo tras tomarla la puedes resolver.
5. Aprobar/Observar/Rechazar: `resolveRequest(id, ACCION)` (1838) pide comentario con `prompt`, llama `resolverRevisionSolicitudListaPrecioModulo[id, ACCION, comentario]` y recarga el detalle. La lista **no toca precios oficiales hasta ser aprobada/publicada**.

### 3.3 Cómo se crea un usuario con asignaciones (admin.js:1546–1653 + 2795–2992)

1. Nuevo usuario → `openUserEditor(null)` (1546): si falta estructura la carga primero (`loadAdminAssignmentStructure`).
2. Eliges tipo documento → `configureUserDocumentField` (2841) pone patrón, longitud, ejemplo y ayuda (ej. DNI 8 dígitos). Al escribir, `validateUserDocumentField` (2870) valida con expresión regular.
3. Eliges rol → `updateUserAssignmentRequirements` (2961): si el rol es configurable el proveedor es obligatorio; si es Vendedor/Coordinador, oficina+grupo son obligatorios.
4. Eliges proveedor → `refreshUserAssignmentOptions` (2896): vendedores ven todas las oficinas; otros solo el canal del proveedor (si el proveedor aún no tiene canal, se ofrecen todas para no bloquear). El grupo siempre se filtra por la oficina elegida.
5. Guardar → `saveUserEditor` (1619) revalida y llama `guardarUsuarioAdminMotor[data]`; al crear envía invitación por correo, al editar actualiza datos y asignaciones, y recarga la lista conservando la búsqueda.

### 3.4 Cómo funciona la importación masiva genérica de Admin (admin.js:3295–3688 + 2347–2422)

1. Botones `template-*` descargan CSV solo-cabeceras (`downloadAssignmentTemplate`, 2347). Botones `import-*` abren selector con límite 5 MB (`selectAssignmentImportFile`, 2363).
2. Al leer el archivo, `openAssignmentImportConfirmation` (2389) abre `openMassImportPreview` (3310): modal “Validando…” y llamada a `previsualizarImportacionAsignacionAdminMotor[tipo, contenido, metadata]`. Nada se escribe.
3. `renderMassImportPreview` (3372) muestra tarjetas, filtros (Todos/Nuevos/Actualizaciones/Sin cambios/Errores), tabla paginada de 25 con detalle por fila (errores, advertencias, cambios antes/después) y descargas de errores/cambios.
4. Si hay errores, la aprobación se bloquea con aviso. Si está lista, `approveMassImportPreview` (3604) llama `aprobarImportacionAsignacionAdminMotor[tipo, token, contenido, metadata]`, que revalida en servidor y aplica atómicamente.
5. Éxito → `renderMassImportSuccess` (3652) con conteos y códigos internos generados descargables; se recarga la estructura (`loadAdminAssignmentStructure`).

### 3.5 Cómo se crea/edita un proveedor con canal y grupos (providers.js:526–906 + 769–799)

1. Nuevo → `openProviderModuleEditor(null)` (526) con “Código interno: se generará automáticamente”; existente → `loadProviderModuleEditor(id)` trae `obtenerDetalleProveedorModulo` y abre con código/fechas solo lectura.
2. Opciones de canal/grupos llegan por `loadProviderOptions` (`obtenerOpcionesProveedorModulo`) con caché; mientras tanto el formulario ya es usable y el Guardar está deshabilitado.
3. Dos combos con buscador (`renderProviderAssignmentSelectors`, 642): oficinas y grupos, con Todos/Limpiar. `syncProviderGroupOptions` (769) aplica la regla: sin oficina no hay grupos; solo se ven grupos de las oficinas elegidas.
4. Validaciones en `saveProviderModuleForm` (838): SAP solo alfanumérico en mayúsculas, RUC 11 dígitos o vacío. Payload con `idsOficina`/`idsGrupo` → `guardarProveedorModulo`.
5. Al guardar: invalida caché, refresca lista y muestra modal “Registro confirmado” con código, N° oficinas y grupos (si no eliges grupos = todos los grupos de esas oficinas; si no eliges oficinas = solo abastecedor sin canal).

### 3.6 Cómo se agregan responsables de venta (providers.js:351–501)

1. En el detalle del proveedor, `loadProviderSalesResponsibles_` (356) trae `listarListasOficialesPreciosModulo[{}]` y filtra por ese proveedor.
2. `renderProviderSalesResponsibles_` (376) agrupa por `responsable_venta` en chips con conteo; clic filtra la tabla de sus precios. “Quitar filtro” solo limpia la vista, no borra datos.
3. “Agregar responsable” pide nombre + material + precio + vigencia; valida y evita duplicado vigente (mismo material + mismo nombre con fin ≥ hoy).
4. Guarda con `guardarPrecioIndividualMaterialesPreciosModulo` (485), limpia caché de precios/resumen y recarga responsables. El responsable “nace en el precio”, no es un maestro aparte.

### 3.7 Cómo se actualiza canal/grupos por carga masiva (providers.js:1058–1566)

1. Botón “Actualizar canal/grupos” → modal intro → plantilla `PROVEEDOR,OFICINA,GRUPO` (`downloadProvidersChannelTemplate_`, 1112) o selección de CSV/XLSX (5 MB).
2. Parseo tolerante (`mapProvidersChannelRows_` 1175, `parseProvidersChannelCsv_` 1224): busca encabezado aunque cambie orden/tildes, omite vacías y EJEMPLO.
3. `validateProvidersChannelRows_` (1290): proveedor debe existir (si no, error “créalo primero”); fila sin oficina ni grupo = sin cambios; grupo sin oficina = error; detecta ya-asignados y marca “Se creará oficina/grupo”.
4. Preview con contadores; Confirmar (`confirmProvidersChannelBulk_` 1452) recarga catálogo fresco, crea faltantes con IDs `OFI-…`/`GRP-…` (`guardarOficinaAdminMotor`/`guardarGrupoAdminMotor`), fusiona en `idsOficina`/`idsGrupo` **sin borrar** lo existente y guarda por proveedor (`guardarProveedorModulo`) con barra de progreso.
5. Reporte final (`renderProvidersChannelReport_` 1538): asignadas, oficinas/grupos creados, errores, omitidas, tabla por línea.

### 3.8 Cómo se guarda un precio individual (materials-prices.js:1863–2181 + 2297–2322)

1. Botón “Cargar precio individual” (o lápiz en Precios) → `openIndividualPriceModal(prefill)` (1863). Si hay caché de proveedores+negocios el formulario aparece al instante; si no, espera opciones.
2. Paso 1 contexto: proveedor (obligatorio), responsable venta (texto libre), negocio, oficina (opcional), grupo (solo si hay oficina). La tarjeta `#mpPriceScopeSummary` muestra General / Oficina / Grupo en vivo (`actualizarResumenAlcancePrecio_`, 4171).
3. Paso 2 material: buscador con mínimo 2 letras → `listarMaterialesSelectPreciosModulo[texto, limite:80]` con caché y anti-carreras (`materialSelectRequestId`). Elegir material nunca altera el contexto.
4. Paso 3 precio: precio base, inicio/fin (vacías = mes actual día 1 → fin de mes), fee 0–100 (oculto a proveedor), combo/comentario. `validateIndividualPriceForm` (2297) exige todo coherente.
5. Guardar → `guardarPrecioIndividualMaterialesPreciosModulo[data]`; al éxito limpia cachés, actualiza la tabla optimistamente (`updatePriceTableOptimistically`, 2184) y recarga oficial a los 800 ms.

### 3.9 Cómo son las cargas masivas XLSX con prevalidación (materials-prices.js:2418–4421)

Patrón común en las tres (Materiales, Precios, Listas): **Descargar plantilla → Elegir XLSX (5 MB, solo `.xlsx`) → Prevalidar local (nada se graba, token `GSDLOCAL-…`) → Revisar tabla → Confirmar fila por fila → Reporte.**

- **Materiales** (3418+): plantilla `Plantilla_Carga_Materiales_GSD.xlsx` (hojas `CARGA_MATERIALES` + `DICCIONARIOS`) generada local con SheetJS si está disponible, si no CSV del servidor. Clave `CODIGO HANA` (=SAP). `prevalidarMaterialesGsdLocal_` (3615) valida ruta de tipificación y duplicados; `confirmarMaterialesGsdLocal_` (4357) graba con `guardarMaterialPrecioModulo`. No crea precios.
- **Precios** (2418+): plantilla `Plantilla_Carga_Precios_GSD.xlsx` (`CARGA_PRECIOS` + `DICCIONARIOS`). Acepta también el Excel GSD real de una hoja (PROVEEDOR, MARCA, TIPO, SUBTIPO, CODIGO HANA, PRECIO, FEE…). `prevalidarPreciosGsdLocal_` (2701) exige proveedor+negocio+precio y detecta crear vs. actualizar por misma vigencia mensual. `confirmarPreciosGsdLocal_` (3050) crea/actualiza material y luego precio, y además hace espejo en el “Catálogo &lt;proveedor&gt;” (busca por `es_catalogo:true` o lo crea) sin alterar los contadores mensuales.
- **Listas** (1537+): plantilla `Plantilla_Carga_Listas_GSD.xlsx` (`CARGA_LISTAS` + `DICCIONARIOS`). Filas con mismo proveedor/oficina/grupo/negocio/nombre/moneda/vigencia = UNA lista. `mpListasBulkValidarFilas_` (1343) valida todo (material existe y activo, moneda 3 letras, fechas, fee 0–100, grupo pertenece a oficina, sin duplicados por lista). `confirmarListasBulk_` (1717) crea cabeceras y detalles secuencialmente con progreso.
- Todas usan `mpBulkProgressHtml_/Update_` (91–100) para la barra “X de Y (Z%)” y botones **solo-ícono**: `fact_check` prevalidar, `check_circle` confirmar, `save` guardar, `download` plantilla, `upload_file` carga, `chevron_left/right` paginar, `edit/delete/visibility` en tablas.

---

## 4) Conexiones

**Con el servidor (vía `secureRpc`, siempre con código de módulo para permisos):**

- Admin: `obtenerResumenAdministracionMotor`, `listarUsuariosAdminMotor`, `guardarUsuarioAdminMotor`, `listarRolesAsignablesUsuariosMotor` / `listarRolesAdminMotor`, `guardarRolAdminMotor`, `obtenerMatrizPermisosAdminMotor`, `guardarMatrizPermisosAdminMotor`, `listarModulosAdminMotor`, `guardarModuloAdminMotor`, `listarCamposModuloAdminMotor`, `guardarCampoModuloAdminMotor`, `listarCatalogosAdminMotor`, `guardarCatalogoAdminMotor`, `listarValoresCatalogoAdminMotor`, `guardarValorCatalogoAdminMotor`, `listarRecursosVisualesAdminMotor`, `guardarRecursoVisualAdminMotor`, `listarParametrosAdminMotor`, `guardarParametroAdminMotor`, `obtenerEstructuraAsignacionesAdminMotor` / `obtenerEstructuraAsignacionesUsuariosMotor`, `guardarProveedorAdminMotor`, `guardarOficinaAdminMotor`, `guardarGrupoAdminMotor`, `guardarListaOficialPrecioModulo`, `listarProveedoresModulo`, `listarSesionesAuditoriaAdminMotor`, `obtenerDetalleSesionAuditoriaAdminMotor`, `cerrarSesionAuditoriaAdminMotor`, `limpiarSesionesExpiradasAuditoriaAdminMotor`, `listarAuditoriaAdminMotor`, `previsualizarImportacionAsignacionAdminMotor`, `aprobarImportacionAsignacionAdminMotor`.
- Proveedores: `listarProveedoresModulo`, `obtenerDetalleProveedorModulo`, `obtenerOpcionesProveedorModulo`, `guardarProveedorModulo`, `cambiarEstadoProveedorModulo`, `previsualizarImportacionProveedoresModulo`, `aprobarImportacionProveedoresModulo`, `exportarProveedoresModulo`, `obtenerPlantillaProveedoresModulo`, `listarListasOficialesPreciosModulo`, `listarMaterialesSelectPreciosModulo`, `guardarPrecioIndividualMaterialesPreciosModulo`, `guardarOficinaAdminMotor`, `guardarGrupoAdminMotor`.
- Materiales/Precios: `obtenerResumenMaterialesPreciosModulo`, `obtenerOpcionesMaterialesPreciosModulo`, `listarMaterialesPrecioModulo`, `guardarMaterialPrecioModulo`, `eliminarMaterialPrecioModulo`, `listarMaterialesSelectPreciosModulo`, `listarListasOficialesPreciosModulo`, `guardarPrecioIndividualMaterialesPreciosModulo`, `guardarListaOficialPrecioModulo`, `guardarDetalleListaPrecioModulo`, `eliminarDetalleListaPrecioModulo`, `eliminarListaOficialPrecioModulo`, `listarSolicitudesListaPrecioModulo`, `obtenerDetalleSolicitudListaPrecioModulo`, `crearSolicitudListaPrecioModulo`, `tomarRevisionSolicitudListaPrecioModulo`, `resolverRevisionSolicitudListaPrecioModulo`, `publicarSolicitudListaPrecioModulo`, `cargarPreciosIndividualesMasivoModulo`, `prevalidarMaterialesMasivoModulo`, `confirmarCargaMaterialesMasivoModulo`, `obtenerPlantillaMaterialesModulo`, `obtenerPlantillaPreciosIndividualesModulo`, `obtenerPlantillaListaPreciosModulo`, `exportarMaterialesModulo`, `exportarPreciosOficialesModulo`, `exportarConsolidadoPendientesPreciosModulo`, `exportarDetalleSolicitudPreciosModulo`, `limpiarCacheMaterialesPreciosModulo`.

**Entre módulos del frontend:**

- Admin provee la base que usan los otros dos: la estructura proveedor/oficina/grupo (`loadAdminAssignmentStructure`) alimenta el editor de usuarios y es la misma que Proveedores edita; el árbol de catálogos `MP_PRODUCTOS_PRINCIPALES / MP_TIPOS_MATERIAL / MP_SUBTIPOS_MATERIAL` que Admin mantiene es el que Materiales usa para tipificar; el “Catálogo &lt;proveedor&gt;” que Admin crea (`openProviderCatalogCreator`) es el espejo que la carga masiva de precios actualiza; los responsables de venta que Proveedores muestra nacen en los precios de Materiales (`responsable_venta`).
- Permisos: `applyAdministrationPermissionVisibility`, `providerPermission` y `mpPermission/mpCanSeeTab` leen `APP_STATE.context.seguridad.permisos`; la matriz que Admin guarda es la que oculta/muestra botones y pestañas en Proveedores y Materiales. El fee se oculta al rol proveedor (`isMpProviderUser_`, `mpGsdMaskFee_`).
- Cachés: Materiales guarda opciones/tablas/resumen con claves `SGT360_MP_*` y revisión `APP_STATE.dataRevision`; Proveedores usa `requestSequence` y `PROVIDERS_STATE.options`; Admin usa `catalogValuesCache` y `usersAll` para búsqueda local. Tras guardar se limpian (`clearMpTableCache`, `clearMpSummaryCache`, `invalidateProvidersLocalCache`) para no mostrar datos viejos.
- Librería XLSX (SheetJS): la carga canal/grupos de Proveedores y las tres cargas de Materiales la reutilizan; si no está cargada piden usar CSV o abrir Materiales primero.

---

## 5) Si quieres cambiar X, toca Y (5 ejemplos)

1. **Si quieres cambiar qué ve cada rol (ej. que un rol pueda aprobar listas pero no eliminar precios), toca la matriz en `admin.js`.** Edita `renderPermissionMatrix` (1376–1435) para el dibujo y `savePermissionMatrix` (1440–1515) para el guardado; los permisos que revisan Proveedores/Materiales están en `providerPermission` (providers.js:59) y `mpPermission/mpCanSeeTab` (materials-prices.js:79–110). No toques los RPC: solo cambia qué `recurso` pides en cada botón/tabla.
2. **Si quieres cambiar la regla “grupo exige oficina” o “sin oficina = General”, toca los tres sincronizadores.** Son `syncProviderGroupOptions` (providers.js:769), `syncPriceOfficeSelection` + `actualizarResumenAlcancePrecio_` (materials-prices.js:4135–4199) y `refreshUserAssignmentOptions` (admin.js:2896). Cambia el filtrado en los tres a la vez o dejarás una pantalla con regla distinta a las otras.
3. **Si quieres cambiar las columnas de una plantilla masiva (ej. agregar una columna nueva al Excel GSD), toca el mapeo + validación + payload.** En Materiales/Precios es `mpGsdMapColumns_` (4458), `mpGsdValidarFila_` (4725) / `mpListasBulkMapColumns_` + `mpListasBulkValidarFilas_` (1181/1343) y `mpGsdMaterialPayload_` (4771); en Proveedores canal es `mapProvidersChannelRows_` (1175) + `validateProvidersChannelRows_` (1290). Agrega la columna en el constructor de plantilla (`mpGsdBuildMaterialWorkbook_` 4832 / `mpGsdBuildPricesWorkbook_` 4847 / `mpListasBulkBuildWorkbook_` 1477) para que la plantilla y el lector hablen el mismo idioma.
4. **Si quieres cambiar los botones solo-ícono (ej. ponerles texto o cambiar el ícono de guardar), toca los renders, no la lógica.** Busca `has-tooltip` + `material-symbols-rounded` en `renderAdminUsers` (577), `providerActionsHtml` (247), `renderOfficialPricesTableResult` (925), `renderRequestDetail` (1820) y los modales de carga (`renderBulkPriceModalBody` 2429, `renderBulkMaterialModalBody` 3423, `renderMpListsBulkModalBody_` 1542). El icono es solo el `<span>` interno; el `data-tooltip/aria-label/title` debe cambiarse junto para no romper accesibilidad.
5. **Si quieres cambiar la vigencia por defecto (hoy: día 1 → fin de mes) o el límite de 5 MB, toca las constantes puntuales.** Vigencia: `setMpMonthlyVigenciaDefaults_` (2315), `mpGsdMonthRange_` (4714) y `mpListasBulkParseFecha_` (1226, aviso “se usa el mes de carga”). Tamaño: `selectAssignmentImportFile` (2372, admin), `handleProvidersImportFile` (955) y `handleProvidersChannelBulkFile` (1125) en providers, y `submitBulkPriceForm` (2564) / `submitBulkMaterialForm` (3527) / `submitMpListsBulkForm_` (1598) en materiales. Cambia el número en esos lugares y el texto de ayuda que lo menciona para no confundir al usuario.
