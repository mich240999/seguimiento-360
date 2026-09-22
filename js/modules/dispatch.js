/**
 * SEGUIMIENTO 360 — DESPACHO DE ENTREGAS
 *
 * Bandeja operativa de SOLO despacho: ventas en PROGRAMADA y EN_RUTA del
 * proveedor propio (alcance PROPIO por idProveedor del usuario, igual que
 * los demás alcances). Acciones: tomar despacho (PROGRAMADA→EN_RUTA) y
 * confirmar entrega (→ENTREGADA, con evidencia como la gestión normal).
 * Reutiliza listarDespachoModulo + guardarGestionEntregaVentaContadoModulo.
 * Todo lo demás (detalle incluido) es solo lectura. Misma línea visual del
 * sistema (sales-card, toolbar, mp-table, mp-status, buttons).
 */

var DISP360_STATE = {
  module: null,
  rows: [],
  provider: "",
  filters: { texto: "", estadoEntrega: "TODOS", oficina: "TODOS" },
  embedded: false
};

/**
 * Abre el workspace de despacho. Punto de entrada llamado desde app-core
 * (standalone, histórico) o desde la pestaña DESPACHO de VENTAS_CONTADO
 * con { embedded: true }, en cuyo caso pinta dentro de #salesListRegion
 * sin cambiar la vista ni el encabezado del módulo de ventas.
 */
function openDispatchWorkspace(module, options) {
  DISP360_STATE.module = module || null;
  DISP360_STATE.provider = disp360CurrentProvider();
  DISP360_STATE.filters = { texto: "", estadoEntrega: "TODOS", oficina: "TODOS" };
  DISP360_STATE.embedded = Boolean(options && options.embedded);

  if (!DISP360_STATE.embedded) {
    setActiveView("dynamicModuleView");
    setModuleHeading(
      (module && module.grupoMenu) || "OPERACIONES",
      (module && module.nombre) || "Despacho de Entregas"
    );
  }

  renderDispatchFrame();
  loadDispatchData(false);
}

/**
 * Actualiza el despacho (botón Actualizar de ventas o global).
 */
function refreshDispatchWorkspace(silent) {
  if (!document.getElementById("disp360TableBody")) return;
  loadDispatchData(Boolean(silent));
}

/**
 * Proveedor propio del usuario (alcance PROPIO). Si no se puede resolver,
 * el backend ya filtra por el proveedor de la sesión; aquí solo se usa
 * como filtro defensivo adicional.
 */
function disp360CurrentProvider() {
  try {
    if (typeof APP_STATE !== "undefined" && APP_STATE && APP_STATE.context && APP_STATE.context.usuario) {
      var user = APP_STATE.context.usuario;
      return String(user.idProveedor || user.id_proveedor || "").trim();
    }
  } catch (error) {}
  return "";
}

/**
 * Indica si la fila pertenece a otro proveedor (alcance PROVEEDOR): en ese
 * caso las acciones se muestran deshabilitadas; el servidor también las
 * rechaza (gate en guardarGestionEntregaVentaContadoModulo).
 */
function disp360RowBlocked29_(row) {
  try {
    var scopes29D_ = ["GESTIONAR_ENTREGA", "PROGRAMAR_ENTREGA", "CONFIRMAR_ENTREGA"].map(function(rec) {
      try { return String((typeof activePermissionScope === "function" ? activePermissionScope("VENTAS_CONTADO", rec) : "NINGUNO") || "NINGUNO").toUpperCase(); } catch (_) { return "NINGUNO"; }
    });
    var scoped29D_ = scopes29D_.some(function(sc) { return sc === "PROVEEDOR" || sc === "ASIGNADOS"; });
    if (!scoped29D_) return false;
    var mp = disp360CurrentProvider();
    if (!mp) return false;
    row = row || {};
    if (String(row.idProveedor || "").trim() === mp) return false;
    var pds29D_ = Array.isArray(row.proveedoresDetalle) ? row.proveedoresDetalle : [];
    if (pds29D_.indexOf(mp) !== -1) return false;
    if (!String(row.idProveedor || "").trim() && !pds29D_.length) return false;
    return true;
  } catch (error) { return false; }
}

