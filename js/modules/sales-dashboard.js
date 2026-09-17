/**
 * SEGUIMIENTO 360 — DASHBOARD DE VENTAS (ventas, abonos y entregas)
 *
 * Módulo de lectura con filtros interactivos. Reutiliza la misma fuente de
 * datos del módulo VENTAS_CONTADO (RPC listarVentasContadoModulo) y la misma
 * línea visual del sistema (sales-card, mp-grid/mp-card, mp-table, chips).
 * No modifica ningún otro módulo.
 */

var SD360_STATE = {
  module: null,
  rows: [],
  filters: {
    texto: "",
    estadoAbono: "TODOS",
    estadoEntrega: "TODOS",
    oficina: "TODOS",
    fechaDesde: "",
    fechaHasta: ""
  },
  charts: {},
  loadedAt: 0
};

/**
 * Abre el workspace del dashboard. Punto de entrada llamado desde app-core.
 */
function openSalesDashboardWorkspace(module) {
  SD360_STATE.module = module || null;
  SD360_STATE.filters = {
    texto: "",
    estadoAbono: "TODOS",
    estadoEntrega: "TODOS",
    oficina: "TODOS",
    fechaDesde: "",
    fechaHasta: ""
  };

  setActiveView("dynamicModuleView");
  setModuleHeading(
    (module && module.grupoMenu) || "OPERACIONES",
    (module && module.nombre) || "Dashboard de Ventas"
  );

  renderSalesDashboardFrame();
  loadSalesDashboardData(false);
}

/**
 * Actualiza el dashboard (botón global Actualizar).
 */
function refreshSalesDashboardWorkspace(silent) {
  if (!document.getElementById("sd360Region")) return;
  loadSalesDashboardData(Boolean(silent));
}

/**
 * Estructura base del workspace con la misma línea de diseño del sistema.
 */
function renderSalesDashboardFrame() {
  var view = document.getElementById("dynamicModuleView");
  if (!view) return;
  view.innerHTML =
    '<section class="sales-workspace sd360-workspace">' +
      '<style>' +
        ".sd360-workspace{min-width:0}" +
        ".sd360-workspace>*{min-width:0}" +
        ".sd360-workspace .sales-card{min-width:0;overflow:hidden}" +
        ".sd360-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:18px}" +
        ".sd360-kpi small{display:block;color:#6b778c;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:11px}" +
        ".sd360-kpi strong{font-size:26px;display:block;margin-top:6px}" +
        ".sd360-kpi span{display:block;color:#6b778c;font-size:12px;margin-top:2px}" +
        ".sd360-filters{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:0}" +
        ".sd360-filters>*{min-width:0}" +
        ".sd360-filters .search-field{margin:0;min-width:0}" +
        ".sd360-workspace .select-field input{min-height:41px;width:100%;padding:9px 11px;color:var(--ink);background:#fff;border:1px solid var(--border);border-radius:10px;outline:none;font:inherit}" +
        ".sd360-workspace .select-field input:focus{border-color:var(--primary-400);box-shadow:0 0 0 3px rgba(0,161,222,.1)}" +
        ".sd360-dates{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-top:12px}" +
        ".sd360-dates>*{min-width:0}" +
        ".sd360-charts{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:14px;margin:18px 0}" +
        ".sd360-charts>*{min-width:0}" +
        ".sd360-charts canvas{display:block;max-width:100%;max-height:260px}" +
        ".sd360-workspace .mp-table-wrap{max-width:100%}" +
        "@media(max-width:1100px){.sd360-charts{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.sd360-charts>*:first-child{grid-column:1 / -1}.sd360-filters{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}" +
        "@media(max-width:640px){.sd360-filters{grid-template-columns:minmax(0,1fr)}.sd360-charts{grid-template-columns:minmax(0,1fr)}.sd360-dates{grid-template-columns:minmax(0,1fr)}}" +
      "</style>" +
      '<div class="section-header sales-main-header"><div><p class="eyebrow">OPERACIONES</p><h2>Dashboard de Ventas</h2><p>Ventas, abonos y entregas con filtros interactivos. Solo lectura: no modifica registros.</p></div>' +
      '<div class="toolbar toolbar--end"><button id="sd360RefreshButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">refresh</span>Actualizar</button><button id="sd360ExportButton" class="button button--primary" type="button"><span class="material-symbols-rounded">file_download</span>Exportar</button></div></div>' +
      '<div class="sales-card"><div id="sd360Kpis" class="sd360-kpi-grid">' + sd360LoadingHtml(6) + "</div></div>" +
      '<div class="sales-card"><div class="sales-list-head"><div><h3>Filtros</h3><p style="margin:0;color:#64748b">Combinables. Se aplican al instante a indicadores, gráficos y tabla.</p></div>' +
      '<button id="sd360ClearButton" class="button button--ghost" type="button"><span class="material-symbols-rounded">filter_alt_off</span>Limpiar</button></div>' +
      '<div class="sd360-filters">' +
        '<label class="search-field"><span class="material-symbols-rounded">search</span><input id="sd360Search" type="search" placeholder="Código, cliente, documento o SAP"></label>' +
        '<label class="select-field"><span>Abono</span><select id="sd360AbonoFilter"><option value="TODOS">Todos</option></select></label>' +
        '<label class="select-field"><span>Entrega</span><select id="sd360EntregaFilter"><option value="TODOS">Todas</option></select></label>' +
        '<label class="select-field"><span>Oficina</span><select id="sd360OficinaFilter"><option value="TODOS">Todas</option></select></label>' +
      "</div>" +
      '<div class="sd360-dates">' +
        '<label class="select-field"><span>Desde</span><input id="sd360Desde" type="date"></label>' +
        '<label class="select-field"><span>Hasta</span><input id="sd360Hasta" type="date"></label>' +
      "</div></div>" +
      '<div id="sd360Charts" class="sd360-charts">' +
        '<div class="sales-card"><h3>Ventas por día</h3><canvas id="sd360ChartDaily"></canvas></div>' +
        '<div class="sales-card"><h3>Abono</h3><canvas id="sd360ChartAbono"></canvas></div>' +
        '<div class="sales-card"><h3>Entrega</h3><canvas id="sd360ChartEntrega"></canvas></div>' +
      "</div>" +
      '<div class="sales-card"><div class="sales-list-head"><div><h3>Detalle</h3><p id="sd360Count" style="margin:0;color:#64748b">—</p></div></div>' +
      '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Oficina</th><th>Monto</th><th>Abono</th><th>Entrega</th></tr></thead>' +
      '<tbody id="sd360TableBody"></tbody></table></div></div>' +
    "</section>";

  bindSalesDashboardControls();
}

