/**
 * SGT360 — Permisos y alcances
 *
 * Responsabilidad:
 * Construye permisos jerárquicos por rol, controla accesos, alcances y auditoría de
 * cambios.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Seguridad jerárquica: módulo, acciones, campos y alcance. */
function obtenerPermisosUsuarioMotor_(usuario) {
  usuario = usuario || obtenerUsuarioActual();
  const rolUsuario = normalizarTexto(usuario.rol);

  // SUPERADMIN no depende de filas configurables en SEG_PERMISOS. Todos los
  // recursos activos se conceden de forma implícita y con alcance GLOBAL.
  if (rolUsuario === CONFIG.ROLES.SUPERADMIN) {
    const totales = {};
    listarRecursosSeguridadMotor_().forEach(function(recurso) {
      if (!totales[recurso.modulo]) totales[recurso.modulo] = {};
      totales[recurso.modulo][recurso.codigo] = {
        permitido: true,
        alcance: "GLOBAL"
      };
    });
    return totales;
  }

  const filas = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.PERMISOS_RECURSOS).filter(
    function(item) {
      if (normalizarTexto(item.ESTADO) !== CONFIG.ESTADOS.ACTIVO) return false;
      const tipo = normalizarTexto(item.TIPO_SUJETO);
      const id = String(item.ID_SUJETO || "").trim();
      return (tipo === "ROL" && normalizarTexto(id) === rolUsuario) ||
        (tipo === "USUARIO" && id === usuario.idUsuario);
    });

  const resultado = {};
  filas.sort(function(a, b) {
    return normalizarTexto(a.TIPO_SUJETO) === "ROL" ? -1 : 1;
  }).forEach(function(item) {
    const modulo = normalizarTexto(item.MODULO);
    const recurso = normalizarTexto(item.RECURSO);
    if (!resultado[modulo]) resultado[modulo] = {};
    resultado[modulo][recurso] = {
      permitido: convertirBooleanoMotor_(item.PERMITIDO),
      alcance: normalizarTexto(item.ALCANCE || "PROPIO")
    };
  });
  return resultado;
}

/**
 * Construye contexto seguridad motor. Función interna del motor.
 */
function construirContextoSeguridadMotor_(usuario) {
  usuario = usuario || obtenerUsuarioActual();
  const permisos = obtenerPermisosUsuarioMotor_(usuario);
  const esSuperadmin = normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN;
  const modulosAdministrativos = [
    "ADMIN_GENERAL",
    "ADMIN_USUARIOS",
    "ADMIN_PERMISOS",
    "ADMIN_ESTRUCTURA",
    "ADMIN_CONFIG_APP",
    "ADMIN_AUDITORIA"
  ];
  const puedeAdministrar = esSuperadmin || modulosAdministrativos.some(function(codigo) {
    return Boolean(permisos[codigo] && permisos[codigo].VISUALIZAR_MODULO &&
      permisos[codigo].VISUALIZAR_MODULO.permitido);
  });

  return {
    rol: usuario.rol,
    esSuperadmin: esSuperadmin,
    puedeAdministrar: puedeAdministrar,
    permisos: permisos
  };
}

/**
 * Comprueba permiso motor. Función interna del motor.
 */
function tienePermisoMotor_(modulo, recurso, usuario) {
  usuario = usuario || obtenerUsuarioActual();
  const rol = normalizarTexto(usuario.rol);
  const codigoModulo = normalizarTexto(modulo);
  if (rol === CONFIG.ROLES.SUPERADMIN) return true;

  // Administración general es un módulo exclusivo del SUPERADMIN y no puede
  // delegarse desde la matriz de permisos.
  if (codigoModulo === "ADMIN_GENERAL") return false;

  const permisos = obtenerPermisosUsuarioMotor_(usuario);
  const permiso = permisos[codigoModulo] && permisos[codigoModulo][normalizarTexto(recurso)];
  return Boolean(permiso && permiso.permitido === true);
}

/**
 * Obtiene alcance permiso motor. Función interna del motor.
 */
function obtenerAlcancePermisoMotor_(modulo, recurso, usuario) {
  usuario = usuario || obtenerUsuarioActual();
  if (normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN) return "GLOBAL";
  const permisos = obtenerPermisosUsuarioMotor_(usuario);
  const permiso = permisos[normalizarTexto(modulo)] && permisos[normalizarTexto(modulo)][
    normalizarTexto(recurso)
  ];
  return permiso && permiso.permitido ? permiso.alcance : "NINGUNO";
}

