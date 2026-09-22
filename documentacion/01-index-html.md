# index.html — Manual del dueño (Seguimiento 360)

## 1) Para qué sirve

Este archivo es la "casa" completa de la aplicación: aquí vive todo lo que ves en pantalla (el login, el menú lateral, la barra de arriba, la pantalla de carga, las plantillas de Administración / Proveedores / Materiales y Precios, y los estilos de Ventas), y al final engancha todos los JavaScript que le dan vida. No guarda datos ni hace cálculos; solo pone la estructura y llama a los CSS y JS correctos. Si este archivo se rompe, no abre nada.

## 2) Mapa del archivo

| Líneas | Bloque | Qué hace |
|---|---|---|
| 1–30 | `<head>` | Título, favicon, fuentes, CSS y librerías externas (CDN) |
| 31 | `<body class="is-loading">` | Arranca en modo "cargando" hasta que el JS lo libera |
| 43–77 | Vista login `#authView` | Pantalla de ingreso: panel con arte + formulario de email/contraseña |
| 90–243 | `#appShell` | Toda la app una vez logueado: sidebar, topbar, banner de roles, contenido |
| 245–286 | `#globalLoader` | Pantalla de carga elegante con logo Cálidda y mensajes de progreso |
| 288–304 | `#appLoader` | Mini-loader para "procesando solicitud" dentro de la app |
| 319–701 | `<template id="administrationTemplate">` | Consola de administración (usuarios, roles, proveedores, catálogos, auditoría) |
| 704–745 | `<template id="providersWorkspaceTemplate">` | Pantalla de Proveedores (buscador, filtros, tabla, paginación) |
| 748–769 | `<template id="materialsPricesWorkspaceTemplate">` | Pantalla de Materiales y Precios (pestañas Resumen/Materiales/Precios/Listas) |
| 771–869 | `<style>` inline MP | Estilos solo de Materiales y Precios (tarjetas, tablas, modales laterales) |
| 875–1922 | 4 bloques `<style>` sales/sales29 | Estilos solo de Ventas al contado (formularios, carrito, entrega, modales anchos) |
| 1934–1976 | Componentes compartidos | Toast de avisos, modal genérico, panel lateral y plantilla "sin registros" |
| 1981–2007 | Modal `#modalConfigSupabase` | Ventana para pegar URL y Key de Supabase o usar Modo Demo |
| 2012–2025 | `<script src>` locales con versión | Engancha `js/config.js`, `supabase-client.js`, `app-core.js` y los 7 módulos |
| 2028–2074 | `<script>` inline final | Lógica del semáforo Supabase/Demo y apertura del modal de conexión |

## 3) Detalle por bloques

### Bloque A — `<head>`: metas, fuentes, CSS con `?v=`, CDNs (líneas 3–30)

Qué hace paso a paso:

- Línea 4–6: define idioma español, caracteres UTF-8, vista móvil y el título `Seguimiento 360 — Cálidda Gas Natural` (lo que ves en la pestaña del navegador).
- Línea 9–10: favicon con `img/calidda-logo.png` (ícono de la pestaña y de iPhone).
- Línea 13–16: trae las fuentes de Google: `DM Sans` + `Inter` para textos y `Material Symbols Rounded` para todos los iconitos (menu, logout, search, etc.).
- Línea 19: Font Awesome 6.5.0 (íconos `fa-database`, `fa-plug` del modal Supabase).
- Línea 20: solo la grilla de Bootstrap 5.3.2 (para ordenar columnas, no el Bootstrap completo).
- Línea 23–24: tus CSS propios con truco anti-caché `?v=`: `css/app-styles.css?v=20260919j` (toda la app) y `css/prov-styles.css?v=20260919h` (proveedores). Si cambias el CSS y subes el `?v=`, el navegador del usuario descarga lo nuevo.
- Línea 27–29: librerías externas JS: `xlsx` (leer/exportar Excel), `Chart.js` (gráficos) y `supabase-js@2` (conexión a base de datos).