/**
 * Vincula los controles de filtro del dashboard.
 */
function bindSalesDashboardControls() {
  var search = document.getElementById("sd360Search");
  if (search) {
    search.addEventListener(
      "input",
      debounce(function() {
        SD360_STATE.filters.texto = search.value || "";
        renderSalesDashboardResults();
      }, 300)
    );
  }
  [["sd360AbonoFilter", "estadoAbono"], ["sd360EntregaFilter", "estadoEntrega"], ["sd360OficinaFilter", "oficina"]].forEach(function(pair) {
    var element = document.getElementById(pair[0]);
    if (element) {
      element.addEventListener("change", function() {
        SD360_STATE.filters[pair[1]] = element.value || "TODOS";
        renderSalesDashboardResults();
      });
    }
  });
  [["sd360Desde", "fechaDesde"], ["sd360Hasta", "fechaHasta"]].forEach(function(pair) {
    var element = document.getElementById(pair[0]);
    if (element) {
      element.addEventListener("change", function() {
        SD360_STATE.filters[pair[1]] = element.value || "";
        renderSalesDashboardResults();
      });
    }
  });
  var refresh = document.getElementById("sd360RefreshButton");
  if (refresh) refresh.addEventListener("click", function() { loadSalesDashboardData(false); });
  var clear = document.getElementById("sd360ClearButton");
  if (clear) {
    clear.addEventListener("click", function() {
      SD360_STATE.filters = { texto: "", estadoAbono: "TODOS", estadoEntrega: "TODOS", oficina: "TODOS", fechaDesde: "", fechaHasta: "" };
      ["sd360Search", "sd360Desde", "sd360Hasta"].forEach(function(id) {
        var element = document.getElementById(id);
        if (element) element.value = "";
      });
      ["sd360AbonoFilter", "sd360EntregaFilter", "sd360OficinaFilter"].forEach(function(id) {
        var element = document.getElementById(id);
        if (element) element.value = "TODOS";
      });
      renderSalesDashboardResults();
    });
  }
  var exportButton = document.getElementById("sd360ExportButton");
  if (exportButton) exportButton.addEventListener("click", exportSalesDashboardCsv);
}

/**
 * Carga las ventas desde la misma fuente del módulo de Ventas.
 */