/**
 * Exige permiso motor. Función interna del motor.
 */
function exigirPermisoMotor_(modulo, recurso, usuario) {
  if (!tienePermisoMotor_(modulo, recurso, usuario)) throw new Error("No tienes permiso para " +
    normalizarTexto(recurso) + " en " + normalizarTexto(modulo) + ".");
}

/**
 * Obtiene permisos por rol.
 */
function obtenerPermisosPorRol(rol) {
  const permisos = obtenerPermisosUsuarioMotor_({
    idUsuario: "",
    rol: normalizarTexto(rol)
  });
  const plano = {};
  Object.keys(permisos).forEach(function(modulo) {
    Object.keys(permisos[modulo]).forEach(function(recurso) {
      plano[modulo + "." + recurso] = permisos[modulo][recurso].permitido;
    });
  });
  return plano;
}

/**
 * Lista recursos seguridad motor. Función interna del motor.
 */
function listarRecursosSeguridadMotor_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD).filter(
    function(item) {
      return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    }).map(function(item) {
    return {
      idRecurso: String(item.ID_RECURSO || "").trim(),
      modulo: normalizarTexto(item.MODULO),
      codigo: normalizarTexto(item.CODIGO),
      nombre: String(item.NOMBRE || "").trim(),
      tipo: normalizarTexto(item.TIPO),
      padre: normalizarTexto(item.PADRE),
      orden: Number(item.ORDEN) || 999
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.modulo, b.modulo) || a.orden - b.orden;
  });
}

/**
 * Sincroniza recursos modulo motor. Función interna del motor.
 */
function sincronizarRecursosModuloMotor_(codigoModulo, recursos) {
  const modulo = normalizarTexto(codigoModulo);
  const actuales = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD);
  const porCodigo = {};
  actuales.filter(function(item) {
    return normalizarTexto(item.MODULO) === modulo;
  }).forEach(function(item) {
    porCodigo[normalizarTexto(item.CODIGO)] = item;
  });
  const ahora = new Date();
  (recursos || []).forEach(function(recurso) {
    const codigo = normalizarTexto(recurso.codigo);
    const existente = porCodigo[codigo];
    const objeto = {
      ID_RECURSO: existente ? existente.ID_RECURSO : generarIdMotor_("REC"),
      MODULO: modulo,
      CODIGO: codigo,
      NOMBRE: limpiarTextoMotor_(recurso.nombre || codigo, 180),
      TIPO: normalizarTexto(recurso.tipo || "ACCION"),
      PADRE: Object.prototype.hasOwnProperty.call(recurso, "padre") ?
        normalizarTexto(recurso.padre) : "VISUALIZAR_MODULO",
      ORDEN: Number(recurso.orden) || 999,
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_CREACION: existente ? undefined : ahora,
      FECHA_ACTUALIZACION: ahora
    };
    Object.keys(objeto).forEach(function(k) {
      if (objeto[k] === undefined) delete objeto[k];
    });
    guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD,
      "ID_RECURSO", objeto);
  });
  invalidarCacheMotor_("SECURITY");
}

/**
 * Obtiene matriz permisos administración motor.
 */
function obtenerMatrizPermisosAdminMotor(codigoRol) {
  const rol = obtenerRolActivoPorCodigo(codigoRol);
  if (normalizarTexto(rol.codigo) === CONFIG.ROLES.SUPERADMIN) {
    throw new Error("SUPERADMIN tiene todos los accesos de forma implícita y no se administra desde la matriz de permisos.");
  }

  const recursos = listarRecursosSeguridadMotor_().filter(function(recurso) {
    return recurso.modulo !== "ADMIN_GENERAL";
  });
  const permisos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.PERMISOS_RECURSOS)
    .filter(function(item) {
      return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
        normalizarTexto(item.ID_SUJETO) === rol.codigo &&
        normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    });
  const mapa = {};
  permisos.forEach(function(item) {
    mapa[normalizarTexto(item.MODULO) + "|" + normalizarTexto(item.RECURSO)] = {
      permitido: convertirBooleanoMotor_(item.PERMITIDO),
      alcance: normalizarTexto(item.ALCANCE || "PROPIO")
    };
  });
  return {
    rol: rol,
    alcancesDisponibles: MOTOR_SGT360.ALCANCES.slice(),
    modulos: agruparRecursosMatrizMotor_(recursos, mapa)
  };
}