/**
 * Indica si el usuario puede ejecutar acciones de despacho: gestionar
 * despachos en VENTAS_CONTADO (PROGRAMAR_ENTREGA o CONFIRMAR_ENTREGA),
 * rol DESPACHADOR, o el permiso histórico del módulo standalone.
 */
function disp360CanManage() {
  try {
    if (typeof hasActivePermission === "function") {
      if (hasActivePermission("VENTAS_CONTADO", "PROGRAMAR_ENTREGA")) return true;
      if (hasActivePermission("VENTAS_CONTADO", "CONFIRMAR_ENTREGA")) return true;
      if (hasActivePermission("DESPACHO", "GESTIONAR_DESPACHO")) return true;
    } else {
      return true;
    }
  } catch (error) {}
  try {
    if (typeof APP_STATE !== "undefined" && APP_STATE && APP_STATE.context && APP_STATE.context.usuario) {
      var role = String(APP_STATE.context.usuario.rol || "");
      if (role.toUpperCase() === "DESPACHADOR") return true;
    }
  } catch (error) {}
  return false;
}

/**
 * Estructura base con la misma línea de diseño del sistema. En modo
 * embebido (pestaña DESPACHO de ventas) pinta dentro de #salesListRegion;
 * en modo standalone histórico usa #dynamicModuleView.
 */
function renderDispatchFrame() {
  var view = DISP360_STATE.embedded
    ? (document.getElementById("salesListRegion") || document.getElementById("dynamicModuleView"))
    : document.getElementById("dynamicModuleView");
  if (!view) return;
  var embeddedClass = DISP360_STATE.embedded ? " is-embedded" : "";
  var toolbarButtons = DISP360_STATE.embedded
    ? '<button id="disp360ExportButton" class="button button--primary" type="button"><span class="material-symbols-rounded">file_download</span>Exportar</button>'
    : '<button id="disp360RefreshButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">refresh</span>Actualizar</button><button id="disp360ExportButton" class="button button--primary" type="button"><span class="material-symbols-rounded">file_download</span>Exportar</button>';
  view.innerHTML =
    '<section class="sales-workspace disp360-workspace' + embeddedClass + '">' +
      '<style>' +
        ".disp360-workspace{min-width:0}" +
        ".disp360-workspace>*{min-width:0}" +
        ".disp360-workspace .sales-card{min-width:0;overflow:hidden}" +
        ".disp360-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:0}" +
        ".disp360-kpi small{display:block;color:#6b778c;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:11px}" +
        ".disp360-kpi strong{font-size:26px;display:block;margin-top:6px}" +
        ".disp360-kpi span{display:block;color:#6b778c;font-size:12px;margin-top:2px}" +
        ".disp360-filters{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:12px}" +
        ".disp360-filters>*{min-width:0}" +
        ".disp360-scope{display:flex;align-items:center;gap:8px;color:#64748b;font-size:13px}" +
        ".disp360-scope .material-symbols-rounded{font-size:18px}" +
        ".disp360-workspace .mp-table-wrap{max-width:100%}" +
        ".disp360-workspace.is-embedded{gap:10px}" +
        ".disp360-workspace.is-embedded .sales-main-toolbar{margin-bottom:0}" +
        ".disp360-workspace.is-embedded .sales-card{padding:12px}" +
        ".disp360-workspace.is-embedded .disp360-kpi-grid{gap:8px}" +
        ".disp360-workspace.is-embedded .disp360-kpi strong{font-size:22px;margin-top:4px}" +
        ".disp360-workspace.is-embedded .sales-list-head{margin-bottom:6px}" +
        ".disp360-workspace.is-embedded .disp360-filters{gap:8px;margin-top:6px}" +
        ".disp360-workspace.is-embedded .mp-table th,.disp360-workspace.is-embedded .mp-table td{padding:7px 10px}" +
        "@media(max-width:640px){.disp360-filters{grid-template-columns:minmax(0,1fr)}}" +
      "</style>" +
      '<div class="toolbar toolbar--end sales-main-toolbar">' + toolbarButtons + '</div>' +
      '<div class="sales-card"><div id="disp360Kpis" class="disp360-kpi-grid"></div></div>' +
      '<div class="sales-card"><div class="sales-list-head"><div><h3>Despachos propios</h3><p id="disp360Scope" class="disp360-scope" style="margin:4px 0 0"></p></div></div>' +
      '<div class="disp360-filters">' +
        '<label class="search-field"><span class="material-symbols-rounded">search</span><input id="disp360Search" type="search" placeholder="Código, cliente o dirección"></label>' +
        '<label class="select-field"><span>Estado</span><select id="disp360EstadoFilter"><option value="TODOS">Todos</option><option value="PROGRAMADA">Programada</option><option value="EN_RUTA">En ruta</option></select></label>' +
        '<label class="select-field"><span>Oficina</span><select id="disp360OficinaFilter"><option value="TODOS">Todas</option></select></label>' +
      "</div></div>" +
      '<div id="disp360Region" class="sales-card"><div class="sales-list-head"><div><h3>Bandeja</h3><p id="disp360Count" style="margin:0;color:#64748b">—</p></div></div>' +
      '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Código</th><th>Programada</th><th>Cliente</th><th>Dirección</th><th>Oficina</th><th>Vendido por</th><th>Estado</th><th>Acciones</th></tr></thead>' +
      '<tbody id="disp360TableBody"></tbody></table></div></div>' +
    "</section>";

  bindDispatchControls();
}

/**
 * Vincula los controles de la bandeja.
 */
function bindDispatchControls() {
  var search = document.getElementById("disp360Search");
  if (search) {
    search.addEventListener("input", debounce(function() {
      DISP360_STATE.filters.texto = search.value || "";
      renderDispatchResults();
    }, 300));
  }
  [["disp360EstadoFilter", "estadoEntrega"], ["disp360OficinaFilter", "oficina"]].forEach(function(pair) {
    var element = document.getElementById(pair[0]);
    if (element) {
      element.addEventListener("change", function() {
        DISP360_STATE.filters[pair[1]] = element.value || "TODOS";
        renderDispatchResults();
      });
    }
  });
  var refresh = document.getElementById("disp360RefreshButton");
  if (refresh) refresh.addEventListener("click", function() { loadDispatchData(false); });
  var exportButton = document.getElementById("disp360ExportButton");
  if (exportButton) exportButton.addEventListener("click", exportDispatchCsv);
}

/**
 * Carga la bandeja (solo PROGRAMADA y EN_RUTA propias, ya filtradas
 * por el backend según el proveedor de la sesión).
 */
function loadDispatchData(silent) {
  var body = document.getElementById("disp360TableBody");
  DISP360_STATE.provider = disp360CurrentProvider();
  if (body && !silent) body.innerHTML = '<tr><td colspan="8">Cargando despachos…</td></tr>';

  secureRpc("listarDespachoModulo", [], "VENTAS_CONTADO")
    .then(function(response) {
      var rows = (response && response.registros) || (response && response.ventas) || (response && response.datos) || [];
      DISP360_STATE.rows = (Array.isArray(rows) ? rows : []).map(disp360NormalizeRow);
      fillDispatchFilterOptions();
      renderDispatchResults();
      if (!silent) toast("Despacho actualizado", "Se cargaron " + DISP360_STATE.rows.length + " despachos propios.");
    })
    .catch(function(error) {
      if (body) {
        body.innerHTML = '<tr><td colspan="8"><div class="mp-note"><strong>No fue posible cargar el despacho.</strong> ' +
          escapeHtml(errorMessage(error)) + "</div></td></tr>";
      }
      toast("No fue posible cargar el despacho", errorMessage(error), true);
    });
}

/**
 * Normaliza cada venta a una fila de despacho (demo y producción usan
 * nombres de campo distintos). El estado efectivo prioriza la gestión.
 */
