const ADMIN_STATE = {
    activeModule: "",
    summary: null,
    users: [],
    usersAll: [],
    usersLoaded: false,
    usersContextKey: "",
    userSearchText: "",
    roles: [],
    modules: [],
    catalogs: [],
    catalogValuesCache: {},
    activeCatalogCode: "",
    settings: [],
    resources: [],
    providers: [],
    offices: [],
    groups: [],
    providerOfficeRelations: [],
    documentTypes: [],
    assignmentRules: {},
    assignmentStructureLoaded: false,
    permissionMatrix: null,
    permissionOriginal: {},
    audit: [],
    sessions: [],
    sessionsSummary: null,
    initialized: false
  };

  const ASSIGNMENT_IMPORT_CONFIG = Object.freeze({
    PROVEEDORES: Object.freeze({
      nombre: "proveedores",
      etiqueta: "Proveedores",
      archivo: "plantilla_proveedores.csv",
      cabeceras: ["ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "CODIGO_SAP", "RUC", "DESCRIPCION", "ESTADO"]
    }),
    OFICINAS: Object.freeze({
      nombre: "oficinas",
      etiqueta: "Oficinas",
      archivo: "plantilla_oficinas.csv",
      cabeceras: ["ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO"]
    }),
    GRUPOS: Object.freeze({
      nombre: "grupos",
      etiqueta: "Grupos",
      archivo: "plantilla_grupos.csv",
      cabeceras: ["ID_GRUPO", "ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO"]
    }),
    PROVEEDOR_OFICINAS: Object.freeze({
      nombre: "asignaciones proveedor-oficina",
      etiqueta: "Asignaciones proveedor-oficina",
      archivo: "plantilla_proveedor_oficinas.csv",
      cabeceras: ["ID_PROVEEDOR", "ID_OFICINA", "ESTADO"]
    })
  });

  const ADMIN_MODULE_CONFIGURATION = Object.freeze({
    ADMIN_GENERAL: Object.freeze({
      eyebrow: "CENTRO DE CONTROL",
      title: "Administración general",
      description: "Indicadores generales de seguridad, módulos y sesiones. Vista exclusiva del superadministrador.",
      sections: [],
      metrics: true
    }),
    ADMIN_USUARIOS: Object.freeze({
      eyebrow: "SEGURIDAD Y ACCESOS",
      title: "Usuarios",
      description: "Administra datos, roles, estados y asignaciones organizativas de los usuarios.",
      sections: ["users"],
      metrics: false
    }),
    ADMIN_PERMISOS: Object.freeze({
      eyebrow: "SEGURIDAD Y ACCESOS",
      title: "Roles y permisos",
      description: "Administra roles protegidos y configurables, accesos, alcances y delegación. Los nombres visibles son editables y SUPERADMIN conserva acceso total implícito.",
      sections: ["roles", "permissions"],
      metrics: false
    }),
    ADMIN_ESTRUCTURA: Object.freeze({
      eyebrow: "ESTRUCTURA COMERCIAL",
      title: "Estructura comercial",
      description: "Administra proveedores, oficinas, grupos y relaciones proveedor-oficina.",
      sections: ["providers", "offices-groups"],
      metrics: false
    }),
    ADMIN_CONFIG_APP: Object.freeze({
      eyebrow: "CONFIGURACIÓN",
      title: "Configuración de la aplicación",
      description: "Administra módulos, navegación, catálogos, recursos visuales y parámetros funcionales.",
      sections: ["modules", "catalogs", "visual-resources", "settings"],
      metrics: false
    }),
    ADMIN_AUDITORIA: Object.freeze({
      eyebrow: "CONTROL Y TRAZABILIDAD",
      title: "Auditoría",
      description: "Consulta sesiones activas, accesos, eventos de la aplicación y modificaciones de permisos.",
      sections: ["audit"],
      metrics: false
    })
  });

  function adminRpcModuleCode() {
    return ADMIN_STATE.activeModule || APP_STATE.module || "SISTEMA";
  }

  function getAdministrationModuleConfiguration(code) {
    const normalizedCode = String(code || "").toUpperCase();
    const base = ADMIN_MODULE_CONFIGURATION[normalizedCode] ||
      ADMIN_MODULE_CONFIGURATION.ADMIN_GENERAL;
    const role = String(APP_STATE.context && APP_STATE.context.usuario && APP_STATE.context.usuario.rol || "").toUpperCase();
    if (normalizedCode === "ADMIN_CONFIG_APP" && role === "SUPERADMIN") {
      return Object.assign({}, base, {
        eyebrow: "CENTRO DE GESTIÓN",
        title: "Administración integral",
        description: "Gestiona desde una sola interfaz usuarios, proveedores, oficinas, grupos, asignaciones, roles, permisos, módulos y recursos visuales.",
        sections: ["users", "roles", "permissions", "providers", "offices-groups", "modules", "catalogs", "visual-resources", "settings"]
      });
    }
    return base;
  }


  function resetAdministrationStateForSession() {
    ADMIN_STATE.users = [];
    ADMIN_STATE.usersAll = [];
    ADMIN_STATE.usersLoaded = false;
    ADMIN_STATE.usersContextKey = "";
    ADMIN_STATE.userSearchText = "";
    ADMIN_STATE.roles = [];
    ADMIN_STATE.providers = [];
    ADMIN_STATE.offices = [];
    ADMIN_STATE.groups = [];
    ADMIN_STATE.providerOfficeRelations = [];
    ADMIN_STATE.assignmentStructureLoaded = false;
    ADMIN_STATE.permissionMatrix = null;
    ADMIN_STATE.permissionOriginal = {};
    ADMIN_STATE.audit = [];
    ADMIN_STATE.sessions = [];
    ADMIN_STATE.sessionsSummary = null;
    ADMIN_STATE.initialized = false;
  }

  function adminUsersContextKey() {
    const user = APP_STATE.context && APP_STATE.context.usuario || {};
    return [
      String(user.idUsuario || ""),
      String(user.rol || ""),
      String(user.idProveedor || ""),
      String(user.idGrupo || ""),
      activePermissionScope("ADMIN_USUARIOS", "VER_LISTADO")
    ].join("|");
  }

  function canAdministerUsers(resource) {
    return hasActivePermission("ADMIN_USUARIOS", resource);
  }

  function applyAdministrationPermissionVisibility() {
    const newUserButton = document.querySelector('[data-admin-action="new-user"]');
    if (newUserButton) {
      newUserButton.hidden = !(canAdministerUsers("CREAR") && canAdministerUsers("VER_DETALLE"));
    }

    const savePermissionsButton = document.querySelector(
      '[data-admin-action="save-permissions"]'
    );
    if (savePermissionsButton) {
      savePermissionsButton.hidden =
        !hasActivePermission("ADMIN_PERMISOS", "EDITAR_PERMISOS");
    }

    const expireSessionsButton = document.querySelector(
      '[data-admin-action="expire-sessions"]'
    );
    if (expireSessionsButton) {
      expireSessionsButton.hidden =
        !hasActivePermission("ADMIN_AUDITORIA", "LIMPIAR_SESIONES_EXPIRADAS") ||
        isRolePreviewActive();
    }
  }

  function ensureWritableAdministrationView() {
    if (isRolePreviewActive()) {
      toast(
        "Vista simulada de solo lectura",
        "Vuelve a tu vista para realizar cambios.",
        true
      );
      return false;
    }
    return true;
  }

  /**
   * Abre la consola administrativa y carga sus secciones.
   */
  function openAdministrationWorkspace(module) {
    const code = String(
      module && module.codigo || "ADMIN_GENERAL"
    ).toUpperCase();
    const config = getAdministrationModuleConfiguration(code);
    const contextKey = adminUsersContextKey();

    if (
      ADMIN_STATE.activeModule !== code ||
      ADMIN_STATE.usersContextKey !== contextKey
    ) {
      ADMIN_STATE.users = [];
      ADMIN_STATE.usersAll = [];
      ADMIN_STATE.usersLoaded = false;
      ADMIN_STATE.usersContextKey = contextKey;
      ADMIN_STATE.assignmentStructureLoaded = false;
      ADMIN_STATE.roles = [];
    }

    ADMIN_STATE.activeModule = code;

    setActiveView("dynamicModuleView");
    setModuleHeading(
      module.grupoMenu || "SISTEMA",
      module.nombre || config.title
    );
    const view = document.getElementById("dynamicModuleView");
    view.innerHTML = "";
    view.appendChild(
      document.getElementById("administrationTemplate").content.cloneNode(true)
    );

    text("adminWorkspaceEyebrow", config.eyebrow);
    text("adminWorkspaceTitle", config.title);
    text("adminWorkspaceDescription", config.description);
    configureAdministrationSections(config);
    applyAdministrationPermissionVisibility();
    bindAdministrationInterface();
    refreshAdministrationWorkspace(true);
  }

  function configureAdministrationSections(config) {
    const metrics = document.getElementById("adminMetrics");
    const accordion = document.getElementById("adminAccordion");
    if (metrics) metrics.hidden = config.metrics !== true;
    if (accordion) accordion.hidden = !config.sections.length;

    document.querySelectorAll(".accordion-item[data-section]").forEach(function(item) {
      item.hidden = config.sections.indexOf(item.dataset.section) === -1;
    });

    document.querySelectorAll(".admin-section-group").forEach(function(group) {
      const visibleItems = Array.prototype.slice.call(group.querySelectorAll(".accordion-item[data-section]")).filter(function(item) {
        return !item.hidden;
      });
      group.hidden = visibleItems.length === 0;
    });

    const visible = Array.prototype.slice.call(
      document.querySelectorAll(".accordion-item[data-section]")
    ).filter(function(item) {
      return !item.hidden;
    });

    /*
     * Todas las consolas administrativas comienzan minimizadas.
     * El usuario abre únicamente el bloque que necesita consultar.
     */
    visible.forEach(function(item) {
      const trigger = item.querySelector(".accordion-trigger");
      const panel = item.querySelector(".accordion-panel");

      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }

      if (panel) {
        panel.hidden = true;
      }
    });
  }

  /**
   * Vincula los eventos de acordeones, tablas y formularios administrativos.
   */
  function bindAdministrationInterface() {
    document.querySelectorAll(".accordion-item:not([hidden]) .accordion-trigger").forEach(function(trigger) {
      trigger.addEventListener("click", function() {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        const panel = trigger.closest(".accordion-item").querySelector(".accordion-panel");
        trigger.setAttribute("aria-expanded", String(!expanded));
        panel.hidden = expanded;
      });
    });

    document.querySelectorAll("[data-admin-action]").forEach(function(button) {
      button.addEventListener("click", function() {
        handleAdminAction(button.dataset.adminAction, button);
      });
    });

    const search = document.getElementById("adminUsersSearch");
    if (search) search.addEventListener("input", function() {
      filterAdminUsersLocal(search.value);
    });

    const permissionRole = document.getElementById("adminPermissionRole");
    if (permissionRole) permissionRole.addEventListener("change", function() {
      loadPermissionMatrix(permissionRole.value);
    });

    const sessionsSearch = document.getElementById("adminSessionsSearch");
    const sessionsState = document.getElementById("adminSessionsState");
    if (sessionsSearch) sessionsSearch.addEventListener("input", debounce(loadAdminSessions, 380));
    if (sessionsState) sessionsState.addEventListener("change", loadAdminSessions);

    const auditSearch = document.getElementById("adminAuditSearch");
    const auditType = document.getElementById("adminAuditType");
    if (auditSearch) auditSearch.addEventListener("input", debounce(loadAdminAudit, 380));
    if (auditType) auditType.addEventListener("change", loadAdminAudit);
  }

  /**
   * Actualiza el contenido visible de la consola administrativa.
   */
  function refreshAdministrationWorkspace(silent) {
    APP_STATE.requestPending = true;
    if (!silent) {
      setLoader(
        true,
        "Actualizando " +
          (getAdministrationModuleConfiguration(
            ADMIN_STATE.activeModule
          ).title || "módulo") +
          "…"
      );
    }

    let tasks = [];
    if (ADMIN_STATE.activeModule === "ADMIN_GENERAL") {
      tasks = [loadAdminSummary()];
    } else if (ADMIN_STATE.activeModule === "ADMIN_USUARIOS") {
      tasks = [loadAdminUsers("", true)];
      if (canAdministerUsers("VER_DETALLE")) {
        tasks.push(loadAdminAssignmentStructure());
        tasks.push(loadAdminRoles());
      }
    } else if (ADMIN_STATE.activeModule === "ADMIN_PERMISOS") {
      tasks = [loadAdminRoles()];
    } else if (ADMIN_STATE.activeModule === "ADMIN_ESTRUCTURA") {
      tasks = [loadAdminAssignmentStructure()];
    } else if (ADMIN_STATE.activeModule === "ADMIN_CONFIG_APP") {
      tasks = [
        loadAdminModules(),
        loadAdminCatalogs(),
        loadAdminResources(),
        loadAdminSettings()
      ];
      const role = String(APP_STATE.context && APP_STATE.context.usuario && APP_STATE.context.usuario.rol || "").toUpperCase();
      if (role === "SUPERADMIN") {
        tasks.push(loadAdminUsers("", true));
        tasks.push(loadAdminRoles());
        tasks.push(loadAdminAssignmentStructure());
      }
    } else if (ADMIN_STATE.activeModule === "ADMIN_AUDITORIA") {
      tasks = [loadAdminSessions(), loadAdminAudit()];
    }

    Promise.allSettled(tasks).then(function() {
      APP_STATE.requestPending = false;
      ADMIN_STATE.initialized = true;
      applyAdministrationPermissionVisibility();
      if (ADMIN_STATE.activeModule === "ADMIN_PERMISOS" || ADMIN_STATE.activeModule === "ADMIN_CONFIG_APP") {
        populatePermissionRoleSelector();
      }
      markSync();
      if (!silent) setLoader(false);
    });
  }

  /**
   * Procesa una acción seleccionada dentro de Administración.
   */
  function handleAdminAction(action) {
    if (action === "refresh") refreshAdministrationWorkspace(false);
    if (action === "refresh-sessions") loadAdminSessions();
    if (action === "expire-sessions") cleanExpiredAdminSessions();

    if (action === "new-user") {
      if (!canAdministerUsers("CREAR")) {
        toast("Acceso denegado", "No tienes permiso para crear usuarios.", true);
        return;
      }
      if (!ensureWritableAdministrationView()) return;
      openUserEditor(null);
    }

    if (action === "new-provider") openProviderEditor(null);
    if (action === "new-office") openOfficeEditor(null);
    if (action === "new-group") openGroupEditor(null);
    if (action === "template-providers") downloadAssignmentTemplate("PROVEEDORES");
    if (action === "template-offices") downloadAssignmentTemplate("OFICINAS");
    if (action === "template-groups") downloadAssignmentTemplate("GRUPOS");
    if (action === "import-providers") selectAssignmentImportFile("PROVEEDORES");
    if (action === "import-offices") selectAssignmentImportFile("OFICINAS");
    if (action === "import-groups") selectAssignmentImportFile("GRUPOS");
    if (action === "template-provider-offices") {
      downloadAssignmentTemplate("PROVEEDOR_OFICINAS");
    }
    if (action === "import-provider-offices") {
      selectAssignmentImportFile("PROVEEDOR_OFICINAS");
    }
    if (action === "new-role") openRoleEditor(null);
    if (action === "new-module") openModuleEditor(null);
    if (action === "new-catalog") openCatalogEditor(null);
    if (action === "new-resource") openResourceEditor(null);
    if (action === "save-permissions") savePermissionMatrix();
  }

  /**
   * Carga administración resumen.
   */
  function loadAdminSummary() {
    return secureRpc("obtenerResumenAdministracionMotor", [], adminRpcModuleCode())
      .then(function(summary) {
        ADMIN_STATE.summary = summary;
        const metrics = [
          { icon: "group", value: summary.usuariosActivos, label: "Usuarios activos" },
          { icon: "badge", value: summary.rolesActivos, label: "Roles activos" },
          { icon: "dashboard_customize", value: summary.modulosActivos, label: "Módulos activos" },
          { icon: "key", value: summary.sesionesAbiertas, label: "Sesiones vigentes" }
        ];
        const region = document.getElementById("adminMetrics");
        if (region) region.innerHTML = metrics.map(metricCardHtml).join("");
      })
      .catch(function(error) { renderAdminPermissionError("adminMetrics", error); });
  }

  /**
   * Carga administración usuarios.
   */
  /**
   * Normaliza texto para búsquedas locales sin distinguir mayúsculas ni tildes.
   */
  function normalizeAdminUserSearch(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * Prepara una única cadena de búsqueda por usuario.
   */
  function prepareAdminUserForSearch(user) {
    const prepared = Object.assign({}, user);
    prepared.__searchText = normalizeAdminUserSearch([
      user.nombre,
      user.correo,
      user.numeroDocumento,
      user.nombreRol,
      user.nombreComercialProveedor,
      user.razonSocialProveedor,
      user.nombreProveedor,
      user.nombreOficina,
      user.nombreGrupo,
      user.estado
    ].join(" "));
    return prepared;
  }

  /**
   * Filtra el catálogo ya cargado sin volver a consultar Google Sheets.
   */
  function filterAdminUsersLocal(textFilter) {
    ADMIN_STATE.userSearchText = String(textFilter || "");
    const query = normalizeAdminUserSearch(ADMIN_STATE.userSearchText);

    ADMIN_STATE.users = !query ?
      ADMIN_STATE.usersAll.slice() :
      ADMIN_STATE.usersAll.filter(function(user) {
        return String(user.__searchText || "").indexOf(query) !== -1;
      });

    updateAdminCount("users", ADMIN_STATE.users.length);
    renderAdminUsers();
  }

  /**
   * Carga una vez el catálogo completo y deja la búsqueda en memoria.
   */
  function validateAdminUsersResponse(result) {
    const contextUser = APP_STATE.context && APP_STATE.context.usuario || {};
    const access = result && result.contextoAcceso || {};
    // El adaptador de Supabase devuelve el listado directo. En ese caso la
    // identidad ya fue comprobada al abrir la sesión y no existe un sello
    // contextoAcceso que comparar.
    if (!access.idUsuario) {
      return Array.isArray(result && result.registros) ? result.registros.slice() : [];
    }
    if (
      String(access.idUsuario) !== String(contextUser.idUsuario || "") ||
      String(access.rol || "").toUpperCase() !==
        String(contextUser.rol || "").toUpperCase()
    ) {
      resetAdministrationStateForSession();
      throw new Error(
        "La respuesta de usuarios pertenece a otra identidad. Cierra sesión y vuelve a ingresar."
      );
    }

    let records = Array.isArray(result.registros) ? result.registros.slice() : [];
    const role = String(contextUser.rol || "").toUpperCase();
    const scope = String(access.alcance || "NINGUNO").toUpperCase();
    if (role !== "SUPERADMIN") {
      records = records.filter(function(user) {
        return String(user.rol || "").toUpperCase() !== "SUPERADMIN";
      });
      if (scope === "PROVEEDOR") {
        records = records.filter(function(user) {
          return Boolean(contextUser.idProveedor) &&
            String(user.idProveedor || "") === String(contextUser.idProveedor || "");
        });
      } else if (scope === "GRUPO") {
        records = records.filter(function(user) {
          return Boolean(contextUser.idGrupo) &&
            String(user.idGrupo || "") === String(contextUser.idGrupo || "");
        });
      } else if (scope === "PROPIO" || scope === "ASIGNADOS") {
        records = records.filter(function(user) {
          return String(user.idUsuario || "") === String(contextUser.idUsuario || "");
        });
      }
    }
    return records;
  }

  function loadAdminUsers(textFilter, forceRemote) {
    ADMIN_STATE.userSearchText = String(textFilter || "");
    const currentContextKey = adminUsersContextKey();

    if (
      ADMIN_STATE.usersLoaded &&
      ADMIN_STATE.usersContextKey === currentContextKey &&
      forceRemote !== true
    ) {
      filterAdminUsersLocal(ADMIN_STATE.userSearchText);
      return Promise.resolve(ADMIN_STATE.users);
    }

    const region = document.getElementById("adminUsersContent");
    if (region) region.innerHTML = loadingHtml(4);

    return secureRpc(
      "listarUsuariosAdminMotor",
      [{ texto: "", todos: true }],
      adminRpcModuleCode()
    ).then(function(result) {
      ADMIN_STATE.usersAll = validateAdminUsersResponse(result).map(
        prepareAdminUserForSearch
      );
      ADMIN_STATE.usersLoaded = true;
      ADMIN_STATE.usersContextKey = currentContextKey;
      filterAdminUsersLocal(ADMIN_STATE.userSearchText);
      return ADMIN_STATE.users;
    }).catch(function(error) {
      ADMIN_STATE.usersLoaded = false;
      ADMIN_STATE.usersAll = [];
      ADMIN_STATE.users = [];
      renderAdminPermissionError("adminUsersContent", error);
      throw error;
    });
  }

  /**
   * Renderiza administración usuarios.
   */
  function renderAdminUsers() {
    const region = document.getElementById("adminUsersContent");
    if (!region) return;

    const canEdit = canAdministerUsers("EDITAR") && canAdministerUsers("VER_DETALLE");
    const canViewDetail = canAdministerUsers("VER_DETALLE");

    region.innerHTML = tableHtml([
      { key: "nombre", label: "Usuario" },
      { key: "correo", label: "Correo" },
      {
        key: "nombreRol",
        label: "Rol",
        render: function(row) {
          return '<strong>' +
            escapeHtml(row.nombreRol || "Rol no disponible") +
            '</strong>';
        }
      },
      {
        key: "nombreProveedor",
        label: "Proveedor",
        render: function(row) {
          if (!row.idProveedor) return "—";
          const nombreVisible = row.nombreComercialProveedor ||
            row.razonSocialProveedor ||
            row.nombreProveedor ||
            "Proveedor no disponible";
          return '<strong>' + escapeHtml(nombreVisible) + '</strong>';
        }
      },
      { key: "nombreOficina", label: "Oficina" },
      { key: "estado", label: "Estado", render: statusChip },
      {
        key: "actions",
        label: "",
        render: function(row) {
          const buttons = [];
          if (canViewDetail) {
            buttons.push(
              '<button class="table-button" type="button" data-view-user="' +
              escapeHtml(row.idUsuario) +
              '" aria-label="Ver detalle"><span class="material-symbols-rounded">visibility</span></button>'
            );
          }
          if (canEdit) {
            buttons.push(
              '<button class="table-button" type="button" data-edit-user="' +
              escapeHtml(row.idUsuario) +
              '" aria-label="Editar"><span class="material-symbols-rounded">edit</span></button>'
            );
          }
          return '<div class="table-actions">' + buttons.join("") + "</div>";
        }
      }
    ], ADMIN_STATE.users);

    region.querySelectorAll("[data-view-user]").forEach(function(button) {
      button.addEventListener("click", function() {
        openUserReadonlyDetail(
          ADMIN_STATE.users.find(function(item) {
            return item.idUsuario === button.dataset.viewUser;
          })
        );
      });
    });

    region.querySelectorAll("[data-edit-user]").forEach(function(button) {
      button.addEventListener("click", function() {
        if (!ensureWritableAdministrationView()) return;
        openUserEditor(
          ADMIN_STATE.users.find(function(item) {
            return item.idUsuario === button.dataset.editUser;
          })
        );
      });
    });
  }

  /**
   * Carga administración roles.
   */
  function loadAdminRoles() {
    const region = document.getElementById("adminRolesContent");
    if (region) region.innerHTML = loadingHtml(3);
    const operation = ADMIN_STATE.activeModule === "ADMIN_USUARIOS" ?
      "listarRolesAsignablesUsuariosMotor" : "listarRolesAdminMotor";
    return secureRpc(operation, [], adminRpcModuleCode())
      .then(function(result) {
        const roles = Array.isArray(result) ? result :
          (result && Array.isArray(result.registros) ? result.registros :
          (result && Array.isArray(result.roles) ? result.roles :
          (result && Array.isArray(result.resultado) ? result.resultado : null)));
        if (!roles) {
          const tipo = result === null ? "null" : typeof result;
          throw new Error("El servidor devolvió una respuesta de roles no válida (" + tipo + ").");
        }
        ADMIN_STATE.roles = roles;
        updateAdminCount("roles", ADMIN_STATE.roles.length);
        if (region) renderAdminRoles();
      })
      .catch(function(error) {
        ADMIN_STATE.roles = [];
        updateAdminCount("roles", 0);
        if (region) {
          region.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">database_alert</span><strong>No se pudo cargar el catálogo de roles</strong><p>' +
            escapeHtml(errorMessage(error, "Ejecuta la corrección de roles y vuelve a actualizar el módulo.")) +
            "</p></div>";
        }
      });
  }

  /**
   * Renderiza administración roles.
   */
  function renderAdminRoles() {
    const region = document.getElementById("adminRolesContent");
    if (!region) return;
    region.innerHTML = tableHtml([
      { key: "nombre", label: "Rol" },
      { key: "codigo", label: "Código técnico" },
      { key: "tipo", label: "Tipo", render: function(row) {
        return '<span class="chip ' + (row.protegido ? "chip--active" : "") + '">' +
          escapeHtml(row.protegido ? "Protegido" : "Configurable") + "</span>";
      } },
      { key: "nivel", label: "Nivel administrativo" },
      { key: "usuariosActivos", label: "Usuarios activos" },
      { key: "estado", label: "Estado", render: statusChip },
      { key: "actions", label: "", render: function(row) {
        const icon = row.protegido ? "visibility" : "edit";
        const label = row.protegido ? "Ver rol protegido" : "Editar rol";
        return '<div class="table-actions"><button class="table-button" type="button" data-edit-role="' +
          escapeHtml(row.idRol) + '" aria-label="' + label + '"><span class="material-symbols-rounded">' +
          icon + "</span></button></div>";
      } }
    ], ADMIN_STATE.roles);
    region.querySelectorAll("[data-edit-role]").forEach(function(button) {
      button.addEventListener("click", function() {
        openRoleEditor(ADMIN_STATE.roles.find(function(item) {
          return item.idRol === button.dataset.editRole;
        }));
      });
    });
  }

  /**
   * Carga administración módulos.
   */
  function loadAdminModules() {
    const region = document.getElementById("adminModulesContent");
    if (region) region.innerHTML = loadingHtml(4);
    return secureRpc("listarModulosAdminMotor", [], adminRpcModuleCode())
      .then(function(rows) {
        ADMIN_STATE.modules = rows || [];
        updateAdminCount("modules", ADMIN_STATE.modules.length);
        renderAdminModules();
      })
      .catch(function(error) { renderAdminPermissionError("adminModulesContent", error); });
  }

  /**
   * Renderiza administración módulos.
   */
  function renderAdminModules() {
    const region = document.getElementById("adminModulesContent");
    if (!region) return;
    if (!ADMIN_STATE.modules.length) { region.innerHTML = emptyStateHtml(); return; }
    region.innerHTML = ADMIN_STATE.modules.map(function(module) {
      return '<article class="builder-card"><div class="builder-card-head">' +
        '<span class="module-card-icon">' + moduleIconHtml(module.icono) + "</span>" +
        '<div><strong>' + escapeHtml(module.nombre) + '</strong><small>' + escapeHtml(module.codigo + " · " + module.tipoVista) + "</small></div>" +
        '<button class="table-button" type="button" data-edit-module="' + escapeHtml(module.idModulo) + '"><span class="material-symbols-rounded">edit</span></button>' +
        '</div><p>' + escapeHtml(module.descripcion || "Sin descripción") + '</p><div class="toolbar toolbar--end">' +
        (module.tipoVista === "DINAMICA" ? '<button class="button button--ghost" type="button" data-module-fields="' + escapeHtml(module.codigo) + '"><span class="material-symbols-rounded">view_column</span>Campos</button>' : "") +
        '</div></article>';
    }).join("");
    region.querySelectorAll("[data-edit-module]").forEach(function(button) {
      button.addEventListener("click", function() { openModuleEditor(ADMIN_STATE.modules.find(function(item) { return item.idModulo === button.dataset.editModule; })); });
    });
    region.querySelectorAll("[data-module-fields]").forEach(function(button) {
      button.addEventListener("click", function() { openModuleFields(button.dataset.moduleFields); });
    });
  }

  /**
   * Carga administración catálogos.
   */
  function loadAdminCatalogs() {
    const region = document.getElementById("adminCatalogsContent");
    if (region) region.innerHTML = loadingHtml(3);
    return secureRpc("listarCatalogosAdminMotor", [], adminRpcModuleCode())
      .then(function(rows) {
        ADMIN_STATE.catalogs = rows || [];
        updateAdminCount("catalogs", ADMIN_STATE.catalogs.length);
        renderAdminCatalogs();
      })
      .catch(function(error) { renderAdminPermissionError("adminCatalogsContent", error); });
  }

  /**
   * Renderiza administración catálogos.
   */
  function renderAdminCatalogs() {
    const region = document.getElementById("adminCatalogsContent");
    if (!region) return;
    region.innerHTML = tableHtml([
      { key: "nombre", label: "Catálogo" },
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Descripción" },
      { key: "estado", label: "Estado", render: statusChip },
      { key: "actions", label: "", render: function(row) { return '<div class="table-actions"><button class="table-button" type="button" data-catalog-values="' + escapeHtml(row.codigo) + '" title="Valores"><span class="material-symbols-rounded">list_alt</span></button><button class="table-button" type="button" data-edit-catalog="' + escapeHtml(row.idCatalogo) + '" title="Editar"><span class="material-symbols-rounded">edit</span></button></div>'; } }
    ], ADMIN_STATE.catalogs);
    region.querySelectorAll("[data-edit-catalog]").forEach(function(button) {
      button.addEventListener("click", function() { openCatalogEditor(ADMIN_STATE.catalogs.find(function(item) { return item.idCatalogo === button.dataset.editCatalog; })); });
    });
    region.querySelectorAll("[data-catalog-values]").forEach(function(button) {
      button.addEventListener("click", function() { openCatalogValues(button.dataset.catalogValues); });
    });
  }

  /**
   * Carga administración recursos.
   */
  function loadAdminResources() {
    const region = document.getElementById("adminResourcesContent");
    if (region) region.innerHTML = loadingHtml(3);
    return secureRpc("listarRecursosVisualesAdminMotor", [], adminRpcModuleCode())
      .then(function(rows) {
        ADMIN_STATE.resources = rows || [];
        updateAdminCount("resources", ADMIN_STATE.resources.length);
        renderAdminResources();
      })
      .catch(function(error) { renderAdminPermissionError("adminResourcesContent", error); });
  }

  /**
   * Devuelve el diccionario funcional recibido en el contexto de la aplicación.
   */
  function getVisualResourceDictionary() {
    const interfaceConfig = APP_STATE &&
      APP_STATE.context &&
      APP_STATE.context.interfaz ?
      APP_STATE.context.interfaz : {};

    return Array.isArray(interfaceConfig.diccionarioRecursosVisuales) ?
      interfaceConfig.diccionarioRecursosVisuales.slice() : [];
  }

  /**
   * Busca la definición humana asociada a una clave técnica.
   */
  function findVisualResourceDefinition(key) {
    const normalizedKey = String(key || "").trim().toUpperCase();

    return getVisualResourceDictionary().find(function(item) {
      return String(item.clave || "").trim().toUpperCase() === normalizedKey;
    }) || null;
  }

  /**
   * Construye el diccionario visible de logos, íconos y banners.
   */
  function visualResourceDictionaryHtml() {
    const dictionary = getVisualResourceDictionary();

    if (!dictionary.length) {
      return "";
    }

    const items = dictionary.map(function(item) {
      const useStatus = String(item.estadoUso || "EN_USO").toUpperCase();
      const chipClass = useStatus === "PREPARADO" ?
        " visual-resource-use-chip--prepared" :
        useStatus === "COMPATIBILIDAD" ?
          " visual-resource-use-chip--compatibility" : "";
      const chipLabel = useStatus === "PREPARADO" ?
        "USO FUTURO" :
        useStatus === "COMPATIBILIDAD" ?
          "COMPATIBILIDAD" : "EN USO";

      return '<article class="visual-resource-dictionary-item">' +
        '<div class="visual-resource-dictionary-head">' +
          '<strong>' + escapeHtml(item.nombre || item.clave) + '</strong>' +
          '<span class="visual-resource-use-chip' + chipClass + '">' + chipLabel + '</span>' +
        '</div>' +
        '<span class="visual-resource-dictionary-code">' + escapeHtml(item.clave) + '</span>' +
        '<p>' + escapeHtml(item.descripcion || "") + '</p>' +
        '<div class="visual-resource-dictionary-meta">' +
          '<span><strong>Ubicación:</strong>' + escapeHtml(item.ubicacion || "Sin ubicación definida") + '</span>' +
          '<span><strong>Formato:</strong>' + escapeHtml(item.formato || "Imagen compatible") + '</span>' +
          '<span><strong>Proporción:</strong>' + escapeHtml(item.proporcion || "Según diseño") + '</span>' +
        '</div>' +
      '</article>';
    }).join("");

    return '<details class="visual-resource-dictionary">' +
      '<summary>' +
        '<span class="material-symbols-rounded" aria-hidden="true">dictionary</span>' +
        '<span class="visual-resource-dictionary-summary">' +
          '<strong>Diccionario de recursos visuales</strong>' +
          '<small>Consulta qué imagen, ícono o banner representa cada nombre funcional.</small>' +
        '</span>' +
        '<span class="material-symbols-rounded visual-resource-dictionary-chevron" aria-hidden="true">expand_more</span>' +
      '</summary>' +
      '<div class="visual-resource-dictionary-grid">' + items + '</div>' +
    '</details>';
  }

  /**
   * Renderiza administración recursos.
   */
  function renderAdminResources() {
    const region = document.getElementById("adminResourcesContent");
    if (!region) return;

    region.innerHTML = visualResourceDictionaryHtml() + tableHtml([
      {
        key: "nombre",
        label: "Recurso",
        render: function(row) {
          const definition = findVisualResourceDefinition(row.clave);
          return '<div class="resource-reference">' +
            '<strong>' + escapeHtml(row.nombre || (definition && definition.nombre) || row.clave) + '</strong>' +
            '<small>' + escapeHtml(definition ? definition.nombre : "Recurso personalizado") + '</small>' +
          '</div>';
        }
      },
      { key: "clave", label: "Referencia técnica" },
      {
        key: "ubicacion",
        label: "Ubicación",
        render: function(row) {
          const definition = findVisualResourceDefinition(row.clave);
          return escapeHtml(definition ? definition.ubicacion : "Uso personalizado");
        }
      },
      { key: "tipo", label: "Tipo" },
      { key: "version", label: "Versión" },
      { key: "estado", label: "Estado", render: statusChip },
      { key: "actions", label: "", render: function(row) { return '<div class="table-actions"><button class="table-button" type="button" data-edit-resource="' + escapeHtml(row.idRecurso) + '"><span class="material-symbols-rounded">edit</span></button></div>'; } }
    ], ADMIN_STATE.resources);

    region.querySelectorAll("[data-edit-resource]").forEach(function(button) {
      button.addEventListener("click", function() {
        openResourceEditor(ADMIN_STATE.resources.find(function(item) {
          return item.idRecurso === button.dataset.editResource;
        }));
      });
    });
  }

  /**
   * Construye las opciones del selector a partir del diccionario funcional.
   */
  function visualResourceOptionsHtml(selectedKey) {
    const normalizedSelected = String(selectedKey || "").trim().toUpperCase();
    const dictionary = getVisualResourceDictionary();
    const selectedExists = dictionary.some(function(item) {
      return String(item.clave || "").toUpperCase() === normalizedSelected;
    });
    let html = '<option value="">Selecciona el uso del recurso</option>';

    html += dictionary.map(function(item) {
      const key = String(item.clave || "").toUpperCase();
      return '<option value="' + escapeHtml(key) + '" ' +
        (key === normalizedSelected ? "selected" : "") + '>' +
        escapeHtml(item.nombre || key) + ' — ' + escapeHtml(key) +
      '</option>';
    }).join("");

    if (normalizedSelected && !selectedExists) {
      html += '<option value="' + escapeHtml(normalizedSelected) + '" selected>' +
        escapeHtml(resourceCustomLabel(normalizedSelected)) +
      '</option>';
    }

    html += '<option value="__CUSTOM__">Otro recurso personalizado</option>';
    return html;
  }

  function resourceCustomLabel(key) {
    return "Recurso personalizado — " + String(key || "").toUpperCase();
  }

  /**
   * Obtiene la clave definitiva seleccionada en el editor.
   */
  function getResourceEditorKey(form) {
    if (!form) return "";

    const selected = String(
      form.elements.claveSeleccionada ?
        form.elements.claveSeleccionada.value : ""
    ).trim().toUpperCase();

    if (selected !== "__CUSTOM__") {
      return selected.replace(/[^A-Z0-9_]/g, "_");
    }

    return String(
      form.elements.clavePersonalizada ?
        form.elements.clavePersonalizada.value : ""
    ).trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  }

  /**
   * Actualiza la explicación, el tipo y la clave personalizada del editor.
   */
  function updateResourceEditorReference(resource) {
    const form = document.getElementById("resourceEditorForm");
    const reference = document.getElementById("resourceEditorReference");
    const customField = document.getElementById("resourceCustomKeyField");
    const customInput = form && form.elements.clavePersonalizada;
    const selected = form && form.elements.claveSeleccionada ?
      String(form.elements.claveSeleccionada.value || "").toUpperCase() : "";
    const isCustom = selected === "__CUSTOM__";

    if (customField) customField.hidden = !isCustom;
    if (customInput) customInput.required = isCustom;

    const definition = isCustom ? null : findVisualResourceDefinition(selected);

    if (reference) {
      reference.innerHTML = definition ?
        '<strong>' + escapeHtml(definition.nombre) + '</strong>' +
        '<span>' + escapeHtml(definition.descripcion) + '</span>' +
        '<span><b>Ubicación:</b> ' + escapeHtml(definition.ubicacion) + '</span>' +
        '<span><b>Formato:</b> ' + escapeHtml(definition.formato) + ' · ' +
          escapeHtml(definition.proporcion) + '</span>' :
        '<strong>Recurso personalizado</strong>' +
        '<span>Utiliza esta opción únicamente cuando el recurso no figure en el diccionario.</span>';
    }

    if (definition && form && form.elements.tipo) {
      form.elements.tipo.value = definition.tipo || "IMAGEN";
    }

    if (
      definition &&
      form &&
      form.elements.nombre &&
      (
        !resource ||
        !resource.idRecurso ||
        !String(form.elements.nombre.value || "").trim()
      )
    ) {
      form.elements.nombre.value = definition.nombre || "";
    }
  }

  /**
   * Abre recurso editor.
   */
  function openResourceEditor(resource) {
    resource = resource || {};
    const dictionaryDefinition = findVisualResourceDefinition(resource.clave);
    const initialCustom = resource.clave && !dictionaryDefinition;

    openSideSheet({
      eyebrow: resource.idRecurso ? "EDITAR RECURSO" : "NUEVO RECURSO",
      title: resource.nombre || (dictionaryDefinition && dictionaryDefinition.nombre) || "Recurso visual",
      body: '<form id="resourceEditorForm" class="form-grid">' +
        hiddenInput("idRecurso", resource.idRecurso) +
        hiddenInput("idArchivo", resource.idArchivo) +
        '<label class="field is-required"><span>Uso del recurso</span>' +
          '<select id="resourceKeySelect" name="claveSeleccionada" required>' +
            visualResourceOptionsHtml(resource.clave) +
          '</select>' +
          '<small>Selecciona el nombre funcional; la clave técnica se asignará automáticamente.</small>' +
        '</label>' +
        '<label id="resourceCustomKeyField" class="field is-required" ' +
          (initialCustom ? "" : "hidden") + '>' +
          '<span>Clave personalizada</span>' +
          '<input name="clavePersonalizada" value="' +
            escapeHtml(initialCustom ? resource.clave : "") +
            '" pattern="[A-Za-z0-9_]+" ' + (initialCustom ? "required" : "") + '>' +
          '<small>Usa mayúsculas, números y guion bajo.</small>' +
        '</label>' +
        fieldInput("nombre", "Nombre", resource.nombre || (dictionaryDefinition && dictionaryDefinition.nombre), true) +
        '<label class="field"><span>Tipo</span><select name="tipo">' +
          '<option value="IMAGEN">Imagen</option>' +
          '<option value="ICONO">Ícono</option>' +
          '<option value="BANNER">Banner</option>' +
        '</select></label>' +
        statusSelect("estado", resource.estado || "ACTIVO") +
        '<div id="resourceEditorReference" class="resource-editor-reference"></div>' +
        '<label class="field field--full"><span>Archivo de imagen</span>' +
          '<input id="resourceFileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">' +
          '<small>Máximo 2 MB. El diccionario indica el formato y la proporción recomendados.</small>' +
        '</label>' +
        '<div id="resourcePreview" class="field field--full"></div>' +
      '</form>',
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button>' +
        '<button id="saveResourceButton" class="button button--primary" type="button">Guardar recurso</button>'
    });

    bindSideSheetCloseButtons();

    const form = document.getElementById("resourceEditorForm");
    if (form && form.elements.tipo) {
      form.elements.tipo.value = resource.tipo ||
        (dictionaryDefinition && dictionaryDefinition.tipo) || "IMAGEN";
    }

    on("resourceKeySelect", "change", function() {
      updateResourceEditorReference(resource);
    });
    updateResourceEditorReference(resource);

    const fileInput = document.getElementById("resourceFileInput");
    fileInput.addEventListener("change", function() {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast("Archivo demasiado grande", "El tamaño máximo es 2 MB.", true);
        fileInput.value = "";
        return;
      }

      const key = getResourceEditorKey(form);

      if (key === "FAVICON_APP" && file.type !== "image/png") {
        toast("Formato no permitido", "El favicon debe cargarse en formato PNG.", true);
        fileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function() {
        document.getElementById("resourcePreview").innerHTML =
          '<img src="' + reader.result + '" alt="Vista previa" ' +
          'style="max-width:180px;max-height:110px;object-fit:contain;' +
          'border:1px solid var(--border);border-radius:12px;padding:8px">';
      };
      reader.readAsDataURL(file);
    });

    on("saveResourceButton", "click", function() {
      saveResourceEditor(resource);
    });
  }

  /**
   * Guarda recurso editor.
   */
  function saveResourceEditor(resource) {
    const form = document.getElementById("resourceEditorForm");
    if (!form.reportValidity()) return;

    const data = formDataObject(form);
    data.clave = getResourceEditorKey(form);
    delete data.claveSeleccionada;
    delete data.clavePersonalizada;

    if (!data.clave) {
      toast("Uso requerido", "Selecciona el uso del recurso o ingresa una clave personalizada.", true);
      return;
    }

    const file = document.getElementById("resourceFileInput").files[0];
    const send = function() {
      setLoader(true, "Guardando recurso visual…");
      secureRpc("guardarRecursoVisualAdminMotor", [data], adminRpcModuleCode())
        .then(function() { closeSideSheet(); setLoader(false); toast("Recurso guardado", "La nueva versión quedó registrada."); return loadAdminResources(); })
        .catch(function(error) { setLoader(false); toast("No fue posible guardar", error.message, true); });
    };
    if (!file) { send(); return; }
    const reader = new FileReader();
    reader.onload = function() { data.dataUrl = reader.result; send(); };
    reader.onerror = function() { toast("No fue posible leer el archivo", "Selecciona nuevamente la imagen.", true); };
    reader.readAsDataURL(file);
  }

  /**
   * Carga administración settings.
   */
  function loadAdminSettings() {
    const region = document.getElementById("adminSettingsContent");
    if (region) region.innerHTML = loadingHtml(3);
    return secureRpc("listarParametrosAdminMotor", [], adminRpcModuleCode())
      .then(function(rows) {
        ADMIN_STATE.settings = rows || [];
        renderAdminSettings();
      })
      .catch(function(error) { renderAdminPermissionError("adminSettingsContent", error); });
  }

  /**
   * Renderiza administración settings.
   */
  function renderAdminSettings() {
    const region = document.getElementById("adminSettingsContent");
    if (!region) return;

    const isSuperadmin = String(APP_STATE.context && APP_STATE.context.usuario &&
      APP_STATE.context.usuario.rol || "").toUpperCase() === "SUPERADMIN";
    const settings = (Array.isArray(ADMIN_STATE.settings) ? ADMIN_STATE.settings : []).filter(function(setting) {
      return isSuperadmin || ["APP_REFRESH_ENABLED", "APP_REFRESH_SECONDS"].indexOf(setting.clave) === -1;
    }).slice().sort(function(a, b) {
      const order = {
        APP_REFRESH_ENABLED: 1,
        APP_REFRESH_SECONDS: 2
      };
      return (order[a.clave] || 100) - (order[b.clave] || 100) ||
        String(a.clave || "").localeCompare(String(b.clave || ""));
    });

    region.innerHTML = settings.map(function(setting) {
      if (setting.clave === "APP_REFRESH_ENABLED") {
        const enabled = ["TRUE", "SI", "1", "ACTIVO"]
          .indexOf(String(setting.valor || "").trim().toUpperCase()) !== -1;
        return '<article class="setting-card">' +
          '<div><strong>Actualización automática</strong>' +
          '<p>' + escapeHtml(setting.descripcion || "") + '</p>' +
          '<small data-refresh-setting-label>' +
          (enabled ? "Activada: los cambios de otros usuarios se consultan según el intervalo configurado." :
            "Desactivada: los datos solo se consultan al utilizar el botón Actualizar.") +
          '</small></div>' +
          '<div class="field"><span>Estado</span><span style="display:flex;align-items:center;gap:10px;min-height:40px">' +
          '<label class="switch"><input type="checkbox" data-setting-key="APP_REFRESH_ENABLED" ' +
          (enabled ? "checked" : "") + ' ' + (setting.editable ? "" : "disabled") +
          '><span class="switch-track"></span></label>' +
          '<strong data-refresh-setting-status>' + (enabled ? "Activada" : "Desactivada") + '</strong>' +
          '</span></div>' +
          (setting.editable ? '<button class="button button--secondary" type="button" data-save-setting="APP_REFRESH_ENABLED">Guardar</button>' : "") +
          '</article>';
      }

      const inputType = setting.tipo === "NUMBER" ? "number" :
        (setting.tipo === "COLOR" ? "color" : "text");
      const minimum = setting.clave === "APP_REFRESH_SECONDS" ? ' min="60" step="1"' : "";
      return '<article class="setting-card"><div><strong>' + escapeHtml(setting.clave) + '</strong><p>' + escapeHtml(setting.descripcion || "") + '</p></div>' +
        '<label class="field"><span>Valor</span><input type="' + inputType + '" data-setting-key="' + escapeHtml(setting.clave) + '" value="' + escapeHtml(setting.valor) + '"' + minimum + ' ' + (setting.editable ? "" : "disabled") + '></label>' +
        (setting.editable ? '<button class="button button--secondary" type="button" data-save-setting="' + escapeHtml(setting.clave) + '">Guardar</button>' : "") +
        "</article>";
    }).join("");

    const refreshToggle = region.querySelector('[data-setting-key="APP_REFRESH_ENABLED"]');
    if (refreshToggle) {
      refreshToggle.addEventListener("change", function() {
        const enabled = refreshToggle.checked;
        const status = region.querySelector("[data-refresh-setting-status]");
        const label = region.querySelector("[data-refresh-setting-label]");
        if (status) status.textContent = enabled ? "Activada" : "Desactivada";
        if (label) label.textContent = enabled ?
          "Activada: los cambios de otros usuarios se consultan según el intervalo configurado." :
          "Desactivada: los datos solo se consultan al utilizar el botón Actualizar.";
      });
    }

    region.querySelectorAll("[data-save-setting]").forEach(function(button) {
      button.addEventListener("click", function() {
        const setting = ADMIN_STATE.settings.find(function(item) {
          return item.clave === button.dataset.saveSetting;
        });
        const input = region.querySelector('[data-setting-key="' + CSS.escape(setting.clave) + '"]');
        const value = setting.clave === "APP_REFRESH_ENABLED" ?
          (input.checked ? "TRUE" : "FALSE") : input.value;
        saveSetting(Object.assign({}, setting, { valor: value }));
      });
    });
  }

  /**
   * Completa permiso rol selector.
   */
  function populatePermissionRoleSelector() {
    const select = document.getElementById("adminPermissionRole");
    if (!select) return;
    const rolesDelegables = ADMIN_STATE.roles.filter(function(role) {
      return String(role.codigo || "").toUpperCase() !== "SUPERADMIN" &&
        String(role.estado || "").toUpperCase() === "ACTIVO";
    });
    select.innerHTML = rolesDelegables.map(function(role) {
      return '<option value="' + escapeHtml(role.codigo) + '">' +
        escapeHtml(role.nombre || "Rol sin nombre") + "</option>";
    }).join("");
    if (rolesDelegables.length) {
      select.value = rolesDelegables[0].codigo;
      loadPermissionMatrix(select.value);
    } else {
      ADMIN_STATE.permissionMatrix = null;
      const region = document.getElementById("adminPermissionsContent");
      if (region) region.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">shield</span><strong>No hay roles delegables</strong><p>SUPERADMIN tiene acceso total implícito y no se administra desde esta matriz.</p></div>';
    }
  }

  /**
   * Carga permiso matriz.
   */

  function snapshotPermissionMatrix(matrix) {
    const snapshot = {};
    (matrix && matrix.modulos || []).forEach(function(module) {
      (module.recursos || []).forEach(function(resource) {
        snapshot[module.codigo + "|" + resource.codigo] = {
          permitido: resource.permitido === true,
          alcance: String(resource.alcance || "PROPIO").toUpperCase()
        };
      });
    });
    ADMIN_STATE.permissionOriginal = snapshot;
  }

  function loadPermissionMatrix(roleCode) {
    const region = document.getElementById("adminPermissionsContent");
    if (!region) return;
    if (!roleCode) {
      ADMIN_STATE.permissionMatrix = null;
      ADMIN_STATE.permissionOriginal = {};
      region.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">shield</span><strong>Selecciona un rol</strong><p>La matriz mostrará primero Visualizar módulo y luego sus accesos.</p></div>';
      return;
    }

    region.innerHTML = loadingHtml(5);
    secureRpc(
      "obtenerMatrizPermisosAdminMotor",
      [roleCode],
      adminRpcModuleCode()
    ).then(function(matrix) {
      ADMIN_STATE.permissionMatrix = matrix;
      snapshotPermissionMatrix(matrix);
      renderPermissionMatrix();
    }).catch(function(error) {
      ADMIN_STATE.permissionOriginal = {};
      renderAdminPermissionError("adminPermissionsContent", error);
    });
  }

  /**
   * Renderiza permiso matriz.
   */
  function renderPermissionMatrix() {
    const region = document.getElementById("adminPermissionsContent");
    const matrix = ADMIN_STATE.permissionMatrix;
    if (!region || !matrix) return;
    region.innerHTML = (matrix.modulos || []).map(function(module) {
      const resources = (module.recursos || []).slice().sort(function(a, b) {
        if (a.codigo === "VISUALIZAR_MODULO") return -1;
        if (b.codigo === "VISUALIZAR_MODULO") return 1;
        return a.orden - b.orden;
      });
      return '<section class="permission-module"><header class="permission-module-header"><span class="material-symbols-rounded">dataset</span><strong>' + escapeHtml(module.codigo) + '</strong></header><div class="permission-list">' +
        resources.map(function(resource) {
          const isModule = resource.codigo === "VISUALIZAR_MODULO";
          return '<div class="permission-row" data-permission-module="' + escapeHtml(module.codigo) + '" data-permission-resource="' + escapeHtml(resource.codigo) + '">' +
            '<div class="permission-resource"><strong>' + escapeHtml(resource.nombre) + '</strong><small>' + escapeHtml(isModule ? "Permiso principal del módulo" : resource.tipo) + "</small></div>" +
            '<label class="switch"><input type="checkbox" data-permission-enabled ' + (resource.permitido ? "checked" : "") + '><span class="switch-track"></span></label>' +
            '<select data-permission-scope ' + (!resource.permitido ? "disabled" : "") + '>' + (matrix.alcancesDisponibles || ["PROPIO", "PROVEEDOR", "GRUPO", "ASIGNADOS", "GLOBAL"]).map(function(scope) { return '<option value="' + scope + '" ' + (resource.alcance === scope ? "selected" : "") + '>' + scope + "</option>"; }).join("") + "</select></div>";
        }).join("") + "</div></section>";
    }).join("");

    region.querySelectorAll("[data-permission-enabled]").forEach(function(input) {
      input.addEventListener("change", function() {
        const row = input.closest(".permission-row");
        row.querySelector("[data-permission-scope]").disabled = !input.checked;
        if (row.dataset.permissionResource === "VISUALIZAR_MODULO" && !input.checked) {
          const moduleCode = row.dataset.permissionModule;
          region.querySelectorAll('[data-permission-module="' + CSS.escape(moduleCode) + '"]').forEach(function(childRow) {
            if (childRow === row) return;
            childRow.querySelector("[data-permission-enabled]").checked = false;
            childRow.querySelector("[data-permission-scope]").disabled = true;
          });
        }
      });
    });
  }

  /**
   * Guarda permiso matriz.
   */
  function savePermissionMatrix() {
    if (!ensureWritableAdministrationView()) return;
    if (!hasActivePermission("ADMIN_PERMISOS", "EDITAR_PERMISOS")) {
      toast(
        "Acceso denegado",
        "No tienes permiso para modificar la matriz.",
        true
      );
      return;
    }

    const select = document.getElementById("adminPermissionRole");
    const role = select && select.value;
    const region = document.getElementById("adminPermissionsContent");
    if (!role || !region) {
      toast(
        "Selecciona un rol",
        "Debes elegir el rol que deseas configurar.",
        true
      );
      return;
    }

    const changes = Array.from(
      region.querySelectorAll(".permission-row")
    ).map(function(row) {
      const current = {
        modulo: row.dataset.permissionModule,
        recurso: row.dataset.permissionResource,
        permitido: row.querySelector("[data-permission-enabled]").checked,
        alcance: row.querySelector("[data-permission-scope]").value
      };
      const original = ADMIN_STATE.permissionOriginal[
        current.modulo + "|" + current.recurso
      ] || {
        permitido: false,
        alcance: "PROPIO"
      };
      return (
        original.permitido !== current.permitido ||
        original.alcance !== current.alcance
      ) ? current : null;
    }).filter(Boolean);

    if (!changes.length) {
      toast(
        "Sin cambios",
        "La matriz no contiene modificaciones pendientes."
      );
      return;
    }

    setLoader(
      true,
      "Guardando " + changes.length +
        (changes.length === 1 ? " permiso…" : " permisos…")
    );
    secureRpc(
      "guardarMatrizPermisosAdminMotor",
      [{ rol: role, permisos: changes }],
      adminRpcModuleCode()
    ).then(function(matrix) {
      ADMIN_STATE.permissionMatrix = matrix;
      snapshotPermissionMatrix(matrix);
      renderPermissionMatrix();
      setLoader(false);
      toast(
        "Permisos guardados",
        "Se aplicaron únicamente los cambios de la matriz."
      );
      APP_STATE.rolePreviewCache = {};
    }).catch(function(error) {
      setLoader(false);
      toast("No fue posible guardar", error.message, true);
    });
  }

  /**
   * Abre el editor de usuario con documentos y asignaciones controladas.
   */

  function openUserReadonlyDetail(user) {
    if (!user) return;
    const rows = [
      ["Nombre", user.nombre || "—"],
      ["Correo", user.correo || "—"],
      ["Documento", [user.tipoDocumento, user.numeroDocumento].filter(Boolean).join(" ") || "—"],
      ["Rol", user.nombreRol || "—"],
      ["Proveedor", user.nombreComercialProveedor || user.razonSocialProveedor || user.nombreProveedor || "—"],
      ["Oficina", user.nombreOficina || "—"],
      ["Grupo", user.nombreGrupo || "—"],
      ["Estado", user.estado || "—"]
    ];
    openModal({
      eyebrow: "DETALLE DE USUARIO",
      title: user.nombre || "Usuario",
      body: '<div class="detail-list">' + rows.map(function(row) {
        return '<div><span>' + escapeHtml(row[0]) + '</span><strong>' +
          escapeHtml(row[1]) + "</strong></div>";
      }).join("") + "</div>",
      footer: '<button class="button button--primary" type="button" data-modal-close-button>Cerrar</button>'
    });
    const closeButton = document.querySelector("[data-modal-close-button]");
    if (closeButton) closeButton.addEventListener("click", closeModal);
  }

  function openUserEditor(user) {
    user = user || {};
    const requiredPermission = user.idUsuario ? "EDITAR" : "CREAR";
    if (!canAdministerUsers(requiredPermission) || !canAdministerUsers("VER_DETALLE")) {
      toast("Acceso denegado", "No tienes los permisos requeridos para esta operación.", true);
      return;
    }
    if (!ensureWritableAdministrationView()) return;

    if (!ADMIN_STATE.assignmentStructureLoaded) {
      setLoader(true, "Cargando proveedores, oficinas y grupos…");
      loadAdminAssignmentStructure().then(function() {
        setLoader(false);
        openUserEditor(user);
      }).catch(function(error) {
        setLoader(false);
        toast("No fue posible abrir el usuario", errorMessage(error), true);
      });
      return;
    }

    const roles = ADMIN_STATE.roles.map(function(role) {
      return '<option value="' + escapeHtml(role.codigo) + '" ' +
        (user.rol === role.codigo ? "selected" : "") + '>' +
        escapeHtml(role.nombre || role.codigo) + "</option>";
    }).join("");
    const documentTypes = ADMIN_STATE.documentTypes.map(function(type) {
      return '<option value="' + escapeHtml(type.codigo) + '">' +
        escapeHtml(type.nombre || type.codigo) + "</option>";
    }).join("");
    const providers = buildProviderOptions(user.idProveedor);

    openSideSheet({
      eyebrow: user.idUsuario ? "EDITAR USUARIO" : "NUEVO USUARIO",
      title: user.nombre || "Registrar usuario",
      body: '<form id="userEditorForm" class="form-grid">' +
        hiddenInput("idUsuario", user.idUsuario) +
        '<label class="field is-required"><span>Tipo de documento</span>' +
          '<input id="userDocumentType" name="tipoDocumento" list="userDocumentTypes" value="' +
            escapeHtml(user.tipoDocumento || "") + '" required placeholder="Escribe o selecciona un tipo">' +
          '<datalist id="userDocumentTypes">' + documentTypes + '</datalist></label>' +
        '<label class="field is-required"><span>Número de documento</span>' +
          '<input id="userDocumentNumber" name="numeroDocumento" value="' +
            escapeHtml(user.numeroDocumento || "") + '" required autocomplete="off" disabled>' +
          '<small id="userDocumentHelp" class="field-help">Selecciona primero el tipo de documento.</small>' +
        '</label>' +
        fieldInput("nombre", "Nombre completo", user.nombre, true) +
        fieldInput("correo", "Correo", user.correo, true, "email") +
        fieldInput("telefono", "Teléfono", user.telefono) +
        (user.idUsuario ? '<label class="field field--full"><span>Nueva contraseña <small>(opcional)</small></span><input name="nuevaContrasena" type="password" minlength="8" autocomplete="new-password"><small class="field-help">Solo SUPERADMIN puede cambiarla. El usuario podrá cambiarla nuevamente desde su perfil.</small></label>' : '') +
        '<label class="field is-required"><span>Rol</span><select id="userRoleSelect" name="rol" required>' +
          '<option value="">Selecciona</option>' + roles + "</select></label>" +
        '<label id="userProviderField" class="field"><span>Proveedor principal</span>' +
          '<select id="userProviderSelect" name="idProveedor"><option value="">Sin proveedor</option>' +
            providers + '</select><small class="field-help">Es obligatorio para roles configurables. No otorga acceso por sí solo: los permisos y alcances determinan la visibilidad.</small></label>' +
        '<label id="userOfficeField" class="field"><span>Oficina</span>' +
          '<select id="userOfficeSelect" name="idOficina"><option value="">Selecciona primero un proveedor</option></select></label>' +
        '<label id="userGroupField" class="field"><span>Grupo</span>' +
          '<select id="userGroupSelect" name="idGrupo"><option value="">Sin grupo</option></select></label>' +
        statusSelect("estado", user.estado || "ACTIVO") +
        '<p class="assignment-note">La asignación al proveedor se conserva internamente aunque cambien la razón social o el nombre comercial; oficina y grupo son opcionales.</p>' +
        "</form>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveUserButton" class="button button--primary" type="button">Guardar usuario</button>'
    });

    bindSideSheetCloseButtons();
    bindUserEditorDependencies(user);
    on("saveUserButton", "click", saveUserEditor);
  }

  /**
   * Guarda el usuario después de validar el documento y las relaciones.
   */
  function saveUserEditor() {
    if (!ensureWritableAdministrationView()) return;
    const form = document.getElementById("userEditorForm");
    if (!form) return;

    const idUsuario = String(form.elements.idUsuario && form.elements.idUsuario.value || "");
    if (!canAdministerUsers(idUsuario ? "EDITAR" : "CREAR")) {
      toast("Acceso denegado", "No tienes permiso para guardar este usuario.", true);
      return;
    }

    validateUserDocumentField();
    updateUserAssignmentRequirements();

    if (!form.reportValidity()) return;
    const data = formDataObject(form);
    setLoader(true, "Guardando usuario…");
    secureRpc("guardarUsuarioAdminMotor", [data], adminRpcModuleCode())
      .then(function(result) {
        closeSideSheet();
        setLoader(false);
        toast(
          idUsuario ? "Usuario actualizado" : "Invitación enviada",
          result && result.mensaje || (idUsuario ?
            "Los datos y asignaciones fueron actualizados." :
            "El usuario recibirá un correo para definir su contraseña.")
        );
        const search = document.getElementById("adminUsersSearch");
        return loadAdminUsers(search ? search.value : "", true);
      })
      .catch(function(error) {
        setLoader(false);
        toast("No fue posible guardar", error.message, true);
      });
  }

  /**
   * Abre rol editor.
   */
  function openRoleEditor(role) {
    role = role || {};
    const isExisting = Boolean(role.idRol);
    const isProtected = role.protegido === true || role.sistema === true;
    const idField = hiddenInput("idRol", role.idRol) + (isExisting ?
      '<label class="field"><span>ID del rol</span><input value="' + escapeHtml(role.idRol) + '" readonly></label>' : "");
    const codeField = '<label class="field is-required"><span>Código técnico</span><input id="roleCodeInput" name="codigo" value="' +
      escapeHtml(role.codigo || "") + '" required maxlength="60" pattern="[A-Za-z][A-Za-z0-9_]{1,59}" ' +
      (isExisting ? "readonly" : "") + ' autocomplete="off"><small class="field-help">' +
      (isExisting ? "El código técnico es inmutable después de crear el rol." :
        "Usa letras, números y guion bajo. Se guardará en mayúsculas y no podrá modificarse después.") +
      "</small></label>";
    const protectedNotice = isProtected ?
      '<div class="assignment-note field--full"><strong>Rol protegido</strong><br>SUPERADMIN y ADMIN no pueden renombrarse, inactivarse ni modificarse desde este formulario.</div>' : "";
    const nameField = '<label class="field is-required"><span>Nombre visible</span><input name="nombre" value="' +
      escapeHtml(role.nombre || "") + '" required maxlength="120" ' + (isProtected ? "readonly" : "") + "></label>";
    const descriptionField = '<label class="field field--full"><span>Descripción</span><textarea name="descripcion" maxlength="500" ' +
      (isProtected ? "readonly" : "") + '>' + escapeHtml(role.descripcion || "") + "</textarea></label>";
    const levelField = '<label class="field is-required"><span>Nivel administrativo</span><input name="nivel" type="number" min="1" max="999" value="' +
      escapeHtml(role.nivel || 50) + '" required ' + (isProtected ? "readonly" : "") +
      '><small class="field-help">Controla qué roles puede administrar o asignar un operador; no representa la futura jerarquía comercial.</small></label>';
    const stateField = isProtected ?
      '<label class="field"><span>Estado</span><input value="ACTIVO" readonly><input type="hidden" name="estado" value="ACTIVO"></label>' :
      statusSelect("estado", role.estado || "ACTIVO");

    openSideSheet({
      eyebrow: isExisting ? (isProtected ? "ROL PROTEGIDO" : "EDITAR ROL") : "NUEVO ROL",
      title: role.nombre || "Configurar rol",
      body: '<form id="roleEditorForm" class="form-grid">' + idField +
        protectedNotice + codeField + nameField + descriptionField + levelField + stateField + "</form>",
      footer: isProtected ?
        '<button class="button button--primary" type="button" data-sheet-close>Cerrar</button>' :
        '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveRoleButton" class="button button--primary" type="button">Guardar rol</button>'
    });
    bindSideSheetCloseButtons();
    if (isProtected) return;

    const codeInput = document.getElementById("roleCodeInput");
    if (codeInput && !isExisting) {
      codeInput.addEventListener("input", function() {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
          .replace(/_+/g, "_").replace(/^_+/, "");
      });
    }
    on("saveRoleButton", "click", function() {
      const form = document.getElementById("roleEditorForm");
      if (!form || !form.reportValidity()) return;
      setLoader(true, "Guardando rol…");
      secureRpc("guardarRolAdminMotor", [formDataObject(form)], adminRpcModuleCode())
        .then(function() {
          closeSideSheet();
          setLoader(false);
          toast("Rol guardado", "El rol está disponible para configurar permisos y alcances.");
          return loadAdminRoles();
        })
        .then(populatePermissionRoleSelector)
        .catch(function(error) {
          setLoader(false);
          toast("No fue posible guardar", error.message, true);
        });
    });
  }

  /**
   * Abre módulo editor.
   */
  function openModuleEditor(module) {
    module = module || {};
    openSideSheet({
      eyebrow: module.idModulo ? "EDITAR MÓDULO" : "NUEVO MÓDULO",
      title: module.nombre || "Constructor de módulo",
      body: '<form id="moduleEditorForm" class="form-grid">' + hiddenInput("idModulo", module.idModulo) +
        fieldInput("codigo", "Código técnico", module.codigo, true) + fieldInput("nombre", "Nombre", module.nombre, true) +
        '<label class="field field--full"><span>Descripción</span><textarea name="descripcion">' + escapeHtml(module.descripcion || "") + "</textarea></label>" +
        fieldInput("icono", "Ícono Material Symbols", module.icono || "grid_view") + fieldInput("grupoMenu", "Grupo del menú", module.grupoMenu || "General") +
        fieldInput("orden", "Orden", module.orden || 999, true, "number") +
        '<label class="field"><span>Tipo de vista</span><select name="tipoVista"><option value="DINAMICA" ' + (module.tipoVista === "DINAMICA" ? "selected" : "") + '>Dinámica</option><option value="ESPECIALIZADA" ' + (module.tipoVista === "ESPECIALIZADA" ? "selected" : "") + ">Especializada</option></select></label>" +
        '<label class="field"><span>Base</span><select name="baseAlias"><option value="OPERATION" ' + (module.baseAlias === "OPERATION" ? "selected" : "") + '>Operación</option><option value="CONFIG" ' + (module.baseAlias === "CONFIG" ? "selected" : "") + '>Configuración</option><option value="SECURITY" ' + (module.baseAlias === "SECURITY" ? "selected" : "") + ">Seguridad</option></select></label>" +
        fieldInput("hojaDatos", "Hoja de datos", module.hojaDatos) + fieldInput("campoClave", "Campo clave", module.campoClave || "ID") +
        fieldInput("campoEstado", "Campo estado", module.campoEstado || "ESTADO") +
        fieldInput("campoUsuario", "Campo ID usuario", module.campoUsuario) + fieldInput("campoProveedor", "Campo ID proveedor", module.campoProveedor) +
        fieldInput("campoGrupo", "Campo ID grupo", module.campoGrupo) + statusSelect("estado", module.estado || "ACTIVO") +
        '<label class="checkbox-field field--full"><input type="checkbox" name="administrable" ' + (module.administrable !== false ? "checked" : "") + '> Permitir administración dinámica</label></form>',
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveModuleButton" class="button button--primary" type="button">Guardar módulo</button>'
    });
    bindSideSheetCloseButtons();
    on("saveModuleButton", "click", function() {
      const form = document.getElementById("moduleEditorForm"); if (!form.reportValidity()) return;
      const data = formDataObject(form); data.administrable = form.elements.administrable.checked;
      setLoader(true, "Guardando módulo…");
      secureRpc("guardarModuloAdminMotor", [data], adminRpcModuleCode())
        .then(function() { closeSideSheet(); setLoader(false); toast("Módulo guardado", "La navegación y sus permisos fueron sincronizados."); return loadAdminModules(); })
        .catch(function(error) { setLoader(false); toast("No fue posible guardar", error.message, true); });
    });
  }

  /**
   * Abre módulo campos.
   */
  function openModuleFields(moduleCode) {
    setLoader(true, "Cargando campos…");
    secureRpc("listarCamposModuloAdminMotor", [moduleCode], adminRpcModuleCode())
      .then(function(fields) {
        setLoader(false);
        openSideSheet({
          eyebrow: "CAMPOS DEL MÓDULO",
          title: moduleCode,
          body: '<div id="moduleFieldsList">' + tableHtml([
            { key: "etiqueta", label: "Campo" }, { key: "campo", label: "Técnico" }, { key: "tipo", label: "Tipo" },
            { key: "actions", label: "", render: function(row) { return '<button class="table-button" type="button" data-edit-field="' + escapeHtml(row.idCampo) + '"><span class="material-symbols-rounded">edit</span></button>'; } }
          ], fields || []) + "</div>",
          footer: '<button class="button button--ghost" type="button" data-sheet-close>Cerrar</button><button id="newFieldButton" class="button button--primary" type="button">Nuevo campo</button>'
        });
        bindSideSheetCloseButtons();
        document.querySelectorAll("[data-edit-field]").forEach(function(button) { button.addEventListener("click", function() { openFieldEditor(moduleCode, (fields || []).find(function(item) { return item.idCampo === button.dataset.editField; })); }); });
        on("newFieldButton", "click", function() { openFieldEditor(moduleCode, null); });
      })
      .catch(function(error) { setLoader(false); toast("No fue posible cargar", error.message, true); });
  }

  /**
   * Abre campo editor.
   */
  function openFieldEditor(moduleCode, field) {
    field = field || {};
    openModal({
      eyebrow: "CONSTRUCTOR DE CAMPOS",
      title: field.etiqueta || "Nuevo campo",
      body: '<form id="fieldEditorForm" class="form-grid">' + hiddenInput("idCampo", field.idCampo) +
        fieldInput("campo", "Nombre técnico", field.campo, true) + fieldInput("etiqueta", "Etiqueta", field.etiqueta, true) +
        '<label class="field"><span>Tipo</span><select name="tipo">' + ["TEXT", "NUMBER", "DATE", "DATETIME", "SELECT", "TEXTAREA", "CHECKBOX", "EMAIL", "PHONE"].map(function(type) { return '<option value="' + type + '" ' + (field.tipo === type ? "selected" : "") + '>' + type + "</option>"; }).join("") + "</select></label>" +
        fieldInput("catalogo", "Catálogo", field.catalogo) + fieldInput("orden", "Orden", field.orden || 999, true, "number") + fieldInput("ancho", "Ancho", field.ancho) +
        '<label class="field field--full"><span>Ayuda</span><textarea name="ayuda">' + escapeHtml(field.ayuda || "") + "</textarea></label>" +
        checkboxInput("obligatorio", "Obligatorio", field.obligatorio) + checkboxInput("visibleTabla", "Visible en tabla", field.visibleTabla !== false) +
        checkboxInput("visibleFormulario", "Visible en formulario", field.visibleFormulario !== false) + checkboxInput("editable", "Editable", field.editable !== false) +
        checkboxInput("buscable", "Buscable", field.buscable) + "</form>",
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button><button id="saveFieldButton" class="button button--primary" type="button">Guardar campo</button>'
    });
    bindModalCloseButtons();
    on("saveFieldButton", "click", function() {
      const form = document.getElementById("fieldEditorForm"); if (!form.reportValidity()) return;
      const data = formDataObject(form);
      ["obligatorio", "visibleTabla", "visibleFormulario", "editable", "buscable"].forEach(function(key) { data[key] = form.elements[key].checked; });
      setLoader(true, "Guardando campo…");
      secureRpc("guardarCampoModuloAdminMotor", [moduleCode, data], adminRpcModuleCode())
        .then(function() { closeModal(); closeSideSheet(); setLoader(false); toast("Campo guardado", "La definición del módulo fue actualizada."); openModuleFields(moduleCode); })
        .catch(function(error) { setLoader(false); toast("No fue posible guardar", error.message, true); });
    });
  }

  /**
   * Abre catálogo editor.
   */
  function openCatalogEditor(catalog) {
    catalog = catalog || {};
    openSideSheet({
      eyebrow: catalog.idCatalogo ? "EDITAR CATÁLOGO" : "NUEVO CATÁLOGO",
      title: catalog.nombre || "Configurar catálogo",
      body: '<form id="catalogEditorForm" class="form-grid">' + hiddenInput("idCatalogo", catalog.idCatalogo) + fieldInput("codigo", "Código", catalog.codigo, true) + fieldInput("nombre", "Nombre", catalog.nombre, true) + '<label class="field field--full"><span>Descripción</span><textarea name="descripcion">' + escapeHtml(catalog.descripcion || "") + "</textarea></label>" + statusSelect("estado", catalog.estado || "ACTIVO") + "</form>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveCatalogButton" class="button button--primary" type="button">Guardar catálogo</button>'
    });
    bindSideSheetCloseButtons();
    on("saveCatalogButton", "click", function() {
      const form = document.getElementById("catalogEditorForm"); if (!form.reportValidity()) return;
      setLoader(true, "Guardando catálogo…");
      secureRpc("guardarCatalogoAdminMotor", [formDataObject(form)], adminRpcModuleCode())
        .then(function() { closeSideSheet(); setLoader(false); toast("Catálogo guardado", "La lista quedó disponible para los campos dinámicos."); return loadAdminCatalogs(); })
        .catch(function(error) { setLoader(false); toast("No fue posible guardar", error.message, true); });
    });
  }

  /**
   * Abre inmediatamente la lista de valores del catálogo.
   * La consulta se ejecuta dentro del panel lateral y no bloquea toda la aplicación.
   */
  function openCatalogValues(catalogCode) {
    catalogCode = String(catalogCode || "").trim();
    if (!catalogCode) return;

    ADMIN_STATE.activeCatalogCode = catalogCode;
    const cachedValues = ADMIN_STATE.catalogValuesCache[catalogCode];

    openSideSheet({
      eyebrow: "VALORES DEL CATÁLOGO",
      title: catalogCode,
      body: '<div id="catalogValuesList" class="catalog-values-region">' +
        (Array.isArray(cachedValues) ? catalogValuesTableHtml(cachedValues, catalogCode) : catalogValuesLoadingHtml()) +
        "</div>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cerrar</button><button id="newCatalogValueButton" class="button button--primary" type="button"><span class="material-symbols-rounded">add</span>Nuevo valor</button>'
    });

    bindSideSheetCloseButtons();
    on("newCatalogValueButton", "click", function() { openCatalogValueEditor(catalogCode, null); });
    if (Array.isArray(cachedValues)) bindCatalogValueActions(catalogCode, cachedValues);

    refreshCatalogValuesList(catalogCode, !Array.isArray(cachedValues));
  }

  /**
   * Consulta los valores y actualiza únicamente el contenido del panel lateral.
   */
  function refreshCatalogValuesList(catalogCode, showSkeleton) {
    const region = document.getElementById("catalogValuesList");
    if (showSkeleton && region) region.innerHTML = catalogValuesLoadingHtml();

    return secureRpc("listarValoresCatalogoAdminMotor", [catalogCode], adminRpcModuleCode())
      .then(function(values) {
        values = values || [];
        ADMIN_STATE.catalogValuesCache[catalogCode] = values;

        const currentRegion = document.getElementById("catalogValuesList");
        if (!currentRegion || ADMIN_STATE.activeCatalogCode !== catalogCode) return values;

        currentRegion.innerHTML = catalogValuesTableHtml(values, catalogCode);
        bindCatalogValueActions(catalogCode, values);
        return values;
      })
      .catch(function(error) {
        const currentRegion = document.getElementById("catalogValuesList");
        if (currentRegion && ADMIN_STATE.activeCatalogCode === catalogCode) {
          currentRegion.innerHTML = catalogValuesErrorHtml(error.message);
        }
        toast("No fue posible cargar", error.message, true);
        return [];
      });
  }

  /** Identifica los tres catálogos que conforman el árbol de materiales. */
  function isMpCatalogTreeAdmin(catalogCode) {
    return [
      "MP_PRODUCTOS_PRINCIPALES",
      "MP_TIPOS_MATERIAL",
      "MP_SUBTIPOS_MATERIAL"
    ].indexOf(String(catalogCode || "").trim().toUpperCase()) !== -1;
  }

  /** Ordena opciones de catálogo alfabéticamente para los selectores jerárquicos. */
  function sortCatalogHierarchyOptionsAdmin(values) {
    return (values || []).slice().sort(function(a, b) {
      return String(a.nombre || a.codigo || "").localeCompare(
        String(b.nombre || b.codigo || ""),
        "es",
        { sensitivity: "base" }
      );
    });
  }

  /** Construye la tabla de valores de catálogo. */
  function catalogValuesTableHtml(values, catalogCode) {
    const code = String(catalogCode || "").trim().toUpperCase();
    const columns = [
      { key: "nombre", label: "Nombre" },
      { key: "codigo", label: "Código" }
    ];

    if (code === "MP_TIPOS_MATERIAL") {
      columns.push({
        key: "valorPadre",
        label: "Producto principal",
        render: function(row) {
          return escapeHtml(row.valorPadre || "—");
        }
      });
    }

    if (code === "MP_SUBTIPOS_MATERIAL") {
      columns.push({
        key: "productoPrincipal",
        label: "Producto principal",
        render: function(row) {
          return escapeHtml(
            row.metadata && row.metadata.productoPrincipal ||
            "—"
          );
        }
      });
      columns.push({
        key: "valorPadre",
        label: "Tipo",
        render: function(row) {
          return escapeHtml(row.valorPadre || "—");
        }
      });
    }

    columns.push(
      { key: "orden", label: "Orden" },
      { key: "estado", label: "Estado", render: statusChip },
      { key: "actions", label: "", render: function(row) {
        return '<button class="table-button" type="button" data-edit-value="' +
          escapeHtml(row.idValor) +
          '" title="Editar valor"><span class="material-symbols-rounded">edit</span></button>';
      } }
    );

    return tableHtml(columns, values || []);
  }

  /** Vincula las acciones de edición de la lista visible. */
  function bindCatalogValueActions(catalogCode, values) {
    const region = document.getElementById("catalogValuesList");
    if (!region) return;
    region.querySelectorAll("[data-edit-value]").forEach(function(button) {
      button.addEventListener("click", function() {
        const selected = (values || []).find(function(item) {
          return String(item.idValor) === String(button.dataset.editValue);
        });
        openCatalogValueEditor(catalogCode, selected || null);
      });
    });
  }

  /** Muestra una carga local, sin cubrir la aplicación completa. */
  function catalogValuesLoadingHtml() {
    return '<div class="catalog-values-loading" aria-live="polite" aria-label="Cargando valores">' +
      loadingHtml(5) +
      "</div>";
  }

  /** Muestra el error dentro del panel de valores. */
  function catalogValuesErrorHtml(message) {
    return '<div class="catalog-values-error" role="alert"><span class="material-symbols-rounded">error</span><div><strong>No fue posible cargar los valores</strong><small>' +
      escapeHtml(message || "Intenta nuevamente.") +
      "</small></div></div>";
  }

  /** Construye un select reutilizable para la jerarquía de tipificación. */
  function catalogHierarchySelectAdmin(name, label, values, selected, required, disabled) {
    const current = String(selected || "").trim().toUpperCase();
    const options = sortCatalogHierarchyOptionsAdmin(values).filter(function(item) {
      const estado = String(item.estado || "").trim().toUpperCase();
      return estado === "ACTIVO" ||
        String(item.codigo || "").trim().toUpperCase() === current;
    });

    return '<label class="field"><span>' + escapeHtml(label) + '</span>' +
      '<select name="' + escapeHtml(name) + '" ' +
      (required ? "required " : "") +
      (disabled ? "disabled " : "") +
      '><option value="">Seleccionar…</option>' +
      options.map(function(item) {
        const code = String(item.codigo || "").trim();
        const isSelected = code.toUpperCase() === current;
        return '<option value="' + escapeHtml(code) + '" ' +
          (isSelected ? "selected" : "") +
          '>' + escapeHtml(item.nombre || code) + '</option>';
      }).join("") +
      '</select></label>';
  }

  /** Renderiza el editor después de obtener los padres requeridos. */
  function renderCatalogValueEditorAdmin(catalogCode, value, hierarchyData) {
    value = value || {};
    hierarchyData = hierarchyData || {};

    const code = String(catalogCode || "").trim().toUpperCase();
    const products = sortCatalogHierarchyOptionsAdmin(
      hierarchyData.products || []
    );
    const types = sortCatalogHierarchyOptionsAdmin(
      hierarchyData.types || []
    );

    let relationshipFields = "";
    let selectedProduct = "";
    let selectedType = "";

    if (code === "MP_TIPOS_MATERIAL") {
      selectedProduct = String(
        value.valorPadre ||
        value.metadata && value.metadata.productoPrincipal ||
        ""
      ).trim();

      relationshipFields =
        catalogHierarchySelectAdmin(
          "valorPadre",
          "Producto principal",
          products,
          selectedProduct,
          true,
          false
        ) +
        '<div class="field"><span>Jerarquía</span><small>' +
        'El Tipo quedará disponible únicamente cuando se seleccione este Producto principal.' +
        '</small></div>';
    }

    if (code === "MP_SUBTIPOS_MATERIAL") {
      selectedType = String(
        value.valorPadre ||
        value.metadata && value.metadata.tipoMaterial ||
        ""
      ).trim();

      const selectedTypeObject = types.find(function(item) {
        return String(item.codigo || "").trim().toUpperCase() ===
          selectedType.toUpperCase();
      }) || null;

      selectedProduct = String(
        value.metadata && value.metadata.productoPrincipal ||
        selectedTypeObject && selectedTypeObject.valorPadre ||
        ""
      ).trim();

      const initialTypes = selectedProduct ?
        types.filter(function(item) {
          return String(item.valorPadre || "").trim().toUpperCase() ===
            selectedProduct.toUpperCase();
        }) :
        [];

      relationshipFields =
        catalogHierarchySelectAdmin(
          "productoPrincipal",
          "Producto principal",
          products,
          selectedProduct,
          true,
          false
        ) +
        catalogHierarchySelectAdmin(
          "valorPadre",
          "Tipo",
          initialTypes,
          selectedType,
          true,
          !selectedProduct
        );
    }

    if (code === "MP_PRODUCTOS_PRINCIPALES") {
      relationshipFields =
        '<div class="field"><span>Nivel jerárquico</span><small>' +
        'Producto principal es la raíz funcional. Los Tipos dependerán de este valor.' +
        '</small></div>';
    }

    openModal({
      eyebrow: isMpCatalogTreeAdmin(code) ?
        "ÁRBOL DE TIPIFICACIÓN" :
        "VALOR DE CATÁLOGO",
      title: value.nombre || "Nuevo valor",
      body:
        '<form id="catalogValueForm" class="form-grid">' +
        hiddenInput("idValor", value.idValor) +
        fieldInput("codigo", "Código", value.codigo, true) +
        fieldInput("nombre", "Nombre", value.nombre, true) +
        relationshipFields +
        fieldInput("orden", "Orden", value.orden || 999, true, "number") +
        statusSelect("estado", value.estado || "ACTIVO") +
        "</form>",
      footer:
        '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button>' +
        '<button id="saveCatalogValueButton" class="button button--primary" type="button">Guardar valor</button>'
    });

    bindModalCloseButtons();

    if (code === "MP_SUBTIPOS_MATERIAL") {
      const form = document.getElementById("catalogValueForm");
      const productSelect = form ?
        form.querySelector('[name="productoPrincipal"]') :
        null;
      const typeSelect = form ?
        form.querySelector('[name="valorPadre"]') :
        null;

      if (productSelect && typeSelect) {
        productSelect.addEventListener("change", function() {
          const productCode = String(productSelect.value || "").trim().toUpperCase();
          const children = productCode ?
            types.filter(function(item) {
              return String(item.valorPadre || "").trim().toUpperCase() ===
                productCode;
            }) :
            [];

          typeSelect.innerHTML =
            '<option value="">Seleccionar…</option>' +
            sortCatalogHierarchyOptionsAdmin(children).map(function(item) {
              const itemCode = String(item.codigo || "").trim();
              return '<option value="' + escapeHtml(itemCode) + '">' +
                escapeHtml(item.nombre || itemCode) +
                '</option>';
            }).join("");

          typeSelect.disabled = !productCode || children.length === 0;
        });
      }
    }

    on("saveCatalogValueButton", "click", function() {
      const form = document.getElementById("catalogValueForm");
      if (!form || !form.reportValidity()) return;

      const saveButton = document.getElementById("saveCatalogValueButton");
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML =
          '<span class="material-symbols-rounded">progress_activity</span>Guardando…';
      }

      secureRpc(
        "guardarValorCatalogoAdminMotor",
        [catalogCode, formDataObject(form)],
        adminRpcModuleCode()
      ).then(function() {
        closeModal();
        toast(
          "Valor guardado",
          isMpCatalogTreeAdmin(code) ?
            "La relación del árbol de tipificación fue actualizada." :
            "El catálogo fue actualizado."
        );
        return refreshCatalogValuesList(catalogCode, true);
      }).catch(function(error) {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = "Guardar valor";
        }
        toast("No fue posible guardar", error.message, true);
      });
    });
  }

  /**
   * Abre el formulario modal. Los catálogos del árbol consultan sus padres
   * antes de mostrar el editor para impedir relaciones huérfanas.
   */
  function openCatalogValueEditor(catalogCode, value) {
    value = value || {};
    const code = String(catalogCode || "").trim().toUpperCase();

    if (code === "MP_TIPOS_MATERIAL") {
      setLoader(true, "Cargando Productos principales…");
      secureRpc(
        "listarValoresCatalogoAdminMotor",
        ["MP_PRODUCTOS_PRINCIPALES"],
        adminRpcModuleCode()
      ).then(function(products) {
        setLoader(false);
        renderCatalogValueEditorAdmin(
          code,
          value,
          { products: products || [] }
        );
      }).catch(function(error) {
        setLoader(false);
        toast("No fue posible cargar la jerarquía", error.message, true);
      });
      return;
    }

    if (code === "MP_SUBTIPOS_MATERIAL") {
      setLoader(true, "Cargando árbol de tipificación…");
      Promise.all([
        secureRpc(
          "listarValoresCatalogoAdminMotor",
          ["MP_PRODUCTOS_PRINCIPALES"],
          adminRpcModuleCode()
        ),
        secureRpc(
          "listarValoresCatalogoAdminMotor",
          ["MP_TIPOS_MATERIAL"],
          adminRpcModuleCode()
        )
      ]).then(function(results) {
        setLoader(false);
        renderCatalogValueEditorAdmin(
          code,
          value,
          {
            products: results[0] || [],
            types: results[1] || []
          }
        );
      }).catch(function(error) {
        setLoader(false);
        toast("No fue posible cargar la jerarquía", error.message, true);
      });
      return;
    }

    renderCatalogValueEditorAdmin(code, value, {});
  }

  /**
   * Guarda setting.
   */
  function saveSetting(setting) {
    setLoader(true, "Guardando configuración…");
    secureRpc("guardarParametroAdminMotor", [setting], adminRpcModuleCode())
      .then(function(saved) {
        setLoader(false);
        if (typeof applyRefreshConfigurationFromAdmin === "function" &&
            (setting.clave === "APP_REFRESH_ENABLED" || setting.clave === "APP_REFRESH_SECONDS")) {
          applyRefreshConfigurationFromAdmin(setting.clave, saved ? saved.valor : setting.valor);
        }
        toast(
          "Configuración guardada",
          setting.clave === "APP_REFRESH_ENABLED" ?
            (String(saved && saved.valor || setting.valor).toUpperCase() === "TRUE" ?
              "La actualización automática quedó activada." :
              "La actualización automática quedó desactivada. Los usuarios deberán utilizar el botón Actualizar.") :
            "El parámetro fue actualizado."
        );
        return loadAdminSettings();
      })
      .catch(function(error) { setLoader(false); toast("No fue posible guardar", error.message, true); });
  }


  /** Descarga la plantilla CSV del maestro seleccionado. */
  function downloadAssignmentTemplate(type) {
    const config = ASSIGNMENT_IMPORT_CONFIG[type];
    if (!config) return;
    const content = "\uFEFF" + config.cabeceras.join(";") + "\r\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = config.archivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  /** Abre el selector de CSV y prepara la confirmación de carga. */
  function selectAssignmentImportFile(type) {
    const config = ASSIGNMENT_IMPORT_CONFIG[type];
    if (!config) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.addEventListener("change", function() {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast("Archivo demasiado grande", "El límite para estos maestros es 5 MB.", true);
        return;
      }
      const reader = new FileReader();
      reader.onload = function() {
        openAssignmentImportConfirmation(type, file, String(reader.result || ""));
      };
      reader.onerror = function() {
        toast("No fue posible leer el archivo", "Selecciona nuevamente el CSV.", true);
      };
      reader.readAsText(file, "UTF-8");
    });
    input.click();
  }

  /** Muestra las reglas antes de aplicar el UPSERT masivo. */
  function openAssignmentImportConfirmation(type, file, content) {
    const config = ASSIGNMENT_IMPORT_CONFIG[type];
    if (!config) return;
    const metadata = {
      nombre: file.name,
      tamano: file.size,
      tipoMime: file.type || "text/csv"
    };

    openMassImportPreview({
      tipo: type,
      etiqueta: config.etiqueta,
      file: file,
      content: content,
      moduleCode: adminRpcModuleCode(),
      previewOperation: "previsualizarImportacionAsignacionAdminMotor",
      approveOperation: "aprobarImportacionAsignacionAdminMotor",
      buildPreviewArgs: function() {
        return [type, content, metadata];
      },
      buildApproveArgs: function(token) {
        return [type, token, content, metadata];
      },
      onApproved: function() {
        ADMIN_STATE.assignmentStructureLoaded = false;
        return loadAdminAssignmentStructure();
      }
    });
  }

  /** Ejecuta la carga masiva y refresca inmediatamente la consola. */
  function runAssignmentImport(type, file, content) {
    openAssignmentImportConfirmation(type, file, content);
  }

  /** Formatea el tamaño mostrado en la confirmación. */
  function formatAssignmentFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return size + " B";
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
    return (size / (1024 * 1024)).toFixed(1) + " MB";
  }

  /**
   * Carga los maestros de proveedores, oficinas, grupos y tipos de documento.
   */
  function loadAdminAssignmentStructure() {
    const providersRegion = document.getElementById("adminProvidersContent");
    const officesRegion = document.getElementById("adminOfficesContent");
    const groupsRegion = document.getElementById("adminGroupsContent");
    if (providersRegion) providersRegion.innerHTML = loadingHtml(3);
    if (officesRegion) officesRegion.innerHTML = loadingHtml(3);
    if (groupsRegion) groupsRegion.innerHTML = loadingHtml(3);

    const operation = ADMIN_STATE.activeModule === "ADMIN_USUARIOS" ?
      "obtenerEstructuraAsignacionesUsuariosMotor" :
      "obtenerEstructuraAsignacionesAdminMotor";
    return secureRpc(operation, [], adminRpcModuleCode())
      .then(function(result) {
        result = result || {};
        ADMIN_STATE.providers = result.proveedores || [];
        ADMIN_STATE.offices = result.oficinas || [];
        ADMIN_STATE.groups = result.grupos || [];
        ADMIN_STATE.providerOfficeRelations = result.relacionesProveedorOficina || result.relaciones || [];
        ADMIN_STATE.documentTypes = result.tiposDocumento || [];
        ADMIN_STATE.assignmentRules = result.reglas || {};
        ADMIN_STATE.assignmentStructureLoaded = true;
        if (providersRegion || officesRegion || groupsRegion) renderAdminAssignmentStructure();
      })
      .catch(function(error) {
        if (providersRegion) renderAdminPermissionError("adminProvidersContent", error);
        if (officesRegion) renderAdminPermissionError("adminOfficesContent", error);
        if (groupsRegion) renderAdminPermissionError("adminGroupsContent", error);
      });
  }

  /**
   * Renderiza los tres maestros organizativos.
   */
  function renderAdminAssignmentStructure() {
    const providersRegion = document.getElementById("adminProvidersContent");
    const officesRegion = document.getElementById("adminOfficesContent");
    const groupsRegion = document.getElementById("adminGroupsContent");

    if (providersRegion) {
      providersRegion.innerHTML = tableHtml([
        {
          key: "nombreComercial",
          label: "Nombre comercial",
          render: function(row) {
            return escapeHtml(row.nombreComercial || "—");
          }
        },
        { key: "razonSocial", label: "Razón social" },
        {
          key: "idProveedor",
          label: "Código interno",
          render: function(row) {
            return '<code>' + escapeHtml(row.idProveedor) + '</code>';
          }
        },
        {
          key: "oficinas",
          label: "Canal de ventas",
          render: function(row) {
            const names = (row.oficinas || []).map(function(item) {
              return item.nombre;
            });
            return escapeHtml(names.join(", ") || "Sin canal de ventas");
          }
        },
        {
          key: "alcanceCatalogo",
          label: "Catálogo",
          render: function(row) {
            return row.alcanceCatalogo === "SOLO_PROVEEDOR"
              ? '<span class="status-chip status-chip--warning">Solo su proveedor</span>'
              : '<span class="status-chip status-chip--success">Todos los proveedores</span>';
          }
        },
        { key: "estado", label: "Estado", render: statusChip },
        {
          key: "actions",
          label: "",
          render: function(row) {
            return '<button class="table-button" type="button" data-edit-provider="' +
              escapeHtml(row.idProveedor) +
              '" aria-label="Editar proveedor"><span class="material-symbols-rounded">edit</span></button>';
          }
        }
      ], ADMIN_STATE.providers);

      providersRegion.querySelectorAll("[data-edit-provider]").forEach(function(button) {
        button.addEventListener("click", function() {
          openProviderEditor(ADMIN_STATE.providers.find(function(item) {
            return item.idProveedor === button.dataset.editProvider;
          }));
        });
      });
    }

    if (officesRegion) {
      officesRegion.innerHTML = tableHtml([
        { key: "nombre", label: "Oficina" },
        { key: "idOficina", label: "ID" },
        { key: "estado", label: "Estado", render: statusChip },
        {
          key: "actions",
          label: "",
          render: function(row) {
            return '<button class="table-button" type="button" data-edit-office="' +
              escapeHtml(row.idOficina) +
              '" aria-label="Editar oficina"><span class="material-symbols-rounded">edit</span></button>';
          }
        }
      ], ADMIN_STATE.offices);
      officesRegion.querySelectorAll("[data-edit-office]").forEach(function(button) {
        button.addEventListener("click", function() {
          openOfficeEditor(ADMIN_STATE.offices.find(function(item) {
            return item.idOficina === button.dataset.editOffice;
          }));
        });
      });
    }

    if (groupsRegion) {
      groupsRegion.innerHTML = tableHtml([
        { key: "nombre", label: "Grupo" },
        { key: "idGrupo", label: "ID" },
        { key: "nombreOficina", label: "Oficina" },
        { key: "estado", label: "Estado", render: statusChip },
        {
          key: "actions",
          label: "",
          render: function(row) {
            return '<button class="table-button" type="button" data-edit-group="' +
              escapeHtml(row.idGrupo) +
              '" aria-label="Editar grupo"><span class="material-symbols-rounded">edit</span></button>';
          }
        }
      ], ADMIN_STATE.groups);
      groupsRegion.querySelectorAll("[data-edit-group]").forEach(function(button) {
        button.addEventListener("click", function() {
          openGroupEditor(ADMIN_STATE.groups.find(function(item) {
            return item.idGrupo === button.dataset.editGroup;
          }));
        });
      });
    }
  }

  /** Abre el editor del maestro de proveedores. */
  function openProviderEditor(provider) {
    provider = provider || {};
    const activeOffices = ADMIN_STATE.offices.filter(function(item) {
      return item.estado === "ACTIVO" ||
        (provider.idsOficina || []).indexOf(item.idOficina) !== -1;
    });


    const idField = provider.idProveedor ?
      hiddenInput("idProveedor", provider.idProveedor) +
        '<label class="field"><span>Código interno</span><input value="' +
          escapeHtml(provider.idProveedor) +
          '" readonly><small class="field-help">Este valor identifica las asignaciones y no puede modificarse.</small></label>' :
      '<div class="field"><span>Código interno</span><strong>Se generará automáticamente</strong><small class="field-help">Las relaciones de usuarios y oficinas se guardan con este código, nunca con el nombre.</small></div>';

    const selected = provider.idsOficina || [];
    const officeOptions = activeOffices.map(function(office) {
      return '<option value="' + escapeHtml(office.idOficina) + '" ' +
        (selected.indexOf(office.idOficina) !== -1 ? "selected" : "") + '>' +
        escapeHtml(office.nombre + " · " + office.idOficina) + "</option>";
    }).join("");

    const title = provider.nombreMostrar || provider.nombreComercial ||
      provider.razonSocial || "Registrar proveedor";

    openSideSheet({
      eyebrow: provider.idProveedor ? "EDITAR PROVEEDOR" : "NUEVO PROVEEDOR",
      title: title,
      body: '<form id="providerEditorForm" class="form-grid">' + idField +
        fieldInput(
          "razonSocial",
          "Razón social",
          provider.razonSocial || provider.nombre || "",
          true
        ) +
        fieldInput(
          "nombreComercial",
          "Nombre comercial (opcional)",
          provider.nombreComercial || ""
        ) +
        '<label class="field field--full">' +
          '<span>Alcance del catálogo comercial</span>' +
          '<select name="alcanceCatalogo" required>' +
            '<option value="SOLO_PROVEEDOR" ' +
              ((provider.alcanceCatalogo || "SOLO_PROVEEDOR") === "SOLO_PROVEEDOR" ? "selected" : "") +
            '>Solo productos y precios de este proveedor</option>' +
            '<option value="TODOS_PROVEEDORES" ' +
              (provider.alcanceCatalogo === "TODOS_PROVEEDORES" ? "selected" : "") +
            '>Productos y precios de todos los proveedores</option>' +
          '</select>' +
          '<small class="field-help">' +
            'SOLO_PROVEEDOR protege las listas comerciales del resto de proveedores. ' +
            'TODOS_PROVEEDORES se usa para canales multimarca como IBR.' +
          '</small>' +
        '</label>' +
        '<label class="field field--full"><span>Canal de ventas / oficinas (opcional)</span>' +
          '<select id="providerOfficeSelect" name="idsOficina" multiple size="6">' +
            officeOptions +
          '</select><small class="field-help">Selecciona oficinas solo si este proveedor también vende; si solo provee, déjalo sin selección. Usa Ctrl o Cmd para selección múltiple.</small></label>' +
        '<label class="field field--full"><span>Descripción</span><textarea name="descripcion" maxlength="1000">' +
          escapeHtml(provider.descripcion || "") + "</textarea></label>" +
        statusSelect("estado", provider.estado || "ACTIVO") +
        '<p class="assignment-note">La razón social y el nombre comercial pueden actualizarse. El código interno permanece estable y es el único valor utilizado en las asignaciones.</p>' +
        "</form>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveProviderButton" class="button button--primary" type="button">Guardar proveedor</button>'
    });

    bindSideSheetCloseButtons();
    on("saveProviderButton", "click", saveProviderEditor);
  }

  function saveProviderEditor() {
    const form = document.getElementById("providerEditorForm");
    const officeSelect = document.getElementById("providerOfficeSelect");
    if (!form || !form.reportValidity()) return;

    const data = formDataObject(form);
    data.idsOficina = Array.from(officeSelect.selectedOptions).map(function(option) {
      return option.value;
    });

    setLoader(true, "Guardando proveedor…");
    secureRpc(
      "guardarProveedorAdminMotor",
      [data],
      adminRpcModuleCode()
    ).then(function() {
      closeSideSheet();
      setLoader(false);
      toast(
        "Proveedor guardado",
        "La identidad comercial fue actualizada sin modificar el código interno."
      );
      return loadAdminAssignmentStructure();
    }).catch(function(error) {
      setLoader(false);
      toast("No fue posible guardar", errorMessage(error), true);
    });
  }

  function openOfficeEditor(office) {
    office = office || {};
    const idField = office.idOficina ?
      hiddenInput("idOficina", office.idOficina) +
        '<label class="field"><span>ID oficina</span><input value="' +
          escapeHtml(office.idOficina) + '" readonly></label>' :
      fieldInput("idOficina", "ID oficina", "", true);

    openSideSheet({
      eyebrow: office.idOficina ? "EDITAR OFICINA" : "NUEVA OFICINA",
      title: office.nombre || "Registrar oficina",
      body: '<form id="officeEditorForm" class="form-grid">' + idField +
        fieldInput("nombre", "Nombre", office.nombre, true) +
        '<label class="field field--full"><span>Descripción</span><textarea name="descripcion">' +
          escapeHtml(office.descripcion || "") + "</textarea></label>" +
        statusSelect("estado", office.estado || "ACTIVO") + "</form>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveOfficeButton" class="button button--primary" type="button">Guardar oficina</button>'
    });
    bindSideSheetCloseButtons();
    on("saveOfficeButton", "click", function() {
      saveAssignmentMaster("officeEditorForm", "guardarOficinaAdminMotor", "Oficina guardada");
    });
  }

  function openGroupEditor(group) {
    group = group || {};
    if (!ADMIN_STATE.offices.some(function(item) { return item.estado === "ACTIVO"; })) {
      toast("Registra una oficina", "Debes crear una oficina activa antes de registrar grupos.", true);
      return;
    }
    const idField = group.idGrupo ?
      hiddenInput("idGrupo", group.idGrupo) +
        '<label class="field"><span>ID grupo</span><input value="' +
          escapeHtml(group.idGrupo) + '" readonly></label>' :
      fieldInput("idGrupo", "ID grupo", "", true);

    openSideSheet({
      eyebrow: group.idGrupo ? "EDITAR GRUPO" : "NUEVO GRUPO",
      title: group.nombre || "Registrar grupo",
      body: '<form id="groupEditorForm" class="form-grid">' + idField +
        '<label class="field is-required"><span>Oficina</span><select name="idOficina" required>' +
          '<option value="">Selecciona</option>' + buildOfficeOptions(group.idOficina) + "</select></label>" +
        fieldInput("nombre", "Nombre", group.nombre, true) +
        '<label class="field field--full"><span>Descripción</span><textarea name="descripcion">' +
          escapeHtml(group.descripcion || "") + "</textarea></label>" +
        statusSelect("estado", group.estado || "ACTIVO") + "</form>",
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cancelar</button><button id="saveGroupButton" class="button button--primary" type="button">Guardar grupo</button>'
    });
    bindSideSheetCloseButtons();
    on("saveGroupButton", "click", function() {
      saveAssignmentMaster("groupEditorForm", "guardarGrupoAdminMotor", "Grupo guardado");
    });
  }

  function saveAssignmentMaster(formId, operation, successTitle) {
    const form = document.getElementById(formId);
    if (!form || !form.reportValidity()) return;
    setLoader(true, "Guardando estructura…");
    secureRpc(operation, [formDataObject(form)], adminRpcModuleCode())
      .then(function() {
        closeSideSheet();
        setLoader(false);
        toast(successTitle, "La estructura disponible para usuarios fue actualizada.");
        return loadAdminAssignmentStructure();
      })
      .catch(function(error) {
        setLoader(false);
        toast("No fue posible guardar", error.message, true);
      });
  }

  function buildProviderOptions(selectedId) {
    return ADMIN_STATE.providers.filter(function(provider) {
      return provider.estado === "ACTIVO" ||
        provider.idProveedor === selectedId;
    }).map(function(provider) {
      const nombreVisible = provider.nombreComercial ||
        provider.razonSocial ||
        "Proveedor sin nombre registrado";
      return '<option value="' + escapeHtml(provider.idProveedor) + '" ' +
        (provider.idProveedor === selectedId ? "selected" : "") + '>' +
        escapeHtml(nombreVisible) + "</option>";
    }).join("");
  }

  function buildOfficeOptions(selectedId, allowedIds) {
    const allowed = Array.isArray(allowedIds) ? allowedIds : null;
    return ADMIN_STATE.offices.filter(function(office) {
      const allowedByProvider = !allowed || allowed.indexOf(office.idOficina) !== -1;
      return allowedByProvider && (office.estado === "ACTIVO" || office.idOficina === selectedId);
    }).map(function(office) {
      return '<option value="' + escapeHtml(office.idOficina) + '" ' +
        (office.idOficina === selectedId ? "selected" : "") + '>' +
        escapeHtml(office.nombre + " · " + office.idOficina) + "</option>";
    }).join("");
  }

  /** Vincula tipo de documento, rol y filtros de asignación del usuario. */
  function bindUserEditorDependencies(user) {
    const documentType = document.getElementById("userDocumentType");
    const documentNumber = document.getElementById("userDocumentNumber");
    const role = document.getElementById("userRoleSelect");
    const provider = document.getElementById("userProviderSelect");
    const office = document.getElementById("userOfficeSelect");

    if (documentType) documentType.addEventListener("change", configureUserDocumentField);
    if (documentNumber) {
      documentNumber.addEventListener("input", function() {
        const rule = ADMIN_STATE.documentTypes.find(function(item) {
          return item.codigo === String(documentType && documentType.value || "");
        });
        if (rule && rule.soloNumeros) {
          documentNumber.value = documentNumber.value.replace(/\D/g, "");
        }
        validateUserDocumentField();
      });
    }
    if (provider) provider.addEventListener("change", function() {
      refreshUserAssignmentOptions("", "");
      updateUserAssignmentRequirements();
    });
    if (office) office.addEventListener("change", function() {
      refreshUserAssignmentOptions(office.value, "");
    });
    if (role) role.addEventListener("change", function() {
      updateUserAssignmentRequirements();
      refreshUserAssignmentOptions("", "");
    });

    configureUserDocumentField();
    refreshUserAssignmentOptions(user.idOficina || "", user.idGrupo || "");
    updateUserAssignmentRequirements();
  }

  /** Ajusta formato, longitud, ejemplo y ayuda según el documento elegido. */
  function configureUserDocumentField() {
    const typeSelect = document.getElementById("userDocumentType");
    const input = document.getElementById("userDocumentNumber");
    const help = document.getElementById("userDocumentHelp");
    if (!typeSelect || !input) return;

    const rule = ADMIN_STATE.documentTypes.find(function(item) {
      return item.codigo === typeSelect.value;
    });
    input.disabled = false;
    input.setCustomValidity("");

    if (!rule) {
      input.removeAttribute("pattern");
      input.removeAttribute("maxlength");
      input.placeholder = "";
      if (help) help.textContent = "Escribe el tipo y el número de documento.";
      return;
    }

    input.setAttribute("pattern", rule.patron || "[A-Za-z0-9-]{4,20}");
    input.setAttribute("maxlength", String(rule.longitudMaxima || 20));
    input.setAttribute("inputmode", rule.inputMode || "text");
    input.placeholder = rule.ejemplo || "";
    if (help) help.textContent = rule.ayuda || "Ingresa un documento válido.";
    validateUserDocumentField();
  }

  /** Valida el documento antes de ejecutar el RPC. */
  function validateUserDocumentField() {
    const typeSelect = document.getElementById("userDocumentType");
    const input = document.getElementById("userDocumentNumber");
    if (!typeSelect || !input) return true;
    const rule = ADMIN_STATE.documentTypes.find(function(item) {
      return item.codigo === typeSelect.value;
    });
    if (!typeSelect.value || !input.value) {
      input.setCustomValidity(!typeSelect.value ? "Ingresa el tipo de documento." : "Ingresa el número de documento.");
      return false;
    }
    if (!rule) {
      input.setCustomValidity("");
      return true;
    }
    let valid = false;
    try {
      valid = new RegExp(rule.patron).test(input.value);
    } catch (error) {
      valid = input.value.length >= 4;
    }
    input.setCustomValidity(valid ? "" : (rule.ayuda || "Documento no válido."));
    return valid;
  }

  /** Filtra oficinas y grupos usando el proveedor seleccionado. */
  function refreshUserAssignmentOptions(selectedOffice, selectedGroup) {
    const providerSelect = document.getElementById("userProviderSelect");
    const officeSelect = document.getElementById("userOfficeSelect");
    const groupSelect = document.getElementById("userGroupSelect");
    if (!providerSelect || !officeSelect || !groupSelect) return;

    const providerId = providerSelect.value;
    const provider = ADMIN_STATE.providers.find(function(item) {
      return item.idProveedor === providerId;
    });
    const allowedOfficeIds = provider ? (provider.idsOficina || []) : [];
    const officeValue = selectedOffice || officeSelect.value;
    const groupValue = selectedGroup || groupSelect.value;
    const offices = ADMIN_STATE.offices.filter(function(item) {
      return allowedOfficeIds.indexOf(item.idOficina) !== -1 &&
        (item.estado === "ACTIVO" || item.idOficina === officeValue);
    });

    officeSelect.innerHTML = '<option value="">' +
      (providerId ? "Sin oficina específica" : "Selecciona primero un proveedor") + "</option>" +
      offices.map(function(item) {
        return '<option value="' + escapeHtml(item.idOficina) + '" ' +
          (item.idOficina === officeValue ? "selected" : "") + '>' +
          escapeHtml(item.nombre + " · " + item.idOficina) + "</option>";
      }).join("");

    const effectiveOffice = officeSelect.value;
    const groups = ADMIN_STATE.groups.filter(function(item) {
      return item.idOficina === effectiveOffice &&
        (item.estado === "ACTIVO" || item.idGrupo === groupValue);
    });
    groupSelect.innerHTML = '<option value="">Sin grupo</option>' + groups.map(function(item) {
      return '<option value="' + escapeHtml(item.idGrupo) + '" ' +
        (item.idGrupo === groupValue ? "selected" : "") + '>' +
        escapeHtml(item.nombre + " · " + item.idGrupo) + "</option>";
    }).join("");

    officeSelect.disabled = !providerId;
    groupSelect.disabled = !providerId || !effectiveOffice;
  }

  function updateUserAssignmentRequirements() {
    const roleSelect = document.getElementById("userRoleSelect");
    const providerSelect = document.getElementById("userProviderSelect");
    const officeSelect = document.getElementById("userOfficeSelect");
    const providerField = document.getElementById("userProviderField");
    const officeField = document.getElementById("userOfficeField");
    const groupField = document.getElementById("userGroupField");
    if (!roleSelect || !providerSelect || !officeSelect) return;

    const selectedRole = ADMIN_STATE.roles.find(function(role) {
      return role.codigo === roleSelect.value;
    });
    const providerRequired = Boolean(selectedRole && !selectedRole.protegido && !selectedRole.sistema);

    providerSelect.required = providerRequired;
    officeSelect.required = false;
    if (providerField) providerField.classList.toggle("is-required", providerRequired);
    if (officeField) {
      officeField.classList.remove("is-required");
      officeField.hidden = false;
    }
    if (groupField) groupField.hidden = false;
  }

  /**
   * Carga sesiones técnicas para Auditoría.
   */
  function loadAdminSessions() {
    const region = document.getElementById("adminSessionsContent");
    if (region) region.innerHTML = loadingHtml(5);
    const textFilter = document.getElementById("adminSessionsSearch");
    const stateFilter = document.getElementById("adminSessionsState");
    return secureRpc("listarSesionesAuditoriaAdminMotor", [{
      texto: textFilter ? textFilter.value : "",
      estado: stateFilter ? stateFilter.value : "ACTIVAS",
      pagina: 1,
      tamano: 150
    }], adminRpcModuleCode()).then(function(result) {
      ADMIN_STATE.sessions = result.registros || [];
      ADMIN_STATE.sessionsSummary = result.resumen || null;
      updateAdminCount("sessions", result.total || ADMIN_STATE.sessions.length);
      renderAdminSessions();
    }).catch(function(error) {
      updateAdminCount("sessions", "—");
      renderAdminPermissionError("adminSessionsContent", error);
    });
  }

  function renderAdminSessions() {
    const region = document.getElementById("adminSessionsContent");
    if (!region) return;
    const canClose = hasActivePermission("ADMIN_AUDITORIA", "CERRAR_SESIONES") && !isRolePreviewActive();
    region.innerHTML = tableHtml([
      { key: "usuario", label: "Usuario", render: function(row) {
        return '<strong>' + escapeHtml(row.nombre || row.correo || "—") + '</strong><br><small>' +
          escapeHtml(row.correo || "") + '</small>';
      } },
      { key: "nombreRol", label: "Rol" },
      { key: "proveedorIdentidad", label: "Proveedor" },
      { key: "ultimaActividad", label: "Última actividad", render: function(row) {
        return escapeHtml(row.ultimaActividad || "—") +
          (row.minutosDesdeActividad !== null && row.minutosDesdeActividad !== undefined ?
            '<br><small>Hace ' + escapeHtml(row.minutosDesdeActividad) + ' min</small>' : "");
      } },
      { key: "fechaExpiracion", label: "Vence" },
      { key: "estadoOperativo", label: "Estado", render: function(row) {
        const value = String(row.estadoOperativo || row.estado || "").toUpperCase();
        const active = value === "VIGENTE";
        return '<span class="chip ' + (active ? "chip--active" : "chip--inactive") + '">' +
          escapeHtml(value || "—") + '</span>' +
          (row.actividad ? '<br><small>' + escapeHtml(row.actividad) + '</small>' : "");
      } },
      { key: "moduloActual", label: "Módulo" },
      { key: "acciones", label: "Acciones", render: function(row) {
        const detail = '<button class="button button--ghost button--small" type="button" data-session-detail="' +
          escapeHtml(row.idSesion) + '">Ver detalle</button>';
        const close = canClose && row.puedeCerrar ?
          '<button class="button button--danger button--small" type="button" data-session-close="' +
            escapeHtml(row.idSesion) + '" data-session-user="' + escapeHtml(row.correo || row.nombre || "") + '">Cerrar</button>' :
          "";
        return '<div class="table-actions">' + detail + close + '</div>';
      } }
    ], ADMIN_STATE.sessions);

    region.querySelectorAll("[data-session-detail]").forEach(function(button) {
      button.addEventListener("click", function() {
        openAdminSessionDetail(button.dataset.sessionDetail);
      });
    });
    region.querySelectorAll("[data-session-close]").forEach(function(button) {
      button.addEventListener("click", function() {
        forceCloseAdminSession(button.dataset.sessionClose, button.dataset.sessionUser || "");
      });
    });
  }

  function openAdminSessionDetail(idSession) {
    const safeIdSession = String(idSession || "").trim();
    if (!safeIdSession) {
      toast("Sesión no válida", "No se recibió el identificador de la sesión.", true);
      return;
    }

    openSideSheet({
      eyebrow: "SESIÓN TÉCNICA",
      title: "Detalle de sesión",
      body: sessionDetailLoadingHtml(),
      footer: '<button class="button button--ghost" type="button" data-sheet-close>Cerrar</button>'
    });
    bindSideSheetCloseButtons();

    secureRpc("obtenerDetalleSesionAuditoriaAdminMotor", [safeIdSession], adminRpcModuleCode())
      .then(function(result) {
        const session = result.sesion || {};
        const auditRows = result.auditoria || [];
        const canClose = hasActivePermission("ADMIN_AUDITORIA", "CERRAR_SESIONES") &&
          session.puedeCerrar && !isRolePreviewActive();
        text("sideSheetTitle", session.nombre || session.correo || "Detalle de sesión");
        document.getElementById("sideSheetBody").innerHTML = sessionDetailHtml(session) +
          '<h3 class="section-subtitle">Auditoría relacionada</h3>' +
          tableHtml([
            { key: "fecha", label: "Fecha" },
            { key: "accion", label: "Acción" },
            { key: "resultado", label: "Resultado" },
            { key: "origen", label: "Origen" },
            { key: "motivo", label: "Motivo" }
          ], auditRows);
        document.getElementById("sideSheetFooter").innerHTML =
          '<button class="button button--ghost" type="button" data-sheet-close>Cerrar</button>' +
          (canClose ? '<button id="forceCloseSessionDetailButton" class="button button--danger" type="button">Forzar cierre</button>' : "");
        bindSideSheetCloseButtons();
        const closeButton = document.getElementById("forceCloseSessionDetailButton");
        if (closeButton) {
          closeButton.addEventListener("click", function() {
            forceCloseAdminSession(session.idSesion, session.correo || session.nombre || "");
          });
        }
      }).catch(function(error) {
        const body = document.getElementById("sideSheetBody");
        if (body) {
          body.innerHTML = '<div class="empty-state">' +
            '<span class="material-symbols-rounded">error</span>' +
            '<strong>No se pudo cargar el detalle</strong>' +
            '<p>' + escapeHtml(errorMessage(error, "Intenta nuevamente.")) + '</p>' +
            '</div>';
        }
        toast("No se pudo cargar la sesión", errorMessage(error, "Intenta nuevamente."), true);
      });
  }

  function sessionDetailLoadingHtml() {
    return '<div class="empty-state" aria-live="polite" aria-busy="true">' +
      '<span class="material-symbols-rounded">info</span>' +
      '<strong>Cargando detalle de sesión</strong>' +
      '<p>Estamos consultando la información técnica, la actividad y la auditoría relacionada.</p>' +
      '<div class="catalog-values-loading">' + loadingHtml(3) + '</div>' +
      '</div>';
  }

  function sessionDetailHtml(session) {
    const items = [
      ["ID sesión", session.idSesionEnmascarado || session.idSesion || "—"],
      ["Usuario", (session.nombre ? session.nombre + " · " : "") + (session.correo || "—")],
      ["Rol", session.nombreRol || session.rol || "—"],
      ["Proveedor", session.proveedorIdentidad || "—"],
      ["Estado", session.estadoOperativo || session.estado || "—"],
      ["Estado registrado", session.estado || "—"],
      ["Inicio", session.fechaInicio || "—"],
      ["Última actividad", session.ultimaActividad || "—"],
      ["Vencimiento", session.fechaExpiracion || "—"],
      ["Fecha fin", session.fechaFin || "—"],
      ["Módulo actual", session.moduloActual || "—"],
      ["Navegador", session.navegador || "—"]
    ];
    const rows = items.map(function(item) {
      return '<div class="detail-row"><span>' + escapeHtml(item[0]) + '</span><strong>' +
        escapeHtml(item[1]) + '</strong></div>';
    }).join("");
    const userAgent = session.userAgent ?
      '<div class="detail-row detail-row--full"><span>User agent</span><small>' +
        escapeHtml(session.userAgent) + '</small></div>' : "";
    return '<div class="detail-grid">' + rows + userAgent + '</div>';
  }

  function forceCloseAdminSession(idSession, userLabel) {
    if (!ensureWritableAdministrationView()) return;
    if (!hasActivePermission("ADMIN_AUDITORIA", "CERRAR_SESIONES")) {
      toast("Acceso denegado", "No tienes permiso para forzar cierres de sesión.", true);
      return;
    }
    const label = userLabel ? " de " + userLabel : " seleccionada";
    if (!window.confirm("¿Forzar el cierre de la sesión" + label + "? El usuario deberá iniciar sesión nuevamente.")) {
      return;
    }
    setLoader(true, "Cerrando sesión…");
    secureRpc("cerrarSesionAuditoriaAdminMotor", [{
      idSesion: idSession,
      motivo: "Cierre forzado desde la sección Sesiones activas"
    }], adminRpcModuleCode()).then(function(result) {
      closeSideSheet();
      setLoader(false);
      toast("Sesión actualizada", result.mensaje || "La sesión fue cerrada.");
      return Promise.allSettled([loadAdminSessions(), loadAdminAudit()]);
    }).catch(function(error) {
      setLoader(false);
      toast("No se pudo cerrar", errorMessage(error, "La sesión no fue modificada."), true);
    });
  }

  function cleanExpiredAdminSessions() {
    if (!ensureWritableAdministrationView()) return;
    if (!hasActivePermission("ADMIN_AUDITORIA", "LIMPIAR_SESIONES_EXPIRADAS")) {
      toast("Acceso denegado", "No tienes permiso para limpiar sesiones expiradas.", true);
      return;
    }
    if (!window.confirm("¿Limpiar ahora las sesiones vencidas? Las sesiones ABIERTAS que ya superaron su vigencia pasarán a EXPIRADA.")) {
      return;
    }
    setLoader(true, "Limpiando sesiones expiradas…");
    secureRpc("limpiarSesionesExpiradasAuditoriaAdminMotor", [{
      motivo: "Limpieza manual desde Auditoría > Sesiones activas"
    }], adminRpcModuleCode()).then(function(result) {
      setLoader(false);
      const count = Number(result.sesionesExpiradas || 0);
      toast("Limpieza ejecutada", count ?
        "Sesiones expiradas: " + count + "." :
        "No se encontraron sesiones vencidas pendientes.");
      return Promise.allSettled([loadAdminSessions(), loadAdminAudit(), loadAdminSummary()]);
    }).catch(function(error) {
      setLoader(false);
      toast("No se pudo limpiar", errorMessage(error, "No se modificaron sesiones."), true);
    });
  }

  /**
   * Renderiza administración permiso error.
   */
  function loadAdminAudit() {
    const region = document.getElementById("adminAuditContent");
    if (region) region.innerHTML = loadingHtml(5);
    const textFilter = document.getElementById("adminAuditSearch");
    const typeFilter = document.getElementById("adminAuditType");
    return secureRpc("listarAuditoriaAdminMotor", [{
      texto: textFilter ? textFilter.value : "",
      tipo: typeFilter ? typeFilter.value : "TODOS",
      pagina: 1,
      tamano: 150
    }], adminRpcModuleCode()).then(function(result) {
      ADMIN_STATE.audit = result.registros || [];
      updateAdminCount("audit", result.total || ADMIN_STATE.audit.length);
      renderAdminAudit();
    }).catch(function(error) {
      renderAdminPermissionError("adminAuditContent", error);
    });
  }

  function renderAdminAudit() {
    const region = document.getElementById("adminAuditContent");
    if (!region) return;
    region.innerHTML = tableHtml([
      { key: "fecha", label: "Fecha" },
      { key: "tipo", label: "Tipo", render: function(row) { return '<span class="chip chip--active">' + escapeHtml(row.tipo) + "</span>"; } },
      { key: "correo", label: "Usuario" },
      { key: "modulo", label: "Módulo" },
      { key: "accion", label: "Acción" },
      { key: "resultado", label: "Resultado", render: function(row) {
        const value = String(row.resultado || "").toUpperCase();
        const active = ["OK", "AUTORIZADO", "PERMITIDO", "ACTIVO"].indexOf(value) !== -1;
        return '<span class="chip ' + (active ? "chip--active" : "chip--inactive") + '">' + escapeHtml(row.resultado || "—") + "</span>";
      } },
      { key: "detalle", label: "Detalle" }
    ], ADMIN_STATE.audit);
  }

  function renderAdminPermissionError(regionId, error) {
    const region = document.getElementById(regionId);
    if (!region) return;
    region.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">lock</span><strong>Acceso no disponible</strong><p>' + escapeHtml(errorMessage(error, "No tienes permiso para consultar esta sección.")) + "</p></div>";
  }

  /**
   * Actualiza administración count.
   */
  function updateAdminCount(name, value) {
    const element = document.querySelector('[data-count="' + name + '"]');
    if (element) element.textContent = value;
  }

  /**
   * Ejecuta estado chip.
   */
  function statusChip(row) {
    const status = String(row.estado || row.ESTADO || "").toUpperCase();
    return '<span class="chip ' + (status === "ACTIVO" ? "chip--active" : "chip--inactive") + '">' + escapeHtml(status || "—") + "</span>";
  }

  /**
   * Ejecuta hidden input.
   */
  function hiddenInput(name, value) { return '<input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(value || "") + '">'; }
  /**
   * Ejecuta campo input.
   */
  function fieldInput(name, label, value, required, type) { return '<label class="field"><span>' + escapeHtml(label) + '</span><input type="' + escapeHtml(type || "text") + '" name="' + escapeHtml(name) + '" value="' + escapeHtml(value === null || value === undefined ? "" : value) + '" ' + (required ? "required" : "") + '></label>'; }
  /**
   * Ejecuta estado select.
   */
  function statusSelect(name, value) { return '<label class="field"><span>Estado</span><select name="' + escapeHtml(name) + '"><option value="ACTIVO" ' + (value === "ACTIVO" ? "selected" : "") + '>Activo</option><option value="INACTIVO" ' + (value === "INACTIVO" ? "selected" : "") + ">Inactivo</option></select></label>"; }
  /**
   * Ejecuta checkbox input.
   */
  function checkboxInput(name, label, checked) { return '<label class="checkbox-field"><input type="checkbox" name="' + escapeHtml(name) + '" ' + (checked ? "checked" : "") + '> ' + escapeHtml(label) + "</label>"; }
  /**
   * Ejecuta formulario datos object.
   */
  function formDataObject(form) { const data = {}; new FormData(form).forEach(function(value, key) { data[key] = value; }); return data; }
  /**
   * Vincula side hoja close buttons.
   */
  function bindSideSheetCloseButtons() { document.querySelectorAll("[data-sheet-close]").forEach(function(button) { button.onclick = closeSideSheet; }); }
  /**
   * Vincula modal close buttons.
   */
  function bindModalCloseButtons() { document.querySelectorAll("[data-modal-close]").forEach(function(button) { button.onclick = closeModal; }); }

  const MASS_IMPORT_STATE = {
    sequence: 0,
    config: null,
    result: null,
    approvalResult: null,
    filter: "TODOS",
    page: 1,
    pageSize: 25,
    busy: false
  };

  /**
   * Abre inmediatamente la previsualización de una carga masiva y ejecuta
   * la validación en segundo plano sin bloquear toda la aplicación.
   */
  function openMassImportPreview(config) {
    config = config || {};
    MASS_IMPORT_STATE.sequence += 1;
    MASS_IMPORT_STATE.config = config;
    MASS_IMPORT_STATE.result = null;
    MASS_IMPORT_STATE.approvalResult = null;
    MASS_IMPORT_STATE.filter = "TODOS";
    MASS_IMPORT_STATE.page = 1;
    MASS_IMPORT_STATE.busy = true;
    const sequence = MASS_IMPORT_STATE.sequence;

    openModal({
      wide: true,
      eyebrow: "PREVISUALIZACIÓN DE IMPORTACIÓN",
      title: "Validando " + String(config.etiqueta || "archivo").toLowerCase(),
      body: '<div class="mass-import-loading">' +
        '<span class="spinner" aria-hidden="true"></span>' +
        '<div><strong>Analizando el archivo</strong>' +
        '<p>Se están validando formatos, códigos internos, duplicados y dependencias. Todavía no se modificará ningún dato.</p></div>' +
        '</div>',
      footer: '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button>'
    });
    bindMassImportCloseButtons();

    secureRpc(
      config.previewOperation,
      typeof config.buildPreviewArgs === "function" ?
        config.buildPreviewArgs() : [],
      config.moduleCode || ""
    ).then(function(result) {
      if (sequence !== MASS_IMPORT_STATE.sequence) return;
      MASS_IMPORT_STATE.busy = false;
      MASS_IMPORT_STATE.result = result || null;
      renderMassImportPreview();
    }).catch(function(error) {
      if (sequence !== MASS_IMPORT_STATE.sequence) return;
      MASS_IMPORT_STATE.busy = false;
      renderMassImportFatalError(error);
    });
  }

  function renderMassImportFatalError(error) {
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    if (body) {
      body.innerHTML = '<div class="mass-import-fatal">' +
        '<span class="material-symbols-rounded">error</span>' +
        '<div><strong>No fue posible validar el archivo</strong>' +
        '<p>' + escapeHtml(errorMessage(error, "Revisa el archivo e inténtalo nuevamente.")) + '</p></div>' +
        '</div>';
    }
    if (footer) {
      footer.innerHTML =
        '<button class="button button--ghost" type="button" data-modal-close>Cerrar</button>' +
        '<button id="massImportRetryButton" class="button button--primary" type="button">Volver a validar</button>';
    }
    bindMassImportCloseButtons();
    on("massImportRetryButton", "click", function() {
      if (MASS_IMPORT_STATE.config) openMassImportPreview(MASS_IMPORT_STATE.config);
    });
  }

  function renderMassImportPreview() {
    const result = MASS_IMPORT_STATE.result || {};
    const summary = result.resumen || {};
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    if (!body || !footer) return;

    text("modalTitle", "Revisar " + String(
      MASS_IMPORT_STATE.config && MASS_IMPORT_STATE.config.etiqueta || "importación"
    ).toLowerCase());

    const filters = [
      { code: "TODOS", label: "Todos", count: Number(summary.filasLeidas || 0) },
      { code: "CREAR", label: "Nuevos", count: Number(summary.crear || 0) },
      { code: "ACTUALIZAR", label: "Actualizaciones", count: Number(summary.actualizar || 0) },
      { code: "SIN_CAMBIOS", label: "Sin cambios", count: Number(summary.sinCambios || 0) },
      { code: "ERROR", label: "Con errores", count: Number(summary.filasConError || 0) },
      { code: "ADVERTENCIA", label: "Advertencias", count: Number(summary.advertencias || 0) }
    ];

    const hasCorrectableRows = Array.isArray(result.filas) && result.filas.some(function(row) {
      return Array.isArray(row.errores) && row.errores.length &&
        row.entrada && Object.keys(row.entrada).length;
    });
    const filteredRows = getMassImportFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / MASS_IMPORT_STATE.pageSize));
    MASS_IMPORT_STATE.page = Math.min(Math.max(1, MASS_IMPORT_STATE.page), totalPages);
    const start = (MASS_IMPORT_STATE.page - 1) * MASS_IMPORT_STATE.pageSize;
    const pageRows = filteredRows.slice(start, start + MASS_IMPORT_STATE.pageSize);

    body.innerHTML =
      '<div class="mass-import-workspace">' +
        '<div class="mass-import-file">' +
          '<span class="material-symbols-rounded">description</span>' +
          '<div><strong>' + escapeHtml(result.archivo && result.archivo.nombre || "Archivo CSV") + '</strong>' +
          '<small>' + escapeHtml(formatMassImportFileSize(result.archivo && result.archivo.tamano || 0)) +
          ' · validación sin escritura</small></div>' +
        '</div>' +
        renderMassImportSummaryCards(summary) +
        '<div class="mass-import-toolbar">' +
          '<div class="mass-import-filters">' +
            filters.filter(function(item) {
              return item.code !== "ADVERTENCIA" || item.count > 0;
            }).map(function(item) {
              return '<button class="mass-import-filter ' +
                (MASS_IMPORT_STATE.filter === item.code ? "is-active" : "") +
                '" type="button" data-mass-import-filter="' + item.code + '">' +
                escapeHtml(item.label) + '<span>' + item.count + '</span></button>';
            }).join("") +
          '</div>' +
          '<div class="mass-import-toolbar-actions">' +
            (Number(summary.errores || 0) > 0 ?
              '<button id="massImportDownloadErrorsButton" class="button button--secondary button--compact" type="button">' +
              '<span class="material-symbols-rounded">download</span> Errores</button>' +
              (hasCorrectableRows ?
                '<button id="massImportDownloadCorrectionButton" class="button button--secondary button--compact" type="button">' +
                '<span class="material-symbols-rounded">download</span> Filas para corregir</button>' : '') : '') +
            (Number(summary.crear || 0) + Number(summary.actualizar || 0) > 0 ?
              '<button id="massImportDownloadChangesButton" class="button button--secondary button--compact" type="button">' +
              '<span class="material-symbols-rounded">download</span> Cambios</button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="mass-import-table-wrap">' +
          '<table class="mass-import-table">' +
            '<thead><tr><th>Línea</th><th>Resultado</th><th>Registro</th><th>Detalle de validación</th></tr></thead>' +
            '<tbody>' + (pageRows.length ?
              pageRows.map(renderMassImportRow).join("") :
              '<tr><td colspan="4"><div class="mass-import-empty">No existen filas para este filtro.</div></td></tr>') +
            '</tbody>' +
          '</table>' +
        '</div>' +
        renderMassImportPagination(filteredRows.length, totalPages) +
        renderMassImportApprovalNotice(summary) +
      '</div>';

    footer.innerHTML =
      '<button class="button button--ghost" type="button" data-modal-close>Cancelar</button>' +
      '<button id="massImportRevalidateButton" class="button button--secondary" type="button">Volver a validar</button>' +
      '<button id="massImportApproveButton" class="button button--primary" type="button" ' +
        (summary.aprobable ? "" : "disabled") +
        '>Aprobar importación</button>';

    bindMassImportCloseButtons();
    bindMassImportPreviewEvents();
  }

  function renderMassImportSummaryCards(summary) {
    const items = [
      { label: "Filas leídas", value: summary.filasLeidas || 0, icon: "table_rows" },
      { label: "Nuevos", value: summary.crear || 0, icon: "add_circle" },
      { label: "Actualizaciones", value: summary.actualizar || 0, icon: "sync" },
      { label: "Sin cambios", value: summary.sinCambios || 0, icon: "remove_circle" },
      { label: "Con errores", value: summary.filasConError || 0, icon: "error" }
    ];
    return '<div class="mass-import-summary-grid">' +
      items.map(function(item) {
        return '<div class="mass-import-summary-card">' +
          '<span class="material-symbols-rounded">' + item.icon + '</span>' +
          '<div><strong>' + Number(item.value || 0) + '</strong><small>' +
          escapeHtml(item.label) + '</small></div></div>';
      }).join("") +
      '</div>';
  }

  function renderMassImportRow(row) {
    const errors = Array.isArray(row.errores) ? row.errores : [];
    const warnings = Array.isArray(row.advertencias) ? row.advertencias : [];
    const changes = Array.isArray(row.cambios) ? row.cambios : [];
    const action = errors.length ? "ERROR" : String(row.accion || "SIN_CAMBIOS");
    const badgeClass = "mass-import-badge mass-import-badge--" + action.toLowerCase().replace(/_/g, "-");
    let detail = "";

    if (errors.length) {
      detail += '<ul class="mass-import-message-list mass-import-message-list--error">' +
        errors.map(function(item) {
          return '<li><strong>' + escapeHtml(item.campo || item.codigo || "Validación") +
            ':</strong> ' + escapeHtml(item.mensaje || "") +
            (item.sugerencia ? '<small>' + escapeHtml(item.sugerencia) + '</small>' : '') +
            '</li>';
        }).join("") + '</ul>';
    }
    if (warnings.length) {
      detail += '<ul class="mass-import-message-list mass-import-message-list--warning">' +
        warnings.map(function(item) {
          return '<li>' + escapeHtml(item.mensaje || item) + '</li>';
        }).join("") + '</ul>';
    }
    if (!errors.length && changes.length) {
      detail += '<details class="mass-import-changes"><summary>' +
        changes.length + (changes.length === 1 ? " campo cambiará" : " campos cambiarán") +
        '</summary><div>' +
        changes.map(function(change) {
          return '<div class="mass-import-change">' +
            '<strong>' + escapeHtml(change.etiqueta || change.campo) + '</strong>' +
            '<span><del>' + escapeHtml(formatMassImportValue(change.actual)) +
            '</del><span class="material-symbols-rounded">arrow_forward</span><ins>' +
            escapeHtml(formatMassImportValue(change.propuesto)) + '</ins></span></div>';
        }).join("") +
        '</div></details>';
    }
    if (!errors.length && !warnings.length && !changes.length) {
      detail = '<span class="mass-import-muted">La fila coincide con la información actual.</span>';
    }

    return '<tr>' +
      '<td><strong>' + Number(row.linea || 0) + '</strong></td>' +
      '<td><span class="' + badgeClass + '">' + escapeHtml(massImportActionLabel(action)) + '</span></td>' +
      '<td><strong>' + escapeHtml(row.etiqueta || row.clave || "Registro") + '</strong>' +
        '<small>' + escapeHtml(row.clave || "") + '</small></td>' +
      '<td>' + detail + '</td>' +
      '</tr>';
  }

  function renderMassImportPagination(total, totalPages) {
    if (totalPages <= 1) {
      return '<div class="mass-import-pagination"><small>' +
        Number(total || 0) + ' filas mostradas</small></div>';
    }
    return '<div class="mass-import-pagination">' +
      '<button id="massImportPrevPage" class="button button--ghost button--compact" type="button" ' +
        (MASS_IMPORT_STATE.page <= 1 ? "disabled" : "") + '>Anterior</button>' +
      '<small>Página ' + MASS_IMPORT_STATE.page + ' de ' + totalPages +
        ' · ' + Number(total || 0) + ' filas</small>' +
      '<button id="massImportNextPage" class="button button--ghost button--compact" type="button" ' +
        (MASS_IMPORT_STATE.page >= totalPages ? "disabled" : "") + '>Siguiente</button>' +
      '</div>';
  }

  function renderMassImportApprovalNotice(summary) {
    if (Number(summary.errores || 0) > 0) {
      return '<div class="mass-import-approval-note is-error">' +
        '<span class="material-symbols-rounded">block</span>' +
        '<div><strong>La aprobación está bloqueada</strong>' +
        '<p>Corrige todas las filas con error, vuelve a cargar el archivo y ejecuta otra validación. No se aplicará ninguna fila parcialmente.</p></div></div>';
    }
    if (!summary.aprobable) {
      return '<div class="mass-import-approval-note">' +
        '<span class="material-symbols-rounded">info</span>' +
        '<div><strong>No existen cambios para aplicar</strong>' +
        '<p>El archivo coincide con los datos actuales.</p></div></div>';
    }
    return '<div class="mass-import-approval-note is-ready">' +
      '<span class="material-symbols-rounded">verified</span>' +
      '<div><strong>Archivo listo para aprobación</strong>' +
      '<p>Al aprobar, el servidor volverá a validar todo el contenido y aplicará los cambios de forma atómica.</p></div></div>';
  }

  function bindMassImportPreviewEvents() {
    document.querySelectorAll("[data-mass-import-filter]").forEach(function(button) {
      button.addEventListener("click", function() {
        MASS_IMPORT_STATE.filter = button.getAttribute("data-mass-import-filter") || "TODOS";
        MASS_IMPORT_STATE.page = 1;
        renderMassImportPreview();
      });
    });
    on("massImportPrevPage", "click", function() {
      MASS_IMPORT_STATE.page = Math.max(1, MASS_IMPORT_STATE.page - 1);
      renderMassImportPreview();
    });
    on("massImportNextPage", "click", function() {
      MASS_IMPORT_STATE.page += 1;
      renderMassImportPreview();
    });
    on("massImportDownloadErrorsButton", "click", downloadMassImportErrors);
    on("massImportDownloadCorrectionButton", "click", downloadMassImportCorrectionRows);
    on("massImportDownloadChangesButton", "click", downloadMassImportChanges);
    on("massImportRevalidateButton", "click", function() {
      if (MASS_IMPORT_STATE.config) openMassImportPreview(MASS_IMPORT_STATE.config);
    });
    on("massImportApproveButton", "click", approveMassImportPreview);
  }

  function getMassImportFilteredRows() {
    const rows = MASS_IMPORT_STATE.result && Array.isArray(MASS_IMPORT_STATE.result.filas) ?
      MASS_IMPORT_STATE.result.filas : [];
    const filter = MASS_IMPORT_STATE.filter;
    if (filter === "TODOS") return rows.slice();
    if (filter === "ERROR") {
      return rows.filter(function(row) {
        return Array.isArray(row.errores) && row.errores.length;
      });
    }
    if (filter === "ADVERTENCIA") {
      return rows.filter(function(row) {
        return Array.isArray(row.advertencias) && row.advertencias.length;
      });
    }
    return rows.filter(function(row) {
      return String(row.accion || row.accionBase || "") === filter;
    });
  }

  function approveMassImportPreview() {
    const config = MASS_IMPORT_STATE.config;
    const result = MASS_IMPORT_STATE.result;
    if (!config || !result || !result.resumen || !result.resumen.aprobable) return;
    if (MASS_IMPORT_STATE.busy) return;

    MASS_IMPORT_STATE.busy = true;
    const button = document.getElementById("massImportApproveButton");
    const revalidate = document.getElementById("massImportRevalidateButton");
    if (button) {
      button.disabled = true;
      button.textContent = "Aplicando…";
    }
    if (revalidate) revalidate.disabled = true;
    const note = document.querySelector(".mass-import-approval-note");
    if (note) {
      note.className = "mass-import-approval-note is-processing";
      note.innerHTML = '<span class="spinner" aria-hidden="true"></span>' +
        '<div><strong>Aplicando la importación</strong>' +
        '<p>No cierres esta ventana. Se está revalidando y escribiendo el archivo completo.</p></div>';
    }

    const sequence = MASS_IMPORT_STATE.sequence;
    secureRpc(
      config.approveOperation,
      typeof config.buildApproveArgs === "function" ?
        config.buildApproveArgs(result.token) : [],
      config.moduleCode || ""
    ).then(function(approval) {
      MASS_IMPORT_STATE.busy = false;
      MASS_IMPORT_STATE.approvalResult = approval || {};
      const callback = typeof config.onApproved === "function" ?
        config.onApproved(approval || {}) : null;
      return Promise.resolve(callback).catch(function() {
        return null;
      }).then(function() {
        if (sequence === MASS_IMPORT_STATE.sequence) {
          renderMassImportSuccess();
        }
      });
    }).catch(function(error) {
      MASS_IMPORT_STATE.busy = false;
      if (sequence !== MASS_IMPORT_STATE.sequence) return;
      toast("La importación no fue aplicada", errorMessage(error), true);
      renderMassImportPreview();
    });
  }

  function renderMassImportSuccess() {
    const result = MASS_IMPORT_STATE.approvalResult || {};
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    if (!body || !footer) return;
    text("modalTitle", "Importación completada");

    const generated = Array.isArray(result.registrosGenerados) ?
      result.registrosGenerados : [];
    body.innerHTML = '<div class="mass-import-success">' +
      '<span class="material-symbols-rounded">task_alt</span>' +
      '<div><strong>Los cambios fueron aplicados completamente</strong>' +
      '<p>El proceso se revalidó bajo bloqueo antes de escribir en la base.</p></div>' +
      '</div>' +
      '<div class="mass-import-summary-grid mass-import-summary-grid--result">' +
        '<div class="mass-import-summary-card"><div><strong>' + Number(result.filasLeidas || 0) + '</strong><small>Filas leídas</small></div></div>' +
        '<div class="mass-import-summary-card"><div><strong>' + Number(result.creados || 0) + '</strong><small>Creados</small></div></div>' +
        '<div class="mass-import-summary-card"><div><strong>' + Number(result.actualizados || 0) + '</strong><small>Actualizados</small></div></div>' +
        '<div class="mass-import-summary-card"><div><strong>' + Number(result.sinCambios || 0) + '</strong><small>Sin cambios</small></div></div>' +
      '</div>' +
      (generated.length ?
        '<div class="mass-import-generated"><strong>Códigos internos generados</strong>' +
        '<p>Descarga el resultado para utilizar estos códigos en importaciones relacionadas.</p>' +
        '<ul>' + generated.slice(0, 12).map(function(item) {
          return '<li><code>' + escapeHtml(item.idProveedor || "") + '</code><span>' +
            escapeHtml(item.nombreMostrar || item.razonSocial || "") + '</span></li>';
        }).join("") + '</ul>' +
        (generated.length > 12 ? '<small>Y ' + (generated.length - 12) + ' registros adicionales.</small>' : '') +
        '</div>' : '');

    footer.innerHTML =
      '<button id="massImportDownloadResultButton" class="button button--secondary" type="button">' +
        '<span class="material-symbols-rounded">download</span> Descargar resultado</button>' +
      '<button class="button button--primary" type="button" data-modal-close>Cerrar</button>';
    bindMassImportCloseButtons();
    on("massImportDownloadResultButton", "click", downloadMassImportResult);
  }

  function downloadMassImportErrors() {
    const rows = MASS_IMPORT_STATE.result && Array.isArray(MASS_IMPORT_STATE.result.filas) ?
      MASS_IMPORT_STATE.result.filas : [];
    const output = [];
    rows.forEach(function(row) {
      (row.errores || []).forEach(function(error) {
        output.push([
          MASS_IMPORT_STATE.result.tipo || "",
          row.linea || "",
          row.clave || "",
          error.campo || "",
          error.codigo || "",
          error.mensaje || "",
          error.sugerencia || "",
          JSON.stringify(row.entrada || {})
        ]);
      });
    });
    downloadMassImportCsv(
      "errores_" + massImportSafeFilename(MASS_IMPORT_STATE.result.tipo || "importacion") + ".csv",
      ["TIPO", "LINEA", "CLAVE", "CAMPO", "CODIGO", "ERROR", "SUGERENCIA", "DATOS_ENTRADA"],
      output
    );
  }

  function downloadMassImportCorrectionRows() {
    const rows = MASS_IMPORT_STATE.result && Array.isArray(MASS_IMPORT_STATE.result.filas) ?
      MASS_IMPORT_STATE.result.filas.filter(function(row) {
        return Array.isArray(row.errores) && row.errores.length;
      }) : [];
    const headers = [];
    rows.forEach(function(row) {
      Object.keys(row.entrada || {}).forEach(function(key) {
        if (headers.indexOf(key) === -1) headers.push(key);
      });
    });
    const output = rows.map(function(row) {
      return headers.map(function(header) {
        return row.entrada && row.entrada[header] !== undefined ?
          row.entrada[header] : "";
      });
    });
    downloadMassImportCsv(
      "filas_para_corregir_" +
        massImportSafeFilename(MASS_IMPORT_STATE.result.tipo || "importacion") +
        ".csv",
      headers,
      output
    );
  }

  function downloadMassImportChanges() {
    const rows = MASS_IMPORT_STATE.result && Array.isArray(MASS_IMPORT_STATE.result.filas) ?
      MASS_IMPORT_STATE.result.filas : [];
    const output = [];
    rows.forEach(function(row) {
      if (Array.isArray(row.errores) && row.errores.length) return;
      (row.cambios || []).forEach(function(change) {
        output.push([
          MASS_IMPORT_STATE.result.tipo || "",
          row.linea || "",
          row.accionBase || row.accion || "",
          row.clave || "",
          row.etiqueta || "",
          change.campo || "",
          change.etiqueta || "",
          change.actual === null || change.actual === undefined ? "" : change.actual,
          change.propuesto === null || change.propuesto === undefined ? "" : change.propuesto
        ]);
      });
    });
    downloadMassImportCsv(
      "cambios_" + massImportSafeFilename(MASS_IMPORT_STATE.result.tipo || "importacion") + ".csv",
      ["TIPO", "LINEA", "ACCION", "CLAVE", "REGISTRO", "CAMPO", "ETIQUETA", "VALOR_ACTUAL", "VALOR_PROPUESTO"],
      output
    );
  }

  function downloadMassImportResult() {
    const preview = MASS_IMPORT_STATE.result || {};
    const approval = MASS_IMPORT_STATE.approvalResult || {};
    const generated = {};
    (approval.registrosGenerados || []).forEach(function(item) {
      generated[String(item.linea || "")] = item.idProveedor || "";
    });

    const output = (preview.filas || []).map(function(row) {
      const finalKey = generated[String(row.linea || "")] || row.clave || "";
      return [
        preview.tipo || "",
        row.linea || "",
        row.accionBase || row.accion || "",
        finalKey,
        row.etiqueta || "",
        Array.isArray(row.errores) ? row.errores.length : 0,
        Array.isArray(row.advertencias) ? row.advertencias.length : 0,
        JSON.stringify(row.propuesto || {})
      ];
    });
    downloadMassImportCsv(
      "resultado_" + massImportSafeFilename(preview.tipo || "importacion") + ".csv",
      ["TIPO", "LINEA", "ACCION", "CLAVE_FINAL", "REGISTRO", "ERRORES", "ADVERTENCIAS", "DATOS_APLICADOS"],
      output
    );
  }

  function downloadMassImportCsv(filename, headers, rows) {
    const lines = [headers.map(massImportCsvCell).join(";")];
    (rows || []).forEach(function(row) {
      lines.push((row || []).map(massImportCsvCell).join(";"));
    });
    const content = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function massImportCsvCell(value) {
    let textValue = String(value === null || value === undefined ? "" : value);
    if (/^[=+\-@]/.test(textValue.trimStart())) textValue = "'" + textValue;
    return /[";\r\n]/.test(textValue) ?
      '"' + textValue.replace(/"/g, '""') + '"' : textValue;
  }

  function massImportActionLabel(action) {
    const labels = {
      CREAR: "Crear",
      ACTUALIZAR: "Actualizar",
      SIN_CAMBIOS: "Sin cambios",
      ERROR: "Error",
      ADVERTENCIA: "Advertencia"
    };
    return labels[action] || action || "Sin cambios";
  }

  function formatMassImportValue(value) {
    const textValue = String(value === null || value === undefined ? "" : value);
    return textValue || "Vacío";
  }

  function formatMassImportFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return size + " B";
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
    return (size / (1024 * 1024)).toFixed(2) + " MB";
  }


  function bindMassImportCloseButtons() {
    document.querySelectorAll("[data-modal-close]").forEach(function(button) {
      button.onclick = function() {
        MASS_IMPORT_STATE.sequence += 1;
        MASS_IMPORT_STATE.busy = false;
        closeModal();
      };
    });
  }

  function massImportSafeFilename(value) {
    return String(value || "importacion")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }