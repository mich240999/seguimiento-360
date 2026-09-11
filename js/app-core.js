const APP_STORAGE = Object.freeze({
    TOKEN: "SGT360_AUTH_TOKEN_V1",
    SESSION: "SGT360_AUTH_SESSION_V1",
    SIDEBAR_COLLAPSED: "SGT360_UI_SIDEBAR_COLLAPSED_V1",
    MODULE_CACHE_PREFIX: "SGT360_MODULE_CACHE_V1"
  });

  const APP_STATE = {
    token: "",
    session: null,
    context: null,
    realContext: null,
    rolePreview: null,
    rolePreviewCache: {},
    rolePreviewRequestSequence: 0,
    module: "DASHBOARD",
    moduleDefinition: null,
    refreshTimer: null,
    heartbeatTimer: null,
    requestPending: false,
    syncPending: false,
    dataRevision: "",
    lastSyncCheckAt: 0
  };

  const LOADER_RUNTIME = {
    hideTimer: null,
    initialized: false,
    initialCompleted: false
  };

  const APP_LOADER_RUNTIME = {
    showTimer: null,
    hideTimer: null,
    requested: false,
    visible: false,
    delayMilliseconds: 180
  };

  // El script se incluye después del shell; por eso la identidad del cargador
  // puede aplicarse inmediatamente, sin esperar DOMContentLoaded ni una RPC.
  applyInitialLoaderBranding();

  document.addEventListener("DOMContentLoaded", function() {
    bindGlobalInterface();
    restoreSidebarPreference();
    bootApplication();
  });

  /**
   * Inicia la aplicación y valida si existe una sesión local.
   */
  function bootApplication() {
    if (window.__S360_PASSWORD_SETUP_REQUIRED__) {
      clearLocalSession();
      setLoader(false);
      return;
    }
    setLoader(true, "Validando acceso seguro…");
    const supabase = window.supabaseClient && window.supabaseClient.isConfigured() ?
      window.supabaseClient.getClient() : null;

    if (!supabase) {
      showLogin("Supabase no está configurado.", true);
      return;
    }

    supabase.auth.getSession()
      .then(function(result) {
        const session = result.data && result.data.session;
        if (!session || !session.access_token) {
          clearLocalSession();
          showLogin("Inicia sesión con una cuenta autorizada.", false);
          return;
        }
        APP_STATE.token = session.access_token;
        APP_STATE.session = session;
        try { window.localStorage.setItem(APP_STORAGE.TOKEN, session.access_token); } catch (error) {}
        initializeProtectedApplication();
      })
      .catch(function(error) {
        clearLocalSession();
        showLogin(errorMessage(error, "No fue posible validar la sesión de Supabase."), true);
      });
  }

  /**
   * Inicializa la aplicación protegida después de validar la sesión.
   */
  function initializeProtectedApplication() {
    setLoader(true, "Cargando módulos y permisos…");

    withTimeout(
      secureRpc("obtenerContextoAplicacion", [], "SISTEMA"),
      15000,
      "La carga inicial tardó demasiado. Verifica tu conexión e inicia sesión nuevamente."
    )
      .then(function(context) {
        APP_STATE.realContext = context;
        APP_STATE.context = context;
        APP_STATE.rolePreview = null;
        APP_STATE.dataRevision = context && context.sincronizacion ? String(context.sincronizacion.revision || "") : "";
        APP_STATE.lastSyncCheckAt = Date.now();
        applyContext(context);
        configureRolePreview(context);
        document.getElementById("authView").hidden = true;
        document.getElementById("appShell").hidden = false;
        document.body.classList.remove("is-loading");
        renderNavigation(context.modulos || []);
        renderDashboard();
        startHeartbeat();
        configureIncrementalRefresh();
        setLoader(false);
      })
      .catch(function(error) {
        clearLocalSession();
        showLogin(errorMessage(error, "No fue posible iniciar la aplicación."), true);
      });
  }

  /**
   * Ejecuta una operación backend mediante el canal RPC protegido.
   */
  function secureRpc(operation, argumentsList, moduleCode) {
    return new Promise(function(resolve, reject) {
      if (!APP_STATE.token) {
        reject(new Error("No existe una sesión activa."));
        return;
      }

      const noSimular = [
        "obtenerContextoAplicacion",
        "obtenerEstadoSincronizacionMotor",
        "obtenerVistaPreviaRolAdminMotor"
      ].indexOf(operation) !== -1;
      const preview = APP_STATE.rolePreview;
      if (!noSimular && preview && preview.rol && !preview.usuarioReferencia) {
        reject(new Error(
          "El rol simulado necesita un usuario de referencia para consultar datos."
        ));
        return;
      }
      const simulacion = !noSimular && preview && preview.rol &&
        preview.usuarioReferencia ? {
          activa: true,
          rol: preview.rol.codigo,
          idUsuarioReferencia: preview.usuarioReferencia.idUsuario
        } : null;

      window.apiAdapter.executeRpc(operation, argumentsList, moduleCode)
        .then(resolve)
        .catch(function(error) {
          const message = errorMessage(error, "La operación no pudo completarse.");
          if (/SESION_|TOKEN_|USUARIO_NO_AUTORIZADO/i.test(message)) {
            clearLocalSession();
            showLogin(message, true);
          }
          reject(new Error(message));
        });
    });
  }

  /**
   * Aplica el contexto del usuario y la configuración visual a la interfaz.
   */
  function applyContext(context) {
    const app = context.aplicacion || {};
    const user = context.usuario || {};
    const ui = context.interfaz || {};

    document.documentElement.style.setProperty("--primary-500", ui.colorPrincipal || "#00A1DE");
    text("appNameSidebar", app.nombre || "Seguimiento 360");
    text("appEnvironment", app.entorno || "DESARROLLO");
    text("sidebarUserName", user.nombre || user.correo || "Usuario");
    text("sidebarUserRole", user.nombreRol || user.rol || "USUARIO");
    text("sidebarUserAvatar", initials(user.nombre || user.correo));
    text("topbarUserInitials", initials(user.nombre || user.correo));
    text("dashboardGreeting", "Hola, " + firstName(user.nombre || "usuario") + ". Tu centro de seguimiento está listo.");

    const logo = document.getElementById("brandLogo");
    const fallback = document.getElementById("brandLogoFallback");
    const logoHeader = String(
      ui.logoHeader || ""
    ).trim();

    if (logo && logoHeader) {
      logo.onload = function() {
        logo.hidden = false;
        if (fallback) {
          fallback.hidden = true;
        }
      };

      logo.onerror = function() {
        logo.hidden = true;
        if (fallback) {
          fallback.hidden = false;
        }
      };

      logo.src = logoHeader;
    } else {
      if (logo) {
        logo.hidden = true;
      }

      if (fallback) {
        fallback.hidden = false;
      }
    }

    updateAutomaticRefreshInterface();
  }

  /**
   * Indica si la sincronización automática está activa para este navegador.
   */
  function isAutomaticRefreshEnabled() {
    const ui = APP_STATE.context && APP_STATE.context.interfaz ?
      APP_STATE.context.interfaz : {};
    return ui.actualizacionAutomatica !== false;
  }

  /**
   * Actualiza la configuración local después de guardar el parámetro desde la
   * consola. No recarga el módulo actual ni cierra formularios abiertos.
   */
  function applyRefreshConfigurationFromAdmin(key, value) {
    const contexts = [APP_STATE.context, APP_STATE.realContext];
    contexts.forEach(function(context) {
      if (!context) return;
      context.interfaz = context.interfaz || {};
      if (key === "APP_REFRESH_ENABLED") {
        context.interfaz.actualizacionAutomatica = ["TRUE", "SI", "1", "ACTIVO"]
          .indexOf(String(value || "").trim().toUpperCase()) !== -1;
      }
      if (key === "APP_REFRESH_SECONDS") {
        context.interfaz.actualizacionSegundos = Math.max(60, Number(value) || 60);
      }
    });

    configureIncrementalRefresh();
    updateAutomaticRefreshInterface();
  }

  /**
   * Refleja el modo automático o manual en el botón principal de actualización.
   */
  function updateAutomaticRefreshInterface() {
    const button = document.getElementById("refreshButton");
    if (!button) return;
    const enabled = isAutomaticRefreshEnabled();
    const message = enabled ?
      "Actualizar" :
      "Actualizar (actualización automática desactivada)";
    button.title = message;
    button.dataset.tooltip = message;
    button.setAttribute("aria-label", message);
  }

  /**
   * Aplica el estado ligero recibido del servidor sin reconstruir la vista.
   * Devuelve true cuando la actualización automática está habilitada.
   */
  function applySynchronizationConfiguration(state) {
    state = state || {};
    const previousEnabled = isAutomaticRefreshEnabled();
    const previousSeconds = Math.max(60, Number(APP_STATE.context &&
      APP_STATE.context.interfaz && APP_STATE.context.interfaz.actualizacionSegundos) || 60);
    const enabled = state.actualizacionAutomatica !== false;
    const seconds = Math.max(60, Number(state.actualizacionSegundos) || 60);

    [APP_STATE.context, APP_STATE.realContext].forEach(function(context) {
      if (!context) return;
      context.interfaz = context.interfaz || {};
      context.interfaz.actualizacionAutomatica = enabled;
      context.interfaz.actualizacionSegundos = seconds;
    });

    if (previousEnabled !== enabled || previousSeconds !== seconds) {
      configureIncrementalRefresh();
    } else {
      updateAutomaticRefreshInterface();
    }

    return enabled;
  }

  /**
   * Construye el menú con los módulos permitidos para el usuario.
   */
  function renderNavigation(modules) {
    const navigation = document.getElementById("moduleNavigation");
    navigation.innerHTML = "";
    const groups = {};

    modules.forEach(function(module) {
      const group = module.grupoMenu || "General";
      if (!groups[group]) groups[group] = [];
      groups[group].push(module);
    });

    Object.keys(groups).forEach(function(groupName) {
      const group = document.createElement("section");
      group.className = "nav-group";
      group.innerHTML = '<div class="nav-group-title">' + escapeHtml(groupName) + "</div>";

      groups[groupName].forEach(function(module) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nav-item" + (module.codigo === APP_STATE.module ? " is-active" : "");
        button.dataset.module = module.codigo;
        button.title = module.nombre || module.codigo;
        button.setAttribute("aria-label", module.nombre || module.codigo);
        button.innerHTML =
          moduleIconHtml(module.icono) +
          '<span class="nav-label">' + escapeHtml(module.nombre) + "</span>";
        button.addEventListener("click", function() { openModule(module.codigo); });
        group.appendChild(button);
      });

      navigation.appendChild(group);
    });
  }

  /**
   * Renderiza el panel principal de la aplicación.
   */
  function renderDashboard() {
    setActiveView("dashboardView");
    setModuleHeading("GENERAL", "Inicio");
    APP_STATE.module = "DASHBOARD";
    APP_STATE.moduleDefinition = null;
    updateActiveNavigation();
    markSync();
  }

  /**
   * Indica si el código corresponde a uno de los módulos administrativos
   * especializados que comparten el mismo workspace filtrado.
   */
  function isAdministrationModule(code) {
    return [
      "ADMIN_GENERAL",
      "ADMIN_USUARIOS",
      "ADMIN_PERMISOS",
      "ADMIN_ESTRUCTURA",
      "ADMIN_CONFIG_APP",
      "ADMIN_AUDITORIA"
    ].indexOf(String(code || "").toUpperCase()) !== -1;
  }

  /**
   * Abre un módulo y prepara su vista correspondiente.
   */
  function openModule(code) {
    const module = (
      (APP_STATE.context && APP_STATE.context.modulos) || []
    ).find(function(item) {
      return item.codigo === code;
    });
    if (!module) {
      toast(
        "Módulo no disponible",
        "No tienes acceso o el módulo está inactivo.",
        true
      );
      return;
    }

    if (
      isRolePreviewActive() &&
      code !== "DASHBOARD" &&
      !APP_STATE.rolePreview.usuarioReferencia
    ) {
      toast(
        "Falta usuario de referencia",
        "El rol no tiene un usuario activo para aplicar los alcances de datos.",
        true
      );
      return;
    }

    APP_STATE.module = code;
    APP_STATE.moduleDefinition = module;
    updateActiveNavigation();
    closeSidebar();

    if (code === "DASHBOARD") {
      renderDashboard();
      return;
    }

    if (isAdministrationModule(code)) {
      if (typeof openAdministrationWorkspace === "function") {
        openAdministrationWorkspace(module);
      }
      return;
    }

    if (code === "PROVEEDORES") {
      if (typeof openProvidersWorkspace === "function") {
        openProvidersWorkspace(module);
      }
      return;
    }

    if (code === "MATERIALES_PRECIOS") {
      if (typeof openMaterialsPricesWorkspace === "function") {
        openMaterialsPricesWorkspace(module);
      }
      return;
    }

    if (code === "VENTAS_CONTADO") {
      if (typeof openCashSalesWorkspace === "function") {
        openCashSalesWorkspace(module);
      }
      return;
    }

    if (typeof openDynamicModule === "function") {
      openDynamicModule(module);
    }
  }

  /**
   * Activa una vista y oculta las demás vistas principales.
   */
  function setActiveView(viewId) {
    ["dashboardView", "dynamicModuleView"].forEach(function(id) {
      const view = document.getElementById(id);
      if (view) view.hidden = id !== viewId;
    });
  }

  /**
   * Actualiza el título y la descripción del módulo activo.
   */
  function setModuleHeading(eyebrow, title) {
    text("currentModuleEyebrow", eyebrow || "MÓDULO");
    text("currentModuleTitle", title || "");
  }

  /**
   * Marca visualmente la opción activa del menú.
   */
  function updateActiveNavigation() {
    document.querySelectorAll(".nav-item").forEach(function(item) {
      item.classList.toggle("is-active", item.dataset.module === APP_STATE.module);
    });
  }


  /**
   * Limpia cachés locales de datos por módulo. El botón global usa ALL;
   * los botones internos deben usar solo su propio módulo para evitar recargas innecesarias.
   */
  function clearClientModuleCache(moduleCode) {
    const target = String(moduleCode || "ALL").toUpperCase();
    const prefixes = [
      "SGT360_MP_",
      "SGT360_SALES_",
      "SGT360_PROV_",
      "SGT360_ADM_",
      APP_STORAGE.MODULE_CACHE_PREFIX
    ];
    try {
      [sessionStorage, localStorage].forEach(function(store) {
        Object.keys(store).forEach(function(key) {
          const upper = String(key || "").toUpperCase();
          const belongsToTarget = target === "ALL" ||
            (target === "MATERIALES_PRECIOS" && upper.indexOf("SGT360_MP_") === 0) ||
            (target === "VENTAS_CONTADO" && upper.indexOf("SGT360_SALES_") === 0) ||
            (target === "PROVEEDORES" && upper.indexOf("SGT360_PROV_") === 0) ||
            (target.indexOf("ADMIN_") === 0 && upper.indexOf("SGT360_ADM_") === 0);
          if (belongsToTarget && prefixes.some(function(prefix) { return upper.indexOf(String(prefix).toUpperCase()) === 0; })) {
            store.removeItem(key);
          }
        });
      });
    } catch (error) {}
  }

  /**
   * Vincula los eventos generales de la aplicación.
   */
  function bindGlobalInterface() {
    on("sidebarOpenButton", "click", openSidebar);
    on("sidebarCloseButton", "click", closeSidebar);
    on("sidebarCollapseButton", "click", toggleSidebarCollapse);
    on("sidebarBackdrop", "click", closeSidebar);
    on("refreshButton", "click", function() {
      clearClientModuleCache("ALL");
      synchronizeApplicationChanges(false, true);
    });
    on("logoutButton", "click", function() { closeApplicationSession(false); });
    on("rolePreviewSelect", "change", handleRolePreviewChange);
    on("rolePreviewUserSelect", "change", handleRolePreviewUserChange);
    on("rolePreviewExitButton", "click", exitRolePreview);
    on("rolePreviewDetailsButton", "click", openRoleAccessSummary);

    document.querySelectorAll("[data-modal-close]").forEach(function(item) {
      item.addEventListener("click", closeModal);
    });
    document.querySelectorAll("[data-sheet-close]").forEach(function(item) {
      item.addEventListener("click", closeSideSheet);
    });

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        closeModal();
        closeSideSheet();
        closeSidebar();
      }
    });

    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "visible" && APP_STATE.token && APP_STATE.context) {
        // Volver a una pestaña solo renueva la actividad de la sesión.
        // No sincroniza ni reconstruye la vista en ese instante.
        executeHeartbeat();

        // Reinicia el contador para que la siguiente comprobación ligera ocurra
        // después del intervalo configurado, normalmente 60 segundos.
        configureIncrementalRefresh();
      }
    });
  }

  /**
   * Muestra la pantalla de acceso y su mensaje de estado.
   */
  function showLogin(message, isError) {
    stopTimers();
    document.getElementById("appShell").hidden = true;
    document.getElementById("authView").hidden = false;
    setLoader(false);
    showAuthMessage(message, isError);
    prepareLoginProviders();
  }

  /**
   * Ejecuta prepare acceso providers.
   */
  function prepareLoginProviders() {
    google.script.run
      .withSuccessHandler(function(config) {
        const providers = config && config.proveedores ? config.proveedores : {};
        configureOAuthButton("authGoogleButton", providers.google && providers.google.habilitado, "GOOGLE");
        configureOAuthButton("authMicrosoftButton", providers.microsoft && providers.microsoft.habilitado, "MICROSOFT");
      })
      .withFailureHandler(function(error) { showAuthMessage(errorMessage(error, "No fue posible preparar el acceso."), true); })
      .obtenerConfiguracionPantallaLoginPaso13B();
  }

  /**
   * Configura OAuth botón.
   */
  function configureOAuthButton(buttonId, enabled, provider) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.hidden = !enabled;
    if (!enabled) return;

    const handler = function(event) {
      event.preventDefault();
      button.setAttribute("aria-disabled", "true");
      showAuthMessage("Preparando conexión segura…", false);

      const success = function(result) {
        if (!result || result.correcto !== true || !result.urlAutorizacion) {
          button.setAttribute("aria-disabled", "false");
          showAuthMessage("No fue posible iniciar la autenticación.", true);
          return;
        }
        clearLocalSession();
        window.top.location.href = result.urlAutorizacion;
      };
      const failure = function(error) {
        button.setAttribute("aria-disabled", "false");
        showAuthMessage(errorMessage(error, "No fue posible iniciar la autenticación."), true);
      };
      const request = { origen: window.location.href, userAgent: navigator.userAgent };

      if (provider === "MICROSOFT") {
        window.apiAdapter.directCall("crearSolicitudOAuthMicrosoftPaso15A", [request]).then(success).catch(failure);
      } else {
        window.apiAdapter.directCall("crearSolicitudOAuthPaso13C", [request]).then(success).catch(failure);
      }
    };

    if (button._oauthHandler) button.removeEventListener("click", button._oauthHandler);
    button._oauthHandler = handler;
    button.addEventListener("click", handler);
    button.setAttribute("aria-disabled", "false");
  }

  /**
   * Muestra autenticación mensaje.
   */
  function showAuthMessage(message, isError) {
    const element = document.getElementById("authMessage");
    if (!element) return;
    element.hidden = !message;
    element.textContent = message || "";
    element.classList.toggle("is-error", Boolean(isError));
  }


  /**
   * Configura el selector "Visualizar como" usando únicamente roles activos.
   * El control se muestra únicamente al usuario real con rol SUPERADMIN.
   */

  /**
   * Devuelve el permiso efectivo del contexto visible, real o simulado.
   */
  function activePermission(moduleCode, resourceCode) {
    const permissions = APP_STATE.context && APP_STATE.context.seguridad &&
      APP_STATE.context.seguridad.permisos;
    const modulePermissions = permissions &&
      permissions[String(moduleCode || "").toUpperCase()];
    return modulePermissions &&
      modulePermissions[String(resourceCode || "").toUpperCase()] || null;
  }

  function hasActivePermission(moduleCode, resourceCode) {
    const permission = activePermission(moduleCode, resourceCode);
    return Boolean(permission && permission.permitido === true);
  }

  function activePermissionScope(moduleCode, resourceCode) {
    const permission = activePermission(moduleCode, resourceCode);
    return permission && permission.permitido ?
      String(permission.alcance || "PROPIO").toUpperCase() :
      "NINGUNO";
  }

  function rolePreviewCacheKey(roleCode, userId) {
    return String(roleCode || "").toUpperCase() + "|" + String(userId || "");
  }

  function loadRolePreview(roleCode, userId) {
    const key = rolePreviewCacheKey(roleCode, userId);
    if (APP_STATE.rolePreviewCache[key]) {
      return Promise.resolve(APP_STATE.rolePreviewCache[key]);
    }

    const sequence = ++APP_STATE.rolePreviewRequestSequence;
    return secureRpc(
      "obtenerVistaPreviaRolAdminMotor",
      [roleCode, userId || ""],
      "ADMIN_PERMISOS"
    ).then(function(preview) {
      if (sequence !== APP_STATE.rolePreviewRequestSequence) {
        throw new Error("La selección cambió antes de completar la vista.");
      }
      APP_STATE.rolePreviewCache[
        rolePreviewCacheKey(
          preview && preview.rol ? preview.rol.codigo : roleCode,
          preview && preview.usuarioReferencia ?
            preview.usuarioReferencia.idUsuario :
            ""
        )
      ] = preview;
      return preview;
    });
  }

  function configureRolePreview(context) {
    const control = document.getElementById("rolePreviewControl");
    const select = document.getElementById("rolePreviewSelect");
    const config = context && context.visualizacionRoles ? context.visualizacionRoles : {};
    const currentRole = context && context.usuario ? String(context.usuario.rol || "").toUpperCase() : "";
    const esSuperadmin = currentRole === "SUPERADMIN";
    const roles = (esSuperadmin && Array.isArray(config.roles) ? config.roles : []).filter(function(role) {
      return String(role.codigo || "").toUpperCase() !== currentRole &&
        String(role.codigo || "").toUpperCase() !== "SUPERADMIN";
    });

    if (!control || !select) return;

    control.hidden = !esSuperadmin || config.habilitada !== true || !roles.length;
    document.body.classList.toggle("has-role-preview-control", !control.hidden);
    select.innerHTML = '<option value="">Mi vista (' +
      escapeHtml(context && context.usuario ? context.usuario.nombreRol || context.usuario.rol || "USUARIO" : "USUARIO") +
      ")</option>" + roles.map(function(role) {
        return '<option value="' + escapeHtml(role.codigo) + '">' +
          escapeHtml(role.nombre || role.codigo) + "</option>";
      }).join("");
    select.value = "";
    control.classList.remove("is-active");
  }

  /**
   * Solicita al backend la vista previa del rol seleccionado.
   */
  function handleRolePreviewChange(event) {
    const roleCode = String(
      event && event.target ? event.target.value : ""
    ).trim();

    if (!roleCode) {
      exitRolePreview();
      return;
    }

    const select = document.getElementById("rolePreviewSelect");
    if (select) select.disabled = true;
    setLoader(true, "Construyendo interfaz del rol…");

    loadRolePreview(roleCode, "")
      .then(function(preview) {
        activateRolePreview(preview);
        setLoader(false);
        if (select) select.disabled = false;
      })
      .catch(function(error) {
        if (select) {
          select.value = "";
          select.disabled = false;
        }
        setLoader(false);
        toast(
          "No fue posible visualizar el rol",
          errorMessage(error),
          true
        );
      });
  }

  /**
   * Activa una vista estrictamente visual. La sesión real permanece intacta.
   */

  /**
   * Cambia la identidad organizativa usada para aplicar los alcances.
   */
  function handleRolePreviewUserChange(event) {
    if (!APP_STATE.rolePreview || !APP_STATE.rolePreview.rol) return;
    const userId = String(
      event && event.target ? event.target.value : ""
    ).trim();
    if (!userId) return;

    const roleCode = APP_STATE.rolePreview.rol.codigo;
    setLoader(true, "Aplicando contexto del usuario…");
    loadRolePreview(roleCode, userId)
      .then(function(preview) {
        activateRolePreview(preview);
        setLoader(false);
      })
      .catch(function(error) {
        setLoader(false);
        toast(
          "No fue posible cambiar el usuario de referencia",
          errorMessage(error),
          true
        );
      });
  }

  function activateRolePreview(preview) {
    if (!preview || !preview.rol || !APP_STATE.realContext) {
      throw new Error("La vista previa recibida no es válida.");
    }

    APP_STATE.rolePreview = preview;
    const simulatedUser = preview.usuarioReferencia || {
      idUsuario: "",
      correo: "",
      nombre: "Sin usuario de referencia",
      telefono: "",
      rol: preview.rol.codigo,
      nombreRol: preview.rol.nombre || preview.rol.codigo,
      idProveedor: "",
      idOficina: "",
      idGrupo: "",
      idsOficinasPermitidas: []
    };

    APP_STATE.context = Object.assign({}, APP_STATE.realContext, {
      usuario: Object.assign({}, simulatedUser, {
        nombreRol: preview.rol.nombre || preview.rol.codigo
      }),
      seguridad: preview.seguridad || {
        rol: preview.rol.codigo,
        esSuperadmin: false,
        puedeAdministrar: false,
        permisos: {}
      },
      modulos: Array.isArray(preview.modulos) ? preview.modulos : []
    });
    APP_STATE.module = "DASHBOARD";
    APP_STATE.moduleDefinition = null;

    const control = document.getElementById("rolePreviewControl");
    if (control) control.classList.add("is-active");
    const roleSelect = document.getElementById("rolePreviewSelect");
    if (roleSelect) {
      roleSelect.value = preview.rol.codigo;
      roleSelect.disabled = false;
    }
    const banner = document.getElementById("rolePreviewBanner");
    if (banner) banner.hidden = false;

    text("rolePreviewName", preview.rol.nombre || preview.rol.codigo);

    const userControl = document.getElementById("rolePreviewUserControl");
    const userSelect = document.getElementById("rolePreviewUserSelect");
    const referenceUsers = Array.isArray(preview.usuariosReferencia) ?
      preview.usuariosReferencia : [];
    if (userControl && userSelect) {
      userControl.hidden = !referenceUsers.length;
      userSelect.innerHTML = referenceUsers.map(function(user) {
        return '<option value="' + escapeHtml(user.idUsuario) + '" ' +
          (preview.usuarioReferencia &&
          preview.usuarioReferencia.idUsuario === user.idUsuario ?
            "selected" : "") + '>' +
          escapeHtml(user.nombre || user.correo) + "</option>";
      }).join("");
    }

    applyContext(APP_STATE.context);
    text(
      "sidebarUserRole",
      "VISTA: " + (preview.rol.nombre || preview.rol.codigo)
    );
    renderNavigation(APP_STATE.context.modulos || []);
    renderDashboard();

    if (!preview.usuarioReferencia) {
      toast(
        "Rol sin usuario de referencia",
        "La navegación muestra sus módulos, pero los datos no se cargarán hasta que exista un usuario activo con ese rol.",
        true
      );
      return;
    }

    toast(
      "Vista simulada activada",
      "La interfaz usa el rol " +
        (preview.rol.nombre || preview.rol.codigo) +
        " y el contexto de " +
        (preview.usuarioReferencia.nombre ||
          preview.usuarioReferencia.correo) +
        "."
    );
  }

  /**
   * Restablece la interfaz del usuario autenticado.
   */
  function exitRolePreview() {
    if (!APP_STATE.realContext) return;

    APP_STATE.rolePreviewRequestSequence++;
    APP_STATE.rolePreview = null;
    APP_STATE.context = APP_STATE.realContext;
    APP_STATE.module = "DASHBOARD";
    APP_STATE.moduleDefinition = null;

    const select = document.getElementById("rolePreviewSelect");
    if (select) {
      select.value = "";
      select.disabled = false;
    }
    const control = document.getElementById("rolePreviewControl");
    if (control) control.classList.remove("is-active");
    const banner = document.getElementById("rolePreviewBanner");
    if (banner) banner.hidden = true;
    const userControl = document.getElementById("rolePreviewUserControl");
    if (userControl) userControl.hidden = true;

    applyContext(APP_STATE.realContext);
    renderNavigation(APP_STATE.context.modulos || []);
    renderDashboard();
  }

  /**
   * Indica si el frontend está mostrando los permisos de otro rol.
   */
  function isRolePreviewActive() {
    return Boolean(APP_STATE.rolePreview && APP_STATE.rolePreview.rol);
  }

  /**
   * Muestra el detalle de un módulo sin abrir datos ni acciones reales.
   */
  function showRoleModuleAccessPreview(module) {
    const detail = findPreviewModule(module.codigo);

    if (!detail) {
      toast("Detalle no disponible", "No se encontró la configuración del módulo.", true);
      return;
    }

    openModal({
      eyebrow: "VISTA PREVIA DE ROL",
      title: module.nombre,
      body: buildPreviewModuleHtml(detail),
      footer: '<button class="button button--primary" type="button" data-modal-close-button>Entendido</button>'
    });

    const closeButton = document.querySelector("[data-modal-close-button]");
    if (closeButton) closeButton.addEventListener("click", closeModal);
  }

  /**
   * Presenta la matriz completa del rol seleccionado, incluidos módulos ocultos.
   */
  function openRoleAccessSummary() {
    if (!isRolePreviewActive()) return;

    const preview = APP_STATE.rolePreview;
    const summary = preview.resumen || {};
    const modules = Array.isArray(preview.detalleModulos) ? preview.detalleModulos : [];
    const metrics = [
      [summary.modulosVisibles || 0, "Módulos visibles"],
      [summary.modulosOcultos || 0, "Módulos ocultos"],
      [summary.accesosPermitidos || 0, "Accesos permitidos"],
      [summary.accesosDenegados || 0, "Accesos denegados"]
    ];

    openModal({
      eyebrow: "VISUALIZAR COMO",
      title: preview.rol.nombre || preview.rol.codigo,
      body: '<div class="preview-access-summary">' +
        '<div class="preview-role-card">' + metrics.map(function(metric) {
          return '<div class="preview-role-metric"><strong>' + escapeHtml(metric[0]) +
            '</strong><span>' + escapeHtml(metric[1]) + "</span></div>";
        }).join("") + "</div>" +
        '<div class="preview-module-list">' + modules.map(buildPreviewModuleHtml).join("") + "</div>" +
      "</div>",
      footer: '<button class="button button--primary" type="button" data-modal-close-button>Cerrar</button>'
    });

    const closeButton = document.querySelector("[data-modal-close-button]");
    if (closeButton) closeButton.addEventListener("click", closeModal);
  }

  /**
   * Localiza el detalle técnico de un módulo dentro de la vista previa.
   */
  function findPreviewModule(code) {
    const modules = APP_STATE.rolePreview && Array.isArray(APP_STATE.rolePreview.detalleModulos) ?
      APP_STATE.rolePreview.detalleModulos : [];
    return modules.find(function(module) {
      return module.codigo === code;
    }) || null;
  }

  /**
   * Construye el bloque visual de accesos de un módulo.
   */
  function buildPreviewModuleHtml(module) {
    const accesses = Array.isArray(module.accesos) ? module.accesos : [];
    const stateLabel = module.visible ? "Visible" : "Oculto";

    return '<section class="preview-module-item">' +
      '<div class="preview-module-head">' +
        '<div class="preview-module-head-copy">' +
          moduleIconHtml(module.icono) +
          "<div><strong>" + escapeHtml(module.nombre || module.codigo) + "</strong>" +
          "<small>" + escapeHtml(module.codigo) + " · " + escapeHtml(stateLabel) + "</small></div>" +
        "</div>" +
        '<span class="chip ' + (module.visible ? "chip--active" : "chip--inactive") + '">' +
          escapeHtml(stateLabel) + "</span>" +
      "</div>" +
      '<div class="preview-module-accesses">' + (accesses.length ? accesses.map(function(access) {
        return '<div class="preview-access-row">' +
          "<span>" + escapeHtml(access.nombre || access.codigo) + "</span>" +
          '<span class="preview-access-state ' + (access.permitido ? "is-allowed" : "is-denied") + '">' +
            (access.permitido ? "Permitido" : "Denegado") + "</span>" +
          '<span class="preview-access-scope">' + escapeHtml(access.alcance || "NINGUNO") + "</span>" +
        "</div>";
      }).join("") : '<div class="preview-access-row"><span>Sin recursos configurados</span><span class="preview-access-state is-denied">Sin acceso</span><span class="preview-access-scope">NINGUNO</span></div>') +
      "</div>" +
    "</section>";
  }

  /**
   * Inicia la actualización periódica de actividad de la sesión.
   */
  function startHeartbeat() {
    if (APP_STATE.heartbeatTimer) window.clearInterval(APP_STATE.heartbeatTimer);
    APP_STATE.heartbeatTimer = window.setInterval(executeHeartbeat, 120000);
  }

  /**
   * Ejecuta execute heartbeat.
   */
  function executeHeartbeat() {
    if (!APP_STATE.token || document.visibilityState !== "visible") return;
    google.script.run
      .withSuccessHandler(function(result) {
        if (!result || result.correcto !== true || result.autenticado !== true) {
          clearLocalSession();
          showLogin(result && result.mensaje ? result.mensaje : "La sesión finalizó.", true);
        }
      })
      .withFailureHandler(function(error) {
        clearLocalSession();
        showLogin(errorMessage(error, "La sesión dejó de estar disponible."), true);
      })
      .actualizarActividadSesionPaso13D1({
        token: APP_STATE.token,
        modulo: APP_STATE.module,
        origen: window.location.href,
        userAgent: navigator.userAgent
      });
  }

  /**
   * Configura una comprobación exacta cada 60 segundos o según el parámetro.
   *
   * La comprobación es ligera: primero consulta una revisión global. Solo si
   * cambió vuelve a cargar contexto, permisos, menú y el módulo visible.
   */
  function configureIncrementalRefresh() {
    if (APP_STATE.refreshTimer) window.clearInterval(APP_STATE.refreshTimer);
    APP_STATE.refreshTimer = null;
    updateAutomaticRefreshInterface();

    if (!isAutomaticRefreshEnabled()) return;

    const seconds = Math.max(60, Number(APP_STATE.context && APP_STATE.context.interfaz &&
      APP_STATE.context.interfaz.actualizacionSegundos) || 60);
    APP_STATE.refreshTimer = window.setInterval(function() {
      if (document.visibilityState === "visible") {
        synchronizeApplicationChanges(true, false);
      }
    }, seconds * 1000);
  }

  /**
   * Comprueba si otro usuario guardó cambios y sincroniza la vista cuando
   * corresponde. forceRefresh se usa en el botón Actualizar.
   */
  function synchronizeApplicationChanges(silent, forceRefresh) {
    if (!APP_STATE.token || APP_STATE.syncPending || APP_STATE.requestPending) return;
    APP_STATE.syncPending = true;

    secureRpc("obtenerEstadoSincronizacionMotor", [], "SISTEMA")
      .then(function(state) {
        APP_STATE.lastSyncCheckAt = Date.now();
        const automaticEnabled = applySynchronizationConfiguration(state);

        // Cuando el control global está desactivado, una comprobación que ya
        // estaba en curso termina sin reconstruir el módulo. A partir de ese
        // momento solo el botón Actualizar vuelve a consultar los datos.
        if (!forceRefresh && !automaticEnabled) {
          markSync();
          return null;
        }

        const revision = state ? String(state.revision || "") : "";
        const changed = Boolean(forceRefresh || !APP_STATE.dataRevision ||
          revision !== APP_STATE.dataRevision);

        if (!changed) {
          markSync();
          if (!silent) toast("Actualización completa", "No hay cambios nuevos.");
          return null;
        }

        return secureRpc("obtenerContextoAplicacion", [], "SISTEMA")
          .then(function(context) {
            return applySynchronizedContext(context).then(function() {
              APP_STATE.dataRevision = context && context.sincronizacion ?
                String(context.sincronizacion.revision || revision) : revision;
              return true;
            });
          });
      })
      .then(function(changed) {
        if (changed === true && !isRolePreviewActive()) {
          refreshCurrentModule(true);
        }
        if (changed === true && !silent) {
          toast("Actualización completa", "Se cargaron los cambios más recientes.");
        }
        markSync();
      })
      .catch(function(error) {
        if (!silent) toast("No fue posible actualizar", errorMessage(error), true);
      })
      .finally(function() {
        APP_STATE.syncPending = false;
      });
  }

  /**
   * Aplica un contexto renovado conservando el módulo actual cuando todavía
   * está permitido. También reconstruye una vista previa activa.
   */
  function applySynchronizedContext(context) {
    context = context || {};
    const previewRole = APP_STATE.rolePreview && APP_STATE.rolePreview.rol ?
      APP_STATE.rolePreview.rol.codigo : "";
    const previewUser = APP_STATE.rolePreview &&
      APP_STATE.rolePreview.usuarioReferencia ?
      APP_STATE.rolePreview.usuarioReferencia.idUsuario : "";
    const currentModule = APP_STATE.module;

    APP_STATE.realContext = context;
    configureRolePreview(context);

    if (previewRole) {
      const available = context.visualizacionRoles &&
        Array.isArray(context.visualizacionRoles.roles) &&
        context.visualizacionRoles.roles.some(function(role) {
          return role.codigo === previewRole;
        });

      if (!available) {
        APP_STATE.context = context;
        APP_STATE.rolePreview = null;
        applyContext(context);
        renderNavigation(context.modulos || []);
        renderDashboard();
        return Promise.resolve();
      }

      APP_STATE.rolePreviewCache = {};
      return loadRolePreview(previewRole, previewUser)
        .then(function(preview) {
          activateRolePreview(preview);
        });
    }

    APP_STATE.context = context;
    APP_STATE.rolePreview = null;
    applyContext(context);
    const modules = Array.isArray(context.modulos) ? context.modulos : [];
    const moduleStillAvailable =
      currentModule === "DASHBOARD" ||
      modules.some(function(module) {
        return module.codigo === currentModule;
      });

    renderNavigation(modules);
    if (!moduleStillAvailable) {
      renderDashboard();
    } else {
      APP_STATE.module = currentModule;
      APP_STATE.moduleDefinition = modules.find(function(module) {
        return module.codigo === currentModule;
      }) || null;
      updateActiveNavigation();
    }
    return Promise.resolve();
  }

  /**
   * Actualiza actual módulo.
   */
  function refreshCurrentModule(silent) {
    if (APP_STATE.requestPending) return;
    if (isRolePreviewActive()) {
      markSync();
      if (!silent) toast("Vista previa actualizada", "La vista del rol no consulta ni modifica datos operativos.");
      return;
    }
    if (APP_STATE.module === "DASHBOARD") {
      markSync();
      if (!silent) toast("Actualización completa", "El inicio está actualizado.");
      return;
    }
    if (isAdministrationModule(APP_STATE.module) && typeof refreshAdministrationWorkspace === "function") {
      refreshAdministrationWorkspace(silent);
      return;
    }
    if (APP_STATE.module === "PROVEEDORES" && typeof refreshProvidersWorkspace === "function") {
      refreshProvidersWorkspace(silent);
      return;
    }
    if (APP_STATE.module === "MATERIALES_PRECIOS" && typeof refreshMaterialsPricesWorkspace === "function") {
      refreshMaterialsPricesWorkspace(silent);
      return;
    }
    if (APP_STATE.module === "VENTAS_CONTADO" && typeof refreshCashSalesWorkspace === "function") {
      refreshCashSalesWorkspace(silent);
      return;
    }
    if (typeof refreshDynamicModule === "function") refreshDynamicModule(silent);
  }

  /**
   * Cierra la sesión con respuesta visual inmediata.
   *
   * La interfaz elimina primero el token local y muestra la pantalla de acceso.
   * La confirmación de cierre en el servidor continúa en segundo plano, por lo
   * que el usuario no tiene que esperar una recarga completa de la aplicación.
   */
  function closeApplicationSession(changeAccount) {
    const message = changeAccount ?
      "Sesión cerrada. Selecciona la cuenta con la que deseas continuar." :
      "Sesión cerrada correctamente.";

    const supabase = window.supabaseClient && window.supabaseClient.getClient ?
      window.supabaseClient : null;
    if (supabase && typeof supabase.closeCurrentSession === "function") {
      supabase.closeCurrentSession("Cierre voluntario desde la aplicación").catch(function(error) {
        console.warn("No fue posible registrar el cierre de sesión:", error);
      });
    } else if (supabase) {
      supabase.getClient().auth.signOut({ scope: "local" }).catch(function(error) {
        console.warn("No fue posible cerrar la sesión de Supabase:", error);
      });
    }

    stopTimers();
    clearLocalSession();
    APP_STATE.module = "DASHBOARD";
    APP_STATE.moduleDefinition = null;
    APP_STATE.requestPending = false;

    closeModal();
    closeSideSheet();
    closeSidebar();
    showLogin(message, false);

  }

  function withTimeout(promise, milliseconds, message) {
    return Promise.race([
      promise,
      new Promise(function(_resolve, reject) {
        window.setTimeout(function() { reject(new Error(message)); }, milliseconds);
      })
    ]);
  }

  /**
   * Lee el token interno almacenado en el navegador.
   */
  function readStoredToken() {
    try { return String(window.localStorage.getItem(APP_STORAGE.TOKEN) || "").trim(); }
    catch (error) { return ""; }
  }

  /**
   * Elimina del navegador el token y los datos de sesión.
   */
  function clearLocalSession() {
    APP_STATE.token = "";
    APP_STATE.session = null;
    APP_STATE.context = null;
    APP_STATE.realContext = null;
    APP_STATE.rolePreview = null;
    APP_STATE.rolePreviewCache = {};
    APP_STATE.rolePreviewRequestSequence = 0;
    document.body.classList.remove("has-role-preview-control");
    if (typeof resetAdministrationStateForSession === "function") {
      resetAdministrationStateForSession();
    }
    try {
      window.localStorage.removeItem(APP_STORAGE.TOKEN);
      window.localStorage.removeItem(APP_STORAGE.SESSION);
    } catch (error) {}
  }

  /**
   * Detiene timers.
   */
  function stopTimers() {
    if (APP_STATE.refreshTimer) window.clearInterval(APP_STATE.refreshTimer);
    if (APP_STATE.heartbeatTimer) window.clearInterval(APP_STATE.heartbeatTimer);
    APP_STATE.refreshTimer = null;
    APP_STATE.heartbeatTimer = null;
    APP_STATE.syncPending = false;
  }

  /**
   * Aplica la identidad visual preparada por doGet al splash inicial.
   */
  function applyInitialLoaderBranding() {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;

    const config = window.__C360_LOADER_CONFIG__ &&
      typeof window.__C360_LOADER_CONFIG__ === "object" ?
      window.__C360_LOADER_CONFIG__ : {};

    const color = /^#[0-9a-f]{6}$/i.test(String(config.colorPrincipal || "")) ?
      String(config.colorPrincipal) : "#00A1DE";
    loader.style.setProperty("--loader-accent", color);

    setElementText("loaderBrandName", config.aplicacion || "Cálidda 360");
    setElementText("loaderTitle", config.titulo || "Preparando la aplicación");
    setElementText(
      "loaderSubtitle",
      config.subtitulo || "Estamos configurando tu espacio de trabajo."
    );
    setElementText(
      "loaderSecurityText",
      config.textoSeguridad || "Conexión protegida"
    );

    const mensajeInicial = String(
      config.mensajeInicial || "Validando acceso seguro…"
    ).trim();
    setElementText("loaderMessage", mensajeInicial);
    updateLoaderStep(mensajeInicial);

    const version = document.getElementById("loaderVersion");
    if (version) {
      version.textContent = config.version ? "v" + String(config.version) : "";
      version.hidden = !(config.mostrarVersion === true && config.version);
    }

    const logo = document.getElementById("loaderLogo");
    const fallback = document.getElementById("loaderFallbackIcon");
    const source = String(config.logoDataUrl || "img/calidda-logo.png").trim();

    if (logo && source) {
      logo.onload = function() {
        logo.hidden = false;
        if (fallback) fallback.hidden = true;
      };
      logo.onerror = function() {
        logo.hidden = true;
        if (fallback) fallback.hidden = false;
      };
      logo.src = source;
    }

    LOADER_RUNTIME.initialized = true;
  }

  /**
   * Actualiza texto sin depender de que exista el helper global text().
   */
  function setElementText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value === undefined || value === null ? "" : value);
  }

  /**
   * Traduce el mensaje actual a una de las tres etapas visuales del cargador.
   */
  function resolveLoaderStep(message) {
    const normalized = String(message || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    if (/VALIDANDO|ACCESO|SESION|CONEXION|AUTENTIC/.test(normalized)) return 1;
    if (/APLICANDO|CONSTRUYENDO|FINALIZANDO|INTERFAZ|CONTEXTO|LISTO/.test(normalized)) return 3;
    return 2;
  }

  /**
   * Refleja la etapa en los indicadores discretos del splash.
   */
  function updateLoaderStep(message) {
    const step = resolveLoaderStep(message);
    const container = document.getElementById("loaderSteps");
    if (!container) return;

    container.querySelectorAll("[data-loader-step]").forEach(function(item) {
      const itemStep = Number(item.dataset.loaderStep) || 1;
      item.classList.toggle("is-active", itemStep === step);
      item.classList.toggle("is-complete", itemStep < step);
    });
  }

  /**
   * Conserva el splash corporativo exclusivamente durante el arranque inicial.
   * Después de completar esa etapa, todas las llamadas existentes a setLoader()
   * utilizan el overlay interno mate y compacto.
   */
  function setLoader(visible, message) {
    if (!LOADER_RUNTIME.initialCompleted) {
      setInitialLoader(visible, message);

      if (!visible) {
        LOADER_RUNTIME.initialCompleted = true;
      }
      return;
    }

    setAppLoader(visible, message);
  }

  /**
   * Muestra u oculta el splash inicial con transición y etapas.
   */
  function setInitialLoader(visible, message) {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;

    if (LOADER_RUNTIME.hideTimer) {
      window.clearTimeout(LOADER_RUNTIME.hideTimer);
      LOADER_RUNTIME.hideTimer = null;
    }

    if (message) {
      setElementText("loaderMessage", message);
      updateLoaderStep(message);
    }

    if (visible) {
      loader.hidden = false;
      loader.setAttribute("aria-busy", "true");
      document.body.setAttribute("aria-busy", "true");
      window.requestAnimationFrame(function() {
        loader.classList.remove("is-leaving");
      });
      return;
    }

    loader.setAttribute("aria-busy", "false");
    document.body.removeAttribute("aria-busy");
    loader.classList.add("is-leaving");

    const reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    LOADER_RUNTIME.hideTimer = window.setTimeout(function() {
      loader.hidden = true;
      loader.classList.remove("is-leaving");
      LOADER_RUNTIME.hideTimer = null;
    }, reduceMotion ? 20 : 260);
  }

  /**
   * Muestra el overlay interno solo cuando la operación supera el umbral corto.
   * Esto evita parpadeos en respuestas rápidas.
   */
  function setAppLoader(visible, message) {
    const loader = document.getElementById("appLoader");
    if (!loader) return;

    if (message) {
      setElementText("appLoaderTitle", resolveAppLoaderTitle(message));
      setElementText("appLoaderMessage", message);
    }

    if (visible) {
      APP_LOADER_RUNTIME.requested = true;

      if (APP_LOADER_RUNTIME.hideTimer) {
        window.clearTimeout(APP_LOADER_RUNTIME.hideTimer);
        APP_LOADER_RUNTIME.hideTimer = null;
      }

      if (APP_LOADER_RUNTIME.visible || APP_LOADER_RUNTIME.showTimer) {
        return;
      }

      APP_LOADER_RUNTIME.showTimer = window.setTimeout(function() {
        APP_LOADER_RUNTIME.showTimer = null;

        if (!APP_LOADER_RUNTIME.requested) {
          return;
        }

        loader.hidden = false;
        loader.setAttribute("aria-busy", "true");
        document.body.setAttribute("aria-busy", "true");

        window.requestAnimationFrame(function() {
          loader.classList.remove("is-leaving");
          loader.classList.add("is-visible");
          APP_LOADER_RUNTIME.visible = true;
        });
      }, APP_LOADER_RUNTIME.delayMilliseconds);

      return;
    }

    APP_LOADER_RUNTIME.requested = false;

    if (APP_LOADER_RUNTIME.showTimer) {
      window.clearTimeout(APP_LOADER_RUNTIME.showTimer);
      APP_LOADER_RUNTIME.showTimer = null;
    }

    if (!APP_LOADER_RUNTIME.visible) {
      loader.hidden = true;
      loader.setAttribute("aria-busy", "false");
      document.body.removeAttribute("aria-busy");
      return;
    }

    loader.setAttribute("aria-busy", "false");
    loader.classList.remove("is-visible");
    loader.classList.add("is-leaving");
    document.body.removeAttribute("aria-busy");

    const reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    APP_LOADER_RUNTIME.hideTimer = window.setTimeout(function() {
      loader.hidden = true;
      loader.classList.remove("is-leaving");
      APP_LOADER_RUNTIME.visible = false;
      APP_LOADER_RUNTIME.hideTimer = null;
    }, reduceMotion ? 20 : 180);
  }

  /**
   * Convierte el mensaje funcional en un título breve para la tarjeta interna.
   */
  function resolveAppLoaderTitle(message) {
    const normalized = String(message || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    if (/GUARDANDO|REGISTRANDO|CREANDO|MODIFICANDO/.test(normalized)) {
      return "Guardando cambios";
    }

    if (/APLICANDO|CONSTRUYENDO|PERMISOS|CONTEXTO|ROL/.test(normalized)) {
      return "Actualizando la vista";
    }

    if (/SINCRONIZANDO|ACTUALIZANDO/.test(normalized)) {
      return "Sincronizando";
    }

    if (/CARGANDO|CONSULTANDO|OBTENIENDO|PREPARANDO/.test(normalized)) {
      return "Cargando información";
    }

    return "Procesando solicitud";
  }

  /**
   * Restaura la preferencia visual de la barra lateral sin afectar la sesión.
   */
  function restoreSidebarPreference() {
    let collapsed = false;
    try {
      collapsed = window.localStorage.getItem(APP_STORAGE.SIDEBAR_COLLAPSED) === "1";
    } catch (error) {}
    applySidebarCollapsed(collapsed, false);
  }

  /**
   * Alterna la barra lateral entre modo completo y modo de solo íconos.
   */
  function toggleSidebarCollapse() {
    if (window.matchMedia("(max-width: 860px)").matches) return;
    const shell = document.getElementById("appShell");
    applySidebarCollapsed(!(shell && shell.classList.contains("is-sidebar-collapsed")), true);
  }

  /**
   * Aplica el estado colapsado y opcionalmente lo conserva en el navegador.
   */
  function applySidebarCollapsed(collapsed, persist) {
    const shell = document.getElementById("appShell");
    const button = document.getElementById("sidebarCollapseButton");
    const icon = document.getElementById("sidebarCollapseIcon");
    if (!shell) return;

    shell.classList.toggle("is-sidebar-collapsed", Boolean(collapsed));

    const label = collapsed ? "Expandir menú" : "Minimizar menú";
    if (button) {
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
      button.setAttribute("title", label);
      button.dataset.tooltip = label;
    }
    if (icon) icon.textContent = collapsed ? "chevron_right" : "chevron_left";

    if (persist) {
      try {
        window.localStorage.setItem(APP_STORAGE.SIDEBAR_COLLAPSED, collapsed ? "1" : "0");
      } catch (error) {}
    }
  }

  /**
   * Abre sidebar.
   */
  function openSidebar() {
    document.getElementById("appSidebar").classList.add("is-open");
    document.getElementById("sidebarBackdrop").hidden = false;
  }
  /**
   * Cierra sidebar.
   */
  function closeSidebar() {
    document.getElementById("appSidebar").classList.remove("is-open");
    document.getElementById("sidebarBackdrop").hidden = true;
  }

  /**
   * Ejecuta mark sync.
   */
  function markSync() {
    const now = new Date();
    text("lastSyncLabel", now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }));
  }

  /**
   * Ejecuta metric card HTML.
   */
  function metricCardHtml(metric) {
    return '<article class="metric-card"><div class="metric-card-head"><span class="metric-icon"><span class="material-symbols-rounded">' +
      escapeHtml(metric.icon) + '</span></span></div><strong>' + escapeHtml(String(metric.value)) +
      '</strong><span>' + escapeHtml(metric.label) + "</span></article>";
  }

  /**
   * Ejecuta tabla HTML.
   */
  function tableHtml(columns, rows, options) {
    options = options || {};
    if (!rows || !rows.length) return emptyStateHtml();
    const header = columns.map(function(column) { return "<th>" + escapeHtml(column.label) + "</th>"; }).join("");
    const body = rows.map(function(row, index) {
      return "<tr>" + columns.map(function(column) {
        const value = typeof column.render === "function" ? column.render(row, index) : escapeHtml(formatValue(row[column.key]));
        return "<td>" + value + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<table class="data-table"><thead><tr>' + header + "</tr></thead><tbody>" + body + "</tbody></table>";
  }

  /**
   * Ejecuta empty state HTML.
   */
  function emptyStateHtml() {
    return '<div class="empty-state"><span class="material-symbols-rounded">inbox</span><strong>Sin registros</strong><p>No se encontraron datos para los filtros actuales.</p></div>';
  }

  /**
   * Carga ing HTML.
   */
  function loadingHtml(lines) {
    return new Array(lines || 4).fill('<div class="skeleton"></div>').join("");
  }

  /**
   * Ejecuta toast.
   */
  function toast(title, message, isError) {
    const region = document.getElementById("toastRegion");
    const item = document.createElement("div");
    item.className = "toast" + (isError ? " is-error" : "");
    item.innerHTML = '<span class="material-symbols-rounded">' + (isError ? "error" : "check_circle") +
      '</span><div class="toast-copy"><strong>' + escapeHtml(title || "Información") +
      "</strong><small>" + escapeHtml(message || "") + "</small></div>";
    region.appendChild(item);
    window.setTimeout(function() { item.remove(); }, 5200);
  }

  /**
   * Abre modal.
   */
  function openModal(config) {
    config = config || {};
    text("modalEyebrow", config.eyebrow || "");
    text("modalTitle", config.title || "");
    document.getElementById("modalBody").innerHTML = config.body || "";
    document.getElementById("modalFooter").innerHTML = config.footer || "";
    const card = document.querySelector("#modalRoot .modal-card");
    if (card) card.classList.toggle("modal-card--wide", config.wide === true);
    document.getElementById("modalRoot").hidden = false;
  }
  /**
   * Cierra modal.
   */
  function closeModal() { document.getElementById("modalRoot").hidden = true; }

  /**
   * Abre side hoja.
   */
  function openSideSheet(config) {
    config = config || {};
    text("sideSheetEyebrow", config.eyebrow || "");
    text("sideSheetTitle", config.title || "");
    document.getElementById("sideSheetBody").innerHTML = config.body || "";
    document.getElementById("sideSheetFooter").innerHTML = config.footer || "";
    document.getElementById("sideSheetRoot").hidden = false;
  }
  /**
   * Cierra side hoja.
   */
  function closeSideSheet() { document.getElementById("sideSheetRoot").hidden = true; }

  /**
   * Asigna la operación correspondiente.
   */
  function text(id, value) { const element = document.getElementById(id); if (element) element.textContent = value === null || value === undefined ? "" : String(value); }
  /**
   * Ejecuta on.
   */
  function on(id, event, handler) { const element = document.getElementById(id); if (element) element.addEventListener(event, handler); }
  /**
   * Calcula la operación correspondiente.
   */
  function initials(value) { const parts = String(value || "U").trim().split(/\s+/).filter(Boolean); return parts.slice(0, 2).map(function(part) { return part.charAt(0).toUpperCase(); }).join("") || "U"; }
  /**
   * Obtiene name.
   */
  function firstName(value) { return String(value || "").trim().split(/\s+/)[0] || "usuario"; }
  /**
   * Formatea valor.
   */
  function formatValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (Object.prototype.toString.call(value) === "[object Date]") return value.toLocaleString("es-PE");
    return String(value);
  }
  /**
   * Escapa HTML.
   */
  function escapeHtml(value) { return String(value === null || value === undefined ? "" : value).replace(/[&<>'"]/g, function(character) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]; }); }
  function moduleIconHtml(icon) {
    const value = String(icon || "grid_view").trim();
    if (/^(?:fa[bsrl]?|fa-solid|fa-regular|fa-brands)(?:\s+fa[-a-z0-9]+)+$/i.test(value)) {
      return '<i class="module-fontawesome-icon ' + escapeHtml(value) + '" aria-hidden="true"></i>';
    }
    return '<span class="material-symbols-rounded">' + escapeHtml(value) + '</span>';
  }
  /**
   * Obtiene mensaje.
   */
  function errorMessage(error, fallback) { return String(error && (error.message || error) || fallback || "Ocurrió un error.").replace(/^Exception:\s*/i, ""); }
  /**
   * Ejecuta debounce.
   */
  function debounce(callback, delay) { let timer; return function() { const args = arguments; window.clearTimeout(timer); timer = window.setTimeout(function() { callback.apply(null, args); }, delay || 320); }; }