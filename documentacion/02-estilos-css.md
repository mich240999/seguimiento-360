# 02 — Estilos CSS: `css/app-styles.css` y `css/prov-styles.css`

## 1) Para qué sirve

Estos dos archivos son **toda la apariencia** de Seguimiento 360. No hay framework CSS (no hay Bootstrap ni Tailwind): todo el diseño está escrito a mano aquí.

- **`css/app-styles.css` (2071 líneas):** es el archivo maestro. Define la paleta de colores de Cálidda, el login, el menú lateral (sidebar), la barra superior (topbar), las tarjetas, tablas, botones, formularios, modales, toasts, el acordeón del panel Admin y **todo el modo oscuro**. Si este archivo falla o no carga, la app se ve sin formato.
- **`css/prov-styles.css` (285 líneas):** es el archivo del módulo **Proveedores** (y de la importación masiva de proveedores). Reutiliza las variables del archivo maestro y agrega solo lo que ese módulo necesita: su cabecera, sus tarjetas de resumen, su tabla ancha, sus combos con buscador y sus pantallas de importación masiva.

En lenguaje simple para el dueño del proyecto:

| Si usted ve en pantalla... | ...sale de este archivo |
|---|---|
| Los celestes de Cálidda, los bordes redondeados, las sombras suaves | `app-styles.css` líneas 1–30 (variables `:root`) |
| La pantalla de login dividida (imagen a la izquierda, formulario a la derecha) | `app-styles.css` líneas 1653–1817 (`.auth-split`) |
| El menú celeste de la izquierda y la barra blanca de arriba | `app-styles.css` líneas 233–301 y 1028–1146 |
| Las tablas con cabecera celeste y los botones que son solo un ícono con cartelito al pasar el mouse | `app-styles.css` líneas 511–527 y 302–336 |
| Las ventanas que flotan (modal), el panel que entra por la derecha (side-sheet) y los avisos de abajo a la derecha (toast) | `app-styles.css` líneas 576–593 |
| El panel Admin que se abre y cierra por secciones | `app-styles.css` líneas 470–494 |
| El modo oscuro (fondo casi negro) | `app-styles.css` líneas 1551–1566 y 1819–2071 |
| La pantalla Proveedores: buscador, tabla, paginación, combos de sedes | `prov-styles.css` completo |
| Que todo se acomode en celular | `app-styles.css` líneas 609–715, 1173–1186, 1268–1297, 1440–1457 + `prov-styles.css` líneas 61–69, 276–285 |

---

## 2) Mapa

### 2.1 `css/app-styles.css` (2071 líneas)