/**
 * Agrupa recursos matriz motor. Función interna del motor.
 */
function agruparRecursosMatrizMotor_(recursos, mapaPermisos) {
  const modulos = {};
  recursos.forEach(function(recurso) {
    if (!modulos[recurso.modulo]) modulos[recurso.modulo] = {
      codigo: recurso.modulo,
      recursos: []
    };
    const valor = mapaPermisos[recurso.modulo + "|" + recurso.codigo] || {
      permitido: false,
      alcance: "PROPIO"
    };
    modulos[recurso.modulo].recursos.push(Object.assign({}, recurso, valor));
  });
  return Object.keys(modulos).sort().map(function(clave) {
    modulos[clave].recursos.sort(function(a, b) {
      return a.orden - b.orden;
    });
    return modulos[clave];
  });
}

/**
 * Guarda matriz permisos administración motor.
 */
function guardarMatrizPermisosAdminMotor(datos) {
  datos = datos || {};
  const usuarioActual = obtenerUsuarioActual();
  const rol = obtenerRolActivoPorCodigo(datos.rol);

  if (normalizarTexto(rol.codigo) === CONFIG.ROLES.SUPERADMIN) {
    throw new Error("Los permisos de SUPERADMIN son implícitos y no pueden modificarse.");
  }

  const esSuperadmin = normalizarTexto(usuarioActual.rol) === CONFIG.ROLES.SUPERADMIN;
  const rolOperador = obtenerRolActivoPorCodigo(usuarioActual.rol);
  if (!esSuperadmin && Number(rol.nivel) < Number(rolOperador.nivel)) {
    throw new Error(
      "No puedes modificar los permisos de un rol con nivel administrativo superior al tuyo."
    );
  }

  const cambiosSolicitados = Array.isArray(datos.permisos) ? datos.permisos : [];
  if (!cambiosSolicitados.length) {
    return obtenerMatrizPermisosAdminMotor(rol.codigo);
  }

  const puedeDelegar = tienePermisoMotor_(
    "ADMIN_PERMISOS",
    "DELEGAR_PERMISOS",
    usuarioActual
  );
  if (!puedeDelegar && !esSuperadmin) {
    throw new Error("No tienes permiso para delegar permisos.");
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const recursosActivos = listarRecursosSeguridadMotor_();
    const recursosPermitidos = {};
    const recursosPorModulo = {};
    recursosActivos.forEach(function(recurso) {
      const clave = recurso.modulo + "|" + recurso.codigo;
      recursosPermitidos[clave] = true;
      if (!recursosPorModulo[recurso.modulo]) recursosPorModulo[recurso.modulo] = [];
      recursosPorModulo[recurso.modulo].push(recurso.codigo);
    });

    const contexto = obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS,
      ["ID_PERMISO", "TIPO_SUJETO", "ID_SUJETO", "MODULO", "RECURSO"]
    );
    const ultimaFila = contexto.hoja.getLastRow();
    const filasExistentes = ultimaFila >= 2 ?
      contexto.hoja.getRange(
        2,
        1,
        ultimaFila - 1,
        contexto.numeroColumnas
      ).getValues() : [];

    const mapaActual = {};
    filasExistentes.forEach(function(fila, indice) {
      const item = filaAObjetoMotor_(contexto.cabeceras, fila);
      if (normalizarTexto(item.TIPO_SUJETO) !== "ROL") return;
      if (normalizarTexto(item.ID_SUJETO) !== rol.codigo) return;
      mapaActual[
        normalizarTexto(item.MODULO) + "|" + normalizarTexto(item.RECURSO)
      ] = {
        indice: indice,
        fila: fila,
        item: item
      };
    });

    const mapaCambios = {};
    cambiosSolicitados.forEach(function(cambio) {
      const modulo = normalizarTexto(cambio.modulo);
      const recurso = normalizarTexto(cambio.recurso);
      if (!modulo || !recurso || modulo === "ADMIN_GENERAL") return;
      if (!recursosPermitidos[modulo + "|" + recurso]) {
        throw new Error(
          "El recurso " + modulo + "/" + recurso +
          " no está registrado o está inactivo."
        );
      }
      mapaCambios[modulo + "|" + recurso] = {
        modulo: modulo,
        recurso: recurso,
        permitido: cambio.permitido === true,
        alcance: normalizarAlcanceSeguridadMotor_(cambio.alcance || "PROPIO")
      };
    });

    Object.keys(mapaCambios).forEach(function(clave) {
      const cambio = mapaCambios[clave];
      if (cambio.recurso !== "VISUALIZAR_MODULO" || cambio.permitido) return;
      (recursosPorModulo[cambio.modulo] || []).forEach(function(recurso) {
        if (recurso === "VISUALIZAR_MODULO") return;
        const claveHija = cambio.modulo + "|" + recurso;
        const actual = mapaActual[claveHija];
        mapaCambios[claveHija] = {
          modulo: cambio.modulo,
          recurso: recurso,
          permitido: false,
          alcance: actual ?
            normalizarTexto(actual.item.ALCANCE || "PROPIO") :
            "PROPIO"
        };
      });
    });

    const ahora = new Date();
    const filasNuevas = [];
    const auditorias = [];
    let cambiosEfectivos = 0;

    Object.keys(mapaCambios).forEach(function(clave) {
      const cambio = mapaCambios[clave];
      const actual = mapaActual[clave] || null;
      const valorAnterior = actual ?
        convertirBooleanoMotor_(actual.item.PERMITIDO) :
        false;
      const alcanceAnterior = actual ?
        normalizarTexto(actual.item.ALCANCE || "PROPIO") :
        "PROPIO";

      if (!esSuperadmin && cambio.permitido) {
        if (!tienePermisoMotor_(cambio.modulo, cambio.recurso, usuarioActual)) {
          throw new Error(
            "No puedes conceder un permiso que no posees: " +
            cambio.modulo + "/" + cambio.recurso + "."
          );
        }
        const alcanceOperador = obtenerAlcancePermisoMotor_(
          cambio.modulo,
          cambio.recurso,
          usuarioActual
        );
        if (!puedeDelegarAlcanceMotor_(alcanceOperador, cambio.alcance)) {
          throw new Error(
            "No puedes conceder alcance " + cambio.alcance +
            " porque tu alcance para " + cambio.modulo + "/" +
            cambio.recurso + " es " + alcanceOperador + "."
          );
        }
      }

      if (
        valorAnterior === cambio.permitido &&
        alcanceAnterior === cambio.alcance
      ) {
        return;
      }

      const objeto = {
        ID_PERMISO: actual ?
          actual.item.ID_PERMISO :
          generarIdMotor_("PER"),
        TIPO_SUJETO: "ROL",
        ID_SUJETO: rol.codigo,
        MODULO: cambio.modulo,
        RECURSO: cambio.recurso,
        PERMITIDO: cambio.permitido,
        ALCANCE: cambio.alcance,
        ESTADO: CONFIG.ESTADOS.ACTIVO,
        FECHA_CREACION: actual ?
          actual.item.FECHA_CREACION :
          ahora,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
      };

      const filaFinal = objetoAFilaMotor_(
        contexto.cabeceras,
        objeto,
        actual ? actual.fila : undefined
      );
      if (actual) {
        filasExistentes[actual.indice] = filaFinal;
      } else {
        filasNuevas.push(filaFinal);
      }

      auditorias.push([
        generarIdMotor_("AUP"),
        ahora,
        usuarioActual.idUsuario || "",
        usuarioActual.correo || "",
        rol.codigo,
        cambio.modulo,
        cambio.recurso,
        valorAnterior,
        cambio.permitido,
        cambio.alcance,
        "CAMBIO_DESDE_CONSOLA"
      ]);
      cambiosEfectivos++;
    });

    if (!cambiosEfectivos) {
      return obtenerMatrizPermisosAdminMotor(rol.codigo);
    }

    const filasFinales = filasExistentes.concat(filasNuevas);
    if (filasFinales.length) {
      contexto.hoja.getRange(
        2,
        1,
        filasFinales.length,
        contexto.numeroColumnas
      ).setValues(filasFinales);
    }

    const cabecerasAuditoria = [
      "ID_AUDITORIA", "FECHA_HORA", "ID_USUARIO", "CORREO", "ROL_OBJETIVO",
      "MODULO", "RECURSO", "VALOR_ANTERIOR", "VALOR_NUEVO", "ALCANCE", "MOTIVO"
    ];
    const hojaAuditoria = asegurarHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.AUDITORIA_PERMISOS,
      cabecerasAuditoria
    );
    if (auditorias.length) {
      hojaAuditoria.getRange(
        hojaAuditoria.getLastRow() + 1,
        1,
        auditorias.length,
        cabecerasAuditoria.length
      ).setValues(auditorias);
    }

    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    );
    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");

    registrarEventoMotor_({
      modulo: "ADMIN_PERMISOS",
      accion: "CAMBIAR_PERMISOS",
      entidad: "ROL",
      idEntidad: rol.codigo,
      detalle: {
        cambiosSolicitados: cambiosSolicitados.length,
        cambiosEfectivos: cambiosEfectivos
      }
    });

    return obtenerMatrizPermisosAdminMotor(rol.codigo);
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function normalizarAlcanceSeguridadMotor_(alcance) {
  const valor = normalizarTexto(alcance || "PROPIO");
  if (MOTOR_SGT360.ALCANCES.indexOf(valor) === -1) {
    throw new Error("El alcance " + valor + " no está permitido.");
  }
  return valor;
}