function loadSalesDashboardData(silent) {
  var region = document.getElementById("sd360Kpis");
  if (region && !silent) region.innerHTML = sd360LoadingHtml(6);

  secureRpc("listarVentasContadoModulo", [], "VENTAS_CONTADO")
    .then(function(response) {
      var rows = (response && response.ventas) || (response && response.registros) || (response && response.datos) || [];
      SD360_STATE.rows = (Array.isArray(rows) ? rows : []).map(sd360NormalizeRow);
      SD360_STATE.loadedAt = Date.now();
      fillSalesDashboardFilterOptions();
      renderSalesDashboardResults();
      if (!silent) toast("Dashboard actualizado", "Se cargaron " + SD360_STATE.rows.length + " ventas.");
    })
    .catch(function(error) {
      if (region) {
        region.innerHTML = '<div class="mp-note"><strong>No fue posible cargar el dashboard.</strong> ' +
          escapeHtml(errorMessage(error)) + "</div>";
      }
      toast("No fue posible cargar el dashboard", errorMessage(error), true);
    });
}

/**
 * Completa los selects de filtro con los valores reales de los datos.
 */
function fillSalesDashboardFilterOptions() {
  var abonos = {};
  var entregas = {};
  var oficinas = {};
  SD360_STATE.rows.forEach(function(row) {
    if (row.estadoAbono) abonos[row.estadoAbono] = true;
    if (row.estadoEntrega) entregas[row.estadoEntrega] = true;
    var office = row.nombreOficina || row.idOficina || "";
    if (office) oficinas[office] = true;
  });
  fillSalesDashboardSelect("sd360AbonoFilter", Object.keys(abonos).sort(), SD360_STATE.filters.estadoAbono);
  fillSalesDashboardSelect("sd360EntregaFilter", Object.keys(entregas).sort(), SD360_STATE.filters.estadoEntrega);
  fillSalesDashboardSelect("sd360OficinaFilter", Object.keys(oficinas).sort(), SD360_STATE.filters.oficina);
}

function fillSalesDashboardSelect(id, values, current) {
  var element = document.getElementById(id);
  if (!element) return;
  var html = '<option value="TODOS">Todos</option>' + values.map(function(value) {
    return '<option value="' + escapeHtml(value) + '"' +
      (String(current) === String(value) ? " selected" : "") + ">" +
      escapeHtml(sd360PrettyStatus(value)) + "</option>";
  }).join("");
  element.innerHTML = html;
}

/**
 * Normaliza la fila a un formato canónico (demo y producción usan
 * nombres de campo distintos). Evita celdas vacías según el origen.
 */
function sd360NormalizeRow(row) {
  row = row || {};
  var client = [row.nombresCliente, row.apellidosCliente].filter(Boolean).join(" ") ||
    row.nombreCliente || "";
  return {
    idVenta: row.idVenta || "",
    codigoVenta: row.codigoVenta || row.idVenta || "",
    fechaRegistro: row.fechaRegistro || "",
    cliente: client,
    numeroSolicitudSap: row.numeroSolicitudSap || "",
    codigoSuministro: row.codigoSuministro || row.cuentaContrato || "",
    numeroDocumentoCliente: row.numeroDocumentoCliente || row.dniCliente || "",
    distrito: row.distrito || "",
    nombreOficina: row.nombreOficina || "",
    idOficina: row.idOficina || "",
    montoTotalVenta: Number(row.montoTotalVenta || row.totalVenta || row.importeVisible || 0) || 0,
    estadoAbono: row.estadoAbono || "",
    estadoEntrega: row.estadoEntrega || row.estado || "",
    motivoAnulacion: row.motivoAnulacion || ""
  };
}

/**
 * Aplica los filtros activos sobre las filas cargadas.
 */
function applySalesDashboardFilters() {
  var filters = SD360_STATE.filters;
  var text = String(filters.texto || "").trim().toLowerCase();
  var from = filters.fechaDesde ? new Date(filters.fechaDesde + "T00:00:00") : null;
  var to = filters.fechaHasta ? new Date(filters.fechaHasta + "T23:59:59") : null;

  return SD360_STATE.rows.filter(function(row) {
    if (filters.estadoAbono !== "TODOS" && String(row.estadoAbono || "") !== filters.estadoAbono) return false;
    if (filters.estadoEntrega !== "TODOS" && String(row.estadoEntrega || "") !== filters.estadoEntrega) return false;
    var office = row.nombreOficina || row.idOficina || "";
    if (filters.oficina !== "TODOS" && String(office) !== filters.oficina) return false;
    var date = row.fechaRegistro ? new Date(row.fechaRegistro) : null;
    if (from && (!date || date < from)) return false;
    if (to && (!date || date > to)) return false;
    if (text) {
      var haystack = [
        row.codigoVenta, row.numeroSolicitudSap, row.codigoSuministro,
        row.cliente, row.numeroDocumentoCliente,
        row.distrito, row.nombreOficina
      ].join(" ").toLowerCase();
      if (haystack.indexOf(text) === -1) return false;
    }
    return true;
  });
}