| Líneas | Bloque | Qué hace |
|---|---|---|
| 1–30 | `:root` original | Paleta Cálidda, superficies, sombras, radios, anchos del menú y alto del encabezado. Es la “fuente de la verdad” de colores y medidas. |
| 32–56 | Base + `.eyebrow` | `box-sizing`, tipografía Manrope/Inter, color de texto, etiqueta pequeña en mayúsculas (“OJITO” / subtítulo). |
| 58–120 | Login clásico `.auth-view` / `.auth-panel` | Login de dos columnas: panel de formulario + botones de proveedor (Google/Microsoft) y formulario de correo Supabase. |
| 121–144 | `.auth-visual` | Panel arte degradado celeste con puntos, órbitas y tarjetas flotantes decorativas. Hoy oculto en el diseño final. |
| 146–147 | `.inline-message` | Mensaje de error/éxito dentro del login. |
| 149–231 | `.global-loader` | Pantalla de carga inicial a pantalla completa (fondo degradado + tarjeta blanca + logo con órbitas + barra de progreso). Incluye sus `@keyframes`. |
| 233–283 | `.app-shell` / `.app-sidebar` / `.app-main` | Estructura principal: grilla `menú + contenido`, menú lateral fijo color `#075b78`, navegación por módulos, pie con avatar de usuario. |
| 284–301 | `.topbar` / `.icon-button` | Barra superior blanca con blur, título y botones de acción. Define el botón solo-ícono base (39×39 px). |
| 302–336 | `.has-tooltip` + `data-tooltip` | **Sistema de tooltips**: cartelito oscuro que sale de cualquier elemento con `class="has-tooltip"` y `data-tooltip="texto"`. Posiciones `bottom/top/right`. |
| 338–388 | `.profile-button`, `.role-preview-*` | Avatar circular, selector “ver como rol” y banner de vista previa de rol. |
| 390–427 | `.detail-list`, `.preview-*` | Listas detalle etiqueta/valor y tarjetas de vista previa de permisos por módulo. |
| 429–457 | `.sync-indicator`, `.hero-card`, `.metric-grid`, `.module-card` | Pastilla de conexión, tarjeta héroe degradada, grilla de 4 métricas y grilla de 3 tarjetas de módulo. |
| 458–468 | `.section-header`, `.button` | Título de sección + 4 variantes de botón: `--primary`, `--secondary`, `--danger`, `--ghost`. |
| 470–494 | `.admin-accordion` | Acordeón del Admin: grupo, encabezado, ítem, disparador (`accordion-trigger`), ícono, contador y flecha que rota. |
| 495–509 | `.toolbar`, `.search-field`, `.field`, `.form-grid` | Barra de búsqueda + filtros, campos etiquetados y grilla de formulario de 2 columnas. |
| 511–527 | `.data-table`, `.table-button`, `.chip`, `.skeleton` | Tabla estándar (cabecera celeste sticky, filas hover), botón mini de tabla (32×32 px), pastillas de estado y esqueleto de carga. |
| 529–574 | Permisos, switch, organización, import | Filas de permisos con interruptor (`.switch`), tarjetas constructoras, tarjetas de organización, notas de importación. |
| 576–593 | Modales / side-sheets / toasts | `.modal-root` (centrado, z 420), `.side-sheet-root` (derecha, z 300), `.toast-region` (abajo-derecha, z 500). |
| 594–607 | `.catalog-values-*`, `.empty-state` | Estados de carga/error/vacío de catálogos. |
| 609–654 | `@media (min-width: 861px)` colapsado | Modo “rail” en desktop: el menú se angosta a 82 px y oculta textos. |
| 656–665 | `@media (max-width: 1120px)` | Primer ajuste tablet: métricas 2 col, tarjetas 2 col, organización 1 col. |
| 666–683 | `@media (max-width: 860px)` | Tablet vertical: login 1 col (oculta arte), sidebar se vuelve panel deslizante con `backdrop`. |
| 684–712 | `@media (max-width: 640px)` | Celular: topbar compacta, todo a 1 columna, modal se vuelve hoja inferior. |
| 713–715 | `prefers-reduced-motion` | Apaga animaciones para usuarios con sensibilidad al movimiento. |
| 718–796 | `.app-loader` | Cargador interno semitransparente (deja ver el trabajo al 50 %) con tarjeta pequeña y spinner. Distinto del `global-loader`. |
| 798–958 | `.visual-resource-dictionary` | Diccionario visible de imágenes/íconos/banners (acordeón `<details>` de 2 columnas). |
| 960–970 | `@media (max-width: 760px)` | Ese diccionario pasa a 1 columna; ajusta `app-loader`. |
| 975–1019 | Segundo `:root` + ajustes compactos | Sobrescribe variables (fondo, bordes, sombras, radios, `--sidebar-width: 250px`, `--app-header-height: 74px`) y compacta casi todo. Gana por estar después en cascada. |
| 1021–1171 | Propuesta editorial | Convierte el sidebar en “pastilla flotante” con margen y radio 18 px, y el topbar en tarjeta flotante con blur. Redefine héroe, métricas y tablas. |
| 1173–1186 | `@media 920px / 620px` editorial | En tablet/móvil el shell vuelve a 1 columna y el sidebar es deslizante. |
| 1188–1234 | Variante celeste | Degradado celeste `#0a9ec1 → #075d7b` en sidebar, botón colapsar circular blanco y botones primarios con degradado. |
| 1236–1266 | `@media (min-width: 1025px)` rail final | Medidas exactas del rail colapsado (44 px por botón, logo 38 px). |
| 1268–1297 | `@media (max-width: 1024px / 620px)` | Menú deslizante completo en tablet/teléfono; oculta botón colapsar. |
| 1299–1338 | `.sidebar-logo-button` | El logo mismo es el botón para colapsar/expandir el menú (sin flecha aislada). |
| 1340–1402 | Login con foto sede | Fondo `../img/calidda-building.png` + tarjeta blanca glass centrada. Es una etapa intermedia del login. |
| 1404–1425 | `.supabase-auth-form.is-open` | Apertura progresiva del formulario de correo (anima `max-height`/opacidad, evita salto de contenido). |
| 1427–1438 | Alineación logo/nav | Centra el logo con los íconos de navegación en modo colapsado. |
| 1440–1457 | Contención móvil | `overflow-x: hidden` + tablas con scroll propio para que nada rompa el ancho en celular. |
| 1461–1478 | `select[multiple]`, `.button--small`, `.detail-grid` | Multiselect alto, botón pequeño y grilla detalle 2 col. |
| 1480–1494 | `label.input-field` (Ventas) | Equipa la clase de Ventas a `.field`: mismo alto, borde, foco y ayuda. Sin esto los textbox se veían genéricos. |
| 1496–1515 | `.profile-menu` | Menú del avatar (cambiar contraseña / cerrar sesión), con variante peligro roja. |
| 1517–1549 | `body .auth-view` login moderno | Tarjeta centrada de 480 px sobre fondo degradado corporativo. Etapa previa al split; hoy la tapa el bloque siguiente por especificidad. |
| 1551–1566 | Modo oscuro base | `body.dark-mode`: cambia `color-scheme` y 8 variables, más topbar/modal/toast, héroe, tablas, formularios y login. |
| 1653–1817 | **Login split (diseño vigente)** | Grilla 50/50: panel arte full-bleed a la izquierda + formulario limpio a la derecha (campos subrayados, botón píldora). Incluye su dark mode y su responsive. Ver detalle abajo. |
| 1819–2071 | **Modo oscuro completo** | Cubre todas las superficies (app, providers, MP, sales/sales29, dashboard, calendario, despacho) con `!important`. Ver detalle abajo. |