### Bloque B — Vista login `#authView`: panel arte + formulario (líneas 43–77)

Qué hace paso a paso:

- Línea 43: `<section id="authView">` es la pantalla completa de login. Se oculta sola cuando entras a la app.
- Línea 44–46: panel izquierdo de arte. Línea 44 es el fondo degradado azul Cálidda; línea 45 la imagen `img/arte-gas.jpg?v=20260919f` que lo cubre todo (`object-fit:cover`).
- Línea 48–53: panel derecho del formulario. Línea 50 logo `img/calidda-logo.png`, línea 52 título `#authTitle` ("Plataforma de Seguimiento Comercial - Calidda Hogar"), línea 53 subtítulo "Ingresa con tu cuenta autorizada".
- Línea 56: formulario `#supabaseEmailLogin` (no recarga la página, lo maneja el JS).
- Línea 59 `#authEmail`: campo email con ícono `mail`.
- Línea 63 `#authPassword`: campo contraseña con ícono `lock`, mínimo 6 letras.
- Línea 66 `#authRemember` (checkbox "Recuérdame", viene marcado) y línea 67 botón `#authForgotPassword` ("¿Olvidaste tu contraseña?").
- Línea 69–71: botón `#authEmailSubmit` "Ingresar" que dispara el login.
- Línea 75: `#authMessage` cajita oculta para errores ("usuario no autorizado", "contraseña incorrecta", etc.).

### Bloque C — `#appShell`: sidebar, topbar, profile menu, role preview (líneas 90–243)

Qué hace paso a paso (todo nace con `hidden` en línea 90 y el JS lo muestra al loguearte):

**Sidebar (líneas 91–135):**
- Línea 93–106 `#sidebarBrandToggle`: botón del logo para minimizar el menú. Línea 102 `#brandLogoFallback` + línea 105 `#brandLogo` (las dos imágenes `img/calidda-logo.png`).
- Línea 108 `#appNameSidebar` ("Seguimiento 360") y línea 109 `#appEnvironment` ("DESARROLLO" — cámbiala a PRODUCCIÓN cuando salgas en vivo).
- Línea 111 `#sidebarCloseButton`: X para cerrar el menú en celular.
- Línea 116 `#moduleNavigation`: aquí el JS dibuja solo los módulos que tu rol puede ver. Vacío en el HTML a propósito.
- Línea 119–122: avatar `#sidebarUserAvatar` (letra "U"), nombre `#sidebarUserName` y rol `#sidebarUserRole`.
- Línea 125 `#logoutButton`: botón salir con ícono `logout`.

**Topbar (líneas 140–201):**
- Línea 141 `#sidebarOpenButton`: hamburguesa `menu` (solo móvil).
- Línea 145 `#currentModuleEyebrow` ("GENERAL") y línea 146 `#currentModuleTitle` ("Inicio"): el JS los cambia en cada módulo.
- Línea 149–157 `#rolePreviewControl` + `#rolePreviewSelect`: selector "Visualizar como:" (oculto salvo para admins, sirve para ver la app como otro rol sin cambiar tu sesión).
- Línea 158–162 `#badgeSupabaseStatus`: semáforo de conexión. Línea 159 `#dotSupabaseStatus` (puntito verde/naranja) + línea 160 `#textSupabaseStatus` ("Supabase" / "Supabase Conectado" / "Modo Demo"). Clic abre el modal de configuración.
- Línea 163–172 `#themeToggleButton` + `#themeToggleIcon`: botón luna/sol de modo claro-oscuro.
- Línea 175 `#lastSyncLabel`: texto "Sincronizando" / hora de última sincronización.
- Línea 177 `#refreshButton`: botón `refresh` para recargar datos.
- Línea 188–198 menú perfil: línea 188 `#profileButton` con iniciales `#topbarUserInitials`, línea 191 `#profileMenu` con línea 192 `#profileChangePassword` ("Cambiar contraseña") y línea 195 `#profileLogout` ("Cerrar sesión" en rojo).