/**
 * Renderiza KPIs, gráficos y tabla con las filas filtradas.
 */
function renderSalesDashboardResults() {
  var rows = applySalesDashboardFilters();
  renderSalesDashboardKpis(rows);
  renderSalesDashboardCharts(rows);
  renderSalesDashboardTable(rows);
}

function renderSalesDashboardKpis(rows) {
  var region = document.getElementById("sd360Kpis");
  if (!region) return;

  var total = rows.length;
  var amount = rows.reduce(function(sum, row) { return sum + (Number(row.montoTotalVenta) || 0); }, 0);
  var ticket = total ? amount / total : 0;
  var confirmed = rows.filter(function(row) { return String(row.estadoAbono || "") === "ABONO_CONFIRMADO"; }).length;
  var delivered = rows.filter(function(row) { return String(row.estadoEntrega || "") === "ENTREGADA"; }).length;
  var deliveredAmount = rows.filter(function(row) { return String(row.estadoEntrega || "") === "ENTREGADA"; })
    .reduce(function(sum, row) { return sum + (Number(row.montoTotalVenta) || 0); }, 0);
  var pending = rows.filter(function(row) {
    return String(row.estadoAbono || "") !== "ABONO_CONFIRMADO" ||
      String(row.estadoEntrega || "") !== "ENTREGADA";
  }).length;

  var cards = [
    ["Ventas", String(total), total === 1 ? "registro filtrado" : "registros filtrados"],
    ["Monto total", sd360Money(amount), "PEN acumulado"],
    ["Ticket promedio", sd360Money(ticket), "por venta"],
    ["Abonos confirmados", total ? Math.round((confirmed / total) * 100) + "%" : "—", confirmed + " de " + total],
    ["Entregas completadas", total ? Math.round((delivered / total) * 100) + "%" : "—", delivered + " de " + total],
    ["Monto completado", sd360Money(deliveredAmount), "S/ en ventas entregadas"],
    ["Pendientes", String(pending), "abono o entrega"]
  ];

  region.innerHTML = cards.map(function(card) {
    return '<div class="mp-card sd360-kpi"><small>' + escapeHtml(card[0]) + "</small><strong>" +
      escapeHtml(card[1]) + "</strong><span>" + escapeHtml(card[2]) + "</span></div>";
  }).join("");
}

function renderSalesDashboardCharts(rows) {
  if (!window.Chart) return;

  var byDay = {};
  rows.forEach(function(row) {
    if (!row.fechaRegistro) return;
    var key = String(row.fechaRegistro).split("T")[0];
    if (!byDay[key]) byDay[key] = { count: 0, amount: 0 };
    byDay[key].count += 1;
    byDay[key].amount += Number(row.montoTotalVenta) || 0;
  });
  var days = Object.keys(byDay).sort().slice(-14);

  var abonoGroups = {};
  var entregaGroups = {};
  rows.forEach(function(row) {
    var abono = sd360PrettyStatus(row.estadoAbono || "SIN_ESTADO");
    var entrega = sd360PrettyStatus(row.estadoEntrega || "SIN_ESTADO");
    abonoGroups[abono] = (abonoGroups[abono] || 0) + 1;
    entregaGroups[entrega] = (entregaGroups[entrega] || 0) + 1;
  });

  sd360DrawChart("sd360ChartDaily", "bar", {
    labels: days,
    datasets: [{ label: "Ventas", data: days.map(function(day) { return byDay[day].count; }) }]
  });
  sd360DrawChart("sd360ChartAbono", "doughnut", {
    labels: Object.keys(abonoGroups),
    datasets: [{ data: Object.keys(abonoGroups).map(function(key) { return abonoGroups[key]; }) }]
  });
  sd360DrawChart("sd360ChartEntrega", "doughnut", {
    labels: Object.keys(entregaGroups),
    datasets: [{ data: Object.keys(entregaGroups).map(function(key) { return entregaGroups[key]; }) }]
  });
}