### 2.2 `css/prov-styles.css` (285 líneas)

| Líneas | Bloque | Qué hace |
|---|---|---|
| 1–10 | `.providers-workspace`, `header`, `summary`, `panel` | Contenedor del módulo, cabecera alineada a la derecha y 3 tarjetas de resumen (total, activos, etc.). |
| 11–20 | `toolbar`, `table-wrap`, `row-actions`, `pagination` | Buscador + filtro, tabla con scroll y ancho mínimo 1120 px, botones de fila de 34 px y paginación. |
| 21–34 | Detalle + sedes | Grilla detalle 2 col, chips de sedes y lista de sedes con `:has(input:checked)` (se pinta celeste la elegida). |
| 36–54 | Combos multi con buscador | Selector múltiple (sedes, rubros): botón disparador, panel con buscador, botones todos/ninguno y opciones con check. |
| 55–60 | Confirmación / ayudas | Confirmación verde de guardado, texto ayuda y nota amarilla de importación. |
| 61–69 | `@media (max-width: 860px)` | Todo a 1 columna, paginación vertical. |
| 71–88 | `.modal-card--wide`, `office-loading` | Modal ancho 1120 px y estados cargando/error de sedes. |
| 90–120 | `mass-import-*` estados y archivo | Pantallas cargando/fatal/éxito, tarjeta del archivo Excel/CSV. |
| 121–148 | Resumen + toolbar importación | Grilla de 5 (o 4 en resultado) tarjetas de conteo y filtros tipo píldora. |
| 149–174 | `.mass-import-filter.is-active` | Filtro activo en celeste; contador interno. |
| 175–208 | `.mass-import-table` | Tabla de previsualización con cabecera sticky y anchos fijos por columna. |
| 209–226 | Badges + mensajes | `crear / actualizar / sin-cambios / error` y listas de errores (rojo) y advertencias (marrón). |
| 227–251 | `.mass-import-changes` | Detalle antes/después: rojo tachado (`del`) vs verde (`ins`). |
| 252–274 | Paginación, aprobación, generado | Paginación, nota de aprobación (error/listo/procesando) y lista de archivos generados. |
| 276–285 | `@media 900px / 620px` | Resumen 2 col → 1 col; toolbar y paginación verticales. |

---

## 3) Detalle por bloques

### 3.1 Variables `:root` — la paleta Cálidda (app-styles.css 1–30, 975–986, 1022–1026)

El primer bloque (líneas 1–30) es el más importante para el dueño: **si quiere cambiar el color de la marca, es aquí**.

```css
--primary-50: #f2fbfe;   /* celeste casi blanco: fondos suaves, hover de filas */
--primary-100: #e2f6fc;  /* celeste pálido: fondos de íconos, badges */
--primary-200: #bdeaf6;
--primary-300: #86d5eb;  /* bordes hover, ícono de empty-state */
--primary-400: #48bce0;  /* foco de inputs (anillo) */
--primary-500: #00a1de;  /* ★ AZUL CÁLIDDA principal: botones, links, loader */
--primary-600: #0088bc;  /* botón primario en reposo, banner */
--primary-700: #006f99;  /* botón hover, títulos, eyebrow */
--primary-800: #075b78;  /* sidebar original, cabecera de tabla, héroe */
--primary-900: #0c485e;  /* texto sobre celeste pálido */
```