function disp360NormalizeRow(row) {
  row = row || {};
  var gestiones = Array.isArray(row.gestionesEntrega) ? row.gestionesEntrega : [];
  var gestion = row.gestionEntrega || gestiones[0] || {};
  var client = [row.nombresCliente, row.apellidosCliente].filter(Boolean).join(" ") || row.nombreCliente || "";
  var evidences = [];
  if (Array.isArray(gestion.evidencias)) evidences = gestion.evidencias;
  else if (Array.isArray(row.evidencias)) evidences = row.evidencias;
  return {
    idVenta: row.idVenta || "",
    codigoVenta: row.codigoVenta || row.idVenta || "",
    cliente: client,
    direccion: row.direccionEntrega || row.direccionInstalacion || "",
    distrito: row.distrito || "",
    oficina: row.nombreOficina || row.idOficina || "",
    idUsuario: row.idUsuario || "",
    nombreUsuario: row.nombreUsuario || "",
    abonoAprobadoPor: row.abonoAprobadoPor || gestion.abonoAprobadoPor || "",
    programadoPor: row.programadoPor || gestion.programadoPor || "",
    entregadoPor: row.entregadoPor || gestion.entregadoPor || "",
    monto: Number(row.montoTotalVenta || row.totalVenta || 0) || 0,
    estadoAbono: String(row.estadoAbono || ""),
    estadoEntrega: String(gestion.estadoEntrega || row.estadoEntrega || row.estado || ""),
    fechaProgramada: String(gestion.fechaProgramadaEntrega || "").split("T")[0],
    detalleObservacion: String(gestion.detalleObservacion || ""),
    idProveedor: String(gestion.idProveedor || row.idProveedor || ""),
    proveedoresDetalle: Array.isArray(row.proveedoresDetalle) ? row.proveedoresDetalle : [],
    receptor: String(gestion.nombreReceptor || row.nombreReceptor || ""),
    evidencias: evidences
  };
}

function fillDispatchFilterOptions() {
  var offices = {};
  DISP360_STATE.rows.forEach(function(row) {
    if (row.oficina) offices[row.oficina] = true;
  });
  var element = document.getElementById("disp360OficinaFilter");
  if (!element) return;
  element.innerHTML = '<option value="TODOS">Todas</option>' + Object.keys(offices).sort().map(function(value) {
    return '<option value="' + escapeHtml(value) + '"' +
      (DISP360_STATE.filters.oficina === value ? " selected" : "") + ">" +
      escapeHtml(value) + "</option>";
  }).join("");
}

function disp360FilteredRows() {
  var filters = DISP360_STATE.filters;
  var text = String(filters.texto || "").trim().toLowerCase();
  return DISP360_STATE.rows.filter(function(row) {
    if (DISP360_STATE.provider && row.idProveedor && row.idProveedor !== DISP360_STATE.provider) return false;
    if (filters.estadoEntrega !== "TODOS" && String(row.estadoEntrega || "") !== filters.estadoEntrega) return false;
    if (filters.oficina !== "TODOS" && String(row.oficina || "") !== filters.oficina) return false;
    if (text) {
      var haystack = [row.codigoVenta, row.cliente, row.direccion, row.distrito, row.oficina].join(" ").toLowerCase();
      if (haystack.indexOf(text) === -1) return false;
    }
    return true;
  });
}

/**
 * Renderiza KPIs y tabla con las filas filtradas.
 */