function sd360DrawChart(id, type, data) {
  var element = document.getElementById(id);
  if (!element || !window.Chart) return;
  if (SD360_STATE.charts[id]) {
    try { SD360_STATE.charts[id].destroy(); } catch (error) {}
  }
  SD360_STATE.charts[id] = new window.Chart(element, {
    type: type,
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: type === "bar" ? "top" : "bottom" } }
    }
  });
}

function renderSalesDashboardTable(rows) {
  var body = document.getElementById("sd360TableBody");
  var count = document.getElementById("sd360Count");
  if (!body) return;

  if (count) {
    count.textContent = rows.length === 1 ?
      "1 venta con los filtros actuales" :
      rows.length + " ventas con los filtros actuales";
  }

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7">Sin resultados para los filtros seleccionados.</td></tr>';
    return;
  }

  body.innerHTML = rows.slice(0, 200).map(function(row) {
    var date = row.fechaRegistro ? String(row.fechaRegistro).split("T")[0] : "—";
    return "<tr><td><strong>" + escapeHtml(row.codigoVenta || row.idVenta || "—") + "</strong></td>" +
      "<td>" + escapeHtml(date) + "</td>" +
      "<td>" + escapeHtml(row.cliente || "—") + "</td>" +
      "<td>" + escapeHtml(row.nombreOficina || row.idOficina || "—") + "</td>" +
      "<td><strong>" + escapeHtml(sd360Money(Number(row.montoTotalVenta) || 0)) + "</strong></td>" +
      "<td>" + sd360StatusChip(row.estadoAbono) + "</td>" +
      "<td" + (row.motivoAnulacion ? ' title="Motivo de anulación: ' + escapeHtml(row.motivoAnulacion) + '"' : "") + ">" +
      sd360StatusChip(row.estadoEntrega) + "</td></tr>";
  }).join("") + (rows.length > 200 ?
    '<tr><td colspan="7">Mostrando las primeras 200 de ' + rows.length + ". Usa los filtros para acotar.</td></tr>" :
    "");
}

/**
 * Exporta las filas filtradas a CSV.
 */
function exportSalesDashboardCsv() {
  var rows = applySalesDashboardFilters();
  if (!rows.length) {
    toast("Nada que exportar", "No hay ventas con los filtros actuales.", true);
    return;
  }
  var header = ["codigo", "fecha", "cliente", "documento", "oficina", "monto", "abono", "entrega"];
  var lines = [header.join(";")].concat(rows.map(function(row) {
    return [
      row.codigoVenta || row.idVenta || "",
      row.fechaRegistro ? String(row.fechaRegistro).split("T")[0] : "",
      row.cliente,
      row.numeroDocumentoCliente || "",
      row.nombreOficina || row.idOficina || "",
      Number(row.montoTotalVenta) || 0,
      row.estadoAbono || "",
      row.estadoEntrega || ""
    ].map(sd360CsvCell).join(";");
  }));

  var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dashboard-ventas-360.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast("Exportación lista", rows.length + " ventas exportadas a CSV.");
}

/* Utilidades del dashboard (prefijo sd360 para no colisionar). */

function sd360LoadingHtml(count) {
  var html = "";
  for (var i = 0; i < (count || 3); i++) {
    html += '<div class="mp-card sd360-kpi"><small>Cargando…</small><strong>—</strong><span> </span></div>';
  }
  return html;
}

function sd360Money(value) {
  try {
    return "S/ " + Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (error) {
    return "S/ " + String(value || 0);
  }
}

function sd360PrettyStatus(value) {
  return String(value || "").replace(/_/g, " ").toLowerCase()
    .replace(/(^|\s)\S/g, function(letter) { return letter.toUpperCase(); });
}

function sd360StatusChip(value) {
  var normalized = String(value || "").toUpperCase();
  var tone = "";
  if (/CONFIRMAD|APROBAD|ENTREGAD|ACTIVO|OK/.test(normalized)) tone = "ACTIVO";
  else if (/PENDIENTE|PROGRAMADA|REGISTRADA|RUTA|REVISION/.test(normalized)) tone = "EN_REVISION";
  else if (/OBSERVAD|RECHAZAD|ANULAD|ERROR/.test(normalized)) tone = "RECHAZADO";
  return '<span class="mp-status ' + tone + '">' + escapeHtml(sd360PrettyStatus(value || "—")) + "</span>";
}

function sd360CsvCell(value) {
  var text = String(value === null || value === undefined ? "" : value).replace(/"/g, '""');
  return /[;"\n]/.test(text) ? '"' + text + '"' : text;
}