Qué significa cada grupo:

- **`--primary-50 → 900`**: escala del celeste corporativo. Del más claro (fondos) al más oscuro (menú). El corazón es `--primary-500: #00a1de`.
- **`--surface: #ffffff`**: tarjetas, modales, tablas.
- **`--background: #f5fafc`**: fondo general de la app (gris-celeste muy claro).
- **`--surface-soft: #f8fcfd`**: fondos de búsqueda, detalle, cabeceras secundarias.
- **`--ink: #172a35`**: color del texto principal (casi negro azulado).
- **`--muted: #607785`**: texto secundario (grises azulados).
- **`--border: #dceaf0`**: todos los bordes.
- **`--success: #15805c` / `--warning: #c98212` / `--danger: #c43d4b`**: verde / ámbar / rojo de estados.
- **`--shadow-sm / --shadow-md`**: sombras suaves corporativas.
- **`--radius-sm 10px / --radius-md 16px / --radius-lg 24px`**: qué tan redondeadas son las esquinas.
- **`--sidebar-width: 276px` / `--sidebar-collapsed-width: 82px` / `--app-header-height: 86px`**: medidas del menú y la barra.
- **`--transition: 180ms ease`**: velocidad de todas las animaciones pequeñas.

> Ojo dueño: hay **dos `:root` más abajo que pisan al primero** (líneas 975–986 y 1022–1026). El segundo deja todo más compacto (`--sidebar-width: 250px`, radios 8/12/18, sombras más suaves) y el tercero agrega `--workspace-gutter`. Por regla de cascada, **el último valor gana**. No borre el primero: es el fallback.

En modo oscuro (`body.dark-mode`, líneas 1552–1566) esas mismas variables se redefinen a oscuro:

```css
--primary-50: #0e2a36; --surface: #101e27; --background: #0a141b;
--surface-soft: #14242f; --ink: #e9f4f8; --muted: #8fb0bd; --border: #1f3644;
```

Así toda la app que usa `var(--surface)`, `var(--ink)`, etc. cambia de tema **sin tocar cada regla una por una**.

### 3.2 Layout login (app-styles.css 58–144, 1340–1549, 1653–1817)

Hay **4 generaciones de login superpuestas** en el mismo archivo. La vigente es la última. Importa entenderlo para no confundirse:

1. **Login clásico (58–120):** `.auth-view` en grilla `520px + resto`. Panel con marca, título grande, `.provider-button` (Google/Microsoft, 54 px de alto) y `.supabase-auth-form` (correo/clave). Simple y funcional.
2. **Arte decorativo (121–144):** `.auth-visual` con degradado, trama de puntos (`::before`), dos órbitas (`.visual-orbit--one/two`) y tarjetas flotantes (`.visual-card--main/small/top/bottom`). Hoy oculto con `display: none` (líneas 1382, 1529).
3. **Etapas intermedias (1340–1549):** primero foto de la sede (`../img/calidda-building.png` como fondo + tarjeta glass), luego tarjeta moderna centrada de 480 px sobre degradado corporativo. Ambas siguen en el archivo pero son tapadas por la siguiente por mayor especificidad (`body .auth-view.auth-split ...` les gana).
4. **Login split vigente (1653–1817) — el que usted ve hoy:**
   - Línea 1655: `body .auth-view.auth-split { display: grid; grid-template-columns: 50% 50%; height: 100dvh; overflow: hidden; background: #fff; }`. Mitad y mitad, sin scroll, alto exacto de pantalla.
   - Líneas 1663–1669 `.auth-brand-panel`: panel izquierdo full-bleed con degradado gas `(#041e2c → #00a1de → #2ec4b6)`. Línea 1670–1673 `.auth-brand-art`: imagen que cubre todo (`object-fit: cover`). Líneas 1674–1676 ocultan textos viejos.
   - Líneas 1679–1699 `.auth-form-panel`: panel derecho blanco, centrado vertical, sin bordes ni sombras, padding fluido.
   - Líneas 1702–1773 formulario: `.login-field` (ícono + input solo con **borde inferior** de 2 px; al enfocar se vuelve celeste), `.login-remember-row`, `.login-submit` (botón **píldora** `border-radius: 999px` con degradado, se eleva al hover), `.auth-footnote` gris y `.inline-message` de error.
   - Líneas 1776–1784 dark del split; 1787–1817 responsive (en ≤900 px el arte es solo una franja de 220/170 px arriba y el formulario va debajo).

### 3.3 App-shell / Sidebar / Topbar (app-styles.css 233–301, 1028–1146, 1188–1338)

