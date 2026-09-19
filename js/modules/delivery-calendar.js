/**
 * SEGUIMIENTO 360 — CALENDARIO DE ENTREGAS
 *
 * Módulo de lectura: muestra las entregas programadas en un calendario
 * mensual para el personal de reparto. Reutiliza la misma fuente del
 * módulo VENTAS_CONTADO y la misma línea visual del sistema
 * (sales-card, section-header, mp-status, buttons). No modifica registros.
 */

var DC360_STATE = {
  module: null,
  rows: [],
  year: 0,
  month: 0,
  selectedDay: "",
  filters: { texto: "", estadoEntrega: "TODOS", oficina: "TODOS" }
};

var DC360_MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
var DC360_WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Abre el workspace del calendario. Punto de entrada llamado desde app-core.
 */
function openDeliveryCalendarWorkspace(module) {
  var today = new Date();
  DC360_STATE.module = module || null;
  DC360_STATE.year = today.getFullYear();
  DC360_STATE.month = today.getMonth();
  DC360_STATE.selectedDay = dc360DayKey(today.getFullYear(), today.getMonth(), today.getDate());
  DC360_STATE.filters = { texto: "", estadoEntrega: "TODOS", oficina: "TODOS" };

  setActiveView("dynamicModuleView");
  setModuleHeading(
    (module && module.grupoMenu) || "OPERACIONES",
    (module && module.nombre) || "Calendario de Entregas"
  );

  renderDeliveryCalendarFrame();
  loadDeliveryCalendarData(false);
}

/**
 * Actualiza el calendario (botón global Actualizar).
 */
function refreshDeliveryCalendarWorkspace(silent) {
  if (!document.getElementById("dc360Region")) return;
  loadDeliveryCalendarData(Boolean(silent));
}

/**
 * Estructura base con la misma línea de diseño del sistema.
 */
function renderDeliveryCalendarFrame() {
  var view = document.getElementById("dynamicModuleView");
  if (!view) return;
  view.innerHTML =
    '<section class="sales-workspace dc360-workspace">' +
      '<style>' +
        ".dc360-workspace{min-width:0}" +
        ".dc360-workspace>*{min-width:0}" +
        ".dc360-workspace .sales-card{min-width:0;overflow:hidden}" +
        ".dc360-topbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}" +
        ".dc360-topbar h3{margin:0;font-size:20px;min-width:180px}" +
        ".dc360-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px;margin-top:14px}" +
        ".dc360-layout>*{min-width:0}" +
        ".dc360-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:6px}" +
        ".dc360-weekdays span{text-align:center;font-size:11px;font-weight:800;color:#6b778c;text-transform:uppercase;letter-spacing:.05em}" +
        ".dc360-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}" +
        ".dc360-day{min-height:86px;padding:6px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;cursor:pointer;text-align:left;font:inherit}" +
        ".dc360-day:hover{border-color:var(--primary-400,#38bdf8)}" +
        ".dc360-day.is-empty{background:transparent;border-style:dashed;cursor:default}" +
        ".dc360-day.is-today{border-color:var(--primary-500,#00A1DE);box-shadow:0 0 0 2px rgba(0,161,222,.15)}" +
        ".dc360-day.is-selected{background:#f0faff;border-color:var(--primary-500,#00A1DE)}" +
        ".dc360-daynum{font-size:12px;font-weight:800;color:#42526e}" +
        ".dc360-chip{display:block;margin-top:3px;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
        ".dc360-chip--programada{background:#e0f2fe;color:#075985}" +
        ".dc360-chip--ruta{background:#fef3c7;color:#92400e}" +
        ".dc360-chip--entregada{background:#dcfce7;color:#166534}" +
        ".dc360-chip--otra{background:#f1f5f9;color:#475569}" +
        ".dc360-more{font-size:10px;color:#6b778c;font-weight:700;margin-top:2px}" +
        ".dc360-filters{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:12px}" +
        ".dc360-filters>*{min-width:0}" +
        ".dc360-delivery{display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid var(--border,#e5e7eb);border-radius:14px;background:#fff;margin-bottom:10px}" +
        ".dc360-delivery strong{font-size:14px}" +
        ".dc360-delivery small{color:#64748b}" +
        ".dc360-delivery .mp-status{align-self:flex-start}" +
        "@media(max-width:1100px){.dc360-layout{grid-template-columns:minmax(0,1fr)}.dc360-filters{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}" +
        "@media(max-width:640px){.dc360-filters{grid-template-columns:minmax(0,1fr)}.dc360-day{min-height:64px}}" +
      "</style>" +
      '<div class="toolbar toolbar--end sales-main-toolbar"><button id="dc360RefreshButton" class="button button--secondary has-tooltip" type="button" data-tooltip="Actualizar" aria-label="Actualizar" title="Actualizar"><span class="material-symbols-rounded">refresh</span></button></div>' +
      '<div class="sales-card"><div class="dc360-filters">' +
        '<label class="search-field"><span class="material-symbols-rounded">search</span><input id="dc360Search" type="search" placeholder="Código, cliente o dirección"></label>' +
        '<label class="select-field"><span>Estado</span><select id="dc360EstadoFilter"><option value="TODOS">Todos</option></select></label>' +
        '<label class="select-field"><span>Oficina</span><select id="dc360OficinaFilter"><option value="TODOS">Todas</option></select></label>' +
      "</div></div>" +
      '<div id="dc360Region">' +
        '<div class="sales-card"><div class="dc360-topbar">' +
          '<button id="dc360PrevMonth" class="button button--secondary button--compact has-tooltip" type="button" data-tooltip="Mes anterior" aria-label="Mes anterior" title="Mes anterior"><span class="material-symbols-rounded">chevron_left</span></button>' +
          "<h3 id=\"dc360MonthLabel\">—</h3>" +
          '<button id="dc360NextMonth" class="button button--secondary button--compact has-tooltip" type="button" data-tooltip="Mes siguiente" aria-label="Mes siguiente" title="Mes siguiente"><span class="material-symbols-rounded">chevron_right</span></button>' +
          '<button id="dc360TodayButton" class="button button--ghost button--compact has-tooltip" type="button" data-tooltip="Hoy" aria-label="Hoy" title="Hoy"><span class="material-symbols-rounded">today</span></button>' +
          '<span id="dc360MonthCount" style="margin-left:auto;color:#64748b;font-size:13px"></span>' +
        "</div></div>" +
        '<div class="dc360-layout">' +
          '<div class="sales-card"><div class="dc360-weekdays">' + DC360_WEEKDAYS.map(function(d) { return "<span>" + d + "</span>"; }).join("") + '</div><div id="dc360Grid" class="dc360-grid"></div></div>' +
          '<div class="sales-card"><h3 id="dc360DayTitle">Entregas del día</h3><div id="dc360DayList"></div></div>' +
        "</div>" +
      "</div>" +
    "</section>";

  bindDeliveryCalendarControls();
}

