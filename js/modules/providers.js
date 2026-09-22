const PROVIDERS_STATE = {
    module: null,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    search: "",
    status: "ACTIVO",
    records: [],
    options: null,
    optionsPromise: null,
    requestSequence: 0,
    loading: false,
    bound: false
  };

  function openProvidersWorkspace(module) {
    PROVIDERS_STATE.module = module;
    PROVIDERS_STATE.page = 1;
    PROVIDERS_STATE.requestSequence = 0;
    const view = document.getElementById("dynamicModuleView");
    const template = document.getElementById("providersWorkspaceTemplate");
    if (!view || !template) return;
    setActiveView("dynamicModuleView");
    setModuleHeading(module.grupoMenu || "SISTEMA", module.nombre || "Proveedores");
    view.innerHTML = "";
    view.appendChild(template.content.cloneNode(true));
    PROVIDERS_STATE.bound = false;
    bindProvidersWorkspace();
    applyProvidersPermissions();
    refreshProvidersWorkspace(false);
  }

  function bindProvidersWorkspace() {
    if (PROVIDERS_STATE.bound) return;
    PROVIDERS_STATE.bound = true;
    const search = document.getElementById("providersSearch");
    const status = document.getElementById("providersStatusFilter");
    if (search) search.addEventListener("input", debounce(function() {
      PROVIDERS_STATE.search = search.value || "";
      PROVIDERS_STATE.page = 1;
      refreshProvidersWorkspace(true);
    }, 300));
    if (status) status.addEventListener("change", function() {
      PROVIDERS_STATE.status = status.value || "TODOS";
      PROVIDERS_STATE.page = 1;
      refreshProvidersWorkspace(true);
    });
    on("providersNewButton", "click", function() { openProviderModuleEditor(null); });
    on("providersImportButton", "click", function() {
      const input = document.getElementById("providersImportInput");
      if (input) input.click();
    });
    on("providersImportInput", "change", handleProvidersImportFile);
    on("providersExportButton", "click", exportProvidersModule);
    on("providersTemplateButton", "click", downloadProvidersTemplate);
  }

  function providerPermission(resource) {
    const permissions = APP_STATE.context && APP_STATE.context.seguridad &&
      APP_STATE.context.seguridad.permisos && APP_STATE.context.seguridad.permisos.PROVEEDORES;
    return Boolean(permissions && ((permissions[resource] && permissions[resource].permitido) ||
      (permissions.ADMINISTRAR && permissions.ADMINISTRAR.permitido)));
  }

  function applyProvidersPermissions() {
    const mapping = {
      providersNewButton: "CREAR",
      providersImportButton: "IMPORTAR",
      providersTemplateButton: "IMPORTAR",
      providersExportButton: "EXPORTAR"
    };
    Object.keys(mapping).forEach(function(id) {
      const element = document.getElementById(id);
      if (element) element.hidden = !providerPermission(mapping[id]);
    });
    const channelBulkButton = document.getElementById("providersChannelBulkButton");
    if (channelBulkButton) channelBulkButton.hidden = !(providerPermission("IMPORTAR") || providerPermission("EDITAR"));
  }

  function refreshProvidersWorkspace(silent) {
    if (APP_STATE.module !== "PROVEEDORES") return;

    const requestId = ++PROVIDERS_STATE.requestSequence;
    PROVIDERS_STATE.loading = true;
    const content = document.getElementById("providersContent");

    if (content && (!silent || !PROVIDERS_STATE.records.length)) {
      content.innerHTML = loadingHtml(6);
    }

    secureRpc("listarProveedoresModulo", [{
      texto: PROVIDERS_STATE.search,
      estado: PROVIDERS_STATE.status,
      pagina: PROVIDERS_STATE.page,
      tamano: PROVIDERS_STATE.pageSize
    }], "PROVEEDORES")
      .then(function(result) {
        if (requestId !== PROVIDERS_STATE.requestSequence) return;
        applyProvidersResult(result);
        markSync();
        if (!silent) {
          toast("Proveedores actualizados", "La información está disponible.");
        }
      })
      .catch(function(error) {
        if (requestId !== PROVIDERS_STATE.requestSequence) return;
        if (content) {
          content.innerHTML =
            '<div class="empty-state"><span class="material-symbols-rounded">error</span>' +
            '<strong>No fue posible cargar</strong><p>' +
            escapeHtml(errorMessage(error)) + '</p></div>';
        }
        if (!silent) {
          toast(
            "No fue posible cargar proveedores",
            errorMessage(error),
            true
          );
        }
      })
      .finally(function() {
        if (requestId === PROVIDERS_STATE.requestSequence) {
          PROVIDERS_STATE.loading = false;
        }
      });
  }

  function applyProvidersResult(result) {
    result = result || {};
    PROVIDERS_STATE.records = result.registros || [];
    PROVIDERS_STATE.totalPages = result.paginacion ?
      result.paginacion.totalPaginas : 1;
    PROVIDERS_STATE.page = result.paginacion ?
      result.paginacion.pagina : 1;
    renderProvidersSummary(result.resumen || {});
    renderProvidersTable(PROVIDERS_STATE.records);
    renderProvidersPagination(result.paginacion || {});
  }

  function invalidateProvidersLocalCache() {
    PROVIDERS_STATE.requestSequence += 1;
  }

  function renderProvidersSummary(summary) {
    const element = document.getElementById("providersSummary");
    if (!element) return;
    element.innerHTML = [
      [summary.total || 0, "Proveedores encontrados"],
      [summary.activos || 0, "Activos"],
      [summary.conCanalVentas || 0, "Con canal de ventas"],
      [summary.sinCanalVentas || 0, "Solo proveedores"]
    ].map(function(item) {
      return '<article class="providers-summary-card"><strong>' + escapeHtml(item[0]) +
        '</strong><span>' + escapeHtml(item[1]) + '</span></article>';
    }).join("");
  }

  function renderProvidersTable(records) {
    const content = document.getElementById("providersContent");
    if (!content) return;
    if (!records.length) {
      content.innerHTML = emptyStateHtml();
      return;
    }

    content.innerHTML = tableHtml([
      {
        label: "Código interno",
        key: "idProveedor",
        render: function(row) {
          return '<code>' + escapeHtml(row.idProveedor) + '</code>';
        }
      },
      {
        label: "Nombre comercial",
        render: function(row) {
          return '<div class="providers-name-cell"><strong>' +
            escapeHtml(
              row.nombreComercial ||
              row.nombreMostrar ||
              row.razonSocial
            ) +
            '</strong><small>' +
            escapeHtml(row.razonSocial || "Sin razón social") +
            '</small></div>';
        }
      },
      {
        label: "Código SAP",
        render: function(row) {
          return escapeHtml(row.codigoSap || "Opcional");
        }
      },
      {
        label: "RUC",
        render: function(row) {
          return escapeHtml(row.ruc || "Opcional");
        }
      },
      {
        label: "Estado",
        render: function(row) {
          return '<span class="status-chip ' +
            (row.estado === "ACTIVO" ? "is-active" : "is-inactive") +
            '">' + escapeHtml(row.estado) + '</span>';
        }
      },
      {
        label: "Última modificación",
        render: function(row) {
          return escapeHtml(formatProviderDate(row.fechaModificacion));
        }
      },
      { label: "Acciones", render: providerActionsHtml }
    ], records);

    content.querySelectorAll("[data-provider-action]").forEach(function(button) {
      button.addEventListener("click", function() {
        const id = button.dataset.providerId;
        const action = button.dataset.providerAction;
        if (action === "view") openProviderModuleDetail(id);
        if (action === "edit") loadProviderModuleEditor(id);
        if (action === "status") {
          confirmProviderStatusChange(id, button.dataset.providerStatus);
        }
      });
    });
  }

  function providerActionsHtml(row) {
    const buttons = [];
    if (providerPermission("VER_DETALLE")) buttons.push('<button class="table-button has-tooltip" type="button" data-provider-action="view" data-provider-id="' + escapeHtml(row.idProveedor) + '" data-tooltip="Ver detalle" aria-label="Ver detalle" title="Ver detalle"><span class="material-symbols-rounded">visibility</span></button>');
    if (providerPermission("EDITAR")) buttons.push('<button class="table-button has-tooltip" type="button" data-provider-action="edit" data-provider-id="' + escapeHtml(row.idProveedor) + '" data-tooltip="Editar" aria-label="Editar" title="Editar"><span class="material-symbols-rounded">edit</span></button>');
    if (providerPermission("CAMBIAR_ESTADO")) buttons.push('<button class="table-button has-tooltip" type="button" data-provider-action="status" data-provider-id="' + escapeHtml(row.idProveedor) + '" data-provider-status="' + (row.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO") + '" data-tooltip="' + (row.estado === "ACTIVO" ? "Inactivar" : "Activar") + '" aria-label="' + (row.estado === "ACTIVO" ? "Inactivar" : "Activar") + '" title="' + (row.estado === "ACTIVO" ? "Inactivar" : "Activar") + '"><span class="material-symbols-rounded">' + (row.estado === "ACTIVO" ? "toggle_off" : "toggle_on") + '</span></button>');
    return '<div class="providers-row-actions" style="flex-wrap:nowrap;white-space:nowrap">' + buttons.join("") + '</div>';
  }

  function renderProvidersPagination(pagination) {
    const element = document.getElementById("providersPagination");
    if (!element) return;
    const total = Number(pagination.total || 0);
    const page = Number(pagination.pagina || 1);
    const totalPages = Number(pagination.totalPaginas || 1);
    element.innerHTML = '<span>Página ' + page + ' de ' + totalPages + ' · ' + total + ' registros</span>' +
      '<div class="providers-pagination-actions"><button id="providersPreviousPage" class="button button--ghost button--compact has-tooltip" type="button" data-tooltip="Anterior" aria-label="Anterior" title="Anterior" ' + (page <= 1 ? "disabled" : "") + '><span class="material-symbols-rounded">chevron_left</span></button><button id="providersNextPage" class="button button--ghost button--compact has-tooltip" type="button" data-tooltip="Siguiente" aria-label="Siguiente" title="Siguiente" ' + (page >= totalPages ? "disabled" : "") + '><span class="material-symbols-rounded">chevron_right</span></button></div>';
    on("providersPreviousPage", "click", function() { PROVIDERS_STATE.page -= 1; refreshProvidersWorkspace(true); });
    on("providersNextPage", "click", function() { PROVIDERS_STATE.page += 1; refreshProvidersWorkspace(true); });
  }

  function openProviderModuleDetail(id) {
    openSideSheet({
      eyebrow: "DETALLE",
      title: "Proveedor",
      body: loadingHtml(5),
      footer: '<button class="button button--primary" type="button" data-sheet-close>Cerrar</button>'
    });
    bindProviderSheetClose();

    secureRpc(
      "obtenerDetalleProveedorModulo",
      [id],
      "PROVEEDORES"
    ).then(function(provider) {
      text(
        "sideSheetTitle",
        provider.nombreMostrar ||
        provider.nombreComercial ||
        provider.razonSocial ||
        provider.idProveedor
      );
      document.getElementById("sideSheetBody").innerHTML =
        providerDetailHtml(provider);
      loadProviderSalesResponsibles_(provider.idProveedor || id);
    }).catch(function(error) {
      document.getElementById("sideSheetBody").innerHTML =
        '<p>' + escapeHtml(errorMessage(error)) + '</p>';
    });
  }

  function providerDetailHtml(provider) {
    const fields = [
      ["Código interno", provider.idProveedor],
      ["Razón social", provider.razonSocial],
      [
        "Nombre comercial",
        provider.nombreComercial || "No registrado"
      ],
      ["Código SAP", provider.codigoSap || "No registrado"],
      ["RUC", provider.ruc || "No registrado"],
      ["Estado", provider.estado],
      ["Fecha de creación", formatProviderDate(provider.fechaCreacion)],
      [
        "Última modificación",
        formatProviderDate(provider.fechaModificacion)
      ]
    ];

    const offices = (provider.oficinasAsignadas || []).map(function(item) {
      return '<span class="providers-chip"><span class="material-symbols-rounded">location_on</span>' +
        escapeHtml(item.nombre) + '</span>';
    }).join("") ||
      '<span class="providers-field-hint">Sin canal de ventas asignado.</span>';

    const groups = (provider.gruposDerivados || []).map(function(item) {
      return '<span class="providers-chip"><span class="material-symbols-rounded">groups</span>' +
        escapeHtml(item.nombre) + ' · ' +
        escapeHtml(item.nombreOficina) + '</span>';
    }).join("") ||
      '<span class="providers-field-hint">Sin grupos derivados.</span>';

    return '<div class="providers-detail-grid">' +
      fields.map(function(item) {
        return '<div class="providers-detail-item"><span>' +
          escapeHtml(item[0]) + '</span><strong>' +
          escapeHtml(item[1] || "—") + '</strong></div>';
      }).join("") +
      '</div><div class="providers-detail-section"><h3>Descripción</h3><p>' +
      escapeHtml(provider.descripcion || "Sin descripción.") +
      '</p></div>' +
      '<div class="providers-detail-section sales-card" id="providerResponsiblesSection"><h3>Responsables de venta</h3>' +
      '<p class="providers-field-hint">Nacen en los precios del proveedor (columna responsable_venta). Agregar crea un precio con ese responsable; quitar solo limpia el filtro visual, no borra datos.</p>' +
      '<div id="providerResponsiblesContent"><p class="providers-field-hint">Cargando responsables…</p></div></div>';
  }

  /* AGENTE B: Responsables de venta del proveedor (texto libre por precio).
     Solo lectura + alta rapida de precio; "quitar" es filtro visual. */
  function providerSalesResponsiblesState_() {
    if (!PROVIDERS_STATE.salesResponsibles) PROVIDERS_STATE.salesResponsibles = {};
    return PROVIDERS_STATE.salesResponsibles;
  }

  function loadProviderSalesResponsibles_(idProveedor) {
    var box = document.getElementById("providerResponsiblesContent");
    if (!box || !idProveedor) return;
    var state = providerSalesResponsiblesState_();
    state[idProveedor] = state[idProveedor] || { filter: "", rows: [] };
    var currentFilter = state[idProveedor].filter || "";
    box.innerHTML = '<p class="providers-field-hint">Cargando responsables…</p>';
    secureRpc("listarListasOficialesPreciosModulo", [{}], "PROVEEDORES")
      .then(function(result) {
        var rows = (result && result.registros) || [];
        var mine = rows.filter(function(item) { return String(item.idProveedor || "") === String(idProveedor); });
        state[idProveedor] = { filter: currentFilter, rows: mine };
        renderProviderSalesResponsibles_(idProveedor);
      })
      .catch(function(error) {
        var target = document.getElementById("providerResponsiblesContent");
        if (target) target.innerHTML = '<p class="providers-field-hint">' + escapeHtml(errorMessage(error)) + '</p>';
      });
  }

  function renderProviderSalesResponsibles_(idProveedor) {
    var box = document.getElementById("providerResponsiblesContent");
    if (!box) return;
    var state = providerSalesResponsiblesState_()[idProveedor] || { filter: "", rows: [] };
    var rows = state.rows || [];
    var filter = String(state.filter || "");
    var map = {};
    rows.forEach(function(item) {
      var name = String(item.responsableVenta || "").trim();
      if (!name) return;
      if (!map[name]) map[name] = { nombre: name, total: 0 };
      map[name].total += 1;
    });
    var names = Object.keys(map).sort(function(a, b) { return a.localeCompare(b, "es"); });
    var chips = names.length ? names.map(function(name) {
      return '<button class="providers-chip' + (filter === name ? " is-soft" : "") + '" type="button" data-provider-resp-filter="' + escapeHtml(name) + '">' +
        '<span class="material-symbols-rounded">person</span>' + escapeHtml(name) + ' (' + map[name].total + ')</button>';
    }).join("") : '<span class="providers-field-hint">Sin responsables registrados en los precios de este proveedor.</span>';
    var visible = filter ? rows.filter(function(item) { return String(item.responsableVenta || "").trim() === filter; }) : rows;
    var body = visible.map(function(item) {
      return '<tr><td><strong>' + escapeHtml(item.responsableVenta || "—") + '</strong></td>' +
        '<td>' + escapeHtml(item.nombreCortoMaterial || item.descripcionMaterial || item.codigoMaterial || "—") +
        '<br><small>' + escapeHtml(item.codigoSap || item.codigoMaterial || "") + '</small></td>' +
        '<td><strong>' + escapeHtml("S/ " + Number(item.precioBase || 0).toFixed(2)) + '</strong></td>' +
        '<td>' + escapeHtml(String(item.fechaInicio || "") + " / " + String(item.fechaFin || "")) + '</td></tr>';
    }).join("") || '<tr><td colspan="4">Sin precios para mostrar.</td></tr>';
    box.innerHTML = '<div class="providers-chip-list">' + chips + '</div>' +
      (filter ? '<p><button class="icon-button has-tooltip" type="button" data-provider-resp-clear data-tooltip="Quitar filtro: ' + escapeHtml(filter) + '" aria-label="Quitar filtro: ' + escapeHtml(filter) + '" title="Quitar filtro: ' + escapeHtml(filter) + '"><span class="material-symbols-rounded">filter_alt_off</span></button></p>' : "") +
      '<div class="sales-card"><h3>Agregar responsable (alta rápida de precio)</h3>' +
      '<p class="providers-field-hint">El responsable nace en el precio: se graba con guardarPrecioIndividualMaterialesPreciosModulo.</p>' +
      '<div class="form-grid">' +
      '<label class="field"><span>Responsable</span><input id="providerRespName" maxlength="120" placeholder="Nombre del responsable"></label>' +
      '<label class="field"><span>Material</span><select id="providerRespMaterial"><option value="">Cargando materiales…</option></select></label>' +
      '<label class="field"><span>Precio base S/</span><input id="providerRespPrice" type="number" min="0" step="0.01" placeholder="0.00"></label>' +
      '<label class="field"><span>Inicio vigencia</span><input id="providerRespStart" type="date"></label>' +
      '<label class="field"><span>Fin vigencia</span><input id="providerRespEnd" type="date"></label>' +
      '</div><div class="toolbar toolbar--end"><button class="icon-button has-tooltip" type="button" data-provider-resp-add data-tooltip="Agregar responsable" aria-label="Agregar responsable" title="Agregar responsable"><span class="material-symbols-rounded">person_add</span></button></div></div>' +
      '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Responsable</th><th>Material</th><th>Precio</th><th>Vigencia</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    bindProviderSalesResponsibles_(idProveedor);
    loadProviderRespMaterialOptions_();
  }

  function bindProviderSalesResponsibles_(idProveedor) {
    var box = document.getElementById("providerResponsiblesContent");
    if (!box) return;
    box.querySelectorAll("[data-provider-resp-filter]").forEach(function(button) {
      button.addEventListener("click", function() {
        var state = providerSalesResponsiblesState_()[idProveedor];
        if (state) state.filter = button.getAttribute("data-provider-resp-filter") || "";
        renderProviderSalesResponsibles_(idProveedor);
      });
    });
    var clear = box.querySelector("[data-provider-resp-clear]");
    if (clear) clear.addEventListener("click", function() {
      var state = providerSalesResponsiblesState_()[idProveedor];
      if (state) state.filter = "";
      renderProviderSalesResponsibles_(idProveedor);
      toast("Filtro retirado", "La lista vuelve a mostrar todos los responsables. No se borró ningún dato.");
    });
    var add = box.querySelector("[data-provider-resp-add]");
    if (add) add.addEventListener("click", function() { saveProviderSalesResponsible_(idProveedor, add); });
  }

  function loadProviderRespMaterialOptions_() {
    var select = document.getElementById("providerRespMaterial");
    if (!select) return;
    secureRpc("listarMaterialesSelectPreciosModulo", [{ texto: "", limite: 200 }], "PROVEEDORES")
      .then(function(result) {
        var target = document.getElementById("providerRespMaterial");
        if (!target) return;
        var rows = (result && result.registros) || [];
        target.innerHTML = '<option value="">Selecciona el material</option>' + rows.map(function(item) {
          var label = [item.codigoSap || item.codigoMaterial || "", item.nombreMaterial || item.descripcionMaterial || ""].filter(function(part) { return !!part; }).join(" — ");
          return '<option value="' + escapeHtml(item.idMaterial || item.id || "") + '">' + escapeHtml(label || "Material") + '</option>';
        }).join("");
      })
      .catch(function() {
        var target = document.getElementById("providerRespMaterial");
        if (target) target.innerHTML = '<option value="">No se pudo cargar materiales</option>';
      });
  }

  function saveProviderSalesResponsible_(idProveedor, button) {
    var nameEl = document.getElementById("providerRespName");
    var matEl = document.getElementById("providerRespMaterial");
    var priceEl = document.getElementById("providerRespPrice");
    var startEl = document.getElementById("providerRespStart");
    var endEl = document.getElementById("providerRespEnd");
    var nombre = String(nameEl && nameEl.value || "").trim();
    var idMaterial = String(matEl && matEl.value || "").trim();
    var precio = Number(priceEl && priceEl.value);
    if (!nombre) { toast("Falta el responsable", "Escribe el nombre del responsable de venta.", true); return; }
    if (!idMaterial) { toast("Falta el material", "Selecciona el material para el alta rápida.", true); return; }
    if (!isFinite(precio) || precio < 0) { toast("Precio inválido", "Indica un precio base mayor o igual a 0.", true); return; }
    var state = providerSalesResponsiblesState_()[idProveedor] || { rows: [] };
    var duplicado = (state.rows || []).some(function(item) {
      if (String(item.idMaterial || "") !== idMaterial) return false;
      if (String(item.responsableVenta || "").trim().toLowerCase() !== nombre.toLowerCase()) return false;
      var hoy = new Date().toISOString().slice(0, 10);
      var fin = String(item.fechaFin || "").slice(0, 10);
      return !fin || fin >= hoy;
    });
    if (duplicado) { toast("Responsable ya registrado", "Ese material ya tiene ese responsable en una lista vigente.", true); return; }
    var idNegocio = null;
    (state.rows || []).some(function(item) {
      if (item.idNegocio) { idNegocio = item.idNegocio; return true; }
      return false;
    });
    if (button) button.disabled = true;
    secureRpc("guardarPrecioIndividualMaterialesPreciosModulo", [{
      idProveedor: idProveedor, idNegocio: idNegocio, idMaterial: idMaterial,
      precioBase: precio, moneda: "PEN", responsableVenta: nombre,
      fechaInicio: String(startEl && startEl.value || "").slice(0, 10),
      fechaFin: String(endEl && endEl.value || "").slice(0, 10)
    }], "PROVEEDORES")
      .then(function(result) {
        toast("Responsable agregado", (result && result.mensaje) || "El precio con ese responsable fue registrado.");
        try { if (typeof clearMpTableCache === "function") clearMpTableCache("prices"); } catch (errClearB1) {}
        try { if (typeof clearMpSummaryCache === "function") clearMpSummaryCache(); } catch (errClearB2) {}
        loadProviderSalesResponsibles_(idProveedor);
      })
      .catch(function(error) {
        toast("No se pudo agregar", errorMessage(error), true);
        if (button) button.disabled = false;
      });
  }

  function loadProviderModuleEditor(id) {
    openSideSheet({
      eyebrow: "EDITAR PROVEEDOR",
      title: "Cargando…",
      body: loadingHtml(6),
      footer: ""
    });
    secureRpc(
      "obtenerDetalleProveedorModulo",
      [id],
      "PROVEEDORES"
    ).then(function(provider) {
      openProviderModuleEditor(provider);
    }).catch(function(error) {
      closeSideSheet();
      toast(
        "No fue posible abrir el proveedor",
        errorMessage(error),
        true
      );
    });
  }

  function openProviderModuleEditor(provider) {
    const isNew = !provider;
    const data = provider || {
      estado: "ACTIVO",
      idsOficina: [],
      idsGrupo: []
    };
    const selectedOffices = {};
    const selectedGroups = {};
    (data.idsOficina || []).forEach(function(id) { selectedOffices[id] = true; });
    (data.idsGrupo || []).forEach(function(id) { selectedGroups[id] = true; });

    const metadata = isNew ?
      '<div class="field"><span>Código interno</span><strong>Se generará automáticamente</strong><small class="providers-field-hint">Este código será permanente y se usará en todas las asignaciones.</small></div>' :
      '<label class="field"><span>Código interno</span><input name="idProveedor" value="' +
        escapeHtml(data.idProveedor) +
        '" readonly><small class="providers-field-hint">No modificable.</small></label>' +
      '<label class="field"><span>Fecha de creación</span><input value="' +
        escapeHtml(formatProviderDate(data.fechaCreacion)) +
        '" readonly></label>' +
      '<label class="field"><span>Última modificación</span><input value="' +
        escapeHtml(formatProviderDate(data.fechaModificacion)) +
        '" readonly></label>';
    const body = '<form id="providerModuleForm" class="form-grid" novalidate>' +
      '<label class="field"><span>Razón social</span><input name="razonSocial" maxlength="200" value="' +
        escapeHtml(data.razonSocial || data.nombre || "") +
        '" required></label>' +
      '<label class="field"><span>Nombre comercial <small>(opcional)</small></span><input name="nombreComercial" maxlength="180" value="' +
        escapeHtml(data.nombreComercial || "") +
        '"></label>' +
      '<label class="field"><span>Código SAP <small>(opcional)</small></span><input name="codigoSap" maxlength="80" pattern="[A-Za-z0-9]*" value="' +
        escapeHtml(data.codigoSap || "") +
        '" autocomplete="off"><small class="providers-field-hint">Solo caracteres alfanuméricos; se guardará en mayúsculas.</small></label>' +
      '<label class="field"><span>RUC <small>(opcional)</small></span><input name="ruc" maxlength="11" inputmode="numeric" pattern="[0-9]{11}" value="' +
        escapeHtml(data.ruc || "") +
        '" autocomplete="off"><small class="providers-field-hint">Exactamente 11 dígitos o vacío.</small></label>' +
      '<label class="field field--full"><span>Descripción</span><textarea name="descripcion" maxlength="1000">' +
        escapeHtml(data.descripcion || "") +
        '</textarea></label>' +
      '<label class="field"><span>Estado</span><select name="estado"><option value="ACTIVO" ' +
        (data.estado === "ACTIVO" ? "selected" : "") +
        '>ACTIVO</option><option value="INACTIVO" ' +
        (data.estado === "INACTIVO" ? "selected" : "") +
        '>INACTIVO</option></select></label>' +
      metadata +
      '</form>';

    openSideSheet({
      eyebrow: isNew ? "NUEVO PROVEEDOR" : "EDITAR PROVEEDOR",
      title: isNew ? "Nuevo proveedor" :
        (
          data.nombreMostrar ||
          data.nombreComercial ||
          data.razonSocial ||
          data.idProveedor
        ),
      body: body,
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button>' +
        '<button id="providerModuleSaveButton" class="button button--primary has-tooltip" type="button" data-tooltip="Guardar" aria-label="Guardar" title="Guardar"><span class="material-symbols-rounded">save</span></button>'
    });

    bindProviderSheetClose();
    on("providerModuleSaveButton", "click", saveProviderModuleForm);

    const sap = document.querySelector('#providerModuleForm [name="codigoSap"]');
    if (sap) {
      sap.addEventListener("input", function() {
        sap.value = sap.value.trimStart().toUpperCase();
      });
    }

    const ruc = document.querySelector('#providerModuleForm [name="ruc"]');
    if (ruc) {
      ruc.addEventListener("input", function() {
        ruc.value = ruc.value.replace(/\D/g, "").slice(0, 11);
      });
    }

    if (cachedOptions) {
      bindProviderAssignmentSelectors(cachedOptions);
    } else {
      loadProviderOptions().then(function(options) {
        hydrateProviderAssignmentOptions(options, selectedOffices, selectedGroups);
      }).catch(function(error) {
        const container = document.getElementById("providerAssignmentSelectors");
        if (container) {
          container.innerHTML = '<div class="providers-office-load-error">' +
            '<span class="material-symbols-rounded">error</span>' +
            '<div><strong>No fue posible cargar canal y grupos</strong><small>' +
            escapeHtml(errorMessage(error)) + '</small>' +
            '<button id="providerRetryOptionsButton" class="button button--secondary button--compact" type="button">Reintentar</button></div></div>';
          on("providerRetryOptionsButton", "click", function() {
            if (container) {
              container.innerHTML = '<div class="providers-office-loading"><span class="spinner" aria-hidden="true"></span><div><strong>Cargando canal y grupos…</strong></div></div>';
            }
            loadProviderOptions(true).then(function(options) {
              hydrateProviderAssignmentOptions(options, selectedOffices, selectedGroups);
            }).catch(function(retryError) {
              toast("No fue posible cargar canal y grupos", errorMessage(retryError), true);
            });
          });
        }
      });
    }
  }

  function renderProviderAssignmentSelectors(options, selectedOffices, selectedGroups) {
    const offices = options && options.oficinas || [];
    const groups = options && options.grupos || [];
    return '<div class="providers-multi-field" hidden><span class="field-label">Canal de venta <small>(oficinas)</small></span>' +
      renderProviderMultiChecklist("office", "Buscar oficina…", "idsOficina", offices.map(function(office) {
        return {
          value: office.idOficina,
          label: office.nombre || office.idOficina,
          detail: office.idOficina + (office.descripcion ? " · " + office.descripcion : ""),
          checked: selectedOffices && selectedOffices[office.idOficina]
        };
      }), "Sin canal asignado") +
      '<small class="providers-field-hint">Opcional. Si no seleccionas canal, el proveedor quedará solo como abastecedor.</small></div>' +
      '<div class="providers-multi-field" hidden><span class="field-label">Grupo de vendedores <small>(opcional)</small></span>' +
      renderProviderMultiChecklist("group", "Buscar grupo…", "idsGrupo", groups.map(function(group) {
        return {
          value: group.idGrupo,
          label: group.nombre || group.idGrupo,
          detail: (group.nombreOficina || group.idOficina) + " · " + group.idGrupo,
          officeId: group.idOficina,
          checked: selectedGroups && selectedGroups[group.idGrupo]
        };
      }), "Todos los grupos") +
      '<small class="providers-field-hint">Sin selección = todos los grupos de las oficinas seleccionadas.</small></div>';
  }

  function renderProviderMultiChecklist(type, placeholder, name, items, emptyLabel) {
    const total = (items || []).length;
    const checked = (items || []).filter(function(item) { return item.checked; }).length;
    const summary = checked ? checked + " seleccionado(s)" : emptyLabel;
    return '<div class="providers-combo-multi" data-provider-multiselect="' + escapeHtml(type) + '">' +
      '<button class="providers-combo-trigger" type="button" data-provider-multiselect-trigger="' + escapeHtml(type) + '">' +
        '<span id="provider' + escapeHtml(capitalizeProviderToken(type)) + 'Summary">' + escapeHtml(summary) + '</span>' +
        '<small>' + escapeHtml(total + " opción(es)") + '</small>' +
        '<span class="material-symbols-rounded">expand_more</span>' +
      '</button>' +
      '<div class="providers-combo-panel" data-provider-multiselect-panel="' + escapeHtml(type) + '" hidden>' +
        '<input class="providers-combo-search" type="search" placeholder="' + escapeHtml(placeholder) + '" data-provider-search="' + escapeHtml(type) + '">' +
        '<div class="providers-combo-actions"><button class="icon-button has-tooltip" type="button" data-provider-select-all="' + escapeHtml(type) + '" data-tooltip="Todos" aria-label="Todos" title="Todos"><span class="material-symbols-rounded">done_all</span></button><button class="icon-button has-tooltip" type="button" data-provider-clear="' + escapeHtml(type) + '" data-tooltip="Limpiar" aria-label="Limpiar" title="Limpiar"><span class="material-symbols-rounded">clear_all</span></button></div>' +
        '<div class="providers-combo-options" data-provider-options="' + escapeHtml(type) + '">' +
          renderProviderMultiOptions(name, items) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderProviderMultiOptions(name, items) {
    return (items || []).map(function(item) {
      return '<label class="providers-check-option" data-provider-option-label="' +
        escapeHtml((item.label + " " + item.detail).toLowerCase()) + '" data-provider-office-id="' +
        escapeHtml(item.officeId || "") + '"><input type="checkbox" name="' +
        escapeHtml(name) + '" value="' + escapeHtml(item.value) + '" ' +
        (item.checked ? "checked" : "") + '><span><strong>' +
        escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.detail || item.value) +
        '</small></span></label>';
    }).join("") || '<p class="providers-field-hint providers-combo-empty">No hay opciones disponibles.</p>';
  }

  function hydrateProviderAssignmentOptions(options, selectedOffices, selectedGroups) {
    const container = document.getElementById("providerAssignmentSelectors");
    if (!container) return;
    container.innerHTML = renderProviderAssignmentSelectors(options, selectedOffices || {}, selectedGroups || {});
    bindProviderAssignmentSelectors(options);
    const save = document.getElementById("providerModuleSaveButton");
    if (save) save.disabled = false;
  }

  function bindProviderAssignmentSelectors(options) {
    document.querySelectorAll("[data-provider-multiselect-trigger]").forEach(function(button) {
      button.addEventListener("click", function() {
        const type = button.dataset.providerMultiselectTrigger;
        const panel = document.querySelector('[data-provider-multiselect-panel="' + type + '"]');
        if (!panel) return;
        const shouldOpen = panel.hidden;
        document.querySelectorAll("[data-provider-multiselect-panel]").forEach(function(item) {
          item.hidden = true;
        });
        panel.hidden = !shouldOpen;
        if (shouldOpen) {
          const search = panel.querySelector("[data-provider-search]");
          if (search) search.focus();
        }
      });
    });
    document.querySelectorAll("[data-provider-search]").forEach(function(input) {
      input.addEventListener("input", function() {
        filterProviderMultiOptions(input.dataset.providerSearch, input.value || "");
      });
    });
    document.querySelectorAll("[data-provider-select-all]").forEach(function(button) {
      button.addEventListener("click", function() {
        setProviderVisibleOptions(button.dataset.providerSelectAll, true);
      });
    });
    document.querySelectorAll("[data-provider-clear]").forEach(function(button) {
      button.addEventListener("click", function() {
        setProviderVisibleOptions(button.dataset.providerClear, false);
      });
    });
    document.querySelectorAll('#providerModuleForm [name="idsOficina"]').forEach(function(input) {
      input.addEventListener("change", function() { syncProviderGroupOptions(options); });
    });
    document.querySelectorAll('#providerModuleForm [name="idsGrupo"]').forEach(function(input) {
      input.addEventListener("change", updateProviderMultiSummaries);
    });
    syncProviderGroupOptions(options);
    updateProviderMultiSummaries();
  }

  function filterProviderMultiOptions(type, value) {
    const text = String(value || "").trim().toLowerCase();
    document.querySelectorAll('[data-provider-options="' + type + '"] .providers-check-option').forEach(function(item) {
      const match = !text || String(item.dataset.providerOptionLabel || "").indexOf(text) !== -1;
      item.hidden = !match;
    });
  }

  function setProviderVisibleOptions(type, checked) {
    document.querySelectorAll('[data-provider-options="' + type + '"] .providers-check-option').forEach(function(item) {
      if (item.hidden || item.classList.contains("is-disabled")) return;
      const input = item.querySelector('input[type="checkbox"]');
      if (input && !input.disabled) input.checked = checked;
    });
    if (type === "office") syncProviderGroupOptions(PROVIDERS_STATE.options || {});
    updateProviderMultiSummaries();
  }

  function syncProviderGroupOptions(options) {
    const selectedOffices = getProviderSelectedValues("idsOficina");
    const selectedMap = {};
    selectedOffices.forEach(function(id) { selectedMap[id] = true; });
    const hasOffices = selectedOffices.length > 0;
    const groupPanel = document.querySelector('[data-provider-multiselect="group"]');
    if (groupPanel) groupPanel.classList.toggle("is-disabled", !hasOffices);
    document.querySelectorAll('[data-provider-options="group"] .providers-check-option').forEach(function(item) {
      const officeId = item.dataset.providerOfficeId || "";
      const enabled = hasOffices && selectedMap[officeId];
      const input = item.querySelector('input[type="checkbox"]');
      item.classList.toggle("is-disabled", !enabled);
      item.hidden = !enabled;
      if (input) {
        input.disabled = !enabled;
        if (!enabled) input.checked = false;
      }
    });
    updateProviderMultiSummaries();
  }

  function updateProviderMultiSummaries() {
    const offices = getProviderSelectedValues("idsOficina").length;
    const groups = getProviderSelectedValues("idsGrupo").length;
    const officeSummary = document.getElementById("providerOfficeSummary");
    const groupSummary = document.getElementById("providerGroupSummary");
    if (officeSummary) officeSummary.textContent = offices ? offices + " oficina(s)" : "Sin canal asignado";
    if (groupSummary) {
      groupSummary.textContent = groups ? groups + " grupo(s)" : (offices ? "Todos los grupos" : "Selecciona canal primero");
    }
  }

  function getProviderSelectedValues(name) {
    return Array.from(document.querySelectorAll('#providerModuleForm [name="' + name + '"]:checked')).map(function(item) {
      return item.value;
    });
  }

  function capitalizeProviderToken(value) {
    value = String(value || "");
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  }

  function loadProviderOptions(force) {
    if (force === true) {
      PROVIDERS_STATE.options = null;
      PROVIDERS_STATE.optionsPromise = null;
    }
    if (PROVIDERS_STATE.options) {
      return Promise.resolve(PROVIDERS_STATE.options);
    }
    if (PROVIDERS_STATE.optionsPromise) {
      return PROVIDERS_STATE.optionsPromise;
    }

    PROVIDERS_STATE.optionsPromise = secureRpc(
      "obtenerOpcionesProveedorModulo",
      [],
      "PROVEEDORES"
    ).then(function(options) {
      PROVIDERS_STATE.options = options || { oficinas: [], grupos: [] };
      return PROVIDERS_STATE.options;
    }).finally(function() {
      PROVIDERS_STATE.optionsPromise = null;
    });

    return PROVIDERS_STATE.optionsPromise;
  }

  function saveProviderModuleForm() {
    const form = document.getElementById("providerModuleForm");
    if (!form || !form.reportValidity()) return;

    const codigoSap = String(
      form.elements.codigoSap.value || ""
    ).trim().toUpperCase();
    const ruc = String(form.elements.ruc.value || "").trim();

    if (codigoSap && !/^[A-Z0-9]+$/.test(codigoSap)) {
      toast(
        "Código SAP inválido",
        "Utiliza únicamente caracteres alfanuméricos.",
        true
      );
      return;
    }
    if (ruc && !/^\d{11}$/.test(ruc)) {
      toast(
        "RUC inválido",
        "El RUC debe contener exactamente 11 dígitos.",
        true
      );
      return;
    }

    const payload = {
      idProveedor: form.elements.idProveedor ?
        form.elements.idProveedor.value : "",
      razonSocial: form.elements.razonSocial.value.trim(),
      nombreComercial: (form.elements.nombreComercial ? form.elements.nombreComercial.value : "").trim(),
      codigoSap: codigoSap,
      ruc: ruc,
      descripcion: form.elements.descripcion ? form.elements.descripcion.value : "",
      idsOficina: [],
      idsGrupo: [],
      estado: form.elements.estado.value
    };

    const button = document.getElementById("providerModuleSaveButton");
    if (button) button.disabled = true;

    secureRpc(
      "guardarProveedorModulo",
      [payload],
      "PROVEEDORES"
    ).then(function(saved) {
      invalidateProvidersLocalCache();
      closeSideSheet();
      toast("Proveedor guardado", "El proveedor fue registrado correctamente.");
      refreshProvidersWorkspace(true);
      showProviderSavedConfirmation(saved);
    }).catch(function(error) {
      toast(
        "No fue posible guardar",
        errorMessage(error),
        true
      );
    }).finally(function() {
      const current = document.getElementById(
        "providerModuleSaveButton"
      );
      if (current) current.disabled = false;
    });
  }

  function showProviderSavedConfirmation(saved) {
    saved = saved || {};
    const id = saved.idProveedor || saved.ID_PROVEEDOR || "";
    const name = saved.nombreMostrar || saved.nombreComercial || saved.razonSocial || "Proveedor";
    openModal({
      eyebrow: "PROVEEDOR GUARDADO",
      title: "Registro confirmado",
      body: '<div class="providers-save-confirmation"><span class="material-symbols-rounded">check_circle</span>' +
        '<div><strong>' + escapeHtml(name) + '</strong>' +
        '<p>El proveedor fue guardado correctamente.</p>' +
        '<ul><li>Código interno: <code>' + escapeHtml(id || "Generado") + '</code></li>' +
        '<li>Estado: ' + escapeHtml(saved.estado || "ACTIVO") + '</li></ul></div></div>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cerrar</button>' +
        (id ? '<button id="providerSavedViewButton" class="button button--primary has-tooltip" type="button" data-tooltip="Ver detalle" aria-label="Ver detalle" title="Ver detalle"><span class="material-symbols-rounded">visibility</span></button>' : '')
    });
    bindProviderModalClose();
    on("providerSavedViewButton", "click", function() {
      closeModal();
      openProviderModuleDetail(id);
    });
  }

  function confirmProviderStatusChange(id, status) {
    openModal({
      eyebrow: "CAMBIAR ESTADO",
      title: status === "ACTIVO" ? "Activar proveedor" : "Inactivar proveedor",
      body: '<p>¿Confirmas el cambio de estado del proveedor <strong>' + escapeHtml(id) + '</strong> a <strong>' + escapeHtml(status) + '</strong>?</p>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button><button id="providerConfirmStatusButton" class="button button--primary has-tooltip" type="button" data-tooltip="Confirmar" aria-label="Confirmar" title="Confirmar"><span class="material-symbols-rounded">check</span></button>'
    });
    bindProviderModalClose();
    on("providerConfirmStatusButton", "click", function() {
      const button = document.getElementById("providerConfirmStatusButton");
      if (button) button.disabled = true;
      secureRpc("cambiarEstadoProveedorModulo", [id, status], "PROVEEDORES")
        .then(function() { closeModal(); invalidateProvidersLocalCache(); toast("Estado actualizado", "El proveedor fue actualizado."); refreshProvidersWorkspace(true); })
        .catch(function(error) { toast("No fue posible cambiar el estado", errorMessage(error), true); if (button) button.disabled = false; });
    });
  }

  function handleProvidersImportFile(event) {
    const input = event && event.target;
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast(
        "Archivo demasiado grande",
        "El máximo permitido es 5 MB.",
        true
      );
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function() {
      const content = String(reader.result || "");
      const metadata = {
        nombre: file.name,
        tamano: file.size,
        tipoMime: file.type || "text/csv"
      };
      openMassImportPreview({
        tipo: "PROVEEDORES",
        etiqueta: "Proveedores",
        nota: "La plantilla no usa ID_PROVEEDOR ni ESTADO. El ID lo genera la herramienta y todo proveedor cargado queda ACTIVO. CODIGO_CANALES_VENTA y CODIGO_GRUPOS_VENDEDORES aceptan varios valores separados por |.",
        file: file,
        content: content,
        moduleCode: "PROVEEDORES",
        previewOperation: "previsualizarImportacionProveedoresModulo",
        approveOperation: "aprobarImportacionProveedoresModulo",
        buildPreviewArgs: function() {
          return [content, metadata];
        },
        buildApproveArgs: function(token) {
          return [token, content, metadata];
        },
        onApproved: function() {
          invalidateProvidersLocalCache();
          return refreshProvidersWorkspace(true);
        }
      });
    };
    reader.onerror = function() {
      toast(
        "No fue posible leer el archivo",
        "Selecciona nuevamente el CSV.",
        true
      );
    };
    reader.readAsText(file, "UTF-8");
    input.value = "";
  }

  function exportProvidersModule() {
    secureRpc("exportarProveedoresModulo", [{ texto: PROVIDERS_STATE.search, estado: PROVIDERS_STATE.status }], "PROVEEDORES")
      .then(function(file) { downloadProviderTextFile(file.nombre, file.contenido, "text/csv;charset=utf-8"); toast("Exportación lista", (file.cantidad || 0) + " proveedores exportados."); })
      .catch(function(error) { toast("No fue posible exportar", errorMessage(error), true); });
  }

  function downloadProvidersTemplate() {
    secureRpc("obtenerPlantillaProveedoresModulo", [], "PROVEEDORES")
      .then(function(file) { downloadProviderTextFile(file.nombre, file.contenido, "text/csv;charset=utf-8"); toast("Plantilla lista", "Plantilla CSV con columnas: RAZON_SOCIAL, NOMBRE_COMERCIAL, CODIGO_SAP, RUC, DESCRIPCION."); })
      .catch(function(error) { toast("No fue posible descargar la plantilla", errorMessage(error), true); });
  }

  function downloadProviderTextFile(name, content, type) {
    const blob = new Blob([content || ""], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = name || "archivo.txt";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  function formatProviderDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  }

  function formatProviderFileSize(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    return (value / (1024 * 1024)).toFixed(1) + " MB";
  }

  function bindProviderSheetClose() {
    document.querySelectorAll("[data-sheet-close]").forEach(function(item) { item.addEventListener("click", closeSideSheet); });
  }

  function bindProviderModalClose() {
    document.querySelectorAll("[data-modal-close]").forEach(function(item) { item.addEventListener("click", closeModal); });
  }

  /* AGENTE C 2026-09-19: carga masiva para ACTUALIZAR oficinas (canal de ventas)
   * y grupos de vendedores por proveedor. Archivo simple CSV/XLSX con columnas
   * PROVEEDOR, OFICINA, GRUPO. Crea las oficinas y grupos que falten y fusiona
   * rel_proveedor_oficinas + codigo_canales_venta/codigo_grupos_vendedores sin
   * borrar las asignaciones existentes. Flujo validar -> previsualizar ->
   * confirmar con reporte por fila. Todo se resuelve en cliente con los RPC
   * existentes (listarProveedoresModulo, obtenerOpcionesProveedorModulo,
   * guardarOficinaAdminMotor, guardarGrupoAdminMotor, guardarProveedorModulo). */
  var PROVIDERS_CHANNEL_BULK_STATE = { fileName: "", rows: [], busy: false };

  function ensureProvidersChannelBulkUI() {
    const button = document.getElementById("providersChannelBulkButton");
    if (button && button.parentNode) button.parentNode.removeChild(button);
  }

  function applyProvidersChannelBulkVisibility() {
    const button = document.getElementById("providersChannelBulkButton");
    if (button) button.hidden = true;
  }

  function openProvidersChannelBulkIntro_() {
    openModal({
      eyebrow: "CARGA MASIVA",
      title: "Actualizar canal y grupos",
      body: '<div class="providers-detail-section"><p>Actualiza las oficinas (canal de ventas) y grupos de vendedores de cada proveedor desde un archivo simple. Las oficinas y grupos que no existan <strong>se crean</strong> y se asignan sin borrar las asignaciones vigentes.</p>' +
        '<div class="providers-detail-grid">' +
        '<div class="providers-detail-item"><span>PROVEEDOR</span><strong>Obligatorio</strong><small class="providers-field-hint">Debe existir (razón social, nombre comercial o código interno).</small></div>' +
        '<div class="providers-detail-item"><span>OFICINA</span><strong>Obligatorio si hay grupo</strong><small class="providers-field-hint">Se crea si no existe.</small></div>' +
        '<div class="providers-detail-item"><span>GRUPO</span><strong>Opcional</strong><small class="providers-field-hint">Se crea bajo la oficina de su fila.</small></div>' +
        '<div class="providers-detail-item"><span>Flujo</span><strong>Validar, previsualizar y confirmar</strong><small class="providers-field-hint">Nada se guarda hasta confirmar.</small></div>' +
        '</div><p class="providers-import-note">El grupo siempre pertenece a la oficina de su misma fila. Una fila solo con proveedor y sin oficina ni grupo se omite.</p></div>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cerrar</button>' +
        '<button id="providersChannelTemplateBtn" class="button button--secondary has-tooltip" type="button" data-tooltip="Descargar plantilla" aria-label="Descargar plantilla" title="Descargar plantilla"><span class="material-symbols-rounded">download</span></button>' +
        '<button id="providersChannelPickBtn" class="button button--primary has-tooltip" type="button" data-tooltip="Seleccionar archivo" aria-label="Seleccionar archivo" title="Seleccionar archivo"><span class="material-symbols-rounded">folder_open</span></button>'
    });
    bindProviderModalClose();
    on("providersChannelTemplateBtn", "click", downloadProvidersChannelTemplate_);
    on("providersChannelPickBtn", "click", function() {
      const input = document.getElementById("providersChannelBulkInput");
      if (input) input.click();
    });
  }

  function downloadProvidersChannelTemplate_() {
    downloadProviderTextFile(
      "plantilla_proveedor_canal_grupos.csv",
      "\uFEFFPROVEEDOR,OFICINA,GRUPO\r\nEJEMPLO Proveedor,EJEMPLO Oficina,EJEMPLO Grupo\r\n",
      "text/csv;charset=utf-8"
    );
    toast("Plantilla lista", "Columnas: PROVEEDOR, OFICINA, GRUPO.");
  }

  function handleProvidersChannelBulkFile(event) {
    const input = event && event.target;
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Archivo demasiado grande", "El máximo permitido es 5 MB.", true);
      input.value = "";
      return;
    }
    const name = String(file.name || "");
    if (/\.(xlsx|xlsm|xls)$/i.test(name)) {
      if (!window.XLSX) {
        toast("Falta la librería XLSX", "Usa un archivo CSV o recarga el módulo de Materiales y Precios primero.", true);
        input.value = "";
        return;
      }
      const readerBin = new FileReader();
      readerBin.onload = function() {
        try {
          const workbook = window.XLSX.read(readerBin.result, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const aoa = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
          openProvidersChannelPreview_(mapProvidersChannelRows_(aoa), name);
        } catch (error) {
          toast("No fue posible leer el Excel", errorMessage(error), true);
        }
      };
      readerBin.onerror = function() {
        toast("No fue posible leer el archivo", "Selecciona nuevamente el archivo.", true);
      };
      readerBin.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = function() {
        try {
          openProvidersChannelPreview_(parseProvidersChannelCsv_(String(reader.result || "")), name);
        } catch (error) {
          toast("No fue posible validar el archivo", errorMessage(error), true);
        }
      };
      reader.onerror = function() {
        toast("No fue posible leer el archivo", "Selecciona nuevamente el CSV.", true);
      };
      reader.readAsText(file, "UTF-8");
    }
    input.value = "";
  }

  function providersChannelNormHeader_(value) {
    let text = String(value == null ? "" : value);
    try { text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (ignore) {}
    return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function mapProvidersChannelRows_(aoa) {
    aoa = aoa || [];
    let headerIdx = -1;
    let map = {};
    for (let r = 0; r < aoa.length; r++) {
      const cells = aoa[r] || [];
      const candidate = {};
      for (let c = 0; c < cells.length; c++) {
        const key = providersChannelNormHeader_(cells[c]);
        if ((key === "PROVEEDOR" || key === "RAZONSOCIAL" || key === "NOMBRECOMERCIAL" || key === "PROVEEDORNOMBRE" || key === "NOMBREPROVEEDOR") && candidate.proveedor == null) candidate.proveedor = c;
        else if ((key === "OFICINA" || key === "OFICINAS" || key === "CANAL" || key === "CANALVENTA" || key === "CANALESVENTA" || key === "OFICINAVENTA" || key === "NOMBREOFICINA") && candidate.oficina == null) candidate.oficina = c;
        else if ((key === "GRUPO" || key === "GRUPOS" || key === "GRUPOVENDEDOR" || key === "GRUPOVENDEDORES" || key === "GRUPOSVENDEDORES" || key === "GRUPOVENTA" || key === "GRUPOVENTAS" || key === "NOMBREGRUPO") && candidate.grupo == null) candidate.grupo = c;
      }
      if (candidate.proveedor != null) { headerIdx = r; map = candidate; break; }
    }
    if (headerIdx === -1) throw new Error("No se encontró el encabezado (se esperaba PROVEEDOR, OFICINA, GRUPO).");
    const out = [];
    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const cell = function(idx) { return (idx == null || idx >= row.length) ? "" : String(row[idx] == null ? "" : row[idx]).trim(); };
      const prov = cell(map.proveedor);
      const ofi = cell(map.oficina);
      const gru = cell(map.grupo);
      if (!prov && !ofi && !gru) continue;
      if (/^EJEMPLO/i.test(prov)) continue;
      out.push({ linea: out.length + 1, proveedor: prov, oficina: ofi, grupo: gru });
    }
    return out;
  }

  function splitProvidersChannelLine_(line, delimiter) {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (line.charAt(i + 1) === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map(function(item) { return String(item).trim(); });
  }

  function parseProvidersChannelCsv_(text) {
    const cleaned = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    cleaned.split(/\r\n|\r|\n/).forEach(function(line) {
      if (String(line).trim() !== "") rows.push(line);
    });
    if (!rows.length) throw new Error("El archivo está vacío.");
    const first = rows[0];
    const semis = (first.match(/;/g) || []).length;
    const commas = (first.match(/,/g) || []).length;
    const delimiter = semis >= commas ? ";" : ",";
    const aoa = rows.map(function(line) { return splitProvidersChannelLine_(line, delimiter); });
    return mapProvidersChannelRows_(aoa);
  }

  function findProviderChannel_(providers, name) {
    const wanted = String(name || "").trim().toLowerCase();
    if (!wanted) return null;
    for (let i = 0; i < (providers || []).length; i++) {
      const item = providers[i] || {};
      if (String(item.idProveedor || "").trim().toLowerCase() === wanted) return item;
      if (String(item.razonSocial || "").trim().toLowerCase() === wanted) return item;
      if (String(item.nombreComercial || "").trim().toLowerCase() === wanted) return item;
    }
    return null;
  }

  function findOfficeChannel_(offices, name) {
    const wanted = String(name || "").trim().toLowerCase();
    if (!wanted) return null;
    for (let i = 0; i < (offices || []).length; i++) {
      const item = offices[i] || {};
      if (String(item.idOficina || "").trim().toLowerCase() === wanted) return item;
      if (String(item.nombre || "").trim().toLowerCase() === wanted) return item;
    }
    return null;
  }

  function findGroupChannel_(groups, officeId, name) {
    const wanted = String(name || "").trim().toLowerCase();
    if (!wanted || !officeId) return null;
    for (let i = 0; i < (groups || []).length; i++) {
      const item = groups[i] || {};
      if (String(item.idOficina || "") !== String(officeId)) continue;
      if (String(item.idGrupo || "").trim().toLowerCase() === wanted) return item;
      if (String(item.nombre || "").trim().toLowerCase() === wanted) return item;
    }
    return null;
  }

  function providersChannelSlug_(prefix, name, takenIds) {
    let text = String(name || "");
    try { text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (ignore) {}
    const slug = text.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "NUEVO";
    const base = String(prefix || "") + slug;
    let candidate = base;
    let suffix = 2;
    takenIds = takenIds || [];
    while (takenIds.indexOf(candidate) !== -1) {
      candidate = (base + "-" + suffix).slice(0, 40);
      suffix += 1;
    }
    takenIds.push(candidate);
    return candidate;
  }

  function validateProvidersChannelRows_(rows, catalog) {
    return (rows || []).map(function(row) {
      const item = { linea: row.linea, proveedor: row.proveedor, oficina: row.oficina, grupo: row.grupo, estado: "OK", accion: "ACTUALIZAR", detalle: "" };
      if (!row.proveedor) { item.estado = "ERROR"; item.accion = "OMITIR"; item.detalle = "Falta PROVEEDOR."; return item; }
      const provider = findProviderChannel_(catalog.providers, row.proveedor);
      if (!provider) { item.estado = "ERROR"; item.accion = "OMITIR"; item.detalle = "Proveedor no existe: créalo primero (Nuevo proveedor o carga de materiales)."; return item; }
      item.idProveedor = provider.idProveedor;
      if (!row.oficina && !row.grupo) { item.estado = "SIN_CAMBIOS"; item.accion = "OMITIR"; item.detalle = "Sin oficina ni grupo: nada que actualizar."; return item; }
      if (!row.oficina && row.grupo) { item.estado = "ERROR"; item.accion = "OMITIR"; item.detalle = "El grupo requiere OFICINA en la misma fila."; return item; }
      const office = findOfficeChannel_(catalog.offices, row.oficina);
      const notes = [];
      if (!office) notes.push("Se creará la oficina");
      else item.idOficina = office.idOficina;
      if (row.grupo) {
        const group = office ? findGroupChannel_(catalog.groups, office.idOficina, row.grupo) : null;
        if (office && !group) notes.push("se creará el grupo");
        if (office && group) {
          item.idGrupo = group.idGrupo;
          const hasOffice = (provider.idsOficina || []).indexOf(office.idOficina) !== -1;
          const hasGroup = (provider.idsGrupo || []).indexOf(group.idGrupo) !== -1;
          if (hasOffice && hasGroup) { item.estado = "SIN_CAMBIOS"; item.accion = "OMITIR"; item.detalle = "Ya asignado al proveedor."; return item; }
        }
      } else if (office) {
        if ((provider.idsOficina || []).indexOf(office.idOficina) !== -1) { item.estado = "SIN_CAMBIOS"; item.accion = "OMITIR"; item.detalle = "Oficina ya asignada al proveedor."; return item; }
      }
      if (notes.length) { item.estado = "ADVERTENCIA"; item.detalle = notes.join(" y ") + "."; }
      else item.detalle = "Se actualizará la asignación del proveedor.";
      return item;
    });
  }

  function openProvidersChannelPreview_(rows, fileName) {
    if (!rows || !rows.length) {
      toast("Sin filas para validar", "El archivo no trae filas con PROVEEDOR, OFICINA o GRUPO.", true);
      return;
    }
    openModal({
      wide: true,
      eyebrow: "PREVISUALIZACIÓN",
      title: "Validando canal y grupos",
      body: '<div class="providers-office-loading"><span class="spinner" aria-hidden="true"></span><div><strong>Validando ' + escapeHtml(rows.length) + ' fila(s)</strong><small>Todavía no se modificará ningún dato.</small></div></div>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button>'
    });
    bindProviderModalClose();
    Promise.all([
      secureRpc("listarProveedoresModulo", [{ texto: "", estado: "TODOS", pagina: 1, tamano: 5000 }], "PROVEEDORES"),
      secureRpc("obtenerOpcionesProveedorModulo", [], "PROVEEDORES")
    ]).then(function(results) {
      const provResult = results[0] || {};
      const options = results[1] || {};
      const catalog = {
        providers: provResult.registros || provResult.proveedores || [],
        offices: options.oficinas || [],
        groups: options.grupos || []
      };
      const validated = validateProvidersChannelRows_(rows, catalog);
      PROVIDERS_CHANNEL_BULK_STATE = { fileName: fileName || "archivo", rows: validated, busy: false };
      renderProvidersChannelPreview_(validated);
    }).catch(function(error) {
      const body = document.getElementById("modalBody");
      if (body) body.innerHTML = '<p>' + escapeHtml(errorMessage(error)) + '</p>';
      toast("No fue posible validar", errorMessage(error), true);
    });
  }

  function providersChannelBadge_(estado) {
    const code = String(estado || "").toUpperCase();
    if (code === "OK") return '<span class="status-chip is-active">LISTO</span>';
    if (code === "ADVERTENCIA") return '<span class="status-chip is-active">CREARÁ</span>';
    if (code === "SIN_CAMBIOS") return '<span class="providers-field-hint">Sin cambios</span>';
    return '<span class="status-chip is-inactive">ERROR</span>';
  }

  function renderProvidersChannelPreview_(validated) {
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    if (!body || !footer) return;
    const count = function(code) { return validated.filter(function(item) { return item.estado === code; }).length; };
    const ready = count("OK") + count("ADVERTENCIA");
    text("modalTitle", "Revisar canal y grupos (" + String(PROVIDERS_CHANNEL_BULK_STATE.fileName || "archivo") + ")");
    body.innerHTML = '<div class="providers-summary">' +
      '<article class="providers-summary-card"><strong>' + validated.length + '</strong><span>Filas leídas</span></article>' +
      '<article class="providers-summary-card"><strong>' + count("OK") + '</strong><span>Listas</span></article>' +
      '<article class="providers-summary-card"><strong>' + count("ADVERTENCIA") + '</strong><span>Crearán catálogo</span></article>' +
      '<article class="providers-summary-card"><strong>' + count("ERROR") + '</strong><span>Con errores</span></article>' +
      '</div><div class="providers-table-wrap">' + tableHtml([
        { label: "Línea", render: function(row) { return escapeHtml(row.linea); } },
        { label: "Proveedor", render: function(row) { return "<strong>" + escapeHtml(row.proveedor) + "</strong>"; } },
        { label: "Oficina", render: function(row) { return escapeHtml(row.oficina || "—"); } },
        { label: "Grupo", render: function(row) { return escapeHtml(row.grupo || "—"); } },
        { label: "Resultado", render: function(row) { return providersChannelBadge_(row.estado); } },
        { label: "Detalle", render: function(row) { return escapeHtml(row.detalle || ""); } }
      ], validated) + '</div><p class="providers-import-note">Solo las filas listas se guardarán al confirmar. Las filas con error o sin cambios se omiten y quedan en el reporte.</p>';
    footer.innerHTML = '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button>' +
      '<button id="providersChannelConfirmBtn" class="button button--primary has-tooltip" type="button" data-tooltip="Confirmar (' + ready + ')" aria-label="Confirmar (' + ready + ')" title="Confirmar (' + ready + ')" ' + (ready ? "" : "disabled") + '><span class="material-symbols-rounded">check</span></button>';
    bindProviderModalClose();
    on("providersChannelConfirmBtn", "click", confirmProvidersChannelBulk_);
  }

  function applyProvidersChannelRow_(row, catalog, byProvider) {
    const provider = findProviderChannel_(catalog.providers, row.proveedor);
    if (!provider) {
      return Promise.resolve({ linea: row.linea, proveedor: row.proveedor, oficina: row.oficina, grupo: row.grupo, estado: "ERROR", detalle: "El proveedor ya no existe." });
    }
    let office = findOfficeChannel_(catalog.offices, row.oficina);
    let officeCreated = false;
    let groupCreated = false;
    let chain = Promise.resolve();
    if (!office) {
      const taken = catalog.offices.map(function(item) { return item.idOficina; });
      const newOfficeId = providersChannelSlug_("OFI-", row.oficina, taken);
      chain = chain.then(function() {
        return secureRpc("guardarOficinaAdminMotor", [{ idOficina: newOfficeId, nombre: row.oficina, estado: "ACTIVO" }], "PROVEEDORES");
      }).then(function() {
        office = { idOficina: newOfficeId, nombre: row.oficina };
        catalog.offices.push(office);
        officeCreated = true;
      });
    }
    return chain.then(function() {
      if (!row.grupo) return null;
      const group = findGroupChannel_(catalog.groups, office.idOficina, row.grupo);
      if (group) return group;
      const takenGroups = catalog.groups.map(function(item) { return item.idGrupo; });
      const newGroupId = providersChannelSlug_("GRP-", row.grupo, takenGroups);
      return secureRpc("guardarGrupoAdminMotor", [{ idGrupo: newGroupId, idOficina: office.idOficina, nombre: row.grupo, estado: "ACTIVO" }], "PROVEEDORES").then(function() {
        const created = { idGrupo: newGroupId, idOficina: office.idOficina, nombre: row.grupo };
        catalog.groups.push(created);
        groupCreated = true;
        return created;
      });
    }).then(function(group) {
      let entry = byProvider[provider.idProveedor];
      if (!entry) {
        entry = {
          payload: {
            idProveedor: provider.idProveedor,
            razonSocial: provider.razonSocial,
            nombreComercial: provider.nombreComercial,
            codigoSap: provider.codigoSap,
            ruc: provider.ruc,
            descripcion: provider.descripcion,
            idsOficina: (provider.idsOficina || []).slice(),
            idsGrupo: (provider.idsGrupo || []).slice(),
            estado: provider.estado
          },
          rows: []
        };
        byProvider[provider.idProveedor] = entry;
      }
      if (entry.payload.idsOficina.indexOf(office.idOficina) === -1) entry.payload.idsOficina.push(office.idOficina);
      if (group && entry.payload.idsGrupo.indexOf(group.idGrupo) === -1) entry.payload.idsGrupo.push(group.idGrupo);
      entry.rows.push(row.linea);
      const created = [];
      if (officeCreated) created.push("Oficina creada");
      if (groupCreated) created.push("grupo creado");
      return { linea: row.linea, proveedor: row.proveedor, oficina: row.oficina, grupo: row.grupo, estado: "OK", detalle: (created.length ? created.join(" y ") + ". " : "") + "Pendiente de guardar." };
    }).catch(function(error) {
      return { linea: row.linea, proveedor: row.proveedor, oficina: row.oficina, grupo: row.grupo, estado: "ERROR", detalle: errorMessage(error) };
    });
  }

  function confirmProvidersChannelBulk_() {
    const state = PROVIDERS_CHANNEL_BULK_STATE;
    if (!state || state.busy || !state.rows) return;
    const actionable = state.rows.filter(function(item) { return item.estado === "OK" || item.estado === "ADVERTENCIA"; });
    if (!actionable.length) return;
    state.busy = true;
    const confirmButton = document.getElementById("providersChannelConfirmBtn");
    if (confirmButton) confirmButton.disabled = true;
    const body = document.getElementById("modalBody");
    if (body) body.innerHTML = '<div class="providers-office-loading"><span class="spinner" aria-hidden="true"></span><div><strong>Aplicando ' + actionable.length + ' asignación(es)…</strong><small>No cierres esta ventana.</small></div></div>';
    secureRpc("listarProveedoresModulo", [{ texto: "", estado: "TODOS", pagina: 1, tamano: 5000 }], "PROVEEDORES").then(function(provResult) {
      const fresh = provResult.registros || provResult.proveedores || [];
      return secureRpc("obtenerOpcionesProveedorModulo", [], "PROVEEDORES").then(function(options) {
        return { providers: fresh, offices: (options.oficinas || []), groups: (options.grupos || []) };
      });
    }).then(function(catalog) {
      const results = [];
      const byProvider = {};
      let chain = Promise.resolve();
      var doneProv = 0;
      var showProvProgress = function(done, total, label) {
        if (!body) return;
        if (typeof mpBulkProgressUpdate_ === "function") mpBulkProgressUpdate_(body, done, total, label);
        else body.innerHTML = '<div class="providers-office-loading"><span class="spinner" aria-hidden="true"></span><div><strong>' + done + " de " + total + " — " + label + '</strong></div></div>';
      };
      showProvProgress(0, actionable.length, "Revisando filas...");
      actionable.forEach(function(row) {
        chain = chain.then(function() {
          return applyProvidersChannelRow_(row, catalog, byProvider).then(function(result) {
            results.push(result);
            doneProv += 1;
            showProvProgress(doneProv, actionable.length, "Revisando filas...");
          });
        });
      });
      return chain.then(function() {
        let saveChain = Promise.resolve();
        const providerIds = Object.keys(byProvider);
        var doneSave = 0;
        providerIds.forEach(function(id) {
          saveChain = saveChain.then(function() {
            const entry = byProvider[id];
            return secureRpc("guardarProveedorModulo", [entry.payload], "PROVEEDORES").then(function() {
              entry.rows.forEach(function(linea) {
                for (let i = 0; i < results.length; i++) {
                  if (results[i].linea === linea && results[i].estado !== "ERROR") {
                    results[i].estado = "OK";
                    results[i].detalle = (results[i].detalle ? results[i].detalle.replace("Pendiente de guardar.", "").trim() + " " : "") + "Asignación guardada.";
                  }
                }
              });
              doneSave += 1;
              showProvProgress(doneSave, providerIds.length, "Guardando proveedores...");
            }).catch(function(error) {
              entry.rows.forEach(function(linea) {
                for (let i = 0; i < results.length; i++) {
                  if (results[i].linea === linea) { results[i].estado = "ERROR"; results[i].detalle = errorMessage(error); }
                }
              });
              doneSave += 1;
              showProvProgress(doneSave, providerIds.length, "Guardando proveedores...");
            });
          });
        });
        return saveChain.then(function() { return results; });
      });
    }).then(function(results) {
      state.rows.forEach(function(row) {
        if (row.estado === "ERROR" || row.estado === "SIN_CAMBIOS") {
          results.push({ linea: row.linea, proveedor: row.proveedor, oficina: row.oficina, grupo: row.grupo, estado: row.estado, detalle: row.detalle });
        }
      });
      results.sort(function(a, b) { return a.linea - b.linea; });
      state.busy = false;
      PROVIDERS_STATE.options = null;
      PROVIDERS_STATE.optionsPromise = null;
      invalidateProvidersLocalCache();
      refreshProvidersWorkspace(true);
      renderProvidersChannelReport_(results);
    }).catch(function(error) {
      state.busy = false;
      toast("No fue posible confirmar", errorMessage(error), true);
      if (confirmButton) confirmButton.disabled = false;
    });
  }

  function renderProvidersChannelReport_(results) {
    const ok = results.filter(function(item) { return item.estado === "OK"; }).length;
    const errors = results.filter(function(item) { return item.estado === "ERROR"; }).length;
    const skipped = results.length - ok - errors;
    const createdOffices = results.filter(function(item) { return item.estado === "OK" && item.detalle.indexOf("Oficina creada") !== -1; }).length;
    const createdGroups = results.filter(function(item) { return item.estado === "OK" && item.detalle.indexOf("grupo creado") !== -1; }).length;
    openModal({
      wide: true,
      eyebrow: "REPORTE DE CARGA",
      title: "Canal y grupos actualizados",
      body: '<div class="providers-summary">' +
        '<article class="providers-summary-card"><strong>' + ok + '</strong><span>Asignadas</span></article>' +
        '<article class="providers-summary-card"><strong>' + createdOffices + '</strong><span>Oficinas creadas</span></article>' +
        '<article class="providers-summary-card"><strong>' + createdGroups + '</strong><span>Grupos creados</span></article>' +
        '<article class="providers-summary-card"><strong>' + errors + '</strong><span>Con error</span></article>' +
        '<article class="providers-summary-card"><strong>' + skipped + '</strong><span>Omitidas</span></article>' +
        '</div><div class="providers-table-wrap">' + tableHtml([
          { label: "Línea", render: function(row) { return escapeHtml(row.linea); } },
          { label: "Proveedor", render: function(row) { return "<strong>" + escapeHtml(row.proveedor) + "</strong>"; } },
          { label: "Oficina", render: function(row) { return escapeHtml(row.oficina || "—"); } },
          { label: "Grupo", render: function(row) { return escapeHtml(row.grupo || "—"); } },
          { label: "Estado", render: function(row) { return providersChannelBadge_(row.estado); } },
          { label: "Detalle", render: function(row) { return escapeHtml(row.detalle || ""); } }
        ], results) + '</div>',
      footer: '<button class="button button--primary" type="button" data-modal-close>Cerrar</button>'
    });
    bindProviderModalClose();
    toast("Carga de canal completada", ok + " asignada(s) · " + errors + " con error · " + skipped + " omitida(s).", errors > 0);
  }