const MP_STATE = {
    module: null,
    activeTab: "summary",
    options: null,
    page: 1,
    pageSize: 30,
    filters: { texto: "", estado: "ACTIVO", idNegocio: "" },
    priceFilters: { texto: "", estado: "ACTIVO", idNegocio: "" },
    currentDetail: null,
    optionsLoading: null,
    optionsLoadedAt: 0,
    summary: null,
    summaryLoadedAt: 0,
    tableCache: {},
    materialTemplateCache: null,
    materialTemplatePromise: null,
    materialTemplateDownload: null,
    materialTemplateRequestSeq: 0,
    priceTemplateCache: null,
    priceTemplatePromise: null,
    priceTemplateDownload: null,
    priceTemplateRequestSeq: 0,
    // AGENTE 2 (2026-09-19): pendientes de carga GSD validados en memoria.
    // Clave = token local ("GSDLOCAL-..."); nada se graba hasta confirmar.
    gsdPending: {},
    gsdPendingSeq: 0,
    renderToken: 0
  };

  const MP_OPTIONS_CACHE_TTL_MS = 30 * 60 * 1000;
  const MP_TABLE_CACHE_TTL_MS = 30 * 60 * 1000;
  const MP_SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;
  const MP_OFFICE_PICKER_VERSION = "27M";

  function openMaterialsPricesWorkspace(module) {
    MP_STATE.module = module;
    MP_STATE.activeTab = "summary";
    MP_STATE.page = 1;
    MP_STATE.currentDetail = null;
    MP_STATE.renderToken = 0;
    const view = document.getElementById("dynamicModuleView");
    const template = document.getElementById("materialsPricesWorkspaceTemplate");
    if (!view || !template) return;
    setActiveView("dynamicModuleView");
    setModuleHeading(module.grupoMenu || "COMERCIAL", module.nombre || "Materiales y Precios");
    view.innerHTML = "";
    view.appendChild(template.content.cloneNode(true));
    bindMaterialsPricesWorkspace();
    renderMaterialsPricesTab();
    // PASO 28O: no competir con la primera carga de la tabla.
    // Las opciones se precargan cuando la vista principal ya fue renderizada.
  }

  function bindMaterialsPricesWorkspace() {
    document.querySelectorAll("#mpTabs [data-mp-tab]").forEach(function(button) {
      button.hidden = !mpCanSeeTab(button.dataset.mpTab);
      button.addEventListener("click", function() {
        MP_STATE.activeTab = button.dataset.mpTab;
        MP_STATE.page = 1;
        MP_STATE.currentDetail = null;
        renderMaterialsPricesTab();
      });
    });
    on("mpRefreshButton", "click", function() { refreshMaterialsPricesWorkspace(false); });
  }

  function refreshMaterialsPricesWorkspace(silent) {
    clearMpOptionsCache();
    clearMpTableCache();
    if (typeof clearClientModuleCache === "function") clearClientModuleCache("MATERIALES_PRECIOS");
    clearMpSummaryCache();
    secureRpc("limpiarCacheMaterialesPreciosModulo", [], "MATERIALES_PRECIOS")
      .catch(function() {})
      .finally(function() {
        renderMaterialsPricesTab(!silent);
      });
  }

  function mpPermission(resource) {
    const permissions = APP_STATE.context && APP_STATE.context.seguridad &&
      APP_STATE.context.seguridad.permisos && APP_STATE.context.seguridad.permisos.MATERIALES_PRECIOS;
    return Boolean(permissions && permissions[resource] && permissions[resource].permitido);
  }

  function isMpProviderUser_() {
    var user = APP_STATE.context && APP_STATE.context.usuario ? APP_STATE.context.usuario : {};
    return Boolean(user.idProveedor) || String(user.rol || "").toUpperCase() === "PROVEEDOR";
  }

  /* Barra de estado para cargas masivas (global: también la usa Proveedores). */
  function mpBulkProgressHtml_(done, total, label) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return '<div class="mp-progress"><div class="mp-progress-top"><strong>' + escapeHtml(label || "Cargando...") +
      "</strong><span>" + done + " de " + total + " (" + pct + "%)</span></div>" +
      '<div class="mp-progress-track"><div class="mp-progress-fill" style="width:' + pct + '%"></div></div></div>';
  }
  function mpBulkProgressUpdate_(resultBox, done, total, label) {
    if (!resultBox) return;
    resultBox.innerHTML = mpBulkProgressHtml_(done, total, label);
  }

  /* Canal Lista (IA/ALO) para cargas masivas. Viaja como idCanal en el payload
     de confirm hacia guardarListaOficialPrecioModulo / confirm de precios. */
  function mpCanalOptionsHtml_(selected) {
    var sel = String(selected || "IA").toUpperCase();
    if (sel !== "IA" && sel !== "ALO") sel = "IA";
    return '<option value="IA"' + (sel === "IA" ? " selected" : "") + '>IA — Instaladores Aliados</option>' +
      '<option value="ALO"' + (sel === "ALO" ? " selected" : "") + '>ALO — Aló Cálidda</option>';
  }
  function mpBulkCanalFieldHtml_(selectId, selected) {
    return '<div class="mp-modal-section"><h4>Canal de la lista</h4>' +
      '<p>Define el canal (id_canal) que se enviará como idCanal al confirmar la carga.</p>' +
      '<div class="mp-form-grid"><label>Lista / Canal' +
      '<select id="' + escapeHtml(selectId) + '" name="idCanal" required>' +
      mpCanalOptionsHtml_(selected) +
      '</select></label></div></div>';
  }
  function mpBulkCanalValue_(selectId) {
    var el = document.getElementById(selectId || "");
    var v = el ? String(el.value || "").trim().toUpperCase() : "";
    if (v !== "IA" && v !== "ALO") {
      var f = el && el.form ? el.form.elements["idCanal"] : null;
      v = f ? String(f.value || "").trim().toUpperCase() : "";
    }
    if (v !== "IA" && v !== "ALO") v = "IA";
    return v;
  }
  var mpPendingBulkCanal_ = "";
  function mpChannelCardsHtml_(tipo, canUpload, canTemplate) {
    var esLista = String(tipo || "") === "listas";
    var baseCarga = esLista ? "mpListsBulkButton" : "mpBulkPriceButton";
    var basePlantilla = esLista ? "mpListsTemplateXlsxButton" : "mpPriceTemplateXlsxButton";
    var accCarga = esLista ? "Cargar lista" : "Cargar precios";
    var card = function(canal, titulo, descripcion) {
      var nombreCorto = canal === "IA" ? "IA" : "Aló";
      var botones = "";
      if (canUpload) botones += '<button id="' + baseCarga + canal + '" class="button button--primary" type="button"><span class="material-symbols-rounded">upload_file</span>' + accCarga + " " + nombreCorto + "</button>";
      if (canTemplate) botones += '<button id="' + basePlantilla + canal + '" class="button button--ghost" type="button"><span class="material-symbols-rounded">download</span>Plantilla ' + nombreCorto + "</button>";
      if (!botones) return "";
      return "<div><h4>" + titulo + "</h4><p>" + descripcion + '</p><div class="mp-actions">' + botones + "</div></div>";
    };
    var html = card("IA", "Lista IA — Instaladores Aliados", "Carga masiva y plantilla XLSX de la lista de precios IA.") +
      card("ALO", "Lista Aló Cálidda", "Carga masiva y plantilla XLSX de la lista de precios Aló Cálidda.");
    if (!html) return "";
    return '<div class="mp-upload-hero">' + html + "</div>";
  }
  function descargarPlantillaPreciosXlsx_(canal) {
    try {
      if (!window.XLSX) { toast("Plantilla no disponible", "La librería XLSX no está cargada. Revisa tu conexión e inténtalo de nuevo.", true); return; }
      var opts = MP_STATE.options || getMpEmptyOptions();
      if (!opts || !opts.proveedores) { toast("Plantilla no disponible", "Aún no cargan las opciones del módulo. Inténtalo de nuevo.", true); return; }
      var sufijo = String(canal || "").toUpperCase() === "ALO" ? "ALO" : "IA";
      var nombre = "Plantilla_Carga_Precios_" + sufijo + ".xlsx";
      var archivo = mpGsdWorkbookFile_(mpGsdBuildPricesWorkbook_(opts), nombre);
      var url = archivo.url;
      var link = document.createElement("a");
      link.href = url; link.download = nombre; link.target = "_blank"; link.rel = "noopener";
      document.body.appendChild(link); link.click();
      window.setTimeout(function() { try { link.remove(); } catch (ignoreRemove) {} try { URL.revokeObjectURL(url); } catch (ignoreRevoke) {} }, 30000);
      toast("Plantilla descargada", "Se inició la descarga de " + nombre + " (hojas CARGA_PRECIOS y DICCIONARIOS).");
    } catch (error) { toast("No se pudo generar la plantilla", errorMessage(error), true); }
  }

  function mpCanSeeTab(tab) {
    const rules = {
      summary: ["VER_RESUMEN", "VER_MATERIALES", "VER_PRECIOS", "VER_LISTAS_OFICIALES", "VER_MIS_LISTAS_PRECIO", "VER_SOLICITUDES_PRECIO"],
      materials: ["VER_MATERIALES"],
      prices: ["VER_PRECIOS", "VER_LISTAS_OFICIALES", "DESCARGAR_LISTA_OFICIAL"],
      lists: ["VER_MIS_LISTAS_PRECIO", "VER_OBSERVACIONES_LISTA", "VER_SOLICITUDES_PRECIO", "DESCARGAR_CONSOLIDADO_PENDIENTES", "CARGAR_LISTA_PRECIO", "CARGAR_LISTA_PRECIO_ADMIN"],
      fees: ["VER_PRECIOS", "VER_LISTAS_OFICIALES", "VER_MIS_LISTAS_PRECIO", "VER_SOLICITUDES_PRECIO", "EDITAR_LISTA_OFICIAL", "GESTIONAR_PRECIOS"]
    };
    return (rules[tab] || []).some(mpPermission);
  }

  function renderMaterialsPricesTab(showToast) {
    if (APP_STATE.module !== "MATERIALES_PRECIOS") return;
    if (!mpCanSeeTab(MP_STATE.activeTab)) {
      MP_STATE.activeTab = ["summary", "materials", "prices", "lists", "fees"].find(mpCanSeeTab) || "summary";
    }
    const renderToken = nextMpRenderToken(MP_STATE.activeTab);
    document.querySelectorAll("#mpTabs [data-mp-tab]").forEach(function(button) {
      button.classList.toggle("is-active", button.dataset.mpTab === MP_STATE.activeTab);
    });
    if (MP_STATE.activeTab === "summary") return renderMaterialsPricesSummary(showToast, renderToken);
    if (MP_STATE.activeTab === "materials") return renderMaterialsPricesMaterials(showToast, renderToken);
    if (MP_STATE.activeTab === "prices") return renderMaterialsPricesPrices(showToast, renderToken);
    if (MP_STATE.activeTab === "lists") return renderMaterialsPricesLists(showToast, renderToken);
    if (MP_STATE.activeTab === "fees") return renderMpFeesTab(showToast, renderToken);
  }

  function nextMpRenderToken(tab) {
    MP_STATE.renderToken = Number(MP_STATE.renderToken || 0) + 1;
    return { value: MP_STATE.renderToken, tab: tab || MP_STATE.activeTab || "summary" };
  }

  function isMpRenderCurrent(token, expectedTab) {
    if (!token) return APP_STATE.module === "MATERIALES_PRECIOS" && (!expectedTab || MP_STATE.activeTab === expectedTab);
    return APP_STATE.module === "MATERIALES_PRECIOS" &&
      Number(MP_STATE.renderToken || 0) === Number(token.value || 0) &&
      MP_STATE.activeTab === (expectedTab || token.tab);
  }

  function getMpRegionIfCurrent(token, expectedTab) {
    if (!isMpRenderCurrent(token, expectedTab)) return null;
    return document.getElementById("mpRegion");
  }

  function getMpEmptyOptions() {
    return { negocios: [], productos: [], tipos: [], subtipos: [], marcas: [], proveedores: [], oficinas: [], grupos: [], unidades: [], materiales: [] };
  }

  function getMpOptionsCacheKey() {
    const user = APP_STATE.context && APP_STATE.context.usuario ? APP_STATE.context.usuario : {};
    // Se cambia la versión al ajustar la carga de la clasificación para no
    // reutilizar catálogos vacíos almacenados por versiones anteriores.
    return "SGT360_MP_OPTIONS_V10_" + String(user.idUsuario || user.correo || "GENERAL");
  }

  function readMpOptionsCache() {
    try {
      const key = getMpOptionsCacheKey();
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.options) return null;
      if (Date.now() - parsed.timestamp > MP_OPTIONS_CACHE_TTL_MS) return null;
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, raw);
      return parsed.options;
    } catch (error) {
      return null;
    }
  }

  function writeMpOptionsCache(options) {
    try {
      const payload = JSON.stringify({ timestamp: Date.now(), options: options || {} });
      sessionStorage.setItem(getMpOptionsCacheKey(), payload);
      localStorage.setItem(getMpOptionsCacheKey(), payload);
    } catch (error) {}
  }

  function loadMaterialsPricesOptions(config) {
    config = config || {};
    const now = Date.now();
    if (!config.force && MP_STATE.options && now - MP_STATE.optionsLoadedAt < MP_OPTIONS_CACHE_TTL_MS) {
      return Promise.resolve(MP_STATE.options);
    }
    if (!config.force && config.useCache !== false) {
      const cached = readMpOptionsCache();
      if (cached) {
        MP_STATE.options = cached;
        MP_STATE.optionsLoadedAt = now;
        return Promise.resolve(cached);
      }
    }
    if (MP_STATE.optionsLoading && !config.force) return MP_STATE.optionsLoading;
    MP_STATE.optionsLoading = secureRpc("obtenerOpcionesMaterialesPreciosModulo", [Boolean(config.force)], "MATERIALES_PRECIOS")
      .then(function(result) {
        MP_STATE.options = result || getMpEmptyOptions();
        MP_STATE.optionsLoadedAt = Date.now();
        writeMpOptionsCache(MP_STATE.options);
        return MP_STATE.options;
      })
      .catch(function(error) {
        MP_STATE.options = MP_STATE.options || readMpOptionsCache() || getMpEmptyOptions();
        if (!config.silent) toast("No se pudieron cargar opciones", errorMessage(error), true);
        return MP_STATE.options;
      })
      .finally(function() { MP_STATE.optionsLoading = null; });
    return MP_STATE.optionsLoading;
  }

  function scheduleMpOptionsPrefetchPaso28O_() {
    if (
      MP_STATE.options &&
      Date.now() - MP_STATE.optionsLoadedAt < MP_OPTIONS_CACHE_TTL_MS
    ) {
      return;
    }

    const cached = readMpOptionsCache();

    if (cached) {
      MP_STATE.options = cached;
      MP_STATE.optionsLoadedAt = Date.now();
      return;
    }

    if (MP_STATE.optionsLoading) return;

    const ejecutar = function() {
      loadMaterialsPricesOptions({
        silent: true,
        force: false,
        useCache: true
      }).catch(function() {});
    };

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(ejecutar, { timeout: 1400 });
    } else {
      window.setTimeout(ejecutar, 700);
    }
  }

  function clearMpOptionsCache() {
    try { sessionStorage.removeItem(getMpOptionsCacheKey()); localStorage.removeItem(getMpOptionsCacheKey()); } catch (error) {}
    MP_STATE.options = null;
    MP_STATE.optionsLoadedAt = 0;
    liberarDescargaPlantillaMateriales_();
    MP_STATE.materialTemplateCache = null;
    MP_STATE.materialTemplatePromise = null;
    MP_STATE.materialTemplateRequestSeq += 1;
    liberarDescargaPlantillaPrecios_();
    MP_STATE.priceTemplateCache = null;
    MP_STATE.priceTemplatePromise = null;
    MP_STATE.priceTemplateRequestSeq += 1;
  }


  function getMpTableCacheKey(scope, params) {
    const user = APP_STATE.context && APP_STATE.context.usuario ? APP_STATE.context.usuario : {};
    const revision = APP_STATE.dataRevision || "0";
    return "SGT360_MP_TABLE_V3_" + String(user.idUsuario || user.correo || "GENERAL") + "_" + revision + "_" + scope + "_" + btoa(unescape(encodeURIComponent(JSON.stringify(params || {})))).slice(0, 100);
  }

  function readMpTableCache(scope, params, maxAgeMs) {
    try {
      const key = getMpTableCacheKey(scope, params);
      const local = MP_STATE.tableCache && MP_STATE.tableCache[key];
      if (local && Date.now() - local.timestamp <= maxAgeMs) return local.result;
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.result) return null;
      if (Date.now() - parsed.timestamp > maxAgeMs) return null;
      MP_STATE.tableCache[key] = parsed;
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, raw);
      return parsed.result;
    } catch (error) { return null; }
  }

  function writeMpTableCache(scope, params, result) {
    try {
      const key = getMpTableCacheKey(scope, params);
      const entry = { timestamp: Date.now(), result: result || {} };
      const payload = JSON.stringify(entry);
      MP_STATE.tableCache[key] = entry;
      sessionStorage.setItem(key, payload);
      localStorage.setItem(key, payload);
    } catch (error) {}
  }

  function clearMpTableCache(scope) {
    MP_STATE.tableCache = {};
    const target = String(scope || "").trim();
    try {
      [sessionStorage, localStorage].forEach(function(store) {
        Object.keys(store).forEach(function(key) {
          const text = String(key || "");
          if (text.indexOf("SGT360_MP_TABLE_V2_") === 0 || text.indexOf("SGT360_MP_TABLE_V3_") === 0) {
            if (!target || text.indexOf("_" + target + "_") !== -1) store.removeItem(key);
          }
        });
      });
    } catch (error) {}
  }



  function getMpSummaryCacheKey() {
    const user = APP_STATE.context && APP_STATE.context.usuario ? APP_STATE.context.usuario : {};
    const revision = APP_STATE.dataRevision || "0";
    return "SGT360_MP_SUMMARY_V3_" + String(user.idUsuario || user.correo || "GENERAL") + "_" + revision;
  }

  function readMpSummaryCache() {
    try {
      const key = getMpSummaryCacheKey();
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.result) return null;
      if (Date.now() - parsed.timestamp > MP_SUMMARY_CACHE_TTL_MS) return null;
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, raw);
      return parsed.result;
    } catch (error) { return null; }
  }

  function writeMpSummaryCache(result) {
    try {
      const payload = JSON.stringify({ timestamp: Date.now(), result: result || {} });
      sessionStorage.setItem(getMpSummaryCacheKey(), payload);
      localStorage.setItem(getMpSummaryCacheKey(), payload);
    } catch (error) {}
  }

  function clearMpSummaryCache() {
    MP_STATE.summary = null;
    MP_STATE.summaryLoadedAt = 0;
    try {
      [sessionStorage, localStorage].forEach(function(store) {
        Object.keys(store).forEach(function(key) {
          if (String(key || "").indexOf("SGT360_MP_SUMMARY_") === 0) store.removeItem(key);
        });
      });
    } catch (error) {}
  }

  function ensureMpOptionsForModal(bodyRenderer, config) {
    config = config || {};
    const body = document.getElementById("mpModalBody");
    const maxAge = config.maxAgeMs || MP_OPTIONS_CACHE_TTL_MS;

    if (!config.force && MP_STATE.options && Date.now() - MP_STATE.optionsLoadedAt < maxAge) {
      bodyRenderer(MP_STATE.options);
      return;
    }

    if (!config.force && config.useCache !== false) {
      const cached = readMpOptionsCache();
      if (cached) {
        MP_STATE.options = cached;
        MP_STATE.optionsLoadedAt = Date.now();
        bodyRenderer(cached);
        return;
      }
    }

    if (body) {
      body.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>';
    }

    loadMaterialsPricesOptions({ silent: false, force: Boolean(config.force), useCache: config.useCache })
      .then(bodyRenderer)
      .catch(function(error) {
        if (body) body.innerHTML = mpError(error);
      });
  }

  function renderMaterialsPricesSummary(showToast, renderToken) {
    const region = getMpRegionIfCurrent(renderToken, "summary");
    if (!region) return;
    const cached = (MP_STATE.summary && Date.now() - MP_STATE.summaryLoadedAt < MP_SUMMARY_CACHE_TTL_MS) ? MP_STATE.summary : readMpSummaryCache();
    region.innerHTML = mpSummaryHtml(cached, !cached);
    secureRpc("obtenerResumenMaterialesPreciosModulo", [], "MATERIALES_PRECIOS")
      .then(function(summary) {
        MP_STATE.summary = summary || {};
        MP_STATE.summaryLoadedAt = Date.now();
        writeMpSummaryCache(MP_STATE.summary);
        const currentRegion = getMpRegionIfCurrent(renderToken, "summary");
        if (!currentRegion) return;
        currentRegion.innerHTML = mpSummaryHtml(MP_STATE.summary, false);
        if (showToast) toast("Materiales y precios", "Resumen actualizado.");
      })
      .catch(function(error) {
        const currentRegion = getMpRegionIfCurrent(renderToken, "summary");
        if (!currentRegion || cached) return;
        currentRegion.innerHTML = mpError(error);
      });
  }

  function mpSummaryHtml(summary, loading) {
    summary = summary || {};
    const value = function(key) {
      return summary[key] === undefined || summary[key] === null ? "—" : summary[key];
    };
    return '<section class="mp-panel"><div class="mp-section-head"><div class="mp-section-title"><h3>Resumen</h3><p>Vista rápida del módulo de Materiales y Precios.' + (loading ? ' Actualizando datos...' : '') + '</p></div></div></section><div class="mp-grid">' +
      mpMetric("Materiales", value("materiales")) +
      mpMetric("Materiales activos", value("materialesActivos")) +
      mpMetric("Listas oficiales", value("listasOficiales")) +
      mpMetric("Solicitudes pendientes", value("solicitudesPendientes")) +
      '</div><section class="mp-panel"><h3>Modelo de trabajo</h3><p class="mp-note">El material es universal y se asocia al negocio. El proveedor se define al registrar el precio. Sin oficina ni grupo, el precio del proveedor es General; con oficina es por Oficina; con oficina y grupo es por Grupo.</p></section>';
  }

  function mpPaginationHtml(result, scope) {
    const p = result && result.paginacion ? result.paginacion : {};
    const page = Number(p.pagina || 1);
    const totalPages = Number(p.totalPaginas || 1);
    const total = Number(p.total || 0);
    if (!total || totalPages <= 1) return "";
    return '<div class="mp-pagination"><span>Página ' + escapeHtml(page) + ' de ' + escapeHtml(totalPages) + ' · ' + escapeHtml(total) + ' registros</span><div class="mp-actions">' +
      '<button class="button button--ghost button--compact has-tooltip" type="button" data-mp-page-scope="' + escapeHtml(scope) + '" data-mp-page-value="' + escapeHtml(page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' data-tooltip="Anterior" aria-label="Anterior" title="Anterior"><span class="material-symbols-rounded">chevron_left</span></button>' +
      '<button class="button button--ghost button--compact has-tooltip" type="button" data-mp-page-scope="' + escapeHtml(scope) + '" data-mp-page-value="' + escapeHtml(page + 1) + '" ' + (page >= totalPages ? 'disabled' : '') + ' data-tooltip="Siguiente" aria-label="Siguiente" title="Siguiente"><span class="material-symbols-rounded">chevron_right</span></button>' +
      '</div></div>';
  }

  function bindMpPagination(scope, loader) {
    document.querySelectorAll('[data-mp-page-scope="' + scope + '"]').forEach(function(button) {
      button.addEventListener("click", function() {
        const page = Number(button.dataset.mpPageValue || 1);
        if (!Number.isFinite(page) || page < 1) return;
        MP_STATE.page = page;
        loader(true);
      });
    });
  }

  function mpMetric(label, value) {
    return '<article class="mp-card"><small>' + escapeHtml(label) + '</small><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderMaterialsPricesMaterials(showToast, renderToken) {
    const region = getMpRegionIfCurrent(renderToken, "materials");
    if (!region) return;
    const canCreate = mpPermission("CREAR_MATERIAL");
    const canDownload = mpPermission("VER_MATERIALES");
    region.innerHTML = '<section class="mp-panel">' +
      '<div class="mp-section-head">' +
        '<div class="mp-section-title"><h3>Materiales</h3><p>Gestiona el maestro universal de materiales y registra nuevas referencias desde esta vista.</p>' +
          '<div class="mp-section-search mp-filter-row">' +
            '<label class="search-field"><span class="material-symbols-rounded">search</span><input id="mpMaterialSearch" type="search" placeholder="Buscar material, SAP, producto, tipo o marca"></label>' +
            '<label class="mp-filter-control"><span>Estado</span><select id="mpMaterialStatus"><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="TODOS">Todos</option></select></label>' +
          '</div>' +
        '</div>' +
        '<div class="mp-section-actions">' +
          (canDownload ? '<button id="mpDownloadMaterials" class="button button--secondary" type="button"><span class="material-symbols-rounded">download</span>Descargar materiales</button>' : '') +
          (canCreate ? '<button id="mpBulkMaterial" class="button button--secondary" type="button"><span class="material-symbols-rounded">upload_file</span>Carga masiva</button>' : '') +
          (canCreate ? '<button id="mpMaterialNew" class="button button--primary" type="button"><span class="material-symbols-rounded">add</span>Nuevo material</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="mp-observation"><strong>Información:</strong> El mantenimiento de negocios, productos principales, tipos, subtipos, marcas y unidades se realiza desde Configuración de la aplicación &gt; Catálogos. Los proveedores habilitados se toman del maestro de proveedores.</div>' +
    '</section><div id="mpMaterialContent">' + loadingHtml(4) + '</div>';
    on("mpMaterialNew", "click", openMaterialModal);
    on("mpBulkMaterial", "click", openBulkMaterialModal);
    on("mpDownloadMaterials", "click", exportMaterialsFiltered);
    const search = document.getElementById("mpMaterialSearch");
    const status = document.getElementById("mpMaterialStatus");
    if (search) {
      search.value = MP_STATE.filters.texto || "";
      search.addEventListener("input", debounce(function() {
        MP_STATE.filters.texto = search.value || "";
        MP_STATE.page = 1;
        loadMaterialsTable(true);
      }, 300));
    }
    if (status) {
      status.value = MP_STATE.filters.estado || "ACTIVO";
      status.addEventListener("change", function() {
        MP_STATE.filters.estado = status.value || "ACTIVO";
        MP_STATE.page = 1;
        loadMaterialsTable(false);
      });
    }
    loadMaterialsTable(false, showToast, renderToken);
  }

  function loadMaterialsTable(silent, showToast, renderToken) {
    renderToken = renderToken || { value: MP_STATE.renderToken, tab: "materials" };
    const content = isMpRenderCurrent(renderToken, "materials") ? document.getElementById("mpMaterialContent") : null;
    const params = { texto: MP_STATE.filters.texto || "", estado: MP_STATE.filters.estado || "ACTIVO", idNegocio: MP_STATE.filters.idNegocio || "", pagina: MP_STATE.page, tamano: MP_STATE.pageSize };
    const cached = readMpTableCache("materials", params, MP_TABLE_CACHE_TTL_MS);
    if (cached && content) {
      renderMaterialsTableResult(cached, showToast, true, renderToken);
      if (silent) return;
    }
    if (!silent && content && !cached) content.innerHTML = loadingHtml(6);
    secureRpc("listarMaterialesPrecioModulo", [params], "MATERIALES_PRECIOS")
      .then(function(result) {
        writeMpTableCache("materials", params, result || {});
        if (!isMpRenderCurrent(renderToken, "materials")) return;
        renderMaterialsTableResult(result || {}, showToast, false, renderToken);
        scheduleMpOptionsPrefetchPaso28O_();
      })
      .catch(function(error) { if (isMpRenderCurrent(renderToken, "materials") && content) content.innerHTML = mpError(error); });
  }

  function renderMaterialsTableResult(result, showToast, fromCache, renderToken) {
    if (renderToken && !isMpRenderCurrent(renderToken, "materials")) return;
    const content = document.getElementById("mpMaterialContent");
    const rows = result.registros || [];
    if (!content) return;
    if (!rows.length) { content.innerHTML = mpEmpty("No hay materiales para mostrar."); return; }
    const canEditMaterial = mpPermission("EDITAR_MATERIAL");
    content.innerHTML = '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Código</th><th>SAP</th><th>Producto</th><th>Tipo/Subtipo</th><th>Material</th><th>Marca</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
      rows.map(function(row) {
        const payload = escapeHtml(JSON.stringify(row || {}));
        const editButton = canEditMaterial ? '<button class="table-button has-tooltip" type="button" data-mp-material-edit="' + payload + '" data-tooltip="Modificar" aria-label="Modificar" title="Modificar"><span class="material-symbols-rounded">edit</span></button>' : '';
        const deleteButton = canEditMaterial ? '<button class="table-button has-tooltip" type="button" data-mp-material-delete="' + escapeHtml(row.idMaterial || "") + '" data-tooltip="Eliminar" aria-label="Eliminar" title="Eliminar"><span class="material-symbols-rounded">delete</span></button>' : '';
        return '<tr><td>' + escapeHtml(row.codigoMaterial) + '</td><td>' + escapeHtml(row.codigoSap || "—") + '</td><td>' + escapeHtml(row.producto || "—") + '</td><td>' + escapeHtml((row.tipo || "—") + " / " + (row.subtipo || "—")) + '</td><td><strong>' + escapeHtml(row.descripcionMaterial) + '</strong></td><td>' + escapeHtml(row.marca || "—") + '</td><td><span class="mp-status ' + escapeHtml(row.estado) + '">' + escapeHtml(row.estado) + '</span></td><td><div class="mp-actions mp-actions--inline">' + editButton + deleteButton + '</div></td></tr>';
      }).join("") + '</tbody></table></div>' + mpPaginationHtml(result, "materials");
    bindMpPagination("materials", function() { loadMaterialsTable(false); });
    document.querySelectorAll("[data-mp-material-edit]").forEach(function(button) {
      button.addEventListener("click", function() {
        try { openMaterialModal(JSON.parse(button.getAttribute("data-mp-material-edit") || "{}")); }
        catch (error) { toast("No se pudo abrir", "Los datos del material no están disponibles.", true); }
      });
    });
    /* AGENTE B: eliminar material con confirmacion; el RPC bloquea si el
       material esta en uso en precios o ventas. Invalida caches como el flujo
       de Modificar (clearMpTableCache/clearMpSummaryCache). */
    document.querySelectorAll("[data-mp-material-delete]").forEach(function(button) {
      button.addEventListener("click", function() {
        var idMaterial = String(button.getAttribute("data-mp-material-delete") || "");
        var found = (rows || []).filter(function(item) { return String(item.idMaterial || "") === idMaterial; })[0] || {};
        var label = found.descripcionMaterial || found.codigoSap || found.codigoMaterial || idMaterial;
        if (!window.confirm("¿Eliminar el material " + label + "? Si está en uso en precios o ventas, se bloqueará con un aviso.")) return;
        button.disabled = true;
        secureRpc("eliminarMaterialPrecioModulo", [idMaterial], "MATERIALES_PRECIOS")
          .then(function(result) {
            toast("Material eliminado", (result && result.mensaje) || "El material fue eliminado.");
            clearMpTableCache("materials");
            clearMpSummaryCache();
            loadMaterialsTable(true, false);
          })
          .catch(function(error) {
            toast("No se pudo eliminar", errorMessage(error), true);
            button.disabled = false;
          });
      });
    });
    if (showToast && !fromCache) toast("Materiales", "Listado actualizado.");
  }

  function openMaterialModal(materialData) {
    const isEdit = materialData && materialData.idMaterial;
    openMpModal(isEdit ? "Modificar material" : "Nuevo material", isEdit ? "Actualiza los datos del material universal sin alterar sus relaciones históricas." : "Registra un material universal. Las opciones desplegables se mantienen desde Configuración > Catálogos.", '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>');
    ensureMpOptionsForModal(function(opts) { renderMaterialModalBody(opts, materialData || null); }, { force: true, useCache: false, maxAgeMs: MP_OPTIONS_CACHE_TTL_MS });
  }


  function ordenarOpcionesMpArbol_(options) {
    return (Array.isArray(options) ? options : []).slice().sort(function(a, b) {
      return String(a && (a.nombre || a.codigo || a.id) || "").localeCompare(
        String(b && (b.nombre || b.codigo || b.id) || ""),
        "es",
        { sensitivity: "base" }
      );
    });
  }

  function normalizarCodigoMpArbol_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function opcionesHijasMpArbol_(options, clavePadre, valorPadre, productoPrincipal) {
    const clave = normalizarCodigoMpArbol_(clavePadre);
    const valor = normalizarCodigoMpArbol_(valorPadre);
    const producto = normalizarCodigoMpArbol_(productoPrincipal);

    return ordenarOpcionesMpArbol_((options || []).filter(function(item) {
      if (
        normalizarCodigoMpArbol_(item && item.clavePadre) !== clave ||
        normalizarCodigoMpArbol_(item && item.valorPadre) !== valor
      ) {
        return false;
      }

      if (clave !== "MP_TIPOS_MATERIAL" || !producto) return true;

      const productoMetadata = normalizarCodigoMpArbol_(
        item && item.metadata && (
          item.metadata.productoPrincipal ||
          item.metadata.producto ||
          item.metadata.PRODUCTO_PRINCIPAL
        )
      );

      return !productoMetadata || productoMetadata === producto;
    }));
  }

  function cargarOpcionesSelectMpArbol_(select, options, placeholder, selectedValue) {
    if (!select) return;

    const lista = ordenarOpcionesMpArbol_(options || []);
    const seleccionado = normalizarCodigoMpArbol_(selectedValue);
    const tieneOpciones = lista.length > 0;

    if (select.tagName === "INPUT") {
      const listId = select.getAttribute("list");
      const list = listId && document.getElementById(listId);
      if (list) list.innerHTML = lista.map(function(item) {
        const value = String(item.id || item.codigo || "").trim();
        return '<option value="' + escapeHtml(value + " — " + (item.nombre || value)) + '"></option>';
      }).join("");
      select.placeholder = tieneOpciones ? (placeholder || "Escribe para buscar") : "Sin opciones disponibles";
      select.disabled = !tieneOpciones;
      if (selectedValue) {
        const item = lista.find(function(row) { return String(row.id || row.codigo || "") === String(selectedValue); });
        select.value = item ? String(item.id || item.codigo) + " — " + (item.nombre || item.id || item.codigo) : "";
      }
      return;
    }
    select.innerHTML =
      '<option value="">' +
      escapeHtml(tieneOpciones ? (placeholder || "Seleccionar") : "Sin opciones disponibles") +
      '</option>' +
      lista.map(function(item) {
        const value = String(item.id || item.codigo || "").trim();
        const selected =
          seleccionado &&
          normalizarCodigoMpArbol_(value) === seleccionado ?
          ' selected' :
          '';
        return '<option value="' + escapeHtml(value) + '"' + selected + '>' +
          escapeHtml(item.nombre || item.codigo || item.id) +
          '</option>';
      }).join("");

    select.disabled = !tieneOpciones;
  }

  function inicializarArbolTipificacionMaterialForm_(form, opts, materialData) {
    if (!form) return;
    opts = opts || getMpEmptyOptions();
    materialData = materialData || {};

    const productoSelect = form.elements["idProducto"];
    const tipoSelect = form.elements["idTipoMaterial"];
    const subtipoSelect = form.elements["idSubtipoMaterial"];

    function cargarSubtipos(valorInicial) {
      const tipo = tipoSelect ? String(tipoSelect.value || "").split(" — ")[0].trim() : "";
      const subtipos = tipo ? (opts.subtipos || []).filter(function(item) {
        return String(item.idTipoMaterial || item.valorPadre || "") === String(tipo);
      }) : (opts.subtipos || []);

      cargarOpcionesSelectMpArbol_(
        subtipoSelect,
        subtipos,
        tipo ? "Seleccionar subtipo" : "Selecciona primero un tipo",
        valorInicial || ""
      );
    }

    function cargarTipos(valorTipoInicial, valorSubtipoInicial) {
      // MAE_TIPOS_MATERIAL no tiene una FK a producto. Los tipos se obtienen
      // directamente de la base y los subtipos sí se limitan por su tipo.
      const tipos = opts.tipos || [];

      cargarOpcionesSelectMpArbol_(
        tipoSelect,
        tipos,
        "Seleccionar tipo",
        valorTipoInicial || ""
      );

      cargarSubtipos(valorSubtipoInicial || "");
    }

    if (productoSelect) {
      productoSelect.addEventListener("change", function() {
        cargarTipos("", "");
      });
    }

    if (tipoSelect) {
      tipoSelect.addEventListener("change", function() {
        cargarSubtipos("");
      });
    }

    if (materialData.idProducto) {
      setFormValue_(form, "idProducto", materialData.idProducto);
    }

    cargarTipos(
      materialData.idTipoMaterial || "",
      materialData.idSubtipoMaterial || ""
    );

  }

  function mpSearchSelectInfo_(name, label, options, optional, tooltip, id) {
    const listId = "mpList_" + name;
    return '<label>' + mpFieldLabel(label, tooltip) + '<input ' + (id ? 'id="' + escapeHtml(id) + '" ' : '') + 'name="' + escapeHtml(name) + '" list="' + listId + '" autocomplete="off" placeholder="Escribe para buscar"' + (optional ? '' : ' required') + '><datalist id="' + listId + '">' + (options || []).map(function(item) { const value=String(item.id || item.codigo || ""); return '<option value="' + escapeHtml(value + " — " + (item.nombre || value)) + '"></option>'; }).join("") + '</datalist></label>';
  }

  function mpSearchSelectValue_(form, name) {
    const input = form && form.elements[name];
    const value = String(input && input.value || "").trim();
    return value.split(" — ")[0].trim();
  }

  function renderMaterialModalBody(opts, materialData) {
    opts = opts || getMpEmptyOptions();
    materialData = materialData || {};
    const body = document.getElementById("mpModalBody");
    if (!body) return;

    const productos = ordenarOpcionesMpArbol_(opts.productos || []);
    const marcas = ordenarOpcionesMpArbol_(opts.marcas || []);
    const unidades = ordenarOpcionesMpArbol_(
      opts.unidades && opts.unidades.length ?
        opts.unidades :
        [{ id: "UN", nombre: "Unidad" }]
    );

    body.innerHTML = '<form id="mpMaterialForm" class="mp-form-grid">' +
      '<input type="hidden" name="idMaterial" value="' + escapeHtml(materialData.idMaterial || "") + '">' +
      '<input type="hidden" name="codigoMaterial" value="' + escapeHtml(materialData.codigoMaterial || "") + '">' +
      mpSearchSelectInfo_("idNegocio", "Negocio", ordenarOpcionesMpArbol_(opts.negocios || []), false, "Asocia el material al negocio que lo venderá.") +
      mpSearchSelectInfo_("idProducto", "Producto principal", productos, false, "Escribe para buscar el producto.", "mpMaterialProducto") +
      mpSearchSelectInfo_("idTipoMaterial", "Tipo", [], false, "Escribe para buscar el tipo.", "mpMaterialTipo") +
      mpSearchSelectInfo_("idSubtipoMaterial", "Subtipo", [], true, "Opcional. Escribe para buscar cuando existan subtipos.", "mpMaterialSubtipo") +
      '<label>' + mpFieldLabel("Marca", "Escribe una nueva marca o selecciona una ya registrada.") +
        '<input name="idMarca" list="mpMaterialBrands" value="' + escapeHtml(materialData.marca || materialData.idMarca || "") + '" placeholder="Escribe o selecciona una marca">' +
        '<datalist id="mpMaterialBrands">' + marcas.map(function(item) {
          return '<option value="' + escapeHtml(item.nombre || item.codigo || item.id) + '"></option>';
        }).join("") + '</datalist></label>' +
      mpInputInfo("codigoSap", "Código SAP/HANA", "text", materialData.codigoSap || "", "Opcional. Puede actualizarse cuando SAP lo tenga creado.") +
      mpInputInfo("descripcionMaterial", "Descripción material", "text", materialData.descripcionMaterial || "", "Nombre descriptivo que aparecerá en búsquedas y listas.") +
      mpInputInfo("nombreMaterial", "Nombre corto", "text", materialData.nombreMaterial || materialData.descripcionMaterial || "", "Texto breve para mostrar en tablas o selectores.") +
      mpSelectInfo("unidadMedida", "Unidad", unidades, false, "Unidad de venta o control del material.") +
      '<label>Estado<select name="estado"><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>' +
      '<div class="mp-form-span-2 mp-note">La clasificación es relacional: Producto principal → Tipo → Subtipo. Si una opción no tiene hijos configurados, no podrá completarse el material hasta definirlos.</div>' +
      '<div id="mpMaterialSaveFeedback" class="mp-material-save-feedback" role="status" aria-live="polite" hidden></div>' +
      '<div class="mp-actions mp-form-span-2"><button id="mpMaterialSubmit" class="button button--primary has-tooltip" type="submit" data-tooltip="Guardar" aria-label="Guardar" title="Guardar">' +
        '<span class="material-symbols-rounded">save</span></button></div></form>';

    const form = document.getElementById("mpMaterialForm");
    if (!form) return;

    setFormValue_(form, "idNegocio", materialData.idNegocio || "");
    setFormValue_(form, "unidadMedida", materialData.unidadMedida || "UN");
    setFormValue_(form, "estado", materialData.estado || "ACTIVO");

    inicializarArbolTipificacionMaterialForm_(form, opts, materialData);

    form.addEventListener("submit", function(event) {
      event.preventDefault();

      if (form.dataset.saving === "1") return;

      if (
        !form.elements["idProducto"].value ||
        !form.elements["idTipoMaterial"].value
      ) {
        toast(
          "Clasificación incompleta",
          "Selecciona Producto principal y Tipo respetando el árbol.",
          true
        );
        return;
      }

      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      const data = formToObject(form);
      ["idNegocio", "idProducto", "idTipoMaterial", "idSubtipoMaterial"].forEach(function(name) { data[name] = mpSearchSelectValue_(form, name); });
      const esEdicion = Boolean(String(data.idMaterial || "").trim());
      form.dataset.saving = "1";
      setMaterialSaveState_(form, "loading", esEdicion ?
        "Guardando cambios del material…" :
        "Guardando material…");

      secureRpc(
        "guardarMaterialPrecioModulo",
        [data],
        "MATERIALES_PRECIOS"
      )
        .then(function(result) {
          result = result || {};
          if (result.revision && typeof APP_STATE !== "undefined") {
            APP_STATE.dataRevision = result.revision;
          }

          setMaterialSaveState_(
            form,
            "success",
            result.mensaje || "Material guardado correctamente."
          );

          clearMpTableCache("materials");
          clearMpSummaryCache();

          toast(
            esEdicion ? "Material actualizado" : "Material creado",
            result.mensaje || "La información quedó registrada correctamente."
          );

          closeMpModal();

          // La tabla que ya está visible no se reemplaza por un loader. Se consulta
          // la versión oficial en segundo plano y se actualiza cuando responde.
          window.setTimeout(function() {
            if (
              APP_STATE.module === "MATERIALES_PRECIOS" &&
              MP_STATE.activeTab === "materials"
            ) {
              loadMaterialsTable(true, false);
            }
          }, 50);
        })
        .catch(function(error) {
          const mensaje = errorMessage(error);
          form.dataset.saving = "0";
          setMaterialSaveState_(form, "error", mensaje);
          toast("No se pudo guardar", mensaje, true);
        });
    });
  }


  function setMaterialSaveState_(form, estado, mensaje) {
    if (!form) return;

    const feedback = document.getElementById("mpMaterialSaveFeedback");
    const submit = document.getElementById("mpMaterialSubmit");
    const label = submit ? submit.querySelector("[data-mp-material-submit-label]") : null;
    const icon = submit ? submit.querySelector(".material-symbols-rounded") : null;
    const state = String(estado || "").toLowerCase();

    if (feedback) {
      feedback.hidden = !mensaje;
      feedback.className = "mp-material-save-feedback" +
        (state ? " is-" + state : "");

      const icono = state === "loading" ? "progress_activity" :
        (state === "success" ? "check_circle" :
        (state === "error" ? "error" : "info"));

      feedback.innerHTML = mensaje ?
        '<span class="material-symbols-rounded">' + icono + '</span>' +
        '<span>' + escapeHtml(mensaje) + '</span>' : "";
    }

    if (submit) {
      const cargando = state === "loading";
      submit.disabled = cargando;
      submit.classList.toggle("is-loading", cargando);

      if (icon) icon.textContent = cargando ? "progress_activity" : "save";
      if (label) {
        label.textContent = cargando ?
          "Guardando…" :
          (String(form.elements["idMaterial"] && form.elements["idMaterial"].value || "").trim() ?
            "Guardar cambios" : "Guardar material");
      }
    }
  }


  function renderMaterialsPricesPrices(showToast, renderToken) {
    const region = getMpRegionIfCurrent(renderToken, "prices");
    if (!region) return;
    const canCreatePrice = mpPermission("CREAR_PRECIO_INDIVIDUAL") || mpPermission("CREAR_LISTA_OFICIAL") || mpPermission("EDITAR_LISTA_OFICIAL");
    region.innerHTML = '<section class="mp-panel"><div class="mp-section-head"><div class="mp-section-title"><h3>Precios</h3><p>Consulta precios vigentes por proveedor, negocio, alcance y material. La pestaña muestra precios por material, no cabeceras de lista.</p></div><div class="mp-section-actions">' +
      (canCreatePrice ? '<button id="mpBulkPriceButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">upload_file</span>Carga masiva</button>' : '') +
      (canCreatePrice ? '<button id="mpNewIndividualPrice" class="button button--primary" type="button"><span class="material-symbols-rounded">add</span>Cargar precio individual</button>' : '') +
      '</div></div>' + mpChannelCardsHtml_("precios", canCreatePrice, canCreatePrice) + '<div class="mp-price-filter-bar"><div class="mp-section-search mp-filter-row"><label class="search-field"><span class="material-symbols-rounded">search</span><input id="mpPriceSearch" type="search" placeholder="Buscar proveedor, negocio, material o alcance"></label><label class="mp-filter-control"><span>Estado</span><select id="mpPriceStatus"><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="TODOS">Todos</option></select></label></div><button id="mpDownloadPrices" class="button button--secondary" type="button"><span class="material-symbols-rounded">download</span>Descargar precios</button></div></section><div id="mpOfficialListsContent">' + loadingHtml(4) + '</div>';
    on("mpDownloadPrices", "click", exportOfficialPricesFiltered);
    on("mpBulkPriceButton", "click", openBulkPriceModal);     on("mpBulkPriceButtonIA", "click", function() { openBulkPriceModal("IA"); });     on("mpBulkPriceButtonALO", "click", function() { openBulkPriceModal("ALO"); });     on("mpPriceTemplateXlsxButtonIA", "click", function() { descargarPlantillaPreciosXlsx_("IA"); });     on("mpPriceTemplateXlsxButtonALO", "click", function() { descargarPlantillaPreciosXlsx_("ALO"); });
    on("mpNewIndividualPrice", "click", function() { openIndividualPriceModal(); });
    const search = document.getElementById("mpPriceSearch");
    const status = document.getElementById("mpPriceStatus");
    if (search) {
      search.value = MP_STATE.priceFilters.texto || "";
      search.addEventListener("input", debounce(function() {
        MP_STATE.priceFilters.texto = search.value || "";
        MP_STATE.page = 1;
        loadOfficialPricesTable(true);
      }, 300));
    }
    if (status) {
      status.value = MP_STATE.priceFilters.estado || "ACTIVO";
      status.addEventListener("change", function() {
        MP_STATE.priceFilters.estado = status.value || "ACTIVO";
        MP_STATE.page = 1;
        loadOfficialPricesTable(false);
      });
    }
    // PASO 28O: primero se muestra la tabla de precios.
    // Las opciones comerciales se precargan después, sin competir por el primer render.
    loadOfficialPricesTable(false, showToast, false, renderToken);
  }

  function loadOfficialPricesTable(silent, showToast, forceReload, renderToken) {
    renderToken = renderToken || { value: MP_STATE.renderToken, tab: "prices" };
    const content = isMpRenderCurrent(renderToken, "prices") ? document.getElementById("mpOfficialListsContent") : null;
    const params = { texto: MP_STATE.priceFilters.texto || "", estado: MP_STATE.priceFilters.estado || "TODOS", pagina: MP_STATE.page, tamano: MP_STATE.pageSize };
    const cached = forceReload ? null : readMpTableCache("prices", params, MP_TABLE_CACHE_TTL_MS);
    if (cached && content) {
      renderOfficialPricesTableResult(cached, showToast, true, renderToken);
      if (silent) return;
    }
    if (!silent && content && !cached) content.innerHTML = loadingHtml(6);
    secureRpc("listarListasOficialesPreciosModulo", [params], "MATERIALES_PRECIOS")
      .then(function(result) {
        writeMpTableCache("prices", params, result || {});
        if (!isMpRenderCurrent(renderToken, "prices")) return;
        renderOfficialPricesTableResult(result || {}, showToast, false, renderToken);
        scheduleMpOptionsPrefetchPaso28O_();
      })
      .catch(function(error) { if (isMpRenderCurrent(renderToken, "prices") && content) content.innerHTML = mpError(error); });
  }

  function renderOfficialPricesTableResult(result, showToast, fromCache, renderToken) {
    if (renderToken && !isMpRenderCurrent(renderToken, "prices")) return;
    const content = document.getElementById("mpOfficialListsContent");
    const rows = result.registros || [];
    MP_STATE.officialPriceRows = rows.slice();
    if (!content) return;
    if (!rows.length) { content.innerHTML = mpEmpty("No hay precios de materiales para mostrar."); return; }
    var hideFeeForProvider = isMpProviderUser_();
    /* AGENTE B: Modificar existe (openIndividualPriceModal); Eliminar usa el
       nuevo RPC eliminarDetalleListaPrecioModulo con confirmacion. */
    var canDeletePrice = mpPermission("EDITAR_LISTA_OFICIAL") || mpPermission("GESTIONAR_PRECIOS");
    content.innerHTML = '<div class="mp-table-wrap"><table class="mp-table mp-price-table"><thead><tr><th>Proveedor</th><th>Negocio</th><th>Alcance</th><th>Código SAP Material</th><th>Nombre corto del material</th><th>Combo</th><th>Precio</th>' + (hideFeeForProvider ? '' : '<th>Fee %</th>') + '<th>Fecha</th><th>Acciones</th></tr></thead><tbody>' + rows.map(function(row) {
      const combo = getMpComboDetail(row);
      const rawPrice = resolveMpPriceValue(row);
      const priceText = formatMpMoney(rawPrice, row.moneda || row.MONEDA);
      const feeText = (row.fee === null || row.fee === undefined || String(row.fee).trim() === "") ? "—" : String(row.fee) + " %";
      const dateStart = row.fechaInicio || row.FECHA_INICIO || "";
      const dateEnd = row.fechaFin || row.FECHA_FIN || "";
      const dateCell = '<div class="mp-vigencia-cell"><div><strong>I:</strong> ' + escapeHtml(dateStart || "—") + '</div><div><strong>F:</strong> ' + escapeHtml(dateEnd || "—") + '</div></div>';
      return '<tr><td>' + escapeHtml(row.proveedor || "Proveedor no definido") + '</td><td>' + escapeHtml(row.negocio || "—") + '</td><td>' + escapeHtml(mpScopeLabel(row)) + '</td><td><strong>' + escapeHtml(row.codigoSap || row.CODIGO_SAP || "—") + '</strong><br><small>' + escapeHtml(row.codigoMaterial || row.CODIGO_MATERIAL || "") + '</small></td><td class="mp-material-name">' + escapeHtml(row.nombreCortoMaterial || row.descripcionMaterial || row.NOMBRE_MATERIAL || "—") + '</td><td>' + (combo ? '<small>' + escapeHtml(combo) + '</small>' : '<span class="sales-muted">—</span>') + '</td><td class="mp-money-cell"><strong>' + escapeHtml(priceText) + '</strong></td>' + (hideFeeForProvider ? '' : '<td>' + escapeHtml(feeText) + '</td>') + '<td>' + dateCell + '</td><td><div class="mp-actions"><button class="table-button has-tooltip" type="button" data-mp-edit-price="' + escapeHtml(row.idDetallePrecio || row.idPrecio || row.ID_DETALLE_PRECIO || "") + '" data-tooltip="Modificar" aria-label="Modificar" title="Modificar"><span class="material-symbols-rounded">edit</span></button>' + (canDeletePrice ? '<button class="table-button has-tooltip" type="button" data-mp-delete-price="' + escapeHtml(row.idDetallePrecio || row.idPrecio || row.ID_DETALLE_PRECIO || "") + '" data-tooltip="Eliminar" aria-label="Eliminar" title="Eliminar"><span class="material-symbols-rounded">delete</span></button>' : '') + '</div></td></tr>';
    }).join("") + '</tbody></table></div>' + mpPaginationHtml(result, "prices");
    bindMpPagination("prices", function() { loadOfficialPricesTable(false); });
    document.querySelectorAll("[data-mp-edit-price]").forEach(function(button) {
      button.addEventListener("click", function() {
        const row = (MP_STATE.officialPriceRows || []).find(function(item) { return String(item.idDetallePrecio || item.idPrecio || "") === String(button.dataset.mpEditPrice || ""); });
        openIndividualPriceModal(row || null);
      });
    });
    document.querySelectorAll("[data-mp-delete-price]").forEach(function(button) {
      button.addEventListener("click", function() {
        var idDetalle = String(button.getAttribute("data-mp-delete-price") || "");
        var found = (MP_STATE.officialPriceRows || []).filter(function(item) { return String(item.idDetallePrecio || item.idPrecio || "") === idDetalle; })[0] || {};
        var label = [found.proveedor || "", found.nombreCortoMaterial || found.codigoMaterial || ""].filter(function(part) { return !!part; }).join(" · ") || idDetalle;
        if (!window.confirm("¿Eliminar el precio " + label + "? Esta acción no se puede deshacer.")) return;
        button.disabled = true;
        secureRpc("eliminarDetalleListaPrecioModulo", [idDetalle], "MATERIALES_PRECIOS")
          .then(function(result) {
            toast("Precio eliminado", (result && result.mensaje) || "El precio fue eliminado.");
            clearMpTableCache("prices");
            clearMpSummaryCache();
            loadOfficialPricesTable(true, false, true);
          })
          .catch(function(error) {
            toast("No se pudo eliminar", errorMessage(error), true);
            button.disabled = false;
          });
      });
    });
    if (showToast && !fromCache) toast("Precios", "Listado actualizado.");
  }

  function renderMaterialsPricesLists(showToast, renderToken) {
    const region = getMpRegionIfCurrent(renderToken, "lists");
    if (!region) return;
    const isProviderUser = Boolean(APP_STATE.context && APP_STATE.context.usuario && APP_STATE.context.usuario.idProveedor);
    const canUpload = isProviderUser && (mpPermission("CARGAR_LISTA_PRECIO") || mpPermission("CARGAR_LISTA_PRECIO_ADMIN"));
    const canReview = mpPermission("VER_SOLICITUDES_PRECIO");
    const canPending = mpPermission("DESCARGAR_CONSOLIDADO_PENDIENTES");
    const canTemplate = canUpload;
    region.innerHTML = '<section class="mp-panel"><div class="mp-section-head"><div class="mp-section-title"><h3>' + (canReview ? 'Listas cargadas por proveedor' : 'Mis listas') + '</h3><p>Carga listas desde este apartado. La lista queda pendiente de revisión y no afecta precios oficiales hasta ser aprobada/publicada. Alcance: sin oficina ni grupo = <strong>General</strong> (aplica a todos); con oficina = <strong>Oficina</strong>; con oficina y grupo = <strong>Grupo</strong>. La carga masiva XLSX crea listas oficiales directamente: cada fila es un material dentro de una lista y las filas con mismo proveedor, oficina, grupo, negocio, nombre, moneda y vigencia forman una lista.</p></div><div class="mp-section-actions">' +
      (canTemplate ? '<button id="mpTemplateButton" class="button button--ghost" type="button"><span class="material-symbols-rounded">download</span>Plantilla CSV (respaldo)</button>' : '') +
      (canUpload ? '<button id="mpUploadListButton" class="button button--primary" type="button"><span class="material-symbols-rounded">upload_file</span>Cargar lista</button>' : '') +
      (canUpload ? '<button id="mpListsBulkButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">upload_file</span>Carga masiva XLSX</button>' : '') +
      (canTemplate ? '<button id="mpListsTemplateXlsxButton" class="button button--ghost" type="button"><span class="material-symbols-rounded">download</span>Plantilla XLSX (Listas GSD)</button>' : '') +
      (canPending ? '<button id="mpDownloadPending" class="button button--secondary" type="button"><span class="material-symbols-rounded">download</span>Consolidado pendientes</button>' : '') +
      '</div></div></section>' + mpChannelCardsHtml_("listas", canUpload, canTemplate) + '<div id="mpRequestsContent">' + loadingHtml(6) + '</div>' +
      '<section class="mp-panel"><div class="mp-section-head"><div class="mp-section-title"><h3>Listas oficiales</h3><p>Cabeceras creadas por carga masiva o precio individual. Modificar un precio se hace por detalle desde la pestaña Precios; aquí puedes eliminar la lista completa (cabecera + detalles en cascada) con confirmación.</p></div></div><div id="mpOfficialListsSection">' + loadingHtml(3) + '</div></section>';
    on("mpTemplateButton", "click", downloadMaterialsPricesTemplate);
    on("mpUploadListButton", "click", openUploadListModal);
    on("mpListsBulkButton", "click", openMpListsBulkModal);     on("mpListsBulkButtonIA", "click", function() { openMpListsBulkModal("IA"); });     on("mpListsBulkButtonALO", "click", function() { openMpListsBulkModal("ALO"); });     on("mpListsTemplateXlsxButtonIA", "click", function() { descargarPlantillaListasBulkXlsx_("IA"); });     on("mpListsTemplateXlsxButtonALO", "click", function() { descargarPlantillaListasBulkXlsx_("ALO"); });
    on("mpListsTemplateXlsxButton", "click", function() { descargarPlantillaListasBulkXlsx_(); });
    on("mpDownloadPending", "click", function() {
      secureRpc("exportarConsolidadoPendientesPreciosModulo", [{ incluirRechazadas: true }], "MATERIALES_PRECIOS")
        .then(downloadCsvResult)
        .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
    });
    loadRequestsTable(showToast, renderToken);
    loadMpOfficialListsSection_();
  }

  /* AGENTE B: listas oficiales agrupadas por cabecera con Eliminar en cascada
     (nuevo RPC eliminarListaOficialPrecioModulo). El Modificar de una lista se
     hace por detalle desde la pestaña Precios (openIndividualPriceModal). */
  function loadMpOfficialListsSection_() {
    var box = document.getElementById("mpOfficialListsSection");
    if (!box) return;
    box.innerHTML = loadingHtml(3);
    secureRpc("listarListasOficialesPreciosModulo", [{}], "MATERIALES_PRECIOS")
      .then(function(result) { renderMpOfficialListsSection_(box, (result && result.registros) || []); })
      .catch(function(error) {
        var target = document.getElementById("mpOfficialListsSection");
        if (target) target.innerHTML = mpError(error);
      });
  }

  function renderMpOfficialListsSection_(box, rows) {
    if (!box) return;
    var canDelete = mpPermission("EDITAR_LISTA_OFICIAL") || mpPermission("GESTIONAR_PRECIOS");
    var groups = {};
    var order = [];
    (rows || []).forEach(function(item) {
      var key = String(item.idListaPrecio || "SIN_LISTA");
      if (!groups[key]) {
        groups[key] = { idListaPrecio: key, proveedor: item.proveedor || "—", negocio: item.negocio || "—", vigencia: String(item.fechaInicio || "") + " / " + String(item.fechaFin || ""), items: [] };
        order.push(key);
      }
      groups[key].items.push(item);
    });
    if (!order.length) { box.innerHTML = mpEmpty("No hay listas oficiales para mostrar."); return; }
    box.innerHTML = '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Lista</th><th>Proveedor</th><th>Negocio</th><th>Vigencia</th><th>Detalles</th>' + (canDelete ? '<th>Acciones</th>' : '') + '</tr></thead><tbody>' +
      order.map(function(key) {
        var group = groups[key];
        return '<tr><td><strong>' + escapeHtml(key) + '</strong></td><td>' + escapeHtml(group.proveedor) + '</td><td>' + escapeHtml(group.negocio) + '</td><td>' + escapeHtml(group.vigencia) + '</td><td>' + group.items.length + '</td>' +
          (canDelete ? '<td><div class="mp-actions"><button class="table-button has-tooltip" type="button" data-mp-delete-list="' + escapeHtml(key) + '" data-tooltip="Eliminar" aria-label="Eliminar" title="Eliminar"><span class="material-symbols-rounded">delete</span></button></div></td>' : '') + '</tr>';
      }).join("") + '</tbody></table></div>';
    box.querySelectorAll("[data-mp-delete-list]").forEach(function(button) {
      button.addEventListener("click", function() {
        var idLista = String(button.getAttribute("data-mp-delete-list") || "");
        var group = groups[idLista] || { items: [] };
        if (!window.confirm("¿Eliminar la lista " + idLista + " con sus " + group.items.length + " detalle(s)? Se borran cabecera y detalles y no se puede deshacer.")) return;
        button.disabled = true;
        secureRpc("eliminarListaOficialPrecioModulo", [idLista], "MATERIALES_PRECIOS")
          .then(function(result) {
            toast("Lista eliminada", (result && result.mensaje) || "La lista oficial fue eliminada.");
            clearMpTableCache("prices");
            clearMpSummaryCache();
            loadMpOfficialListsSection_();
            loadOfficialPricesTable(true, false, true);
          })
          .catch(function(error) {
            toast("No se pudo eliminar", errorMessage(error), true);
            button.disabled = false;
          });
      });
    });
  }

  /* PESTAÑA FEES: flujo en 3 pasos en la misma vista.
     (a) Lista agrupada por canal IA/ALO (ops existentes de listas),
     (b) Proveedor con materiales en la lista elegida,
     (c) Grilla con buscador cliente + fee editable + guardar por fila
         vía actualizarFeeMaterialPrecioModulo({idDetallePrecio, fee}). */
  /* PESTAÑA FEES con canales dinámicos (2026-09-22): los canales se cargan con
     listarCanalesAdminMotor (defensivo con fallback IA/ALO si falla) y las
     listas se agrupan por lista.id_canal → canal. Sin literales IA/ALO. */
  function mpFeesCanalesFallback_() {
    return [
      { idCanal: "CANAL-IA", codigo: "IA", nombre: "Instaladores Aliados" },
      { idCanal: "CANAL-ALO", codigo: "ALO", nombre: "Aló Cálidda" }
    ];
  }
  function mpFeesNormCanalId_(v) {
    var t = String(v || "").trim().toUpperCase();
    if (t === "IA") return "CANAL-IA";
    if (t === "ALO") return "CANAL-ALO";
    return t;
  }
  function mpFeesCargarCanales_() {
    if (MP_STATE.feesCanales) return Promise.resolve(MP_STATE.feesCanales);
    if (MP_STATE.feesCanalesPromise) return MP_STATE.feesCanalesPromise;
    MP_STATE.feesCanalesPromise = secureRpc("listarCanalesAdminMotor", [], "MATERIALES_PRECIOS")
      .then(function(res) {
        var filas = Array.isArray(res) ? res : ((res && (res.registros || res.canales)) || []);
        var lista = (filas || []).map(function(c) {
          c = c || {};
          var id = String(c.idCanal || c.id_canal || c.codigo || "").trim();
          return { idCanal: id, codigo: String(c.codigo || c.idCanal || c.id_canal || "").trim(), nombre: String(c.nombre || c.codigo || id || "") };
        }).filter(function(c) { return !!c.idCanal; });
        if (!lista.length) lista = mpFeesCanalesFallback_();
        MP_STATE.feesCanales = lista;
        return lista;
      })
      .catch(function() {
        MP_STATE.feesCanales = mpFeesCanalesFallback_();
        return MP_STATE.feesCanales;
      })
      .finally(function() { MP_STATE.feesCanalesPromise = null; });
    return MP_STATE.feesCanalesPromise;
  }
  function mpFeesCanalEtiqueta_(idCanalNorm) {
    var norm = mpFeesNormCanalId_(idCanalNorm);
    var lista = MP_STATE.feesCanales || mpFeesCanalesFallback_();
    for (var i = 0; i < lista.length; i++) {
      if (mpFeesNormCanalId_(lista[i].idCanal) === norm) {
        var nombre = String(lista[i].nombre || "");
        var codigo = String(lista[i].codigo || "");
        return nombre + (codigo ? " — " + codigo : "");
      }
    }
    return norm || "Sin canal";
  }
  function mpFeesCanalOf_(row) {
    row = row || {};
    var raw = row.idCanal || row.id_canal || row.canal || row.CANAL || row.ID_CANAL || "";
    var norm = mpFeesNormCanalId_(raw);
    if (norm) return norm;
    // Sin id_canal (legacy): inferir por nombre contra los canales cargados.
    var nombre = String(row.nombre || row.nombreLista || row.codigoLista || row.lista || "");
    if (!nombre) return "";
    var lista = MP_STATE.feesCanales || mpFeesCanalesFallback_();
    for (var j = 0; j < lista.length; j++) {
      var codigo = String(lista[j].codigo || "").trim();
      var canalNombre = String(lista[j].nombre || "").trim();
      if (codigo) {
        var rx = null;
        try { rx = new RegExp("\\b" + codigo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"); } catch (ignoreRx) { rx = null; }
        if (rx && rx.test(nombre)) return mpFeesNormCanalId_(lista[j].idCanal);
      }
      if (canalNombre && nombre.toLowerCase().indexOf(canalNombre.toLowerCase()) !== -1) return mpFeesNormCanalId_(lista[j].idCanal);
    }
    return "";
  }
  function mpFeesListaEtiqueta_(grupo) {
    var nombre = grupo.nombre || grupo.idListaPrecio;
    var extra = [grupo.proveedor, grupo.negocio, grupo.vigencia].filter(function(p) { return p && p !== "—"; }).join(" · ");
    return nombre + (extra ? " · " + extra : "") + " (" + grupo.items.length + " ítems)";
  }
  function renderMpFeesTab(showToast, renderToken) {
    var region = getMpRegionIfCurrent(renderToken, "fees");
    if (!region) return;
    MP_STATE.fees = MP_STATE.fees || { raw: [], grupos: [], order: [], idCanal: "", idLista: "", idProveedor: "", filtro: "" };
    MP_STATE.fees.filtro = "";
    MP_STATE.fees.idCanal = "";
    region.innerHTML = '<section class="mp-panel"><div class="mp-section-head"><div class="mp-section-title"><h3>Fees</h3>' +
      '<p>Selecciona el canal, luego la lista y el proveedor, y actualiza el fee por material. El fee es el % que se lleva Cálidda.</p></div></div>' +
      '<div class="mp-form-grid">' +
      '<label>1. Canal<select id="mpFeesCanal"><option value="">Cargando canales...</option></select></label>' +
      '<label>2. Lista<select id="mpFeesLista"><option value="">Cargando listas...</option></select></label>' +
      '<label>3. Proveedor<select id="mpFeesProveedor" disabled><option value="">Selecciona primero una lista</option></select></label>' +
      '<label class="search-field" style="align-self:end"><span class="material-symbols-rounded">search</span><input id="mpFeesSearch" type="search" placeholder="4. Buscar material en la grilla"></label>' +
      '</div></section>' +
      '<div id="mpFeesGrid">' + loadingHtml(4) + '</div>';
    var search = document.getElementById("mpFeesSearch");
    if (search) {
      search.addEventListener("input", debounce(function() {
        MP_STATE.fees.filtro = String(search.value || "");
        mpFeesRenderGrid_();
      }, 250));
    }
    Promise.all([mpFeesCargarCanales_(), secureRpc("listarListasOficialesPreciosModulo", [{}], "MATERIALES_PRECIOS")])
      .then(function(respuestas) {
        if (!isMpRenderCurrent(renderToken, "fees")) return;
        var result = respuestas[1] || {};
        mpFeesCargarListas_((result && result.registros) || []);
        if (showToast) toast("Fees", "Listas cargadas.");
      })
      .catch(function(error) {
        var current = getMpRegionIfCurrent(renderToken, "fees");
        if (!current) return;
        var box = document.getElementById("mpFeesGrid");
        if (box) box.innerHTML = mpError(error);
        var sel = document.getElementById("mpFeesLista");
        if (sel) sel.innerHTML = '<option value="">No se pudieron cargar las listas</option>';
      });
  }
  function mpFeesCargarListas_(rows) {
    var fees = MP_STATE.fees || (MP_STATE.fees = { raw: [], grupos: [], order: [], idCanal: "", idLista: "", idProveedor: "", filtro: "" });
    fees.raw = (rows || []).slice();
    var groups = {};
    var order = [];
    fees.raw.forEach(function(item) {
      var key = String(item.idListaPrecio || item.idLista || "SIN_LISTA");
      if (!groups[key]) {
        groups[key] = {
          idListaPrecio: key,
          nombre: item.nombre || item.nombreLista || item.codigoLista || key,
          proveedor: item.proveedor || "—",
          negocio: item.negocio || "—",
          vigencia: String(item.fechaInicio || "") + " / " + String(item.fechaFin || ""),
          canal: mpFeesCanalOf_(item),
          items: []
        };
        order.push(key);
      }
      groups[key].items.push(item);
      if (!groups[key].canal) {
        var c = mpFeesCanalOf_(item);
        if (c) groups[key].canal = c;
      }
    });
    fees.grupos = groups;
    fees.order = order;
    mpFeesPintarCanales_();
    mpFeesPintarListas_();
    mpFeesRenderProveedores_();
    mpFeesRenderGrid_();
  }
  function mpFeesPintarCanales_() {
    var sel = document.getElementById("mpFeesCanal");
    if (!sel) return;
    var fees = MP_STATE.fees || {};
    var lista = MP_STATE.feesCanales || mpFeesCanalesFallback_();
    sel.innerHTML = '<option value="">Todos los canales</option>' + lista.map(function(c) {
      var id = mpFeesNormCanalId_(c.idCanal);
      return '<option value="' + escapeHtml(id) + '"' + (String(fees.idCanal || "") === id ? " selected" : "") + '>' + escapeHtml(mpFeesCanalEtiqueta_(id)) + '</option>';
    }).join("");
    sel.onchange = function() {
      MP_STATE.fees.idCanal = String(sel.value || "");
      MP_STATE.fees.idLista = "";
      MP_STATE.fees.idProveedor = "";
      MP_STATE.fees.filtro = "";
      var s = document.getElementById("mpFeesSearch");
      if (s) s.value = "";
      mpFeesPintarListas_();
      mpFeesRenderProveedores_();
      mpFeesRenderGrid_();
    };
  }
  function mpFeesPintarListas_() {
    var sel = document.getElementById("mpFeesLista");
    if (!sel) return;
    var fees = MP_STATE.fees || {};
    var groups = fees.grupos || {};
    var filtro = String(fees.idCanal || "");
    if (!Object.keys(groups).length) {
      sel.innerHTML = '<option value="">Sin listas oficiales</option>';
      var box = document.getElementById("mpFeesGrid");
      if (box) box.innerHTML = mpEmpty("No hay listas oficiales para gestionar fees.");
      return;
    }
    var porCanal = {};
    var ordenCanales = [];
    (fees.order || []).forEach(function(key) {
      var g = groups[key];
      if (!g) return;
      var canal = String(g.canal || "");
      if (filtro && canal !== filtro) return;
      if (!porCanal[canal]) { porCanal[canal] = []; ordenCanales.push(canal); }
      porCanal[canal].push(g);
    });
    var opt = function(g) {
      return '<option value="' + escapeHtml(g.idListaPrecio) + '">' + escapeHtml(mpFeesListaEtiqueta_(g)) + '</option>';
    };
    if (!ordenCanales.length) {
      sel.innerHTML = '<option value="">Sin listas para el canal seleccionado</option>';
    } else {
      var html = '<option value="">Seleccionar lista</option>';
      ordenCanales.forEach(function(canal) {
        var etiqueta = canal ? ("Canal " + mpFeesCanalEtiqueta_(canal)) : "Sin canal";
        html += '<optgroup label="' + escapeHtml(etiqueta) + '">' + porCanal[canal].map(opt).join("") + '</optgroup>';
      });
      sel.innerHTML = html;
    }
    sel.onchange = function() {
      MP_STATE.fees.idLista = String(sel.value || "");
      MP_STATE.fees.idProveedor = "";
      MP_STATE.fees.filtro = "";
      var s = document.getElementById("mpFeesSearch");
      if (s) s.value = "";
      mpFeesRenderProveedores_();
      mpFeesRenderGrid_();
    };
  }
  function mpFeesProveedoresDeLista_(idLista) {
    var fees = MP_STATE.fees || {};
    var grupo = (fees.grupos || {})[String(idLista || "")];
    if (!grupo) return [];
    var vistos = {};
    var lista = [];
    (grupo.items || []).forEach(function(item) {
      var id = String(item.idProveedor || item.proveedorId || item.proveedor || "");
      var nombre = String(item.proveedor || id || "Proveedor no definido");
      var key = String(item.idProveedor || "") || ("NOMBRE:" + nombre);
      if (!key || vistos[key]) return;
      vistos[key] = true;
      lista.push({ id: String(item.idProveedor || ""), nombre: nombre, clave: key });
    });
    return lista;
  }
  function mpFeesRenderProveedores_() {
    var sel = document.getElementById("mpFeesProveedor");
    if (!sel) return;
    var fees = MP_STATE.fees || {};
    var idLista = String(fees.idLista || "");
    if (!idLista) {
      sel.innerHTML = '<option value="">Selecciona primero una lista</option>';
      sel.disabled = true;
      return;
    }
    var provs = mpFeesProveedoresDeLista_(idLista);
    if (!provs.length) {
      sel.innerHTML = '<option value="">Sin proveedores en esta lista</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    sel.innerHTML = '<option value="">Seleccionar proveedor</option>' + provs.map(function(p) {
      var value = p.id || p.clave;
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(p.nombre) + '</option>';
    }).join("");
    if (provs.length === 1) {
      sel.value = provs[0].id || provs[0].clave;
      MP_STATE.fees.idProveedor = String(sel.value || "");
    }
    sel.onchange = function() {
      MP_STATE.fees.idProveedor = String(sel.value || "");
      mpFeesRenderGrid_();
    };
  }
  function mpFeesDetallesFiltrados_() {
    var fees = MP_STATE.fees || {};
    var idLista = String(fees.idLista || "");
    var idProv = String(fees.idProveedor || "");
    if (!idLista || !idProv) return [];
    var grupo = (fees.grupos || {})[idLista];
    if (!grupo) return [];
    var items = (grupo.items || []).filter(function(item) {
      var key = String(item.idProveedor || "") || ("NOMBRE:" + String(item.proveedor || ""));
      var nombreKey = "NOMBRE:" + String(item.proveedor || "");
      return key === idProv || nombreKey === idProv;
    });
    var q = String(fees.filtro || "").trim().toLowerCase();
    if (q) {
      items = items.filter(function(item) {
        var texto = [item.nombreCortoMaterial, item.descripcionMaterial, item.NOMBRE_MATERIAL, item.codigoSap, item.CODIGO_SAP, item.codigoMaterial, item.CODIGO_MATERIAL].map(function(v) { return String(v || ""); }).join(" ").toLowerCase();
        return texto.indexOf(q) !== -1;
      });
    }
    return items;
  }
  function mpFeesRenderGrid_() {
    var box = document.getElementById("mpFeesGrid");
    if (!box) return;
    var fees = MP_STATE.fees || {};
    if (!String(fees.idLista || "")) { box.innerHTML = mpEmpty("Selecciona una lista para ver sus materiales."); return; }
    if (!String(fees.idProveedor || "")) { box.innerHTML = mpEmpty("Selecciona un proveedor para ver sus materiales en la lista."); return; }
    var items = mpFeesDetallesFiltrados_();
    if (!items.length) { box.innerHTML = mpEmpty("No hay materiales del proveedor en esta lista para el filtro actual."); return; }
    box.innerHTML = '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Material</th><th>Código SAP</th><th>Precio</th><th>Fee %</th><th>Acciones</th></tr></thead><tbody>' +
      items.map(function(row) {
        var idDet = String(row.idDetallePrecio || row.idPrecio || row.ID_DETALLE_PRECIO || "");
        var mat = String(row.nombreCortoMaterial || row.descripcionMaterial || row.NOMBRE_MATERIAL || "—");
        var sap = String(row.codigoSap || row.CODIGO_SAP || row.codigoMaterial || row.CODIGO_MATERIAL || "—");
        var precio = formatMpMoney(resolveMpPriceValue(row), row.moneda || row.MONEDA);
        var feeVal = (row.fee === null || row.fee === undefined) ? "" : String(row.fee);
        return '<tr><td><strong>' + escapeHtml(mat) + '</strong></td><td>' + escapeHtml(sap) + '</td><td>' + escapeHtml(precio) + '</td>' +
          '<td><input type="number" min="0" max="100" step="0.01" value="' + escapeHtml(feeVal) + '" data-mp-fee-input="' + escapeHtml(idDet) + '" aria-label="Fee %" style="max-width:110px"></td>' +
          '<td><div class="mp-actions mp-actions--inline" style="flex-wrap:nowrap;white-space:nowrap"><button class="table-button has-tooltip" type="button" data-mp-fee-save="' + escapeHtml(idDet) + '" data-tooltip="Guardar fee" aria-label="Guardar fee" title="Guardar fee"><span class="material-symbols-rounded">save</span></button></div></td></tr>';
      }).join("") + '</tbody></table></div>';
    box.querySelectorAll("[data-mp-fee-save]").forEach(function(button) {
      button.addEventListener("click", function() {
        var idDet = String(button.getAttribute("data-mp-fee-save") || "");
        var input = box.querySelector('[data-mp-fee-input="' + idDet.replace(/"/g, "") + '"]');
        var raw = input ? String(input.value || "").trim() : "";
        if (raw === "") { toast("Fee requerido", "Ingresa el fee (%) entre 0 y 100.", true); return; }
        var fee = Number(raw);
        if (!Number.isFinite(fee) || fee < 0 || fee > 100) { toast("Fee inválido", "El fee debe ser un porcentaje entre 0 y 100.", true); return; }
        button.disabled = true;
        secureRpc("actualizarFeeMaterialPrecioModulo", [{ idDetallePrecio: idDet, fee: fee }], "MATERIALES_PRECIOS")
          .then(function(result) {
            toast("Fee actualizado", (result && result.mensaje) || "El fee fue guardado.");
            var feesState = MP_STATE.fees || {};
            ((feesState.raw || [])).forEach(function(r) {
              if (String(r.idDetallePrecio || r.idPrecio || "") === idDet) r.fee = fee;
            });
            Object.keys(feesState.grupos || {}).forEach(function(k) {
              ((feesState.grupos[k] || {}).items || []).forEach(function(r) {
                if (String(r.idDetallePrecio || r.idPrecio || "") === idDet) r.fee = fee;
              });
            });
            button.disabled = false;
          })
          .catch(function(error) {
            toast("No se pudo guardar el fee", errorMessage(error), true);
            button.disabled = false;
          });
      });
    });
  }

  function loadRequestsTable(showToast, renderToken) {
    renderToken = renderToken || { value: MP_STATE.renderToken, tab: "lists" };
    secureRpc("listarSolicitudesListaPrecioModulo", [{ texto: "", estado: "TODOS", pagina: MP_STATE.page, tamano: MP_STATE.pageSize }], "MATERIALES_PRECIOS")
      .then(function(result) {
        if (!isMpRenderCurrent(renderToken, "lists")) return;
        const rows = result.registros || [];
        const content = document.getElementById("mpRequestsContent");
        if (!content) return;
        if (!rows.length) { content.innerHTML = mpEmpty("No hay listas para mostrar."); return; }
        content.innerHTML = '<div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Solicitud</th><th>Proveedor</th><th>Negocio</th><th>Alcance</th><th>Origen</th><th>Vigencia</th><th>Errores</th><th>Advertencias</th><th>Estado</th><th></th></tr></thead><tbody>' + rows.map(function(row) {
          return '<tr><td><strong>' + escapeHtml(row.codigoSolicitud) + '</strong><br><small>' + escapeHtml(row.fechaCarga || "") + '</small></td><td>' + escapeHtml(row.proveedor || "Proveedor no definido") + '</td><td>' + escapeHtml(row.negocio || "—") + '</td><td>' + escapeHtml(mpScopeLabel(row)) + '</td><td>' + escapeHtml(row.origenCarga || "—") + '</td><td>' + escapeHtml(row.fechaInicio + " / " + row.fechaFin) + '</td><td>' + escapeHtml(row.totalErrores) + '</td><td>' + escapeHtml(row.totalAdvertencias) + '</td><td><span class="mp-status ' + escapeHtml(row.estado) + '">' + escapeHtml(row.estado) + '</span></td><td><button class="table-button has-tooltip" type="button" data-mp-request="' + escapeHtml(row.idSolicitud) + '" data-tooltip="Abrir solicitud" aria-label="Abrir solicitud" title="Abrir solicitud"><span class="material-symbols-rounded">open_in_new</span></button></td></tr>';
        }).join("") + '</tbody></table></div>' + mpPaginationHtml(result, "requests");
        bindMpPagination("requests", function() { loadRequestsTable(false, renderToken); });
        document.querySelectorAll("[data-mp-request]").forEach(function(button) { button.addEventListener("click", function() { openRequestDetail(button.dataset.mpRequest); }); });
        if (showToast) toast("Listas", "Listado actualizado.");
      })
      .catch(function(error) { const content = isMpRenderCurrent(renderToken, "lists") ? document.getElementById("mpRequestsContent") : null; if (content) content.innerHTML = mpError(error); });
  }

  function openUploadListModal() {
    openMpModal("Cargar lista de precios", "La lista se validará y quedará pendiente de revisión. No modifica precios oficiales.", '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>', true);
    ensureMpOptionsForModal(renderUploadListModalBody);
  }

  function renderUploadListModalBody(opts) {
    opts = opts || getMpEmptyOptions();
    const body = document.getElementById("mpModalBody");
    if (!body) return;
    const providerSelect = mpSelectInfo("idProveedor", "Proveedor", opts.proveedores, false, "Obligatorio. La lista de precios pertenece al proveedor seleccionado.");
    const providerField = opts.proveedorUsuario && !opts.puedeSeleccionarProveedor
      ? '<div class="mp-modal-section"><h4>Proveedor</h4><p>La lista quedará asociada automáticamente a tu proveedor.</p><input type="hidden" name="idProveedor" value="' + escapeHtml(opts.proveedorUsuario) + '"><div class="mp-badge"><span class="material-symbols-rounded">storefront</span>Proveedor asignado</div></div>'
      : '';
    const providerFieldInline = opts.proveedorUsuario && !opts.puedeSeleccionarProveedor ? '' : providerSelect;
    body.innerHTML = '<form id="mpUploadForm" class="mp-modern-form">' +
      '<section class="mp-upload-hero"><div><h4>Carga de lista de precios</h4><p>Completa la cabecera, adjunta el archivo CSV y valida la información antes de registrarla como pendiente de revisión. Todo precio queda asociado al proveedor de la lista.</p></div><div class="mp-upload-badges"><span class="mp-badge"><span class="material-symbols-rounded">rule</span>Validación previa</span><span class="mp-badge"><span class="material-symbols-rounded">pending_actions</span>Registro pendiente</span></div></section>' +
      providerField +
      '<div class="mp-upload-layout">' +
        '<div class="mp-modal-section"><h4>Datos de la lista</h4><p>Define el alcance comercial y la vigencia de la lista que vas a registrar.</p><div class="mp-form-grid">' +
          providerFieldInline +
          mpSelect("idNegocio", "Negocio", opts.negocios) +
          mpSelectInfo("idOficina", "Oficina de ventas", opts.oficinas, true, "Selecciona una sola oficina/canal para esta lista. Si no aplica, deja vacío para alcance general.", "mpUploadOffice") +
          mpSelect("idGrupo", "Grupo de vendedores", [], true, "mpUploadGroup") +
          mpInput("fechaInicio", "Fecha inicio", "date") +
          mpInput("fechaFin", "Fecha fin", "date") +
          '<label class="mp-form-span-2">Comentario<textarea name="comentarioProveedor" rows="4" placeholder="Agrega un comentario para la revisión, si aplica."></textarea></label>' +
          '<label class="mp-file-field mp-form-span-2">Archivo CSV<input id="mpUploadFile" type="file" accept=".csv,text/csv" required></label>' +
        '</div></div>' +
        '<div class="mp-upload-sidebar"><div class="mp-scope-card"><strong>Alcance de la lista</strong><div>Proveedor = <strong>obligatorio</strong>.</div><div>Sin oficina ni grupo = <strong>General</strong>.</div><div>Con oficina = <strong>Oficina</strong>. Con oficina y grupo = <strong>Grupo</strong>.</div></div><div class="mp-help-card"><strong>Antes de validar</strong><ul><li>Usa la plantilla oficial CSV.</li><li>En CODIGO_OFICINA indica una sola oficina por fila. Para otro canal, usa otra fila o carga.</li><li>La carga no modifica precios oficiales hasta que sea revisada.</li></ul></div></div>' +
      '</div>' +
      '<div id="mpUploadResult"></div><div class="mp-upload-actions"><button class="button button--primary" type="submit"><span class="material-symbols-rounded">upload_file</span>Validar y registrar pendiente</button></div></form>';
    bindUploadOfficeSelectDependency(opts);
    const form = document.getElementById("mpUploadForm");
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      submitUploadListForm(form);
    });
  }

  function submitUploadListForm(form) {
    const file = document.getElementById("mpUploadFile").files[0];
    if (!file) { toast("Archivo requerido", "Selecciona un archivo CSV.", true); return; }
    const resultBox = document.getElementById("mpUploadResult");
    resultBox.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Validando archivo y registrando solicitud...</div>';
    const reader = new FileReader();
    reader.onload = function() {
      const data = formToObject(form);
      data.idOficina = String(data.idOficina || "").trim();
      data.idGrupo = String(data.idGrupo || "").trim();
      if (data.idGrupo && !data.idOficina) {
        resultBox.innerHTML = mpError({ message: "Para usar grupo debes seleccionar una oficina de ventas." });
        toast("Alcance inválido", "Para usar grupo debes seleccionar una oficina de ventas.", true);
        return;
      }
      data.nombreArchivo = file.name;
      data.contenidoCsv = String(reader.result || "");
      secureRpc("crearSolicitudListaPrecioModulo", [data], "MATERIALES_PRECIOS")
        .then(function(result) {
          resultBox.innerHTML = '<div class="mp-upload-summary"><div><small>Solicitud</small><strong>' + escapeHtml(result.codigoSolicitud || "") + '</strong></div><div><small>Filas</small><strong>' + escapeHtml(result.totalFilas || 0) + '</strong></div><div><small>Errores</small><strong>' + escapeHtml(result.totalErrores || 0) + '</strong></div><div><small>Advertencias</small><strong>' + escapeHtml(result.totalAdvertencias || 0) + '</strong></div><div><small>Estado</small><strong>' + escapeHtml(result.estado || "") + '</strong></div></div><p class="mp-note">' + escapeHtml(result.mensaje || "La lista quedó registrada.") + '</p><div class="mp-actions"><button class="button button--ghost has-tooltip" type="button" id="mpDownloadCreatedObservations" data-tooltip="Descargar observaciones" aria-label="Descargar observaciones" title="Descargar observaciones"><span class="material-symbols-rounded">download</span></button><button class="button button--primary has-tooltip" type="button" id="mpCloseUploadSuccess" data-tooltip="Confirmar" aria-label="Confirmar" title="Confirmar"><span class="material-symbols-rounded">check</span></button></div>';
          on("mpDownloadCreatedObservations", "click", function() { exportRequestDetail(result.idSolicitud); });
          on("mpCloseUploadSuccess", "click", function() { closeMpModal(); renderMaterialsPricesLists(true); });
          toast("Lista registrada", "La solicitud quedó registrada como pendiente u observada.");
        })
        .catch(function(error) { resultBox.innerHTML = mpError(error); toast("No se pudo cargar", errorMessage(error), true); });
    };
    reader.readAsText(file, "UTF-8");
  }

  /* MP-LISTAS-BULK-INI (AGENTE B 2026-09-17): carga masiva XLSX de Listas de precios.
   * Crea listas oficiales (pre_listas_precios) con sus detalles
   * (pre_lista_precio_detalle) desde la hoja CARGA_LISTAS. Flujo validar ->
   * previsualizar -> confirmar; nada se graba hasta confirmar.
   * COLUMNAS CARGA_LISTAS (encabezado tolerante a mayúsculas/tildes y orden libre):
   *   PROVEEDOR (obligatorio, nombre comercial/razón social/código o id),
   *   OFICINA (opcional; vacía = General/todos),
   *   GRUPO (opcional; requiere OFICINA y debe pertenecer a esa oficina),
   *   NEGOCIO (opcional en el archivo; lo exige el RPC de cabecera: si viene vacío
   *     y hay un solo negocio vigente se usa ese, si hay varios se reporta error),
   *   NOMBRE_LISTA (opcional; filas con mismo proveedor/oficina/grupo/negocio/
   *     nombre/moneda/vigencia forman UNA lista; vacío = "Lista <proveedor> <alcance>"),
   *   MONEDA (opcional, vacía = PEN),
   *   FECHA_INICIO / FECHA_FIN (opcionales; vacías = día 1 -> fin del mes de carga,
   *     igual que precios individuales; aceptan AAAA-MM-DD, DD/MM/AAAA y fechas Excel),
   *   CODIGO_HANA (obligatorio por fila; equivale al código SAP; también se acepta
   *     CODIGO_MATERIAL como clave contra el maestro),
   *   PRECIO (obligatorio, >= 0),
   *   FEE (opcional; 0-100).
   * RPC usados (existentes, sin tablas nuevas): guardarListaOficialPrecioModulo por
   * cada lista + guardarDetalleListaPrecioModulo por cada detalle.
   * NOTA DE COLUMNAS (sin migración): NOMBRE_LISTA/FEE/MONEDA se
   * persisten en Supabase (columnas nombre/fee/moneda existentes);
   * en el backend GAS clásico guardarLista/Detalle ignoran NOMBRE distinto de su
   * predeterminado y no guardan FEE/MONEDA distinta de PEN.
   */
  function mpListasBulkXlsx_() {
    if (typeof window !== "undefined" && window && window.XLSX) return window.XLSX;
    if (typeof XLSX !== "undefined") return XLSX;
    return null;
  }

  function mpListasBulkMapColumns_(headers) {
    var map = {};
    (headers || []).forEach(function(raw, idx) {
      var key = mpGsdNorm_(raw);
      if (!key) return;
      if (key.indexOf("PROVEEDOR") === 0 && map.proveedor == null) map.proveedor = idx;
      else if (key.indexOf("OFICINA") === 0 && map.oficina == null) map.oficina = idx;
      else if (key.indexOf("CANAL") === 0 && map.oficina == null) map.oficina = idx;
      else if (key.indexOf("GRUPO") === 0 && map.grupo == null) map.grupo = idx;
      else if (key.indexOf("NEGOCIO") === 0 && map.negocio == null) map.negocio = idx;
      else if ((key.indexOf("NOMBRELISTA") === 0 || key === "NOMBRELISTA" || key === "LISTA" || key === "NOMBRE") && map.nombreLista == null) map.nombreLista = idx;
      else if (key.indexOf("MONEDA") === 0 && map.moneda == null) map.moneda = idx;
      else if ((key.indexOf("FECHAINICIO") === 0 || key === "INICIO" || key === "VIGENCIAINICIO" || key === "DESDE") && map.fechaInicio == null) map.fechaInicio = idx;
      else if ((key.indexOf("FECHAFIN") === 0 || key === "FIN" || key === "VIGENCIAFIN" || key === "HASTA") && map.fechaFin == null) map.fechaFin = idx;
      else if ((key === "CODIGOHANA" || key === "CODHANA" || key === "HANA" || key === "CODIGOSAP" || key === "CODSAP" || key === "SAP" || key === "CODIGOMATERIAL" || key === "CODMATERIAL") && map.codigoHana == null) map.codigoHana = idx;
      else if (key.indexOf("PRECIO") === 0 && map.precio == null) map.precio = idx;
      else if (key.indexOf("FEE") === 0 && map.fee == null) map.fee = idx;
    });
    return map;
  }

  function mpListasBulkFindHeaderRow_(aoa) {
    var best = -1;
    var bestScore = 0;
    var limit = Math.min((aoa || []).length, 20);
    for (var r = 0; r < limit; r++) {
      var row = aoa[r] || [];
      var celdas = 0;
      for (var c = 0; c < row.length; c++) {
        if (String(row[c] == null ? "" : row[c]).trim() !== "") celdas++;
      }
      if (celdas < 2) continue;
      var map = mpListasBulkMapColumns_(row);
      var score = Object.keys(map).length;
      if (score < 3) continue;
      var hasKey = map.proveedor != null && (map.codigoHana != null || map.precio != null);
      if (hasKey && score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best;
  }

  function mpListasBulkParseFecha_(value) {
    if (value == null || value === "") return "";
    if (typeof Date !== "undefined" && value instanceof Date) {
      if (isNaN(value.getTime())) return "";
      var y = value.getFullYear();
      var mo = ("0" + (value.getMonth() + 1)).slice(-2);
      var d = ("0" + value.getDate()).slice(-2);
      return y + "-" + mo + "-" + d;
    }
    var text = String(value).trim();
    if (!text) return "";
    var m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var mm = ("0" + m[2]).slice(-2);
      var dd = ("0" + m[3]).slice(-2);
      return m[1] + "-" + mm + "-" + dd;
    }
    m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
      var yy = m[3].length === 2 ? "20" + m[3] : m[3];
      return yy + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    }
    if (/^\d+(\.\d+)?$/.test(text)) {
      var serial = Number(text);
      if (isFinite(serial) && serial > 20000 && serial < 80000) {
        var base = new Date(Math.round((serial - 25569) * 86400 * 1000));
        var by = base.getUTCFullYear();
        var bm = ("0" + (base.getUTCMonth() + 1)).slice(-2);
        var bd = ("0" + base.getUTCDate()).slice(-2);
        return by + "-" + bm + "-" + bd;
      }
    }
    return "";
  }

  function mpListasBulkParseWorkbook_(workbook) {
    var XLSXLib = mpListasBulkXlsx_();
    if (!XLSXLib) throw new Error("Librería XLSX no disponible. Abre la aplicación para cargar el Excel.");
    if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
      throw new Error("El Excel no contiene hojas legibles.");
    }
    var names = workbook.SheetNames;
    var picked = names[0];
    var pickedScore = -2;
    for (var i = 0; i < names.length; i++) {
      var nombreHoja = names[i];
      var hojaWs = workbook.Sheets[nombreHoja];
      var hojaAoa = null;
      try {
        hojaAoa = XLSXLib.utils.sheet_to_json(hojaWs, { header: 1, defval: "", raw: true, blankrows: false });
      } catch (ignoreHoja) { hojaAoa = null; }
      var hojaHeader = hojaAoa ? mpListasBulkFindHeaderRow_(hojaAoa) : -1;
      var hojaScore = hojaHeader === -1 ? -1 : Object.keys(mpListasBulkMapColumns_(hojaAoa[hojaHeader])).length;
      if (hojaScore >= 0 && mpGsdNorm_(nombreHoja).indexOf("CARGA") === 0) hojaScore += 0.5;
      if (hojaScore > pickedScore) {
        pickedScore = hojaScore;
        picked = nombreHoja;
      }
    }
    var ws = workbook.Sheets[picked];
    if (!ws) throw new Error("La hoja " + picked + " no se pudo leer.");
    var aoa = XLSXLib.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true, blankrows: false });
    if (!aoa || !aoa.length) throw new Error("La hoja " + picked + " está vacía.");
    var headerRow = mpListasBulkFindHeaderRow_(aoa);
    if (headerRow === -1) {
      throw new Error("No se encontró el encabezado (se esperaban columnas PROVEEDOR, CODIGO_HANA y PRECIO, más OFICINA/GRUPO/NOMBRE_LISTA/MONEDA/FECHA_INICIO/FECHA_FIN opcionales). Descarga la plantilla XLSX.");
    }
    var map = mpListasBulkMapColumns_(aoa[headerRow]);
    var filas = [];
    for (var r = headerRow + 1; r < aoa.length; r++) {
      var row = aoa[r] || [];
      var allEmpty = row.every(function(c) { return String(c == null ? "" : c).trim() === ""; });
      if (allEmpty) continue;
      var codigoHana = mpGsdCell_(row, map.codigoHana);
      if (mpGsdNorm_(codigoHana).indexOf("EJEMPLO") === 0) continue;
      var vacia = !mpGsdCell_(row, map.proveedor) && !codigoHana && !String(map.precio != null ? row[map.precio] : "").trim() &&
        !mpGsdCell_(row, map.oficina) && !mpGsdCell_(row, map.grupo) && !mpGsdCell_(row, map.nombreLista);
      if (vacia) continue;
      filas.push({
        fila: r + 1,
        proveedor: mpGsdCell_(row, map.proveedor),
        oficina: mpGsdCell_(row, map.oficina),
        grupo: mpGsdCell_(row, map.grupo),
        negocio: mpGsdCell_(row, map.negocio),
        nombreLista: mpGsdCell_(row, map.nombreLista),
        moneda: mpGsdCell_(row, map.moneda),
        fechaInicioRaw: map.fechaInicio != null ? row[map.fechaInicio] : "",
        fechaFinRaw: map.fechaFin != null ? row[map.fechaFin] : "",
        codigoHana: codigoHana,
        precioRaw: map.precio != null ? row[map.precio] : "",
        feeRaw: map.fee != null ? row[map.fee] : ""
      });
    }
    return { hoja: picked, mapa: map, filas: filas };
  }

  function mpListasBulkParseFileBuffer_(buffer, nombreArchivo) {
    var XLSXLib = mpListasBulkXlsx_();
    if (!XLSXLib) throw new Error("Librería XLSX no disponible. Abre la aplicación para cargar el Excel.");
    if (buffer == null) throw new Error("Archivo vacío: selecciona un .xlsx con datos de listas.");
    var workbook = null;
    try {
      if (typeof buffer === "string") workbook = XLSXLib.read(buffer, { type: "string", cellDates: true });
      else workbook = XLSXLib.read(buffer, { type: "array", cellDates: true });
    } catch (errorLectura) {
      throw new Error("No se pudo leer el archivo .xlsx (¿formato válido?). Detalle: " + String((errorLectura && errorLectura.message) || errorLectura));
    }
    return mpListasBulkParseWorkbook_(workbook);
  }

  function mpListasBulkAlcance_(idOficina, idGrupo) {
    if (idGrupo) return "GRUPO";
    if (idOficina) return "OFICINA";
    return "GENERAL";
  }

  function mpListasBulkValidarFilas_(filas, opts, materiales) {
    opts = opts || getMpEmptyOptions();
    var vigenciaDefecto = mpGsdMonthRange_();
    var matPorCodigo = {};
    (materiales || []).forEach(function(m) {
      if (!m) return;
      var id = String(m.idMaterial || m.id || "").trim();
      [m.codigoSap, m.codigoHana, m.codigoMaterial, id].forEach(function(code) {
        var key = mpGsdNorm_(code);
        if (key && !matPorCodigo[key] && id) matPorCodigo[key] = { idMaterial: id, estado: String(m.estado || "ACTIVO").toUpperCase() };
      });
    });
    var detalle = [];
    var okItems = [];
    var grupos = [];
    var gruposPorClave = {};
    var vistosMaterialEnLista = {};
    var totalOk = 0;
    var totalErrores = 0;
    var totalAdvertencias = 0;
    (filas || []).forEach(function(f) {
      var motivos = [];
      var avisos = [];
      var proveedor = f.proveedor ? mpGsdResolverPorNombre_(opts.proveedores, f.proveedor) : null;
      if (!proveedor) motivos.push("PROVEEDOR no reconocido (" + (f.proveedor || "vacío") + "). Usa un nombre, código o id de DICCIONARIOS.");
      var idProveedor = proveedor ? String(proveedor.id || proveedor.idProveedor || "") : "";
      var oficina = f.oficina ? mpGsdResolverPorNombre_(opts.oficinas, f.oficina) : null;
      if (f.oficina && !oficina) motivos.push("OFICINA no reconocida (" + f.oficina + "). Vacía = General.");
      var idOficina = oficina ? String(oficina.id || oficina.idOficina || "") : "";
      var grupo = f.grupo ? mpGsdResolverPorNombre_(opts.grupos, f.grupo) : null;
      if (f.grupo && !grupo) motivos.push("GRUPO no reconocido (" + f.grupo + ").");
      var idGrupo = grupo ? String(grupo.id || grupo.idGrupo || "") : "";
      if (idGrupo && !idOficina) motivos.push("GRUPO requiere OFICINA (vacía = General no admite grupo).");
      if (idGrupo && idOficina) {
        var idOficinaGrupo = String(grupo.idOficina || grupo.oficinaId || "");
        if (idOficinaGrupo && idOficinaGrupo !== idOficina) motivos.push("El GRUPO (" + f.grupo + ") no pertenece a la OFICINA (" + f.oficina + ").");
      }
      var negocio = f.negocio ? mpGsdResolverPorNombre_(opts.negocios, f.negocio) : null;
      if (f.negocio && !negocio) motivos.push("NEGOCIO no reconocido (" + f.negocio + ").");
      var idNegocio = negocio ? String(negocio.id || "") : "";
      if (!idNegocio) {
        if ((opts.negocios || []).length === 1) {
          idNegocio = String(opts.negocios[0].id || "");
          avisos.push("NEGOCIO vacío: se usa el único negocio vigente (" + (opts.negocios[0].nombre || idNegocio) + ").");
        } else {
          motivos.push("Falta NEGOCIO (lo exige la cabecera de lista). Indica el nombre o código del negocio.");
        }
      }
      var moneda = String(f.moneda || "").trim().toUpperCase() || "PEN";
      if (!/^[A-Z]{3}$/.test(moneda)) motivos.push("MONEDA inválida (" + (f.moneda || "vacía") + "). Usa 3 letras, ej. PEN.");
      var inicio = mpListasBulkParseFecha_(f.fechaInicioRaw);
      var fin = mpListasBulkParseFecha_(f.fechaFinRaw);
      var rawInicio = String(f.fechaInicioRaw == null ? "" : f.fechaInicioRaw).trim();
      var rawFin = String(f.fechaFinRaw == null ? "" : f.fechaFinRaw).trim();
      if (rawInicio && !inicio) motivos.push("FECHA_INICIO no válida (" + rawInicio.slice(0, 20) + "). Usa AAAA-MM-DD o DD/MM/AAAA.");
      if (rawFin && !fin) motivos.push("FECHA_FIN no válida (" + rawFin.slice(0, 20) + "). Usa AAAA-MM-DD o DD/MM/AAAA.");
      if (!rawInicio && !rawFin) {
        inicio = vigenciaDefecto.inicio;
        fin = vigenciaDefecto.fin;
        avisos.push("Vigencia vacía: se usa el mes de carga (" + inicio + " → " + fin + ").");
      } else if ((!inicio && rawInicio) || (!fin && rawFin)) {
        // Ya se reportó el formato inválido arriba.
      } else if (!inicio || !fin) {
        motivos.push("Indica FECHA_INICIO y FECHA_FIN juntas, o deja ambas vacías para usar el mes de carga.");
      } else if (fin < inicio) {
        motivos.push("FECHA_FIN (" + fin + ") menor que FECHA_INICIO (" + inicio + ").");
      }
      var matKey = mpGsdNorm_(f.codigoHana);
      var mat = matKey ? (matPorCodigo[matKey] || null) : null;
      if (!f.codigoHana) motivos.push("Falta CODIGO_HANA (=código SAP del material).");
      else if (!mat) motivos.push("CODIGO_HANA no existe en el maestro (" + f.codigoHana + "). Créalo en la pestaña Materiales.");
      else if (mat.estado && mat.estado !== "ACTIVO") motivos.push("El material (" + f.codigoHana + ") está inactivo.");
      var precio = mpGsdParseNumber_(f.precioRaw);
      var precioCrudo = String(f.precioRaw == null ? "" : f.precioRaw).trim().slice(0, 40);
      if (precio == null) motivos.push("PRECIO ausente o no numérico" + (precioCrudo ? " (recibido: \"" + precioCrudo + "\")" : " (celda vacía)") + ".");
      else if (!(precio >= 0)) motivos.push("PRECIO debe ser mayor o igual a 0 (recibido: " + precio + ").");
      var fee = mpGsdParseFee_(f.feeRaw);
      if (fee.error) motivos.push(fee.error);
      var alcance = mpListasBulkAlcance_(idOficina, idGrupo);
      var nombreLista = String(f.nombreLista || "").trim();
      var claveGrupo = [idProveedor, idOficina, idGrupo, idNegocio, mpGsdNorm_(nombreLista), moneda, inicio, fin].join("|");
      var dupKey = claveGrupo + "||" + matKey;
      if (matKey && vistosMaterialEnLista[dupKey] !== undefined) {
        motivos.push("CODIGO_HANA duplicado dentro de la misma lista (ya está en la fila " + vistosMaterialEnLista[dupKey] + "). Deja una sola fila por material y lista.");
      } else if (matKey) {
        vistosMaterialEnLista[dupKey] = f.fila;
      }
      var etiquetaLista = (nombreLista || ("Lista " + (proveedor ? (proveedor.nombre || idProveedor) : (f.proveedor || "?")) + " " + alcance)) + " [" + (inicio || "?") + " → " + (fin || "?") + "]";
      if (motivos.length) {
        totalErrores += 1;
        detalle.push({ fila: f.fila, lista: etiquetaLista, material: f.codigoHana || "—", precio: precioCrudo || "—", estado: "ERROR", motivo: motivos.join(" ") });
        return;
      }
      var estado = avisos.length ? "ADVERTENCIA" : "OK";
      if (avisos.length) totalAdvertencias += 1;
      totalOk += 1;
      var cabecera = null;
      if (!gruposPorClave[claveGrupo]) {
        cabecera = {
          idProveedor: idProveedor,
          idNegocio: idNegocio,
          idOficina: idOficina,
          idGrupo: idGrupo,
          nombre: nombreLista || ("Lista " + (proveedor.nombre || idProveedor) + " " + alcance),
          moneda: moneda,
          fechaInicio: inicio,
          fechaFin: fin,
          origen: "CARGA_MASIVA_LISTAS",
          estado: "ACTIVA"
        };
        gruposPorClave[claveGrupo] = { clave: claveGrupo, etiqueta: etiquetaLista, alcance: alcance, cabecera: cabecera, items: [] };
        grupos.push(gruposPorClave[claveGrupo]);
      } else {
        cabecera = gruposPorClave[claveGrupo].cabecera;
      }
      var item = {
        fila: f.fila,
        detalle: {
          idMaterial: mat.idMaterial,
          precioBase: precio,
          moneda: moneda,
          fee: fee.valor
        }
      };
      gruposPorClave[claveGrupo].items.push(item);
      okItems.push(item);
      detalle.push({ fila: f.fila, lista: etiquetaLista, material: f.codigoHana, precio: String(precio), estado: estado, motivo: avisos.length ? avisos.join(" ") : "OK" });
    });
    return { totalFilas: (filas || []).length, totalListas: grupos.length, totalOk: totalOk, totalErrores: totalErrores, totalAdvertencias: totalAdvertencias, detalle: detalle, okItems: okItems, grupos: grupos };
  }

  function mpListasBulkBuildWorkbook_(opts) {
    var XLSXLib = mpListasBulkXlsx_();
    if (!XLSXLib) throw new Error("Librería XLSX no disponible.");
    opts = opts || {};
    var headers = ["PROVEEDOR", "OFICINA", "GRUPO", "NEGOCIO", "NOMBRE_LISTA", "MONEDA", "FECHA_INICIO", "FECHA_FIN", "CODIGO_HANA", "PRECIO", "FEE"];
    var anchos = [24, 20, 20, 20, 24, 10, 14, 14, 20, 12, 10];
    var vigencia = mpGsdMonthRange_();
    var ejemplo = ["EJEMPLO Proveedor", "", "", "EJEMPLO Negocio", "EJEMPLO Lista General", "PEN", vigencia.inicio, vigencia.fin, "EJEMPLO-BORRAR-ESTA-FILA", 100, 10];
    var wb = XLSXLib.utils.book_new();
    var ws = XLSXLib.utils.aoa_to_sheet([headers, ejemplo]);
    ws["!cols"] = anchos.map(function(wch) { return { wch: wch }; });
    XLSXLib.utils.book_append_sheet(wb, ws, "CARGA_LISTAS");
    var dict = [["CATEGORIA", "VALOR (escribe esto)", "NOMBRE", "NOTA"]];
    (opts.negocios || []).forEach(function(x) { dict.push(["NEGOCIO", x.nombre || x.id || "", x.nombre || "", "Lo exige la cabecera de lista"]); });
    (opts.proveedores || []).forEach(function(x) { dict.push(["PROVEEDOR", x.nombre || x.id || "", x.nombre || "", "Obligatorio por fila"]); });
    (opts.oficinas || []).forEach(function(x) { dict.push(["OFICINA", x.nombre || x.id || "", x.nombre || "", "Vacía = General (toda la red)"]); });
    (opts.grupos || []).forEach(function(x) { dict.push(["GRUPO", x.nombre || x.id || "", x.nombre || "", "Requiere OFICINA; debe pertenecer a esa oficina"]); });
    dict.push(["MATERIAL", "CODIGO_HANA", "Código SAP del maestro", "Debe existir en la pestaña Materiales"]);
    dict.push(["NOTA", "General", "", "Sin OFICINA ni GRUPO: la lista aplica a todos"]);
    dict.push(["NOTA", "Oficina", "", "Con OFICINA y sin GRUPO: solo ese canal"]);
    dict.push(["NOTA", "Grupo", "", "Con OFICINA y GRUPO: solo esos vendedores"]);
    dict.push(["NOTA", "Vigencia mensual", "", "FECHAS vacías = día 1 → fin del mes de carga"]);
    dict.push(["NOTA", "NOMBRE_LISTA", "", "Filas con mismo proveedor/oficina/grupo/negocio/nombre/moneda/vigencia = UNA lista"]);
    dict.push(["NOTA", "FEE", "", "Opcional 0-100 (% Cálidda, oculto al rol proveedor)"]);
    var wsDict = XLSXLib.utils.aoa_to_sheet(dict);
    wsDict["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 34 }, { wch: 52 }];
    XLSXLib.utils.book_append_sheet(wb, wsDict, "DICCIONARIOS");
    return wb;
  }

  function descargarPlantillaListasBulkXlsx_(canal) {
    var sufijoLista = String(canal || "").toUpperCase() === "ALO" ? "ALO" : (String(canal || "").toUpperCase() === "IA" ? "IA" : "GSD");
    var nombreLista = "Plantilla_Carga_Listas_" + sufijoLista + ".xlsx";
    var XLSXLib = mpListasBulkXlsx_();
    if (!XLSXLib) {
      toast("Plantilla no disponible", "La librería XLSX no está cargada. Revisa tu conexión e inténtalo de nuevo.", true);
      return;
    }
    try {
      var opts = MP_STATE.options || getMpEmptyOptions();
      var wb = mpListasBulkBuildWorkbook_(opts);
      var bytes = XLSXLib.write(wb, { bookType: "xlsx", type: "array" });
      var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (!blob.size) throw new Error("La plantilla XLSX generada está vacía.");
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = nombreLista;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(function() {
        try { link.remove(); } catch (ignoreRemove) {}
        try { URL.revokeObjectURL(url); } catch (ignoreRevoke) {}
      }, 30000);
      toast("Plantilla descargada", "Se inició la descarga de " + nombreLista + " (hojas CARGA_LISTAS y DICCIONARIOS).");
    } catch (error) {
      toast("No se pudo generar la plantilla", errorMessage(error), true);
    }
  }

  function openMpListsBulkModal(canal) {
    canal = String(canal || "").toUpperCase();
    mpPendingBulkCanal_ = (canal === "IA" || canal === "ALO") ? canal : "";
    openMpModal("Carga masiva de listas (XLSX)", "Valida y previsualiza antes de grabar: cada fila es un material dentro de una lista oficial (pre_listas_precios + detalle). Nada se graba hasta confirmar.", '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>', true);
    ensureMpOptionsForModal(renderMpListsBulkModalBody_);
  }

  function renderMpListsBulkModalBody_(opts) {
    opts = opts || getMpEmptyOptions();
    var body = document.getElementById("mpModalBody");
    if (!body) return;
    body.innerHTML = '<form id="mpListsBulkForm" class="mp-modern-form">' +
      mpBulkCanalFieldHtml_("mpListsBulkCanal", mpPendingBulkCanal_ || "IA") +
      '<section class="mp-upload-hero"><div><h4>Carga masiva de listas oficiales</h4>' +
      '<p>Descarga la plantilla XLSX oficial (Plantilla_Carga_Listas_GSD.xlsx), completa la hoja CARGA_LISTAS y valida antes de grabar. Las filas con mismo proveedor, oficina, grupo, negocio, nombre, moneda y vigencia forman UNA lista oficial.</p></div>' +
      '<div class="mp-upload-badges"><span class="mp-badge"><span class="material-symbols-rounded">fact_check</span>Prevalidación</span>' +
      '<span class="mp-badge"><span class="material-symbols-rounded">table_rows</span>XLSX</span></div></section>' +
      '<div class="mp-upload-layout"><div class="mp-modal-section"><h4>Archivo de carga</h4>' +
      '<p>Cada fila = un material (CODIGO_HANA) con su PRECIO dentro de una lista. La primera acción solo valida; nada se graba hasta confirmar.</p>' +
      '<div class="mp-form-grid">' +
      '<label class="mp-file-field mp-form-span-2">Archivo XLSX<input id="mpListsBulkFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required></label>' +
      '</div></div>' +
      '<div class="mp-upload-sidebar"><div class="mp-help-card"><strong>Cómo usar la plantilla</strong><ul>' +
      '<li>Descarga la plantilla XLSX oficial: Plantilla_Carga_Listas_GSD.xlsx (hojas CARGA_LISTAS y DICCIONARIOS).</li>' +
      '<li>Completa la hoja CARGA_LISTAS y usa DICCIONARIOS como referencia; escribe nombres, no IDs técnicos.</li>' +
      '<li>Borra la fila EJEMPLO antes de validar.</li>' +
      '<li><strong>PROVEEDOR</strong> (obligatorio): nombre, código o id del proveedor dueño de la lista.</li>' +
      '<li><strong>OFICINA</strong> (opcional): vacía = <strong>General</strong>, la lista aplica a toda la red.</li>' +
      '<li><strong>GRUPO</strong> (opcional): requiere OFICINA; con ambas = alcance <strong>Grupo</strong>.</li>' +
      '<li><strong>NEGOCIO</strong>: lo exige la cabecera; si hay un solo negocio vigente puede quedar vacío.</li>' +
      '<li><strong>NOMBRE_LISTA</strong> (opcional): agrupa filas en una lista; vacío = nombre automático.</li>' +
      '<li><strong>MONEDA</strong> (opcional): vacía = PEN.</li>' +
      '<li><strong>FECHA_INICIO / FECHA_FIN</strong> (opcionales): vacías = día 1 → fin del mes de carga.</li>' +
      '<li><strong>CODIGO_HANA</strong> (obligatorio): código SAP; debe existir en Materiales.</li>' +
      '<li><strong>PRECIO</strong> (obligatorio): mayor o igual a 0.</li>' +
      '<li><strong>FEE</strong> (opcional): 0-100.</li>' +
      '<li>La primera acción solo valida; nada se graba hasta confirmar.</li>' +
      '</ul></div></div></div>' +
      '<div id="mpListsBulkResult" class="mp-material-bulk-result"></div>' +
      '<div class="mp-upload-actions">' +
      '<button id="mpListsBulkTemplateLink" class="button button--ghost" type="button"><span class="material-symbols-rounded">download</span>Descargar plantilla XLSX (Plantilla_Carga_Listas_GSD.xlsx)</button>' +
      '<button id="mpListsBulkSubmit" class="button button--primary has-tooltip" type="submit" data-tooltip="Prevalidar listas" aria-label="Prevalidar listas" title="Prevalidar listas"><span class="material-symbols-rounded">fact_check</span></button>' +
      '</div></form>';
    on("mpListsBulkTemplateLink", "click", function() { descargarPlantillaListasBulkXlsx_(); });
    var form = document.getElementById("mpListsBulkForm");
    if (form) {
      form.addEventListener("submit", function(event) {
        event.preventDefault();
        submitMpListsBulkForm_(form);
      });
    }
  }

  function submitMpListsBulkForm_(form) {
    var input = document.getElementById("mpListsBulkFile");
    var file = input && input.files ? input.files[0] : null;
    if (!file) {
      toast("Archivo requerido", "Selecciona un archivo XLSX de listas.", true);
      return;
    }
    if (!/\.xlsx$/i.test(file.name || "")) {
      toast("Formato no válido", "La carga masiva de listas requiere un archivo .xlsx.", true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Archivo muy grande", "El archivo no puede superar 5 MB.", true);
      return;
    }
    var resultBox = document.getElementById("mpListsBulkResult");
    var submit = document.getElementById("mpListsBulkSubmit");
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalHtml = submit.innerHTML;
      submit.innerHTML = '<span class="material-symbols-rounded">progress_activity</span>';
    }
    if (resultBox) resultBox.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">fact_check</span>Validando archivo. Todavía no se grabará ninguna lista...</div>';
    var reader = new FileReader();
    reader.onload = function() {
      var parsed = null;
      try {
        parsed = mpListasBulkParseFileBuffer_(reader.result, file.name);
      } catch (parseError) {
        if (resultBox) resultBox.innerHTML = mpError(parseError);
        toast("No se pudo leer", errorMessage(parseError), true);
        restaurarBotonListasBulk_(submit);
        return;
      }
      if (!parsed || !parsed.filas || !parsed.filas.length) {
        if (resultBox) resultBox.innerHTML = mpError(new Error("El Excel no trae filas de datos (revisa CODIGO_HANA y elimina la fila EJEMPLO)."));
        restaurarBotonListasBulk_(submit);
        return;
      }
      prevalidarListasBulkLocal_(parsed, resultBox, submit);
    };
    reader.onerror = function() {
      if (resultBox) resultBox.innerHTML = mpError(new Error("No se pudo leer el archivo seleccionado."));
      restaurarBotonListasBulk_(submit);
    };
    try {
      reader.readAsArrayBuffer(file);
    } catch (readError) {
      if (resultBox) resultBox.innerHTML = mpError(readError);
      restaurarBotonListasBulk_(submit);
    }
  }

  function restaurarBotonListasBulk_(submit) {
    if (!submit) return;
    submit.disabled = false;
    submit.innerHTML = submit.dataset.originalHtml || '<span class="material-symbols-rounded">fact_check</span>';
  }

  function prevalidarListasBulkLocal_(parsed, resultBox, submit) {
    secureRpc("listarMaterialesPrecioModulo", [{}], "MATERIALES_PRECIOS")
      .catch(function() { return { registros: [] }; })
      .then(function(resp) {
        var opts = MP_STATE.options || getMpEmptyOptions();
        var valid = mpListasBulkValidarFilas_(parsed.filas, opts, (resp && resp.registros) || []);
        var idCanal = mpBulkCanalValue_("mpListsBulkCanal");
        var tokenPreview = null;
        var puedeConfirmar = false;
        if (valid.okItems.length) {
          tokenPreview = mpGsdStorePending_("LST", { grupos: valid.grupos, idCanal: idCanal });
          puedeConfirmar = true;
        }
        renderMpListsBulkPreview_(resultBox, {
          hoja: parsed.hoja,
          totalFilas: valid.totalFilas,
          totalListas: valid.totalListas,
          totalOk: valid.totalOk,
          totalErrores: valid.totalErrores,
          totalAdvertencias: valid.totalAdvertencias,
          detalle: valid.detalle,
          puedeConfirmar: puedeConfirmar,
          tokenPreview: tokenPreview
        });
        if (valid.totalErrores && !valid.okItems.length) {
          toast("Prevalidación con errores", "No se grabó ninguna lista. Corrige el archivo y vuelve a validar.", true);
        }
        restaurarBotonListasBulk_(submit);
      })
      .catch(function(error) {
        if (resultBox) resultBox.innerHTML = mpError(error);
        toast("No se pudo validar", errorMessage(error), true);
        restaurarBotonListasBulk_(submit);
      });
  }

  function renderMpListsBulkPreview_(resultBox, resumen) {
    if (!resultBox) return;
    resumen = resumen || {};
    var detalle = Array.isArray(resumen.detalle) ? resumen.detalle : [];
    var html = '<div class="mp-upload-summary">' +
      '<div><small>Filas</small><strong>' + escapeHtml(resumen.totalFilas || 0) + '</strong></div>' +
      '<div><small>Listas</small><strong>' + escapeHtml(resumen.totalListas || 0) + '</strong></div>' +
      '<div><small>OK</small><strong>' + escapeHtml(resumen.totalOk || 0) + '</strong></div>' +
      '<div><small>Errores</small><strong>' + escapeHtml(resumen.totalErrores || 0) + '</strong></div>' +
      '</div>' +
      '<p class="mp-note">Prevalidación local (' + escapeHtml(resumen.hoja || "XLSX") + '). Nada se grabó: confirma para crear las listas oficiales y sus detalles.' +
      (resumen.totalAdvertencias ? ' Advertencias: ' + escapeHtml(resumen.totalAdvertencias) + '.' : '') + '</p>';
    if (detalle.length) {
      html += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Fila</th><th>Lista</th><th>Material</th><th>Precio</th><th>Estado</th><th>Motivo</th>' +
        '</tr></thead><tbody>' +
        detalle.map(function(item) {
          return '<tr><td>' + escapeHtml(item.fila || "") + '</td><td>' + escapeHtml(item.lista || "") + '</td><td>' +
            escapeHtml(item.material || "") + '</td><td>' + escapeHtml(item.precio || "") + '</td><td>' +
            escapeHtml(item.estado || "") + '</td><td>' + escapeHtml(item.motivo || "") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    html += '<div class="mp-actions">';
    if (resumen.puedeConfirmar && resumen.tokenPreview) {
      html += '<button id="mpConfirmListsBulk" class="button button--primary" type="button">' +
        '<span class="material-symbols-rounded">check_circle</span>Confirmar carga de listas</button>';
    }
    html += '</div>';
    resultBox.innerHTML = html;
    if (resumen.puedeConfirmar && resumen.tokenPreview) {
      on("mpConfirmListsBulk", "click", function() {
        confirmarListasBulk_(resultBox, resumen.tokenPreview);
      });
    }
  }

  function confirmarListasBulk_(resultBox, tokenPreview) {
    var pending = mpGsdTakePending_(tokenPreview);
    if (!pending || pending.kind !== "LST" || !pending.pendientes || !pending.pendientes.grupos) {
      toast("Sesión de prevalidación vencida", "Vuelve a prevalidar el archivo antes de confirmar.", true);
      return;
    }
    var grupos = pending.pendientes.grupos || [];
    var idCanal = String((pending.pendientes && pending.pendientes.idCanal) || mpBulkCanalValue_("mpListsBulkCanal") || "IA").toUpperCase();
    if (idCanal !== "IA" && idCanal !== "ALO") idCanal = "IA";
    var totalDetalles = grupos.reduce(function(n, g) { return n + ((g.items || []).length); }, 0);
    var doneBulkLst = 0;
    var stepBulkLst = function() {
      doneBulkLst += 1;
      mpBulkProgressUpdate_(resultBox, doneBulkLst, totalDetalles, "Grabando listas...");
    };
    mpBulkProgressUpdate_(resultBox, 0, totalDetalles, "Grabando listas...");
    var button = document.getElementById("mpConfirmListsBulk");
    if (button) button.disabled = true;
    var listasCreadas = 0;
    var listasActualizadas = 0;
    var detallesCreados = 0;
    var detallesActualizados = 0;
    var errores = 0;
    var detalle = [];
    var chain = Promise.resolve();
    grupos.forEach(function(grupo) {
      chain = chain.then(function() {
        var cabeceraPayload = Object.assign({}, grupo.cabecera, { idCanal: idCanal });
        return secureRpc("guardarListaOficialPrecioModulo", [cabeceraPayload], "MATERIALES_PRECIOS")
          .then(function(resLista) {
            var idLista = (resLista && (resLista.idListaPrecio || resLista.idLista)) || "";
            if (resLista && resLista.creado === false) listasActualizadas += 1;
            else listasCreadas += 1;
            var sub = Promise.resolve();
            (grupo.items || []).forEach(function(item) {
              sub = sub.then(function() {
                var det = {
                  idListaPrecio: idLista,
                  idMaterial: item.detalle.idMaterial,
                  precioBase: item.detalle.precioBase,
                  moneda: item.detalle.moneda,
                  fee: item.detalle.fee,
                  estado: "ACTIVO"
                };
                return secureRpc("guardarDetalleListaPrecioModulo", [det], "MATERIALES_PRECIOS")
                  .then(function(resDet) {
                    if (resDet && resDet.creado === false) detallesActualizados += 1;
                    else detallesCreados += 1;
                    detalle.push({ fila: item.fila, lista: grupo.etiqueta, material: item.detalle.idMaterial, precio: String(item.detalle.precioBase), estado: "OK", motivo: "Grabado en lista " + idLista });
                    stepBulkLst();
                  })
                  .catch(function(error) {
                    errores += 1;
                    detalle.push({ fila: item.fila, lista: grupo.etiqueta, material: item.detalle.idMaterial, precio: String(item.detalle.precioBase), estado: "ERROR", motivo: errorMessage(error) });
                    stepBulkLst();
                  });
              });
            });
            return sub;
          })
          .catch(function(error) {
            errores += (grupo.items || []).length;
            (grupo.items || []).forEach(function(item) {
              detalle.push({ fila: item.fila, lista: grupo.etiqueta, material: item.detalle.idMaterial, precio: String(item.detalle.precioBase), estado: "ERROR", motivo: "Lista no creada: " + errorMessage(error) });
              stepBulkLst();
            });
          });
      });
    });
    chain.then(function() {
      mpGsdDropPending_(tokenPreview);
      clearMpTableCache("prices");
      clearMpSummaryCache();
      renderMpListsBulkPreview_(resultBox, {
        hoja: "confirmación",
        totalFilas: totalDetalles,
        totalListas: grupos.length,
        totalOk: detallesCreados + detallesActualizados,
        totalErrores: errores,
        totalAdvertencias: 0,
        detalle: detalle,
        puedeConfirmar: false,
        tokenPreview: null
      });
      var nota = resultBox.querySelector(".mp-note");
      if (nota) nota.textContent = "Carga confirmada. Listas creadas: " + listasCreadas + " · actualizadas: " + listasActualizadas + " · detalles creados: " + detallesCreados + " · actualizados: " + detallesActualizados + " · errores: " + errores + ". Solo se grabaron las filas validadas.";
      toast("Carga de listas confirmada", "Listas: " + listasCreadas + " creadas, " + listasActualizadas + " actualizadas · Detalles con error: " + errores);
    });
  }
  /* MP-LISTAS-BULK-FIN */

  function openRequestDetail(idSolicitud) {
    const renderToken = { value: MP_STATE.renderToken, tab: "lists" };
    const region = getMpRegionIfCurrent(renderToken, "lists");
    if (!region) return;
    region.innerHTML = loadingHtml(8);
    secureRpc("obtenerDetalleSolicitudListaPrecioModulo", [idSolicitud], "MATERIALES_PRECIOS")
      .then(function(result) {
        if (!isMpRenderCurrent(renderToken, "lists")) return;
        MP_STATE.currentDetail = result;
        renderRequestDetail(result);
      })
      .catch(function(error) { const currentRegion = getMpRegionIfCurrent(renderToken, "lists"); if (currentRegion) currentRegion.innerHTML = mpError(error); });
  }

  function renderRequestDetail(result) {
    const region = getMpRegionIfCurrent({ value: MP_STATE.renderToken, tab: "lists" }, "lists");
    if (!region) return;
    const s = result.solicitud || {};
    const rows = result.detalles || [];
    region.innerHTML = '<section class="mp-panel"><div class="mp-detail-head"><div><p class="eyebrow">SOLICITUD</p><h3>' + escapeHtml(s.codigoSolicitud || "Solicitud") + '</h3><p>' + escapeHtml((s.proveedor || "—") + " · " + (s.negocio || "—") + " · " + mpScopeLabel(s)) + '</p><p><strong>Origen:</strong> ' + escapeHtml(s.origenCarga || "—") + '</p><span class="mp-status ' + escapeHtml(s.estado || "") + '">' + escapeHtml(s.estado || "") + '</span></div><div class="mp-actions"><button id="mpBackRequests" class="button button--secondary has-tooltip" type="button" data-tooltip="Volver" aria-label="Volver" title="Volver"><span class="material-symbols-rounded">arrow_back</span></button><button id="mpExportRequest" class="button button--ghost has-tooltip" type="button" data-tooltip="Descargar observaciones" aria-label="Descargar observaciones" title="Descargar observaciones"><span class="material-symbols-rounded">download</span></button>' + (mpPermission("TOMAR_REVISION_PRECIO") ? '<button id="mpTakeReview" class="button button--secondary has-tooltip" type="button" data-tooltip="Tomar revisión" aria-label="Tomar revisión" title="Tomar revisión"><span class="material-symbols-rounded">fact_check</span></button>' : '') + (mpPermission("APROBAR_LISTA_PRECIO") ? '<button id="mpApproveRequest" class="button button--primary has-tooltip" type="button" data-tooltip="Aprobar" aria-label="Aprobar" title="Aprobar"><span class="material-symbols-rounded">check_circle</span></button>' : '') + (mpPermission("OBSERVAR_LISTA_PRECIO") ? '<button id="mpObserveRequest" class="button button--secondary has-tooltip" type="button" data-tooltip="Observar" aria-label="Observar" title="Observar"><span class="material-symbols-rounded">report</span></button>' : '') + (mpPermission("RECHAZAR_LISTA_PRECIO") ? '<button id="mpRejectRequest" class="button button--secondary has-tooltip" type="button" data-tooltip="Rechazar" aria-label="Rechazar" title="Rechazar"><span class="material-symbols-rounded">cancel</span></button>' : '') + (mpPermission("PUBLICAR_LISTA_PRECIO") ? '<button id="mpPublishRequest" class="button button--primary has-tooltip" type="button" data-tooltip="Publicar" aria-label="Publicar" title="Publicar"><span class="material-symbols-rounded">publish</span></button>' : '') + '</div></div><div class="mp-grid">' + mpMetric("Filas", s.totalFilas || 0) + mpMetric("Errores", s.totalErrores || 0) + mpMetric("Advertencias", s.totalAdvertencias || 0) + mpMetric("Vigencia", escapeHtml((s.fechaInicio || "") + " / " + (s.fechaFin || ""))) + '</div></section>' +
      '<section class="mp-panel"><div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Fila</th><th>Código</th><th>Clasificación</th><th>Descripción</th><th>Combo</th><th>Detalle combo</th><th>Precio</th><th>Estado</th><th>Errores</th><th>Advertencias</th></tr></thead><tbody>' + rows.map(function(row) {
        return '<tr><td>' + escapeHtml(row.numeroFila) + '</td><td>' + escapeHtml((row.codigoMaterial || "—") + " / " + (row.codigoSap || "—")) + '</td><td>' + escapeHtml((row.productoPrincipal || "—") + " / " + (row.tipoMaterial || "—") + " / " + (row.subtipoMaterial || "—")) + '</td><td>' + escapeHtml(row.descripcionMaterial || "") + '</td><td>' + escapeHtml(row.esCombo ? "Sí" : "No") + '</td><td>' + escapeHtml(row.componentesIncluidos || "—") + '</td><td>S/ ' + escapeHtml(row.precioBase || 0) + '</td><td><span class="mp-status ' + escapeHtml(row.estadoFila) + '">' + escapeHtml(row.estadoFila) + '</span></td><td>' + escapeHtml((row.errores || []).join(" | ")) + '</td><td>' + escapeHtml((row.advertencias || []).join(" | ")) + '</td></tr>';
      }).join("") + '</tbody></table></div></section>';
    on("mpBackRequests", "click", function() { MP_STATE.currentDetail = null; renderMaterialsPricesLists(); });
    on("mpExportRequest", "click", function() { exportRequestDetail(s.idSolicitud); });
    on("mpTakeReview", "click", function() { runRequestAction("tomarRevisionSolicitudListaPrecioModulo", [s.idSolicitud], "Revisión tomada"); });
    on("mpApproveRequest", "click", function() { resolveRequest(s.idSolicitud, "APROBAR"); });
    on("mpObserveRequest", "click", function() { resolveRequest(s.idSolicitud, "OBSERVAR"); });
    on("mpRejectRequest", "click", function() { resolveRequest(s.idSolicitud, "RECHAZAR"); });
    on("mpPublishRequest", "click", function() { runRequestAction("publicarSolicitudListaPrecioModulo", [s.idSolicitud], "Lista publicada"); });
  }

  function resolveRequest(idSolicitud, action) {
    const comment = window.prompt("Comentario para la solicitud:", "") || "";
    secureRpc("resolverRevisionSolicitudListaPrecioModulo", [idSolicitud, action, comment], "MATERIALES_PRECIOS")
      .then(function() { toast("Solicitud actualizada", "La acción fue registrada."); return openRequestDetail(idSolicitud); })
      .catch(function(error) { toast("No se pudo actualizar", errorMessage(error), true); });
  }

  function runRequestAction(operation, args, message) {
    secureRpc(operation, args, "MATERIALES_PRECIOS")
      .then(function() { toast("Acción registrada", message || "Operación completada."); return openRequestDetail(args[0]); })
      .catch(function(error) { toast("No se pudo completar", errorMessage(error), true); });
  }

  function tieneContextoPrecioListo_(opts) {
    opts = opts || {};
    return Array.isArray(opts.proveedores) &&
      opts.proveedores.length > 0 &&
      Array.isArray(opts.negocios) &&
      opts.negocios.length > 0;
  }

  function campoPrecioAnchoCompleto_(htmlCampo) {
    return '<div class="mp-form-span-2">' + String(htmlCampo || "") + '</div>';
  }

  function openIndividualPriceModal(prefill) {
    MP_STATE.pricePrefill = prefill || null;
    const editing = Boolean(prefill && (prefill.idDetallePrecio || prefill.idPrecio));
    const token = Date.now() + "_" + Math.random();
    MP_STATE.priceModalToken = token;

    openMpModal(
      editing ? "Modificar precio" : "Cargar precio individual",
      editing ?
        "Actualiza el contexto comercial, material, precio y vigencia siguiendo el formulario de arriba hacia abajo." :
        "Completa primero el contexto comercial y luego busca el material. La búsqueda del material no modifica proveedor, negocio, oficina ni grupo.",
      '<div class="mp-inline-loader"><span class="material-symbols-rounded">progress_activity</span>Preparando proveedor, negocio y alcance...</div>',
      true
    );

    const cachedOptions = MP_STATE.options || readMpOptionsCache();

    // Si el contexto comercial ya está disponible, el formulario aparece inmediatamente.
    // La actualización de opciones queda en segundo plano y nunca vuelve a renderizar el
    // formulario mientras el usuario lo está completando.
    if (tieneContextoPrecioListo_(cachedOptions)) {
      renderIndividualPriceModalBody(cachedOptions, { fromCache: true });
      loadMpOptions({ silent: true }).catch(function() {});
      return;
    }

    // Sin caché válida, esperamos únicamente las opciones base. No mostramos selects vacíos.
    loadMpOptions({ silent: true })
      .then(function(options) {
        if (MP_STATE.priceModalToken !== token) return;
        if (!tieneContextoPrecioListo_(options)) {
          throw new Error("No se encontraron proveedores o negocios activos para registrar el precio.");
        }
        renderIndividualPriceModalBody(options, { fromCache: false });
      })
      .catch(function(error) {
        if (MP_STATE.priceModalToken !== token) return;
        const body = document.getElementById("mpModalBody");
        if (!body) return;
        body.innerHTML =
          '<div class="mp-price-alert">' +
            '<strong>No se pudo preparar el precio individual.</strong><br>' +
            escapeHtml(errorMessage(error)) +
          '</div>';
      });
  }

  function renderIndividualPriceModalBody(opts, renderConfig) {
    opts = opts || getMpEmptyOptions();
    renderConfig = renderConfig || {};
    const prefill = MP_STATE.pricePrefill || {};
    const body = document.getElementById("mpModalBody");
    if (!body) return;

    const materialOptions = (opts.materiales || []).length ? opts.materiales : [];

    body.innerHTML =
      '<form id="mpIndividualPriceForm" class="mp-modern-form" novalidate>' +

        '<section class="mp-upload-hero">' +
          '<div>' +
            '<h4>Precio del material</h4>' +
            '<p>Completa el formulario en orden. Primero define quién oferta y dónde aplica; después identifica el material y finalmente registra precio y vigencia.</p>' +
          '</div>' +
          '<div class="mp-upload-badges">' +
            '<span class="mp-badge"><span class="material-symbols-rounded">currency_exchange</span>PEN / S/</span>' +
          '</div>' +
        '</section>' +

        '<div class="mp-modal-section">' +
          '<h4>1. Contexto comercial</h4>' +
          '<p>Estos datos se cargan al abrir el modal y son independientes de la búsqueda del material.</p>' +
          '<div class="mp-form-grid">' +
            campoPrecioAnchoCompleto_(
              mpSelectInfo(
                "idProveedor",
                "Proveedor",
                opts.proveedores,
                false,
                "Obligatorio. Define qué proveedor oferta el material."
              )
            ) +
            campoPrecioAnchoCompleto_(
              mpInputInfo(
                "responsableVenta",
                "Responsable venta",
                "text",
                (prefill && (prefill.responsableVenta || prefill.RESPONSABLE_VENTA)) || "",
                "Opcional. Dato informativo del precio individual."
              )
            ) +
            campoPrecioAnchoCompleto_(
              mpSelect(
                "idNegocio",
                "Negocio",
                opts.negocios,
                false
              )
            ) +
            campoPrecioAnchoCompleto_(
              mpSelectInfo(
                "idOficina",
                "Oficina de ventas",
                opts.oficinas,
                true,
                "Opcional. Si queda vacía, el precio tendrá alcance General. Selecciona una oficina para crear una excepción por oficina.",
                "mpPriceOffice"
              )
            ) +
            campoPrecioAnchoCompleto_(
              mpSelect(
                "idGrupo",
                "Grupo de vendedores",
                [],
                true,
                "mpPriceGroup"
              )
            ) +
          '</div>' +
          '<div class="mp-scope-card" id="mpPriceScopeSummary">' +
            '<strong>Alcance actual:</strong> General. Sin oficina ni grupo.' +
          '</div>' +
        '</div>' +

        '<div class="mp-modal-section">' +
          '<h4>2. Material</h4>' +
          '<p>La búsqueda solo carga materiales. No altera el proveedor, negocio, oficina ni grupo seleccionados arriba.</p>' +
          '<div class="mp-form-grid">' +
            '<label class="mp-form-span-2">Buscar material' +
              '<input id="mpPriceMaterialSearch" type="search" placeholder="Código SAP, código interno o descripción; escribe al menos 2 caracteres">' +
            '</label>' +
            campoPrecioAnchoCompleto_(
              mpSelect(
                "idMaterial",
                "Material",
                materialOptions,
                false,
                "mpPriceMaterialSelect"
              )
            ) +
          '</div>' +
        '</div>' +

        '<div class="mp-modal-section">' +
          '<h4>3. Precio y vigencia</h4>' +
          '<p>Registra el valor, la vigencia y la información comercial complementaria.</p>' +

          '<div class="mp-form-grid mp-price-grid--three">' +
            mpInput("precioBase", "Precio base S/", "number") +
            mpInput("fechaInicio", "Fecha inicio", "date") +
            mpInput("fechaFin", "Fecha fin", "date") +
          '</div>' +
          (isMpProviderUser_() ? '' : '<div class="mp-form-grid">' + mpInput("fee", "Fee % Cálidda", "number") + '</div>') +
          '<p class="mp-note">Vigencia mensual: si dejas las fechas vacías se usa el día 1 al último día del mes de carga. El fee (% que se lleva Cálidda) está oculto para el rol proveedor.</p>' +

          '<div class="mp-form-grid mp-price-grid--two">' +
            '<label>Combo / detalle incluido' +
              '<textarea name="detalleCombo" rows="3" placeholder="Opcional. Ej.: incluye elastómero y conexión al punto de gas."></textarea>' +
            '</label>' +
            '<label>Comentario comercial' +
              '<textarea name="comentarioComercial" rows="3" placeholder="Comentario opcional para esta condición de precio."></textarea>' +
            '</label>' +
          '</div>' +
        '</div>' +

        '<div id="mpPriceInlineAlert" class="mp-price-alert" hidden></div>' +

        '<div class="mp-upload-actions">' +
          '<button id="mpIndividualPriceSubmit" class="button button--primary has-tooltip" type="submit" data-tooltip="Guardar precio individual" aria-label="Guardar precio individual" title="Guardar precio individual">' +
            '<span class="material-symbols-rounded">save</span>' +
          '</button>' +
        '</div>' +
      '</form>';

    bindPriceOfficeSelectDependency(opts);

    const materialSearch = document.getElementById("mpPriceMaterialSearch");
    if (materialSearch) {
      materialSearch.addEventListener("input", debounce(function() {
        // PASO 28K: esta función solo modifica mpPriceMaterialSelect.
        loadMaterialOptionsForPrice(materialSearch.value || "");
      }, 350));
    }

    const form = document.getElementById("mpIndividualPriceForm");
    if (!form) return;

    if (prefill && Object.keys(prefill).length) {
      ensureSelectOption(form.idProveedor, prefill.idProveedor || "", prefill.proveedor || "Proveedor seleccionado");
      ensureSelectOption(form.idNegocio, prefill.idNegocio || "", prefill.negocio || "Negocio seleccionado");
      ensureSelectOption(form.idOficina, prefill.idOficina || "", prefill.oficina || "Oficina seleccionada");

      if (form.idProveedor) form.idProveedor.value = prefill.idProveedor || "";
      if (form.idNegocio) form.idNegocio.value = prefill.idNegocio || "";
      if (form.idOficina) form.idOficina.value = prefill.idOficina || "";

      // La oficina determina solamente los grupos disponibles.
      syncPriceOfficeSelection(opts);

      ensureSelectOption(form.idGrupo, prefill.idGrupo || "", prefill.grupo || "Grupo seleccionado");
      if (form.idGrupo) form.idGrupo.value = prefill.idGrupo || "";
      actualizarResumenAlcancePrecio_();

      if (form.idMaterial && prefill.idMaterial) {
        const label = [
          prefill.codigoSap || prefill.codigoMaterial || "",
          prefill.nombreCortoMaterial || prefill.descripcionMaterial || ""
        ].filter(Boolean).join(" — ") || prefill.idMaterial;

        form.idMaterial.innerHTML =
          '<option value="' + escapeHtml(prefill.idMaterial) + '">' +
            escapeHtml(label) +
          '</option>';
        form.idMaterial.value = prefill.idMaterial;
      }

      if (form.precioBase) form.precioBase.value = resolveMpPriceValue(prefill);
      if (form.fechaInicio) form.fechaInicio.value = String(prefill.fechaInicio || "").slice(0, 10);
      if (form.fechaFin) form.fechaFin.value = String(prefill.fechaFin || "").slice(0, 10);
      if (form.detalleCombo) form.detalleCombo.value = getMpComboDetail(prefill);
      if (form.comentarioComercial) form.comentarioComercial.value = prefill.comentarioComercial || "";
      if (form.responsableVenta) form.responsableVenta.value = prefill.responsableVenta || prefill.RESPONSABLE_VENTA || "";
      if (form.fee) form.fee.value = (prefill.fee === null || prefill.fee === undefined) ? "" : prefill.fee;
    }
    setMpMonthlyVigenciaDefaults_(form);

    form.addEventListener("submit", function(event) {
      event.preventDefault();

      const data = formToObject(form);
      data.idOficina = form.idOficina ?
        String(form.idOficina.value || "").trim() :
        String(data.idOficina || "").trim();
      data.idGrupo = form.idGrupo ?
        String(form.idGrupo.value || "").trim() :
        String(data.idGrupo || "").trim();
      data.precioBase = form.precioBase ?
        String(form.precioBase.value || "").trim() :
        data.precioBase;
      data.fechaInicio = form.fechaInicio ?
        String(form.fechaInicio.value || "").trim() :
        data.fechaInicio;
      data.fechaFin = form.fechaFin ?
        String(form.fechaFin.value || "").trim() :
        data.fechaFin;

      data._labelProveedor = getSelectedOptionText(form.idProveedor);
      data._labelNegocio = getSelectedOptionText(form.idNegocio);
      data._labelOficina = getSelectedOptionText(form.idOficina);
      data._labelGrupo = getSelectedOptionText(form.idGrupo);

      if (!data.idOficina) data.idGrupo = "";

      if (MP_STATE.pricePrefill &&
          (MP_STATE.pricePrefill.idDetallePrecio || MP_STATE.pricePrefill.idPrecio)) {
        data.idDetallePrecio =
          MP_STATE.pricePrefill.idDetallePrecio ||
          MP_STATE.pricePrefill.idPrecio ||
          "";
        data.idListaPrecio = MP_STATE.pricePrefill.idListaPrecio || "";
      }

      data.tieneCombo = String(data.detalleCombo || "").trim() ? "SI" : "";

      const validation = validateIndividualPriceForm(data);
      if (!validation.ok) {
        showMpPriceInlineAlert(validation.message);
        toast("Revisa el precio", validation.message, true);
        focusIndividualPriceField(validation.field);
        return;
      }

      showMpPriceInlineAlert("");

      const submit = document.getElementById("mpIndividualPriceSubmit");
      if (submit) {
        submit.disabled = true;
        submit.dataset.originalHtml = submit.innerHTML;
        submit.innerHTML =
          '<span class="material-symbols-rounded">progress_activity</span>';
      }

      secureRpc(
        "guardarPrecioIndividualMaterialesPreciosModulo",
        [data],
        "MATERIALES_PRECIOS"
      )
        .then(function(result) {
          toast(
            "Precio guardado",
            result && result.mensaje ?
              result.mensaje :
              "El precio individual fue registrado."
          );
          clearMpTableCache("prices");
          clearMpSummaryCache();
          closeMpModal();
          if (result && result.precioVista) {
            updatePriceTableOptimistically(result.precioVista);
          }
          window.setTimeout(function() {
            loadOfficialPricesTable(true, false, true);
          }, 800);
        })
        .catch(function(error) {
          const message = errorMessage(error);
          showMpPriceInlineAlert(message);
          toast("No se pudo guardar", message, true);
        })
        .finally(function() {
          if (submit) {
            submit.disabled = false;
            submit.innerHTML =
              submit.dataset.originalHtml ||
              '<span class="material-symbols-rounded">save</span>';
          }
        });
    });
  }


  function updatePriceTableOptimistically(row) {
    if (APP_STATE.module !== "MATERIALES_PRECIOS" || MP_STATE.activeTab !== "prices") return;
    const content = document.getElementById("mpOfficialListsContent");
    if (!content) return;
    const params = { texto: MP_STATE.priceFilters.texto || "", estado: MP_STATE.priceFilters.estado || "TODOS", pagina: MP_STATE.page, tamano: MP_STATE.pageSize };
    const cached = readMpTableCache("prices", params, MP_TABLE_CACHE_TTL_MS) || { registros: [], paginacion: { pagina: 1, total: 0, totalPaginas: 1 }, resumen: { total: 0 } };
    const id = String(row.idDetallePrecio || row.idPrecio || "").trim();
    if (!id) return;
    let replaced = false;
    const rows = (cached.registros || []).map(function(item) {
      const itemId = String(item.idDetallePrecio || item.idPrecio || "").trim();
      if (itemId === id) { replaced = true; return row; }
      return item;
    });
    if (!replaced) rows.unshift(row);
    cached.registros = rows.slice(0, Number(params.tamano || MP_STATE.pageSize || 30));
    cached.resumen = cached.resumen || {};
    cached.resumen.total = Math.max(Number(cached.resumen.total || rows.length), rows.length);
    writeMpTableCache("prices", params, cached);
    renderOfficialPricesTableResult(cached, false, true, { value: MP_STATE.renderToken, tab: "prices" });
  }

  function ensureSelectOption(select, value, label) {
    if (!select || !value || !select.options) return;
    const exists = Array.from(select.options || []).some(function(option) { return option.value === String(value); });
    if (!exists) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label || String(value);
      select.appendChild(option);
    }
  }

  function ensureOfficeCheckOption(value, label) {
    const node = document.getElementById("mpPriceOffices");
    const id = String(value || "").trim();
    if (!node || !id) return;
    if (node.tagName === "SELECT") {
      ensureSelectOption(node, id, label || id);
      return;
    }
    const grid = node.querySelector(".mp-office-grid") || node.querySelector(".mp-check-grid");
    if (!grid) return;
    const empty = grid.querySelector(".mp-office-empty") || grid.querySelector(".mp-check-option--empty");
    if (empty) empty.remove();
    const exists = Array.from(grid.querySelectorAll('input[type="checkbox"]')).some(function(input) { return String(input.value) === id; });
    if (exists) return;
    const wrapper = document.createElement("label");
    wrapper.className = "mp-office-option";
    wrapper.setAttribute("data-search", normalizeMpText([id, label || id].join(" ")));
    wrapper.innerHTML = '<input type="checkbox" name="idOficina" value="' + escapeHtml(id) + '"><span>' + escapeHtml(label || id) + '</span>';
    grid.appendChild(wrapper);
    bindOfficePicker("mpPriceOffices", function() { syncPriceOfficeSelection(MP_STATE.options || getMpEmptyOptions()); });
  }

  function normalizeMpText(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getMpComboDetail(row) {
    row = row || {};
    const values = [row.detalleCombo, row.DETALLE_COMBO, row.combo, row.COMBO, row.componentesIncluidos, row.COMPONENTES_INCLUIDOS, row.descripcionCombo, row.DESCRIPCION_COMBO, row.detalleDelCombo, row.COMBO_DETALLE];
    for (let i = 0; i < values.length; i++) {
      const text = String(values[i] === null || values[i] === undefined ? "" : values[i]).trim();
      if (!text) continue;
      const normalized = normalizeMpText(text);
      if (["SI", "S", "YES", "TRUE", "1", "NO", "N", "FALSE", "0"].indexOf(normalized) !== -1) continue;
      return text;
    }
    return "";
  }

  function resolveMpPriceValue(row) {
    row = row || {};
    const fields = ["precioBase", "PRECIO_BASE", "precio", "PRECIO", "montoPrecio", "MONTO_PRECIO", "precioUnitario", "PRECIO_UNITARIO", "precioLista", "PRECIO_LISTA", "precioMaterial", "PRECIO_MATERIAL", "monto", "MONTO", "valor", "VALOR", "importe", "IMPORTE", "precioVigente", "PRECIO_VIGENTE"];
    for (let i = 0; i < fields.length; i++) {
      const value = row[fields[i]];
      if (value === null || value === undefined || String(value).trim() === "") continue;
      const n = parseMpMoneyNumber(value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  function parseMpMoneyNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let text = String(value === null || value === undefined ? "" : value).trim();
    if (!text) return NaN;
    text = text.replace(/[^0-9,.-]/g, "");
    if (!text) return NaN;
    const hasComma = text.indexOf(",") !== -1;
    const hasDot = text.indexOf(".") !== -1;
    if (hasComma && hasDot) {
      if (text.lastIndexOf(",") > text.lastIndexOf(".")) text = text.replace(/\./g, "").replace(",", ".");
      else text = text.replace(/,/g, "");
    } else if (hasComma) {
      text = text.replace(",", ".");
    }
    const n = Number(text);
    return Number.isFinite(n) ? n : NaN;
  }


  function getSelectedOptionText(select) {
    if (!select || !select.options || select.selectedIndex < 0) return "";
    const option = select.options[select.selectedIndex];
    return String(option && option.value ? option.textContent || option.innerText || "" : "").trim();
  }

  function validateIndividualPriceForm(data) {
    data = data || {};
    if (!String(data.idProveedor || "").trim()) return { ok: false, field: "idProveedor", message: "Selecciona el proveedor del precio." };
    if (!String(data.idNegocio || "").trim()) return { ok: false, field: "idNegocio", message: "Selecciona el negocio del precio." };
    if (!String(data.idMaterial || "").trim()) return { ok: false, field: "idMaterial", message: "Busca y selecciona un material activo." };
    const price = Number(data.precioBase);
    if (!Number.isFinite(price) || price < 0) return { ok: false, field: "precioBase", message: "Ingresa un precio base válido mayor o igual a cero." };
    if (!String(data.fechaInicio || "").trim()) return { ok: false, field: "fechaInicio", message: "Selecciona la fecha de inicio." };
    if (!String(data.fechaFin || "").trim()) return { ok: false, field: "fechaFin", message: "Selecciona la fecha de fin." };
    if (String(data.fechaFin) < String(data.fechaInicio)) return { ok: false, field: "fechaFin", message: "La fecha fin no puede ser menor que la fecha inicio." };
    if (String(data.idGrupo || "").trim() && !String(data.idOficina || "").trim()) return { ok: false, field: "idOficina", message: "Para usar grupo debes seleccionar una oficina de ventas." };
    if (data.fee !== undefined && String(data.fee || "").trim() !== "") {
      var feeNumber = Number(data.fee);
      if (!Number.isFinite(feeNumber) || feeNumber < 0 || feeNumber > 100) return { ok: false, field: "fee", message: "El fee debe ser un porcentaje entre 0 y 100." };
    }
    return { ok: true };
  }

  function setMpMonthlyVigenciaDefaults_(form) {
    if (!form) return;
    var now = new Date();
    var first = now.toISOString().slice(0, 8) + "01";
    var last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    if (form.fechaInicio && !String(form.fechaInicio.value || "").trim()) form.fechaInicio.value = first;
    if (form.fechaFin && !String(form.fechaFin.value || "").trim()) form.fechaFin.value = last;
  }

  function showMpPriceInlineAlert(message) {
    const box = document.getElementById("mpPriceInlineAlert");
    if (!box) return;
    const text = String(message || "").trim();
    box.hidden = !text;
    box.innerHTML = text ? '<span class="material-symbols-rounded">error</span><span>' + escapeHtml(text) + '</span>' : "";
  }

  function focusIndividualPriceField(name) {
    if (!name) return;
    const form = document.getElementById("mpIndividualPriceForm");
    const field = form ? form.querySelector('[name="' + name + '"]') : null;
    if (field && typeof field.focus === "function") field.focus();
  }


  function getMpMaterialSearchCacheKey(query) {
    const user = APP_STATE.context && APP_STATE.context.usuario ? APP_STATE.context.usuario : {};
    const revision = APP_STATE.dataRevision || "0";
    return "SGT360_MP_MATERIAL_SEARCH_V1_" + String(user.idUsuario || user.correo || "GENERAL") + "_" + revision + "_" + normalizeMpText(query || "").slice(0, 60);
  }

  function readMpMaterialSearchCache(query) {
    try {
      const raw = sessionStorage.getItem(getMpMaterialSearchCacheKey(query)) || localStorage.getItem(getMpMaterialSearchCacheKey(query));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.result) return null;
      if (Date.now() - parsed.timestamp > MP_TABLE_CACHE_TTL_MS) return null;
      return parsed.result;
    } catch (error) { return null; }
  }

  function writeMpMaterialSearchCache(query, result) {
    try {
      const payload = JSON.stringify({ timestamp: Date.now(), result: result || {} });
      sessionStorage.setItem(getMpMaterialSearchCacheKey(query), payload);
      localStorage.setItem(getMpMaterialSearchCacheKey(query), payload);
    } catch (error) {}
  }

  function loadMaterialOptionsForPrice(texto) {
    const select = document.getElementById("mpPriceMaterialSelect");
    if (!select) return;
    const query = String(texto || "").trim();
    if (query.length < 2) {
      select.innerHTML = '<option value="">Escribe al menos 2 caracteres</option>';
      return;
    }
    const cached = readMpMaterialSearchCache(query);
    if (cached) {
      const cachedRows = (cached && cached.registros) || [];
      select.innerHTML = '<option value="">Seleccionar</option>' + cachedRows.map(function(item) {
        return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.nombre || item.codigo || item.id) + '</option>';
      }).join("");
    } else {
      select.innerHTML = '<option value="">Cargando materiales...</option>';
    }
    const requestId = Date.now() + "_" + Math.random();
    MP_STATE.materialSelectRequestId = requestId;
    secureRpc("listarMaterialesSelectPreciosModulo", [{ texto: query, limite: 80 }], "MATERIALES_PRECIOS")
      .then(function(result) {
        if (MP_STATE.materialSelectRequestId !== requestId) return;
        writeMpMaterialSearchCache(query, result || {});
        const rows = (result && result.registros) || [];
        select.innerHTML = '<option value="">Seleccionar</option>' + rows.map(function(item) {
          return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.nombre || item.codigo || item.id) + '</option>';
        }).join("");
      })
      .catch(function(error) {
        if (MP_STATE.materialSelectRequestId !== requestId) return;
        select.innerHTML = '<option value="">No se pudieron cargar materiales</option>';
        toast("No se pudieron cargar materiales", errorMessage(error), true);
      });
  }

  function bindOfficeGroupDependency(officeSelectId, groupSelectId) {
    const office = document.getElementById(officeSelectId);
    const group = document.getElementById(groupSelectId);
    const groups = (MP_STATE.options && MP_STATE.options.grupos) || [];
    if (!office || !group) return;
    function refresh() {
      const idOficina = String(office.value || "").trim();
      const filtered = idOficina ? groups.filter(function(item) { return String(item.idOficina || "").trim() === idOficina; }) : [];
      group.innerHTML = '<option value="">' + (idOficina ? 'Opcional' : 'Selecciona oficina primero') + '</option>' + filtered.map(function(item) {
        return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.nombre || item.codigo || item.id) + '</option>';
      }).join("");
      group.disabled = !idOficina;
    }
    office.addEventListener("change", refresh);
    refresh();
  }


  function openBulkPriceModal(canal) {
    canal = String(canal || "").toUpperCase();
    mpPendingBulkCanal_ = (canal === "IA" || canal === "ALO") ? canal : "";
    openMpModal(
      "Carga masiva de precios",
      "Carga precios por material, proveedor y alcance utilizando la plantilla XLSX oficial.",
      '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>',
      true
    );

    ensureMpOptionsForModal(renderBulkPriceModalBody);
  }

  function renderBulkPriceModalBody(opts) {
    opts = opts || getMpEmptyOptions();

    const body = document.getElementById("mpModalBody");

    if (!body) return;

    body.innerHTML =
      '<form id="mpBulkPriceForm" class="mp-modern-form">' +
        mpBulkCanalFieldHtml_("mpBulkPriceCanal", mpPendingBulkCanal_ || "IA") +
        '<section class="mp-upload-hero">' +
          '<div>' +
            '<h4>Carga masiva de precios</h4>' +
            '<p>Descarga la plantilla XLSX oficial (Plantilla_Carga_Precios_GSD.xlsx), completa CARGA_PRECIOS y utiliza DICCIONARIOS como referencia de códigos válidos.</p>' +
          '</div>' +
          '<div class="mp-upload-badges">' +
            '<span class="mp-badge"><span class="material-symbols-rounded">speed</span>Precio directo</span>' +
            '<span class="mp-badge"><span class="material-symbols-rounded">table_rows</span>XLSX</span>' +
          '</div>' +
        '</section>' +

        '<div class="mp-upload-layout">' +

          '<div class="mp-modal-section">' +
            '<h4>Valores predeterminados</h4>' +
            '<p>Proveedor y negocio pueden venir por fila. Si quedan vacíos en el XLSX, se utilizarán los valores seleccionados aquí.</p>' +

            '<div class="mp-form-grid">' +
              mpSelect(
                "idProveedor",
                "Proveedor predeterminado",
                opts.proveedores,
                true
              ) +
              mpSelect(
                "idNegocio",
                "Negocio predeterminado",
                opts.negocios,
                true
              ) +

              '<label class="mp-file-field mp-form-span-2">' +
                'Archivo XLSX' +
                '<input id="mpBulkPriceFile" type="file" ' +
                  'accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<div class="mp-upload-sidebar">' +
            '<div class="mp-help-card">' +
              '<strong>Cómo usar la plantilla</strong>' +
              '<ul>' +
                '<li>Descarga la plantilla XLSX oficial: Plantilla_Carga_Precios_GSD.xlsx (hojas CARGA_PRECIOS y DICCIONARIOS).</li>' +
                '<li>Completa la hoja CARGA_PRECIOS y usa DICCIONARIOS como referencia; escribe nombres, no IDs técnicos.</li>' +
                '<li>Borra la fila EJEMPLO antes de validar.</li>' +
                '<li>Identifica el material por CODIGO_HANA (equivale al código SAP) o CODIGO_MATERIAL.</li>' +
                '<li>Se acepta el Excel GSD de una sola hoja (PROVEEDOR, MARCA, TIPO, SUBTIPO, INCLUYE CONEXIÓN, CODIGO HANA, PRODUCTO_PRINCIPAL, COMBO, COMENTARIOS, FEE, PRECIO). N°, cuotas por plazo y columnas * original se ignoran.</li>' +
                '<li>Todo precio debe terminar asociado a un proveedor y a un negocio.</li>' +
                '<li>FEE es el % que se lleva Cálidda y está oculto para el rol proveedor.</li>' +
                '<li>Vigencia mensual: FECHA_INICIO día 1 y FECHA_FIN último día del mes de carga.</li>' +
                '<li>CODIGO_OFICINA y CODIGO_GRUPO son opcionales.</li>' +
                '<li>Sin oficina ni grupo = General.</li>' +
                '<li>Con oficina y sin grupo = Oficina.</li>' +
                '<li>Con oficina y grupo = Grupo; el grupo debe pertenecer a esa oficina.</li>' +
                '<li>La misma combinación material + proveedor + negocio + alcance no puede tener vigencias superpuestas.</li>' +
                '<li>Si existe exactamente la misma vigencia, el precio registrado se actualiza.</li>' +
                '<li>La primera acción solo valida; nada se graba hasta confirmar.</li>' +
                '<li>La opción principal es siempre la plantilla XLSX (Descargar plantilla XLSX: Plantilla_Carga_Precios_GSD.xlsx). El CSV del servidor queda solo como respaldo si el XLSX local no está disponible.</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +

        '</div>' +

        '<div id="mpBulkPriceResult" class="mp-material-bulk-result"></div>' +

        '<div class="mp-upload-actions">' +
          '<a id="mpPriceTemplateButton" class="button button--ghost" href="#" ' +
            'target="_blank" rel="noopener" aria-disabled="true">' +
            '<span class="material-symbols-rounded">progress_activity</span>Preparando plantilla…' +
          '</a>' +

          '<button id="mpBulkPriceSubmit" class="button button--primary has-tooltip" type="submit" data-tooltip="Prevalidar precios" aria-label="Prevalidar precios" title="Prevalidar precios">' +
            '<span class="material-symbols-rounded">fact_check</span>' +
          '</button>' +
        '</div>' +

      '</form>';

    const form = document.getElementById("mpBulkPriceForm");
    const templateLink = document.getElementById("mpPriceTemplateButton");

    if (templateLink) {
      templateLink.addEventListener("click", function(event) {
        if (templateLink.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          prepararPlantillaPreciosEnSegundoPlano_({ forzarMensaje: true });
        }
      });
    }

    prepararPlantillaPreciosEnSegundoPlano_().catch(function() {});

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      submitBulkPriceForm(form);
    });
  }

  function submitBulkPriceForm(form) {
    const fileInput = document.getElementById("mpBulkPriceFile");
    const file =
      fileInput && fileInput.files ?
        fileInput.files[0] :
        null;

    if (!file) {
      toast(
        "Archivo requerido",
        "Selecciona un archivo XLSX de precios.",
        true
      );
      return;
    }

    if (!/\.xlsx$/i.test(file.name || "")) {
      toast(
        "Formato no válido",
        "La carga masiva de precios requiere un archivo .xlsx.",
        true
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast(
        "Archivo muy grande",
        "El archivo no puede superar 5 MB.",
        true
      );
      return;
    }

    const resultBox =
      document.getElementById("mpBulkPriceResult");

    const submit =
      document.getElementById("mpBulkPriceSubmit");

    if (submit) {
      submit.disabled = true;
      submit.dataset.originalHtml = submit.innerHTML;
      submit.innerHTML =
        '<span class="material-symbols-rounded">progress_activity</span>';
    }

    resultBox.innerHTML =
      '<div class="mp-inline-loader">' +
        '<span class="material-symbols-rounded">fact_check</span>' +
        'Validando archivo. Todavía no se grabará ningún precio...' +
      '</div>';

    const localPriceReader = new FileReader();

    // AGENTE 2: primero se intenta el parseo local del Excel GSD (una sola hoja).
    // Si no es GSD o falta SheetJS, se usa la ruta de servidor existente.
    localPriceReader.onload = function() {
      let parsed = null;
      try {
        parsed = mpGsdParseFileBuffer_(localPriceReader.result);
      } catch (parseError) {
        parsed = null;
      }
      if (parsed && parsed.filas && parsed.filas.length) {
        prevalidarPreciosGsdLocal_(form, parsed, resultBox, submit);
        return;
      }
      if (parsed) {
        resultBox.innerHTML =
          mpError(
            new Error("El Excel no trae filas de datos (revisa CODIGO HANA y elimina la fila EJEMPLO).")
          );

        restaurarBotonPrevalidarPreciosPaso28O_(submit);
        return;
      }
      submitBulkPriceFormServidor_(form, file, resultBox, submit);
    };

    localPriceReader.onerror = function() {
      submitBulkPriceFormServidor_(form, file, resultBox, submit);
    };

    try {
      localPriceReader.readAsArrayBuffer(file);
    } catch (readError) {
      submitBulkPriceFormServidor_(form, file, resultBox, submit);
    }
  }

  // Ruta de servidor existente (respaldo cuando el archivo no es GSD).
  function submitBulkPriceFormServidor_(form, file, resultBox, submit) {
    const reader = new FileReader();

    reader.onload = function() {
      const dataUrl = String(reader.result || "");
      const coma = dataUrl.indexOf(",");
      const archivoBase64 =
        coma >= 0 ?
          dataUrl.slice(coma + 1) :
          "";

      if (!archivoBase64) {
        resultBox.innerHTML =
          mpError(
            new Error("No se pudo leer el archivo XLSX.")
          );

        restaurarBotonPrevalidarPreciosPaso28O_(submit);
        return;
      }

      const data = formToObject(form);

      data.modo = "PREVALIDAR";
      data.nombreArchivo = file.name;
      data.mimeType =
        file.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      data.archivoBase64 = archivoBase64;

      secureRpc(
        "cargarPreciosIndividualesMasivoModulo",
        [data],
        "MATERIALES_PRECIOS"
      )
        .then(function(result) {
          renderBulkPricePreviewPaso28O_(
            resultBox,
            result
          );
        })
        .catch(function(error) {
          resultBox.innerHTML = mpError(error);

          toast(
            "No se pudo validar",
            errorMessage(error),
            true
          );
        })
        .finally(function() {
          restaurarBotonPrevalidarPreciosPaso28O_(submit);
        });
    };

    reader.onerror = function() {
      resultBox.innerHTML =
        mpError(
          new Error("No se pudo leer el archivo seleccionado.")
        );

      restaurarBotonPrevalidarPreciosPaso28O_(submit);
    };

    reader.readAsDataURL(file);
  }

  // AGENTE 2: prevalidación local GSD de precios. Cada fila válida genera su
  // material (por CODIGO_HANA) y su precio con FEE y vigencia
  // mensual (día 1 -> fin de mes). No graba nada; reutiliza el preview existente.
  function prevalidarPreciosGsdLocal_(form, parsed, resultBox, submit) {
    const defaults = formToObject(form);
    const opts = MP_STATE.options || getMpEmptyOptions();
    const idProveedorDefecto = String(defaults.idProveedor || "").trim();
    const idNegocio = String(defaults.idNegocio || "").trim();
    var idCanal = String(defaults.idCanal || mpBulkCanalValue_("mpBulkPriceCanal") || "IA").toUpperCase();
    if (idCanal !== "IA" && idCanal !== "ALO") idCanal = "IA";
    const vigencia = mpGsdMonthRange_();

    const materialesP = secureRpc("listarMaterialesPrecioModulo", [{}], "MATERIALES_PRECIOS").catch(function() { return { registros: [] }; });
    const preciosP = secureRpc("listarListasOficialesPreciosModulo", [{}], "MATERIALES_PRECIOS").catch(function() { return { registros: [] }; });

    Promise.all([materialesP, preciosP])
      .then(function(respuestas) {
        const existentes = {};
        ((respuestas[0] && respuestas[0].registros) || []).forEach(function(m) {
          [m.codigoSap, m.codigoMaterial].forEach(function(code) {
            const key = mpGsdNorm_(code);
            if (key && !existentes[key]) existentes[key] = m;
          });
        });
        const preciosVigentes = {};
        ((respuestas[1] && respuestas[1].registros) || []).forEach(function(p) {
          if (String(p.fechaInicio || "").slice(0, 10) !== vigencia.inicio) return;
          if (String(p.fechaFin || "").slice(0, 10) !== vigencia.fin) return;
          if (p.idOficina || p.idGrupo) return;
          const key = [mpGsdNorm_(p.idMaterial), mpGsdNorm_(p.idProveedor), mpGsdNorm_(p.idNegocio)].join("|");
          if (!preciosVigentes[key]) preciosVigentes[key] = p;
        });

        const vistos = {};
        const vistosVigencia = {};
        const pendientes = [];
        const detalle = [];
        let creados = 0;
        let actualizados = 0;
        let errores = 0;

        (parsed.filas || []).forEach(function(g) {
          const val = mpGsdValidarFila_(g, opts, { exigePrecio: true, exigeProveedor: true, idProveedorDefecto: idProveedorDefecto });
          const dupKey = mpGsdNorm_(g.codigoHana);
          const existente = existentes[dupKey] || vistos[dupKey] || null;
          const material = mpGsdMaterialPayload_(g, val, existente);
          vistos[dupKey] = { idMaterial: material.idMaterial, codigoMaterial: material.codigoMaterial, codigoSap: g.codigoHana };
          const proveedorId = (val.proveedor && (val.proveedor.id || val.proveedor.idProveedor)) || idProveedorDefecto;
          const motivos = val.errores.slice();
          if (!idNegocio) motivos.push("Falta el negocio predeterminado.");
          if (!proveedorId) motivos.push("Falta el proveedor (por fila o predeterminado).");

          if (motivos.length) {
            errores += 1;
            detalle.push({ fila: g.fila, codigoMaterial: material.codigoMaterial, accion: "OMITIR", estado: "ERROR", detalle: motivos.join(" ") });
            return;
          }

          const vigenteKey = [mpGsdNorm_(material.idMaterial), mpGsdNorm_(proveedorId), mpGsdNorm_(idNegocio)].join("|");
          const previo = preciosVigentes[vigenteKey] || null;
          if (previo || vistosVigencia[vigenteKey]) actualizados += 1;
          else creados += 1;
          vistosVigencia[vigenteKey] = true;

          const precioPayload = {
            idMaterial: material.idMaterial,
            idProveedor: proveedorId,
            idNegocio: idNegocio,
            idCanal: idCanal,
            precioBase: val.precio,
            fee: val.fee,
            moneda: "PEN",
            fechaInicio: vigencia.inicio,
            fechaFin: vigencia.fin,
            tieneCombo: g.combo ? "SI" : "NO",
            detalleCombo: g.combo || "",
            idListaPrecio: (previo && previo.idListaPrecio) || undefined,
            idDetallePrecio: (previo && previo.idDetallePrecio) || undefined
          };
          pendientes.push({ fila: g.fila, gsd: g, material: material, precio: precioPayload });
          const feeTexto = val.fee == null ? "sin FEE" : ("FEE " + val.fee + "%");
          detalle.push({
            fila: g.fila,
            codigoMaterial: material.codigoMaterial,
            accion: previo ? "ACTUALIZAR" : "CREAR",
            estado: val.advertencias.length ? "ADVERTENCIA" : "OK",
            detalle: "S/ " + val.precio + " · " + mpGsdMaskFee_(feeTexto) +
              (val.advertencias.length ? " · " + val.advertencias.join(" ") : "")
          });
        });

        let tokenPreview = null;
        let puedeConfirmar = false;
        if (pendientes.length) {
          tokenPreview = mpGsdStorePending_("PRE", { items: pendientes, idCanal: idCanal });
          puedeConfirmar = true;
        }
        renderBulkPricePreviewPaso28O_(resultBox, {
          totalFilas: (parsed.filas || []).length,
          creados: creados,
          actualizados: actualizados,
          errores: errores,
          mensaje: "Prevalidación local GSD (" + parsed.hoja + ", vigencia " + vigencia.inicio + " → " + vigencia.fin + "). Nada se grabó: confirma para registrar.",
          detalleValidacion: detalle,
          puedeConfirmar: puedeConfirmar,
          tokenPreview: tokenPreview
        });
      })
      .catch(function(error) {
        resultBox.innerHTML = mpError(error);
        toast("No se pudo validar", errorMessage(error), true);
      })
      .finally(function() {
        restaurarBotonPrevalidarPreciosPaso28O_(submit);
      });
  }

  function restaurarBotonPrevalidarPreciosPaso28O_(submit) {
    if (!submit) return;

    submit.disabled = false;
    submit.innerHTML =
      submit.dataset.originalHtml ||
      '<span class="material-symbols-rounded">fact_check</span>';
  }

  function renderBulkPricePreviewPaso28O_(resultBox, result) {
    result = result || {};

    const detalle =
      Array.isArray(result.detalleValidacion) ?
        result.detalleValidacion :
        [];

    let html =
      '<div class="mp-upload-summary">' +
        '<div><small>Filas</small><strong>' +
          escapeHtml(result.totalFilas || 0) +
        '</strong></div>' +
        '<div><small>Nuevos</small><strong>' +
          escapeHtml(result.creados || 0) +
        '</strong></div>' +
        '<div><small>Actualizar</small><strong>' +
          escapeHtml(result.actualizados || 0) +
        '</strong></div>' +
        '<div><small>Errores</small><strong>' +
          escapeHtml(result.errores || 0) +
        '</strong></div>' +
      '</div>' +

      '<p class="mp-note">' +
        escapeHtml(
          result.mensaje ||
          "Prevalidación completada."
        ) +
      '</p>';

    if (Number(result.duracionMs) > 0) {
      html +=
        '<p class="mp-note"><small>Tiempo de validación: ' +
        escapeHtml(
          (Number(result.duracionMs) / 1000).toFixed(1)
        ) +
        ' s</small></p>';
    }

    if (detalle.length) {
      html +=
        '<div class="table-wrap">' +
          '<table class="data-table">' +
            '<thead><tr>' +
              '<th>Fila</th>' +
              '<th>Material</th>' +
              '<th>Acción</th>' +
              '<th>Estado</th>' +
              '<th>Detalle</th>' +
            '</tr></thead>' +
            '<tbody>' +
              detalle.map(function(item) {
                return (
                  '<tr>' +
                    '<td>' +
                      escapeHtml(item.fila || "") +
                    '</td>' +
                    '<td>' +
                      escapeHtml(item.codigoMaterial || "") +
                    '</td>' +
                    '<td>' +
                      escapeHtml(item.accion || "") +
                    '</td>' +
                    '<td>' +
                      escapeHtml(item.estado || "") +
                    '</td>' +
                    '<td>' +
                      escapeHtml(item.detalle || "") +
                    '</td>' +
                  '</tr>'
                );
              }).join("") +
            '</tbody>' +
          '</table>' +
        '</div>';
    }

    html += '<div class="mp-actions">';

    if (
      result.puedeConfirmar &&
      result.tokenPreview
    ) {
      html +=
        '<button id="mpConfirmBulkPricePaso28O" ' +
          'class="button button--primary" type="button">' +
          '<span class="material-symbols-rounded">check_circle</span>' +
          'Confirmar carga de precios' +
        '</button>';
    }

    html += '</div>';

    resultBox.innerHTML = html;

    if (
      result.puedeConfirmar &&
      result.tokenPreview
    ) {
      on(
        "mpConfirmBulkPricePaso28O",
        "click",
        function() {
          confirmarBulkPriceLoadPaso28O_(
            resultBox,
            result.tokenPreview
          );
        }
      );
    } else if (result.errores) {
      toast(
        "Prevalidación con errores",
        "No se grabó ningún precio. Corrige el archivo y vuelve a validar.",
        true
      );
    }
  }

  function confirmarBulkPriceLoadPaso28O_(
    resultBox,
    tokenPreview
  ) {
    // AGENTE 2: token local GSD -> confirmación fila por fila en el frontend.
    const localPending = mpGsdTakePending_(tokenPreview);
    if (localPending) {
      confirmarPreciosGsdLocal_(resultBox, tokenPreview, localPending);
      return;
    }
    const button =
      document.getElementById(
        "mpConfirmBulkPricePaso28O"
      );

    if (button) {
      button.disabled = true;
      button.innerHTML =
        '<span class="material-symbols-rounded">progress_activity</span>' +
        'Grabando precios…';
    }

    resultBox.insertAdjacentHTML(
      "afterbegin",
      '<div id="mpBulkPriceConfirmLoader" class="mp-inline-loader">' +
        '<span class="material-symbols-rounded">hourglass_empty</span>' +
        'Confirmando la carga validada...' +
      '</div>'
    );

    secureRpc(
      "cargarPreciosIndividualesMasivoModulo",
      [{
        modo: "CONFIRMAR",
        tokenPreview: tokenPreview,
        idCanal: mpBulkCanalValue_("mpBulkPriceCanal")
      }],
      "MATERIALES_PRECIOS"
    )
      .then(function(result) {
        clearMpTableCache("prices");
        clearMpSummaryCache();

        resultBox.innerHTML =
          '<div class="mp-upload-summary">' +
            '<div><small>Filas</small><strong>' +
              escapeHtml(result.totalFilas || 0) +
            '</strong></div>' +
            '<div><small>Creados</small><strong>' +
              escapeHtml(result.creados || 0) +
            '</strong></div>' +
            '<div><small>Actualizados</small><strong>' +
              escapeHtml(result.actualizados || 0) +
            '</strong></div>' +
            '<div><small>Errores</small><strong>0</strong></div>' +
          '</div>' +
          '<p class="mp-note">' +
            escapeHtml(
              result.mensaje ||
              "Carga confirmada."
            ) +
          '</p>' +
          '<div class="mp-actions">' +
            '<button id="mpCloseBulkPricePaso28O" ' +
              'class="button button--primary" type="button">' +
              'Cerrar' +
            '</button>' +
          '</div>';

        on(
          "mpCloseBulkPricePaso28O",
          "click",
          function() {
            closeMpModal();
            renderMaterialsPricesPrices(true);
          }
        );

        toast(
          "Carga de precios confirmada",
          result.mensaje ||
          "Los precios fueron grabados."
        );
      })
      .catch(function(error) {
        const loader =
          document.getElementById(
            "mpBulkPriceConfirmLoader"
          );

        if (loader) loader.remove();

        if (button) {
          button.disabled = false;
          button.innerHTML =
            '<span class="material-symbols-rounded">check_circle</span>' +
            'Confirmar carga de precios';
        }

        toast(
          "No se pudo confirmar",
          errorMessage(error),
          true
        );
      });
  }

  // Confirmación local GSD de precios en LISTA ÚNICA POR CANAL (2026-09-22).
  // Los precios bulk con canal (IA/ALO) se consolidan en la lista del canal
  // ("Lista de precios IA" / "Lista de precios Aló Cálidda", por id_canal,
  // tolerante a canal NULL legacy por nombre canónico); si no existe se crea
  // (nombre canónico, id_canal seteado, es_catalogo FALSE + contexto mínimo
  // exigido por el backend: proveedor/negocio/vigencia de la primera fila).
  // Upsert de detalles EN ESA lista (match por id_material dentro de la lista
  // vía guardarDetalleListaPrecioModulo: actualiza precio/fee o inserta).
  // Cada detalle lleva el idProveedor de la fila. Si una fila trae
  // NOMBRE_LISTA explícito distinto al canónico, se respeta en una lista
  // nombrada aparte. Sin copia al catálogo: cada precio se graba UNA sola vez
  // (en su lista). Se mantienen validaciones previas y progress.
  function confirmarPreciosGsdLocal_(resultBox, tokenPreview, localPending) {
    const items = ((localPending && localPending.pendientes && localPending.pendientes.items) || []);
    var idCanalPrecios = String((localPending && localPending.pendientes && localPending.pendientes.idCanal) || mpBulkCanalValue_("mpBulkPriceCanal") || "IA").toUpperCase();
    if (idCanalPrecios !== "IA" && idCanalPrecios !== "ALO") idCanalPrecios = "IA";
    var doneBulkPre = 0;
    var stepBulkPre = function() {
      doneBulkPre += 1;
      mpBulkProgressUpdate_(resultBox, doneBulkPre, items.length, "Grabando precios...");
    };
    mpBulkProgressUpdate_(resultBox, 0, items.length, "Grabando precios...");

    const button = document.getElementById("mpConfirmBulkPricePaso28O");
    if (button) button.disabled = true;

    let creados = 0;
    let actualizados = 0;
    let errores = 0;
    const detalle = [];
    // Caché nombre normalizado -> idListaPrecio de la lista destino (o promesa en vuelo).
    var listaCanalCache_ = {};

    var mpCanalListaNorm_ = function(v) {
      var t = String(v || "").trim().toUpperCase();
      if (t === "IA" || t === "CANAL-IA") return "CANAL-IA";
      if (t === "ALO" || t === "CANAL-ALO") return "CANAL-ALO";
      return t;
    };
    var mpCanalNombreCanonico_ = function(canal) {
      return String(canal || "").toUpperCase() === "ALO" ? "Lista de precios Aló Cálidda" : "Lista de precios IA";
    };
    // NOMBRE_LISTA explícito de la fila (si el formato lo trae); vacío = consolida por canal.
    var mpPrecioNombreListaFila_ = function(item) {
      var g = (item && item.gsd) || {};
      var p = (item && item.precio) || {};
      return String(g.nombreLista || g.nombre_lista || p.nombreLista || p.nombre_lista || p.NOMBRE_LISTA || "").trim();
    };

    // Resuelve la lista destino por id_canal (tolerante a canal NULL legacy
    // por nombre canónico/nombrado, nunca catálogos); si no existe la crea
    // vía guardarListaOficialPrecioModulo (nombre, idCanal, es_catalogo FALSE
    // + proveedor/negocio/vigencia de la primera fila que exige el backend).
    var resolverListaCanalPrecio_ = function(nombreObjetivo, canalClave, contexto) {
      var claveCache = mpGsdNorm_(nombreObjetivo) + "|" + String(canalClave || "");
      if (listaCanalCache_[claveCache]) return Promise.resolve(listaCanalCache_[claveCache]);
      if (listaCanalCache_[claveCache + "__p"]) return listaCanalCache_[claveCache + "__p"];
      var promesa = secureRpc("listarListasOficialesPreciosModulo", [{}], "MATERIALES_PRECIOS")
        .then(function(resp) {
          var filas = (resp && resp.registros) || [];
          var canalNorm = mpCanalListaNorm_(canalClave);
          var esCanonico = mpGsdNorm_(nombreObjetivo) === mpGsdNorm_(mpCanalNombreCanonico_(canalClave));
          var hallada = null;
          var porNombre = null;
          filas.forEach(function(r) {
            if (r.es_catalogo === true || r.esCatalogo === true) return;
            var rc = mpCanalListaNorm_(r.idCanal || r.id_canal || r.canal || "");
            var nm = String(r.nombre || r.nombreLista || r.codigoLista || "");
            if (canalNorm && rc === canalNorm && (esCanonico || mpGsdNorm_(nm) === mpGsdNorm_(nombreObjetivo))) {
              if (!hallada) hallada = r;
              return;
            }
            if (!rc && mpGsdNorm_(nm) === mpGsdNorm_(nombreObjetivo)) {
              if (!porNombre) porNombre = r;
            }
          });
          var elegida = hallada || porNombre;
          if (elegida && elegida.idListaPrecio) {
            listaCanalCache_[claveCache] = elegida.idListaPrecio;
            return elegida.idListaPrecio;
          }
          var primerPrecio = (contexto && contexto.precio) || {};
          return secureRpc("guardarListaOficialPrecioModulo", [{
            nombre: nombreObjetivo,
            idCanal: canalClave,
            es_catalogo: false,
            esCatalogo: false,
            idProveedor: primerPrecio.idProveedor || "",
            idNegocio: primerPrecio.idNegocio || "",
            fechaInicio: primerPrecio.fechaInicio || "",
            fechaFin: primerPrecio.fechaFin || "",
            moneda: primerPrecio.moneda || "PEN",
            origen: "CARGA_MASIVA_CANAL",
            estado: "ACTIVA"
          }], "MATERIALES_PRECIOS")
            .then(function(creada) {
              var idLista = creada && (creada.idListaPrecio || creada.idLista);
              if (idLista) listaCanalCache_[claveCache] = idLista;
              return idLista || null;
            });
        })
        .catch(function(err) {
          if (listaCanalCache_[claveCache + "__p"]) delete listaCanalCache_[claveCache + "__p"];
          throw err;
        });
      listaCanalCache_[claveCache + "__p"] = promesa;
      promesa.then(function(id) {
        if (listaCanalCache_[claveCache + "__p"]) delete listaCanalCache_[claveCache + "__p"];
        if (id) listaCanalCache_[claveCache] = id;
      }, function() {
        if (listaCanalCache_[claveCache + "__p"]) delete listaCanalCache_[claveCache + "__p"];
      });
      return promesa;
    };

    // Partición por destino: por defecto todos a la lista del canal; las filas
    // con NOMBRE_LISTA explícito distinto van a su lista nombrada.
    var canonicoCanal = mpCanalNombreCanonico_(idCanalPrecios);
    var destinos = {};
    var ordenDestinos = [];
    items.forEach(function(item) {
      var expl = mpPrecioNombreListaFila_(item);
      var nombreDestino = (!expl || mpGsdNorm_(expl) === mpGsdNorm_(canonicoCanal)) ? canonicoCanal : expl;
      var clave = mpGsdNorm_(nombreDestino) || "CANAL";
      if (!destinos[clave]) {
        destinos[clave] = { nombre: nombreDestino, items: [], contexto: item };
        ordenDestinos.push(clave);
      }
      destinos[clave].items.push(item);
      item._claveDestino = clave;
    });

    let chain = Promise.resolve();
    var listasResueltas = {};
    // 1) Resuelve (o crea) cada lista destino una sola vez.
    ordenDestinos.forEach(function(clave) {
      chain = chain.then(function() {
        var d = destinos[clave];
        return resolverListaCanalPrecio_(d.nombre, idCanalPrecios, d.contexto)
          .then(function(idLista) {
            if (!idLista) throw new Error("No se pudo resolver la lista.");
            listasResueltas[clave] = idLista;
          })
          .catch(function(error) {
            (d.items || []).forEach(function(item) {
              errores += 1;
              detalle.push({ fila: item.fila, codigoMaterial: item.material.codigoMaterial, accion: "OMITIR", estado: "ERROR", detalle: "Lista no resuelta (" + d.nombre + "): " + errorMessage(error) });
              stepBulkPre();
              item._omitir = true;
            });
          });
      });
    });

    // 2) Por cada fila validada: graba el material y hace upsert del detalle
    // EN SU LISTA (match por id_material dentro de la lista: actualiza
    // precio/fee o inserta). Cada precio se guarda UNA sola vez.
    items.forEach(function(item) {
      chain = chain.then(function() {
        if (item._omitir) return null;
        var idLista = listasResueltas[item._claveDestino];
        if (!idLista) {
          errores += 1;
          detalle.push({ fila: item.fila, codigoMaterial: item.material.codigoMaterial, accion: "OMITIR", estado: "ERROR", detalle: "Sin lista destino resuelta." });
          stepBulkPre();
          return null;
        }
        return secureRpc("guardarMaterialPrecioModulo", [item.material], "MATERIALES_PRECIOS")
          .then(function(res) {
            var idMat = (res && res.idMaterial) || item.material.idMaterial;
            var idProvFila = String((item.precio && item.precio.idProveedor) || "");
            if (!idMat) throw new Error("No se pudo resolver el material.");
            return secureRpc("guardarDetalleListaPrecioModulo", [{
              idListaPrecio: idLista,
              idMaterial: idMat,
              precioBase: item.precio.precioBase,
              fee: (item.precio.fee === undefined ? "" : item.precio.fee),
              moneda: item.precio.moneda || "PEN",
              estado: "ACTIVO",
              idProveedor: idProvFila
            }], "MATERIALES_PRECIOS")
              .then(function(resDet) {
                if (resDet && resDet.creado === false) actualizados += 1;
                else creados += 1;
                detalle.push({ fila: item.fila, codigoMaterial: item.material.codigoMaterial, accion: "GRABADO", estado: "OK", detalle: "OK · lista " + idLista });
                stepBulkPre();
              });
          })
          .catch(function(error) {
            errores += 1;
            detalle.push({ fila: item.fila, codigoMaterial: item.material.codigoMaterial, accion: "OMITIR", estado: "ERROR", detalle: errorMessage(error) });
            stepBulkPre();
          });
      });
    });

    chain.then(function() {
      mpGsdDropPending_(tokenPreview);
      clearMpTableCache("prices");
      clearMpTableCache("materials");
      clearMpSummaryCache();
      renderBulkPricePreviewPaso28O_(resultBox, {
        totalFilas: items.length,
        creados: creados,
        actualizados: actualizados,
        errores: errores,
        mensaje: "Carga GSD confirmada en lista única por canal (" + canonicoCanal + "). Solo se grabaron las filas validadas.",
        detalleValidacion: detalle,
        puedeConfirmar: false,
        tokenPreview: null
      });
      toast("Carga de precios confirmada", "Creados: " + creados + " · Actualizados: " + actualizados + " · Errores: " + errores);
    });
  }

  function obtenerPlantillaPreciosDesdeServidor_() {
    if (
      MP_STATE.priceTemplateCache &&
      MP_STATE.priceTemplateCache.resultado
    ) {
      return Promise.resolve(
        MP_STATE.priceTemplateCache.resultado
      );
    }

    if (
      MP_STATE.priceTemplatePromise &&
      MP_STATE.priceTemplatePromise.promesa
    ) {
      return MP_STATE.priceTemplatePromise.promesa;
    }

    const promesa = secureRpc(
      "obtenerPlantillaPreciosIndividualesModulo",
      [],
      "MATERIALES_PRECIOS"
    )
      .then(function(result) {
        MP_STATE.priceTemplateCache = {
          resultado: result,
          cargadoEn: Date.now()
        };

        return result;
      })
      .finally(function() {
        MP_STATE.priceTemplatePromise = null;
      });

    MP_STATE.priceTemplatePromise = {
      promesa: promesa
    };

    return promesa;
  }

  function liberarDescargaPlantillaPrecios_() {
    const descarga = MP_STATE.priceTemplateDownload;

    if (descarga && descarga.url) {
      try {
        URL.revokeObjectURL(descarga.url);
      } catch (error) {}
    }

    MP_STATE.priceTemplateDownload = null;
  }

  function actualizarEstadoDescargaPlantillaPrecios_(estado, detalle) {
    const link =
      document.getElementById("mpPriceTemplateButton");

    if (!link) return;

    detalle = detalle || {};

    link.removeAttribute("download");
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.style.opacity = "0.68";
    link.style.cursor = "default";

    if (estado === "PREPARANDO") {
      link.innerHTML =
        '<span class="material-symbols-rounded">progress_activity</span>' +
        'Preparando plantilla…';

      return;
    }

    if (estado === "ERROR") {
      link.style.opacity = "1";
      link.style.cursor = "pointer";

      link.innerHTML =
        '<span class="material-symbols-rounded">refresh</span>' +
        'Reintentar plantilla XLSX';

      return;
    }

    if (estado === "LISTA") {
      link.href = String(detalle.url || "#");

      link.setAttribute(
        "download",
        String(
          detalle.nombreArchivo ||
          "Plantilla_Carga_Precios_GSD.xlsx"
        )
      );

      link.setAttribute("aria-disabled", "false");
      link.style.opacity = "1";
      link.style.cursor = "pointer";

      link.innerHTML =
        '<span class="material-symbols-rounded">download_done</span>' +
        'Descargar plantilla XLSX (Precios GSD)';

      return;
    }
  }

  function prepararDescargaNativaPlantillaPrecios_(result) {
    result = result || {};

    if (result.correcto === false) {
      throw new Error(
        result.mensaje ||
        "No fue posible preparar la plantilla de precios."
      );
    }

    const blob = result.contenido != null ? new Blob(
      [result.contenido],
      { type: result.mimeType || "text/csv;charset=utf-8" }
    ) : base64ToBlobMateriales_(
      result.contenidoBase64,
      result.mimeType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (!blob.size) {
      throw new Error(
        "La plantilla XLSX de precios generada está vacía."
      );
    }

    liberarDescargaPlantillaPrecios_();

    const descarga = {
      url: URL.createObjectURL(blob),
      nombreArchivo:
        result.nombreArchivo ||
        "Plantilla_Carga_Precios_GSD.xlsx",
      tamanoBytes: blob.size,
      preparadaEn: Date.now(),
      cacheHit: result.cacheHit === true
    };

    MP_STATE.priceTemplateDownload = descarga;

    actualizarEstadoDescargaPlantillaPrecios_(
      "LISTA",
      descarga
    );

    return descarga;
  }

  function prepararPlantillaPreciosEnSegundoPlano_(opciones) {
    const config = opciones || {};
    const requestId =
      ++MP_STATE.priceTemplateRequestSeq;

    liberarDescargaPlantillaPrecios_();

    // AGENTE 2: plantilla XLSX generada en el frontend con SheetJS
    // (CODIGO_HANA, PROVEEDOR, PRECIO, FEE + DICCIONARIOS).
    // Si SheetJS no está disponible, se usa el CSV del servidor como respaldo.
    const localPre = mpGsdPlantillaPreciosLocal_();
    if (localPre) {
      if (requestId !== MP_STATE.priceTemplateRequestSeq) return Promise.resolve(null);
      const descargaLocal = {
        url: localPre.url,
        nombreArchivo: localPre.nombreArchivo,
        tamanoBytes: localPre.tamanoBytes,
        preparadaEn: localPre.preparadaEn,
        cacheHit: false,
        local: true
      };
      MP_STATE.priceTemplateDownload = descargaLocal;
      actualizarEstadoDescargaPlantillaPrecios_("LISTA", descargaLocal);
      return Promise.resolve(descargaLocal);
    }

    actualizarEstadoDescargaPlantillaPrecios_("PREPARANDO");

    return obtenerPlantillaPreciosDesdeServidor_()
      .then(function(result) {
        if (
          requestId !==
          MP_STATE.priceTemplateRequestSeq
        ) {
          return null;
        }

        return prepararDescargaNativaPlantillaPrecios_(
          result
        );
      })
      .catch(function(error) {
        if (
          requestId ===
          MP_STATE.priceTemplateRequestSeq
        ) {
          actualizarEstadoDescargaPlantillaPrecios_(
            "ERROR"
          );

          if (config.forzarMensaje) {
            toast(
              "No se pudo preparar la plantilla",
              errorMessage(error),
              true
            );
          }
        }

        throw error;
      });
  }

  function downloadIndividualPricesTemplate() {
    const descarga =
      MP_STATE.priceTemplateDownload;

    if (descarga && descarga.url) {
      return descarga;
    }

    prepararPlantillaPreciosEnSegundoPlano_({
      forzarMensaje: true
    });

    return null;
  }


  function openBulkMaterialModal() {
    openMpModal("Carga masiva de materiales", "La carga registra materiales universales y no crea precios.", '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Cargando opciones...</div>', true);
    ensureMpOptionsForModal(renderBulkMaterialModalBody);
  }

  function renderBulkMaterialModalBody(opts) {
    opts = opts || getMpEmptyOptions();
    const body = document.getElementById("mpModalBody");
    if (!body) return;

    body.innerHTML = '<form id="mpBulkMaterialForm" class="mp-modern-form">' +
      '<section class="mp-upload-hero"><div><h4>Carga masiva de materiales</h4>' +
      '<p>Descarga la plantilla XLSX oficial (Plantilla_Carga_Materiales_GSD.xlsx) con diccionarios vigentes, completa la hoja CARGA_MATERIALES y valida antes de grabar.</p></div>' +
      '<div class="mp-upload-badges"><span class="mp-badge"><span class="material-symbols-rounded">inventory_2</span>Materiales</span>' +
      '<span class="mp-badge"><span class="material-symbols-rounded">fact_check</span>Prevalidación</span></div></section>' +
      '<div class="mp-upload-layout"><div class="mp-modal-section"><h4>Datos de carga</h4>' +
      '<p>El negocio se aplica a todos los materiales. Los proveedores se definirán posteriormente al cargar sus precios.</p>' +
      '<div class="mp-form-grid">' +
        mpSelect("idNegocio", "Negocio", opts.negocios) +
        '<label class="mp-file-field mp-form-span-2">Archivo XLSX' +
        '<input id="mpBulkMaterialFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required></label>' +
      '</div></div>' +
      '<div class="mp-upload-sidebar"><div class="mp-help-card"><strong>Cómo usar la plantilla</strong><ul>' +
        '<li>Primero selecciona el negocio y descarga la plantilla XLSX (Descargar plantilla XLSX: Plantilla_Carga_Materiales_GSD.xlsx).</li>' +
        '<li>Completa la hoja CARGA_MATERIALES con N°, PROVEEDOR, MARCA, TIPO, SUBTIPO, INCLUYE CONEXIÓN, CODIGO HANA, PRODUCTO PRINCIPAL, COMBO y COMENTARIOS.</li>' +
        '<li>La hoja DICCIONARIOS muestra únicamente rutas válidas para carga y el árbol completo como referencia.</li>' +
        '<li>No uses UUID/IDs técnicos: escribe los nombres tal como aparecen en DICCIONARIOS.</li>' +
        '<li>CODIGO HANA equivale al código SAP y es la clave de match; la fila EJEMPLO debe borrarse.</li>' +
        '<li>El Excel GSD aporta PROVEEDOR, MARCA, TIPO, SUBTIPO, INCLUYE CONEXIÓN, CODIGO HANA, PRODUCTO PRINCIPAL y COMBO.</li>' +
        '<li>Se acepta el Excel GSD de una sola hoja (lee por nombre de encabezado, sin importar mayúsculas/tildes). N°, cuotas por plazo y columnas * original se ignoran; PRECIO y FEE no se graban en este flujo.</li>' +
        '<li>La primera acción solo valida; nada se graba hasta confirmar.</li>' +
        '<li>El CSV del servidor queda solo como respaldo si el XLSX local no está disponible; la opción principal es siempre la plantilla XLSX.</li>' +
      '</ul></div></div></div>' +
      '<div id="mpBulkMaterialResult" class="mp-material-bulk-result"></div>' +
      '<div class="mp-upload-actions">' +
        '<a id="mpMaterialTemplateButton" class="button button--ghost" href="#" target="_blank" rel="noopener" aria-disabled="true">' +
          '<span class="material-symbols-rounded">download</span>Selecciona un negocio</a>' +
        '<button class="button button--primary" type="submit">' +
          '<span class="material-symbols-rounded">fact_check</span>Prevalidar materiales</button>' +
      '</div></form>';

    const form = document.getElementById("mpBulkMaterialForm");

    on("mpMaterialTemplateButton", "click", function(event) {
      const negocio = String(form.elements.idNegocio && form.elements.idNegocio.value || "").trim();
      const descarga = MP_STATE.materialTemplateDownload;

      if (!negocio) {
        event.preventDefault();
        toast(
          "Selecciona el negocio",
          "La plantilla se prepara con el árbol y diccionarios del negocio seleccionado.",
          true
        );
        return;
      }

      if (
        !descarga ||
        descarga.idNegocio !== negocio ||
        !descarga.url
      ) {
        event.preventDefault();
        prepararPlantillaMaterialesEnSegundoPlano_(negocio, { forzarMensaje: true });
        return;
      }

      // No se usa preventDefault cuando está lista: el navegador procesa el
      // <a download> directamente dentro del gesto real del usuario.
      setTimeout(function() {
        toast(
          "Plantilla descargada",
          "Se inició la descarga de " + (descarga.nombreArchivo || "la plantilla XLSX") + "."
        );
      }, 0);
    });

    const businessSelect = form.elements.idNegocio;
    if (businessSelect) {
      businessSelect.addEventListener("change", function() {
        prepararPlantillaMaterialesEnSegundoPlano_(businessSelect.value);
      });
      if (businessSelect.value) {
        prepararPlantillaMaterialesEnSegundoPlano_(businessSelect.value);
      } else {
        actualizarEstadoDescargaPlantillaMateriales_("SIN_NEGOCIO");
      }
    }

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      submitBulkMaterialForm(form);
    });
  }

  function mpAsegurarTaxonomiaBulk_(filas) {
    var vistos = {}, items = [];
    (filas || []).forEach(function(r) {
      r = r || {};
      var p = String(r.productoPrincipal || r.producto || "").trim();
      var t = String(r.tipo || "").trim();
      var s = String(r.subtipo || "").trim();
      if (!t && !s) return;
      var k = (p + "|" + t + "|" + s).toUpperCase();
      if (!vistos[k]) { vistos[k] = true; items.push({ producto: p, tipo: t, subtipo: s }); }
    });
    if (!items.length) return Promise.resolve(null);
    return secureRpc("asegurarTaxonomiaMaterialesModulo", [{ items: items }], "MATERIALES_PRECIOS").catch(function(error) {
      try { console.warn("[SGT360] Taxonomía auto:", error); } catch (_) {}
      return null;
    });
  }
  function submitBulkMaterialForm(form) {
    const input = document.getElementById("mpBulkMaterialFile");
    const file = input && input.files ? input.files[0] : null;

    if (!file) {
      toast("Archivo requerido", "Selecciona un archivo XLSX de materiales.", true);
      return;
    }

    if (!/\.xlsx$/i.test(file.name || "")) {
      toast("Formato no válido", "La carga de materiales requiere un archivo .xlsx.", true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Archivo muy grande", "El archivo no puede superar 5 MB.", true);
      return;
    }

    const data = formToObject(form);
    if (!data.idNegocio) {
      toast("Negocio requerido", "Selecciona el negocio antes de validar.", true);
      return;
    }

    const resultBox = document.getElementById("mpBulkMaterialResult");
    resultBox.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Prevalidando materiales...</div>';

    // AGENTE 2: primero se intenta el parseo local del Excel GSD (una sola hoja,
    // encabezado tolerante). Si no es GSD o falta SheetJS, se usa la ruta de servidor.
    const localReader = new FileReader();

    localReader.onload = function() {
      let parsed = null;
      try {
        parsed = mpGsdParseFileBuffer_(localReader.result);
      } catch (parseError) {
        parsed = null;
      }
      if (parsed && parsed.filas && parsed.filas.length) {
        resultBox.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Actualizando catálogo (tipos y subtipos)...</div>';
        mpAsegurarTaxonomiaBulk_(parsed.filas).then(function(asegurado) {
          if (asegurado && (((asegurado.tiposCreados || []).length) || ((asegurado.subtiposCreados || []).length))) {
            toast("Catálogo actualizado", "Tipos nuevos: " + (asegurado.tiposCreados || []).length + " · Subtipos nuevos: " + (asegurado.subtiposCreados || []).length + ".");
          }
          return loadMaterialsPricesOptions({ force: true, silent: true }).catch(function() {});
        }).then(function() {
          prevalidarMaterialesGsdLocal_(form, data, parsed, resultBox);
        });
        return;
      }
      if (parsed) {
        resultBox.innerHTML = mpError(new Error("El Excel no trae filas de datos (revisa CODIGO HANA y elimina la fila EJEMPLO)."));
        return;
      }
      submitBulkMaterialFormServidor_(form, file, data, resultBox);
    };

    localReader.onerror = function() {
      submitBulkMaterialFormServidor_(form, file, data, resultBox);
    };

    try {
      localReader.readAsArrayBuffer(file);
    } catch (readError) {
      submitBulkMaterialFormServidor_(form, file, data, resultBox);
    }
  }

  // Ruta de servidor existente (respaldo cuando el archivo no es GSD).
  function submitBulkMaterialFormServidor_(form, file, data, resultBox) {
    const reader = new FileReader();

    reader.onload = function() {
      const dataUrl = String(reader.result || "");
      const coma = dataUrl.indexOf(",");
      const archivoBase64 = coma >= 0 ? dataUrl.slice(coma + 1) : "";

      if (!archivoBase64) {
        resultBox.innerHTML = mpError(new Error("No se pudo leer el archivo XLSX."));
        return;
      }

      data.nombreArchivo = file.name;
      data.mimeType = file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      data.archivoBase64 = archivoBase64;

      secureRpc(
        "prevalidarMaterialesMasivoModulo",
        [data],
        "MATERIALES_PRECIOS"
      )
        .then(function(result) {
          renderBulkMaterialPreview(resultBox, result);
        })
        .catch(function(error) {
          resultBox.innerHTML = mpError(error);
          toast("No se pudo validar", errorMessage(error), true);
        });
    };

    reader.onerror = function() {
      resultBox.innerHTML = mpError(new Error("No se pudo leer el archivo seleccionado."));
    };

    reader.readAsDataURL(file);
  }

  // AGENTE 2: prevalidación local GSD. No graba nada; guarda el pendiente en
  // memoria y reutiliza renderBulkMaterialPreview (flujo validar -> confirmar).
  function prevalidarMaterialesGsdLocal_(form, data, parsed, resultBox) {
    const opts = MP_STATE.options || getMpEmptyOptions();
    const idNegocio = String(data.idNegocio || "").trim();

    secureRpc("listarMaterialesPrecioModulo", [{}], "MATERIALES_PRECIOS")
      .catch(function() { return { registros: [] }; })
      .then(function(result) {
        const existentes = {};
        ((result && result.registros) || []).forEach(function(m) {
          [m.codigoSap, m.codigoMaterial].forEach(function(code) {
            const key = mpGsdNorm_(code);
            if (key && !existentes[key]) existentes[key] = m;
          });
        });
        const vistos = {};
        const pendientes = [];
        const observaciones = [];
        let creados = 0;
        let actualizados = 0;
        let errores = 0;
        let advertencias = 0;

        (parsed.filas || []).forEach(function(g) {
          const val = mpGsdValidarFila_(g, opts, { exigePrecio: false });
          const dupKey = mpGsdNorm_(g.codigoHana);
          const existente = existentes[dupKey] || vistos[dupKey] || null;
          const payload = mpGsdMaterialPayload_(g, val, existente);
          vistos[dupKey] = { idMaterial: payload.idMaterial, codigoMaterial: payload.codigoMaterial, codigoSap: g.codigoHana };
          const ruta = [g.productoPrincipal, g.tipo, g.subtipo].filter(function(t) { return !!t; }).join(" → ");
          let estado = "OK";
          let accion = existente ? "ACTUALIZAR" : "CREAR";
          if (val.errores.length) {
            estado = "ERROR";
            errores += 1;
            accion = "OMITIR";
          } else {
            if (existente) actualizados += 1;
            else creados += 1;
            if (val.advertencias.length) {
              estado = "ADVERTENCIA";
              advertencias += 1;
            }
          }
          if (estado !== "ERROR") pendientes.push({ fila: g.fila, gsd: g, payload: payload });
          observaciones.push({
            fila: g.fila,
            codigoMaterial: payload.codigoMaterial,
            codigoSap: g.codigoHana,
            rutaTipificacion: ruta || "—",
            accion: accion,
            estado: estado,
            errores: val.errores.join(" ") || undefined,
            advertencias: val.advertencias.join(" ") || undefined
          });
        });

        let tokenPreview = null;
        let puedeConfirmar = false;
        if (pendientes.length) {
          tokenPreview = mpGsdStorePending_("MAT", { idNegocio: idNegocio, items: pendientes });
          puedeConfirmar = true;
        }
        renderBulkMaterialPreview(resultBox, {
          totalFilas: (parsed.filas || []).length,
          creados: creados,
          actualizados: actualizados,
          errores: errores,
          advertencias: advertencias,
          mensaje: "Prevalidación local GSD (" + parsed.hoja + "). Nada se grabó: confirma para registrar.",
          observaciones: observaciones,
          puedeConfirmar: puedeConfirmar,
          tokenPreview: tokenPreview
        });
        if (errores && !pendientes.length) {
          toast("Prevalidación con errores", "No se grabó ningún material. Corrige el archivo y vuelve a validar.", true);
        }
      })
      .catch(function(error) {
        resultBox.innerHTML = mpError(error);
        toast("No se pudo validar", errorMessage(error), true);
      });
  }

  function obtenerPlantillaMaterialesDesdeServidor_(idNegocio) {
    const negocio = String(idNegocio || "").trim();
    if (!negocio) return Promise.reject(new Error("Selecciona el negocio."));

    if (
      MP_STATE.materialTemplateCache &&
      MP_STATE.materialTemplateCache.idNegocio === negocio &&
      MP_STATE.materialTemplateCache.resultado
    ) {
      return Promise.resolve(MP_STATE.materialTemplateCache.resultado);
    }

    if (
      MP_STATE.materialTemplatePromise &&
      MP_STATE.materialTemplatePromise.idNegocio === negocio
    ) {
      return MP_STATE.materialTemplatePromise.promesa;
    }

    const promesa = secureRpc(
      "obtenerPlantillaMaterialesModulo",
      [{ idNegocio: negocio }],
      "MATERIALES_PRECIOS"
    ).then(function(result) {
      MP_STATE.materialTemplateCache = {
        idNegocio: negocio,
        resultado: result,
        cargadoEn: Date.now()
      };
      return result;
    }).finally(function() {
      if (
        MP_STATE.materialTemplatePromise &&
        MP_STATE.materialTemplatePromise.idNegocio === negocio
      ) {
        MP_STATE.materialTemplatePromise = null;
      }
    });

    MP_STATE.materialTemplatePromise = {
      idNegocio: negocio,
      promesa: promesa
    };

    return promesa;
  }

  function liberarDescargaPlantillaMateriales_() {
    const descarga = MP_STATE.materialTemplateDownload;
    if (descarga && descarga.url) {
      try { URL.revokeObjectURL(descarga.url); } catch (error) {}
    }
    MP_STATE.materialTemplateDownload = null;
  }

  function actualizarEstadoDescargaPlantillaMateriales_(estado, detalle) {
    const link = document.getElementById("mpMaterialTemplateButton");
    if (!link) return;

    detalle = detalle || {};
    link.removeAttribute("download");
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.style.opacity = "0.68";
    link.style.cursor = "default";

    if (estado === "PREPARANDO") {
      link.innerHTML =
        '<span class="material-symbols-rounded">progress_activity</span>Preparando plantilla…';
      return;
    }

    if (estado === "ERROR") {
      link.style.opacity = "1";
      link.style.cursor = "pointer";
      link.innerHTML =
        '<span class="material-symbols-rounded">refresh</span>Reintentar plantilla XLSX';
      return;
    }

    if (estado === "LISTA") {
      link.href = String(detalle.url || "#");
      link.setAttribute("download", String(detalle.nombreArchivo || "Plantilla_Carga_Materiales_GSD.xlsx"));
      link.setAttribute("aria-disabled", "false");
      link.style.opacity = "1";
      link.style.cursor = "pointer";
      link.innerHTML =
        '<span class="material-symbols-rounded">download_done</span>Descargar plantilla XLSX (Materiales GSD)';
      return;
    }

    link.innerHTML =
      '<span class="material-symbols-rounded">download</span>Selecciona un negocio';
  }

  function prepararDescargaNativaPlantillaMateriales_(idNegocio, result) {
    const negocio = String(idNegocio || "").trim();
    result = result || {};

    if (!negocio) throw new Error("No se indicó el negocio de la plantilla.");
    if (result.correcto === false) {
      throw new Error(result.mensaje || "No fue posible preparar la plantilla.");
    }

    const blob = result.contenido != null ? new Blob(
      [result.contenido],
      { type: result.mimeType || "text/csv;charset=utf-8" }
    ) : base64ToBlobMateriales_(
      result.contenidoBase64,
      result.mimeType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (!blob.size) {
      throw new Error("La plantilla XLSX generada está vacía.");
    }

    liberarDescargaPlantillaMateriales_();

    const descarga = {
      idNegocio: negocio,
      url: URL.createObjectURL(blob),
      nombreArchivo: result.nombreArchivo || "Plantilla_Carga_Materiales_GSD.xlsx",
      tamanoBytes: blob.size,
      preparadaEn: Date.now(),
      cacheHit: result.cacheHit === true
    };

    MP_STATE.materialTemplateDownload = descarga;
    actualizarEstadoDescargaPlantillaMateriales_("LISTA", descarga);
    return descarga;
  }

  function prepararPlantillaMaterialesEnSegundoPlano_(idNegocio, opciones) {
    const negocio = String(idNegocio || "").trim();
    const config = opciones || {};
    const requestId = ++MP_STATE.materialTemplateRequestSeq;

    liberarDescargaPlantillaMateriales_();

    if (!negocio) {
      actualizarEstadoDescargaPlantillaMateriales_("SIN_NEGOCIO");
      return Promise.resolve(null);
    }

    // AGENTE 2: plantilla XLSX generada en el frontend con SheetJS (formato GSD
    // + hoja DICCIONARIOS). Si SheetJS no está disponible, se usa el CSV del
    // servidor como respaldo.
    const localMat = mpGsdPlantillaMaterialLocal_();
    if (localMat) {
      if (requestId !== MP_STATE.materialTemplateRequestSeq) return Promise.resolve(null);
      const descargaLocal = {
        idNegocio: negocio,
        url: localMat.url,
        nombreArchivo: localMat.nombreArchivo,
        tamanoBytes: localMat.tamanoBytes,
        preparadaEn: localMat.preparadaEn,
        cacheHit: false,
        local: true
      };
      MP_STATE.materialTemplateDownload = descargaLocal;
      actualizarEstadoDescargaPlantillaMateriales_("LISTA", descargaLocal);
      return Promise.resolve(descargaLocal);
    }

    actualizarEstadoDescargaPlantillaMateriales_("PREPARANDO");

    return obtenerPlantillaMaterialesDesdeServidor_(negocio)
      .then(function(result) {
        if (requestId !== MP_STATE.materialTemplateRequestSeq) return null;

        const form = document.getElementById("mpBulkMaterialForm");
        const negocioActual = String(
          form && form.elements.idNegocio ? form.elements.idNegocio.value : ""
        ).trim();

        if (negocioActual !== negocio) return null;
        return prepararDescargaNativaPlantillaMateriales_(negocio, result);
      })
      .catch(function(error) {
        if (requestId === MP_STATE.materialTemplateRequestSeq) {
          actualizarEstadoDescargaPlantillaMateriales_("ERROR");
          if (config.forzarMensaje) {
            toast("No se pudo preparar la plantilla", errorMessage(error), true);
          }
        }
        throw error;
      });
  }

  function downloadMaterialsTemplate(form) {
    const data = form ? formToObject(form) : {};
    const negocio = String(data.idNegocio || "").trim();

    if (!negocio) {
      toast(
        "Selecciona el negocio",
        "La plantilla se prepara con el diccionario correspondiente al negocio.",
        true
      );
      return;
    }

    const descarga = MP_STATE.materialTemplateDownload;
    if (
      descarga &&
      descarga.idNegocio === negocio &&
      descarga.url
    ) {
      // La descarga normal se ejecuta desde el <a download> del modal.
      return descarga;
    }

    prepararPlantillaMaterialesEnSegundoPlano_(negocio, { forzarMensaje: true });
    return null;
  }


  function hasDownloadFilter(filters) {
    filters = filters || {};
    const texto = String(filters.texto || "").trim();
    const estado = String(filters.estado || "TODOS").toUpperCase();
    const negocio = String(filters.idNegocio || "").trim();
    return texto.length >= 2 || Boolean(negocio) || (estado && estado !== "TODOS");
  }

  function exportMaterialsFiltered() {
    if (!hasDownloadFilter(MP_STATE.filters)) {
      toast("Aplica un filtro", "Usa búsqueda o estado antes de descargar materiales para evitar archivos pesados.", true);
      return;
    }
    secureRpc("exportarMaterialesModulo", [{ texto: MP_STATE.filters.texto || "", estado: MP_STATE.filters.estado || "ACTIVO", idNegocio: MP_STATE.filters.idNegocio || "" }], "MATERIALES_PRECIOS")
      .then(downloadCsvResult)
      .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
  }

  function downloadMaterialsPricesTemplate() {
    secureRpc("obtenerPlantillaListaPreciosModulo", [], "MATERIALES_PRECIOS")
      .then(downloadCsvResult)
      .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
  }

  function exportRequestDetail(idSolicitud) {
    secureRpc("exportarDetalleSolicitudPreciosModulo", [idSolicitud], "MATERIALES_PRECIOS")
      .then(downloadCsvResult)
      .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
  }

  function exportOfficialList(idListaPrecio) {
    secureRpc("exportarListaOficialPreciosModulo", [idListaPrecio], "MATERIALES_PRECIOS")
      .then(downloadCsvResult)
      .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
  }

  function exportOfficialPricesFiltered() {
    if (!hasDownloadFilter(MP_STATE.priceFilters)) {
      toast("Aplica un filtro", "Usa búsqueda o estado antes de descargar precios para evitar archivos pesados.", true);
      return;
    }
    secureRpc("exportarPreciosOficialesModulo", [{ texto: MP_STATE.priceFilters.texto || "", estado: MP_STATE.priceFilters.estado || "ACTIVO", idNegocio: MP_STATE.priceFilters.idNegocio || "" }], "MATERIALES_PRECIOS")
      .then(downloadCsvResult)
      .catch(function(error) { toast("No se pudo descargar", errorMessage(error), true); });
  }

  function downloadCsvResult(result) {
    result = result || {};
    const blob = new Blob([result.contenido || ""], { type: result.mimeType || "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.nombreArchivo || "descarga.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openMpModal(title, description, bodyHtml, wide) {
    closeMpModal();
    const wrapper = document.createElement("div");
    wrapper.id = "mpModalBackdrop";
    wrapper.className = "mp-modal-backdrop";
    wrapper.innerHTML = '<aside class="mp-modal ' + (wide ? 'mp-modal--wide' : '') + '" role="dialog" aria-modal="true"><header class="mp-modal-header"><div><p class="eyebrow">MATERIALES Y PRECIOS</p><h3>' + escapeHtml(title || "") + '</h3><p>' + escapeHtml(description || "") + '</p></div><button id="mpModalClose" class="mp-modal-close" type="button" aria-label="Cerrar"><span class="material-symbols-rounded">close</span></button></header><div id="mpModalBody">' + bodyHtml + '</div></aside>';
    document.body.appendChild(wrapper);
    on("mpModalClose", "click", closeMpModal);
    wrapper.addEventListener("click", function(event) { if (event.target === wrapper) closeMpModal(); });
  }

  function closeMpModal() {
    liberarDescargaPlantillaMateriales_();
    liberarDescargaPlantillaPrecios_();
    MP_STATE.materialTemplateRequestSeq += 1;
    MP_STATE.priceTemplateRequestSeq += 1;
    const modal = document.getElementById("mpModalBackdrop");
    if (modal) modal.remove();
  }

  function mpScopeLabel(row) {
    row = row || {};
    const alcance = String(row.alcance || "").toUpperCase();
    if (alcance === "GRUPO" || row.grupo) return "Grupo: " + (row.oficina || "—") + " / " + (row.grupo || "—");
    if (alcance === "OFICINA" || row.oficina) return "Oficina: " + (row.oficina || "—");
    return "General";
  }

  function mpSelect(name, label, options, optional, id) {
    options = options || [];
    return '<label>' + escapeHtml(label) + '<select ' + (id ? 'id="' + escapeHtml(id) + '" ' : '') + 'name="' + escapeHtml(name) + '"' + (optional ? '' : ' required') + '><option value="">' + (optional ? 'Opcional' : 'Seleccionar') + '</option>' + options.map(function(item) { return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.nombre || item.codigo || item.id) + '</option>'; }).join("") + '</select></label>';
  }

  function mpInput(name, label, type, value) {
    return '<label>' + escapeHtml(label) + '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '"></label>';
  }


  function mpFieldLabel(label, tooltip) {
    const text = escapeHtml(label || "");
    const help = String(tooltip || "").trim();
    if (!help) return text;
    return '<span class="mp-field-label"><span>' + text + '</span><span class="mp-field-info" tabindex="0" data-tooltip="' + escapeHtml(help) + '"><span class="material-symbols-rounded">info</span></span></span>';
  }

  function mpSelectInfo(name, label, options, optional, tooltip, id) {
    options = options || [];
    return '<label>' + mpFieldLabel(label, tooltip) + '<select ' + (id ? 'id="' + escapeHtml(id) + '" ' : '') + 'name="' + escapeHtml(name) + '"' + (optional ? '' : ' required') + '><option value="">' + (optional ? 'Opcional' : 'Seleccionar') + '</option>' + options.map(function(item) { return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.nombre || item.codigo || item.id) + '</option>'; }).join("") + '</select></label>';
  }

  function mpMultiSelectInfo(name, label, options, optional, tooltip, id) {
    options = (options || []).filter(function(item) { return item && String(item.id || "").trim(); });
    const targetId = id || name;
    const summary = options.length ? 'Sin oficina: alcance general' : 'Sin oficinas cargadas';
    return '<div class="mp-form-span-2 mp-multi-field mp-office-picker" id="' + escapeHtml(targetId) + '" data-name="' + escapeHtml(name) + '">' +
      '<div class="mp-field-label-row">' + mpFieldLabel(label, tooltip) + '</div>' +
      '<div class="mp-office-toolbar"><input class="mp-office-search" type="search" placeholder="Buscar oficina"><div class="mp-office-actions"><button type="button" class="button button--ghost mp-office-all">Todas</button><button type="button" class="button button--ghost mp-office-clear">Limpiar</button></div></div>' +
      '<div class="mp-office-summary" data-summary>' + escapeHtml(summary) + '</div>' +
      '<div class="mp-office-grid">' + (options.length ? options.map(function(item) { return mpOfficeCheckMarkup(name, item); }).join("") : '<div class="mp-office-empty">Sin oficinas disponibles. Se guardará como general.</div>') + '</div>' +
      '<small class="mp-office-help">Una oficina genera un alcance por canal. Para otro canal registra otro precio.</small>' +
      '</div>';
  }

  function mpOfficeCheckMarkup(name, item) {
    const codigo = item.codigo || item.id || "";
    const nombre = item.nombre || item.id || "";
    const text = [codigo, nombre].filter(Boolean).join(" · ");
    const search = normalizeMpText([codigo, nombre, item.id].join(" "));
    return '<label class="mp-office-option" data-search="' + escapeHtml(search) + '"><input type="checkbox" name="' + escapeHtml(name) + '" value="' + escapeHtml(item.id) + '"><span>' + escapeHtml(text) + '</span></label>';
  }

  function getSelectedOfficeValues(containerId) {
    const node = document.getElementById(containerId || "mpPriceOffices");
    if (!node) return [];
    if (node.tagName === "SELECT") {
      return Array.from(node.selectedOptions || []).map(function(option) { return option.value; }).filter(Boolean);
    }
    return Array.from(node.querySelectorAll('input[type="checkbox"]:checked')).map(function(input) { return input.value; }).filter(Boolean);
  }

  function setSelectedOfficeValues(values, containerId) {
    const node = document.getElementById(containerId || "mpPriceOffices");
    if (!node) return;
    const selected = {};
    (values || []).forEach(function(value) { if (value) selected[String(value)] = true; });
    if (node.tagName === "SELECT") {
      Array.from(node.options || []).forEach(function(option) { option.selected = selected[option.value] === true; });
      return;
    }
    Array.from(node.querySelectorAll('input[type="checkbox"]')).forEach(function(input) { input.checked = selected[input.value] === true; });
    updateOfficePickerSummary(node);
  }

  function bindOfficePicker(containerId, onChange) {
    const node = document.getElementById(containerId);
    if (!node || node.dataset.boundPicker === "true") return;
    node.dataset.boundPicker = "true";
    const search = node.querySelector('.mp-office-search');
    const all = node.querySelector('.mp-office-all');
    const clear = node.querySelector('.mp-office-clear');
    if (search) {
      search.addEventListener("input", function() {
        const term = normalizeMpText(search.value || "");
        Array.from(node.querySelectorAll('.mp-office-option')).forEach(function(option) {
          option.hidden = term && String(option.getAttribute('data-search') || '').indexOf(term) === -1;
        });
      });
    }
    if (all) all.addEventListener("click", function() {
      Array.from(node.querySelectorAll('.mp-office-option:not([hidden]) input[type="checkbox"]')).forEach(function(input) { input.checked = true; });
      updateOfficePickerSummary(node);
      if (typeof onChange === "function") onChange();
    });
    if (clear) clear.addEventListener("click", function() {
      Array.from(node.querySelectorAll('input[type="checkbox"]')).forEach(function(input) { input.checked = false; });
      updateOfficePickerSummary(node);
      if (typeof onChange === "function") onChange();
    });
    node.addEventListener("change", function() {
      updateOfficePickerSummary(node);
      if (typeof onChange === "function") onChange();
    });
    updateOfficePickerSummary(node);
  }

  function updateOfficePickerSummary(node) {
    if (!node) return;
    const summary = node.querySelector('[data-summary]');
    if (!summary) return;
    const checked = Array.from(node.querySelectorAll('input[type="checkbox"]:checked'));
    if (!checked.length) { summary.textContent = "Sin oficina: alcance general"; return; }
    const labels = checked.map(function(input) {
      const label = input.closest('label');
      return label ? String(label.textContent || '').trim() : input.value;
    });
    summary.textContent = labels.length <= 3 ? labels.join(', ') : labels.slice(0, 3).join(', ') + ' +' + (labels.length - 3) + ' oficinas';
  }

  function bindPriceOfficeSelectDependency(opts) {
    const office = document.getElementById("mpPriceOffice");
    const group = document.getElementById("mpPriceGroup");

    if (office && office.dataset.boundOfficeSelect !== "true") {
      office.dataset.boundOfficeSelect = "true";
      office.addEventListener("change", function() {
        // Oficina controla únicamente Grupo. Nunca dispara búsqueda de materiales.
        syncPriceOfficeSelection(opts);
      });
    }

    if (group && group.dataset.boundGroupScope !== "true") {
      group.dataset.boundGroupScope = "true";
      group.addEventListener("change", function() {
        actualizarResumenAlcancePrecio_();
      });
    }

    syncPriceOfficeSelection(opts);
  }

  function syncPriceOfficeSelection(opts) {
    opts = opts || getMpEmptyOptions();

    const office = document.getElementById("mpPriceOffice");
    const group = document.getElementById("mpPriceGroup");
    const officeId = office ? String(office.value || "").trim() : "";

    if (!group) {
      actualizarResumenAlcancePrecio_();
      return;
    }

    if (!officeId) {
      group.innerHTML = '<option value="">Selecciona oficina primero</option>';
      group.value = "";
      group.disabled = true;
      actualizarResumenAlcancePrecio_();
      return;
    }

    const grupos = (opts.grupos || []).filter(function(item) {
      return String(item.idOficina || item.oficinaId || "").trim() === officeId;
    });

    group.disabled = false;
    group.innerHTML =
      '<option value="">Opcional: alcance por oficina</option>' +
      grupos.map(function(item) {
        return '<option value="' + escapeHtml(item.id) + '">' +
          escapeHtml([item.codigo || "", item.nombre || item.id].filter(Boolean).join(" · ")) +
        '</option>';
      }).join("");

    actualizarResumenAlcancePrecio_();
  }

  function actualizarResumenAlcancePrecio_() {
    const node = document.getElementById("mpPriceScopeSummary");
    if (!node) return;

    const office = document.getElementById("mpPriceOffice");
    const group = document.getElementById("mpPriceGroup");

    const officeId = office ? String(office.value || "").trim() : "";
    const groupId = group && !group.disabled ? String(group.value || "").trim() : "";

    if (officeId && groupId) {
      node.innerHTML =
        '<strong>Alcance actual:</strong> Grupo · ' +
        escapeHtml(getSelectedOptionText(office) || "Oficina seleccionada") +
        ' / ' +
        escapeHtml(getSelectedOptionText(group) || "Grupo seleccionado");
      return;
    }

    if (officeId) {
      node.innerHTML =
        '<strong>Alcance actual:</strong> Oficina · ' +
        escapeHtml(getSelectedOptionText(office) || "Oficina seleccionada");
      return;
    }

    node.innerHTML =
      '<strong>Alcance actual:</strong> General. Sin oficina ni grupo.';
  }

  function bindUploadOfficeSelectDependency(opts) {
    const office = document.getElementById("mpUploadOffice");
    if (office && office.dataset.boundOfficeSelect !== "true") {
      office.dataset.boundOfficeSelect = "true";
      office.addEventListener("change", function() { syncUploadOfficeSelection(opts); });
    }
    syncUploadOfficeSelection(opts);
  }

  function syncUploadOfficeSelection(opts) {
    opts = opts || getMpEmptyOptions();
    const office = document.getElementById("mpUploadOffice");
    const group = document.getElementById("mpUploadGroup");
    const officeId = office ? String(office.value || "").trim() : "";
    if (!group) return;
    if (!officeId) {
      group.innerHTML = '<option value="">Opcional</option>';
      group.value = "";
      group.disabled = false;
      return;
    }
    group.disabled = false;
    const grupos = (opts.grupos || []).filter(function(item) { return String(item.idOficina || item.oficinaId || "").trim() === String(officeId); });
    group.innerHTML = '<option value="">Opcional</option>' + grupos.map(function(item) { return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml([item.codigo || '', item.nombre || item.id].filter(Boolean).join(' · ')) + '</option>'; }).join("");
  }


  function mpInputInfo(name, label, type, value, tooltip) {
    return '<label>' + mpFieldLabel(label, tooltip) + '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '"></label>';
  }

  function setFormValue_(form, name, value) {
    const field = form ? form.querySelector('[name="' + name + '"]') : null;
    if (field) field.value = value || "";
  }

  function formToObject(form) {
    const data = {};
    Array.from(new FormData(form).entries()).forEach(function(entry) {
      if (Object.prototype.hasOwnProperty.call(data, entry[0])) {
        if (!Array.isArray(data[entry[0]])) data[entry[0]] = [data[entry[0]]];
        data[entry[0]].push(entry[1]);
      } else {
        data[entry[0]] = entry[1];
      }
    });
    return data;
  }

  function mpError(error) {
    return '<div class="empty-state"><span class="material-symbols-rounded">error</span><strong>No fue posible cargar</strong><p>' + escapeHtml(errorMessage(error)) + '</p></div>';
  }

  function mpEmpty(message) {
    return '<div class="empty-state"><span class="material-symbols-rounded">inventory_2</span><strong>Sin registros</strong><p>' + escapeHtml(message || "No hay información disponible.") + '</p></div>';
  }
  function formatMpMoney(value, currency) {
    const parsed = parseMpMoneyNumber(value);
    const n = Number.isFinite(parsed) ? parsed : 0;
    return (currency === "PEN" || !currency ? "S/" : currency) + " " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }


function renderBulkMaterialPreview(resultBox, result) {
    result = result || {};
    const observaciones = Array.isArray(result.observaciones) ? result.observaciones : [];

    let html = '<div class="mp-upload-summary">' +
      '<div><small>Filas</small><strong>' + escapeHtml(result.totalFilas || 0) + '</strong></div>' +
      '<div><small>Nuevos</small><strong>' + escapeHtml(result.creados || 0) + '</strong></div>' +
      '<div><small>Actualizar</small><strong>' + escapeHtml(result.actualizados || 0) + '</strong></div>' +
      '<div><small>Errores</small><strong>' + escapeHtml(result.errores || 0) + '</strong></div>' +
      '<div><small>Advertencias</small><strong>' + escapeHtml(result.advertencias || 0) + '</strong></div>' +
    '</div>' +
    '<p class="mp-note">' + escapeHtml(result.mensaje || "Prevalidación completada.") + '</p>';

    if (observaciones.length) {
      html += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Fila</th><th>Código</th><th>SAP</th><th>Tipificación</th><th>Acción</th><th>Estado</th><th>Detalle</th>' +
        '</tr></thead><tbody>' +
        observaciones.map(function(item) {
          const detalle = item.errores || item.advertencias || "OK";
          return '<tr>' +
            '<td>' + escapeHtml(item.fila || "") + '</td>' +
            '<td>' + escapeHtml(item.codigoMaterial || "") + '</td>' +
            '<td>' + escapeHtml(item.codigoSap || "") + '</td>' +
            '<td>' + escapeHtml(item.rutaTipificacion || "") + '</td>' +
            '<td>' + escapeHtml(item.accion || "") + '</td>' +
            '<td>' + escapeHtml(item.estado || "") + '</td>' +
            '<td>' + escapeHtml(detalle) + '</td>' +
          '</tr>';
        }).join("") +
        '</tbody></table></div>';
    }

    html += '<div class="mp-actions">';
    if (result.puedeConfirmar && result.tokenPreview) {
      html += '<button id="mpConfirmBulkMaterial" class="button button--primary has-tooltip" type="button" data-tooltip="Confirmar carga" aria-label="Confirmar carga" title="Confirmar carga">' +
        '<span class="material-symbols-rounded">check</span></button>';
    }
    html += '</div>';

    resultBox.innerHTML = html;

    if (result.puedeConfirmar && result.tokenPreview) {
      on("mpConfirmBulkMaterial", "click", function() {
        confirmarBulkMaterialLoad(resultBox, result.tokenPreview);
      });
    } else if (result.errores) {
      toast(
        "Prevalidación con errores",
        "Corrige las filas observadas y vuelve a cargar el XLSX.",
        true
      );
    }
  }

function confirmarBulkMaterialLoad(resultBox, tokenPreview) {
    // AGENTE 2: token local GSD -> confirmación fila por fila en el frontend.
    const localPending = mpGsdTakePending_(tokenPreview);
    if (localPending) {
      confirmarMaterialesGsdLocal_(resultBox, tokenPreview, localPending);
      return;
    }
    resultBox.innerHTML = '<div class="mp-inline-loader"><span class="material-symbols-rounded">hourglass_empty</span>Grabando materiales y relaciones...</div>';

    secureRpc(
      "confirmarCargaMaterialesMasivoModulo",
      [{ tokenPreview: tokenPreview }],
      "MATERIALES_PRECIOS"
    )
      .then(function(result) {
        resultBox.innerHTML = '<div class="mp-upload-summary">' +
          '<div><small>Filas</small><strong>' + escapeHtml(result.totalFilas || 0) + '</strong></div>' +
          '<div><small>Creados</small><strong>' + escapeHtml(result.creados || 0) + '</strong></div>' +
          '<div><small>Actualizados</small><strong>' + escapeHtml(result.actualizados || 0) + '</strong></div>' +
          '<div><small>Errores</small><strong>0</strong></div>' +
        '</div>' +
        '<p class="mp-note">' + escapeHtml(result.mensaje || "Carga confirmada.") + '</p>' +
        '<div class="mp-actions"><button id="mpCloseBulkMaterial" class="button button--primary" type="button">Cerrar</button></div>';

        on("mpCloseBulkMaterial", "click", function() {
          closeMpModal();
          renderMaterialsPricesMaterials(true);
        });

        toast("Carga de materiales", result.mensaje || "Carga completada.");
      })
      .catch(function(error) {
        resultBox.innerHTML = mpError(error);
        toast("No se pudo confirmar", errorMessage(error), true);
      });
  }

  // AGENTE 2: confirmación local GSD de materiales. Escribe solo las filas OK
  // (una por una con guardarMaterialPrecioModulo) y reporta motivo por fila.
  function confirmarMaterialesGsdLocal_(resultBox, tokenPreview, localPending) {
    const items = ((localPending && localPending.pendientes && localPending.pendientes.items) || []);
    var doneBulkMat = 0;
    var stepBulkMat = function() {
      doneBulkMat += 1;
      mpBulkProgressUpdate_(resultBox, doneBulkMat, items.length, "Grabando materiales...");
    };
    mpBulkProgressUpdate_(resultBox, 0, items.length, "Grabando materiales...");

    let creados = 0;
    let actualizados = 0;
    let errores = 0;
    const detalle = [];
    let chain = Promise.resolve();
    const vistosConfirm = {};

    items.forEach(function(item) {
      chain = chain.then(function() {
        return secureRpc("guardarMaterialPrecioModulo", [item.payload], "MATERIALES_PRECIOS")
          .then(function() {
            var key = String(item.payload.idMaterial || "");
            var esNuevo = /^MAT-GSD-/.test(key) && !vistosConfirm[key];
            vistosConfirm[key] = true;
            if (esNuevo) creados += 1;
            else actualizados += 1;
            detalle.push({ fila: item.fila, codigoMaterial: item.payload.codigoMaterial, accion: "GRABADO", estado: "OK", detalle: "OK" });
            stepBulkMat();
          })
          .catch(function(error) {
            errores += 1;
            detalle.push({ fila: item.fila, codigoMaterial: item.payload.codigoMaterial, accion: "OMITIR", estado: "ERROR", detalle: errorMessage(error) });
            stepBulkMat();
          });
      });
    });

    chain.then(function() {
      mpGsdDropPending_(tokenPreview);
      clearMpTableCache("materials");
      clearMpSummaryCache();
      let html = '<div class="mp-upload-summary">' +
        '<div><small>Filas</small><strong>' + escapeHtml(items.length) + '</strong></div>' +
        '<div><small>Creados</small><strong>' + escapeHtml(creados) + '</strong></div>' +
        '<div><small>Actualizados</small><strong>' + escapeHtml(actualizados) + '</strong></div>' +
        '<div><small>Errores</small><strong>' + escapeHtml(errores) + '</strong></div>' +
        '</div><p class="mp-note">Carga GSD confirmada. Solo se grabaron las filas validadas.</p>';
      if (detalle.length) {
        html += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
          '<th>Fila</th><th>Material</th><th>Acción</th><th>Estado</th><th>Detalle</th>' +
          '</tr></thead><tbody>' +
          detalle.map(function(row) {
            return '<tr><td>' + escapeHtml(row.fila) + '</td><td>' + escapeHtml(row.codigoMaterial) +
              '</td><td>' + escapeHtml(row.accion) + '</td><td>' + escapeHtml(row.estado) +
              '</td><td>' + escapeHtml(row.detalle) + '</td></tr>';
          }).join("") + '</tbody></table></div>';
      }
      html += '<div class="mp-actions"><button id="mpCloseBulkMaterial" class="button button--primary" type="button">Cerrar</button></div>';
      resultBox.innerHTML = html;
      on("mpCloseBulkMaterial", "click", function() {
        closeMpModal();
        renderMaterialsPricesMaterials(true);
      });
      toast("Carga de materiales", "Creados: " + creados + " · Actualizados: " + actualizados + " · Errores: " + errores);
    });
  }

/* GSD-EXCEL-INI (AGENTE 2 2026-09-19): soporte del Excel real del negocio GSD.
 * El Excel real trae UNA sola hoja con encabezado:
 * N°, PROVEEDOR, MARCA, TIPO, SUB TIPO, INCLUYE CONEXIÓN, CODIGO HANA
 * (=código SAP), Producto principal calculado, Combo calculado, COMENTARIOS,
 * FEE CLIDA (%), FEE PRV, PRECIO, cuotas 0/6/9/12/18/24/36/48/60,
 * Producto original, Combo original. Todo del negocio GSD.
 * MAPEO columna Excel -> campo sistema (ver mpGsdMapColumns_):
 *   PROVEEDOR -> mae_materiales.proveedor (texto) + resolución a id_proveedor
 *   MARCA -> mae_marcas por nombre (guardarMaterialPrecioModulo la crea)
 *   TIPO/SUB TIPO -> id_tipo_material/id_subtipo_material (por nombre; null si no hay catálogo)
 *   INCLUYE CONEXIÓN -> mae_materiales.incluye_conexion (SI/NO)
 *   CODIGO HANA -> mae_materiales.codigo_hana + codigo_sap (clave de match)
 *   Producto principal calculado -> mae_materiales.producto_principal (+id_producto si hay catálogo)
 *   Combo calculado -> mae_materiales.combo (+detalle_combo del precio)
 *   COMENTARIOS -> mae_materiales.comentarios
 *   FEE CLIDA (%) o primer FEE -> pre_lista_precio_detalle.fee (0-100, oculto a PROVEEDOR)
 *   PRECIO -> pre_lista_precio_detalle.precio_base (vigencia mensual día 1 -> fin de mes)
 * SE IGNORA (y por qué):
 *   N°: correlativo del Excel, sin valor de negocio.
 *   Cuotas 0/6/9/12/18/24/36/48/60: montos derivados del PRECIO base; el sistema
 *     graba el precio base. Reserva creada en migración 20260919 (cuotas_json).
 *   Producto original / Combo original: columnas de auditoría del formato previo;
 *     rigen las calculadas. Filas totalmente vacías y la fila "EJEMPLO*" de las
 *     plantillas se omiten; una fila con datos pero sin CODIGO_HANA se reporta
 *     como error con su motivo.
 */
function mpGsdNorm_(value) {
  var text = String(value == null ? "" : value);
  try {
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (ignore) {}
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function mpGsdMapColumns_(headers) {
  var map = {};
  var feeFirst = -1;
  var feeClida = -1;
  var comboExact = -1;
  var comboCalc = -1;
  var prodExact = -1;
  var prodCalc = -1;
  (headers || []).forEach(function(raw, idx) {
    var key = mpGsdNorm_(raw);
    if (!key) return;
    // AGENTE 2B: tolerancia a variantes de encabezado (orden libre, fila 3,
    // "PRECIO BASE", "COD HANA"...). Todo por prefijo
    // o sinónimos exactos; las cuotas (dígitos) y columnas *ORIGINAL se ignoran.
    // NOTA: RESPONSABLE_VENTA ya no se mapea (columna sin uso; queda en BD).
    if (key.indexOf("PROVEEDOR") === 0 && map.proveedor == null) map.proveedor = idx;
    else if (key.indexOf("MARCA") === 0 && map.marca == null) map.marca = idx;
    else if ((key === "TIPO" || key === "TIPOMATERIAL") && map.tipo == null) map.tipo = idx;
    else if ((key === "SUBTIPO" || key === "SUBTIPOMATERIAL") && map.subtipo == null) map.subtipo = idx;
    else if (key.indexOf("INCLUYE") === 0 && map.incluyeConexion == null) map.incluyeConexion = idx;
    else if ((key === "CODIGOHANA" || key === "CODHANA" || key === "HANA" || key === "CODIGOSAP" || key === "CODSAP" || key === "SAP") && map.codigoHana == null) map.codigoHana = idx;
    else if ((key === "COMENTARIOS" || key === "COMENTARIO" || key === "OBSERVACIONES" || key === "OBSERVACION") && map.comentarios == null) map.comentarios = idx;
    else if (key.indexOf("PRECIO") === 0 && map.precio == null) map.precio = idx;
    else if (key === "COMBO") comboExact = comboExact === -1 ? idx : comboExact;
    else if (key.indexOf("COMBO") === 0 && key.indexOf("ORIGINAL") === -1) comboCalc = comboCalc === -1 ? idx : comboCalc;
    else if (key === "PRODUCTOPRINCIPAL") prodExact = prodExact === -1 ? idx : prodExact;
    else if (key.indexOf("PRODUCTOPRINCIPAL") === 0 && key.indexOf("ORIGINAL") === -1) prodCalc = prodCalc === -1 ? idx : prodCalc;
    else if (key.indexOf("FEE") === 0) {
      if (feeFirst === -1) feeFirst = idx;
      if (key.indexOf("CLID") !== -1 && feeClida === -1) feeClida = idx;
    }
    // Ignorados a propósito: N/NUMERO (N°), dígitos puros (cuotas),
    // PRODUCTOORIGINAL, COMBOORIGINAL. No se mapean.
  });
  map.combo = comboExact !== -1 ? comboExact : (comboCalc !== -1 ? comboCalc : null);
  if (map.combo == null) delete map.combo;
  map.productoPrincipal = prodExact !== -1 ? prodExact : (prodCalc !== -1 ? prodCalc : null);
  if (map.productoPrincipal == null) delete map.productoPrincipal;
  if (feeClida !== -1) map.fee = feeClida;
  else if (feeFirst !== -1) map.fee = feeFirst;
  return map;
}

function mpGsdFindHeaderRow_(aoa) {
  var best = -1;
  var bestScore = 0;
  var limit = Math.min((aoa || []).length, 20);
  for (var r = 0; r < limit; r++) {
    var row = aoa[r] || [];
    // AGENTE 2B: la fila de título ("REPORTE GSD...") suele traer 1 sola
    // celda con texto; el encabezado real trae 2 o más columnas mapeadas.
    var celdas = 0;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c] == null ? "" : row[c]).trim() !== "") celdas++;
    }
    if (celdas < 2) continue;
    var map = mpGsdMapColumns_(row);
    var score = Object.keys(map).length;
    if (score < 2) continue;
    var hasKey = map.codigoHana != null || (map.proveedor != null && map.precio != null);
    if (hasKey && score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function mpGsdCell_(row, idx) {
  if (idx == null || !row || idx >= row.length) return "";
  var v = row[idx];
  if (v == null) return "";
  return String(v).trim();
}

function mpGsdParseNumber_(value) {
  // AGENTE 2B: las fechas nativas de Excel no son montos (antes se colaba el
  // serial como precio). Se devuelven como no numéricas con mensaje claro.
  if (typeof Date !== "undefined" && value instanceof Date) return null;
  var text = String(value == null ? "" : value).trim();
  if (!text) return null;
  if (typeof value === "number" && isFinite(value)) return value;
  text = text.replace(/(S\/\.?|\$|PEN|USD|%)/gi, "").trim().replace(/\s+/g, "");
  if (!text) return null;
  // Negativo contable entre paréntesis: (1,500) -> -1500.
  var negativo = false;
  if (text.length > 2 && text.charAt(0) === "(" && text.charAt(text.length - 1) === ")") {
    negativo = true;
    text = text.slice(1, -1);
  }
  if (text.charAt(0) === "-") {
    negativo = true;
    text = text.slice(1);
  } else if (text.charAt(0) === "+") {
    text = text.slice(1);
  }
  if (!text) return null;
  var hasDot = text.indexOf(".") !== -1;
  var hasComma = text.indexOf(",") !== -1;
  if (hasDot && hasComma) {
    // AGENTE 2B: con ambos separadores, el ÚLTIMO es el decimal.
    // "2,500.75" (US) -> 2500.75 ; "1.234,56" (EU) -> 1234.56.
    if (text.lastIndexOf(".") > text.lastIndexOf(",")) text = text.replace(/,/g, "");
    else text = text.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma || hasDot) {
    var sep = hasComma ? "," : ".";
    var partes = text.split(sep);
    // AGENTE 2B: un solo separador con grupos de miles ("1,500", "1.500",
    // "1,500,250", "1.234.567") vale como miles; si el último grupo no tiene
    // 3 dígitos ("12.5", "899.00") es decimal.
    var soloMiles = partes.length > 1 && partes.every(function(p, i) {
      if (!/^\d+$/.test(p)) return false;
      if (i === 0) return p.length >= 1 && p.length <= 3;
      return p.length === 3;
    });
    if (soloMiles) text = partes.join("");
    else if (hasComma) text = text.replace(/,/g, ".");
  }
  var num = Number(text);
  if (!isFinite(num)) return null;
  if (negativo) num = -Math.abs(num);
  return num;
}

function mpGsdParseFee_(value) {
  var text = String(value == null ? "" : value).trim();
  if (!text) return { valor: null, error: "" };
  // AGENTE 2B: con "%" explícito ("0.5%") el número ya está en porcentaje y
  // NO se convierte; sin "%", "0.1" es tanto por uno y vale 10.
  var tienePorciento = text.indexOf("%") !== -1;
  var num = mpGsdParseNumber_(text);
  if (num == null) return { valor: null, error: "FEE no numérico (" + text + ")." };
  // Tolerancia: "0.12" como 12 % si viene en tanto por uno con decimales pequeños.
  if (!tienePorciento && num > 0 && num < 1 && /^\s*0[.,]/.test(text)) num = Math.round(num * 10000) / 100;
  if (num < 0 || num > 100) return { valor: null, error: "FEE fuera de rango 0-100 (" + text + ")." };
  return { valor: Math.round(num * 100) / 100, error: "" };
}

function mpGsdParseWorkbook_(workbook) {
  if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
    throw new Error("El Excel no contiene hojas legibles.");
  }
  // AGENTE 2B: acceso tolerante a SheetJS (navegador o harness Node).
  var XLSXLib = (typeof window !== "undefined" && window && window.XLSX) ||
    (typeof XLSX !== "undefined" ? XLSX : null);
  if (!XLSXLib) throw new Error("Librería XLSX no disponible. Abre la aplicación para cargar el Excel GSD.");
  var names = workbook.SheetNames;
  // AGENTE 2B: se elige la hoja con mejor encabezado GSD; ante empate gana
  // la que empiece con CARGA (p. ej. CARGA_PRECIOS entre varias hojas).
  var picked = names[0];
  var pickedScore = -2;
  for (var i = 0; i < names.length; i++) {
    var nombreHoja = names[i];
    var hojaWs = workbook.Sheets[nombreHoja];
    var hojaAoa = null;
    try {
      hojaAoa = XLSXLib.utils.sheet_to_json(hojaWs, { header: 1, defval: "", raw: true, blankrows: false });
    } catch (ignoreHoja) { hojaAoa = null; }
    var hojaHeader = hojaAoa ? mpGsdFindHeaderRow_(hojaAoa) : -1;
    var hojaScore = hojaHeader === -1 ? -1 : Object.keys(mpGsdMapColumns_(hojaAoa[hojaHeader])).length;
    if (hojaScore >= 0 && mpGsdNorm_(nombreHoja).indexOf("CARGA") === 0) hojaScore += 0.5;
    if (hojaScore > pickedScore) {
      pickedScore = hojaScore;
      picked = nombreHoja;
    }
  }
  var ws = workbook.Sheets[picked];
  if (!ws) throw new Error("La hoja " + picked + " no se pudo leer.");
  var aoa = XLSXLib.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true, blankrows: false });
  if (!aoa || !aoa.length) throw new Error("La hoja " + picked + " está vacía.");
  var headerRow = mpGsdFindHeaderRow_(aoa);
  if (headerRow === -1) {
    throw new Error("No se encontró el encabezado GSD (se esperaba CODIGO HANA, PROVEEDOR, PRECIO...).");
  }
  var map = mpGsdMapColumns_(aoa[headerRow]);
  var filas = [];
  // AGENTE 2B: duplicados intra-archivo. Se anotan aquí (primera fila vista
  // por CODIGO_HANA) y los reporta mpGsdValidarFila_ como error en español.
  var vistosHana = {};
  for (var r = headerRow + 1; r < aoa.length; r++) {
    var row = aoa[r] || [];
    var allEmpty = row.every(function(c) { return String(c == null ? "" : c).trim() === ""; });
    if (allEmpty) continue;
    var codigoHana = mpGsdCell_(row, map.codigoHana);
    // Solo se omiten filas totalmente vacías y la fila EJEMPLO de las plantillas.
    // Una fila con datos pero sin CODIGO_HANA se conserva para reportarla como error.
    if (mpGsdNorm_(codigoHana).indexOf("EJEMPLO") === 0) continue;
    var dupKey = mpGsdNorm_(codigoHana);
    var dupDe = null;
    if (dupKey) {
      if (vistosHana[dupKey] !== undefined) dupDe = vistosHana[dupKey];
      else vistosHana[dupKey] = r + 1;
    }
    filas.push({
      fila: r + 1,
      proveedor: mpGsdCell_(row, map.proveedor),
      marca: mpGsdCell_(row, map.marca),
      tipo: mpGsdCell_(row, map.tipo),
      subtipo: mpGsdCell_(row, map.subtipo),
      incluyeConexion: mpGsdCell_(row, map.incluyeConexion),
      codigoHana: codigoHana,
      productoPrincipal: mpGsdCell_(row, map.productoPrincipal),
      combo: mpGsdCell_(row, map.combo),
      comentarios: mpGsdCell_(row, map.comentarios),
      duplicadoDeFila: dupDe,
      feeRaw: map.fee != null ? row[map.fee] : "",
      precioRaw: map.precio != null ? row[map.precio] : ""
    });
  }
  return { hoja: picked, mapa: map, filas: filas };
}

function mpGsdParseFileBuffer_(buffer, nombreArchivo) {
  // AGENTE 2B: acceso tolerante a SheetJS (window en navegador, global en Node).
  // El .csv con contenido GSD también lo lee SheetJS; si no se puede leer se
  // lanza un error en español (nunca un crash por window/XLSX indefinidos).
  var XLSXLib = (typeof window !== "undefined" && window && window.XLSX) ||
    (typeof XLSX !== "undefined" ? XLSX : null);
  if (!XLSXLib) throw new Error("Librería XLSX no disponible. Abre la aplicación para cargar el Excel GSD.");
  if (buffer == null) throw new Error("Archivo vacío: selecciona un .xlsx o .csv con datos GSD.");
  var nombre = String(nombreArchivo || "");
  var esCsv = /\.csv$/i.test(nombre);
  var workbook = null;
  try {
    // cellDates: las fechas nativas llegan como Date (no como serial) para
    // no confundirlas con montos en PRECIO/FEE.
    if (typeof buffer === "string") workbook = XLSXLib.read(buffer, { type: "string", cellDates: true });
    else workbook = XLSXLib.read(buffer, { type: "array", cellDates: true });
  } catch (errorLectura) {
    throw new Error("No se pudo leer el archivo " + (esCsv ? ".csv" : ".xlsx") + " (¿formato válido?). Detalle: " + String((errorLectura && errorLectura.message) || errorLectura));
  }
  return mpGsdParseWorkbook_(workbook);
}

function mpGsdResolverPorNombre_(lista, texto) {
  var needle = mpGsdNorm_(texto);
  if (!needle) return null;
  var found = null;
  (lista || []).forEach(function(item) {
    if (found || !item) return;
    var id = String(item.id || item.idProveedor || "");
    var nombre = String(item.nombre || item.nombreComercial || item.razonSocial || "");
    var codigo = String(item.codigo || "");
    if (mpGsdNorm_(nombre) === needle || (codigo && mpGsdNorm_(codigo) === needle) || (id && mpGsdNorm_(id) === needle)) found = item;
  });
  if (!found) {
    (lista || []).forEach(function(item) {
      if (found || !item) return;
      var nombre = String(item.nombre || item.nombreComercial || item.razonSocial || "");
      if (nombre && mpGsdNorm_(nombre).indexOf(needle) !== -1) found = item;
    });
  }
  return found;
}

function mpGsdMonthRange_() {
  var now = new Date();
  var first = now.toISOString().slice(0, 8) + "01";
  var last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { inicio: first, fin: last };
}

function mpGsdMaterialKey_(codigoHana) {
  return "MAT-GSD-" + mpGsdNorm_(codigoHana).slice(0, 40);
}

function mpGsdValidarFila_(g, opts, ctx) {
  ctx = ctx || {};
  var errores = [];
  var advertencias = [];
  if (!g.codigoHana) errores.push("Falta CODIGO_HANA (=código SAP).");
  // AGENTE 2B: duplicado intra-archivo (lo anota mpGsdParseWorkbook_ en
  // g.duplicadoDeFila). Solo la primera aparición se procesa.
  if (g.duplicadoDeFila) errores.push("CODIGO_HANA duplicado en el archivo (ya está en la fila " + g.duplicadoDeFila + "). Deja una sola fila por código.");
  var fee = mpGsdParseFee_(g.feeRaw);
  if (fee.error) errores.push(fee.error);
  var precio = null;
  if (ctx.exigePrecio) {
    precio = mpGsdParseNumber_(g.precioRaw);
    // AGENTE 2B: el mensaje incluye lo recibido ("cero", vacío, negativo...)
    // para ubicar el dato malo sin abrir el Excel.
    var precioCrudo = String(g.precioRaw == null ? "" : g.precioRaw).trim().slice(0, 40);
    if (precio == null) errores.push("PRECIO ausente o no numérico" + (precioCrudo ? " (recibido: \"" + precioCrudo + "\")" : " (celda vacía)") + ".");
    else if (!(precio > 0)) errores.push("PRECIO debe ser mayor a 0 (recibido: " + precio + ").");
  }
  var incluye = mpGsdNorm_(g.incluyeConexion);
  if (g.incluyeConexion && ["SI", "NO"].indexOf(incluye) === -1) {
    advertencias.push("INCLUYE CONEXIÓN distinto de SI/NO: se guarda como texto.");
  }
  var marca = g.marca ? mpGsdResolverPorNombre_(opts.marcas, g.marca) : null;
  if (g.marca && !marca) advertencias.push("MARCA sin catálogo: se creará (" + g.marca + ").");
  var tipo = g.tipo ? mpGsdResolverPorNombre_(opts.tipos, g.tipo) : null;
  if (g.tipo && !tipo) advertencias.push("TIPO sin catálogo: se guarda sin tipificación.");
  var subtipo = null;
  if (g.subtipo) {
    var candidatos = (opts.subtipos || []).filter(function(s) {
      return !tipo || String(s.idTipoMaterial || s.idProducto || "") === "" || String(s.idTipoMaterial || "") === String(tipo.id || "");
    });
    subtipo = mpGsdResolverPorNombre_(candidatos.length ? candidatos : opts.subtipos, g.subtipo);
    if (!subtipo) advertencias.push("SUBTIPO sin catálogo: se guarda sin tipificación.");
  }
  var producto = g.productoPrincipal ? mpGsdResolverPorNombre_(opts.productos, g.productoPrincipal) : null;
  if (g.productoPrincipal && !producto) advertencias.push("PRODUCTO PRINCIPAL sin catálogo: se guarda como texto.");
  var proveedor = g.proveedor ? mpGsdResolverPorNombre_(opts.proveedores, g.proveedor) : null;
  if (ctx.exigeProveedor && !proveedor && !ctx.idProveedorDefecto) {
    errores.push("PROVEEDOR no reconocido y sin predeterminado (" + (g.proveedor || "vacío") + ").");
  } else if (g.proveedor && !proveedor) {
    advertencias.push("PROVEEDOR sin catálogo: se usa el predeterminado y se guarda el texto.");
  }
  return { errores: errores, advertencias: advertencias, fee: fee.valor, precio: precio, marca: marca, tipo: tipo, subtipo: subtipo, producto: producto, proveedor: proveedor };
}

function mpGsdMaterialPayload_(g, val, existente) {
  var nombre = g.combo || ((g.productoPrincipal ? g.productoPrincipal + " " : "") + (g.marca ? g.marca : "")).trim() || g.codigoHana;
  var descripcion = [g.productoPrincipal, g.combo, g.comentarios].filter(function(t) { return !!t; }).join(" | ") || nombre;
  var incluye = mpGsdNorm_(g.incluyeConexion);
  return {
    idMaterial: (existente && existente.idMaterial) || mpGsdMaterialKey_(g.codigoHana),
    codigoMaterial: (existente && existente.codigoMaterial) || g.codigoHana,
    codigoHana: g.codigoHana,
    codigoSap: g.codigoHana,
    idProducto: (val.producto && (val.producto.id || val.producto.idProducto)) || null,
    idTipoMaterial: (val.tipo && val.tipo.id) || null,
    idSubtipoMaterial: (val.subtipo && (val.subtipo.id || val.subtipo.idSubtipo)) || null,
    idMarca: g.marca || "",
    nombreMaterial: nombre,
    descripcionMaterial: descripcion,
    proveedor: g.proveedor || "",
    incluyeConexion: incluye === "SI" ? "SI" : (incluye === "NO" ? "NO" : (g.incluyeConexion || "")),
    productoPrincipal: g.productoPrincipal || "",
    combo: g.combo || "",
    comentarios: g.comentarios || "",
    unidadMedida: "UND",
    esGasodomestico: false,
    estado: "ACTIVO"
  };
}

function mpGsdStorePending_(kind, pendientes) {
  MP_STATE.gsdPendingSeq = Number(MP_STATE.gsdPendingSeq || 0) + 1;
  var token = "GSDLOCAL-" + kind + "-" + Date.now() + "-" + MP_STATE.gsdPendingSeq;
  MP_STATE.gsdPending = MP_STATE.gsdPending || {};
  MP_STATE.gsdPending[token] = { kind: kind, pendientes: pendientes, creadoEn: Date.now() };
  return token;
}

function mpGsdTakePending_(token) {
  var store = MP_STATE.gsdPending || {};
  return store[String(token || "")] || null;
}

function mpGsdDropPending_(token) {
  try { delete MP_STATE.gsdPending[String(token || "")]; } catch (ignore) {}
}

function mpGsdMaskFee_(texto) {
  if (!isMpProviderUser_()) return texto;
  return "(oculto para proveedor)";
}

function mpGsdDictRows_(opts) {
  var rows = [["CATEGORIA", "CODIGO", "NOMBRE", "REFERENCIA"]];
  (opts.negocios || []).forEach(function(x) { rows.push(["NEGOCIO", x.id || "", x.nombre || "", "GSD"]); });
  (opts.productos || []).forEach(function(x) { rows.push(["PRODUCTO_PRINCIPAL", x.id || "", x.nombre || "", x.idNegocio || ""]); });
  (opts.tipos || []).forEach(function(x) { rows.push(["TIPO", x.id || "", x.nombre || "", ""]); });
  (opts.subtipos || []).forEach(function(x) { rows.push(["SUBTIPO", x.id || "", x.nombre || "", x.idTipoMaterial || x.idProducto || ""]); });
  (opts.marcas || []).forEach(function(x) { rows.push(["MARCA", x.id || "", x.nombre || "", ""]); });
  (opts.proveedores || []).forEach(function(x) { rows.push(["PROVEEDOR", x.id || x.idProveedor || "", x.nombre || "", ""]); });
  rows.push(["NOTA", "", "FEE oculto al rol PROVEEDOR. Vigencia mensual día 1 → fin de mes.", ""]);
  rows.push(["NOTA", "", "Se ignoran N°, cuotas por plazo y columnas * original.", ""]);
  return rows;
}

function mpGsdBuildMaterialWorkbook_(opts) {
  // AGENTE 2C: encabezados exactos del formato GSD (10 columnas) + anchos razonables.
  var headers = ["N°", "PROVEEDOR", "MARCA", "TIPO", "SUBTIPO", "INCLUYE CONEXIÓN", "CODIGO HANA", "PRODUCTO PRINCIPAL", "COMBO", "COMENTARIOS"];
  var anchos = [6, 22, 18, 18, 18, 18, 18, 28, 32, 36];
  var ejemplo = ["", "EJEMPLO Proveedor", "EJEMPLO Marca", "EJEMPLO Tipo", "EJEMPLO Subtipo", "SI", "EJEMPLO-BORRAR-ESTA-FILA", "EJEMPLO Producto", "EJEMPLO Combo", "Fila de ejemplo: bórrala"];
  var wb = window.XLSX.utils.book_new();
  var ws = window.XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws["!cols"] = anchos.map(function(wch) { return { wch: wch }; });
  window.XLSX.utils.book_append_sheet(wb, ws, "CARGA_MATERIALES");
  var wsDict = window.XLSX.utils.aoa_to_sheet(mpGsdDictRows_(opts || {}));
  wsDict["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 40 }, { wch: 30 }];
  window.XLSX.utils.book_append_sheet(wb, wsDict, "DICCIONARIOS");
  return wb;
}

function mpGsdBuildPricesWorkbook_(opts) {
  // Plantilla de precios: 6 columnas exactas; vigencia mensual como ejemplo.
  var headers = ["CODIGO_HANA", "PROVEEDOR", "PRECIO", "FEE", "FECHA_INICIO", "FECHA_FIN"];
  var anchos = [18, 22, 14, 10, 14, 14];
  var vigencia = mpGsdMonthRange_();
  var ejemplo = ["EJEMPLO-BORRAR-ESTA-FILA", "EJEMPLO Proveedor", 100, 10, vigencia.inicio, vigencia.fin];
  var wb = window.XLSX.utils.book_new();
  var ws = window.XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws["!cols"] = anchos.map(function(wch) { return { wch: wch }; });
  window.XLSX.utils.book_append_sheet(wb, ws, "CARGA_PRECIOS");
  var wsDict = window.XLSX.utils.aoa_to_sheet(mpGsdDictRows_(opts || {}));
  wsDict["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 40 }, { wch: 30 }];
  window.XLSX.utils.book_append_sheet(wb, wsDict, "DICCIONARIOS");
  return wb;
}

function mpGsdWorkbookFile_(workbook, nombreArchivo) {
  var bytes = window.XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  if (!blob.size) throw new Error("La plantilla XLSX generada está vacía.");
  return { blob: blob, url: URL.createObjectURL(blob), nombreArchivo: nombreArchivo, tamanoBytes: blob.size, preparadaEn: Date.now(), local: true };
}
function mpGsdPlantillaMaterialLocal_() {
  try {
    if (!window.XLSX) return null;
    var opts = MP_STATE.options || getMpEmptyOptions();
    if (!opts || !opts.negocios || !opts.negocios.length) return null;
    return mpGsdWorkbookFile_(mpGsdBuildMaterialWorkbook_(opts), "Plantilla_Carga_Materiales_GSD.xlsx");
  } catch (ignore) {
    return null;
  }
}

function mpGsdPlantillaPreciosLocal_() {
  try {
    if (!window.XLSX) return null;
    var opts = MP_STATE.options || getMpEmptyOptions();
    if (!opts || !opts.proveedores) return null;
    return mpGsdWorkbookFile_(mpGsdBuildPricesWorkbook_(opts), "Plantilla_Carga_Precios_GSD.xlsx");
  } catch (ignore) {
    return null;
  }
}
/* GSD-EXCEL-FIN */

function base64ToBlobMateriales_(base64, mimeType) {
    const texto = String(base64 || "").replace(/\s/g, "");
    if (!texto) {
      throw new Error("La descarga no contiene datos binarios.");
    }

    // Se procesa por bloques para evitar crear una cadena binaria gigante
    // cuando la plantilla crezca por sus diccionarios.
    const tamanoBloqueBase64 = 524288; // múltiplo de 4
    const partes = [];

    for (let inicio = 0; inicio < texto.length; inicio += tamanoBloqueBase64) {
      const bloque = texto.slice(inicio, inicio + tamanoBloqueBase64);
      const binario = atob(bloque);
      const bytes = new Uint8Array(binario.length);

      for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
      }

      partes.push(bytes);
    }

    return new Blob(partes, {
      type: mimeType || "application/octet-stream"
    });
  }

function downloadBinaryResult(result) {
    result = result || {};

    if (result.correcto === false) {
      throw new Error(result.mensaje || "No fue posible preparar la descarga.");
    }

    const blob = base64ToBlobMateriales_(
      result.contenidoBase64,
      result.mimeType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (!blob.size) {
      throw new Error("El archivo generado está vacío.");
    }

    const nombre = result.nombreArchivo || "descarga.xlsx";

    if (
      window.navigator &&
      typeof window.navigator.msSaveOrOpenBlob === "function"
    ) {
      window.navigator.msSaveOrOpenBlob(blob, nombre);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nombre;
    // HTML Service se ejecuta dentro de un iframe sandbox. Google requiere que
    // los enlaces naveguen con target _top o _blank. _blank mantiene la app abierta.
    link.target = "_blank";
    link.rel = "noopener";
    link.style.position = "fixed";
    link.style.left = "-9999px";
    link.setAttribute("aria-hidden", "true");

    document.body.appendChild(link);

    try {
      link.click();
    } catch (errorClick) {
      try {
        window.open(url, "_blank", "noopener");
      } catch (errorPopup) {
        URL.revokeObjectURL(url);
        link.remove();
        throw errorClick;
      }
    }

    // Se conserva el Blob URL suficiente tiempo para que Chrome/Edge terminen
    // de procesarlo aun dentro del iframe de Apps Script.
    setTimeout(function() {
      try { link.remove(); } catch (error) {}
      try { URL.revokeObjectURL(url); } catch (error) {}
    }, 30000);
  }