**Banner de vista previa de rol (líneas 203–225):**
- Línea 203 `#rolePreviewBanner` (oculto por defecto): avisa "Vista previa del rol ___ / Solo visualización".
- Línea 206 `#rolePreviewName`: nombre del rol simulado.
- Línea 211–214 `#rolePreviewUserControl` + `#rolePreviewUserSelect`: combo extra para elegir un usuario de referencia.
- Línea 216 `#rolePreviewDetailsButton` ("Ver accesos") y línea 220 `#rolePreviewExitButton` ("Volver a mi vista").

**Contenido (líneas 227–241):**
- Línea 228 `#dashboardView`: tarjeta bienvenida con línea 232 `#dashboardGreeting` ("Tu centro de seguimiento está listo.").
- Línea 240 `#dynamicModuleView` (vacía y oculta): aquí el JS inyecta cada módulo cuando haces clic en el menú.

### Bloque D — `#globalLoader` + `#appLoader` (líneas 245–304)

Qué hace paso a paso:

- Línea 245 `#globalLoader`: pantalla completa de carga que tapa todo al abrir la app.
- Línea 249–257: animación del logo: órbitas (líneas 251–252), línea 254 `#loaderLogo` (`img/calidda-logo.png`) y línea 255 `#loaderFallbackIcon` (ícono `home_work` si falla la imagen).
- Línea 260 `#loaderBrandName` ("CÁLIDDA 360"), línea 261 `#loaderTitle` ("Preparando la aplicación"), línea 262 `#loaderSubtitle` ("Estamos configurando tu espacio de trabajo.").
- Línea 265–267: barra de progreso animada; línea 271 `#loaderMessage` ("Validando acceso seguro…" — el JS la va cambiando: "Cargando módulos", "Sincronizando", etc.).
- Línea 274–278 `#loaderSteps`: 3 puntitos de pasos; línea 282 `#loaderSecurityText` ("Conexión protegida") y línea 283 `#loaderVersion` (versión, oculta).
- Línea 288–304 `#appLoader`: segundo loader chiquito tipo tarjeta para operaciones internas. Línea 300 `#appLoaderTitle` ("Procesando solicitud") y línea 301 `#appLoaderMessage` ("Actualizando la información…"). El JS lo prende/apaga sin tapar toda la pantalla.

### Bloque E — Templates: administration, providers, materials-prices (líneas 319–769)

Son moldes invisibles (`<template>` no se ve hasta que el JS los clona dentro de `#dynamicModuleView`).

**`#administrationTemplate` (líneas 319–701) — la consola del admin:**
- Línea 322 botón `data-admin-action="refresh"` (sincronizar) y línea 327 `#adminMetrics` (tarjetitas de conteo arriba).
- Grupo Seguridad (líneas 331–407): sección `users` (líneas 340–362) con buscador línea 354 `#adminUsersSearch`, botón `new-user` línea 356 y tabla línea 360 `#adminUsersContent`; sección `roles` (líneas 364–382) con botón `new-role` línea 376 y línea 380 `#adminRolesContent`; sección `permissions` (líneas 384–405) con combo línea 397 `#adminPermissionRole`, botón `save-permissions` línea 399 y línea 403 `#adminPermissionsContent`.
- Grupo Estructura comercial (líneas 409–529): sección `providers` (líneas 418–463) con 5 botones (líneas 443–457: plantillas, importaciones, nuevo) y línea 460 `#adminProvidersContent`; sección `offices-groups` (líneas 465–527) con tarjetas de Oficinas (línea 502 `#adminOfficesContent`) y Grupos (línea 523 `#adminGroupsContent`).
- Grupo Configuración (líneas 531–617): `modules` (línea 556 `#adminModulesContent`), `catalogs` (línea 579 `#adminCatalogsContent` + botón `new-provider-catalog` línea 572), `visual-resources` (línea 599 `#adminResourcesContent`) y `settings` (línea 613 `#adminSettingsContent`).
- Grupo Auditoría (líneas 619–697): sesiones (líneas 628–665) con buscador línea 642 `#adminSessionsSearch`, filtro estado línea 646 `#adminSessionsState`, botones `refresh-sessions`/`expire-sessions` (líneas 656–661) y tabla línea 663 `#adminSessionsContent`; registros (líneas 667–695) con línea 681 `#adminAuditSearch`, línea 685 `#adminAuditType` y línea 693 `#adminAuditContent`.