/**
 * Determina si un alcance puede delegar otro sin aumentar la visibilidad.
 * @private
 */
function puedeDelegarAlcanceMotor_(alcanceOrigen, alcanceDestino) {
  const origen = normalizarAlcanceSeguridadMotor_(alcanceOrigen);
  const destino = normalizarAlcanceSeguridadMotor_(alcanceDestino);
  const permitidos = {
    GLOBAL: ["GLOBAL", "PROVEEDOR", "GRUPO", "ASIGNADOS", "PROPIO"],
    PROVEEDOR: ["PROVEEDOR", "GRUPO", "ASIGNADOS", "PROPIO"],
    GRUPO: ["GRUPO", "PROPIO"],
    ASIGNADOS: ["ASIGNADOS", "PROPIO"],
    PROPIO: ["PROPIO"]
  };
  return (permitidos[origen] || []).indexOf(destino) !== -1;
}

/**
 * Registra auditoria permiso motor. Función interna del motor.
 */
function registrarAuditoriaPermisoMotor_(usuario, rolObjetivo, modulo, recurso, anterior, nuevo,
  alcance) {
  guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.AUDITORIA_PERMISOS,
  "ID_AUDITORIA", {
    ID_AUDITORIA: generarIdMotor_("AUP"),
    FECHA_HORA: new Date(),
    ID_USUARIO: usuario.idUsuario || "",
    CORREO: usuario.correo || "",
    ROL_OBJETIVO: rolObjetivo,
    MODULO: modulo,
    RECURSO: recurso,
    VALOR_ANTERIOR: anterior,
    VALOR_NUEVO: nuevo,
    ALCANCE: alcance,
    MOTIVO: "CAMBIO_DESDE_CONSOLA"
  });
}