- **Estructura (233–236, 1028–1032):** `.app-shell { display: grid; grid-template-columns: var(--sidebar-width) 1fr; }`. Columna 1 = menú, columna 2 = contenido. La propuesta editorial (1028) le suma 12 px y fondo `#edf5f7`.
- **Sidebar (237–282):** `.app-sidebar` fijo (`position: sticky; height: 100vh`), originalmente `#075b78` plano; en la variante vigente (1190–1194) es degradado celeste `linear-gradient(160deg, #0a9ec1, #087d9f, #075d7b)` con brillo `::before` y forma de pastilla flotante (`margin: 12px; border-radius: 18px`). Contiene:
  - `.sidebar-brand` (242–256): logo blanco 46 px + nombre. El botón colapsar (257–262) es un cuadrado blanco que “muerde” el borde (`right: -15px`); en la variante celeste (1213–1225) es **círculo** `#ecfbfe` con `!important`.
  - `.module-navigation` (264) + `.nav-group-title` (266) + `.nav-item` (267–275): botón de módulo 45 px, texto `#cdebf4`, hover blanco translúcido, activo con degradado + barra lateral `inset 3px 0 0 #73dbf5` (línea 273). En la variante editorial el activo es tarjeta casi blanca con texto `#063f56` (1099–1105).
  - `.sidebar-footer` (276–282): avatar 36 px + nombre/correo con `ellipsis`.
- **Novedad `.sidebar-logo-button` (1300–1328):** el logo mismo es el interruptor del rail. Sin flecha separada. Tiene hover que lo levanta y foco accesible.
- **Topbar (284–290, 1119–1131):** barra pegajosa (`sticky`) con blur (`backdrop-filter: blur(15px)`), título y `.topbar-actions`. En la variante vigente es tarjeta flotante (`margin: 12px; border-radius: 14px; border: #e0ecef`).
- **Colapsado desktop (609–654, 1236–1266):** `.app-shell.is-sidebar-collapsed` cambia la grilla a 82 px, centra logos (`left: 50%; translateX(-50%)`), oculta textos (`display: none`) y deja botones de 48 px. Es el “modo íconos”.

### 3.4 Tablas y botones — `.table-button`, `.icon-button`, `.has-tooltip`

**Tablas (511–517, 1161–1163 + prov-styles 12–13, 175–208):**

```css
.data-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.data-table th { position: sticky; top: 0; background: var(--primary-50); color: var(--primary-800);
  font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
.data-table td { padding: 11px 12px; background: #fff; border-bottom: 1px solid var(--border); }
.data-table tbody tr:hover td { background: var(--primary-50); }
```

La cabecera queda pegada al hacer scroll, el texto es mayúscula pequeña y la fila se ilumina al pasar el mouse. `.data-region` (511) es el contenedor con scroll horizontal. Proveedores exige `min-width: 1120px` (prov 13) para que no se aplasten sus columnas; importación masiva usa su propia `.mass-import-table` con `max-height: 52vh` y anchos fijos (prov 175–208).

**Patrón de botones solo-ícono (dos tamaños, misma idea):**

| Clase | Líneas | Medida | Dónde se usa |
|---|---|---|---|
| `.icon-button` | 294–295 + prov 18 | 39×39 px (34×34 en filas de proveedores) | Topbar, buscadores, acciones generales. Gris (`--muted`), hover celeste pálido. |
| `.table-button` | 519–522 | 32×32 px | Dentro de cada fila de tabla (ver, editar, borrar). Celeste `--primary-700`, hover `--primary-100`. Deshabilitado: opaco y sin hover. |
| `.sidebar-collapse-button` | 257–262, 1213–1225 | 31 px → 28 px círculo | Colapsar el menú. |

Regla de oro del patrón: **un botón solo-ícono nunca va sin explicación**. Por eso siempre lleva `has-tooltip` + `data-tooltip`.

**Sistema de tooltips (302–336) — cómo funciona:**

```html
<button class="table-button has-tooltip" data-tooltip="Editar" data-tooltip-position="bottom">...</button>
```

1. `.has-tooltip { position: relative; }` (303) crea el ancla.
2. `.has-tooltip::after { content: attr(data-tooltip); ... }` (304–311) genera el cartelito solo con CSS: toma el texto del atributo `data-tooltip`, fondo `#173846`, texto blanco 11 px, sombra, `opacity: 0` e `pointer-events: none` (no estorba el clic).
3. `data-tooltip-position` elige dónde sale: `bottom` (312–314, centrado debajo), `top` (315–317, arriba a la derecha), `right` (318–320, al costado centrado vertical).
4. Al pasar el mouse o enfocar con teclado (`:hover`, `:focus-visible`, 321–336) aparece con pequeña animación de desplazamiento. Es accesible por teclado, no solo mouse.