**`#providersWorkspaceTemplate` (líneas 704–745):**
- Línea 708 `#providersTemplateButton` (descargar plantilla), 711 `#providersImportButton` + 720 `#providersImportInput` (subir CSV), 714 `#providersExportButton` (exportar), 717 `#providersNewButton` (nuevo proveedor).
- Línea 724 `#providersSummary` (resumen arriba), línea 730 `#providersSearch` (buscador por código/razón social/RUC), línea 734 `#providersStatusFilter` (Todos/Activos/Inactivos), línea 741 `#providersContent` (tabla) y línea 742 `#providersPagination` (paginación).

**`#materialsPricesWorkspaceTemplate` (líneas 748–769):**
- Línea 752 `#mpTabs` con 4 pestañas (líneas 753–756: `summary`, `materials`, `prices`, `lists`).
- Línea 760 `#mpRefreshButton` (actualizar) y línea 767 `#mpRegion` (aquí el JS pinta la pestaña activa).

### Bloque F — `<style>` inline MP (líneas 771–869)

Son los estilos exclusivos de Materiales y Precios, puestos aquí para no tocar los CSS globales:

- Líneas 772–774: pestañas `.mp-tabs` (la activa en celeste `#00A1DE`).
- Líneas 776–780: tarjetas de resumen `.mp-grid` / `.mp-card` y paneles `.mp-panel`.
- Líneas 781–791: formularios `.mp-form-grid` y la burbuja de ayuda `?` (`.mp-field-info` con tooltip).
- Líneas 792–800: tablas `.mp-table` y semáforos `.mp-status` (verde OK/APROBADO, amarillo EN_REVISION, rojo ERROR/RECHAZADO).
- Líneas 806–810: modal lateral derecho `.mp-modal-backdrop` / `.mp-modal` (760px, 1040px en `--wide`).
- Líneas 816–820: barra de progreso de carga masiva.
- Líneas 830–864: filtros, buscadores y layout de subida de archivos + reglas `@media` para celular (líneas 864–865).
- Líneas 867–868: alerta naranja de precios `.mp-price-alert`.

### Bloque G — `<style>` sales/sales29: ventas al contado (líneas 875–1922, en 4 bloques)

Son 4 etiquetas `<style>` seguidas, todas solo para Ventas. Lo importante:

- Bloque 1, líneas 875–1256: base de ventas. Línea 876 `.sales-workspace` (rejilla), 881 `.sales-form-grid` (formulario 2 columnas), 889–891 tarjetas de tipo de venta `.sales-type-card`, 895 tabla de ítems, 901–904 insignias `.sales-badge--ok/pending/warning`, 906–911 acciones de fila, 919 notas azules, 953–962 píldoras de estado, 983 estado por material, 1014–1048 anulación lógica (fila tachada en gris + detalle rojo), 1050–1109 tarjetas financieras de 3 columnas + alerta naranja, 1158–1188 inputs modernos con borde redondeado 15px y foco celeste.
- Bloque 2, líneas 1257–1265: embellece el modal que contiene ventas (esquinas 28px, cabecera degradada celeste, cuerpo `#f8fbff`).
- Bloque 3, líneas 1266–1279: detalle de venta y barra de filtros `.sales-filter-bar` con su versión a 2 columnas y 1 columna en móvil.
- Bloque 4, líneas 1282–1922: el modal grande de "Nueva venta". Líneas 1301–1314: modal de 1360px; líneas 1332–1353 layout de 2 columnas (formulario + sidebar pegajoso); líneas 1346–1368 carrito `.sales29-cart`; líneas 1469–1483 buscador + tarjetas de ofertas `.sales29-offers`; líneas 1556–1698 líneas del carrito (nombre, combo celeste, proveedor, cantidad, precio, botón rojo eliminar, total); líneas 1726–1884 gestión de entrega (datos del cliente en 4 columnas, tarjetas de producto, evidencias, botón anular rojo); líneas 1887–1921 mismo sistema visual para estado/evidencias y botón de archivo celeste.