function renderDispatchResults() {
  var rows = disp360FilteredRows();
  var kpis = document.getElementById("disp360Kpis");
  var scope = document.getElementById("disp360Scope");
  var count = document.getElementById("disp360Count");
  var body = document.getElementById("disp360TableBody");
  if (!body) return;

  var programmed = rows.filter(function(row) { return row.estadoEntrega === "PROGRAMADA"; }).length;
  var enRoute = rows.filter(function(row) { return row.estadoEntrega === "EN_RUTA"; }).length;

  if (kpis) {
    kpis.innerHTML =
      '<div class="mp-card disp360-kpi"><small>Programadas</small><strong>' + programmed + '</strong><span>pendientes de tomar</span></div>' +
      '<div class="mp-card disp360-kpi"><small>En ruta</small><strong>' + enRoute + '</strong><span>pendientes de entregar</span></div>' +
      '<div class="mp-card disp360-kpi"><small>Total en despacho</small><strong>' + rows.length + '</strong><span>ventas propias</span></div>';
  }
  if (scope) {
    scope.innerHTML = '<span class="material-symbols-rounded">storefront</span><span>Solo ventas PROGRAMADA y EN_RUTA de tu proveedor' +
      (DISP360_STATE.provider ? " (" + escapeHtml(DISP360_STATE.provider) + ")" : "") + ".</span>";
  }
  if (count) {
    count.textContent = rows.length === 1 ? "1 despacho con los filtros actuales" : rows.length + " despachos con los filtros actuales";
  }

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8">Sin despachos propios en PROGRAMADA o EN_RUTA.</td></tr>';
    return;
  }

  var canManage = disp360CanManage();
  body.innerHTML = rows.map(function(row) {
    var actions = '<button class="table-button has-tooltip" type="button" data-disp360-detail="' + escapeHtml(row.idVenta) + '" data-tooltip="Ver" aria-label="Ver" title="Ver"><span class="material-symbols-rounded">visibility</span></button>';
    var blocked29D_ = disp360RowBlocked29_(row);
    var blockedTip29D_ = "Solo el proveedor de esta venta puede gestionarla";
    var disAttr29D_ = blocked29D_ ? " disabled" : "";
    if (canManage && row.estadoEntrega === "PROGRAMADA") {
      var takeTip29D_ = blocked29D_ ? blockedTip29D_ : "Tomar despacho";
      actions += ' <button class="table-button has-tooltip" type="button"' + disAttr29D_ + ' data-disp360-take="' + escapeHtml(row.idVenta) + '" data-tooltip="' + takeTip29D_ + '" aria-label="' + takeTip29D_ + '" title="' + takeTip29D_ + '"><span class="material-symbols-rounded">local_shipping</span></button>';
    }
    if (canManage && row.estadoEntrega === "EN_RUTA") {
      var confirmTip29D_ = blocked29D_ ? blockedTip29D_ : "Confirmar entrega";
      actions += ' <button class="table-button has-tooltip" type="button"' + disAttr29D_ + ' data-disp360-confirm="' + escapeHtml(row.idVenta) + '" data-tooltip="' + confirmTip29D_ + '" aria-label="' + confirmTip29D_ + '" title="' + confirmTip29D_ + '"><span class="material-symbols-rounded">task_alt</span></button>';
    }
    return "<tr><td><strong>" + escapeHtml(row.codigoVenta || "—") + "</strong></td>" +
      "<td>" + escapeHtml(row.fechaProgramada || "—") + "</td>" +
      "<td>" + escapeHtml(row.cliente || "—") + "</td>" +
      "<td>" + escapeHtml([row.direccion, row.distrito].filter(Boolean).join(" · ") || "—") + "</td>" +
      "<td>" + escapeHtml(row.oficina || "—") + "</td>" +
      "<td>" + escapeHtml(row.nombreUsuario || "—") + "</td>" +
      "<td>" + disp360StatusChip(row.estadoEntrega) + "</td>" +
      '<td><div class="mp-actions">' + actions + "</div></td></tr>";
  }).join("");

  body.querySelectorAll("[data-disp360-detail]").forEach(function(button) {
    button.addEventListener("click", function() { disp360ShowDetail(button.dataset.disp360Detail); });
  });
  body.querySelectorAll("[data-disp360-take]").forEach(function(button) {
    button.addEventListener("click", function() { disp360TakeDelivery(button.dataset.disp360Take); });
  });
  body.querySelectorAll("[data-disp360-confirm]").forEach(function(button) {
    button.addEventListener("click", function() { disp360OpenConfirmDelivery(button.dataset.disp360Confirm); });
  });
}