Si el tooltip se corta dentro de una tabla con scroll, es porque el contenedor tiene `overflow: auto`: mueva el botón o use `position: top` en esa fila.

### 3.5 Formularios (app-styles.css 495–509, 1461–1494 + prov-styles 36–54)

- `.toolbar` (495): fila `búsqueda + filtros + botón`. En móvil se apila (702).
- `.search-field` (497–499): caja con ícono, fondo `--surface-soft`, foco con anillo celeste. El `input` interno es transparente sin borde.
- `.select-field` / `.field` (500–506): etiqueta gris 11 px + control 41 px blanco con borde. Foco idéntico al buscador. `.form-grid` (507) es grilla 2 col; `.field--full` ocupa todo el ancho; `.checkbox-field` (509) alinea checks.
- `label.input-field` (1482–1494, módulo Ventas): réplica exacta para que Ventas se vea igual. Incluye `textarea` 92 px, `input[type=file]` y `small` de ayuda. `.span-2` equivale a `.field--full`.
- `select[multiple]` (1461–1468): 150 px de alto con opciones redondeadas.
- Combos de Proveedores (prov 36–54): `.providers-combo-trigger` (botón 42 px con texto + contador + flecha), `.providers-combo-panel` (caja con buscador, botones todos/ninguno y lista con scroll 210 px). La opción elegida se marca con `:has(input:checked)` en celeste (líneas 32, 49). Es el único lugar que usa `:has()`, soportado en navegadores modernos.

### 3.6 Modales / Side-sheets / Toasts (app-styles.css 576–593)

Los tres comparten la receta “capa fija + fondo oscuro + tarjeta blanca”, solo cambia la posición y el `z-index`:

| Componente | Líneas | Comportamiento |
|---|---|---|
| `.modal-root` | 578, 580–581 | Fijo, `z-index: 420`, centra (grid), padding 22 px. `.modal-card`: 680 px máx, alto máx `100vh-44px`, columna flexible, radio 20 px. En celular (710–711) se pega abajo como hoja (`border-radius: 20px 20px 0 0`). `.modal-card--wide` (prov 71) llega a 1120 px para Proveedores. |
| `.side-sheet-root` / `.side-sheet` | 577, 586–587 | Fijo, `z-index: 300` (debajo del modal). Alineado a la derecha, 560 px, alto 100 %, sombra lateral. Ideal para formularios largos sin tapar todo. |
| `.modal-backdrop` / `.side-sheet-backdrop` | 579 | Velo `rgba(10,39,51,.45)` con blur 4 px. Cierra al hacer clic. |
| `.modal-header/body/footer` | 582–585 | Cabecera y pie fijos, cuerpo con scroll propio. El pie alinea botones a la derecha. |
| `.toast-region` / `.toast` | 588–593 | Fijo abajo-derecha, `z-index: 500` (lo más alto), 390 px. Tarjeta con borde izquierdo celeste 4 px (rojo en `.is-error`), animación `toastIn` (sube 10 px). |

Orden de capas memorizable: **side-sheet (300) < modal (420) < toast (500) < loader inicial (1000)**.

### 3.7 Acordeón Admin (app-styles.css 470–494)

Es el corazón visual del panel Admin:

- `.admin-accordion` (470): grilla con 18 px entre grupos.
- `.admin-section-heading` (472–481): ícono 38 px celeste + título 15 px + descripción gris.
- `.accordion-item` (483): tarjeta blanca con borde y sombra suave, `overflow: hidden` para que el contenido no se salga al animar.
- `.accordion-trigger` (484–486): botón 76 px que ocupa todo el ancho; hover celeste; abierto (`aria-expanded="true"`) con degradado + borde inferior.
- `.accordion-icon` (487) 42 px, `.accordion-label` (488–490) título + ayuda, `.accordion-count` (491) píldora con conteo, `.accordion-chevron` (492–493) flecha que rota 180° al abrir.
- `.accordion-panel` (494): contenido con 18 px de padding (13 px en móvil, 709).

El estado abierto/cerrado lo pone JavaScript con `aria-expanded`; el CSS solo reacciona a ese atributo. Accesible por teclado.

### 3.8 Modo oscuro completo — qué cubre y cómo gana (app-styles.css 1551–1566, 1776–1784, 1819–2071)

Hay **tres capas**, de menor a mayor fuerza:

1. **Base (1552–1566):** `body.dark-mode` redefine 8 variables (superficies a `#101e27/#0a141b`, texto a `#e9f4f8`, bordes a `#1f3644`) y ajusta topbar, modal, side-sheet, toast, héroe, tablas, formularios y login. Todo lo que usa `var(--...)` cambia solo.
2. **Split login (1776–1784):** fondo `#0f1720`, panel `#162029`, inputs transparentes claros, bordes `#334155`.
3. **Completo (1819–2071) — el bloque grande con comentario “todas las superficies”:**
   - 1822–1837: shell, sidebar (degradado oscuro), topbar con `!important`, eyebrow, sync, icon-button, `select option` (fondo oscuro para el desplegable nativo).
   - 1840–1937: **lista gigante de ~90 selectores** (métricas, módulos, acordeones, providers, MP, sales/sales29, calendario `dc360-*`, despacho `sd360-*`, detalle, combos) forzados a `background: var(--surface) !important; border-color: var(--border) !important; color: var(--ink);`. El `!important` es deliberado: esos módulos tenían **fondos blancos fijos** (`background: #fff`) o vidrio de `config.js` que un selector normal no podía pisar.
   - 1939–1970: tablas (cabeceras a `--surface-soft`, celdas a `--surface`, hover a `--surface-soft`), chips con borde, triggers de acordeón.
   - 1972–1996: **todos** los `input/select/textarea` dentro de `.app-main` a `--surface-soft` con `!important`; placeholders a `#64748b`; deshabilitados a `#0c161e`; botones secundarios/fantasma adaptados.
   - 1998–2029: textos que quedaban invisibles (h1–h5, precios, totales) a blanco/muted con y sin `!important` según el caso.
   - 2031–2050: banners de estado en versión translúcida (ámbar/celeste/rojo/verde con `rgba`) para que se lean en oscuro.
   - 2052–2071: tabs MP, labels, progress, loader y diálogos.

**¿Cómo gana por especificidad?** Tres mecanismos combinados:

1. **Clase en `body`:** `body.dark-mode .app-main .data-table td` (0,3,1) siempre le gana a `.data-table td` (0,1,1), aunque el modo oscuro esté antes en el archivo.
2. **`!important` quirúrgico:** solo donde el fondo original era fijo (`#fff`) o venía de JS con glass. No se abusa en textos normales.
3. **Alcance `.app-main`:** evita teñir el login o el loader por accidente; el login tiene sus propias reglas (1776+).

Para desactivar el modo oscuro en un módulo nuevo, no quite el bloque: agregue su selector a la lista 1840–1924.

### 3.9 Responsive — cómo se adapta (app-styles.css 609–712, 960, 1173–1297, 1440–1457 + prov 61–69, 276–285)

| Punto de corte | Qué pasa |
|---|---|
| `≥861px` colapsado (609–654, 1236–1266) | Rail de 82 px, textos ocultos, botones 48/44 px. |
| `≤1120px` (656–665) | Métricas y tarjetas a 2 col, login más angosto, organización a 1 col. |
| `≤1024/920px` (1173–1178, 1269–1290) | Sidebar deja de ser columna y es **panel deslizante** (`translateX(-105%)`, `.is-open` lo muestra) con velo. Botón colapsar oculto. |
| `≤860px` (666–683 + prov 61–69) | Login 1 col sin arte, shell 1 col, constructores a 1 col, proveedores todo a 1 col. Aparecen `.sidebar-close` y `.mobile-only`; se oculta `.desktop-only`. |
| `≤760/720px` (960–970, 1441–1457) | Diccionario a 1 col; **contención móvil**: `overflow-x: hidden` en `html/body` y scroll propio en cada tabla; botones que no desbordan. |
| `≤640/620px` (684–712, 1180–1297, prov 281–285) | Topbar compacta, métricas/tarjetas/formularios a 1 col, modal como hoja inferior, resumen de importación a 1 col, `hero-icon` oculto, `sync-indicator` oculto. |
| `≤560px` + `max-height: 760px` (split, 1801–1817) | Franja arte 170 px, logo 150 px, título 22 px; en pantallas bajas se compacta el formulario. |
| `prefers-reduced-motion` (713–715) | Todo a `.01ms`: sin animaciones. |

---

## 4) Conexiones