/**
 * Vincula controles del calendario.
 */
function bindDeliveryCalendarControls() {
  var search = document.getElementById("dc360Search");
  if (search) {
    search.addEventListener("input", debounce(function() {
      DC360_STATE.filters.texto = search.value || "";
      renderDeliveryCalendarResults();
    }, 300));
  }
  [["dc360EstadoFilter", "estadoEntrega"], ["dc360OficinaFilter", "oficina"]].forEach(function(pair) {
    var element = document.getElementById(pair[0]);
    if (element) {
      element.addEventListener("change", function() {
        DC360_STATE.filters[pair[1]] = element.value || "TODOS";
        renderDeliveryCalendarResults();
      });
    }
  });
  var prev = document.getElementById("dc360PrevMonth");
  if (prev) prev.addEventListener("click", function() { dc360MoveMonth(-1); });
  var next = document.getElementById("dc360NextMonth");
  if (next) next.addEventListener("click", function() { dc360MoveMonth(1); });
  var today = document.getElementById("dc360TodayButton");
  if (today) {
    today.addEventListener("click", function() {
      var now = new Date();
      DC360_STATE.year = now.getFullYear();
      DC360_STATE.month = now.getMonth();
      DC360_STATE.selectedDay = dc360DayKey(now.getFullYear(), now.getMonth(), now.getDate());
      renderDeliveryCalendarResults();
    });
  }
  var refresh = document.getElementById("dc360RefreshButton");
  if (refresh) refresh.addEventListener("click", function() { loadDeliveryCalendarData(false); });
}

function dc360MoveMonth(delta) {
  var date = new Date(DC360_STATE.year, DC360_STATE.month + delta, 1);
  DC360_STATE.year = date.getFullYear();
  DC360_STATE.month = date.getMonth();
  renderDeliveryCalendarResults();
}

function dc360DayKey(year, month, day) {
  var pad = function(n) { return String(n).padStart(2, "0"); };
  return year + "-" + pad(month + 1) + "-" + pad(day);
}

/**
 * Carga las ventas y extrae sus entregas con fecha programada.
 */