/**
 * Construye una vista previa segura de los accesos asignados a un rol.
 *
 * Esta función no cambia la identidad ni los permisos de la sesión real. Su
 * resultado se utiliza únicamente para reconstruir visualmente el menú y
 * mostrar el detalle de permisos de cada módulo.
 *
 * Requiere que el usuario real sea SUPERADMIN. Los permisos administrativos delegados no habilitan esta función.
 *
 * @param {string} codigoRol Código del rol que se desea visualizar.
 * @return {Object} Rol, módulos visibles, detalle de accesos y resumen.
 */
function obtenerVistaPreviaRolAdminMotor(codigoRol, idUsuarioReferencia) {
  const usuarioActual = obtenerUsuarioActual();
  if (normalizarTexto(usuarioActual.rol) !== CONFIG.ROLES.SUPERADMIN) {
    throw new Error(
      "La opción Visualizar como está disponible únicamente para el superadministrador."
    );
  }

  const rol = obtenerRolActivoPorCodigo(codigoRol);
  if (normalizarTexto(rol.codigo) === CONFIG.ROLES.SUPERADMIN) {
    throw new Error(
      "La vista de SUPERADMIN corresponde a tu vista real y no necesita simulación."
    );
  }

  const usuariosReferencia = leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.USUARIOS
  ).map(mapearUsuarioMotor_).filter(function(usuario) {
    return usuario.estado === CONFIG.ESTADOS.ACTIVO &&
      usuario.rol === rol.codigo;
  }).sort(function(a, b) {
    return compararTextoMotor_(a.nombre, b.nombre);
  }).map(function(usuario) {
    return {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || "",
      idOficina: usuario.idOficina || "",
      idGrupo: usuario.idGrupo || ""
    };
  });

  const solicitado = String(idUsuarioReferencia || "").trim();
  let usuarioReferencia = null;
  if (solicitado) {
    usuarioReferencia = usuariosReferencia.find(function(usuario) {
      return usuario.idUsuario === solicitado;
    }) || null;
    if (!usuarioReferencia) {
      throw new Error(
        "El usuario de referencia no está activo o ya no pertenece al rol seleccionado."
      );
    }
  } else if (usuariosReferencia.length) {
    usuarioReferencia = usuariosReferencia[0];
  }

  const usuarioPermisos = usuarioReferencia || {
    idUsuario: "",
    correo: "",
    nombre: "Sin usuario de referencia",
    telefono: "",
    rol: rol.codigo,
    idProveedor: "",
    idOficina: "",
    idGrupo: "",
    estado: CONFIG.ESTADOS.ACTIVO
  };
  const seguridad = construirContextoSeguridadMotor_(usuarioPermisos);
  const modulosVisibles = listarModulosDisponiblesMotor_(usuarioPermisos, seguridad);
  const recursos = listarRecursosSeguridadMotor_();
  const modulosConfigurados = listarModulosAdminMotor().filter(function(modulo) {
    return normalizarTexto(modulo.estado) === CONFIG.ESTADOS.ACTIVO;
  });

  const detalleModulos = modulosConfigurados.map(function(modulo) {
    const codigoModulo = normalizarTexto(modulo.codigo);
    const permisosModulo = seguridad.permisos[codigoModulo] || {};
    const recursosModulo = recursos.filter(function(recurso) {
      return recurso.modulo === codigoModulo;
    });

    const accesos = recursosModulo.map(function(recurso) {
      const permiso = permisosModulo[recurso.codigo] || null;
      const permitido = Boolean(permiso && permiso.permitido === true);
      return {
        codigo: recurso.codigo,
        nombre: recurso.nombre,
        tipo: recurso.tipo,
        padre: recurso.padre,
        orden: recurso.orden,
        permitido: permitido,
        alcance: permitido ?
          normalizarTexto(permiso.alcance || "PROPIO") :
          "NINGUNO"
      };
    }).sort(function(a, b) {
      return a.orden - b.orden || compararTextoMotor_(a.nombre, b.nombre);
    });

    const visible = modulosVisibles.some(function(item) {
      return item.codigo === codigoModulo;
    });

    return Object.assign({}, modulo, {
      visible: visible,
      accesos: accesos,
      totalAccesos: accesos.length,
      accesosPermitidos: accesos.filter(function(acceso) {
        return acceso.permitido;
      }).length
    });
  }).sort(function(a, b) {
    return a.orden - b.orden || compararTextoMotor_(a.nombre, b.nombre);
  });

  const totalAccesos = detalleModulos.reduce(function(total, modulo) {
    return total + modulo.totalAccesos;
  }, 0);
  const accesosPermitidos = detalleModulos.reduce(function(total, modulo) {
    return total + modulo.accesosPermitidos;
  }, 0);

  registrarEventoMotor_({
    modulo: "ADMIN_PERMISOS",
    accion: "VISUALIZAR_COMO_ROL",
    entidad: "ROL",
    idEntidad: rol.codigo,
    resultado: "OK",
    detalle: {
      idUsuarioReferencia: usuarioReferencia ? usuarioReferencia.idUsuario : "",
      usuariosDisponibles: usuariosReferencia.length
    }
  });

  return {
    rol: rol,
    modo: "SIMULACION_NAVEGABLE_SOLO_LECTURA",
    usuarioReferencia: usuarioReferencia,
    usuariosReferencia: usuariosReferencia,
    requiereUsuarioReferencia: !usuarioReferencia,
    seguridad: seguridad,
    modulos: modulosVisibles,
    detalleModulos: detalleModulos,
    resumen: {
      modulosConfigurados: detalleModulos.length,
      modulosVisibles: modulosVisibles.length,
      modulosOcultos: Math.max(0, detalleModulos.length - modulosVisibles.length),
      totalAccesos: totalAccesos,
      accesosPermitidos: accesosPermitidos,
      accesosDenegados: Math.max(0, totalAccesos - accesosPermitidos)
    },
    mensaje: usuarioReferencia ?
      "Vista simulada construida con un usuario de referencia y sin modificar la sesión real." :
      "El rol no tiene usuarios activos. Selecciona o crea un usuario de referencia para aplicar alcances."
  };
}