/**
 * Toma un despacho: PROGRAMADA → EN_RUTA (misma RPC de gestión normal).
 */
function disp360TakeDelivery(idVenta) {
  var row = DISP360_STATE.rows.filter(function(item) { return item.idVenta === idVenta; })[0] || {};
  if (String(row.estadoEntrega || "") !== "PROGRAMADA") {
    toast("Despacho no disponible", "Solo se puede tomar un despacho en estado PROGRAMADA.", true);
    return;
  }
  openModal({
    eyebrow: "DESPACHO DE ENTREGAS",
    title: "Tomar despacho " + (row.codigoVenta || ""),
    body: '<div class="mp-note">La venta pasará a <strong>EN_RUTA</strong>. ' +
      escapeHtml(row.cliente ? "Cliente: " + row.cliente + ". " : "") +
      escapeHtml(row.fechaProgramada ? "Fecha programada: " + row.fechaProgramada + "." : "") + "</div>",
    footer: '<button class="button button--secondary" type="button" data-disp360-close>Cerrar</button>' +
      '<button id="disp360TakeConfirm" class="button button--primary has-tooltip" type="button" data-tooltip="Tomar despacho" aria-label="Tomar despacho" title="Tomar despacho"><span class="material-symbols-rounded">local_shipping</span></button>'
  });
  disp360BindModalClose();

  document.getElementById("disp360TakeConfirm").addEventListener("click", function() {
    var button = document.getElementById("disp360TakeConfirm");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="material-symbols-rounded">progress_activity</span>';
    }
    secureRpc("guardarGestionEntregaVentaContadoModulo", [{
      idVenta: idVenta,
      idProveedor: row.idProveedor || DISP360_STATE.provider || "",
      estadoEntrega: "EN_RUTA",
      detalleObservacion: row.detalleObservacion || "",
      fechaProgramadaEntrega: row.fechaProgramada || "",
      evidencias: []
    }], "VENTAS_CONTADO")
      .then(function(result) {
        closeModal();
        toast("Despacho en ruta", (result && result.mensaje) || "La venta ahora está EN_RUTA.");
        loadDispatchData(true);
      })
      .catch(function(error) {
        toast("No se pudo tomar el despacho", errorMessage(error), true);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<span class="material-symbols-rounded">local_shipping</span>';
        }
      });
  });
}

/**
 * Abre el modal para confirmar la entrega (pide evidencia como la
 * gestión normal: al menos un sustento adjunto o ya registrado).
 */
function disp360OpenConfirmDelivery(idVenta) {
  var row = DISP360_STATE.rows.filter(function(item) { return item.idVenta === idVenta; })[0] || {};
  if (String(row.estadoEntrega || "") !== "EN_RUTA") {
    toast("Entrega no disponible", "Solo se puede confirmar una venta EN_RUTA.", true);
    return;
  }
  openModal({
    eyebrow: "DESPACHO DE ENTREGAS",
    title: "Confirmar entrega " + (row.codigoVenta || ""),
    body: '<div class="sales-form-grid">' +
      '<label class="input-field span-2"><span>Observación de entrega</span><textarea id="disp360DeliveryNote" rows="3" maxlength="1500" placeholder="Detalle de la entrega (opcional)"></textarea></label>' +
      '<label class="input-field"><span>Boleta de entrega</span><input id="disp360Evidence1" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
      '<label class="input-field"><span>Evidencia de recepción</span><input id="disp360Evidence2" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
      '<label class="input-field"><span>Acta u otro sustento</span><input id="disp360Evidence3" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
    "</div>" +
    '<div class="mp-note" style="margin-top:12px">Para confirmar debe existir al menos un sustento de entrega (adjunto ahora o ya registrado). PDF, PNG, JPG o WEBP; máximo 5 MB por archivo.</div>',
    footer: '<button class="button button--secondary" type="button" data-disp360-close>Cerrar</button>' +
      '<button id="disp360ConfirmButton" class="button button--primary has-tooltip" type="button" data-tooltip="Confirmar entrega" aria-label="Confirmar entrega" title="Confirmar entrega"><span class="material-symbols-rounded">task_alt</span></button>'
  });
  disp360BindModalClose();

  document.getElementById("disp360ConfirmButton").addEventListener("click", function() {
    disp360ConfirmDelivery(idVenta);
  });
}

