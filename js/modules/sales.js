const SALES_STATE = {
    module: null,
    context: null,
    activeView: "REGISTRADAS",
    filters: { texto: "", estado: "TODOS", estadoAbono: "TODOS", segmentoRegistro: "COMERCIAL", fechaDesde: "", fechaHasta: "", pagina: 1, tamano: 50, vista: "REGISTRADAS" },
    rows: [],
    pagination: null,
    cart: [],
    offers: [],
    offerFilters: null,
    offerRequestToken: 0,
    offerContextCache: {},
    offerContextKey: "",
    offerContextLoadedAt: 0,
    editing: null,
    currentBusiness: "",
    deliveryDetail: null,
    detailCache: {},
    viewCache: {},
    viewFilters: {},
    syncRevision: "",
    syncCheckPromise: null,
    lastSyncCheckAt: 0,
    listRequestToken: 0,

    contextLoadedAt: 0,
    fullContextLoadedAt: 0,
    fullContextPromise: null,

    modalRequestToken: 0,
    activeModalToken: 0,
    activeModalKey: "",

    indexRefreshPromise: null,
    lastIndexRefreshAt: 0,

    modalWarmupTimer: null,
    modalWarmupKey: "",
    modalWarmupPromise: null,

    viewsPrefetchTimer: null,
    viewsPrefetchPromise: null,
    viewsPrefetchKey: "",
    viewsPrefetchLoadedAt: 0,
    viewsPrefetchToken: 0
  };


  function prepareSalesModal29W_(key) {
    const token =
      ++SALES_STATE.modalRequestToken;

    SALES_STATE.activeModalToken =
      token;

    SALES_STATE.activeModalKey =
      String(key || "");

    return token;
  }

  function isSalesModalCurrent29W_(
    token,
    key
  ) {
    const root =
      document.getElementById(
        "modalRoot"
      );

    return Boolean(
      root &&
      root.hidden !== true &&
      Number(
        SALES_STATE.activeModalToken
      ) === Number(token) &&
      (
        !key ||
        SALES_STATE.activeModalKey ===
          String(key)
      )
    );
  }

  function closeSalesModal29W_() {
    ++SALES_STATE.modalRequestToken;

    SALES_STATE.activeModalToken =
      SALES_STATE.modalRequestToken;

    SALES_STATE.activeModalKey = "";

    closeModal();
  }

  function salesModalLoadingBody29W_(
    title,
    subtitle
  ) {
    return (
      '<div class="sales-modal-shell">' +
        '<div class="sales29-modal-loading">' +
          '<span class="material-symbols-rounded">progress_activity</span>' +
          '<div>' +
            '<strong>' +
              escapeHtml(
                title ||
                "Cargando información"
              ) +
            '</strong>' +
            '<span>' +
              escapeHtml(
                subtitle ||
                "Espera un momento."
              ) +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /**
   * El inicio del módulo usa contexto ligero.
   * La estructura comercial completa se obtiene únicamente cuando
   * Nueva venta / Modificar realmente la necesitan.
   */
  function ensureSalesFormContext29W_(
    force
  ) {
    const now = Date.now();

    if (
      !force &&
      SALES_STATE.context &&
      SALES_STATE.context.contextoCompleto === true &&
      now -
        Number(
          SALES_STATE.fullContextLoadedAt || 0
        ) <
        300000
    ) {
      return Promise.resolve(
        SALES_STATE.context
      );
    }

    if (
      !force &&
      SALES_STATE.fullContextPromise
    ) {
      return SALES_STATE.fullContextPromise;
    }

    SALES_STATE.fullContextPromise =
      secureRpc(
        "obtenerContextoVentasContadoModulo",
        [{
          vista:
            SALES_STATE.activeView ||
            "REGISTRADAS",
          incluirListadoInicial: false,
          modoLigero: false
        }],
        "VENTAS_CONTADO"
      )
      .then(function(full) {
        SALES_STATE.context =
          Object.assign(
            {},
            SALES_STATE.context || {},
            full || {}
          );

        SALES_STATE.context.contextoCompleto =
          true;

        SALES_STATE.fullContextLoadedAt =
          Date.now();

        return SALES_STATE.context;
      })
      .finally(function() {
        SALES_STATE.fullContextPromise =
          null;
      });

    return SALES_STATE.fullContextPromise;
  }

  function prefetchSalesFormContext29W_() {
    const p =
      SALES_STATE.context &&
      SALES_STATE.context.permisos ||
      {};

    if (
      !p.puedeRegistrar &&
      !p.puedeEditar
    ) {
      return;
    }

    window.setTimeout(function() {
      ensureSalesFormContext29W_(
        false
      ).catch(function() {});
    }, 250);
  }

  function openCashSalesWorkspace(module) {
    const puedeReusar =
      Boolean(
        SALES_STATE.context &&
        Date.now() -
          Number(
            SALES_STATE.contextLoadedAt || 0
          ) <
          120000
      );

    SALES_STATE.module = module;
    SALES_STATE.activeView =
      "REGISTRADAS";

    SALES_STATE.filters = {
      texto: "",
      estado: "TODOS",
      estadoAbono: "TODOS",
      segmentoRegistro: "COMERCIAL",
      fechaDesde: "",
      fechaHasta: "",
      pagina: 1,
      tamano: 50,
      vista: "REGISTRADAS"
    };

    SALES_STATE.cart = [];
    SALES_STATE.editing = null;
    SALES_STATE.offers = [];
    SALES_STATE.offerFilters = null;
    SALES_STATE.offerRequestToken = 0;
    SALES_STATE.offerContextCache = {};
    SALES_STATE.offerContextKey = "";
    SALES_STATE.offerContextLoadedAt = 0;
    SALES_STATE.deliveryDetail = null;

    if (!puedeReusar) {
      SALES_STATE.detailCache = {};
      SALES_STATE.viewCache = {};
      SALES_STATE.viewFilters = {};
      SALES_STATE.syncRevision = "";
      SALES_STATE.lastSyncCheckAt = 0;

      SALES_STATE.viewsPrefetchKey = "";
      SALES_STATE.viewsPrefetchLoadedAt = 0;
      SALES_STATE.viewsPrefetchToken++;

      if (SALES_STATE.viewsPrefetchTimer) {
        window.clearTimeout(
          SALES_STATE.viewsPrefetchTimer
        );
        SALES_STATE.viewsPrefetchTimer =
          null;
      }

      SALES_STATE.viewsPrefetchPromise =
        null;
    }

    SALES_STATE.syncCheckPromise = null;
    SALES_STATE.listRequestToken = 0;

    prepareSalesModal29W_(
      "WORKSPACE"
    );

    setActiveView(
      "dynamicModuleView"
    );

    setModuleHeading(
      module.grupoMenu || "VENTAS",
      module.nombre || "Ventas al contado"
    );

    renderCashSalesFrame();

    if (
      puedeReusar &&
      SALES_STATE.context
    ) {
      const p =
        SALES_STATE.context.permisos || {};

      SALES_STATE.activeView =
        salesFirstAllowedView29M_(p);

      SALES_STATE.filters.vista =
        SALES_STATE.activeView;

      renderSalesWarnings();
      renderSalesTaskTabs();
      renderSalesListFrame();

      const button =
        document.getElementById(
          "salesNewButton"
        );

      if (button) {
        button.hidden =
          !p.puedeRegistrar;
      }

      const key =
        claveCacheBandejaVentasPaso29G_(
          SALES_STATE.filters
        );

      const cached =
        SALES_STATE.viewCache[key];

      if (cached) {
        mostrarBandejaCacheadaPaso29G_(
          cached
        );

        verificarRevisionVentasPaso29G_(
          false
        )
        .then(function(revision) {
          if (
            !revision ||
            !cached.revision ||
            revision !==
              cached.revision
          ) {
            loadSalesList(
              true,
              { force:true }
            );
          }
        })
        .catch(function() {});
      } else {
        loadSalesList(
          true,
          { force:true }
        );
      }

      prefetchSalesFormContext29W_();
      return;
    }

    loadCashSalesContext(false);
  }


  function refreshCashSalesWorkspace(silent) {
    loadCashSalesContext(Boolean(silent));
  }

  function renderCashSalesFrame() {
    const view = document.getElementById("dynamicModuleView");
    if (!view) return;
    view.innerHTML = '<section class="sales-workspace sales29-workspace">' +
      '<div class="section-header sales-main-header"><div><p class="eyebrow">VENTAS</p><h2>Ventas al contado</h2><p>Registra ventas y atiende cada etapa desde una bandeja según tus permisos.</p></div>' +
      '<div class="toolbar toolbar--end"><button id="salesRefreshButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">refresh</span>Actualizar</button><button id="salesNewButton" class="button button--primary" type="button"><span class="material-symbols-rounded">add_shopping_cart</span>Nueva venta</button></div></div>' +
      '<div id="salesContextWarnings"></div>' +
      '<div id="salesTaskTabs" class="sales29-tabs"></div>' +
      '<div class="sales-card"><div id="salesListRegion">' + loadingHtml(5) + '</div></div>' +
      '</section>';
    on("salesRefreshButton", "click", function() {
      invalidarCacheBandejasVentasPaso29G_();
      loadCashSalesContext(false);
    });
    on("salesNewButton", "click", openNewCashSaleModal);
  }

  function loadCashSalesContext(silent) {
    const filtros =
      Object.assign(
        {},
        SALES_STATE.filters,
        {
          vista:
            SALES_STATE.activeView,
          incluirListadoInicial: true,
          modoLigero: true
        }
      );

    const region =
      document.getElementById(
        "salesListRegion"
      );

    if (region && !silent) {
      region.innerHTML =
        '<div class="sales29-module-loading">' +
          '<span class="material-symbols-rounded">progress_activity</span>' +
          '<div><strong>Cargando Ventas</strong><span>Preparando bandeja y permisos…</span></div>' +
        '</div>';
    }

    secureRpc(
      "obtenerContextoVentasContadoModulo",
      [filtros],
      "VENTAS_CONTADO"
    )
      .then(function(ctx) {
        SALES_STATE.context =
          ctx || {};

        SALES_STATE.contextLoadedAt =
          Date.now();

        SALES_STATE.syncRevision =
          String(
            ctx.revisionDatos ||
            SALES_STATE.syncRevision ||
            ""
          );

        const p =
          SALES_STATE.context.permisos ||
          {};

        SALES_STATE.activeView =
          String(
            ctx.vistaInicial ||
            salesFirstAllowedView29M_(p) ||
            ""
          );

        SALES_STATE.filters.vista =
          SALES_STATE.activeView;

        renderSalesWarnings();
        renderSalesTaskTabs();
        renderSalesListFrame();

        const button =
          document.getElementById(
            "salesNewButton"
          );

        if (button) {
          button.hidden =
            !p.puedeRegistrar;

          button.addEventListener(
            "mouseenter",
            function() {
              ensureSalesFormContext29W_(
                false
              ).catch(function() {});
            },
            { once:true }
          );

          button.addEventListener(
            "focus",
            function() {
              ensureSalesFormContext29W_(
                false
              ).catch(function() {});
            },
            { once:true }
          );
        }

        if (
          ctx.listadoInicial &&
          SALES_STATE.activeView
        ) {
          const filtrosInicio =
            Object.assign(
              {},
              SALES_STATE.filters,
              {
                vista:
                  SALES_STATE.activeView
              }
            );

          renderSalesListResult(
            ctx.listadoInicial,
            {
              view:
                SALES_STATE.activeView,
              filters:
                filtrosInicio
            }
          );
        } else if (
          SALES_STATE.activeView
        ) {
          loadSalesList(
            true,
            { force:true }
          );
        } else {
          const target =
            document.getElementById(
              "salesListRegion"
            );

          if (target) {
            target.innerHTML =
              '<div class="empty-state">' +
                '<span class="material-symbols-rounded">lock</span>' +
                '<strong>Sin bandejas asignadas</strong>' +
                '<p>Tienes acceso al módulo, pero no cuentas con permisos para Ver ventas, Validar abono o Gestionar entrega.</p>' +
              '</div>';
          }
        }

        markSync();
        prefetchSalesFormContext29W_();

        if (!silent) {
          // El módulo ya comunica el progreso dentro de la propia vista.
          // Se evita un toast adicional en cada apertura.
        }
      })
      .catch(function(error) {
        const target =
          document.getElementById(
            "salesListRegion"
          );

        const message =
          errorMessage(error);

        if (target) {
          target.innerHTML =
            '<div class="empty-state">' +
              '<span class="material-symbols-rounded">error</span>' +
              '<strong>No fue posible cargar Ventas</strong>' +
              '<p>' +
                escapeHtml(message) +
              '</p>' +
              '<button id="salesRetryContext29W" class="button button--primary" type="button">' +
                '<span class="material-symbols-rounded">refresh</span>Reintentar' +
              '</button>' +
            '</div>';

          on(
            "salesRetryContext29W",
            "click",
            function() {
              renderCashSalesFrame();
              loadCashSalesContext(false);
            }
          );
        }

        toast(
          "No se pudo abrir Ventas",
          message,
          true
        );
      });
  }


  function renderSalesWarnings() {
    const target = document.getElementById("salesContextWarnings");
    if (!target) return;
    const warnings = SALES_STATE.context && SALES_STATE.context.comercial && SALES_STATE.context.comercial.advertencias || [];
    target.innerHTML = warnings.map(function(x){ return '<div class="sales-warning">' + escapeHtml(x) + '</div>'; }).join("");
  }


  function salesCanOpenView29M_(view, permisos) {
    const p = permisos ||
      (
        SALES_STATE.context &&
        SALES_STATE.context.permisos
      ) ||
      {};

    const v = String(
      view || "REGISTRADAS"
    ).toUpperCase();

    if (v === "ABONOS") {
      return p.puedeValidarAbono === true;
    }

    if (v === "ENTREGAS") {
      return p.puedeGestionarEntrega === true;
    }

    return p.puedeListar === true;
  }

  function salesFirstAllowedView29M_(permisos) {
    const p = permisos || {};

    if (p.puedeListar) return "REGISTRADAS";
    if (p.puedeValidarAbono) return "ABONOS";
    if (p.puedeGestionarEntrega) return "ENTREGAS";

    return "";
  }

  function renderSalesTaskTabs() {
    const target = document.getElementById("salesTaskTabs");
    if (!target) return;
    const p =
      SALES_STATE.context &&
      SALES_STATE.context.permisos || {};

    const tabs = [];

    if (p.puedeListar) {
      tabs.push({
        id:"REGISTRADAS",
        label:"Ventas registradas",
        icon:"receipt_long"
      });
    }

    if (p.puedeValidarAbono) {
      tabs.push({
        id:"ABONOS",
        label:"Validación de abonos",
        icon:"payments"
      });
    }

    if (p.puedeGestionarEntrega) {
      tabs.push({
        id:"ENTREGAS",
        label:"Gestión de entregas",
        icon:"local_shipping"
      });
    }
    target.innerHTML = tabs.map(function(tab){
      return '<button type="button" class="sales29-tab ' + (tab.id === SALES_STATE.activeView ? 'is-active' : '') + '" data-sales-view="' + tab.id + '"><span class="material-symbols-rounded">' + tab.icon + '</span>' + escapeHtml(tab.label) + '</button>';
    }).join("");
    target.querySelectorAll('[data-sales-view]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const siguiente =
          btn.dataset.salesView || "REGISTRADAS";

        if (
          !salesCanOpenView29M_(
            siguiente,
            SALES_STATE.context &&
            SALES_STATE.context.permisos
          )
        ) {
          toast(
            "Sin permiso",
            "No tienes permiso para ingresar a esta bandeja.",
            true
          );
          return;
        }

        if (siguiente === SALES_STATE.activeView) return;

        cambiarBandejaVentasPaso29G_(
          siguiente
        );
      });
    });
  }

  function filtrosBaseBandejaVentasPaso29G_(vista) {
    const guardados = SALES_STATE.viewFilters[vista];
    if (guardados) return Object.assign({}, guardados, { vista: vista });

    return {
      texto: "",
      estado: "TODOS",
      estadoAbono: "TODOS",
      segmentoRegistro: "COMERCIAL",
      fechaDesde: "",
      fechaHasta: "",
      pagina: 1,
      tamano: Number(SALES_STATE.filters.tamano || 50),
      vista: vista
    };
  }

  function claveCacheBandejaVentasPaso29G_(filtros) {
    filtros = filtros || {};
    return [
      String(filtros.vista || SALES_STATE.activeView || "REGISTRADAS"),
      String(filtros.texto || ""),
      String(filtros.estado || "TODOS"),
      String(filtros.estadoAbono || "TODOS"),
      String(filtros.segmentoRegistro || "COMERCIAL"),
      String(filtros.fechaDesde || ""),
      String(filtros.fechaHasta || ""),
      Number(filtros.pagina || 1),
      Number(filtros.tamano || 50)
    ].join("|");
  }

  function guardarFiltrosBandejaActualPaso29G_() {
    try { collectSalesFilters(); } catch (error) {}
    SALES_STATE.viewFilters[SALES_STATE.activeView] =
      Object.assign({}, SALES_STATE.filters);
  }

  function invalidarCacheBandejasVentasPaso29G_() {
    SALES_STATE.viewCache = {};
    SALES_STATE.syncRevision = "";

    SALES_STATE.viewsPrefetchKey = "";
    SALES_STATE.viewsPrefetchLoadedAt = 0;
    SALES_STATE.viewsPrefetchToken++;

    if (SALES_STATE.viewsPrefetchTimer) {
      window.clearTimeout(
        SALES_STATE.viewsPrefetchTimer
      );

      SALES_STATE.viewsPrefetchTimer =
        null;
    }

    // Una respuesta anterior puede continuar viajando, pero su token
    // quedará inválido y no podrá reinsertar información obsoleta.
    SALES_STATE.viewsPrefetchPromise =
      null;
  }

  function verificarRevisionVentasPaso29G_(forzar) {
    const ahora = Date.now();

    if (
      !forzar &&
      SALES_STATE.syncRevision &&
      ahora - Number(SALES_STATE.lastSyncCheckAt || 0) < 15000
    ) {
      return Promise.resolve(SALES_STATE.syncRevision);
    }

    if (SALES_STATE.syncCheckPromise) return SALES_STATE.syncCheckPromise;

    SALES_STATE.syncCheckPromise = secureRpc(
      "obtenerEstadoSincronizacionMotor",
      [],
      "VENTAS_CONTADO"
    ).then(function(estado) {
      SALES_STATE.lastSyncCheckAt = Date.now();
      SALES_STATE.syncRevision = String(
        estado && estado.revision || SALES_STATE.syncRevision || ""
      );
      return SALES_STATE.syncRevision;
    }).finally(function() {
      SALES_STATE.syncCheckPromise = null;
    });

    return SALES_STATE.syncCheckPromise;
  }

  function mostrarBandejaCacheadaPaso29G_(cache) {
    if (!cache || !cache.resultado) return false;
    renderSalesListResult(cache.resultado, {
      view: SALES_STATE.activeView,
      filters: Object.assign({}, SALES_STATE.filters),
      skipCache: true
    });
    return true;
  }


  function salesAllowedViewsPaso30B_() {
    const p =
      SALES_STATE.context &&
      SALES_STATE.context.permisos ||
      {};

    const vistas = [];

    if (p.puedeListar) {
      vistas.push("REGISTRADAS");
    }

    if (p.puedeValidarAbono) {
      vistas.push("ABONOS");
    }

    if (p.puedeGestionarEntrega) {
      vistas.push("ENTREGAS");
    }

    return vistas;
  }

  function salesFiltersAreBasePaso30B_(
    filtros
  ) {
    filtros = filtros || {};

    return (
      !String(
        filtros.texto || ""
      ).trim() &&
      String(
        filtros.estado || "TODOS"
      ).toUpperCase() === "TODOS" &&
      String(
        filtros.estadoAbono || "TODOS"
      ).toUpperCase() === "TODOS" &&
      !String(
        filtros.fechaDesde || ""
      ).trim() &&
      !String(
        filtros.fechaHasta || ""
      ).trim() &&
      Number(
        filtros.pagina || 1
      ) === 1
    );
  }

  function salesBaseFiltersPaso30B_(
    vista,
    segmento,
    tamano
  ) {
    return {
      texto: "",
      estado: "TODOS",
      estadoAbono: "TODOS",
      segmentoRegistro:
        segmento || "COMERCIAL",
      fechaDesde: "",
      fechaHasta: "",
      pagina: 1,
      tamano:
        Number(tamano || 50),
      vista:
        String(
          vista || "REGISTRADAS"
        ).toUpperCase()
    };
  }

  function salesViewsPrefetchKeyPaso30B_(
    segmento,
    tamano
  ) {
    return [
      String(
        segmento || "COMERCIAL"
      ).toUpperCase(),
      Number(tamano || 50),
      String(
        SALES_STATE.syncRevision || ""
      ),
      salesAllowedViewsPaso30B_()
        .join(",")
    ].join("|");
  }

  function guardarPrecargaBandejasPaso30B_(
    respuesta,
    segmento,
    tamano
  ) {
    respuesta =
      respuesta || {};

    const revision =
      String(
        respuesta.revisionDatos ||
        SALES_STATE.syncRevision ||
        ""
      );

    if (revision) {
      SALES_STATE.syncRevision =
        revision;
    }

    // La llamada batch constituye una verificación actual del índice.
    // Esto evita otra llamada de revisión al cambiar de pestaña enseguida.
    SALES_STATE.lastSyncCheckAt =
      Date.now();

    const bandejas =
      respuesta.bandejas || {};

    Object.keys(bandejas)
      .forEach(function(vista) {
        const filtros =
          salesBaseFiltersPaso30B_(
            vista,
            segmento,
            tamano
          );

        const key =
          claveCacheBandejaVentasPaso29G_(
            filtros
          );

        const resultado =
          bandejas[vista] || {};

        const revisionVista =
          String(
            resultado.revisionDatos ||
            revision ||
            ""
          );

        SALES_STATE.viewCache[key] = {
          resultado:
            resultado,
          revision:
            revisionVista,
          guardadoEn:
            Date.now(),
          precargado:
            true
        };

        if (
          !SALES_STATE.viewFilters[vista]
        ) {
          SALES_STATE.viewFilters[vista] =
            Object.assign(
              {},
              filtros
            );
        }
      });

    const calientes =
      respuesta.detallesCalientes ||
      {};

    Object.keys(calientes)
      .forEach(function(vista) {
        const porVenta =
          calientes[vista] || {};

        Object.keys(porVenta)
          .forEach(function(idVenta) {
            const key =
              salesDetailCacheKey29M_(
                idVenta,
                vista
              );

            SALES_STATE.detailCache[key] = {
              data:
                porVenta[idVenta],
              time:
                Date.now(),
              precargado:
                true
            };
          });
      });

    SALES_STATE.viewsPrefetchLoadedAt =
      Date.now();

    if (
      respuesta.indiceDesactualizado ===
      true
    ) {
      scheduleSalesIndexRefresh29Y_({
        indiceDesactualizado: true
      });
    }

    return respuesta;
  }

  function runSalesViewsPrefetchPaso30B_(
    filtros,
    force
  ) {
    filtros =
      filtros || SALES_STATE.filters || {};

    const vistas =
      salesAllowedViewsPaso30B_();

    if (vistas.length <= 1) {
      return Promise.resolve(null);
    }

    if (
      !salesFiltersAreBasePaso30B_(
        filtros
      )
    ) {
      return Promise.resolve(null);
    }

    const segmento =
      String(
        filtros.segmentoRegistro ||
        "COMERCIAL"
      ).toUpperCase();

    const tamano =
      Number(
        filtros.tamano || 50
      );

    const key =
      salesViewsPrefetchKeyPaso30B_(
        segmento,
        tamano
      );

    if (
      !force &&
      SALES_STATE.viewsPrefetchKey ===
        key &&
      Date.now() -
        Number(
          SALES_STATE.viewsPrefetchLoadedAt ||
          0
        ) <
        60000
    ) {
      return Promise.resolve(null);
    }

    if (
      !force &&
      SALES_STATE.viewsPrefetchPromise &&
      SALES_STATE.viewsPrefetchKey ===
        key
    ) {
      return SALES_STATE
        .viewsPrefetchPromise;
    }

    const token =
      ++SALES_STATE.viewsPrefetchToken;

    SALES_STATE.viewsPrefetchKey =
      key;

    const promise =
      secureRpc(
        "precargarBandejasVentasContadoModulo",
        [{
          segmentoRegistro:
            segmento,
          tamano:
            tamano,
          incluirDetalles:
            true
        }],
        "VENTAS_CONTADO"
      )
      .then(function(respuesta) {
        if (
          token !==
          SALES_STATE.viewsPrefetchToken
        ) {
          return null;
        }

        return guardarPrecargaBandejasPaso30B_(
          respuesta,
          segmento,
          tamano
        );
      })
      .catch(function() {
        return null;
      })
      .finally(function() {
        if (
          SALES_STATE.viewsPrefetchPromise ===
          promise
        ) {
          SALES_STATE.viewsPrefetchPromise =
            null;
        }
      });

    SALES_STATE.viewsPrefetchPromise =
      promise;

    return promise;
  }

  function scheduleSalesViewsPrefetchPaso30B_(
    filtros
  ) {
    if (
      SALES_STATE.viewsPrefetchTimer
    ) {
      window.clearTimeout(
        SALES_STATE.viewsPrefetchTimer
      );
    }

    const snapshot =
      Object.assign(
        {},
        filtros ||
        SALES_STATE.filters ||
        {}
      );

    if (
      !salesFiltersAreBasePaso30B_(
        snapshot
      )
    ) {
      return;
    }

    SALES_STATE.viewsPrefetchTimer =
      window.setTimeout(
        function() {
          SALES_STATE.viewsPrefetchTimer =
            null;

          runSalesViewsPrefetchPaso30B_(
            snapshot,
            false
          );
        },
        150
      );
  }

  function cargarBandejaSiCambioPaso29G_() {
    const filtros =
      Object.assign(
        {},
        SALES_STATE.filters,
        {
          vista:
            SALES_STATE.activeView
        }
      );

    const clave =
      claveCacheBandejaVentasPaso29G_(
        filtros
      );

    const cache =
      SALES_STATE.viewCache[clave] ||
      null;

    if (!cache) {
      if (
        salesFiltersAreBasePaso30B_(
          filtros
        ) &&
        salesAllowedViewsPaso30B_()
          .length > 1
      ) {
        const vistaEsperada =
          SALES_STATE.activeView;

        const claveEsperada =
          clave;

        const table =
          document.getElementById(
            "salesTableRegion"
          );

        if (table) {
          table.innerHTML =
            loadingHtml(3);
        }

        runSalesViewsPrefetchPaso30B_(
          filtros,
          false
        )
          .then(function() {
            if (
              SALES_STATE.activeView !==
                vistaEsperada ||
              claveCacheBandejaVentasPaso29G_(
                SALES_STATE.filters
              ) !== claveEsperada
            ) {
              return;
            }

            const precargada =
              SALES_STATE.viewCache[
                claveEsperada
              ];

            if (precargada) {
              mostrarBandejaCacheadaPaso29G_(
                precargada
              );

              return;
            }

            loadSalesList(
              false,
              { force:true }
            );
          })
          .catch(function() {
            if (
              SALES_STATE.activeView ===
              vistaEsperada
            ) {
              loadSalesList(
                false,
                { force:true }
              );
            }
          });

        return;
      }

      loadSalesList(
        false,
        { force:true }
      );

      return;
    }

    // Stale-while-revalidate:
    // mostrar primero la fotografía ya disponible.
    mostrarBandejaCacheadaPaso29G_(
      cache
    );

    verificarRevisionVentasPaso29G_(
      false
    )
      .then(function(
        revisionActual
      ) {
        if (
          revisionActual &&
          cache.revision &&
          revisionActual ===
            cache.revision
        ) {
          return;
        }

        loadSalesList(
          true,
          { force:true }
        );
      })
      .catch(function() {
        // Si la revalidación falla, conservar la información ya visible.
      });
  }

  function cambiarBandejaVentasPaso29G_(vista) {
    guardarFiltrosBandejaActualPaso29G_();
    SALES_STATE.activeView = vista || "REGISTRADAS";
    SALES_STATE.filters = filtrosBaseBandejaVentasPaso29G_(
      SALES_STATE.activeView
    );
    renderSalesTaskTabs();
    renderSalesListFrame();
    cargarBandejaSiCambioPaso29G_();
  }

  function salesViewTitle() {
    if (SALES_STATE.activeView === "ABONOS") return ["Validación de abonos", "Revisa los comprobantes pendientes u observados. Aprobar lleva la venta a Por entregar."];
    if (SALES_STATE.activeView === "ENTREGAS") return ["Gestión de entregas", "Gestiona únicamente ventas con abono aprobado y registra evidencias u observaciones de entrega."];
    return ["Ventas registradas", "Consulta y modifica ventas. Las tareas de abono y entrega se atienden en sus bandejas específicas."];
  }

  function renderSalesListFrame() {
    const region = document.getElementById("salesListRegion");
    if (!region) return;
    const title = salesViewTitle();
    const estados = SALES_STATE.context && SALES_STATE.context.estados || [];
    const abonos = SALES_STATE.context && SALES_STATE.context.estadosAbono || [];
    const permisos = SALES_STATE.context && SALES_STATE.context.permisos || {};
    const selectorRegistro = permisos.puedeGestionarPruebas
      ? '<label class="input-field"><span>Registros</span><select id="salesFilterRecordType"><option value="COMERCIAL">Ventas comerciales</option><option value="PRUEBA_ACTIVA">Ventas de prueba</option>' +
        (SALES_STATE.activeView === "REGISTRADAS" ? '<option value="PRUEBA_ARCHIVADA">Pruebas archivadas</option>' : '') + '</select></label>'
      : '';
    region.innerHTML = '<div class="sales-list-head"><div><h3>' + escapeHtml(title[0]) + '</h3><p class="sales-muted">' + escapeHtml(title[1]) + '</p></div>' +
      '<div class="toolbar toolbar--end">' + ((SALES_STATE.context && SALES_STATE.context.permisos && SALES_STATE.context.permisos.puedeExportar) ? '<button id="salesExportButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">download</span>Exportar</button>' : '') + '</div></div>' +
      '<div class="toolbar sales-filter-bar">' +
        '<label class="input-field search-field"><span>Buscar</span><input id="salesFilterText" placeholder="Código, cuenta contrato o cliente" value="' + escapeHtml(SALES_STATE.filters.texto || '') + '"></label>' +
        '<label class="input-field"><span>Estado venta</span><select id="salesFilterState"><option value="TODOS">Todos</option>' + estados.map(function(x){ return '<option value="' + escapeHtml(x.codigo) + '">' + escapeHtml(x.nombre) + '</option>'; }).join('') + '</select></label>' +
        '<label class="input-field"><span>Abono</span><select id="salesFilterPayment"><option value="TODOS">Todos</option>' + abonos.map(function(x){ return '<option value="' + escapeHtml(x.codigo) + '">' + escapeHtml(x.nombre) + '</option>'; }).join('') + '</select></label>' +
        selectorRegistro +
        '<label class="input-field"><span>Desde</span><input id="salesFilterFrom" type="date" value="' + escapeHtml(SALES_STATE.filters.fechaDesde || '') + '"></label>' +
        '<label class="input-field"><span>Hasta</span><input id="salesFilterTo" type="date" value="' + escapeHtml(SALES_STATE.filters.fechaHasta || '') + '"></label>' +
        '<button id="salesApplyFilters" class="button button--primary" type="button"><span class="material-symbols-rounded">filter_alt</span>Aplicar</button>' +
      '</div><div id="salesTableRegion">' + loadingHtml(4) + '</div><div id="salesPagination"></div>';
    setSelectValue29("salesFilterState", SALES_STATE.filters.estado);
    setSelectValue29("salesFilterPayment", SALES_STATE.filters.estadoAbono);
    setSelectValue29("salesFilterRecordType", SALES_STATE.filters.segmentoRegistro || "COMERCIAL");
    on("salesApplyFilters", "click", function(){ collectSalesFilters(); SALES_STATE.filters.pagina=1; SALES_STATE.viewFilters[SALES_STATE.activeView]=Object.assign({},SALES_STATE.filters); loadSalesList(false,{force:true}); });
    on("salesExportButton", "click", exportSalesCashXls);
  }

  function setSelectValue29(id, value) { const el=document.getElementById(id); if(el) el.value=value||"TODOS"; }
  function valueSales29(id) { const el=document.getElementById(id); return el ? String(el.value||"").trim() : ""; }

  function collectSalesFilters() {
    SALES_STATE.filters.texto = valueSales29("salesFilterText");
    SALES_STATE.filters.estado = valueSales29("salesFilterState") || "TODOS";
    SALES_STATE.filters.estadoAbono = valueSales29("salesFilterPayment") || "TODOS";
    const puedePruebas = SALES_STATE.context && SALES_STATE.context.permisos && SALES_STATE.context.permisos.puedeGestionarPruebas;
    SALES_STATE.filters.segmentoRegistro = puedePruebas ? (valueSales29("salesFilterRecordType") || SALES_STATE.filters.segmentoRegistro || "COMERCIAL") : "COMERCIAL";
    SALES_STATE.filters.fechaDesde = valueSales29("salesFilterFrom");
    SALES_STATE.filters.fechaHasta = valueSales29("salesFilterTo");
    SALES_STATE.filters.vista = SALES_STATE.activeView;
  }

  function loadSalesList(silent, options) {
    options = options || {};
    collectSalesFilters();

    const requestToken = ++SALES_STATE.listRequestToken;

    const requestFilters = Object.assign({}, SALES_STATE.filters, {
      vista: SALES_STATE.activeView
    });
    const requestView = String(requestFilters.vista || "REGISTRADAS");
    const requestKey = claveCacheBandejaVentasPaso29G_(requestFilters);
    const table = document.getElementById("salesTableRegion");

    if (table && !silent) table.innerHTML = loadingHtml(4);

    secureRpc(
      "listarVentasContadoModulo",
      [requestFilters],
      "VENTAS_CONTADO"
    )
      .then(function(result) {
        if (requestToken !== SALES_STATE.listRequestToken) return;

        result = result || {};
        const revision = String(
          result.revisionDatos || SALES_STATE.syncRevision || ""
        );

        if (revision) SALES_STATE.syncRevision = revision;

        SALES_STATE.viewCache[requestKey] = {
          resultado: result,
          revision: revision,
          guardadoEn: Date.now()
        };
        SALES_STATE.viewFilters[requestView] = Object.assign({}, requestFilters);

        if (
          requestView !== SALES_STATE.activeView ||
          requestKey !== claveCacheBandejaVentasPaso29G_(SALES_STATE.filters)
        ) {
          return;
        }

        renderSalesListResult(result, {
          view: requestView,
          filters: requestFilters,
          skipCache: true
        });
      })
      .catch(function(error){
        if (requestToken !== SALES_STATE.listRequestToken) return;

        if(table) {
          table.innerHTML =
            '<div class="empty-state"><strong>No fue posible cargar</strong><p>' +
            escapeHtml(errorMessage(error)) +
            '</p></div>';
        }
        toast("No se pudo cargar", errorMessage(error), true);
      });
  }


  function scheduleSalesIndexRefresh29Y_(
    result
  ) {
    result = result || {};

    if (
      result.indiceDesactualizado !==
      true
    ) {
      return;
    }

    const now =
      Date.now();

    if (
      SALES_STATE.indexRefreshPromise ||
      (
        now -
        Number(
          SALES_STATE.lastIndexRefreshAt ||
          0
        ) <
        20000
      )
    ) {
      return;
    }

    SALES_STATE.lastIndexRefreshAt =
      now;

    SALES_STATE.indexRefreshPromise =
      secureRpc(
        "refrescarIndiceVentasContadoModulo",
        [],
        "VENTAS_CONTADO"
      )
      .then(function(response) {
        if (
          response &&
          response.actualizado
        ) {
          invalidarCacheBandejasVentasPaso29G_();

          return loadSalesList(
            true,
            { force:true }
          );
        }

        return null;
      })
      .catch(function() {
        return null;
      })
      .finally(function() {
        SALES_STATE.indexRefreshPromise =
          null;
      });
  }

  function scheduleSalesModalWarmup29Y_() {
    if (
      SALES_STATE.modalWarmupTimer
    ) {
      window.clearTimeout(
        SALES_STATE.modalWarmupTimer
      );
    }

    const vistaProgramada =
      String(
        SALES_STATE.activeView ||
        "REGISTRADAS"
      ).toUpperCase();

    SALES_STATE.modalWarmupTimer =
      window.setTimeout(
        function() {
          SALES_STATE.modalWarmupTimer =
            null;

          if (
            String(
              SALES_STATE.activeView ||
              "REGISTRADAS"
            ).toUpperCase() !==
            vistaProgramada
          ) {
            return;
          }

          // Si el batch de bandejas todavía está en curso, esperar su resultado:
          // puede traer hasta 3 detalles calientes por bandeja sin lecturas extra.
          if (
            SALES_STATE.viewsPrefetchPromise
          ) {
            const pendiente =
              SALES_STATE.viewsPrefetchPromise;

            pendiente.finally(function() {
              if (
                String(
                  SALES_STATE.activeView ||
                  "REGISTRADAS"
                ).toUpperCase() ===
                vistaProgramada
              ) {
                scheduleSalesModalWarmup29Y_();
              }
            });

            return;
          }

          const ids =
            (SALES_STATE.rows || [])
              .slice(0, 5)
              .map(function(row) {
                return String(
                  row.idVenta || ""
                ).trim();
              })
              .filter(function(idVenta) {
                if (!idVenta) {
                  return false;
                }

                const key =
                  salesDetailCacheKey29M_(
                    idVenta,
                    vistaProgramada
                  );

                const item =
                  SALES_STATE.detailCache[
                    key
                  ];

                return !(
                  item &&
                  item.data &&
                  Date.now() -
                    Number(
                      item.time || 0
                    ) <
                    60000
                );
              });

          if (!ids.length) {
            return;
          }

          const keyWarmup =
            vistaProgramada +
            "|" +
            ids.join("|") +
            "|" +
            String(
              SALES_STATE.syncRevision ||
              ""
            );

          if (
            SALES_STATE.modalWarmupKey ===
            keyWarmup
          ) {
            return;
          }

          SALES_STATE.modalWarmupKey =
            keyWarmup;

          if (
            SALES_STATE.modalWarmupPromise
          ) {
            return;
          }

          const promise =
            secureRpc(
              "precalentarDetallesVentasContadoModulo",
              [
                ids,
                vistaProgramada
              ],
              "VENTAS_CONTADO"
            )
            .then(function(response) {
              const detalles =
                response &&
                response.detalles ||
                {};

              Object.keys(detalles)
                .forEach(function(
                  idVenta
                ) {
                  const cacheKey =
                    salesDetailCacheKey29M_(
                      idVenta,
                      vistaProgramada
                    );

                  SALES_STATE.detailCache[
                    cacheKey
                  ] = {
                    data:
                      detalles[idVenta],
                    time:
                      Date.now()
                  };
                });
            })
            .catch(function() {})
            .finally(function() {
              if (
                SALES_STATE.modalWarmupPromise ===
                promise
              ) {
                SALES_STATE.modalWarmupPromise =
                  null;
              }
            });

          SALES_STATE.modalWarmupPromise =
            promise;
        },
        650
      );
  }

  function renderSalesListResult(result, meta) {
    result = result || {};
    meta = meta || {};

    const view = String(meta.view || SALES_STATE.activeView || "REGISTRADAS");
    const filters = Object.assign({}, meta.filters || SALES_STATE.filters, {
      vista: view
    });

    if (!meta.skipCache) {
      const key = claveCacheBandejaVentasPaso29G_(filters);
      const revision = String(
        result.revisionDatos || SALES_STATE.syncRevision || ""
      );
      SALES_STATE.viewCache[key] = {
        resultado: result,
        revision: revision,
        guardadoEn: Date.now()
      };
      SALES_STATE.viewFilters[view] = Object.assign({}, filters);
      if (revision) SALES_STATE.syncRevision = revision;
    }

    if (view !== SALES_STATE.activeView) return;

    SALES_STATE.rows = result.registros || result.items || [];
    SALES_STATE.pagination = result.paginacion || {
      pagina: result.pagina || 1,
      totalPaginas: result.totalPaginas || 1,
      total: result.total ||
        (result.resumen && result.resumen.total) ||
        SALES_STATE.rows.length
    };
    renderSalesTable29(SALES_STATE.rows);
    renderSalesPagination29();

    scheduleSalesIndexRefresh29Y_(
      result
    );

    // First paint primero; bandejas secundarias después.
    scheduleSalesViewsPrefetchPaso30B_(
      filters
    );

    scheduleSalesModalWarmup29Y_();
  }


  function salesRecordTypeCode29T(item) {
    item = item || {};

    return (
      String(
        item.tipoRegistro ||
        "COMERCIAL"
      )
        .trim()
        .toUpperCase() === "PRUEBA"
        ? "PRUEBA"
        : "COMERCIAL"
    );
  }

  function salesRecordTypeBadge29T(item, compact) {
    item=item||{};
    const tipo=salesRecordTypeCode29T(item);
    if(tipo!=="PRUEBA") return compact?"":'<span class="status-pill is-success">Venta comercial</span>';
    const archivada=String(item.estadoPrueba||"").toUpperCase()==="ARCHIVADA";
    return '<span class="status-pill '+(archivada?'is-muted':'is-info')+'">'+(archivada?'Prueba archivada':'Venta de prueba')+'</span>';
  }

  function salesRecordTypeNotice29T(item) {
    item=item||{};
    if(String(item.tipoRegistro||"COMERCIAL").toUpperCase()!=="PRUEBA") return "";
    const archivada=String(item.estadoPrueba||"").toUpperCase()==="ARCHIVADA";
    return '<div class="sales29-test-banner '+(archivada?'is-archived':'')+'"><span class="material-symbols-rounded">'+(archivada?'inventory_2':'science')+'</span><div><strong>'+(archivada?'Venta de prueba archivada':'Venta de prueba')+'</strong><span>'+(archivada?'Este registro se conserva únicamente como historial y no participa en las bandejas activas.':'Este registro está separado de la operación comercial y solo es visible para usuarios autorizados para pruebas.')+'</span></div></div>';
  }

  function renderSalesTable29(rows) {
    const region = document.getElementById("salesTableRegion");
    if (!region) return;
    if (!rows || !rows.length) { region.innerHTML='<div class="empty-state"><span class="material-symbols-rounded">inbox</span><strong>Sin registros</strong><p>No hay ventas para los filtros seleccionados.</p></div>'; return; }
    region.innerHTML = '<div class="table-wrap"><table class="data-table sales29-table"><thead><tr><th>Código venta</th><th>Fecha</th><th>Tipo</th><th>Cliente (Cuenta contrato)</th><th>Nombre del cliente</th><th>Importe</th><th>Abono</th><th>Estado de venta</th><th>Opciones</th></tr></thead><tbody>' +
      rows.map(function(item){
        const amount = item.importeVisible !== undefined ? item.importeVisible : item.totalVenta;
        const archived=String(item.tipoRegistro||'').toUpperCase()==='PRUEBA' && String(item.estadoPrueba||'').toUpperCase()==='ARCHIVADA';
        return '<tr class="'+(archived?'sales29-row-archived':'')+'"><td><div class="sales29-code-cell"><strong>'+escapeHtml(item.codigoVenta||'')+'</strong>'+salesRecordTypeBadge29T(item,true)+'</div></td><td>'+escapeHtml(item.fechaRegistro||'')+'</td><td>'+escapeHtml(item.nombreTipoVenta||item.tipoVenta||'—')+'</td><td>'+escapeHtml(item.cuentaContrato||'—')+'</td><td>'+escapeHtml(item.nombreCliente||'—')+'</td><td>'+formatSalesMoney(amount,item.moneda)+'</td><td>'+salesPaymentBadge29(item.estadoAbono)+'</td><td>'+salesStatusBadge29(item.estado)+'</td><td>'+renderSalesRowActions29(item)+'</td></tr>';
      }).join('') + '</tbody></table></div>';
    region.querySelectorAll('[data-sales-view-detail]').forEach(function(btn){
      btn.addEventListener('mouseenter', function(){
        getSalesDetailCached29(
          btn.dataset.salesViewDetail,
          false,
          SALES_STATE.activeView
        ).catch(function(){});
      }, { once:true });

      btn.addEventListener('focus', function(){
        getSalesDetailCached29(
          btn.dataset.salesViewDetail,
          false,
          SALES_STATE.activeView
        ).catch(function(){});
      }, { once:true });

      btn.addEventListener('click', function(){
        openSalesDetail29(btn.dataset.salesViewDetail);
      });
    });
    region
      .querySelectorAll(
        '[data-sales-edit]'
      )
      .forEach(function(btn) {
        btn.addEventListener(
          'mouseenter',
          function() {
            getSalesDetailCached29(
              btn.dataset.salesEdit,
              false,
              "REGISTRADAS"
            ).catch(function() {});

            ensureSalesFormContext29W_(
              false
            ).catch(function() {});
          },
          { once:true }
        );

        btn.addEventListener(
          'focus',
          function() {
            getSalesDetailCached29(
              btn.dataset.salesEdit,
              false,
              "REGISTRADAS"
            ).catch(function() {});

            ensureSalesFormContext29W_(
              false
            ).catch(function() {});
          },
          { once:true }
        );

        btn.addEventListener(
          'click',
          function() {
            openEditCashSale29(
              btn.dataset.salesEdit
            );
          }
        );
      });
    region.querySelectorAll('[data-sales-pay]').forEach(function(btn){
      // La bandeja ya contiene cliente, importe, estado y URL del comprobante.
      // No se dispara un RPC pesado antes de abrir la validación.
      btn.addEventListener('click', function(){ openPaymentValidation29(btn.dataset.salesPay); });
    });
    region.querySelectorAll('[data-sales-delivery]').forEach(function(btn){
      btn.addEventListener('mouseenter', function(){ getSalesDetailCached29(btn.dataset.salesDelivery,false,"ENTREGAS").catch(function(){}); }, { once:true });
      btn.addEventListener('click', function(){ openDeliveryManagement29(btn.dataset.salesDelivery); });
    });
    region.querySelectorAll('[data-sales-cancel-observed]').forEach(function(btn){
      btn.addEventListener('click', function(){ openCancelObservedSale29(btn.dataset.salesCancelObserved); });
    });

    region.querySelectorAll('[data-sales-archive-test]').forEach(function(btn){
      btn.addEventListener('click',function(){openArchiveTestSale29T(btn.dataset.salesArchiveTest);});
    });
    region.querySelectorAll('[data-sales-reclassify]').forEach(function(btn){
      btn.addEventListener('click',function(){openReclassifySale29T(btn.dataset.salesReclassify);});
    });

  }

  function renderSalesRowActions29(item) {
    const id =
      escapeHtml(item.idVenta || "");

    const wrapRows = function(
      principal,
      secundario
    ) {
      principal = principal || [];
      secundario = secundario || [];

      let html =
        '<div class="sales-row-actions sales29-actions-stack">' +
          '<div class="sales29-actions-row sales29-actions-row--main">' +
            principal.join("") +
          '</div>';

      if (secundario.length) {
        html +=
          '<div class="sales29-actions-row sales29-actions-row--secondary">' +
            secundario.join("") +
          '</div>';
      }

      html += '</div>';
      return html;
    };

    if (SALES_STATE.activeView === "ABONOS") {
      return wrapRows(
        [
          '<button class="button button--primary button--compact" type="button" data-sales-pay="' + id + '"><span class="material-symbols-rounded">fact_check</span>Validar abono</button>',
          '<button class="button button--ghost button--compact" type="button" data-sales-view-detail="' + id + '">Ver</button>'
        ]
      );
    }

    if (SALES_STATE.activeView === "ENTREGAS") {
      return wrapRows(
        [
          '<button class="button button--primary button--compact" type="button" data-sales-delivery="' + id + '"><span class="material-symbols-rounded">local_shipping</span>Gestionar</button>',
          '<button class="button button--ghost button--compact" type="button" data-sales-view-detail="' + id + '">Ver</button>'
        ]
      );
    }

    const principales = [
      '<button class="button button--ghost button--compact" type="button" data-sales-view-detail="' + id + '">Ver</button>'
    ];

    const secundarios = [];

    const estadoVenta = String(item.estado || item.estadoEntrega || "").toUpperCase();
    const sePuedeModificar = item.puedeModificar === true ||
      (estadoVenta !== "ENTREGADA" && estadoVenta !== "ANULADA");
    const sePuedeAnular = item.puedeAnularObservada === true ||
      (estadoVenta !== "ENTREGADA" && estadoVenta !== "ANULADA");

    if (sePuedeModificar) {
      principales.push(
        '<button class="button button--ghost button--compact" type="button" data-sales-edit="' + id + '">Modificar</button>'
      );
    }

    if (sePuedeAnular) {
      secundarios.push(
        '<button class="button button--secondary button--compact sales29-cancel-button" type="button" data-sales-cancel-observed="' + id + '"><span class="material-symbols-rounded">cancel</span>Anular</button>'
      );
    }

    if (item.puedeArchivarPrueba) {
      secundarios.push(
        '<button class="button button--secondary button--compact" type="button" data-sales-archive-test="' + id + '"><span class="material-symbols-rounded">archive</span>Archivar prueba</button>'
      );
    }

    if (item.puedeReclasificarTipoRegistro) {
      secundarios.push(
        '<button class="button button--ghost button--compact" type="button" data-sales-reclassify="' + id + '"><span class="material-symbols-rounded">swap_horiz</span>Clasificación</button>'
      );
    }

    return wrapRows(
      principales,
      secundarios
    );
  }

  function salesPaymentBadge29(status) {
    const s=String(status||"").toUpperCase();
    const label=s==="ABONO_CONFIRMADO"?"Aprobado":(s==="ABONO_OBSERVADO"?"Observado":"Pendiente");
    const cls=s==="ABONO_CONFIRMADO"?"is-success":(s==="ABONO_OBSERVADO"?"is-danger":"is-warning");
    return '<span class="status-pill ' + cls + '">' + label + '</span>';
  }
  function salesStatusBadge29(status) {
    const s = String(status || "REGISTRADA").toUpperCase();

    const labels = {
      REGISTRADA:"Registrada",
      POR_ENTREGAR:"Por entregar",
      PROGRAMADA:"Programada",
      OBSERVADA:"Observada",
      ENTREGADA:"Entregada",
      ANULADA:"Anulada",
      EXPORTADA:"Registrada"
    };

    const classes = {
      PROGRAMADA:"is-info",
      OBSERVADA:"is-danger",
      ENTREGADA:"is-success",
      ANULADA:"is-danger",
      POR_ENTREGAR:"is-warning"
    };

    return '<span class="status-pill ' +
      escapeHtml(classes[s] || '') +
      '">' +
      escapeHtml(labels[s] || s) +
      '</span>';
  }

  function salesMaterialDeliveryBadge29(status, estadoAbono) {
    let s = String(status || "PENDIENTE").toUpperCase();

    if (
      String(estadoAbono || "").toUpperCase() !== "ABONO_CONFIRMADO" &&
      s === "PENDIENTE"
    ) {
      return '<span class="status-pill is-muted">Pendiente de abono</span>';
    }

    const labels = {
      PENDIENTE:"Pendiente",
      PROGRAMADA:"Programada",
      OBSERVADA:"Observada",
      ENTREGADA:"Entregada"
    };

    const classes = {
      PENDIENTE:"is-warning",
      PROGRAMADA:"is-info",
      OBSERVADA:"is-danger",
      ENTREGADA:"is-success"
    };

    return '<span class="status-pill ' +
      escapeHtml(classes[s] || '') +
      '">' +
      escapeHtml(labels[s] || s) +
      '</span>';
  }

  function salesMaterialDeliveryDetail29(item, venta) {
    item = item || {};
    venta = venta || {};

    const estado = String(
      item.estadoEntrega || "PENDIENTE"
    ).toUpperCase();

    let extra = '';

    if (
      estado === "PROGRAMADA" &&
      item.fechaProgramadaEntrega
    ) {
      extra =
        '<small class="sales29-material-status-detail">' +
          '<span class="material-symbols-rounded">event</span>' +
          'Fecha acordada: ' +
          escapeHtml(
            String(item.fechaProgramadaEntrega || "").slice(0,10)
          ) +
        '</small>';
    } else if (
      estado === "OBSERVADA" &&
      item.detalleObservacionEntrega
    ) {
      extra =
        '<small class="sales29-material-status-detail is-observed">' +
          '<span class="material-symbols-rounded">info</span>' +
          escapeHtml(item.detalleObservacionEntrega) +
        '</small>';
    } else if (
      estado === "ENTREGADA" &&
      item.fechaEntrega
    ) {
      extra =
        '<small class="sales29-material-status-detail">' +
          '<span class="material-symbols-rounded">check_circle</span>' +
          'Entrega confirmada: ' +
          escapeHtml(item.fechaEntrega) +
        '</small>';
    }

    return (
      '<div class="sales29-material-status">' +
        salesMaterialDeliveryBadge29(
          estado,
          venta.estadoAbono
        ) +
        extra +
      '</div>'
    );
  }

  function getSalesRowById29(idVenta) {
    const id = String(idVenta || "").trim();
    return (SALES_STATE.rows || []).find(function(item) {
      return String(item.idVenta || "").trim() === id;
    }) || null;
  }

  function salesDetailCacheKey29M_(idVenta, vista) {
    return String(idVenta || "").trim() +
      "|" +
      String(
        vista ||
        SALES_STATE.activeView ||
        "REGISTRADAS"
      ).toUpperCase();
  }

  function invalidateSalesDetailCache29(idVenta) {
    if (!idVenta) {
      SALES_STATE.detailCache = {};
      return;
    }

    const prefix =
      String(idVenta || "").trim() + "|";

    Object.keys(
      SALES_STATE.detailCache || {}
    ).forEach(function(key) {
      if (key.indexOf(prefix) === 0) {
        delete SALES_STATE.detailCache[key];
      }
    });
  }

  function getSalesDetailCached29(
    idVenta,
    force,
    vistaSolicitada
  ) {
    const id = String(idVenta || "").trim();

    if (!id) {
      return Promise.reject(
        new Error("Selecciona la venta.")
      );
    }

    const vista = String(
      vistaSolicitada ||
      SALES_STATE.activeView ||
      "REGISTRADAS"
    ).toUpperCase();

    const key =
      salesDetailCacheKey29M_(id, vista);

    const current =
      SALES_STATE.detailCache[key];

    const now = Date.now();

    if (
      !force &&
      current &&
      current.data &&
      (
        now -
        Number(current.time || 0) <
        60000
      )
    ) {
      return Promise.resolve(current.data);
    }

    if (
      !force &&
      current &&
      current.promise
    ) {
      return current.promise;
    }

    const promise = secureRpc(
      "obtenerDetalleVentaContadoModulo",
      [id, vista],
      "VENTAS_CONTADO"
    )
      .then(function(r) {
        SALES_STATE.detailCache[key] = {
          data:r || {},
          time:Date.now()
        };

        return r || {};
      })
      .catch(function(error) {
        delete SALES_STATE.detailCache[key];
        throw error;
      });

    SALES_STATE.detailCache[key] = {
      promise:promise,
      time:now
    };

    return promise;
  }

  function salesSummaryCards29(summary) {
    summary = summary || {};
    const importe = summary.importeVisible !== undefined ? summary.importeVisible : summary.totalVenta;
    return '<div class="sales29-modal-summary">' +
      '<div><small>Código de venta</small><strong>' + escapeHtml(summary.codigoVenta || '—') + '</strong></div>' +
      '<div><small>Cliente</small><strong>' + escapeHtml(summary.nombreCliente || '—') + '</strong></div>' +
      '<div><small>Cuenta contrato</small><strong>' + escapeHtml(summary.cuentaContrato || '—') + '</strong></div>' +
      '<div><small>Importe</small><strong>' + formatSalesMoney(importe, summary.moneda || 'PEN') + '</strong></div>' +
      '<div><small>Tipo</small><strong>' + escapeHtml(summary.nombreTipoVenta || summary.tipoVenta || '—') + '</strong></div>' +
      '<div><small>Clasificación</small><strong>' + salesRecordTypeBadge29T(summary,false) + '</strong></div>' +
      '<div><small>Estado de venta</small><strong>' + salesStatusBadge29(summary.estado) + '</strong></div>' +
      '<div><small>Abono</small><strong>' + salesPaymentBadge29(summary.estadoAbono) + '</strong></div>' +
      '<div><small>Fecha</small><strong>' + escapeHtml(summary.fechaRegistro || '—') + '</strong></div>' +
    '</div>';
  }


  function extractSalesDriveFileId29U(
    idArchivo,
    url
  ) {
    const id =
      String(idArchivo || "").trim();

    if (id) return id;

    const text =
      String(url || "").trim();

    if (!text) return "";

    let match =
      text.match(/\/d\/([A-Za-z0-9_-]{10,})/);

    if (match && match[1]) {
      return match[1];
    }

    match =
      text.match(/[?&]id=([A-Za-z0-9_-]{10,})/);

    return match && match[1]
      ? match[1]
      : "";
  }

  function salesSecureFileButtons29U(
    idVenta,
    idArchivo,
    url,
    nombre,
    compact
  ) {
    const fileId =
      extractSalesDriveFileId29U(
        idArchivo,
        url
      );

    if (!fileId) {
      return '<span class="sales-muted">Sin archivo adjunto</span>';
    }

    const cls =
      compact
        ? " button--compact"
        : "";

    return '<div class="sales29-secure-file-actions">' +
      '<button class="button button--secondary' + cls + '" type="button" ' +
        'data-sales-file-open="' + escapeHtml(fileId) + '" ' +
        'data-sales-file-sale="' + escapeHtml(idVenta || "") + '" ' +
        'data-sales-file-name="' + escapeHtml(nombre || "archivo") + '">' +
        '<span class="material-symbols-rounded">visibility</span>Ver' +
      '</button>' +
      '<button class="button button--ghost' + cls + '" type="button" ' +
        'data-sales-file-download="' + escapeHtml(fileId) + '" ' +
        'data-sales-file-sale="' + escapeHtml(idVenta || "") + '" ' +
        'data-sales-file-name="' + escapeHtml(nombre || "archivo") + '">' +
        '<span class="material-symbols-rounded">download</span>Descargar' +
      '</button>' +
    '</div>';
  }

  function base64ToSalesBlob29U(
    base64,
    mimeType
  ) {
    const binary =
      atob(String(base64 || ""));

    const bytes =
      new Uint8Array(binary.length);

    for (
      let i = 0;
      i < binary.length;
      i++
    ) {
      bytes[i] =
        binary.charCodeAt(i);
    }

    return new Blob(
      [bytes],
      {
        type:
          mimeType ||
          "application/octet-stream"
      }
    );
  }

  function openSalesSecureFile29U(
    idVenta,
    idArchivo,
    mode,
    suggestedName
  ) {
    const modo =
      String(mode || "VER")
        .toUpperCase();

    let previewWindow = null;

    if (modo === "VER") {
      try {
        previewWindow =
          window.open("", "_blank");

        if (previewWindow) {
          previewWindow.document.write(
            '<title>Cargando archivo...</title>' +
            '<div style="font-family:Arial,sans-serif;padding:24px">' +
              'Cargando archivo...' +
            '</div>'
          );
        }
      } catch (ignore) {}
    }

    secureRpc(
      "obtenerArchivoVentaContadoModulo",
      [{
        idVenta:idVenta,
        idArchivo:idArchivo
      }],
      "VENTAS_CONTADO"
    )
    .then(function(result) {
      const blob =
        base64ToSalesBlob29U(
          result.base64,
          result.mimeType
        );

      const blobUrl =
        URL.createObjectURL(blob);

      const nombre =
        result.nombreArchivo ||
        suggestedName ||
        "archivo";

      if (modo === "DESCARGAR") {
        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.download = nombre;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        toast(
          "Descarga preparada",
          nombre
        );
      } else if (previewWindow) {
        previewWindow.location.replace(
          blobUrl
        );
      } else {
        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noopener";

        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setTimeout(function() {
        URL.revokeObjectURL(blobUrl);
      }, 120000);
    })
    .catch(function(error) {
      if (
        previewWindow &&
        !previewWindow.closed
      ) {
        previewWindow.close();
      }

      toast(
        "No se pudo abrir el archivo",
        errorMessage(error),
        true
      );
    });
  }

  function bindSalesSecureFileButtons29U(
    root
  ) {
    const target =
      root || document;

    target
      .querySelectorAll(
        "[data-sales-file-open]"
      )
      .forEach(function(button) {
        if (
          button.dataset.boundSecureFile29u ===
          "true"
        ) {
          return;
        }

        button.dataset.boundSecureFile29u =
          "true";

        button.addEventListener(
          "click",
          function() {
            openSalesSecureFile29U(
              button.dataset.salesFileSale,
              button.dataset.salesFileOpen,
              "VER",
              button.dataset.salesFileName
            );
          }
        );
      });

    target
      .querySelectorAll(
        "[data-sales-file-download]"
      )
      .forEach(function(button) {
        if (
          button.dataset.boundSecureFile29u ===
          "true"
        ) {
          return;
        }

        button.dataset.boundSecureFile29u =
          "true";

        button.addEventListener(
          "click",
          function() {
            openSalesSecureFile29U(
              button.dataset.salesFileSale,
              button.dataset.salesFileDownload,
              "DESCARGAR",
              button.dataset.salesFileName
            );
          }
        );
      });
  }

  function renderPaymentReceiptAction29(venta, loading) {
    venta = venta || {};

    if (loading) {
      return '<div class="sales29-inline-loader"><span class="material-symbols-rounded">progress_activity</span><span>Cargando comprobante...</span></div>';
    }

    return salesSecureFileButtons29U(
      venta.idVenta,
      venta.idArchivoComprobante,
      venta.urlComprobante,
      venta.nombreArchivoComprobante ||
        "Comprobante de pago",
      false
    );
  }

  function renderPaymentValidationBody29(summary, detail, loading) {
    const venta = Object.assign({}, summary || {}, detail && detail.venta ? detail.venta : {});
    return '<div class="sales-modal-shell">' +
      salesSummaryCards29(venta) +
      '<section class="sales29-modal-section">' +
        '<div class="sales-form-section-head"><span class="material-symbols-rounded">payments</span><div><h4>Validación del abono</h4><p>Revisa el comprobante y registra una observación solo si corresponde.</p></div></div>' +
        '<div class="sales-form-grid">' +
          '<div class="span-2">' +
            '<span class="sales29-field-label">Comprobante de pago registrado en la venta</span>' +
            '<div>' + renderPaymentReceiptAction29(venta, loading) + '</div>' +
          '</div>' +

          '<label class="input-field">' +
            '<span>Comprobante de depósito al proveedor <small>obligatorio para aprobar</small></span>' +
            '<input id="salesProviderDepositInput" type="file" accept="application/pdf,image/png,image/jpeg,image/webp">' +
            '<small class="sales29-field-help">Documento que sustenta el depósito realizado al proveedor. PDF, PNG, JPG o WEBP; máximo 5 MB.</small>' +
          '</label>' +

          '<label class="input-field">' +
            '<span>Boleta de venta para el cliente <small>obligatorio para aprobar</small></span>' +
            '<input id="salesCustomerReceiptInput" type="file" accept="application/pdf,image/png,image/jpeg,image/webp">' +
            '<small class="sales29-field-help">Boleta que será entregada o remitida al cliente. PDF, PNG, JPG o WEBP; máximo 5 MB.</small>' +
          '</label>' +

          '<div class="sales29-info-note span-2">' +
            '<span class="material-symbols-rounded">info</span>' +
            '<span>Los dos documentos anteriores se guardarán únicamente cuando el abono sea aprobado. Si el abono es observado, no se exige adjuntarlos.</span>' +
          '</div>' +

          '<label class="input-field span-2"><span>Observación de validación</span><textarea id="salesPaymentObservationInput" rows="4" maxlength="1000" placeholder="Obligatoria solo si observas el abono">' + escapeHtml((venta.observacionConfirmacionAbono || '')) + '</textarea><small class="sales29-field-help">Si apruebas el abono, este campo es opcional. Si observas, el comentario es obligatorio.</small></label>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function deliveryProviderOptions29(detail) {
    detail = detail || {};
    const detalles = Array.isArray(detail.detalles) ? detail.detalles : [];
    const providers = {};

    detalles.forEach(function(item) {
      if (
        String(item.estadoItem || 'ACTIVO').toUpperCase() ===
        'ANULADO'
      ) {
        return;
      }

      const id = String(item.idProveedorPrecio || '').trim();
      if (!id) return;
      if (!providers[id]) {
        providers[id] = String(
          item.nombreComercialProveedor ||
          item.codigoSapProveedor ||
          id
        ).trim();
      }
    });

    const options = Object.keys(providers).map(function(id) {
      return { id: id, nombre: providers[id] || id };
    });

    options.sort(function(a,b){
      return a.nombre.localeCompare(b.nombre);
    });

    return options;
  }

  function renderDeliveryProviderBlock29(options, currentProvider) {
    options = Array.isArray(options) ? options : [];
    currentProvider = String(currentProvider || '').trim();

    if (currentProvider) {
      const current = options.find(function(item){
        return item.id === currentProvider;
      });

      return '<div class="sales29-provider-inline">' +
        '<strong>Proveedor</strong>' +
        '<small>' + escapeHtml((current && current.nombre) || currentProvider) + '</small>' +
        '<input id="salesDeliveryProvider" type="hidden" value="' + escapeHtml(currentProvider) + '">' +
      '</div>';
    }

    if (!options.length) {
      return '<input id="salesDeliveryProvider" type="hidden" value="">';
    }

    if (options.length === 1) {
      return '<div class="sales29-provider-inline">' +
        '<strong>Proveedor</strong>' +
        '<small>' + escapeHtml(options[0].nombre) + '</small>' +
        '<input id="salesDeliveryProvider" type="hidden" value="' + escapeHtml(options[0].id) + '">' +
      '</div>';
    }

    return '<label class="input-field span-2">' +
      '<span>Proveedor a gestionar</span>' +
      '<select id="salesDeliveryProvider">' +
        '<option value="">Selecciona</option>' +
        options.map(function(item){
          return '<option value="' + escapeHtml(item.id) + '">' +
            escapeHtml(item.nombre) +
          '</option>';
        }).join('') +
      '</select>' +
      '<small class="sales29-field-help">Solo se muestran proveedores que participan en los precios de esta venta.</small>' +
    '</label>';
  }

  function deliveryProductsForProvider29(detail, idProveedor) {
    detail = detail || {};
    const provider = String(idProveedor || '').trim();
    const rows = Array.isArray(detail.detalles) ? detail.detalles : [];

    if (!provider) return rows.slice();

    return rows.filter(function(item) {
      return String(item.idProveedorPrecio || '').trim() === provider;
    });
  }

  function renderDeliveryClientData29(venta) {
    venta = venta || {};

    const siNo = function(value){
      const normalized = String(value || "").toUpperCase();

      if(normalized === "SI") return "Sí";
      if(normalized === "NO") return "No";
      return "No registrado";
    };

    const comprador = [
      '<div><small>Nombre del cliente</small><strong>' +
        escapeHtml(venta.nombreCliente || '—') +
      '</strong></div>',
      '<div><small>DNI</small><strong>' +
        escapeHtml(venta.dniCliente || venta.dni || '—') +
      '</strong></div>',
      '<div><small>Teléfono</small><strong>' +
        escapeHtml(venta.telefonoCliente || venta.telefono || '—') +
      '</strong></div>'
    ];

    if (String(venta.cuentaContrato || '').trim()) {
      comprador.push(
        '<div><small>Cuenta contrato</small><strong>' +
          escapeHtml(venta.cuentaContrato) +
        '</strong></div>'
      );
    }

    const entrega = [
      '<div><small>Dirección de entrega</small><strong>' +
        escapeHtml(venta.direccionEntrega || '—') +
      '</strong></div>',
      '<div><small>Referencia</small><strong>' +
        escapeHtml(venta.referencia || '—') +
      '</strong></div>',
      '<div><small>¿Recibe en dirección de la cuenta?</small><strong>' +
        escapeHtml(siNo(venta.recibeDireccionCuenta)) +
      '</strong></div>'
    ];

    const tipoReceptor =
      String(venta.tipoReceptor || '').toUpperCase();

    let receptor = '';

    if (tipoReceptor) {
      const esComprador =
        tipoReceptor === 'COMPRADOR';

      const receptorCards = [
        '<div><small>Quién recibe</small><strong>' +
          escapeHtml(
            esComprador
              ? 'El comprador'
              : 'Otra persona'
          ) +
        '</strong></div>',
        '<div><small>Nombre del receptor</small><strong>' +
          escapeHtml(venta.nombreReceptor || '—') +
        '</strong></div>',
        '<div><small>DNI del receptor</small><strong>' +
          escapeHtml(venta.dniReceptor || '—') +
        '</strong></div>',
        '<div><small>Teléfono del receptor</small><strong>' +
          escapeHtml(venta.telefonoReceptor || '—') +
        '</strong></div>'
      ];

      if(String(venta.relacionReceptor || '').trim()){
        receptorCards.push(
          '<div><small>Parentesco / relación</small><strong>' +
            escapeHtml(venta.relacionReceptor) +
          '</strong></div>'
        );
      }

      receptor =
        '<div class="sales29-delivery-subsection-title">Persona autorizada para recibir</div>' +
        '<div class="sales29-delivery-client">' +
          receptorCards.join('') +
        '</div>';
    } else {
      receptor =
        '<div class="sales29-info-note sales29-delivery-receiver-legacy">' +
          '<span class="material-symbols-rounded">info</span>' +
          '<span>Esta venta fue registrada antes de incorporar los datos del receptor. La entrega debe coordinarse con el comprador registrado.</span>' +
        '</div>';
    }

    return (
      '<div class="sales29-delivery-subsection-title">Comprador</div>' +
      '<div class="sales29-delivery-client">' +
        comprador.join('') +
      '</div>' +
      '<div class="sales29-delivery-subsection-title">Dirección de entrega</div>' +
      '<div class="sales29-delivery-client">' +
        entrega.join('') +
      '</div>' +
      receptor
    );
  }

  function renderDeliveryProductsBlock29(detail, idProveedor) {
    const rows = deliveryProductsForProvider29(detail, idProveedor);

    if (!rows.length) {
      return '<div class="empty-state">' +
        '<span class="material-symbols-rounded">inventory_2</span>' +
        '<strong>Sin productos para gestionar</strong>' +
        '<p>No hay líneas de esta venta asignadas al proveedor actual.</p>' +
      '</div>';
    }

    return '<div class="sales29-delivery-products">' +
      rows.map(function(item) {
        const nombre = String(
          item.nombreMaterial ||
          item.nombreCortoMaterial ||
          item.descripcionMaterial ||
          item.codigoMaterial ||
          'Material'
        ).trim();

        const combo = String(
          item.detalleCombo ||
          item.observacionLinea ||
          ''
        ).trim();

        const proveedor = String(
          item.nombreComercialProveedor ||
          item.codigoSapProveedor ||
          item.idProveedorPrecio ||
          '—'
        ).trim();

        const anulado =
          String(item.estadoItem || 'ACTIVO').toUpperCase() ===
          'ANULADO';

        return '<article class="sales29-delivery-product-card ' +
          (anulado ? 'is-cancelled' : '') +
          '">' +
          '<div class="sales29-delivery-product-head">' +
            '<div class="sales29-delivery-product-title">' +
              '<strong>' + escapeHtml(nombre) + '</strong>' +
              '<small>' + escapeHtml(item.codigoMaterial || '') + '</small>' +
              (combo ?
                '<small class="sales29-delivery-product-combo"><strong>Combo:</strong> ' + escapeHtml(combo) + '</small>' :
                '') +
            '</div>' +
          '</div>' +
          '<div class="sales29-delivery-product-provider">' +
            '<span class="material-symbols-rounded">store</span>' +
            '<span>Proveedor: <strong>' + escapeHtml(proveedor) + '</strong></span>' +
          '</div>' +
          (
            anulado
              ? '<div class="sales29-delivery-item-cancelled">' +
                  '<span class="material-symbols-rounded">block</span>' +
                  '<span><strong>Material anulado · No entregar</strong>' +
                    (
                      item.observacionAnulacionItem
                        ? '<small>' +
                            escapeHtml(item.observacionAnulacionItem) +
                          '</small>'
                        : ''
                    ) +
                  '</span>' +
                '</div>'
              : ''
          ) +
          '<div class="sales29-delivery-product-values">' +
            '<div><small>Cantidad</small><strong>' + Number(item.cantidad || 1) + '</strong></div>' +
            '<div><small>Precio unitario</small><strong>' + formatSalesMoney(item.precioUnitario, item.moneda) + '</strong></div>' +
            '<div><small>Total</small><strong>' + formatSalesMoney(item.totalLinea, item.moneda) + '</strong></div>' +
          '</div>' +
        '</article>';
      }).join('') +
    '</div>';
  }

  function getDeliveryManagementForProvider29(detail, idProveedor) {
    detail = detail || {};
    const provider = String(idProveedor || '').trim();
    const gestiones = Array.isArray(detail.gestionesEntrega)
      ? detail.gestionesEntrega
      : [];

    return gestiones.find(function(item) {
      return String(item.idProveedor || '').trim() === provider;
    }) || null;
  }

  function renderExistingDeliveryEvidence29(gestion, tipos) {
    gestion = gestion || {};
    tipos = Array.isArray(tipos) ? tipos : [];
    const evidencias = Array.isArray(gestion.evidencias)
      ? gestion.evidencias
      : [];

    const rows = evidencias.filter(function(item) {
      if (!tipos.length) return true;
      return tipos.indexOf(String(item.tipoEvidencia || '').toUpperCase()) !== -1;
    });

    if (!rows.length) return '';

    return '<div class="sales29-evidence-summary">' +
      '<strong>Sustentos registrados</strong><div>' +
      rows.map(function(item) {
        return '<a target="_blank" href="' + escapeHtml(item.url || '#') + '">' +
          escapeHtml(item.nombreArchivo || item.tipoEvidencia || 'Sustento') +
        '</a>';
      }).join('<br>') +
      '</div></div>';
  }

  function renderDeliveryStatusFields29(detail, idProveedor) {
    const gestion = getDeliveryManagementForProvider29(detail, idProveedor) || {};
    const estado = String(gestion.estadoEntrega || 'PENDIENTE').toUpperCase();
    const fechaProgramada = String(gestion.fechaProgramadaEntrega || '').slice(0,10);
    const observacion = String(gestion.detalleObservacion || '').trim();

    const statuses = [
      ['PENDIENTE','Pendiente'],
      ['PROGRAMADA','Programada'],
      ['OBSERVADA','Observada'],
      ['ENTREGADA','Entregada']
    ];

    let dynamic = '';

    if (estado === 'PROGRAMADA') {
      dynamic = '<div class="sales29-delivery-dynamic">' +
        '<div class="sales-form-grid">' +
          '<label class="input-field"><span>Fecha acordada con el cliente</span><input id="salesDeliveryScheduledDate" type="date" value="' + escapeHtml(fechaProgramada) + '"></label>' +
          '<label class="input-field span-2"><span>Observaciones</span><textarea id="salesDeliveryObservation" rows="3" maxlength="1500" placeholder="Detalle adicional de la programación">' + escapeHtml(observacion) + '</textarea></label>' +
        '</div>' +
      '</div>';
    } else if (estado === 'OBSERVADA') {
      dynamic = '<div class="sales29-delivery-dynamic">' +
        '<div class="sales-form-grid">' +
          '<label class="input-field span-2"><span>Observaciones</span><textarea id="salesDeliveryObservation" rows="4" maxlength="1500" placeholder="Describe el motivo por el cual la entrega quedó observada">' + escapeHtml(observacion) + '</textarea></label>' +
          '<label class="input-field span-2"><span>Sustento de la observación</span><input id="salesEvidenceObservation" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"><small class="sales29-field-help">PDF, PNG, JPG o WEBP; máximo 5 MB.</small></label>' +
        '</div>' +
        renderExistingDeliveryEvidence29(gestion,['SUSTENTO_OBSERVACION']) +
      '</div>';
    } else if (estado === 'ENTREGADA') {
      dynamic = '<div class="sales29-delivery-dynamic">' +
        '<div class="sales-form-grid sales29-delivery-evidence-grid">' +
          '<label class="input-field"><span>Boleta de entrega</span><input id="salesEvidenceBoleta" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
          '<label class="input-field"><span>Evidencia de recepción</span><input id="salesEvidenceRecepcion" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
          '<label class="input-field"><span>Acta de conformidad</span><input id="salesEvidenceActa" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
          '<label class="input-field"><span>Otro sustento</span><input id="salesEvidenceOtro" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>' +
        '</div>' +
        '<small class="sales29-field-help">Para confirmar la entrega debe existir al menos un sustento de entrega.</small>' +
        renderExistingDeliveryEvidence29(gestion,['BOLETA_ENTREGA','EVIDENCIA_RECEPCION','ACTA_CONFORMIDAD','OTRO']) +
      '</div>';
    } else {
      dynamic = '<div class="sales29-delivery-current">' +
        '<span class="material-symbols-rounded">schedule</span>' +
        '<span>La entrega todavía está pendiente de coordinación con el cliente.</span>' +
      '</div>';
    }

    return '<div class="sales29-delivery-status-block">' +
      '<div class="sales-form-grid sales29-delivery-status-grid">' +
        '<label class="input-field">' +
          '<span>Estado</span>' +
          '<select id="salesDeliveryStatus">' +
            statuses.map(function(item) {
              return '<option value="' + item[0] + '" ' + (item[0] === estado ? 'selected' : '') + '>' + item[1] + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div id="salesDeliveryDynamicFields">' + dynamic + '</div>' +
    '</div>';
  }

  function refreshDeliveryProviderContext29_() {
    const provider = valueSales29('salesDeliveryProvider');
    const detail = SALES_STATE.deliveryDetail || {};

    const products = document.getElementById('salesDeliveryProductsRegion');
    if (products) {
      products.innerHTML = renderDeliveryProductsBlock29(detail, provider);
    }

    const status = document.getElementById('salesDeliveryManagementFieldsRegion');
    if (status) {
      status.innerHTML = renderDeliveryStatusFields29(detail, provider);
      bindSalesDeliveryStatus29();
    }
  }

  function renderDeliveryManagementBody29(summary, detail, loading) {
    const venta = Object.assign(
      {},
      summary || {},
      detail && detail.venta ? detail.venta : {}
    );

    const currentProvider =
      SALES_STATE.context &&
      SALES_STATE.context.usuario &&
      SALES_STATE.context.usuario.idProveedor || '';

    const providerOptions = deliveryProviderOptions29(detail);
    const selectedProvider = currentProvider ||
      (providerOptions.length === 1 ? providerOptions[0].id : '');

    return '<div class="sales-modal-shell">' +
      '<section class="sales29-modal-section">' +
        '<div class="sales-form-section-head">' +
          '<span class="material-symbols-rounded">person</span>' +
          '<div><h4>Datos de la venta</h4><p>Información necesaria para coordinar la entrega con el cliente.</p></div>' +
        '</div>' +
        renderDeliveryClientData29(venta) +
      '</section>' +

      '<section class="sales29-modal-section">' +
        '<div class="sales-form-section-head">' +
          '<span class="material-symbols-rounded">inventory_2</span>' +
          '<div><h4>Productos a gestionar</h4><p>La asignación del proveedor proviene del precio utilizado al registrar la venta.</p></div>' +
        '</div>' +
        '<div class="sales-form-grid">' +
          renderDeliveryProviderBlock29(providerOptions, currentProvider) +
        '</div>' +
        (loading ?
          '<div class="sales29-inline-loader"><span class="material-symbols-rounded">progress_activity</span><span>Cargando productos del proveedor...</span></div>' :
          '') +
        '<div id="salesDeliveryProductsRegion">' +
          (loading ? '' : renderDeliveryProductsBlock29(detail, selectedProvider)) +
        '</div>' +
      '</section>' +

      '<section class="sales29-modal-section">' +
        '<div class="sales-form-section-head">' +
          '<span class="material-symbols-rounded">local_shipping</span>' +
          '<div><h4>Estado de entrega</h4><p>Actualiza la gestión según lo acordado o sucedido con el cliente.</p></div>' +
        '</div>' +
        '<div id="salesDeliveryManagementFieldsRegion">' +
          (loading ?
            '<div class="sales29-inline-loader"><span class="material-symbols-rounded">progress_activity</span><span>Cargando estado actual...</span></div>' :
            renderDeliveryStatusFields29(detail, selectedProvider)) +
        '</div>' +
      '</section>' +

      '<input id="salesDeliveryProviderDefault" type="hidden" value="' + escapeHtml(selectedProvider) + '">' +
    '</div>';
  }

  function syncSalesDeliveryStatusFields29() {
    const select = document.getElementById('salesDeliveryStatus');
    const provider = valueSales29('salesDeliveryProvider');
    const region = document.getElementById('salesDeliveryDynamicFields');

    if (!select || !region) return;

    const detail = SALES_STATE.deliveryDetail || {};
    const gestion = getDeliveryManagementForProvider29(detail, provider) || {};
    const estado = String(select.value || 'PENDIENTE').toUpperCase();

    // Se renderiza un objeto temporal para reutilizar el mismo constructor.
    const temporal = Object.assign({}, detail, {
      gestionesEntrega: [{
        idProveedor: provider,
        estadoEntrega: estado,
        fechaProgramadaEntrega:
          estado === String(gestion.estadoEntrega || '').toUpperCase()
            ? gestion.fechaProgramadaEntrega || ''
            : '',
        detalleObservacion:
          estado === String(gestion.estadoEntrega || '').toUpperCase()
            ? gestion.detalleObservacion || ''
            : '',
        evidencias: Array.isArray(gestion.evidencias) ? gestion.evidencias : []
      }]
    });

    const temp = document.createElement('div');
    temp.innerHTML = renderDeliveryStatusFields29(temporal, provider);
    const dynamic = temp.querySelector('#salesDeliveryDynamicFields');
    region.innerHTML = dynamic ? dynamic.innerHTML : '';
  }

  function bindSalesDeliveryStatus29() {
    const provider = document.getElementById('salesDeliveryProvider');
    const defaultProvider = document.getElementById('salesDeliveryProviderDefault');

    if (provider && defaultProvider && defaultProvider.value && !provider.value) {
      provider.value = defaultProvider.value;
    }

    if (provider && provider.tagName === 'SELECT' && provider.dataset.boundProvider !== 'true') {
      provider.dataset.boundProvider = 'true';
      provider.addEventListener('change', refreshDeliveryProviderContext29_);
    }

    const status = document.getElementById('salesDeliveryStatus');
    if (status && status.dataset.boundStatus !== 'true') {
      status.dataset.boundStatus = 'true';
      status.addEventListener('change', syncSalesDeliveryStatusFields29);
    }
  }

  function renderSalesPagination29() {
    const target=document.getElementById("salesPagination"); if(!target) return;
    const p=SALES_STATE.pagination||{}; const page=Number(p.pagina||1); const totalPages=Number(p.totalPaginas||1); const total=Number(p.total||0);
    target.innerHTML='<div class="pagination"><span>Página ' + page + ' de ' + totalPages + ' · ' + total + ' registros</span><div><button id="salesPrevPage" class="button button--ghost button--compact" type="button" ' + (page<=1?'disabled':'') + '>Anterior</button><button id="salesNextPage" class="button button--ghost button--compact" type="button" ' + (page>=totalPages?'disabled':'') + '>Siguiente</button></div></div>';
    on("salesPrevPage","click",function(){ if(page>1){SALES_STATE.filters.pagina=page-1;loadSalesList(false,{force:true});} });
    on("salesNextPage","click",function(){ if(page<totalPages){SALES_STATE.filters.pagina=page+1;loadSalesList(false,{force:true});} });
  }

  function openNewCashSaleModal() {
    const p =
      SALES_STATE.context &&
      SALES_STATE.context.permisos ||
      {};

    if (!p.puedeRegistrar) {
      toast(
        "Sin permiso",
        "No tienes permiso para registrar ventas.",
        true
      );
      return;
    }

    SALES_STATE.cart = [];
    SALES_STATE.editing = null;
    SALES_STATE.offers = [];
    SALES_STATE.offerFilters = null;

    const modalKey =
      "NUEVA_VENTA";

    const token =
      prepareSalesModal29W_(
        modalKey
      );

    openModal({
      eyebrow:"VENTAS",
      title:"Nueva venta",
      wide:true,
      body:
        salesModalLoadingBody29W_(
          "Preparando formulario",
          "Cargando oficinas, grupos y configuración comercial…"
        ),
      footer:
        '<button class="button button--secondary" type="button" data-modal-close>Cerrar</button>'
    });

    bindSalesModalClose29();

    ensureSalesFormContext29W_(
      false
    )
      .then(function() {
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        const negocios =
          SALES_STATE.context
            .negociosVenta || [];

        SALES_STATE.currentBusiness =
          negocios.length === 1
            ? negocios[0].codigo
            : "";

        const body =
          document.querySelector(
            "#modalRoot .modal-body"
          );

        if (body) {
          body.innerHTML =
            '<div id="salesModalBody" class="sales-modal-shell sales29-sale-modal"></div>';
        }

        renderSaleForm29();
      })
      .catch(function(error) {
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        const body =
          document.querySelector(
            "#modalRoot .modal-body"
          );

        if (body) {
          body.innerHTML =
            '<div class="empty-state">' +
              '<span class="material-symbols-rounded">error</span>' +
              '<strong>No se pudo preparar la venta</strong>' +
              '<p>' +
                escapeHtml(
                  errorMessage(error)
                ) +
              '</p>' +
            '</div>';
        }
      });
  }


  function openEditCashSale29(idVenta) {
    const row =
      getSalesRowById29(idVenta) ||
      { idVenta:idVenta };

    const modalKey =
      "EDITAR:" +
      String(idVenta || "");

    const token =
      prepareSalesModal29W_(
        modalKey
      );

    openModal({
      eyebrow:"VENTAS",
      title:
        "Modificar venta " +
        (
          row.codigoVenta ||
          ""
        ),
      wide:true,
      body:
        salesModalLoadingBody29W_(
          "Cargando venta",
          "Preparando detalle y contexto comercial…"
        ),
      footer:
        '<button class="button button--secondary" type="button" data-modal-close>Cerrar</button>'
    });

    bindSalesModalClose29();

    Promise.all([
      getSalesDetailCached29(
        idVenta,
        false,
        "REGISTRADAS"
      ),
      ensureSalesFormContext29W_(
        false
      )
    ])
      .then(function(values) {
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        const result =
          values[0] || {};

        if (!result.puedeModificar) {
          closeSalesModal29W_();

          toast(
            "Venta bloqueada",
            "Esta venta ya no puede modificarse.",
            true
          );

          return;
        }

        SALES_STATE.editing =
          result;

        const v =
          result.venta || {};

        SALES_STATE.currentBusiness =
          v.tipoVenta || "";

        SALES_STATE.cart =
          (result.detalles || [])
            .map(function(x) {
              return {
                idDetallePrecio:
                  x.idDetallePrecio,

                idOferta:
                  x.idDetallePrecio,

                idListaPrecio:
                  x.idListaPrecio || "",

                idMaterial:
                  x.idMaterial,

                codigoMaterial:
                  x.codigoMaterial,

                nombreMaterial:
                  x.descripcionMaterial,

                descripcionMaterial:
                  x.descripcionMaterial,

                proveedor:
                  x.nombreComercialProveedor ||
                  "",

                idProveedor:
                  x.idProveedorPrecio || "",

                codigoProveedor:
                  x.codigoSapProveedor || "",

                precioBase:
                  Number(
                    x.precioUnitario || 0
                  ),

                moneda:
                  x.moneda || "PEN",

                detalleCombo:
                  x.detalleCombo ||
                  x.observacionLinea ||
                  "",

                cantidad:
                  Number(
                    x.cantidad || 1
                  )
              };
            });

        const title =
          document.getElementById(
            "modalTitle"
          );

        if (title) {
          title.textContent =
            "Modificar venta " +
            (
              v.codigoVenta ||
              row.codigoVenta ||
              ""
            );
        }

        const body =
          document.querySelector(
            "#modalRoot .modal-body"
          );

        if (body) {
          body.innerHTML =
            '<div id="salesModalBody" class="sales-modal-shell sales29-sale-modal"></div>';
        }

        renderSaleForm29();
      })
      .catch(function(error) {
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        const body =
          document.querySelector(
            "#modalRoot .modal-body"
          );

        if (body) {
          body.innerHTML =
            '<div class="empty-state">' +
              '<span class="material-symbols-rounded">error</span>' +
              '<strong>No se pudo abrir la venta</strong>' +
              '<p>' +
                escapeHtml(
                  errorMessage(error)
                ) +
              '</p>' +
            '</div>';
        }

        toast(
          "No se pudo abrir",
          errorMessage(error),
          true
        );
      });
  }


  function renderSaleForm29() {
    const region=document.getElementById("salesModalBody"); if(!region)return;
    const ctx=SALES_STATE.context||{}; const c=ctx.comercial||{}; const edit=SALES_STATE.editing&&SALES_STATE.editing.venta; const negocios=ctx.negociosVenta||[]; const permisos=ctx.permisos||{};
    const clasificacionHtml=edit
      ? '<section class="sales-form-section sales29-record-classification"><div class="sales-form-section-head"><span class="material-symbols-rounded">sell</span><div><h4>Clasificación del registro</h4><p>La clasificación no se modifica desde la edición comercial.</p></div></div><div>'+salesRecordTypeBadge29T(edit,false)+'</div></section>'
      : (permisos.puedeGestionarPruebas
          ? '<section class="sales-form-section sales29-record-classification"><div class="sales-form-section-head"><span class="material-symbols-rounded">science</span><div><h4>Clasificación del registro</h4><p>Las ventas de prueba quedan separadas de la operación comercial.</p></div></div>'+salesRadioGroupHtml29('salesRecordType','Tipo de registro',[['COMERCIAL','Venta comercial'],['PRUEBA','Venta de prueba']],'COMERCIAL')+'<div class="sales29-info-note"><span class="material-symbols-rounded">info</span><span>Selecciona Venta de prueba únicamente para validaciones funcionales. Por defecto la venta será comercial.</span></div></section>'
          : '');
    region.innerHTML='<form id="salesCashForm" class="sales-modern-form">' +
      '<div class="sales29-form-layout"><div class="sales29-form-main">' + clasificacionHtml +
      '<section class="sales-form-section">' +
        '<div class="sales-form-section-head"><span class="material-symbols-rounded">person</span><div><h4>1. Datos del comprador</h4><p>Estos datos se conservarán en Cálidda 360 y serán la referencia operativa de la venta.</p></div></div>' +
        '<div class="sales-form-grid">' +
          '<label class="input-field"><span>Nombre del cliente <small>obligatorio</small></span><input id="salesClientNameInput" maxlength="180" autocomplete="name"></label>' +
          '<label class="input-field"><span>DNI <small>obligatorio</small></span><input id="salesDniInput" maxlength="8" inputmode="numeric" autocomplete="off"></label>' +
          '<label class="input-field"><span>Teléfono <small>obligatorio</small></span><input id="salesPhoneInput" maxlength="30" inputmode="tel" autocomplete="tel"></label>' +
          '<label class="input-field"><span>Cuenta contrato <small>opcional</small></span><input id="salesContractInput" maxlength="40"></label>' +
          '<label class="input-field span-2"><span>Dirección de entrega <small>obligatorio</small></span><input id="salesAddressInput" maxlength="300" autocomplete="street-address"></label>' +
          '<label class="input-field span-2"><span>Referencia <small>obligatorio</small></span><input id="salesReferenceInput" maxlength="300" placeholder="Ej.: puerta negra, frente al parque, piso 3"></label>' +
          salesRadioGroupHtml29('salesIsCalidda','¿Es cliente Cálidda?',[['SI','Sí'],['NO','No']], 'SI') +
          salesRadioGroupHtml29('salesReceiveAccountAddress','¿Recibirá en la dirección de la cuenta?',[['SI','Sí'],['NO','No']], 'SI') +
          '<div class="sales29-info-note span-2"><span class="material-symbols-rounded">info</span><span>Estas dos preguntas son informativas. La dirección registrada arriba será la dirección operativa utilizada para la entrega.</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="sales-form-section">' +
        '<div class="sales-form-section-head"><span class="material-symbols-rounded">how_to_reg</span><div><h4>2. Persona que recibirá</h4><p>Define quién estará autorizado para recibir los productos del proveedor.</p></div></div>' +
        '<div class="sales-form-grid">' +
          salesRadioGroupHtml29('salesReceiverType','¿Quién recibirá el pedido?',[['COMPRADOR','El comprador'],['OTRA_PERSONA','Otra persona']], 'COMPRADOR') +
          '<div id="salesReceiverBuyerHint" class="sales29-info-note span-2"><span class="material-symbols-rounded">verified_user</span><span>Se guardará una copia del nombre, DNI y teléfono del comprador como datos del receptor.</span></div>' +
          '<label id="salesReceiverNameField" class="input-field" hidden><span>Nombre del receptor <small>obligatorio</small></span><input id="salesReceiverNameInput" maxlength="180" autocomplete="name"></label>' +
          '<label id="salesReceiverDniField" class="input-field" hidden><span>DNI del receptor <small>obligatorio</small></span><input id="salesReceiverDniInput" maxlength="8" inputmode="numeric"></label>' +
          '<label id="salesReceiverPhoneField" class="input-field" hidden><span>Teléfono del receptor <small>obligatorio</small></span><input id="salesReceiverPhoneInput" maxlength="30" inputmode="tel"></label>' +
          '<label id="salesReceiverRelationField" class="input-field" hidden><span>Parentesco / relación <small>opcional</small></span><input id="salesReceiverRelationInput" maxlength="100" placeholder="Ej.: esposa, hijo, familiar, encargado"></label>' +
        '</div>' +
      '</section>' +

      '<section class="sales-form-section"><div class="sales-form-section-head"><span class="material-symbols-rounded">storefront</span><div><h4>3. Contexto comercial</h4><p>Completa negocio, oficina y grupo antes de revisar las ofertas vigentes.</p></div></div><div class="sales-form-grid">' +
        '<label class="input-field span-2"><span>Negocio <small>obligatorio</small></span><select id="salesBusinessSelect"><option value="">Selecciona</option>' + negocios.map(function(x){return '<option value="'+escapeHtml(x.codigo)+'">'+escapeHtml(x.nombre)+'</option>';}).join('') + '</select></label>' +
        '<label class="input-field"><span>Oficina de ventas <small>obligatorio</small></span><select id="salesOfficeSelect"></select></label>' +
        '<label class="input-field"><span>Grupo de ventas <small>obligatorio</small></span><select id="salesGroupSelect"></select></label>' +
      '</div>' +
      '<div id="salesCatalogGate" class="sales29-catalog-gate">' +
        '<span class="material-symbols-rounded">lock</span>' +
        '<div><strong>Catálogo pendiente de contexto comercial</strong><small>Selecciona una oficina y un grupo de ventas para habilitar las ofertas. El sistema podrá aplicar el precio de Grupo, Oficina o General según corresponda.</small></div>' +
      '</div>' +
      '<div id="salesCommercialContextReady" class="sales29-context-ready" hidden>' +
        '<span class="material-symbols-rounded">check_circle</span>' +
        '<span>Contexto completo. Ya puedes seleccionar ofertas.</span>' +
      '</div>' +
      '</section>' +

      '<section id="salesOfferCatalogSection" class="sales-form-section" hidden><div class="sales-form-section-head"><span class="material-symbols-rounded">shopping_bag</span><div><h4>4. Catálogo de ofertas</h4><p>Busca por código, nombre, marca, proveedor o combo. Producto, tipo y subtipo son filtros opcionales.</p></div></div>' +
        '<div class="sales29-catalog-toolbar"><label class="input-field sales29-search"><span>Buscar oferta</span><input id="salesOfferSearch" placeholder="Ej.: cocina Sole, MAT0001, combo instalación"></label><label class="input-field"><span>Producto</span><select id="salesOfferProduct"><option value="">Todos</option></select></label><label class="input-field"><span>Tipo</span><select id="salesOfferType"><option value="">Todos</option></select></label><label class="input-field"><span>Subtipo</span><select id="salesOfferSubtype"><option value="">Todos</option></select></label></div>' +
        '<div id="salesOffersRegion" class="sales29-offers"></div>' +
      '</section></div>' +

      '<aside class="sales29-sidebar">' +
        '<section class="sales29-cart">' +
          '<div class="sales29-cart-head"><span class="material-symbols-rounded">shopping_cart</span><div><strong>Carrito</strong><small>Ofertas seleccionadas</small></div></div>' +
          '<div id="salesCartRegion"></div>' +
        '</section>' +

        '<section class="sales-form-section sales29-sidebar-payment">' +
          '<div class="sales-form-section-head"><span class="material-symbols-rounded">payments</span><div><h4>Pago y observaciones</h4><p>El comprobante quedará Pendiente hasta que un aprobador lo valide.</p></div></div>' +
          '<div class="sales-form-grid">' +
            '<label class="input-field span-2"><span>Comprobante de pago ' + (edit?'':'<small>obligatorio</small>') + '</span><input id="salesReceiptInput" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"><small class="sales-muted">PDF, PNG, JPG o WEBP; máximo 5 MB.</small></label>' +
            '<label class="input-field span-2"><span>Observaciones <small>obligatorio</small></span><textarea id="salesObservationInput" rows="3" maxlength="1500" placeholder="Registra alguna precisión comercial o de la entrega."></textarea></label>' +
          '</div>' +
        '</section>' +

        '<button id="salesSaveButton" class="button button--primary sales29-cart-save" type="submit"><span class="material-symbols-rounded">save</span>' + (edit?'Guardar cambios':'Registrar venta') + '</button>' +
      '</aside></div></form>';
    populateSalesCommercial29();
    setSelectValue29("salesBusinessSelect", SALES_STATE.currentBusiness);
    if(edit) prefillSaleEdit29(edit);
    updateSalesClientVisibility29();
    renderCart29();
    bindSaleForm29();
    syncSalesCatalogAvailability29_();

    if(hasCompleteSalesCommercialContext29_()){
      loadOffers29(false);
    }
  }

  function salesRadioGroupHtml29(name,label,options,selected){ return '<fieldset class="sales-radio-field span-2"><legend>'+escapeHtml(label)+'</legend><div class="sales-radio-options">'+options.map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'" '+(o[0]===selected?'checked':'')+'><span>'+escapeHtml(o[1])+'</span></label>';}).join('')+'</div></fieldset>'; }

  function populateSalesCommercial29(){
    const c=SALES_STATE.context&&SALES_STATE.context.comercial||{};
    const office=document.getElementById("salesOfficeSelect");

    if(!office)return;

    const offices=c.oficinas||[];

    office.innerHTML=
      '<option value="">Selecciona oficina</option>'+
      offices.map(function(x){
        return '<option value="'+escapeHtml(x.idOficina)+'">'+
          escapeHtml(x.nombre)+
        '</option>';
      }).join('');

    if(
      c.idOficinaPredeterminada &&
      offices.some(function(x){
        return x.idOficina===c.idOficinaPredeterminada;
      })
    ){
      office.value=c.idOficinaPredeterminada;
    }

    populateSalesGroups29();
    syncSalesCatalogAvailability29_();
  }

  function populateSalesGroups29(){
    const c=SALES_STATE.context&&SALES_STATE.context.comercial||{};
    const office=valueSales29("salesOfficeSelect");
    const group=document.getElementById("salesGroupSelect");

    if(!group)return;

    if(!office){
      group.innerHTML=
        '<option value="">Selecciona oficina primero</option>';
      group.value="";
      group.disabled=true;
      syncSalesCatalogAvailability29_();
      return;
    }

    const rows=
      c.gruposPorOficina?
        (c.gruposPorOficina[office]||[]):
        [];

    group.disabled=false;
    group.innerHTML=
      '<option value="">Selecciona grupo</option>'+
      rows.map(function(x){
        return '<option value="'+escapeHtml(x.idGrupo)+'">'+
          escapeHtml(x.nombre)+
        '</option>';
      }).join('');

    if(
      c.idGrupoPredeterminado &&
      rows.some(function(x){
        return x.idGrupo===c.idGrupoPredeterminado;
      })
    ){
      group.value=c.idGrupoPredeterminado;
    }

    syncSalesCatalogAvailability29_();
  }

  function hasCompleteSalesCommercialContext29_(){
    return Boolean(
      valueSales29("salesBusinessSelect") &&
      valueSales29("salesOfficeSelect") &&
      valueSales29("salesGroupSelect")
    );
  }

  function syncSalesCatalogAvailability29_(){
    const section=
      document.getElementById("salesOfferCatalogSection");
    const gate=
      document.getElementById("salesCatalogGate");
    const ready=
      document.getElementById("salesCommercialContextReady");

    const complete=
      hasCompleteSalesCommercialContext29_();

    if(section)section.hidden=!complete;
    if(gate)gate.hidden=complete;
    if(ready)ready.hidden=!complete;

    if(!complete){
      SALES_STATE.offers=[];
      SALES_STATE.offerFilters=null;

      ["salesOfferProduct","salesOfferType","salesOfferSubtype"]
        .forEach(function(id){
          const el=document.getElementById(id);
          if(el)el.innerHTML='<option value="">Todos</option>';
        });

      const region=
        document.getElementById("salesOffersRegion");
      if(region)region.innerHTML="";
    }

    return complete;
  }

  function bindSaleForm29(){
    document
      .querySelectorAll(
        'input[name="salesReceiverType"]'
      )
      .forEach(function(el){
        el.addEventListener(
          "change",
          updateSalesReceiverVisibility29
        );
      });

    on("salesBusinessSelect","change",function(){
      SALES_STATE.currentBusiness=
        valueSales29("salesBusinessSelect");

      if(syncSalesCatalogAvailability29_()){
        loadOffers29(false);
      }
    });

    on("salesOfficeSelect","change",function(){
      populateSalesGroups29();

      // Cambiar oficina deja el grupo sin seleccionar salvo que exista
      // un grupo predeterminado válido para esa oficina.
      if(syncSalesCatalogAvailability29_()){
        loadOffers29(false);
      }
    });

    on("salesGroupSelect","change",function(){
      if(syncSalesCatalogAvailability29_()){
        loadOffers29(false);
      }
    });

    const search=
      document.getElementById("salesOfferSearch");

    if(search){
      search.addEventListener(
        "input",
        debounceSales29(function(){
          if(hasCompleteSalesCommercialContext29_()){
            filterOffersClient29();
          }
        },120)
      );
    }

    [
      "salesOfferProduct",
      "salesOfferType",
      "salesOfferSubtype"
    ].forEach(function(id){
      on(id,"change",function(){
        if(hasCompleteSalesCommercialContext29_()){
          filterOffersClient29();
        }
      });
    });

    const form=
      document.getElementById("salesCashForm");

    if(form){
      form.addEventListener(
        "submit",
        saveCashSale29
      );
    }
  }
  function debounceSales29(fn,wait){let t;return function(){clearTimeout(t);const a=arguments;t=setTimeout(function(){fn.apply(null,a);},wait);};}

  function updateSalesReceiverVisibility29(){
    const other =
      getRadio29("salesReceiverType") === "OTRA_PERSONA";

    [
      "salesReceiverNameField",
      "salesReceiverDniField",
      "salesReceiverPhoneField",
      "salesReceiverRelationField"
    ].forEach(function(id){
      const el = document.getElementById(id);
      if (el) el.hidden = !other;
    });

    const buyerHint =
      document.getElementById("salesReceiverBuyerHint");

    if (buyerHint) buyerHint.hidden = other;
  }

  // Alias de compatibilidad con llamadas de pasos anteriores.
  function updateSalesClientVisibility29(){
    updateSalesReceiverVisibility29();
  }
  function getRadio29(name){const x=document.querySelector('input[name="'+name+'"]:checked');return x?x.value:"";}
  function setRadio29(name,value){const x=document.querySelector('input[name="'+name+'"][value="'+value+'"]');if(x)x.checked=true;}

  function salesOfferContextKey29P_(){
    return [
      valueSales29("salesBusinessSelect"),
      valueSales29("salesOfficeSelect"),
      valueSales29("salesGroupSelect")
    ].join("|");
  }

  function loadOffers29(forceReload){
    const negocio =
      valueSales29("salesBusinessSelect");
    const oficina =
      valueSales29("salesOfficeSelect");
    const grupo =
      valueSales29("salesGroupSelect");

    if(!negocio || !oficina || !grupo){
      syncSalesCatalogAvailability29_();
      return;
    }

    const key =
      salesOfferContextKey29P_();

    const cache =
      SALES_STATE.offerContextCache[key];

    if (
      !forceReload &&
      cache &&
      Array.isArray(cache.ofertas) &&
      Date.now() - Number(cache.guardadoEn || 0) < 300000
    ) {
      SALES_STATE.offerContextKey = key;
      SALES_STATE.offers = cache.ofertas;
      SALES_STATE.offerFilters = cache.filtros || null;
      SALES_STATE.offerContextLoadedAt = cache.guardadoEn;

      populateOfferFilters29();
      filterOffersClient29();
      return;
    }

    const token =
      ++SALES_STATE.offerRequestToken;

    const region =
      document.getElementById(
        "salesOffersRegion"
      );

    if(region){
      region.innerHTML =
        '<div class="mp-inline-loader">' +
          '<span class="material-symbols-rounded">progress_activity</span>' +
          'Cargando catálogo del contexto...' +
        '</div>';
    }

    secureRpc(
      "obtenerOpcionesFormularioVentaContadoModulo",
      [{
        idNegocio: negocio,
        tipoVenta: negocio,
        idOficina: oficina,
        idGrupo: grupo,
        limite: 1000
      }],
      "VENTAS_CONTADO"
    )
      .then(function(result){
        if(token !== SALES_STATE.offerRequestToken) return;

        result = result || {};
        const ofertas = result.ofertas || [];
        const filtros = result.filtrosDisponibles || null;

        SALES_STATE.offerContextCache[key] = {
          ofertas: ofertas,
          filtros: filtros,
          totalOfertas:
            Number(result.totalOfertas || ofertas.length),
          catalogoRecortado:
            result.catalogoRecortado === true,
          guardadoEn: Date.now()
        };

        SALES_STATE.offerContextKey = key;
        SALES_STATE.offers = ofertas;
        SALES_STATE.offerFilters = filtros;
        SALES_STATE.offerContextLoadedAt = Date.now();

        populateOfferFilters29();
        filterOffersClient29();
      })
      .catch(function(e){
        if(token !== SALES_STATE.offerRequestToken) return;

        if(region){
          region.innerHTML =
            '<div class="empty-state">' +
              '<strong>No se pudieron cargar ofertas</strong>' +
              '<p>' +
                escapeHtml(errorMessage(e)) +
              '</p>' +
            '</div>';
        }
      });
  }
  function populateOfferFilters29(){ const f=SALES_STATE.offerFilters||{}; fillSelect29("salesOfferProduct",f.productos);fillSelect29("salesOfferType",f.tipos);fillSelect29("salesOfferSubtype",f.subtipos); }
  function fillSelect29(id,rows){const el=document.getElementById(id);if(!el)return;const old=el.value;el.innerHTML='<option value="">Todos</option>'+(rows||[]).map(function(x){return '<option value="'+escapeHtml(x.id||x.codigo)+'">'+escapeHtml(x.nombre||x.codigo)+'</option>';}).join('');if([].slice.call(el.options).some(function(o){return o.value===old;}))el.value=old;}
  function filterOffersClient29(){
    const p = valueSales29("salesOfferProduct");
    const t = valueSales29("salesOfferType");
    const s = valueSales29("salesOfferSubtype");

    const texto =
      normalizeSalesDisplayText29(
        valueSales29("salesOfferSearch")
      );

    const rows =
      (SALES_STATE.offers || [])
        .filter(function(x){
          if (p && x.idProducto !== p) return false;
          if (t && x.idTipoMaterial !== t) return false;
          if (s && x.idSubtipoMaterial !== s) return false;

          if (!texto) return true;

          const indice =
            normalizeSalesDisplayText29([
              x.codigoMaterial,
              x.codigoSap,
              x.nombreMaterial,
              x.descripcionMaterial,
              x.producto,
              x.tipo,
              x.subtipo,
              x.marca,
              x.proveedor,
              x.codigoProveedor,
              x.codigoSapProveedor,
              x.detalleCombo,
              x.comentarioComercial
            ].join(" "));

          return indice.indexOf(texto) !== -1;
        });

    renderOffers29(rows,"");
  }
  function normalizeSalesDisplayText29(value){
    return String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function isSameSalesDisplayText29(a,b){
    const left=normalizeSalesDisplayText29(a);
    const right=normalizeSalesDisplayText29(b);
    return Boolean(left && right && left===right);
  }

  function getSalesOfferName29(item){
    item=item||{};
    return String(
      item.nombreMaterial ||
      item.descripcionMaterial ||
      item.codigoMaterial ||
      "Material"
    ).trim();
  }

  function getSalesDistinctDescription29(item){
    item=item||{};
    const nombre=getSalesOfferName29(item);
    const descripcion=String(item.descripcionMaterial||"").trim();

    if(!descripcion || isSameSalesDisplayText29(descripcion,nombre)){
      return "";
    }

    return descripcion;
  }

  function getSalesDistinctCombo29(item){
    item=item||{};
    const combo=String(item.detalleCombo||"").trim();

    if(!combo) return "";

    const nombre=getSalesOfferName29(item);
    const descripcion=String(item.descripcionMaterial||"").trim();

    if(
      isSameSalesDisplayText29(combo,nombre) ||
      (descripcion && isSameSalesDisplayText29(combo,descripcion))
    ){
      return "";
    }

    return combo;
  }

  function renderOffers29(rows,message){
    const region=document.getElementById("salesOffersRegion");
    if(!region)return;

    if(!rows.length){
      region.innerHTML=
        '<div class="empty-state">' +
          '<span class="material-symbols-rounded">inventory_2</span>' +
          '<strong>Sin ofertas</strong>' +
          '<p>'+escapeHtml(message||"No hay ofertas vigentes para estos filtros.")+'</p>' +
        '</div>';
      return;
    }

    region.innerHTML=rows.map(function(x){
      const nombre=getSalesOfferName29(x);
      const descripcion=getSalesDistinctDescription29(x);
      const combo=getSalesDistinctCombo29(x);

      return (
        '<article class="sales29-offer-card">' +
          '<div class="sales29-offer-top">' +
            '<div>' +
              '<small>' +
                escapeHtml(
                  [x.codigoMaterial,x.marca]
                    .filter(Boolean)
                    .join(" · ")
                ) +
              '</small>' +
              '<h5>'+escapeHtml(nombre)+'</h5>' +
              (
                descripcion ?
                  '<p>'+escapeHtml(descripcion)+'</p>' :
                  ''
              ) +
            '</div>' +
            '<strong class="sales29-price">' +
              formatSalesMoney(x.precioBase,x.moneda) +
            '</strong>' +
          '</div>' +

          '<div class="sales29-offer-meta">' +
            '<span>' +
              '<span class="material-symbols-rounded">store</span>' +
              escapeHtml(x.proveedor||"") +
            '</span>' +
            '<span>' +
              '<span class="material-symbols-rounded">account_tree</span>' +
              escapeHtml(
                [x.producto,x.tipo,x.subtipo]
                  .filter(Boolean)
                  .join(" › ")
              ) +
            '</span>' +
          '</div>' +

          (
            combo ?
              '<div class="sales29-combo">' +
                '<strong>Combo:</strong> ' +
                escapeHtml(combo) +
              '</div>' :
              ''
          ) +

          '<button class="button button--primary button--compact" ' +
            'type="button" data-add-offer="' +
            escapeHtml(x.idDetallePrecio) +
          '">' +
            '<span class="material-symbols-rounded">add_shopping_cart</span>' +
            'Agregar' +
          '</button>' +
        '</article>'
      );
    }).join("");

    region
      .querySelectorAll("[data-add-offer]")
      .forEach(function(btn){
        btn.addEventListener("click",function(){
          addOfferToCart29(btn.dataset.addOffer);
        });
      });
  }

  function addOfferToCart29(id){const offer=(SALES_STATE.offers||[]).find(function(x){return x.idDetallePrecio===id;});if(!offer)return;const existing=SALES_STATE.cart.find(function(x){return x.idDetallePrecio===id;});if(existing)existing.cantidad=Math.min(99,Number(existing.cantidad||1)+1);else SALES_STATE.cart.push(Object.assign({},offer,{cantidad:1}));renderCart29();}
  function renderCart29(){
    const target=document.getElementById("salesCartRegion");
    if(!target)return;

    if(!SALES_STATE.cart.length){
      target.innerHTML=
        '<div class="sales29-cart-empty">' +
          '<span class="material-symbols-rounded">shopping_cart</span>' +
          '<p>Agrega una oferta desde el catálogo.</p>' +
        '</div>' +
        '<div class="sales29-cart-total">' +
          '<span>Total</span>' +
          '<strong>S/ 0.00</strong>' +
        '</div>';
      return;
    }

    const total=SALES_STATE.cart.reduce(function(t,x){
      return t+
        Number(x.precioBase||x.precioUnitario||0)*
        Number(x.cantidad||1);
    },0);

    target.innerHTML=
      '<div class="sales29-cart-lines">' +
        SALES_STATE.cart.map(function(x,i){
          const nombre=getSalesOfferName29(x);
          const combo=getSalesDistinctCombo29(x);
          const proveedor=String(
            x.proveedor||
            x.nombreComercialProveedor||
            ""
          ).trim();

          const totalLinea=
            Number(x.precioBase||x.precioUnitario||0)*
            Number(x.cantidad||1);

          return (
            '<div class="sales29-cart-line">' +

              '<div class="sales29-cart-product">' +
                '<strong class="sales29-cart-product-name">' +
                  escapeHtml(nombre) +
                '</strong>' +

                (
                  combo ?
                    '<small class="sales29-cart-combo">' +
                      '<strong>Combo:</strong> ' +
                      escapeHtml(combo) +
                    '</small>' :
                    ''
                ) +

                (
                  proveedor ?
                    '<small class="sales29-cart-provider">' +
                      '<span class="material-symbols-rounded">store</span>' +
                      escapeHtml(proveedor) +
                    '</small>' :
                    ''
                ) +
              '</div>' +

              '<div class="sales29-cart-line-controls">' +
                '<div class="sales29-qty">' +
                  '<button type="button" aria-label="Disminuir cantidad" ' +
                    'data-cart-minus="'+i+'">−</button>' +
                  '<span>'+Number(x.cantidad||1)+'</span>' +
                  '<button type="button" aria-label="Aumentar cantidad" ' +
                    'data-cart-plus="'+i+'">+</button>' +
                '</div>' +

                '<div class="sales29-line-price">' +
                  '<span>' +
                    formatSalesMoney(
                      totalLinea,
                      x.moneda||"PEN"
                    ) +
                  '</span>' +
                  '<button type="button" class="sales29-remove" ' +
                    'aria-label="Eliminar producto" ' +
                    'data-cart-remove="'+i+'">' +
                    '<span class="material-symbols-rounded">delete</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +

            '</div>'
          );
        }).join("") +
      '</div>' +

      '<div class="sales29-cart-total">' +
        '<span>' +
          SALES_STATE.cart.reduce(function(t,x){
            return t+Number(x.cantidad||1);
          },0) +
          ' unidades' +
        '</span>' +
        '<strong>'+formatSalesMoney(total,"PEN")+'</strong>' +
      '</div>';

    target
      .querySelectorAll("[data-cart-minus]")
      .forEach(function(button){
        button.onclick=function(){
          const item=
            SALES_STATE.cart[
              Number(button.dataset.cartMinus)
            ];

          if(item){
            item.cantidad=Math.max(
              1,
              Number(item.cantidad||1)-1
            );
            renderCart29();
          }
        };
      });

    target
      .querySelectorAll("[data-cart-plus]")
      .forEach(function(button){
        button.onclick=function(){
          const item=
            SALES_STATE.cart[
              Number(button.dataset.cartPlus)
            ];

          if(item){
            item.cantidad=Math.min(
              99,
              Number(item.cantidad||1)+1
            );
            renderCart29();
          }
        };
      });

    target
      .querySelectorAll("[data-cart-remove]")
      .forEach(function(button){
        button.onclick=function(){
          SALES_STATE.cart.splice(
            Number(button.dataset.cartRemove),
            1
          );
          renderCart29();
        };
      });
  }

  function prefillSaleEdit29(v){
    setSelectValue29("salesBusinessSelect",v.tipoVenta||"");
    setSelectValue29("salesOfficeSelect",v.idOficina||"");
    populateSalesGroups29();
    setSelectValue29("salesGroupSelect",v.idGrupo||"");

    setRadio29(
      "salesIsCalidda",
      v.esClienteCalidda==="SI"?"SI":"NO"
    );

    setRadio29(
      "salesReceiveAccountAddress",
      v.recibeDireccionCuenta==="SI"?"SI":"NO"
    );

    setVal29("salesContractInput",v.cuentaContrato);
    setVal29("salesClientNameInput",v.nombreCliente);
    setVal29("salesPhoneInput",v.telefonoCliente||v.telefono);
    setVal29("salesDniInput",v.dniCliente||v.dni);
    setVal29("salesAddressInput",v.direccionEntrega);
    setVal29("salesReferenceInput",v.referencia);

    const tipoReceptor =
      v.tipoReceptor === "OTRA_PERSONA"
        ? "OTRA_PERSONA"
        : "COMPRADOR";

    setRadio29("salesReceiverType",tipoReceptor);

    if(tipoReceptor === "OTRA_PERSONA"){
      setVal29("salesReceiverNameInput",v.nombreReceptor);
      setVal29("salesReceiverDniInput",v.dniReceptor);
      setVal29("salesReceiverPhoneInput",v.telefonoReceptor);
      setVal29("salesReceiverRelationInput",v.relacionReceptor);
    }

    setVal29("salesObservationInput",v.observaciones);
    updateSalesReceiverVisibility29();
    syncSalesCatalogAvailability29_();
  }
  function setVal29(id,v){const el=document.getElementById(id);if(el)el.value=v||"";}

  function saveCashSale29(event){
    event.preventDefault();

    if(
      !valueSales29("salesBusinessSelect") ||
      !valueSales29("salesOfficeSelect") ||
      !valueSales29("salesGroupSelect")
    ){
      toast(
        "Contexto comercial requerido",
        "Selecciona negocio, oficina y grupo de ventas antes de registrar la venta.",
        true
      );
      return;
    }

    if(!SALES_STATE.cart.length){
      toast(
        "Carrito vacío",
        "Agrega al menos una oferta.",
        true
      );
      return;
    }

    const edit =
      SALES_STATE.editing &&
      SALES_STATE.editing.venta;

    const btn =
      document.getElementById("salesSaveButton");

    if(btn) btn.disabled=true;

    const file =
      document.getElementById("salesReceiptInput") &&
      document.getElementById("salesReceiptInput").files[0];

    const build=function(receipt){
      const data={
        idVenta:edit?edit.idVenta:"",
        tipoVenta:valueSales29("salesBusinessSelect"),
        idNegocio:valueSales29("salesBusinessSelect"),
        idOficina:valueSales29("salesOfficeSelect"),
        idGrupo:valueSales29("salesGroupSelect"),
        tipoRegistro:edit ? (edit.tipoRegistro||"COMERCIAL") : ((SALES_STATE.context&&SALES_STATE.context.permisos&&SALES_STATE.context.permisos.puedeGestionarPruebas) ? (getRadio29("salesRecordType")||"COMERCIAL") : "COMERCIAL"),

        esClienteCalidda:getRadio29("salesIsCalidda"),
        recibeDireccionCuenta:
          getRadio29("salesReceiveAccountAddress"),

        cuentaContrato:valueSales29("salesContractInput"),
        nombreCliente:valueSales29("salesClientNameInput"),
        telefono:valueSales29("salesPhoneInput"),
        telefonoCliente:valueSales29("salesPhoneInput"),
        dni:valueSales29("salesDniInput"),
        dniCliente:valueSales29("salesDniInput"),
        direccionEntrega:valueSales29("salesAddressInput"),
        referencia:valueSales29("salesReferenceInput"),

        tipoReceptor:
          getRadio29("salesReceiverType") || "COMPRADOR",
        nombreReceptor:valueSales29("salesReceiverNameInput"),
        dniReceptor:valueSales29("salesReceiverDniInput"),
        telefonoReceptor:valueSales29("salesReceiverPhoneInput"),
        relacionReceptor:valueSales29("salesReceiverRelationInput"),

        observaciones:valueSales29("salesObservationInput"),

        detalles:SALES_STATE.cart.map(function(x){
          return{
            idDetallePrecio:x.idDetallePrecio||x.idOferta,
            idOferta:x.idDetallePrecio||x.idOferta,
            idListaPrecio:x.idListaPrecio||"",
            idProveedor:x.idProveedor||"",
            idProveedorPrecio:x.idProveedor||"",
            idMaterial:x.idMaterial,
            cantidad:Number(x.cantidad||1)
          };
        })
      };

      if(receipt) data.comprobante=receipt;
      return data;
    };

    const go=function(receipt){
      secureRpc(
        edit
          ? "modificarVentaContadoModulo"
          : "guardarVentaContadoModulo",
        [build(receipt)],
        "VENTAS_CONTADO"
      )
      .then(function(r){
        // El detalle puede haberse abierto antes de que Supabase termine de
        // devolver la fila persistida. Nunca reutilizar su versión previa.
        const savedId = String((r && r.idVenta) || (edit && edit.idVenta) || "");
        if (savedId && SALES_STATE.detailCache) {
          Object.keys(SALES_STATE.detailCache).forEach(function(key) {
            if (key.indexOf(savedId) !== -1) delete SALES_STATE.detailCache[key];
          });
        }
        SALES_STATE.offerContextCache = {};
        toast(
          edit?"Venta modificada":"Venta registrada",
          r.mensaje||("Código: "+(r.codigoVenta||""))
        );

        closeSalesModal29W_();
        SALES_STATE.cart=[];
        invalidarCacheBandejasVentasPaso29G_();
        loadCashSalesContext(true);
      })
      .catch(function(e){
        toast(
          "No se pudo guardar",
          errorMessage(e),
          true
        );
      })
      .finally(function(){
        if(btn)btn.disabled=false;
      });
    };

    if(file){
      readFileSales29(file)
        .then(go)
        .catch(function(e){
          toast(
            "Archivo inválido",
            errorMessage(e),
            true
          );
          if(btn)btn.disabled=false;
        });
    }else if(!edit){
      toast(
        "Comprobante requerido",
        "Adjunta el comprobante de pago.",
        true
      );
      if(btn)btn.disabled=false;
    }else{
      go(null);
    }
  }

  function readFileSales29(file){return new Promise(function(resolve,reject){if(file.size>5*1024*1024){reject(new Error("El archivo supera 5 MB."));return;}const r=new FileReader();r.onload=function(){resolve({nombre:file.name,mimeType:file.type,base64:String(r.result||"").split(',').pop()});};r.onerror=function(){reject(new Error("No se pudo leer el archivo."));};r.readAsDataURL(file);});}


  function salesItemStateBadge29(item) {
    item = item || {};

    const estado = String(
      item.estadoItem || "ACTIVO"
    ).toUpperCase();

    if (estado === "ANULADO") {
      return '<span class="status-pill is-danger">Anulado</span>';
    }

    return '<span class="status-pill is-success">Activo</span>';
  }

  function salesItemCancellationDetail29(item) {
    item = item || {};

    if (
      String(item.estadoItem || "").toUpperCase() !== "ANULADO"
    ) {
      return "";
    }

    const labels = {
      CLIENTE_DESISTIO_PRODUCTO:"Cliente ya no desea el producto",
      CAMBIO_PRODUCTO:"Cambio de producto",
      PRODUCTO_NO_REQUERIDO:"Producto ya no requerido",
      ERROR_REGISTRO:"Error de registro",
      OTRO:"Otro"
    };

    const motivo = labels[
      String(item.motivoAnulacionItem || "").toUpperCase()
    ] || item.motivoAnulacionItem || "Anulado";

    return '<div class="sales29-item-cancel-detail">' +
      '<strong>' + escapeHtml(motivo) + '</strong>' +
      (
        item.observacionAnulacionItem
          ? '<small>' +
              escapeHtml(item.observacionAnulacionItem) +
            '</small>'
          : ''
      ) +
      (
        item.fechaAnulacionItem
          ? '<small>Anulado: ' +
              escapeHtml(item.fechaAnulacionItem) +
            '</small>'
          : ''
      ) +
    '</div>';
  }

  function salesFinancialAdjustment29(venta) {
    venta = venta || {};

    const original = Number(
      venta.totalVentaOriginal ||
      venta.totalVenta ||
      0
    );

    const vigente = Number(
      venta.totalVentaVigente !== undefined
        ? venta.totalVentaVigente
        : venta.totalVenta || 0
    );

    const anulado = Number(
      venta.totalAnulado || 0
    );

    if (!anulado && !venta.requiereRegularizacionFinanciera) {
      return '';
    }

    let alert = '';

    if (venta.requiereRegularizacionFinanciera) {
      alert =
        '<div class="sales29-financial-alert">' +
          '<span class="material-symbols-rounded">account_balance_wallet</span>' +
          '<div>' +
            '<strong>Regularización financiera pendiente</strong>' +
            '<span>El abono fue aprobado por ' +
              formatSalesMoney(
                venta.importeAbonoAprobado,
                venta.moneda
              ) +
              ' y el importe vigente de la venta es ' +
              formatSalesMoney(vigente,venta.moneda) +
              '. Diferencia: ' +
              formatSalesMoney(
                venta.diferenciaRegularizacion,
                venta.moneda
              ) +
              '.</span>' +
          '</div>' +
        '</div>';
    }

    return '<section class="sales29-modal-section sales29-financial-section">' +
      '<div class="sales-form-section-head">' +
        '<span class="material-symbols-rounded">receipt_long</span>' +
        '<div><h4>Importe de la venta</h4><p>Los materiales anulados se conservan como trazabilidad y dejan de formar parte del importe vigente.</p></div>' +
      '</div>' +
      '<div class="sales29-financial-grid">' +
        '<div><small>Importe original</small><strong>' +
          formatSalesMoney(original,venta.moneda) +
        '</strong></div>' +
        '<div><small>Importe vigente</small><strong>' +
          formatSalesMoney(vigente,venta.moneda) +
        '</strong></div>' +
        '<div><small>Importe anulado</small><strong>' +
          formatSalesMoney(anulado,venta.moneda) +
        '</strong></div>' +
      '</div>' +
      alert +
    '</section>';
  }

  function openCancelSaleItem29(idVenta,idDetalleVenta) {
    const cacheKey =
      salesDetailCacheKey29M_(
        idVenta,
        SALES_STATE.activeView
      );

    const detail =
      SALES_STATE.detailCache &&
      SALES_STATE.detailCache[cacheKey] &&
      SALES_STATE.detailCache[cacheKey].data
        ? SALES_STATE.detailCache[cacheKey].data
        : null;

    const item = detail && Array.isArray(detail.detalles)
      ? detail.detalles.find(function(row){
          return String(row.idDetalleVenta || '') ===
            String(idDetalleVenta || '');
        })
      : null;

    if (!item || !item.puedeAnularMaterial) {
      toast(
        'Anulación no disponible',
        'Solo el responsable de la venta puede anular materiales que todavía no hayan sido entregados.',
        true
      );
      return;
    }

    const name = String(
      item.descripcionMaterial ||
      item.codigoMaterial ||
      'Material'
    );

    openModal({
      eyebrow:'ANULACIÓN DE MATERIAL',
      title:'Anular ' + escapeHtml(name),
      wide:false,
      body:'<div class="sales-modal-shell">' +
        '<div class="sales29-cancel-warning">' +
          '<strong>Se anulará toda la línea del material.</strong><br>' +
          'Cantidad: ' + Number(item.cantidad || 1) +
          ' · Total: ' +
          formatSalesMoney(item.totalLinea,item.moneda) +
          '. El registro permanecerá visible como trazabilidad.' +
        '</div>' +
        '<div class="sales-form-grid">' +
          '<label class="input-field span-2">' +
            '<span>Motivo de anulación</span>' +
            '<select id="salesCancelItemReason29">' +
              '<option value="">Selecciona</option>' +
              '<option value="CLIENTE_DESISTIO_PRODUCTO">Cliente ya no desea el producto</option>' +
              '<option value="CAMBIO_PRODUCTO">Cambio de producto</option>' +
              '<option value="PRODUCTO_NO_REQUERIDO">Producto ya no requerido</option>' +
              '<option value="ERROR_REGISTRO">Error de registro</option>' +
              '<option value="OTRO">Otro</option>' +
            '</select>' +
          '</label>' +
          '<label class="input-field span-2">' +
            '<span>Observación / sustento</span>' +
            '<textarea id="salesCancelItemObservation29" rows="4" maxlength="1000" placeholder="Describe por qué se anula este material"></textarea>' +
          '</label>' +
        '</div>' +
      '</div>',
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button>' +
        '<button id="salesConfirmCancelItem29" class="button button--primary" type="button">' +
          '<span class="material-symbols-rounded">remove_shopping_cart</span>Anular material' +
        '</button>'
    });

    bindSalesModalClose29();

    on('salesConfirmCancelItem29','click',function(){
      const motivo = valueSales29('salesCancelItemReason29');
      const observacion =
        valueSales29('salesCancelItemObservation29');

      if (!motivo) {
        toast(
          'Motivo requerido',
          'Selecciona el motivo de anulación.',
          true
        );
        return;
      }

      if (!observacion) {
        toast(
          'Observación requerida',
          'Ingresa una observación para sustentar la anulación.',
          true
        );
        return;
      }

      const btn =
        document.getElementById('salesConfirmCancelItem29');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<span class="material-symbols-rounded">progress_activity</span>Anulando…';
      }

      secureRpc(
        'anularMaterialVentaContadoModulo',
        [{
          idVenta:idVenta,
          idDetalleVenta:idDetalleVenta,
          motivo:motivo,
          observacion:observacion
        }],
        'VENTAS_CONTADO'
      )
        .then(function(result){
          const row = getSalesRowById29(idVenta);

          if (row) {
            row.estado = result.estadoVenta || row.estado;
            row.totalVenta = Number(
              result.totalVentaVigente ||
              result.totalVenta ||
              0
            );
            row.importeVisible = row.totalVenta;
            row.totalItems = Number(
              result.totalItems || 0
            );
          }

          invalidateSalesDetailCache29(idVenta);
          SALES_STATE.viewCache = {};
          SALES_STATE.syncRevision =
            String(result.revisionDatos || '');

          closeSalesModal29W_();
          renderSalesTable29(SALES_STATE.rows);

          toast(
            'Material anulado',
            result.mensaje ||
            'El material fue anulado correctamente.'
          );

          // Se vuelve a abrir el detalle para que el responsable vea
          // inmediatamente el estado del material y el nuevo total.
          window.setTimeout(function(){
            openSalesDetail29(idVenta);
          },180);

          window.setTimeout(function(){
            loadSalesList(true);
          },600);
        })
        .catch(function(error){
          toast(
            'No se pudo anular',
            errorMessage(error),
            true
          );

          if (btn) {
            btn.disabled = false;
            btn.innerHTML =
              '<span class="material-symbols-rounded">remove_shopping_cart</span>Anular material';
          }
        });
    });
  }

  function openSalesDetail29(idVenta){
    const row = getSalesRowById29(idVenta) || { idVenta: idVenta };

    const modalKey =
      "DETALLE:" +
      String(idVenta || "");

    const token =
      prepareSalesModal29W_(
        modalKey
      );

    openModal({
      eyebrow:"VENTA",
      title: row.codigoVenta || "Detalle",
      wide:true,
      body:'<div class="sales-modal-shell"><div class="sales29-inline-loader"><span class="material-symbols-rounded">progress_activity</span><span>Cargando detalle de la venta...</span></div></div>',
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button>'
    });
    bindSalesModalClose29();
    getSalesDetailCached29(
      idVenta,
      false,
      SALES_STATE.activeView
    ).then(function(r){
      if (
        !isSalesModalCurrent29W_(
          token,
          modalKey
        )
      ) {
        return;
      }

      const v=r.venta||{},d=r.detalles||[];
      const receipt =
        salesSecureFileButtons29U(
          v.idVenta,
          v.idArchivoComprobante,
          v.urlComprobante,
          v.nombreArchivoComprobante ||
            "Comprobante de pago",
          true
        );

      const evid =
        (r.evidenciasEntrega || [])
          .map(function(e) {
            return '<div class="sales29-evidence-file">' +
              '<span>' +
                escapeHtml(
                  e.tipoEvidencia +
                  ' · ' +
                  e.nombreArchivo
                ) +
              '</span>' +
              salesSecureFileButtons29U(
                v.idVenta,
                e.idArchivo,
                e.url,
                e.nombreArchivo,
                true
              ) +
            '</div>';
          })
          .join('') ||
        '<span class="sales-muted">Sin evidencias de entrega</span>';
      const body = '<div class="sales-modal-shell sales-detail-shell">' +
        salesRecordTypeNotice29T(v) +
        salesSummaryCards29(v) +
        '<section class="sales29-modal-section sales29-sale-products-section">' +
          '<div class="sales-form-section-head">' +
            '<span class="material-symbols-rounded">inventory_2</span>' +
            '<div>' +
              '<h4>Productos y estado de entrega</h4>' +
              '<p>Consulta el avance de cada material para brindar información al cliente.</p>' +
            '</div>' +
          '</div>' +
          '<div class="sales29-items-table-wrap">' +
            '<table class="sales-items-table">' +
              '<thead><tr>' +
                '<th>Producto</th>' +
                '<th>Cant.</th>' +
                '<th>Precio</th>' +
                '<th>Total</th>' +
                '<th>Estado material</th>' +
                '<th>Estado de entrega</th>' +
              '</tr></thead>' +
              '<tbody>' +
                d.map(function(x){
                  const anulado =
                    String(x.estadoItem || '').toUpperCase() === 'ANULADO';

                  const cancelButton =
                    x.puedeAnularMaterial
                      ? '<button class="button button--secondary button--compact sales29-cancel-item-btn" type="button" data-sales-cancel-item="' +
                          escapeHtml(x.idDetalleVenta || '') +
                          '">' +
                          '<span class="material-symbols-rounded">remove_shopping_cart</span>Anular material' +
                        '</button>'
                      : '';

                  return '<tr class="' +
                    (anulado ? 'sales29-item-row-cancelled' : '') +
                    '">' +
                    '<td>' +
                      '<strong>' +
                        escapeHtml(
                          x.descripcionMaterial ||
                          x.codigoMaterial ||
                          'Producto'
                        ) +
                      '</strong>' +
                      (x.detalleCombo
                        ? '<small><strong>Combo:</strong> ' +
                          escapeHtml(x.detalleCombo) +
                          '</small>'
                        : '') +
                      '<small><strong>Proveedor:</strong> ' +
                        escapeHtml(
                          x.nombreComercialProveedor ||
                          x.codigoSapProveedor ||
                          '—'
                        ) +
                      '</small>' +
                      cancelButton +
                    '</td>' +
                    '<td>' +
                      Number(x.cantidad || 1) +
                    '</td>' +
                    '<td>' +
                      formatSalesMoney(
                        x.precioUnitario,
                        x.moneda
                      ) +
                    '</td>' +
                    '<td>' +
                      formatSalesMoney(
                        x.totalLinea,
                        x.moneda
                      ) +
                    '</td>' +
                    '<td>' +
                      salesItemStateBadge29(x) +
                      salesItemCancellationDetail29(x) +
                    '</td>' +
                    '<td>' +
                      (
                        anulado
                          ? '<span class="status-pill is-muted">No aplica</span>'
                          : salesMaterialDeliveryDetail29(x,v)
                      ) +
                    '</td>' +
                  '</tr>';
                }).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</section>' +
        salesFinancialAdjustment29(v) +
        renderApprovalDocuments29N(v) +
        '<div class="sales29-modal-section"><div class="sales-form-grid"><div><p><strong>Comprobante de pago del cliente:</strong> '+receipt+' <span class="sales29-inline-document-state">'+escapeHtml(String(v.estadoComprobantePagoCliente||'NO_CARGADO').replace('_',' '))+'</span></p>'+(v.observacionConfirmacionAbono?'<p><strong>Observación de abono:</strong> '+escapeHtml(v.observacionConfirmacionAbono)+'</p>':'')+'</div><div class="sales29-evidence-summary"><strong>Evidencias de entrega</strong><div>'+evid+'</div></div></div></div>'+
      '</div>';
      const bodyNode = document.querySelector('#modalRoot .modal-body');
      if (bodyNode) {
        bodyNode.innerHTML = body;

        bindSalesSecureFileButtons29U(
          bodyNode
        );

        bodyNode
          .querySelectorAll('[data-sales-cancel-item]')
          .forEach(function(button){
            button.addEventListener('click',function(){
              openCancelSaleItem29(
                idVenta,
                button.dataset.salesCancelItem
              );
            });
          });
      }
    }).catch(function(e){
      if (
        !isSalesModalCurrent29W_(
          token,
          modalKey
        )
      ) {
        return;
      }

      toast(
        "No se pudo abrir",
        errorMessage(e),
        true
      );

      closeSalesModal29W_();
    });
  }



  function ensureApprovalDocumentsStyles29N_() {
    if (
      document.getElementById(
        "salesApprovalDocumentsStyles29N"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "salesApprovalDocumentsStyles29N";

    style.textContent =
      ".sales29-field-label{display:block;margin-bottom:7px;color:#334155;font-size:12px;font-weight:800}" +
      ".sales29-approval-documents{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}" +
      ".sales29-approval-document{position:relative;display:flex;align-items:center;gap:10px;min-height:72px;padding:12px 14px;border:1px solid #dbe7f0;border-radius:14px;background:#fff;text-decoration:none;color:#0f172a;transition:.15s ease}" +
      ".sales29-approval-document:hover{border-color:#8fd8f3;background:#f8fdff}" +
      ".sales29-approval-document>span:first-child{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#eefaff;color:#007aa8;flex:0 0 auto}" +
      ".sales29-approval-document>div{display:flex;flex-direction:column;gap:3px;min-width:0}" +
      ".sales29-approval-document small{color:#64748b;font-size:11px;font-weight:700}" +
      ".sales29-approval-document strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".sales29-approval-document-open{margin-left:auto;color:#64748b;font-size:18px}" +
      ".sales29-approval-document.is-empty{opacity:.72;cursor:default}" +
      ".sales29-document-state{display:inline-flex;width:max-content;margin-top:4px;padding:2px 7px;border-radius:999px;font-size:9px;font-style:normal;font-weight:900;letter-spacing:.035em}" +
      ".sales29-document-state.is-loaded{background:#ecfdf5;color:#047857}" +
      ".sales29-document-state.is-missing{background:#f1f5f9;color:#64748b}" +
      ".sales29-inline-document-state{display:inline-flex;margin-left:6px;padding:2px 7px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:9px;font-weight:900}" +
      ".sales29-secure-file-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}" +
      ".sales29-approval-document .sales29-secure-file-actions{margin-left:auto;justify-content:flex-end}" +
      ".sales29-evidence-file{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #edf2f7}" +
      ".sales29-evidence-file:last-child{border-bottom:0}" +
      "@media(max-width:760px){.sales29-approval-documents{grid-template-columns:1fr}}";

    document.head.appendChild(style);
  }

  function renderApprovalDocuments29N(venta) {
    ensureApprovalDocumentsStyles29N_();
    venta = venta || {};

    const tieneDeposito =
      Boolean(
        venta.idArchivoDepositoProveedor ||
        venta.urlDepositoProveedor
      );

    const tieneBoleta =
      Boolean(
        venta.idArchivoBoletaVentaCliente ||
        venta.urlBoletaVentaCliente
      );

    if (!tieneDeposito && !tieneBoleta) {
      return '';
    }

    const documento = function(
      titulo,
      idArchivo,
      url,
      nombre,
      icono,
      estado
    ) {
      const fileId =
        extractSalesDriveFileId29U(
          idArchivo,
          url
        );

      if (!fileId) {
        return '<div class="sales29-approval-document is-empty">' +
          '<span class="material-symbols-rounded">' +
            escapeHtml(icono) +
          '</span>' +
          '<div><small>' +
            escapeHtml(titulo) +
          '</small><strong>No registrado</strong>' +
          '<em class="sales29-document-state is-missing">NO CARGADO</em>' +
          '</div>' +
        '</div>';
      }

      return '<div class="sales29-approval-document">' +
        '<span class="material-symbols-rounded">' +
          escapeHtml(icono) +
        '</span>' +
        '<div><small>' +
          escapeHtml(titulo) +
        '</small><strong>' +
          escapeHtml(
            nombre ||
            'Documento registrado'
          ) +
        '</strong>' +
        '<em class="sales29-document-state is-loaded">' +
          escapeHtml(
            String(
              estado ||
              'CARGADO'
            ).replace('_',' ')
          ) +
        '</em></div>' +
        salesSecureFileButtons29U(
          venta.idVenta,
          fileId,
          url,
          nombre || titulo,
          true
        ) +
      '</div>';
    };

    return '<section class="sales29-modal-section">' +
      '<div class="sales-form-section-head">' +
        '<span class="material-symbols-rounded">fact_check</span>' +
        '<div><h4>Documentos de aprobación del abono</h4><p>Los archivos se abren de forma segura desde Cálidda 360.</p></div>' +
      '</div>' +
      '<div class="sales29-approval-documents">' +
        documento(
          'Depósito al proveedor',
          venta.idArchivoDepositoProveedor,
          venta.urlDepositoProveedor,
          venta.nombreDepositoProveedor,
          'payments',
          venta.estadoDepositoProveedor
        ) +
        documento(
          'Boleta de venta para el cliente',
          venta.idArchivoBoletaVentaCliente,
          venta.urlBoletaVentaCliente,
          venta.nombreBoletaVentaCliente,
          'receipt_long',
          venta.estadoBoletaVentaCliente
        ) +
      '</div>' +
    '</section>';
  }

  function openPaymentValidation29(idVenta){
    prepareSalesModal29W_("ABONO:" + String(idVenta || ""));
    ensureApprovalDocumentsStyles29N_();

    const row =
      getSalesRowById29(idVenta) ||
      { idVenta:idVenta };

    // PASO 29E: el listado ya trae toda la información requerida para validar
    // el abono, incluido URL_COMPROBANTE. El modal abre sin esperar otro RPC.
    openModal({
      eyebrow:"VALIDACIÓN DE ABONO",
      title:row.codigoVenta||"Venta",
      wide:true,
      body:renderPaymentValidationBody29(row,{venta:row},false),
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button><button id="salesObservePaymentButton" class="button button--secondary" type="button"><span class="material-symbols-rounded">report</span>Observar</button><button id="salesApprovePaymentButton" class="button button--primary" type="button"><span class="material-symbols-rounded">verified</span>Aprobar abono</button>'
    });

    bindSalesModalClose29();
    on("salesApprovePaymentButton","click",function(){submitPayment29(idVenta,true);});
    on("salesObservePaymentButton","click",function(){submitPayment29(idVenta,false);});
  }

  function applyPaymentResultOptimistically29_(idVenta, result, approve) {
    const id = String(idVenta || '').trim();
    let row = null;

    SALES_STATE.rows = (SALES_STATE.rows || []).map(function(item) {
      if (String(item.idVenta || '').trim() !== id) return item;

      row = Object.assign({}, item, {
        estadoAbono: result && result.estadoAbono ? result.estadoAbono : (approve ? 'ABONO_CONFIRMADO' : 'ABONO_OBSERVADO'),
        estado: result && result.estado ? result.estado : (approve ? 'POR_ENTREGAR' : 'REGISTRADA')
      });

      return row;
    });

    if (SALES_STATE.activeView === 'ABONOS' && approve) {
      SALES_STATE.rows = SALES_STATE.rows.filter(function(item) {
        return String(item.idVenta || '').trim() !== id;
      });

      if (SALES_STATE.pagination && Number(SALES_STATE.pagination.total || 0) > 0) {
        SALES_STATE.pagination.total = Math.max(0, Number(SALES_STATE.pagination.total || 0) - 1);
      }
    }

    renderSalesTable29(SALES_STATE.rows);
    renderSalesPagination29();
  }

  function submitPayment29(idVenta,approve){
    const obs =
      valueSales29(
        "salesPaymentObservationInput"
      );

    if(!approve && !obs){
      toast(
        "Observación requerida",
        "Indica el motivo de la observación.",
        true
      );
      return;
    }

    const providerDepositInput =
      document.getElementById(
        "salesProviderDepositInput"
      );

    const customerReceiptInput =
      document.getElementById(
        "salesCustomerReceiptInput"
      );

    const providerDeposit =
      providerDepositInput &&
      providerDepositInput.files
        ? providerDepositInput.files[0]
        : null;

    const customerReceipt =
      customerReceiptInput &&
      customerReceiptInput.files
        ? customerReceiptInput.files[0]
        : null;

    if (approve && !providerDeposit) {
      toast(
        "Adjunto requerido",
        "Adjunta el comprobante de depósito al proveedor.",
        true
      );
      return;
    }

    if (approve && !customerReceipt) {
      toast(
        "Adjunto requerido",
        "Adjunta la boleta de venta que irá al cliente.",
        true
      );
      return;
    }

    const fn =
      approve
        ? "confirmarAbonoVentaContadoModulo"
        : "observarAbonoVentaContadoModulo";

    const approveBtn =
      document.getElementById(
        "salesApprovePaymentButton"
      );

    const observeBtn =
      document.getElementById(
        "salesObservePaymentButton"
      );

    if (approveBtn) {
      approveBtn.disabled = true;

      if (approve) {
        approveBtn.innerHTML =
          '<span class="material-symbols-rounded">progress_activity</span>Guardando documentos…';
      }
    }

    if (observeBtn) {
      observeBtn.disabled = true;

      if (!approve) {
        observeBtn.innerHTML =
          '<span class="material-symbols-rounded">progress_activity</span>Registrando…';
      }
    }

    const restoreButtons = function(){
      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.innerHTML =
          '<span class="material-symbols-rounded">verified</span>Aprobar abono';
      }

      if (observeBtn) {
        observeBtn.disabled = false;
        observeBtn.innerHTML =
          '<span class="material-symbols-rounded">report</span>Observar';
      }
    };

    const executeRpc = function(payload){
      secureRpc(
        fn,
        [payload],
        "VENTAS_CONTADO"
      )
        .then(function(r){
          invalidateSalesDetailCache29(
            idVenta
          );

          SALES_STATE.viewCache = {};

          SALES_STATE.syncRevision =
            String(
              r &&
              r.revisionDatos ||
              ""
            );

          applyPaymentResultOptimistically29_(
            idVenta,
            r || {},
            approve
          );

          closeSalesModal29W_();

          toast(
            approve
              ? "Abono aprobado"
              : "Abono observado",
            r.mensaje || ""
          );

          window.setTimeout(function(){
            loadSalesList(true);
          },700);
        })
        .catch(function(e){
          restoreButtons();

          toast(
            "No se pudo validar",
            errorMessage(e),
            true
          );
        });
    };

    if (!approve) {
      executeRpc({
        idVenta:idVenta,
        observacion:obs
      });

      return;
    }

    Promise.all([
      readFileSales29(
        providerDeposit
      ),
      readFileSales29(
        customerReceipt
      )
    ])
      .then(function(files){
        executeRpc({
          idVenta:idVenta,
          observacion:obs,

          comprobanteDepositoProveedor:
            files[0],

          boletaVentaCliente:
            files[1]
        });
      })
      .catch(function(error){
        restoreButtons();

        toast(
          "Archivo inválido",
          errorMessage(error),
          true
        );
      });
  }

  function openDeliveryManagement29(idVenta){
    const row = getSalesRowById29(idVenta) || { idVenta:idVenta };
    SALES_STATE.deliveryDetail = null;

    const modalKey =
      "ENTREGA:" +
      String(idVenta || "");

    const token =
      prepareSalesModal29W_(
        modalKey
      );

    openModal({
      eyebrow:"GESTIÓN DE ENTREGA",
      title:"Código de Venta: " + (row.codigoVenta || '—'),
      wide:true,
      body:renderDeliveryManagementBody29(row,null,true),
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button><button id="salesSaveDeliveryButton" class="button button--primary" type="button"><span class="material-symbols-rounded">save</span>Guardar gestión</button>'
    });

    bindSalesModalClose29();
    on("salesSaveDeliveryButton","click",function(){saveDelivery29(idVenta);});

    getSalesDetailCached29(idVenta,false,"ENTREGAS")
      .then(function(r){
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        SALES_STATE.deliveryDetail = r || {};
        const venta = r && r.venta ? r.venta : row;
        const modalTitle = document.querySelector('#modalRoot .modal-header h3, #modalRoot .modal-header h2');
        if (modalTitle) {
          modalTitle.textContent = 'Código de Venta: ' + (venta.codigoVenta || row.codigoVenta || '—');
        }

        const bodyNode = document.querySelector('#modalRoot .modal-body');
        if (bodyNode) {
          bodyNode.innerHTML = renderDeliveryManagementBody29(row,r,false);
        }

        bindSalesDeliveryStatus29();
        refreshDeliveryProviderContext29_();
      })
      .catch(function(e){
        if (
          !isSalesModalCurrent29W_(
            token,
            modalKey
          )
        ) {
          return;
        }

        SALES_STATE.deliveryDetail = { detalles:[], gestionesEntrega:[] };
        const bodyNode = document.querySelector('#modalRoot .modal-body');

        if (bodyNode) {
          bodyNode.innerHTML =
            renderDeliveryManagementBody29(row,SALES_STATE.deliveryDetail,false) +
            '<div class="sales29-provider-empty">No fue posible cargar el detalle de la entrega. ' +
              escapeHtml(errorMessage(e)) +
            '</div>';
        }

        bindSalesDeliveryStatus29();
      });
  }

  async function saveDelivery29(idVenta){
    const status = valueSales29('salesDeliveryStatus') || 'PENDIENTE';
    const provider = valueSales29('salesDeliveryProvider');
    const observation = valueSales29('salesDeliveryObservation');
    const fechaProgramada = valueSales29('salesDeliveryScheduledDate');

    if(!provider){
      toast('Proveedor requerido','No se pudo identificar el proveedor asociado al precio de los productos.',true);
      return;
    }

    if(status === 'PROGRAMADA' && !fechaProgramada){
      toast('Fecha requerida','Selecciona la fecha acordada con el cliente.',true);
      return;
    }

    if(status === 'OBSERVADA' && !observation){
      toast('Observación requerida','Describe lo ocurrido con la entrega.',true);
      return;
    }

    const evidenceDefs = [];

    if (status === 'OBSERVADA') {
      evidenceDefs.push(['salesEvidenceObservation','SUSTENTO_OBSERVACION']);
    }

    if (status === 'ENTREGADA') {
      evidenceDefs.push(
        ['salesEvidenceBoleta','BOLETA_ENTREGA'],
        ['salesEvidenceRecepcion','EVIDENCIA_RECEPCION'],
        ['salesEvidenceActa','ACTA_CONFORMIDAD'],
        ['salesEvidenceOtro','OTRO']
      );
    }

    const evidencias=[];

    try{
      for(const def of evidenceDefs){
        const input=document.getElementById(def[0]);
        const file=input&&input.files&&input.files[0];

        if(file){
          const data=await readFileSales29(file);
          data.tipoEvidencia=def[1];
          evidencias.push(data);
        }
      }

      const gestionActual = getDeliveryManagementForProvider29(
        SALES_STATE.deliveryDetail || {},
        provider
      ) || {};

      const existentes = Array.isArray(gestionActual.evidencias)
        ? gestionActual.evidencias
        : [];

      if(status === 'OBSERVADA'){
        const tieneExistente = existentes.some(function(item){
          return String(item.tipoEvidencia || '').toUpperCase() === 'SUSTENTO_OBSERVACION';
        });

        if(!evidencias.length && !tieneExistente){
          toast('Sustento requerido','Adjunta el sustento de la observación.',true);
          return;
        }
      }

      if(status === 'ENTREGADA'){
        const tieneExistente = existentes.some(function(item){
          return String(item.tipoEvidencia || '').toUpperCase() !== 'SUSTENTO_OBSERVACION';
        });

        if(!evidencias.length && !tieneExistente){
          toast('Evidencia requerida','Adjunta al menos un sustento de la entrega.',true);
          return;
        }
      }

      const btn=document.getElementById('salesSaveDeliveryButton');
      if(btn){
        btn.disabled=true;
        btn.dataset.originalHtml=btn.innerHTML;
        btn.innerHTML='<span class="material-symbols-rounded">progress_activity</span>Guardando gestión…';
      }

      secureRpc(
        'guardarGestionEntregaVentaContadoModulo',
        [{
          idVenta:idVenta,
          idProveedor:provider,
          estadoEntrega:status,
          detalleObservacion:observation,
          fechaProgramadaEntrega:fechaProgramada,
          evidencias:evidencias
        }],
        'VENTAS_CONTADO'
      )
        .then(function(r){
          invalidateSalesDetailCache29(idVenta);
          SALES_STATE.viewCache = {};
          SALES_STATE.syncRevision = String(r && r.revisionDatos || "");
          toast('Gestión de entrega',r.mensaje||'Gestión guardada.');
          closeSalesModal29W_();
          loadSalesList(true);
        })
        .catch(function(e){
          toast('No se pudo guardar',errorMessage(e),true);
        })
        .finally(function(){
          if(btn){
            btn.disabled=false;
            btn.innerHTML=btn.dataset.originalHtml||'<span class="material-symbols-rounded">save</span>Guardar gestión';
          }
        });
    }catch(e){
      toast('Evidencia inválida',errorMessage(e),true);
    }
  }

  function openCancelObservedSale29(idVenta){
    prepareSalesModal29W_("ANULAR:" + String(idVenta || ""));
    const row = getSalesRowById29(idVenta) || { idVenta:idVenta };

    const estado = String(row.estado || row.estadoEntrega || "").toUpperCase();
    if (row.puedeAnularObservada !== true && (estado === "ENTREGADA" || estado === "ANULADA")) {
      toast('Sin permiso','Solo el responsable que registró una venta Observada puede anularla.',true);
      return;
    }

    openModal({
      eyebrow:'VENTA OBSERVADA',
      title:'Anular venta ' + escapeHtml(row.codigoVenta || ''),
      wide:false,
      body:'<div class="sales-modal-shell">' +
        '<div class="sales29-cancel-warning"><strong>Esta acción anula toda la venta.</strong><br>La observación del proveedor y sus sustentos se conservarán como trazabilidad. El estado del abono no se modifica automáticamente.</div>' +
        '<label class="input-field"><span>Motivo de anulación</span><textarea id="salesCancelReason29" rows="4" maxlength="1000" placeholder="Indica por qué la venta observada será anulada"></textarea></label>' +
      '</div>',
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button><button id="salesConfirmCancelObserved29" class="button button--primary" type="button"><span class="material-symbols-rounded">cancel</span>Anular venta</button>'
    });

    bindSalesModalClose29();

    on('salesConfirmCancelObserved29','click',function(){
      const reason=valueSales29('salesCancelReason29');
      if(!reason){
        toast('Motivo requerido','Ingresa el motivo de anulación.',true);
        return;
      }

      const button=document.getElementById('salesConfirmCancelObserved29');
      if(button){
        button.disabled=true;
        button.innerHTML='<span class="material-symbols-rounded">progress_activity</span>Anulando…';
      }

      secureRpc('anularVentaContadoModulo',[idVenta,reason],'VENTAS_CONTADO')
        .then(function(result){
          const current=getSalesRowById29(idVenta);
          if(current){
            current.estado='ANULADA';
            current.puedeAnularObservada=false;
          }
          invalidateSalesDetailCache29(idVenta);
          closeSalesModal29W_();
          renderSalesTable29(SALES_STATE.rows);
          toast('Venta anulada',result.mensaje||'La venta fue anulada.');
          window.setTimeout(function(){loadSalesList(true);},500);
        })
        .catch(function(error){
          toast('No se pudo anular',errorMessage(error),true);
          if(button){
            button.disabled=false;
            button.innerHTML='<span class="material-symbols-rounded">cancel</span>Anular venta';
          }
        });
    });
  }


  function openArchiveTestSale29T(idVenta){
    prepareSalesModal29W_("ARCHIVAR_PRUEBA:" + String(idVenta || ""));
    const row=getSalesRowById29(idVenta)||{};
    if(!row.puedeArchivarPrueba){toast("Sin permiso","Esta venta no puede archivarse como prueba.",true);return;}
    openModal({eyebrow:"VENTA DE PRUEBA",title:"Archivar "+escapeHtml(row.codigoVenta||""),wide:false,
      body:'<div class="sales-modal-shell"><div class="sales29-test-banner is-archived"><span class="material-symbols-rounded">archive</span><div><strong>Archivar venta de prueba</strong><span>La venta no se eliminará. Se conservará como historial y dejará de aparecer en las bandejas activas.</span></div></div><label class="input-field"><span>Observación <small>opcional</small></span><textarea id="salesArchiveTestObservation29T" rows="4" maxlength="1000" placeholder="Ej.: prueba finalizada, escenario validado"></textarea></label></div>',
      footer:'<button class="button button--secondary" type="button" data-modal-close>Cerrar</button><button id="salesArchiveTestConfirm29T" class="button button--primary" type="button"><span class="material-symbols-rounded">archive</span>Archivar prueba</button>'});
    bindSalesModalClose29();
    on("salesArchiveTestConfirm29T","click",function(){const b=document.getElementById("salesArchiveTestConfirm29T");if(b)b.disabled=true;secureRpc("archivarVentaPruebaModulo",[{idVenta:idVenta,observacion:valueSales29("salesArchiveTestObservation29T")}],"VENTAS_CONTADO").then(function(r){closeSalesModal29W_();invalidateSalesDetailCache29(idVenta);invalidarCacheBandejasVentasPaso29G_();toast("Prueba archivada",r.mensaje||"La venta de prueba fue archivada.");loadSalesList(true,{force:true});}).catch(function(e){toast("No se pudo archivar",errorMessage(e),true);if(b)b.disabled=false;});});
  }

  function openReclassifySale29T(idVenta){
    const row =
      getSalesRowById29(idVenta) ||
      { idVenta:idVenta };

    const actual =
      salesRecordTypeCode29T(row);

    prepareSalesModal29W_(
      "RECLASIFICAR:" +
      String(idVenta || "")
    );

    openModal({
      eyebrow:"ADMINISTRACIÓN",
      title:
        "Cambiar clasificación " +
        (row.codigoVenta || ""),
      wide:true,
      body:
        '<div class="sales-modal-shell sales29-reclassify-modal">' +
          '<section class="sales-form-section">' +
            '<div class="sales-form-section-head">' +
              '<span class="material-symbols-rounded">rule_settings</span>' +
              '<div>' +
                '<h4>Corrección administrativa</h4>' +
                '<p>Esta acción no cambia el estado de la venta, el abono ni la entrega. Solo determina si el registro pertenece a la operación comercial o al entorno de pruebas.</p>' +
              '</div>' +
            '</div>' +
            '<div class="sales29-reclassify-warning">' +
              '<span class="material-symbols-rounded">warning</span>' +
              '<div>' +
                '<strong>Uso recomendado</strong>' +
                '<span>Empléalo cuando una venta de prueba se registró como comercial, o cuando una venta comercial se etiquetó por error como prueba.</span>' +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="sales-form-section">' +
            '<div class="sales-form-section-head">' +
              '<span class="material-symbols-rounded">swap_horiz</span>' +
              '<div>' +
                '<h4>Clasificación del registro</h4>' +
                '<p>Selecciona la nueva clasificación y documenta el motivo de la corrección.</p>' +
              '</div>' +
            '</div>' +
            '<div class="sales-form-grid">' +
              '<label class="input-field">' +
                '<span>Clasificación actual</span>' +
                '<div class="sales29-static-field">' +
                  salesRecordTypeBadge29T(row,false) +
                '</div>' +
              '</label>' +
              '<label class="input-field">' +
                '<span>Nueva clasificación</span>' +
                '<select id="salesReclassifyType29T">' +
                  '<option value="COMERCIAL" ' +
                    (actual==="COMERCIAL" ? "selected" : "") +
                  '>Venta comercial</option>' +
                  '<option value="PRUEBA" ' +
                    (actual==="PRUEBA" ? "selected" : "") +
                  '>Venta de prueba</option>' +
                '</select>' +
              '</label>' +
              '<label class="input-field span-2">' +
                '<span>Motivo de la corrección <small class="sales29-field-note">Obligatorio</small></span>' +
                '<textarea id="salesReclassifyReason29T" rows="4" maxlength="1000" placeholder="Ej.: registro creado como comercial durante una prueba funcional"></textarea>' +
              '</label>' +
            '</div>' +
          '</section>' +
        '</div>',
      footer:
        '<button class="button button--secondary" type="button" data-modal-close>Cerrar</button>' +
        '<button class="button button--primary" type="button" id="salesReclassifyConfirm29T"><span class="material-symbols-rounded">swap_horiz</span>Guardar clasificación</button>'
    });

    bindSalesModalClose29();

    on(
      "salesReclassifyConfirm29T",
      "click",
      function(){
        const tipo =
          valueSales29(
            "salesReclassifyType29T"
          );

        const motivo =
          valueSales29(
            "salesReclassifyReason29T"
          );

        if (!motivo) {
          toast(
            "Motivo requerido",
            "Indica por qué se está corrigiendo la clasificación.",
            true
          );
          return;
        }

        if (tipo === actual) {
          toast(
            "Sin cambios",
            "Selecciona una clasificación diferente.",
            true
          );
          return;
        }

        const b =
          document.getElementById(
            "salesReclassifyConfirm29T"
          );

        if (b) b.disabled = true;

        secureRpc(
          "reclasificarVentaContadoModulo",
          [{
            idVenta:idVenta,
            tipoRegistro:tipo,
            motivo:motivo
          }],
          "VENTAS_CONTADO"
        )
          .then(function(r){
            closeSalesModal29W_();
            invalidateSalesDetailCache29(
              idVenta
            );
            invalidarCacheBandejasVentasPaso29G_();

            toast(
              "Clasificación actualizada",
              r.mensaje ||
                "La clasificación fue actualizada."
            );

            loadSalesList(
              true,
              { force:true }
            );
          })
          .catch(function(e){
            toast(
              "No se pudo reclasificar",
              errorMessage(e),
              true
            );

            if (b) b.disabled = false;
          });
      }
    );
  }

  function bindSalesModalClose29(){
    document
      .querySelectorAll(
        '[data-modal-close]'
      )
      .forEach(function(x){
        if (
          x.dataset.salesModalBound29w ===
          "true"
        ) {
          return;
        }

        x.dataset.salesModalBound29w =
          "true";

        x.addEventListener(
          'click',
          function() {
            closeSalesModal29W_();
          }
        );
      });

    bindSalesSecureFileButtons29U(
      document.querySelector('#modalRoot') ||
      document
    );
  }


  function exportSalesCashXls(){collectSalesFilters();secureRpc("exportarVentasContadoModulo",[SALES_STATE.filters],"VENTAS_CONTADO").then(downloadSalesFile29).catch(function(e){toast("No se pudo descargar",errorMessage(e),true);});}
  function downloadSalesFile29(result){result=result||{};const blob=new Blob([result.contenido||""],{type:result.mimeType||"application/vnd.ms-excel;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=result.nombreArchivo||"Ventas_al_contado.xls";document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function formatSalesMoney(value,currency){const n=Number(value||0);return((currency||"PEN")==="PEN"?"S/":(currency||"PEN"))+" "+n.toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});}