- **Con `index.html`:** las clases documentadas aquí son las que el HTML usa. Ejemplos: `#authView.auth-split > .auth-brand-panel + .auth-form-panel`, `#sidebar.app-sidebar`, `#topbar.topbar`, `#adminMetrics.metric-grid`, `.data-table` en cada módulo, `.modal-root/.side-sheet-root/.toast-region` como portales al final del `body`.
- **Con `js/`:** JavaScript solo **prende/apaga clases**; el CSS hace el dibujo. Clases que JS alterna: `.is-open` (sidebar móvil, combos, `supabase-auth-form`), `.is-active` (nav, filtros, role-preview), `.is-sidebar-collapsed` (rail), `[aria-expanded]` (acordeón), `.is-leaving/.is-visible` (loaders), `.is-error` (toast/mensajes), `body.dark-mode` (tema). Si un botón “no hace nada visual”, revise en el inspector si la clase llegó.
- **Con `img/`:** el login usa `../img/calidda-building.png` (línea 1356, etapa foto) y el arte split usa `.auth-brand-art` (imagen puesta por HTML/JS). El logo del sidebar (`.sidebar-logo-image`) y del login (`.auth-form-logo img`) salen de `img/`.
- **Entre los dos CSS:** `prov-styles.css` **no redefine variables**, las consume (`var(--border)`, `var(--primary-800)`, `var(--shadow-sm)`...). Por eso el modo oscuro y el cambio de marca le llegan gratis, salvo los fondos `#fff` fijos que el bloque 1819+ corrige con `!important`.
- **Con Supabase/datos:** `.sync-indicator` + `.status-dot(--ok)` muestran el estado de conexión; `.skeleton`, `.catalog-values-loading`, `.empty-state` y `.mass-import-*` son los estados de carga/vacío/error de datos.

---

## 5) Si quieres cambiar X, toca Y

1. **Cambiar el color de marca (el celeste Cálidda por otro):**
   Toque `app-styles.css` líneas **7 (`--primary-500`)**, **8 (`--primary-600`)** y **10 (`--primary-800`)**. Con esos tres cambia botones, sidebar y cabeceras. Si quiere un rebranding total, cambie la escala completa 2–11. No toque cada botón uno por uno: todos usan `var(--primary-*)`. Verifique también el degradado del sidebar (línea 1191) y del héroe (línea 1232), que tienen hex fijos.

2. **Ajustar el modo oscuro (ej.: “se ve gris, lo quiero más negro”):**
   Toque `app-styles.css` líneas **1552–1566** (`--background: #0a141b`, `--surface: #101e27`). Para un módulo nuevo que quedó blanco en oscuro, **agregue su selector** a la lista de líneas **1840–1924** (copie el patrón `body.dark-mode .app-main .mi-clase`). No quite los `!important` de ese bloque: son los que vencen a los `#fff` fijos.

3. **Hacer los botones más grandes o más chicos:**
   Toque línea **461 (`.button`: `min-height: 40px`)**, **294 (`.icon-button`: 39 px)** y **519 (`.table-button`: 32 px)**. Para compactar toda la app de una vez, use la línea **1003** (`.button { min-height: 38px }`) que ya es el override compacto. En Proveedores los botones de fila se afinan en `prov-styles.css` línea **18** (34 px).

4. **Cambiar el login (logo, textos, alto de la imagen):**
   Toque `app-styles.css` líneas **1687–1699** (logo + título + subtítulo) y **1793–1795** (alto de la franja de arte en móvil: 220 px). El botón píldora está en **1751–1758** (`.login-submit`); para hacerlo rectangular cambie `border-radius: 999px` por `12px`. Los campos subrayados están en **1713–1720** (`.login-field`).

5. **Cambiar tablas (encabezado, densidad, ancho en Proveedores):**
   Toque líneas **513 (`th`: fondo `--primary-50`, mayúsculas)** y **516 (`td`: padding 11 px)**. Para tablas más densas baje a `8px` (ver el override compacto en 1006–1007). Si una columna de Proveedores se aprieta, toque `prov-styles.css` línea **13** (`min-width: 1120px`) o los anchos fijos de importación masiva (líneas **205–207**). Los tooltips de los botones de fila se editan en 302–336 sin tocar JS: basta cambiar `data-tooltip` en el HTML.

6. **(Extra) Cambiar el menú lateral colapsado:**
   Toque líneas **27 (`--sidebar-collapsed-width: 82px`)** y **637–640 (`.nav-item` 48 px en rail)**. Si el texto cortado molesta, revise 625–630 (qué se oculta). El logo-botón está en 1300–1328.

---

*Archivo generado para el dueño del proyecto. Fuentes leídas completas: `css/app-styles.css` (2071 líneas) y `css/prov-styles.css` (285 líneas). Última revisión: setiembre 2026.*