function loadDeliveryCalendarData(silent) {
  var grid = document.getElementById("dc360Grid");
  if (grid && !silent) grid.innerHTML = "";

  secureRpc("listarVentasContadoModulo", [], "VENTAS_CONTADO")
    .then(function(response) {
      var rows = (response && response.ventas) || (response && response.registros) || (response && response.datos) || [];
      DC360_STATE.rows = (Array.isArray(rows) ? rows : []).map(dc360NormalizeDelivery).filter(function(d) { return !!d.fecha; });
      fillDeliveryCalendarFilterOptions();
      renderDeliveryCalendarResults();
      if (!silent) toast("Calendario actualizado", "Se cargaron " + DC360_STATE.rows.length + " entregas programadas.");
    })
    .catch(function(error) {
      if (grid) grid.innerHTML = '<div class="mp-note"><strong>No fue posible cargar el calendario.</strong> ' + escapeHtml(errorMessage(error)) + "</div>";
      toast("No fue posible cargar el calendario", errorMessage(error), true);
    });
}

/**
 * Normaliza cada venta a una entrega con fecha (gestiones o singular).
 */
function dc360NormalizeDelivery(row) {
  row = row || {};
  var gestiones = Array.isArray(row.gestionesEntrega) ? row.gestionesEntrega : [];
  var single = row.gestionEntrega || {};
  var first = gestiones[0] || single || {};
  var fecha = String(first.fechaProgramadaEntrega || "").split("T")[0];
  var client = [row.nombresCliente, row.apellidosCliente].filter(Boolean).join(" ") || row.nombreCliente || "";
  return {
    idVenta: row.idVenta || "",
    codigoVenta: row.codigoVenta || row.idVenta || "",
    fecha: fecha,
    cliente: client,
    direccion: row.direccionInstalacion || row.direccionEntrega || "",
    distrito: row.distrito || "",
    oficina: row.nombreOficina || row.idOficina || "",
    nombreUsuario: row.nombreUsuario || "",
    estadoEntrega: String(first.estadoEntrega || row.estadoEntrega || row.estado || ""),
    receptor: [first.nombreReceptor, row.nombreReceptor].filter(Boolean)[0] || "",
    monto: Number(row.montoTotalVenta || row.totalVenta || row.importeVisible || 0) || 0
  };
}

function fillDeliveryCalendarFilterOptions() {
  var estados = {};
  var oficinas = {};
  DC360_STATE.rows.forEach(function(d) {
    if (d.estadoEntrega) estados[d.estadoEntrega] = true;
    if (d.oficina) oficinas[d.oficina] = true;
  });
  dc360FillSelect("dc360EstadoFilter", Object.keys(estados).sort(), DC360_STATE.filters.estadoEntrega);
  dc360FillSelect("dc360OficinaFilter", Object.keys(oficinas).sort(), DC360_STATE.filters.oficina);
}

function dc360FillSelect(id, values, current) {
  var element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = '<option value="TODOS">Todos</option>' + values.map(function(value) {
    return '<option value="' + escapeHtml(value) + '"' + (String(current) === String(value) ? " selected" : "") + ">" +
      escapeHtml(String(value).replace(/_/g, " ")) + "</option>";
  }).join("");
}

function dc360FilteredDeliveries() {
  var filters = DC360_STATE.filters;
  var text = String(filters.texto || "").trim().toLowerCase();
  return DC360_STATE.rows.filter(function(d) {
    if (filters.estadoEntrega !== "TODOS" && String(d.estadoEntrega || "") !== filters.estadoEntrega) return false;
    if (filters.oficina !== "TODOS" && String(d.oficina || "") !== filters.oficina) return false;
    if (text) {
      var haystack = [d.codigoVenta, d.cliente, d.direccion, d.distrito, d.oficina].join(" ").toLowerCase();
      if (haystack.indexOf(text) === -1) return false;
    }
    return true;
  });
}

function dc360ChipTone(estado) {
  var normalized = String(estado || "").toUpperCase();
  if (normalized === "PROGRAMADA") return "dc360-chip--programada";
  if (normalized === "EN_RUTA" || normalized === "POR_ENTREGAR") return "dc360-chip--ruta";
  if (normalized === "ENTREGADA") return "dc360-chip--entregada";
  return "dc360-chip--otra";
}

/**
 * Renderiza mes, grilla y lista del día seleccionado.
 */