function disp360ConfirmDelivery(idVenta) {
  var row = DISP360_STATE.rows.filter(function(item) { return item.idVenta === idVenta; })[0] || {};
  var note = "";
  var noteInput = document.getElementById("disp360DeliveryNote");
  if (noteInput) note = noteInput.value || "";

  var defs = [
    ["disp360Evidence1", "BOLETA_ENTREGA"],
    ["disp360Evidence2", "EVIDENCIA_RECEPCION"],
    ["disp360Evidence3", "OTRO"]
  ];
  var evidences = [];
  var chain = Promise.resolve();
  defs.forEach(function(def) {
    chain = chain.then(function() {
      var input = document.getElementById(def[0]);
      var file = input && input.files && input.files[0];
      if (!file) return null;
      return disp360ReadFile(file).then(function(data) {
        data.tipoEvidencia = def[1];
        evidences.push(data);
      });
    });
  });

  chain.then(function() {
    var existing = (row.evidencias || []).filter(function(item) {
      return String((item && item.tipoEvidencia) || "").toUpperCase() !== "SUSTENTO_OBSERVACION";
    });
    if (!evidences.length && !existing.length) {
      toast("Evidencia requerida", "Adjunta al menos un sustento de la entrega.", true);
      return;
    }
    var button = document.getElementById("disp360ConfirmButton");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="material-symbols-rounded">progress_activity</span>';
    }
    return secureRpc("guardarGestionEntregaVentaContadoModulo", [{
      idVenta: idVenta,
      idProveedor: row.idProveedor || DISP360_STATE.provider || "",
      estadoEntrega: "ENTREGADA",
      detalleObservacion: note || row.detalleObservacion || "",
      fechaProgramadaEntrega: row.fechaProgramada || "",
      evidencias: evidences
    }], "VENTAS_CONTADO")
      .then(function(result) {
        closeModal();
        toast("Entrega confirmada", (result && result.mensaje) || "La venta ahora está ENTREGADA.");
        loadDispatchData(true);
      })
      .catch(function(error) {
        toast("No se pudo confirmar la entrega", errorMessage(error), true);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<span class="material-symbols-rounded">task_alt</span>';
        }
      });
  }).catch(function(error) {
    toast("Evidencia inválida", errorMessage(error), true);
  });
}

/**
 * Detalle de solo lectura del despacho (sin acciones de ventas).
 */
function disp360ShowDetail(idVenta) {
  var row = DISP360_STATE.rows.filter(function(item) { return item.idVenta === idVenta; })[0] || {};
  var evidences = (row.evidencias || []).map(function(item) {
    var label = String((item && item.tipoEvidencia) || "EVIDENCIA").replace(/_/g, " ");
    var name = (item && (item.nombreArchivo || item.nombre)) || "ver archivo";
    var url = (item && (item.url || item.idArchivo)) || "";
    return "<li>" + escapeHtml(label) + ": " +
      (url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(name) + "</a>" : escapeHtml(name)) + "</li>";
  }).join("");

  openModal({
    eyebrow: "DESPACHO DE ENTREGAS · SOLO LECTURA",
    title: row.codigoVenta || "Detalle del despacho",
    body: '<div class="mp-table-wrap"><table class="mp-table"><tbody>' +
      "<tr><th>Cliente</th><td>" + escapeHtml(row.cliente || "—") + "</td></tr>" +
      "<tr><th>Dirección</th><td>" + escapeHtml([row.direccion, row.distrito].filter(Boolean).join(" · ") || "—") + "</td></tr>" +
      "<tr><th>Oficina</th><td>" + escapeHtml(row.oficina || "—") + "</td></tr>" +
      "<tr><th>Vendedor</th><td>" + escapeHtml(row.nombreUsuario || "—") + "</td></tr>" +
      "<tr><th>Aprobado por</th><td>" + escapeHtml(row.abonoAprobadoPor || "—") + "</td></tr>" +
      "<tr><th>Programado por</th><td>" + escapeHtml(row.programadoPor || "—") + "</td></tr>" +
      "<tr><th>Entregado por</th><td>" + escapeHtml(row.entregadoPor || "—") + "</td></tr>" +
      "<tr><th>Fecha programada</th><td>" + escapeHtml(row.fechaProgramada || "—") + "</td></tr>" +
      "<tr><th>Estado de entrega</th><td>" + disp360StatusChip(row.estadoEntrega) + "</td></tr>" +
      "<tr><th>Receptor</th><td>" + escapeHtml(row.receptor || "—") + "</td></tr>" +
      "<tr><th>Monto</th><td>" + escapeHtml(disp360Money(row.monto)) + "</td></tr>" +
      "<tr><th>Observación</th><td>" + escapeHtml(row.detalleObservacion || "—") + "</td></tr>" +
      "</tbody></table></div>" +
      (evidences ? "<p><strong>Evidencias registradas</strong></p><ul>" + evidences + "</ul>" : '<div class="mp-note" style="margin-top:12px">Sin evidencias registradas.</div>'),
    footer: '<button class="button button--primary" type="button" data-disp360-close>Entendido</button>'
  });
  disp360BindModalClose();
}