### Bloque H — `<script src>` locales con versiones (líneas 2011–2025)

Orden de carga (importa, no lo cambies):

- Línea 2012 `js/config.js?v=20260919g`: URL de Supabase y parámetros.
- Línea 2013 `js/supabase-client.js?v=20260919j`: crea `window.supabaseClient`.
- Línea 2014 `js/api-adapter.js?v=20260919k`: decide si usa Supabase real o datos demo.
- Línea 2017 `js/app-core.js?v=20260919k`: el cerebro (login, sidebar, topbar, loaders, modales).
- Línea 2018 `js/modules/admin.js?v=20260919g` → administración.
- Línea 2019 `js/modules/providers.js?v=20260919g` → proveedores.
- Línea 2020 `js/modules/materials-prices.js?v=20260919g` → materiales y precios.
- Línea 2021 `js/modules/sales.js?v=20260919i` → ventas al contado.
- Línea 2022 `js/modules/sales-dashboard.js?v=20260919j` → tablero de ventas.
- Línea 2023 `js/modules/delivery-calendar.js?v=20260919j` → calendario de entregas.
- Línea 2024 `js/modules/dispatch.js?v=20260919i` → despachos.
- Línea 2025 `js/modules/dynamic.js?v=20260919g` → módulos dinámicos creados desde el admin.

### Bloque I — Componentes compartidos + modal Supabase + scripts inline finales (líneas 1934–2074)

**Componentes (líneas 1934–1976):**
- Línea 1934 `#toastRegion`: esquina donde salen los avisitos ("Guardado", "Error", etc.).
- Línea 1936 `#modalRoot` (oculto): modal genérico con línea 1941 `#modalEyebrow`, 1942 `#modalTitle`, 1948 `#modalBody`, 1949 `#modalFooter`. Todo el JS lo reutiliza.
- Línea 1953 `#sideSheetRoot`: panel lateral con `#sideSheetTitle` (1959), `#sideSheetBody` (1965), `#sideSheetFooter` (1966).
- Línea 1970 `#emptyStateTemplate`: dibujito `inbox` + "Sin registros".

**Modal `#modalConfigSupabase` (líneas 1981–2007):** ventana oscura con tarjeta. Línea 1994 `#inputSupabaseUrl`, línea 1998 `#inputSupabaseKey`, botón "Modo Demo" (línea 2001 → `guardarCredencialesSupabase(true)`) y "Guardar y Conectar" (línea 2002 → `guardarCredencialesSupabase(false)`).

**Script inline final (líneas 2028–2074):**
- Líneas 2029–2046 `actualizarIndicadorSupabase()`: pinta el semáforo del topbar (verde "Supabase Conectado" / naranja "Modo Demo") y rellena los inputs del modal.
- Líneas 2048–2065 `guardarCredencialesSupabase(limpiar)`: guarda o borra credenciales y recarga la página.
- Líneas 2067–2073: al cargar, refresh del semáforo y clic en `#badgeSupabaseStatus` abre el modal.

## 4) Conexiones (qué JS usa cada parte)