function renderDeliveryCalendarResults() {
  var label = document.getElementById("dc360MonthLabel");
  var grid = document.getElementById("dc360Grid");
  if (!label || !grid) return;

  var year = DC360_STATE.year;
  var month = DC360_STATE.month;
  label.textContent = DC360_MONTHS[month] + " " + year;

  var rows = dc360FilteredDeliveries();
  var byDay = {};
  rows.forEach(function(d) {
    byDay[d.fecha] = byDay[d.fecha] || [];
    byDay[d.fecha].push(d);
  });

  var count = document.getElementById("dc360MonthCount");
  if (count) count.textContent = rows.length === 1 ? "1 entrega con filtros" : rows.length + " entregas con filtros";

  var firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var todayKey = dc360DayKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  var html = "";

  for (var b = 0; b < firstWeekday; b++) html += '<div class="dc360-day is-empty"></div>';

  for (var day = 1; day <= daysInMonth; day++) {
    var key = dc360DayKey(year, month, day);
    var items = (byDay[key] || []).sort(function(a, b) { return String(a.codigoVenta).localeCompare(String(b.codigoVenta)); });
    var classes = "dc360-day" + (key === todayKey ? " is-today" : "") + (key === DC360_STATE.selectedDay ? " is-selected" : "");
    html += '<button type="button" class="' + classes + '" data-dc360-day="' + key + '">' +
      '<span class="dc360-daynum">' + day + "</span>" +
      items.slice(0, 3).map(function(d) {
        return '<span class="dc360-chip ' + dc360ChipTone(d.estadoEntrega) + '">' + escapeHtml(d.codigoVenta) + "</span>";
      }).join("") +
      (items.length > 3 ? '<span class="dc360-more">+' + (items.length - 3) + " más</span>" : "") +
      "</button>";
  }
  grid.innerHTML = html;

  grid.querySelectorAll("[data-dc360-day]").forEach(function(button) {
    button.addEventListener("click", function() {
      DC360_STATE.selectedDay = button.dataset.dc360Day;
      renderDeliveryCalendarResults();
    });
  });

  renderDeliveryCalendarDay(byDay[DC360_STATE.selectedDay] || []);
}

function renderDeliveryCalendarDay(items) {
  var title = document.getElementById("dc360DayTitle");
  var list = document.getElementById("dc360DayList");
  if (!title || !list) return;

  var parts = String(DC360_STATE.selectedDay || "").split("-");
  title.textContent = parts.length === 3 ? "Entregas del " + parts[2] + "/" + parts[1] + "/" + parts[0] : "Entregas del día";

  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">event_available</span><strong>Sin entregas</strong><p>No hay entregas este día con los filtros actuales.</p></div>';
    return;
  }

  list.innerHTML = items.map(function(d) {
    return '<div class="dc360-delivery">' +
      "<strong>" + escapeHtml(d.codigoVenta) + "</strong>" +
      "<small>" + escapeHtml(d.cliente || "—") + (d.distrito ? " · " + escapeHtml(d.distrito) : "") + "</small>" +
      (d.direccion ? "<small>" + escapeHtml(d.direccion) + "</small>" : "") +
      "<small>" + escapeHtml(d.oficina || "—") + (d.receptor ? " · Recibe: " + escapeHtml(d.receptor) : "") + "</small>" +
      "<small>Vendido por: " + escapeHtml(d.nombreUsuario || "—") + "</small>" +
      '<span class="mp-status ' + dc360StatusTone(d.estadoEntrega) + '">' + escapeHtml(String(d.estadoEntrega || "—").replace(/_/g, " ")) + "</span>" +
      '<div><button class="table-button has-tooltip" type="button" data-dc360-detail="' + escapeHtml(d.idVenta) + '" data-tooltip="Ver venta" aria-label="Ver venta" title="Ver venta"><span class="material-symbols-rounded">visibility</span></button></div>' +
    "</div>";
  }).join("");

  list.querySelectorAll("[data-dc360-detail]").forEach(function(button) {
    button.addEventListener("click", function() {
      if (typeof openSalesDetail29 === "function" && button.dataset.dc360Detail) {
        openSalesDetail29(button.dataset.dc360Detail);
      }
    });
  });
}

function dc360StatusTone(estado) {
  var normalized = String(estado || "").toUpperCase();
  if (/CONFIRMAD|APROBAD|ENTREGAD|ACTIVO|OK/.test(normalized)) return "ACTIVO";
  if (/PENDIENTE|PROGRAMADA|REGISTRADA|RUTA|REVISION|POR_ENTREGAR/.test(normalized)) return "EN_REVISION";
  if (/OBSERVAD|RECHAZAD|ANULAD|ERROR/.test(normalized)) return "RECHAZADO";
  return "";
}