function disp360BindModalClose() {
  document.querySelectorAll("[data-disp360-close]").forEach(function(button) {
    button.addEventListener("click", function() {
      if (typeof closeModal === "function") closeModal();
    });
  });
}

/**
 * Exporta las filas filtradas a CSV.
 */
function exportDispatchCsv() {
  var rows = disp360FilteredRows();
  if (!rows.length) {
    toast("Nada que exportar", "No hay despachos con los filtros actuales.", true);
    return;
  }
  var header = ["codigo", "fecha_programada", "cliente", "direccion", "oficina", "vendedor", "estado"];
  var lines = [header.join(";")].concat(rows.map(function(row) {
    return [
      row.codigoVenta || row.idVenta || "",
      row.fechaProgramada || "",
      row.cliente,
      [row.direccion, row.distrito].filter(Boolean).join(" - "),
      row.oficina || "",
      row.nombreUsuario || "",
      row.estadoEntrega || ""
    ].map(disp360CsvCell).join(";");
  }));

  var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "despacho-360.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast("Exportación lista", rows.length + " despachos exportados a CSV.");
}

/* Utilidades del despacho (prefijo disp360 para no colisionar). */

function disp360StatusTone(estado) {
  var normalized = String(estado || "").toUpperCase();
  if (/CONFIRMAD|APROBAD|ENTREGAD|ACTIVO|OK/.test(normalized)) return "ACTIVO";
  if (/PENDIENTE|PROGRAMADA|REGISTRADA|RUTA|REVISION|POR_ENTREGAR/.test(normalized)) return "EN_REVISION";
  if (/OBSERVAD|RECHAZAD|ANULAD|ERROR/.test(normalized)) return "RECHAZADO";
  return "";
}

function disp360StatusChip(value) {
  return '<span class="mp-status ' + disp360StatusTone(value) + '">' +
    escapeHtml(String(value || "—").replace(/_/g, " ")) + "</span>";
}

function disp360Money(value) {
  try {
    return "S/ " + Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (error) {
    return "S/ " + String(value || 0);
  }
}

function disp360ReadFile(file) {
  return new Promise(function(resolve, reject) {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("El archivo supera 5 MB."));
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      resolve({ nombre: file.name, mimeType: file.type, base64: String(reader.result || "").split(",").pop() });
    };
    reader.onerror = function() { reject(new Error("No se pudo leer el archivo.")); };
    reader.readAsDataURL(file);
  });
}

function disp360CsvCell(value) {
  var text = String(value === null || value === undefined ? "" : value).replace(/"/g, '""');
  return /[;"\n]/.test(text) ? '"' + text + '"' : text;
}
