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
        label: "Canal de ventas",
        render: function(row) {
          if (row.tieneCanalVentas) {
            return '<span class="providers-chip is-soft"><span class="material-symbols-rounded">storefront</span>' +
              escapeHtml((row.cantidadOficinas || 0) + " oficina(s)") + '</span>';
          }
          return '<span class="providers-field-hint">No asignado</span>';
        }
      },
      {
        label: "Grupos derivados",
        render: function(row) {
          return escapeHtml(row.cantidadGrupos || 0);
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
    if (providerPermission("VER_DETALLE")) buttons.push('<button class="icon-button has-tooltip" type="button" data-provider-action="view" data-provider-id="' + escapeHtml(row.idProveedor) + '" title="Ver detalle"><span class="material-symbols-rounded">visibility</span></button>');
    if (providerPermission("EDITAR")) buttons.push('<button class="icon-button has-tooltip" type="button" data-provider-action="edit" data-provider-id="' + escapeHtml(row.idProveedor) + '" title="Editar"><span class="material-symbols-rounded">edit</span></button>');
    if (providerPermission("CAMBIAR_ESTADO")) buttons.push('<button class="icon-button has-tooltip" type="button" data-provider-action="status" data-provider-id="' + escapeHtml(row.idProveedor) + '" data-provider-status="' + (row.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO") + '" title="' + (row.estado === "ACTIVO" ? "Inactivar" : "Activar") + '"><span class="material-symbols-rounded">' + (row.estado === "ACTIVO" ? "toggle_off" : "toggle_on") + '</span></button>');
    return '<div class="providers-row-actions">' + buttons.join("") + '</div>';
  }

  function renderProvidersPagination(pagination) {
    const element = document.getElementById("providersPagination");
    if (!element) return;
    const total = Number(pagination.total || 0);
    const page = Number(pagination.pagina || 1);
    const totalPages = Number(pagination.totalPaginas || 1);
    element.innerHTML = '<span>Página ' + page + ' de ' + totalPages + ' · ' + total + ' registros</span>' +
      '<div class="providers-pagination-actions"><button id="providersPreviousPage" class="button button--ghost button--compact" type="button" ' + (page <= 1 ? "disabled" : "") + '>Anterior</button><button id="providersNextPage" class="button button--ghost button--compact" type="button" ' + (page >= totalPages ? "disabled" : "") + '>Siguiente</button></div>';
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
      '</p></div><div class="providers-detail-section"><h3>Canal de ventas / oficinas (' +
      escapeHtml(provider.cantidadOficinas || 0) +
      ')</h3><div class="providers-chip-list">' +
      offices +
      '</div></div><div class="providers-detail-section"><h3>Grupos derivados (' +
      escapeHtml(provider.cantidadGrupos || 0) +
      ')</h3><div class="providers-chip-list">' +
      groups + '</div></div>';
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

    const cachedOptions = PROVIDERS_STATE.options;
    const assignments = cachedOptions ?
      renderProviderAssignmentSelectors(cachedOptions, selectedOffices, selectedGroups) :
      '<div class="providers-office-loading"><span class="spinner" aria-hidden="true"></span>' +
      '<div><strong>Cargando canal y grupos…</strong><small>El formulario ya está disponible mientras se prepara el catálogo.</small></div></div>';

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
      '<div id="providerAssignmentSelectors" class="providers-assignment-selectors">' + assignments + '</div>' +
      '<label class="field"><span>Estado</span><select name="estado"><option value="ACTIVO" ' +
        (data.estado === "ACTIVO" ? "selected" : "") +
        '>ACTIVO</option><option value="INACTIVO" ' +
        (data.estado === "INACTIVO" ? "selected" : "") +
        '>INACTIVO</option></select></label>' +
      metadata +
      '<p class="providers-import-note">Las asignaciones se guardan por código interno. Si no seleccionas grupos, el proveedor tendrá acceso a todos los grupos de las oficinas elegidas.</p>' +
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
        '<button id="providerModuleSaveButton" class="button button--primary" type="button" ' +
        (cachedOptions ? "" : "disabled") + '>Guardar</button>'
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
    return '<div class="providers-multi-field"><span class="field-label">Canal de venta <small>(oficinas)</small></span>' +
      renderProviderMultiChecklist("office", "Buscar oficina…", "idsOficina", offices.map(function(office) {
        return {
          value: office.idOficina,
          label: office.nombre || office.idOficina,
          detail: office.idOficina + (office.descripcion ? " · " + office.descripcion : ""),
          checked: selectedOffices && selectedOffices[office.idOficina]
        };
      }), "Sin canal asignado") +
      '<small class="providers-field-hint">Opcional. Si no seleccionas canal, el proveedor quedará solo como abastecedor.</small></div>' +
      '<div class="providers-multi-field"><span class="field-label">Grupo de vendedores <small>(opcional)</small></span>' +
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
        '<div class="providers-combo-actions"><button type="button" data-provider-select-all="' + escapeHtml(type) + '">Todos</button><button type="button" data-provider-clear="' + escapeHtml(type) + '">Limpiar</button></div>' +
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

    const ids = getProviderSelectedValues("idsOficina");
    const idsGrupo = getProviderSelectedValues("idsGrupo");


    const payload = {
      idProveedor: form.elements.idProveedor ?
        form.elements.idProveedor.value : "",
      razonSocial: form.elements.razonSocial.value,
      nombreComercial: form.elements.nombreComercial.value,
      codigoSap: codigoSap,
      ruc: ruc,
      descripcion: form.elements.descripcion.value,
      idsOficina: ids,
      idsGrupo: idsGrupo,
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
      showProviderSavedConfirmation(saved, ids.length, idsGrupo.length);
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

  function showProviderSavedConfirmation(saved, officesCount, groupsCount) {
    saved = saved || {};
    const id = saved.idProveedor || saved.ID_PROVEEDOR || "";
    const name = saved.nombreMostrar || saved.nombreComercial || saved.razonSocial || "Proveedor";
    const groupText = groupsCount ?
      groupsCount + " grupo(s) seleccionado(s)" :
      (officesCount ? "Todos los grupos de las oficinas seleccionadas" : "Sin canal de venta");
    openModal({
      eyebrow: "PROVEEDOR GUARDADO",
      title: "Registro confirmado",
      body: '<div class="providers-save-confirmation"><span class="material-symbols-rounded">check_circle</span>' +
        '<div><strong>' + escapeHtml(name) + '</strong>' +
        '<p>El proveedor fue cargado correctamente.</p>' +
        '<ul><li>Código interno: <code>' + escapeHtml(id || "Generado") + '</code></li>' +
        '<li>Canal de venta: ' + escapeHtml(officesCount ? officesCount + " oficina(s)" : "No asignado") + '</li>' +
        '<li>Grupos: ' + escapeHtml(groupText) + '</li></ul></div></div>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cerrar</button>' +
        (id ? '<button id="providerSavedViewButton" class="button button--primary" type="button">Ver detalle</button>' : '')
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
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button><button id="providerConfirmStatusButton" class="button button--primary" type="button">Confirmar</button>'
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
      .then(function(file) { downloadProviderTextFile(file.nombre, file.contenido, "text/csv;charset=utf-8"); toast("Plantilla lista", "No incluye ID_PROVEEDOR ni ESTADO. Usa | para separar varios canales o grupos."); })
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