| Parte del HTML | JS que lo usa | Para qué |
|---|---|---|
| `#authView`, `#authEmail`, `#authPassword`, `#authEmailSubmit`, `#authMessage`, `#authForgotPassword` | `js/app-core.js`, `js/supabase-client.js` | Login, recordar sesión, recuperar contraseña, mensajes de error |
| `#appShell`, `#moduleNavigation`, `#currentModuleTitle`, `#dynamicModuleView`, `#dashboardGreeting` | `js/app-core.js`, `js/modules/dynamic.js` | Mostrar la app, dibujar menú por rol, inyectar cada módulo |
| Sidebar usuario + `#logoutButton`, `#profileButton`, `#profileMenu`, `#profileLogout`, `#profileChangePassword` | `js/app-core.js` | Datos del usuario, abrir/cerrar menú perfil, salir, cambio de clave |
| `#rolePreviewSelect`, `#rolePreviewBanner`, `#rolePreviewExitButton`, `#rolePreviewDetailsButton` | `js/app-core.js`, `js/modules/admin.js` | Simular otro rol sin perder tu sesión |
| `#badgeSupabaseStatus`, `#modalConfigSupabase`, `#inputSupabaseUrl`, `#inputSupabaseKey` | Script inline final + `js/supabase-client.js`, `js/config.js`, `js/api-adapter.js` | Semáforo verde/naranja, guardar URL/Key, modo demo |
| `#globalLoader`, `#loaderMessage`, `#loaderTitle`, `#appLoader` | `js/app-core.js` | Prender/apagar carga y cambiar los textos de progreso |
| `#themeToggleButton`, `#refreshButton`, `#lastSyncLabel` | `js/app-core.js` | Tema claro/oscuro, recargar datos, hora de sincronización |
| `#administrationTemplate` + todos los `admin*Content` | `js/modules/admin.js` | Toda la consola: usuarios, roles, permisos, oficinas, catálogos, auditoría |
| `#providersWorkspaceTemplate`, `#providersSearch`, `#providersContent` | `js/modules/providers.js` | Buscador, tabla, importación CSV, paginación de proveedores |
| `#materialsPricesWorkspaceTemplate`, `#mpTabs`, `#mpRegion` | `js/modules/materials-prices.js` | Pestañas y tablas de materiales, precios y listas |
| Estilos `.sales*` / `.sales29*` (no tienen template aquí, se crean por JS) | `js/modules/sales.js`, `sales-dashboard.js`, `delivery-calendar.js`, `dispatch.js` | Formularios, carrito, entrega, evidencias y tableros de venta |
| `#toastRegion`, `#modalRoot`, `#sideSheetRoot`, `#emptyStateTemplate` | `js/app-core.js` (y todos los módulos) | Avisos, ventanas emergentes, panel lateral y "sin registros" |
| `xlsx`, `Chart.js` (CDN) | `js/modules/admin.js`, `providers.js`, `materials-prices.js`, `sales-dashboard.js` | Plantillas Excel, cargas masivas y gráficos |

## 5) Si quieres cambiar X, toca Y (5 ejemplos prácticos)

1. **Cambiar el título, el logo o el texto del login** → toca líneas 52 (`#authTitle`), 50 y 103 (logos `img/calidda-logo.png`) y 45 (foto `img/arte-gas.jpg`). Solo reemplaza las imágenes en la carpeta `img/` con el mismo nombre y listo.
2. **Pasar de DESARROLLO a PRODUCCIÓN o minimizar el menú** → toca línea 109 (`#appEnvironment`: escribe PRODUCCIÓN) y líneas 93–106 (`#sidebarBrandToggle` para el comportamiento de colapsar). No toques el JS.
3. **Forzar que todos vean los estilos nuevos** → toca líneas 23–24 y 2012–2025: súbele la versión al `?v=` (ej. `?v=20260920a`). Es el truco para que el navegador no use la caché vieja.
4. **Cambiar colores o tamaño de las pantallas de Ventas o Materiales** → toca solo los `<style>` inline: líneas 771–869 para Materiales (ej. línea 774 color `#00A1DE` de la pestaña activa) y líneas 875–1922 para Ventas (ej. línea 1360 bordes del carrito, línea 1521 tamaño del precio). No toques `css/*.css`.
5. **Conectar el Supabase real o volver a Demo** → no edites código: haz clic en el semáforo `#badgeSupabaseStatus` (línea 158) del topbar, pega URL (línea 1994) y Key (línea 1998) y pulsa "Guardar y Conectar". Para demo, botón "Modo Demo". Si quieres cambiar las credenciales por defecto para todos, toca `js/config.js` (línea 2012).
