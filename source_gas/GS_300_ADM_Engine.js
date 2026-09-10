/**
 * SGT360 — Motor de administración
 *
 * Responsabilidad:
 * Entrega indicadores y administra parámetros, catálogos y recursos visuales.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Workspace administrativo dinámico. */
function obtenerResumenAdministracionMotor() {
  return {
    usuariosActivos: leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).filter(
      function(item) {
        return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
      }).length,
    rolesActivos: obtenerRolesActivos().length,
    modulosActivos: listarModulosAdminMotor().filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).length,
    sesionesAbiertas: contarSesionesVigentesAuditoriaPaso24A_(),
    entorno: obtenerPropiedadMotor_(PROPIEDADES_MOTOR_SGT360.ENVIRONMENT, "DESARROLLO")
  };
}


/**
 * Lista los registros consolidados de auditoría para el módulo independiente.
 * La respuesta combina accesos, eventos y cambios de permisos sin modificar
 * las hojas originales.
 *
 * @param {Object} filtros Tipo, texto, página y tamaño.
 * @return {Object} Resultado paginado ordenado de más reciente a más antiguo.
 */
function listarAuditoriaAdminMotor(filtros) {
  filtros = filtros || {};
  const tipo = normalizarTexto(filtros.tipo || "TODOS");
  const texto = normalizarTexto(filtros.texto || "");
  const registros = [];

  if (tipo === "TODOS" || tipo === "ACCESOS") {
    leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.AUDITORIA_ACCESOS)
      .forEach(function(item) {
        registros.push({
          id: String(item.ID_AUDITORIA_ACCESO || "").trim(),
          tipo: "ACCESO",
          fecha: formatearFechaAuditoriaMotor_(item.FECHA_HORA),
          fechaOrden: obtenerMarcaTiempoAuditoriaMotor_(item.FECHA_HORA),
          correo: normalizarCorreo(item.CORREO),
          rol: normalizarTexto(item.ROL),
          modulo: normalizarTexto(item.MODULO),
          accion: normalizarTexto(item.ACCION),
          entidad: "SESIÓN",
          idEntidad: String(item.ID_SESION || "").trim(),
          resultado: normalizarTexto(item.RESULTADO),
          detalle: String(item.MOTIVO || item.DETALLE || "").trim(),
          origen: String(item.ORIGEN || "").trim()
        });
      });
  }

  if (tipo === "TODOS" || tipo === "EVENTOS") {
    leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.AUDITORIA_EVENTOS)
      .forEach(function(item) {
        registros.push({
          id: String(item.ID_EVENTO || "").trim(),
          tipo: "EVENTO",
          fecha: formatearFechaAuditoriaMotor_(item.FECHA_HORA),
          fechaOrden: obtenerMarcaTiempoAuditoriaMotor_(item.FECHA_HORA),
          correo: normalizarCorreo(item.CORREO),
          rol: normalizarTexto(item.ROL),
          modulo: normalizarTexto(item.MODULO),
          accion: normalizarTexto(item.ACCION),
          entidad: normalizarTexto(item.ENTIDAD),
          idEntidad: String(item.ID_ENTIDAD || "").trim(),
          resultado: normalizarTexto(item.RESULTADO),
          detalle: String(item.DETALLE || "").trim(),
          origen: ""
        });
      });
  }

  if (tipo === "TODOS" || tipo === "PERMISOS") {
    leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.AUDITORIA_PERMISOS)
      .forEach(function(item) {
        registros.push({
          id: String(item.ID_AUDITORIA || "").trim(),
          tipo: "PERMISO",
          fecha: formatearFechaAuditoriaMotor_(item.FECHA_HORA),
          fechaOrden: obtenerMarcaTiempoAuditoriaMotor_(item.FECHA_HORA),
          correo: normalizarCorreo(item.CORREO),
          rol: normalizarTexto(item.ROL_OBJETIVO),
          modulo: normalizarTexto(item.MODULO),
          accion: normalizarTexto(item.RECURSO),
          entidad: "ROL",
          idEntidad: normalizarTexto(item.ROL_OBJETIVO),
          resultado: convertirBooleanoMotor_(item.VALOR_NUEVO) ? "PERMITIDO" : "DENEGADO",
          detalle: "Alcance: " + normalizarTexto(item.ALCANCE || "NINGUNO") +
            (item.MOTIVO ? " · " + String(item.MOTIVO) : ""),
          origen: ""
        });
      });
  }

  const filtrados = registros.filter(function(item) {
    if (!texto) return true;
    return normalizarTexto([
      item.tipo, item.fecha, item.correo, item.rol, item.modulo, item.accion,
      item.entidad, item.idEntidad, item.resultado, item.detalle, item.origen
    ].join(" ")).indexOf(texto) !== -1;
  }).sort(function(a, b) {
    return b.fechaOrden - a.fechaOrden;
  }).map(function(item) {
    const copia = Object.assign({}, item);
    delete copia.fechaOrden;
    return copia;
  });

  return paginarArregloMotor_(filtrados, filtros.pagina, Math.min(200, Number(filtros.tamano) || 100));
}

/** @private */
function obtenerMarcaTiempoAuditoriaMotor_(valor) {
  if (valor instanceof Date) return valor.getTime();
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? 0 : fecha.getTime();
}

/** @private */
function formatearFechaAuditoriaMotor_(valor) {
  const marca = obtenerMarcaTiempoAuditoriaMotor_(valor);
  if (!marca) return String(valor || "").trim();
  return Utilities.formatDate(new Date(marca), Session.getScriptTimeZone() || "America/Lima",
    "yyyy-MM-dd HH:mm:ss");
}


/**
 * Cuenta sesiones realmente vigentes para los indicadores administrativos.
 * Una fila ABIERTA pero vencida deja de considerarse activa.
 * @return {number}
 * @private
 */
function contarSesionesVigentesAuditoriaPaso24A_() {
  try {
    return obtenerSesionesMapeadasAuditoriaPaso24A_().filter(function(sesion) {
      return sesion.estadoOperativo === "VIGENTE";
    }).length;
  } catch (error) {
    console.warn("No fue posible contar sesiones vigentes: %s", error.message);
    return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.SESIONES_USUARIOS)
      .filter(function(item) {
        return normalizarTexto(item.ESTADO) === "ABIERTA";
      }).length;
  }
}

/**
 * Lista sesiones técnicas para la sección Sesiones activas de Auditoría.
 * No expone tokens; solo muestra el ID técnico de sesión, que es un hash.
 *
 * @param {Object=} filtros Texto, estado, página y tamaño.
 * @return {Object} Sesiones paginadas y resumen por estado.
 */
function listarSesionesAuditoriaAdminMotor(filtros) {
  filtros = filtros || {};
  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "ACTIVAS");
  const sesiones = obtenerSesionesMapeadasAuditoriaPaso24A_();
  const resumen = sesiones.reduce(function(acumulado, sesion) {
    acumulado.total += 1;
    acumulado[sesion.estadoOperativo] = (acumulado[sesion.estadoOperativo] || 0) + 1;
    if (sesion.estado === "ABIERTA") acumulado.abiertas += 1;
    if (sesion.estadoOperativo === "VIGENTE") acumulado.vigentes += 1;
    if (sesion.estadoOperativo === "VENCIDA") acumulado.vencidas += 1;
    return acumulado;
  }, {
    total: 0,
    abiertas: 0,
    vigentes: 0,
    vencidas: 0
  });

  const filtradas = sesiones.filter(function(sesion) {
    if (!cumpleFiltroEstadoSesionAuditoriaPaso24A_(sesion, estado)) return false;
    if (!texto) return true;
    return normalizarTexto([
      sesion.idSesion,
      sesion.idSesionEnmascarado,
      sesion.idUsuario,
      sesion.nombre,
      sesion.correo,
      sesion.rol,
      sesion.nombreRol,
      sesion.proveedorIdentidad,
      sesion.moduloActual,
      sesion.estado,
      sesion.estadoOperativo,
      sesion.actividad,
      sesion.navegador
    ].join(" ")).indexOf(texto) !== -1;
  }).sort(function(a, b) {
    return b.ultimaActividadOrden - a.ultimaActividadOrden ||
      b.fechaInicioOrden - a.fechaInicioOrden || compararTextoMotor_(a.correo, b.correo);
  }).map(function(sesion) {
    return limpiarSesionRespuestaAuditoriaPaso24A_(sesion);
  });

  const pagina = paginarArregloMotor_(filtradas, filtros.pagina, Math.min(200, Number(filtros.tamano) || 100));
  pagina.total = pagina.paginacion.total;
  pagina.resumen = resumen;
  pagina.filtroEstado = estado;
  pagina.paso = "24A";
  return pagina;
}

/**
 * Obtiene el detalle de una sesión y su historial de accesos relacionado.
 *
 * @param {string} idSesion ID técnico de sesión.
 * @return {Object} Detalle de sesión y auditoría asociada.
 */
function obtenerDetalleSesionAuditoriaAdminMotor(idSesion) {
  const id = normalizarIdSesionAuditoriaPaso24A_(idSesion);
  const sesion = obtenerSesionesMapeadasAuditoriaPaso24A_().find(function(item) {
    return normalizarTexto(item.idSesion) === normalizarTexto(id);
  });
  if (!sesion) throw new Error("No se encontró la sesión solicitada.");

  const auditoria = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.AUDITORIA_ACCESOS)
    .filter(function(item) {
      return normalizarTexto(item.ID_SESION) === normalizarTexto(id);
    }).map(function(item) {
      return {
        id: String(item.ID_AUDITORIA_ACCESO || "").trim(),
        fecha: formatearFechaAuditoriaMotor_(item.FECHA_HORA),
        fechaOrden: obtenerMarcaTiempoAuditoriaMotor_(item.FECHA_HORA),
        correo: normalizarCorreo(item.CORREO),
        rol: normalizarTexto(item.ROL),
        modulo: normalizarTexto(item.MODULO),
        accion: normalizarTexto(item.ACCION),
        resultado: normalizarTexto(item.RESULTADO),
        motivo: String(item.MOTIVO || "").trim(),
        origen: String(item.ORIGEN || "").trim(),
        detalle: String(item.DETALLE || "").trim()
      };
    }).sort(function(a, b) {
      return b.fechaOrden - a.fechaOrden;
    }).slice(0, 80).map(function(item) {
      const copia = Object.assign({}, item);
      delete copia.fechaOrden;
      return copia;
    });

  return {
    correcto: true,
    paso: "24A",
    sesion: limpiarSesionRespuestaAuditoriaPaso24A_(sesion),
    auditoria: auditoria
  };
}

/**
 * Fuerza el cierre de una sesión desde Auditoría.
 * La sesión actual del administrador no se cierra desde esta acción para evitar
 * cortar la propia operación de gestión.
 *
 * @param {Object} datos ID de sesión y motivo opcional.
 * @return {Object} Resultado de cierre.
 */
function cerrarSesionAuditoriaAdminMotor(datos) {
  datos = datos || {};
  const idSesion = normalizarIdSesionAuditoriaPaso24A_(datos.idSesion);
  const motivo = limpiarTextoMotor_(datos.motivo || "Cierre forzado desde Auditoría", 500);
  const actor = obtenerUsuarioActual();
  const sesionActual = typeof obtenerSesionEjecucionRpcMotor_ === "function" ?
    obtenerSesionEjecucionRpcMotor_() : null;

  if (sesionActual && normalizarTexto(sesionActual.idSesion) === normalizarTexto(idSesion)) {
    throw new Error("No puedes forzar el cierre de la sesión que estás usando. Usa Cerrar sesión o cambia de cuenta.");
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const contexto = obtenerContextoSesionesPaso13D1_();
    const fila = buscarFilaSesionPaso13D1_(contexto, idSesion);
    if (!fila) throw new Error("No se encontró la sesión solicitada.");
    const sesion = leerSesionPaso13D1_(contexto, fila);
    if (sesion.estado !== AUTH_PASO_13D1.ESTADO_ABIERTO) {
      return {
        correcto: true,
        paso: "24A",
        sesionCerrada: false,
        estadoAnterior: sesion.estado,
        estado: sesion.estado,
        idSesion: idSesion,
        mensaje: "La sesión ya no estaba abierta."
      };
    }

    const ahora = new Date();
    actualizarEstadoSesionPaso13D1_(contexto, fila, AUTH_ACCIONES_PASO_13E1.ESTADO_CERRADO, ahora);
    insertarAuditoriaOAuthSinBloqueoPaso13C_({
      usuario: {
        idUsuario: sesion.idUsuario,
        correo: sesion.correo,
        rol: sesion.rol
      },
      accion: "FORZAR_CIERRE_SESION_ADMIN",
      resultado: AUTH_PASO_13C.RESULTADOS_AUDITORIA.AUTORIZADO,
      motivo: motivo,
      origen: "ADMIN_AUDITORIA",
      idSesion: idSesion,
      detalle: {
        administrador: actor.correo,
        idUsuarioAdministrador: actor.idUsuario,
        rolAdministrador: actor.rol,
        estadoAnterior: sesion.estado,
        estadoNuevo: AUTH_ACCIONES_PASO_13E1.ESTADO_CERRADO,
        moduloAnterior: sesion.moduloActual,
        fechaCierre: ahora.toISOString()
      }
    });
    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");

    return {
      correcto: true,
      paso: "24A",
      sesionCerrada: true,
      estadoAnterior: sesion.estado,
      estado: AUTH_ACCIONES_PASO_13E1.ESTADO_CERRADO,
      idSesion: idSesion,
      fechaCierre: ahora.toISOString(),
      mensaje: "La sesión fue cerrada por el administrador."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Cierra todas las sesiones abiertas de un usuario, excepto la sesión actual
 * del administrador que ejecuta la acción.
 *
 * @param {Object} datos idUsuario o correo y motivo opcional.
 * @return {Object} Resultado consolidado.
 */
function cerrarSesionesUsuarioAuditoriaAdminMotor(datos) {
  datos = datos || {};
  const idUsuario = String(datos.idUsuario || "").trim();
  const correo = normalizarCorreo(datos.correo || "");
  if (!idUsuario && !correo) throw new Error("Indica el usuario cuyas sesiones se cerrarán.");

  const motivo = limpiarTextoMotor_(datos.motivo || "Cierre forzado de sesiones del usuario desde Auditoría", 500);
  const actor = obtenerUsuarioActual();
  const sesionActual = typeof obtenerSesionEjecucionRpcMotor_ === "function" ?
    obtenerSesionEjecucionRpcMotor_() : null;
  const idSesionActual = sesionActual ? normalizarTexto(sesionActual.idSesion) : "";
  const cerradas = [];
  const omitidas = [];

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const contexto = obtenerContextoSesionesPaso13D1_();
    const ultimaFila = contexto.hoja.getLastRow();
    if (ultimaFila < 2) return { correcto: true, paso: "24A", sesionesCerradas: 0, omitidas: [] };
    const filas = contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas).getValues();
    filas.forEach(function(filaValores, indice) {
      const numeroFila = indice + 2;
      const idSesion = String(filaValores[contexto.mapa.ID_SESION] || "").trim();
      const coincideUsuario = idUsuario ? String(filaValores[contexto.mapa.ID_USUARIO] || "").trim() === idUsuario :
        normalizarCorreo(filaValores[contexto.mapa.CORREO]) === correo;
      if (!coincideUsuario) return;
      if (normalizarTexto(idSesion) === idSesionActual) {
        omitidas.push({ idSesion: idSesion, motivo: "SESION_ACTUAL" });
        return;
      }
      const sesion = leerSesionPaso13D1_(contexto, numeroFila);
      if (sesion.estado !== AUTH_PASO_13D1.ESTADO_ABIERTO) return;
      const ahora = new Date();
      actualizarEstadoSesionPaso13D1_(contexto, numeroFila, AUTH_ACCIONES_PASO_13E1.ESTADO_CERRADO, ahora);
      insertarAuditoriaOAuthSinBloqueoPaso13C_({
        usuario: { idUsuario: sesion.idUsuario, correo: sesion.correo, rol: sesion.rol },
        accion: "FORZAR_CIERRE_SESIONES_USUARIO_ADMIN",
        resultado: AUTH_PASO_13C.RESULTADOS_AUDITORIA.AUTORIZADO,
        motivo: motivo,
        origen: "ADMIN_AUDITORIA",
        idSesion: idSesion,
        detalle: {
          administrador: actor.correo,
          idUsuarioAdministrador: actor.idUsuario,
          rolAdministrador: actor.rol,
          estadoAnterior: sesion.estado,
          estadoNuevo: AUTH_ACCIONES_PASO_13E1.ESTADO_CERRADO,
          fechaCierre: ahora.toISOString()
        }
      });
      cerradas.push(idSesion);
    });
    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");
    return {
      correcto: true,
      paso: "24A",
      sesionesCerradas: cerradas.length,
      sesiones: cerradas,
      omitidas: omitidas,
      mensaje: "Sesiones cerradas: " + cerradas.length + "."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function obtenerSesionesMapeadasAuditoriaPaso24A_() {
  const usuarios = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS);
  const usuariosPorId = {};
  const usuariosPorCorreo = {};
  usuarios.forEach(function(usuario) {
    const id = String(usuario.ID_USUARIO || "").trim();
    const correo = normalizarCorreo(usuario.CORREO);
    if (id) usuariosPorId[id] = usuario;
    if (correo) usuariosPorCorreo[correo] = usuario;
  });

  const roles = {};
  try {
    obtenerRolesActivos().forEach(function(rol) {
      roles[normalizarTexto(rol.codigo)] = rol.nombre || rol.codigo;
    });
  } catch (error) {}

  const horasSesion = obtenerHorasSesionAuditoriaPaso24A_();
  const ahora = Date.now();
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.SESIONES_USUARIOS)
    .map(function(item) {
      return mapearSesionAuditoriaPaso24A_(item, {
        usuariosPorId: usuariosPorId,
        usuariosPorCorreo: usuariosPorCorreo,
        roles: roles,
        horasSesion: horasSesion,
        ahora: ahora
      });
    });
}

/** @private */
function mapearSesionAuditoriaPaso24A_(item, contexto) {
  const idSesion = String(item.ID_SESION || "").trim();
  const idUsuario = String(item.ID_USUARIO || "").trim();
  const correo = normalizarCorreo(item.CORREO);
  const usuario = contexto.usuariosPorId[idUsuario] || contexto.usuariosPorCorreo[correo] || {};
  const rol = normalizarTexto(item.ROL || usuario.ROL);
  const fechaInicio = convertirFechaSesionAuditoriaPaso24A_(item.FECHA_INICIO);
  const ultimaActividad = convertirFechaSesionAuditoriaPaso24A_(item.ULTIMA_ACTIVIDAD);
  const fechaFin = convertirFechaSesionAuditoriaPaso24A_(item.FECHA_FIN);
  const fechaExpiracion = fechaInicio ? new Date(fechaInicio.getTime() + contexto.horasSesion * 60 * 60 * 1000) : null;
  const estado = normalizarTexto(item.ESTADO || "");
  const expiraEn = fechaExpiracion ? fechaExpiracion.getTime() : 0;
  const ultima = ultimaActividad ? ultimaActividad.getTime() : 0;
  const vigente = estado === "ABIERTA" && expiraEn > contexto.ahora;
  const vencida = estado === "ABIERTA" && Boolean(expiraEn) && expiraEn <= contexto.ahora;
  let estadoOperativo = estado || "SIN_ESTADO";
  if (vigente) estadoOperativo = "VIGENTE";
  if (vencida) estadoOperativo = "VENCIDA";

  const heartbeat = typeof AUTH_PASO_13D1 !== "undefined" && AUTH_PASO_13D1.SEGUNDOS_HEARTBEAT ?
    Number(AUTH_PASO_13D1.SEGUNDOS_HEARTBEAT) : 120;
  const margenReciente = heartbeat * 3 * 1000;
  const actividad = vigente ?
    (ultima && contexto.ahora - ultima <= margenReciente ? "RECIENTE" : "SIN ACTIVIDAD RECIENTE") : "";

  return {
    idSesion: idSesion,
    idSesionEnmascarado: typeof enmascararIdSesionOAuthPaso13C_ === "function" ?
      enmascararIdSesionOAuthPaso13C_(idSesion) : idSesion,
    idUsuario: idUsuario,
    correo: correo,
    nombre: String(usuario.NOMBRE || "").trim(),
    rol: rol,
    nombreRol: contexto.roles[rol] || rol,
    proveedorIdentidad: normalizarProveedorSesionAuditoriaPaso24A_(item.ORIGEN),
    origen: String(item.ORIGEN || "").trim(),
    moduloActual: normalizarTexto(item.MODULO_ACTUAL || ""),
    estado: estado,
    estadoOperativo: estadoOperativo,
    actividad: actividad,
    fechaInicio: formatearFechaSesionAuditoriaPaso24A_(fechaInicio),
    ultimaActividad: formatearFechaSesionAuditoriaPaso24A_(ultimaActividad),
    fechaFin: formatearFechaSesionAuditoriaPaso24A_(fechaFin),
    fechaExpiracion: formatearFechaSesionAuditoriaPaso24A_(fechaExpiracion),
    fechaInicioOrden: fechaInicio ? fechaInicio.getTime() : 0,
    ultimaActividadOrden: ultima,
    fechaExpiracionOrden: expiraEn,
    minutosDesdeActividad: ultima ? Math.max(0, Math.floor((contexto.ahora - ultima) / 60000)) : null,
    navegador: resumirUserAgentAuditoriaPaso24A_(item.USER_AGENT),
    userAgent: String(item.USER_AGENT || "").trim(),
    puedeCerrar: estado === "ABIERTA"
  };
}

/** @private */
function cumpleFiltroEstadoSesionAuditoriaPaso24A_(sesion, estadoFiltro) {
  switch (normalizarTexto(estadoFiltro || "ACTIVAS")) {
    case "TODAS":
      return true;
    case "VIGENTES":
      return sesion.estadoOperativo === "VIGENTE";
    case "VENCIDAS":
      return sesion.estadoOperativo === "VENCIDA";
    case "CERRADAS":
      return sesion.estado === "CERRADA";
    case "EXPIRADAS":
      return sesion.estado === "EXPIRADA";
    case "BLOQUEADAS":
      return sesion.estado === "BLOQUEADA";
    case "ACTIVAS":
    default:
      return sesion.estado === "ABIERTA";
  }
}

/** @private */
function limpiarSesionRespuestaAuditoriaPaso24A_(sesion) {
  const copia = Object.assign({}, sesion);
  delete copia.fechaInicioOrden;
  delete copia.ultimaActividadOrden;
  delete copia.fechaExpiracionOrden;
  return copia;
}

/** @private */
function normalizarIdSesionAuditoriaPaso24A_(idSesion) {
  const id = String(idSesion || "").trim().toUpperCase();
  if (!/^SES-[A-F0-9]{64}$/.test(id)) {
    throw new Error("El ID de sesión no tiene un formato válido.");
  }
  return id;
}

/** @private */
function obtenerHorasSesionAuditoriaPaso24A_() {
  try {
    return Math.max(1, Number(obtenerConfiguracionPrivadaOAuthPaso13C_().horasSesion) || 8);
  } catch (error) {
    return 8;
  }
}

/** @private */
function convertirFechaSesionAuditoriaPaso24A_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  }
  if (valor === null || valor === undefined || String(valor).trim() === "") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** @private */
function formatearFechaSesionAuditoriaPaso24A_(valor) {
  const fecha = convertirFechaSesionAuditoriaPaso24A_(valor);
  if (!fecha) return "";
  return Utilities.formatDate(fecha, Session.getScriptTimeZone() || "America/Lima",
    "yyyy-MM-dd HH:mm:ss");
}

/** @private */
function normalizarProveedorSesionAuditoriaPaso24A_(origen) {
  const valor = normalizarTexto(origen || "");
  if (valor === "OAUTH_MICROSOFT") return "MICROSOFT";
  if (valor === "OAUTH_GOOGLE") return "GOOGLE";
  return valor || "—";
}

/** @private */
function resumirUserAgentAuditoriaPaso24A_(userAgent) {
  const texto = String(userAgent || "");
  if (!texto) return "";
  let navegador = "Navegador";
  if (/Edg\//i.test(texto)) navegador = "Edge";
  else if (/Chrome\//i.test(texto)) navegador = "Chrome";
  else if (/Firefox\//i.test(texto)) navegador = "Firefox";
  else if (/Safari\//i.test(texto)) navegador = "Safari";

  let sistema = "";
  if (/Windows/i.test(texto)) sistema = "Windows";
  else if (/Android/i.test(texto)) sistema = "Android";
  else if (/iPhone|iPad/i.test(texto)) sistema = "iOS";
  else if (/Mac OS|Macintosh/i.test(texto)) sistema = "macOS";
  else if (/Linux/i.test(texto)) sistema = "Linux";

  return navegador + (sistema ? " · " + sistema : "");
}

/**
 * Obtiene parametro motor. Función interna del motor.
 */
function obtenerParametroMotor_(clave, valorPredeterminado) {
  const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS, false);
  if (!hoja || hoja.getLastRow() < 2) return valorPredeterminado;
  const registro = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS).find(
    function(item) {
      return normalizarTexto(item.CLAVE) === normalizarTexto(clave) && normalizarTexto(item
        .ESTADO) === CONFIG.ESTADOS.ACTIVO;
    });
  return registro ? registro.VALOR : valorPredeterminado;
}

/**
 * Lista parametros administración motor.
 */
function listarParametrosAdminMotor() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS).map(function(item) {
    return {
      clave: normalizarTexto(item.CLAVE),
      valor: String(item.VALOR || ""),
      descripcion: String(item.DESCRIPCION || ""),
      tipo: normalizarTexto(item.TIPO || "TEXT"),
      editable: convertirBooleanoMotor_(item.EDITABLE),
      estado: normalizarTexto(item.ESTADO)
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.clave, b.clave);
  });
}

/**
 * Guarda parametro administración motor.
 */
function guardarParametroAdminMotor(datos) {
  datos = datos || {};
  const clave = normalizarTexto(datos.clave);
  if (!clave) throw new Error("La clave del parámetro es obligatoria.");
  const existente = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS).find(
    function(item) {
      return normalizarTexto(item.CLAVE) === clave;
    });
  if (existente && !convertirBooleanoMotor_(existente.EDITABLE)) throw new Error(
    "El parámetro no es editable desde la consola.");

  if (["APP_REFRESH_ENABLED", "APP_REFRESH_SECONDS"].indexOf(clave) !== -1) {
    const usuarioActual = obtenerUsuarioActual();
    if (normalizarTexto(usuarioActual.rol) !== CONFIG.ROLES.SUPERADMIN) {
      throw new Error("Solo SUPERADMIN puede modificar la actualización automática.");
    }
  }
  let valor = limpiarTextoMotor_(datos.valor, 3000);
  let tipo = normalizarTexto(datos.tipo || "TEXT");

  if (clave === "APP_REFRESH_ENABLED") {
    valor = convertirBooleanoMotor_(datos.valor) ? "TRUE" : "FALSE";
    tipo = "BOOLEAN";
  }

  if (clave === "APP_REFRESH_SECONDS") {
    const segundos = Number(datos.valor);
    if (!isFinite(segundos) || segundos < 60) {
      throw new Error("El intervalo de actualización debe ser de 60 segundos o más.");
    }
    valor = String(Math.floor(segundos));
    tipo = "NUMBER";
  }

  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS, "CLAVE", {
    CLAVE: clave,
    VALOR: valor,
    DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 500),
    TIPO: tipo,
    EDITABLE: datos.editable !== false,
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_ACTUALIZACION: new Date()
  });
  invalidarCacheMotor_("CONFIG");
  return listarParametrosAdminMotor().find(function(item) {
    return item.clave === clave;
  });
}

/**
 * Lista catalogos administración motor.
 */
function listarCatalogosAdminMotor() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS).map(function(item) {
    return {
      idCatalogo: String(item.ID_CATALOGO || "").trim(),
      codigo: normalizarTexto(item.CODIGO),
      nombre: String(item.NOMBRE || "").trim(),
      descripcion: String(item.DESCRIPCION || "").trim(),
      estado: normalizarTexto(item.ESTADO)
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.nombre, b.nombre);
  });
}

/**
 * Guarda catalogo administración motor.
 */
function guardarCatalogoAdminMotor(datos) {
  datos = datos || {};
  const codigo = normalizarTexto(datos.codigo).replace(/[^A-Z0-9_]/g, "_");
  if (!codigo) throw new Error("El código del catálogo es obligatorio.");
  const existente = listarCatalogosAdminMotor().find(function(item) {
    return item.codigo === codigo;
  });
  const idCatalogo = String(datos.idCatalogo || "").trim() || (existente ? existente.idCatalogo :
    generarIdMotor_("CAT"));
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS, "ID_CATALOGO", {
    ID_CATALOGO: idCatalogo,
    CODIGO: codigo,
    NOMBRE: limpiarTextoMotor_(datos.nombre || codigo, 120),
    DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 500),
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_ACTUALIZACION: new Date()
  });
  return listarCatalogosAdminMotor().find(function(item) {
    return item.idCatalogo === idCatalogo;
  });
}

/**
 * Lista valores catalogo administración motor.
 */
function asegurarColumnasRelacionCatalogosAdminMotor_() {
  asegurarHojaMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.CATALOGO_VALORES,
    [
      "ID_VALOR",
      "CATALOGO",
      "CODIGO",
      "NOMBRE",
      "ORDEN",
      "ESTADO",
      "CLAVE_PADRE",
      "VALOR_PADRE",
      "METADATA_JSON",
      "FECHA_CREACION",
      "FECHA_ACTUALIZACION"
    ]
  );
}

/** @private */
function esCatalogoArbolMaterialAdminMotor_(catalogo) {
  return [
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL"
  ].indexOf(normalizarTexto(catalogo)) !== -1;
}

/** @private */
function leerMetadataCatalogoAdminMotor_(valor) {
  try {
    return valor ? JSON.parse(String(valor)) : {};
  } catch (error) {
    return {};
  }
}

/** @private */
function obtenerValorActivoCatalogoAdminMotor_(catalogo, codigo) {
  const buscado = normalizarTexto(codigo || "");
  if (!buscado) return null;

  return listarValoresCatalogoAdminMotor(catalogo).find(function(item) {
    return item.codigo === buscado &&
      item.estado === CONFIG.ESTADOS.ACTIVO;
  }) || null;
}

/**
 * Lista valores de catálogo.
 *
 * Para los tres catálogos de tipificación de Materiales y Precios también
 * devuelve la relación jerárquica:
 * Producto principal -> Tipo -> Subtipo.
 */
function listarValoresCatalogoAdminMotor(codigoCatalogo) {
  asegurarColumnasRelacionCatalogosAdminMotor_();

  const codigo = normalizarTexto(codigoCatalogo);
  const jerarquico = esCatalogoArbolMaterialAdminMotor_(codigo);

  const valores = leerTablaMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.CATALOGO_VALORES
  ).filter(function(item) {
    return normalizarTexto(item.CATALOGO) === codigo;
  }).map(function(item) {
    const metadata = leerMetadataCatalogoAdminMotor_(item.METADATA_JSON);

    return {
      idValor: String(item.ID_VALOR || "").trim(),
      catalogo: codigo,
      codigo: normalizarTexto(item.CODIGO),
      nombre: String(item.NOMBRE || "").trim(),
      orden: Number(item.ORDEN) || 999,
      estado: normalizarTexto(item.ESTADO),
      clavePadre: normalizarTexto(item.CLAVE_PADRE || ""),
      valorPadre: normalizarTexto(item.VALOR_PADRE || ""),
      metadata: metadata
    };
  });

  valores.sort(function(a, b) {
    if (jerarquico) {
      return compararTextoMotor_(a.nombre || a.codigo, b.nombre || b.codigo);
    }

    return a.orden - b.orden ||
      compararTextoMotor_(a.nombre || a.codigo, b.nombre || b.codigo);
  });

  return valores;
}

/**
 * Guarda valor catálogo administración motor.
 *
 * Regla especial para Materiales y Precios:
 * - MP_PRODUCTOS_PRINCIPALES es la raíz funcional del árbol.
 * - MP_TIPOS_MATERIAL exige un Producto principal padre.
 * - MP_SUBTIPOS_MATERIAL exige un Tipo padre y hereda su Producto principal.
 */
function guardarValorCatalogoAdminMotor(codigoCatalogo, datos) {
  datos = datos || {};
  asegurarColumnasRelacionCatalogosAdminMotor_();

  const catalogo = normalizarTexto(codigoCatalogo);
  const codigo = normalizarTexto(datos.codigo).replace(/[^A-Z0-9_]/g, "_");

  if (!catalogo || !codigo) {
    throw new Error("Catálogo y código son obligatorios.");
  }

  const valoresActuales = listarValoresCatalogoAdminMotor(catalogo);
  const existentePorId = String(datos.idValor || "").trim() ?
    valoresActuales.find(function(item) {
      return item.idValor === String(datos.idValor || "").trim();
    }) || null :
    null;
  const existentePorCodigo = valoresActuales.find(function(item) {
    return item.codigo === codigo;
  }) || null;

  if (
    existentePorCodigo &&
    existentePorId &&
    existentePorCodigo.idValor !== existentePorId.idValor
  ) {
    throw new Error(
      "Ya existe otro valor con el código " + codigo + " en este catálogo."
    );
  }

  const existente = existentePorId || existentePorCodigo;
  const idValor = existente ?
    existente.idValor :
    generarIdMotor_("VAL");

  let clavePadre = existente ? existente.clavePadre : "";
  let valorPadre = existente ? existente.valorPadre : "";
  let metadata = existente && existente.metadata ?
    Object.assign({}, existente.metadata) :
    {};

  if (catalogo === "MP_PRODUCTOS_PRINCIPALES") {
    // Producto principal es la raíz de la tipificación de materiales.
    // Se conserva cualquier relación externa existente (por ejemplo negocio)
    // para no perder información histórica.
    metadata.nivel = "PRODUCTO_PRINCIPAL";
  }

  if (catalogo === "MP_TIPOS_MATERIAL") {
    valorPadre = normalizarTexto(
      datos.valorPadre ||
      datos.productoPrincipal ||
      ""
    );

    const producto = obtenerValorActivoCatalogoAdminMotor_(
      "MP_PRODUCTOS_PRINCIPALES",
      valorPadre
    );

    if (!producto) {
      throw new Error(
        "Selecciona un Producto principal activo para el Tipo."
      );
    }

    clavePadre = "MP_PRODUCTOS_PRINCIPALES";
    valorPadre = producto.codigo;
    metadata = {
      productoPrincipal: producto.codigo,
      nivel: "TIPO_MATERIAL"
    };
  }

  if (catalogo === "MP_SUBTIPOS_MATERIAL") {
    valorPadre = normalizarTexto(
      datos.valorPadre ||
      datos.tipoMaterial ||
      ""
    );

    const tipo = obtenerValorActivoCatalogoAdminMotor_(
      "MP_TIPOS_MATERIAL",
      valorPadre
    );

    if (!tipo) {
      throw new Error(
        "Selecciona un Tipo activo para el Subtipo."
      );
    }

    const productoPrincipal = normalizarTexto(
      tipo.valorPadre ||
      (tipo.metadata && tipo.metadata.productoPrincipal) ||
      ""
    );

    if (!productoPrincipal) {
      throw new Error(
        "El Tipo seleccionado no tiene un Producto principal relacionado."
      );
    }

    const productoInformado = normalizarTexto(
      datos.productoPrincipal || ""
    );

    if (
      productoInformado &&
      productoInformado !== productoPrincipal
    ) {
      throw new Error(
        "El Tipo seleccionado no pertenece al Producto principal informado."
      );
    }

    const producto = obtenerValorActivoCatalogoAdminMotor_(
      "MP_PRODUCTOS_PRINCIPALES",
      productoPrincipal
    );

    if (!producto) {
      throw new Error(
        "El Producto principal del Tipo está inactivo o no existe."
      );
    }

    clavePadre = "MP_TIPOS_MATERIAL";
    valorPadre = tipo.codigo;
    metadata = {
      productoPrincipal: producto.codigo,
      tipoMaterial: tipo.codigo,
      nivel: "SUBTIPO_MATERIAL"
    };
  }

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.CATALOGO_VALORES,
    "ID_VALOR",
    {
      ID_VALOR: idValor,
      CATALOGO: catalogo,
      CODIGO: codigo,
      NOMBRE: limpiarTextoMotor_(datos.nombre || codigo, 120),
      ORDEN: Number(datos.orden) || 999,
      ESTADO: normalizarTexto(
        datos.estado || CONFIG.ESTADOS.ACTIVO
      ),
      CLAVE_PADRE: clavePadre,
      VALOR_PADRE: valorPadre,
      METADATA_JSON: JSON.stringify(metadata || {}),
      FECHA_ACTUALIZACION: new Date()
    }
  );

  if (esCatalogoArbolMaterialAdminMotor_(catalogo)) {
    try {
      if (typeof invalidarCacheOpcionesMaterialesPrecios_ === "function") {
        invalidarCacheOpcionesMaterialesPrecios_();
      }
      invalidarCacheMotor_("CONFIG");
    } catch (errorCache) {
      console.warn(
        "No se pudo invalidar la caché del árbol de materiales: %s",
        errorCache.message
      );
    }
  }

  return listarValoresCatalogoAdminMotor(catalogo).find(function(item) {
    return item.idValor === idValor;
  });
}

/**
 * Lista recursos visuales administración motor.
 */
function listarRecursosVisualesAdminMotor() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.RECURSOS).map(function(item) {
    return {
      idRecurso: String(item.ID_RECURSO || "").trim(),
      clave: normalizarTexto(item.CLAVE),
      nombre: String(item.NOMBRE || "").trim(),
      tipo: normalizarTexto(item.TIPO || "IMAGEN"),
      idArchivo: String(item.ID_ARCHIVO || "").trim(),
      urlPublica: String(item.URL_PUBLICA || "").trim(),
      version: Number(item.VERSION) || 1,
      estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO)
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.nombre, b.nombre);
  });
}

/**
 * Guarda recurso visual administración motor.
 *
 * Para FAVICON_APP:
 * - exige formato PNG;
 * - mantiene el archivo privado en Drive;
 * - el favicon se entrega como Data URL desde el servidor;
 * - no requiere "Cualquier persona con el enlace".
 */
function guardarRecursoVisualAdminMotor(datos) {
  datos = datos || {};
  const clave = normalizarTexto(datos.clave).replace(/[^A-Z0-9_]/g, "_");
  if (!clave) throw new Error("La clave del recurso es obligatoria.");

  const actuales = listarRecursosVisualesAdminMotor();
  const existente = actuales.find(function(item) {
    return item.clave === clave;
  });
  const esFavicon = clave === CONFIG.RECURSOS.CLAVES.FAVICON_APP;
  const version = existente ? existente.version + 1 : 1;
  const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);

  let idArchivo = String(datos.idArchivo || (existente && existente.idArchivo) || "").trim();
  let urlPublica = String(datos.urlPublica || (existente && existente.urlPublica) || "").trim();
  let archivoCreado = null;

  if (datos.dataUrl) {
    const coincidencia = String(datos.dataUrl).match(
      /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/i
    );

    if (!coincidencia) {
      throw new Error("El archivo debe ser PNG, JPEG, WEBP o SVG.");
    }

    const mimeType = coincidencia[1].toLowerCase();

    if (esFavicon && mimeType !== "image/png") {
      throw new Error("El ícono de la pestaña debe cargarse en formato PNG.");
    }

    const bytes = Utilities.base64Decode(coincidencia[2]);
    if (bytes.length > CONFIG.RECURSOS.TAMANO_MAXIMO_BYTES) {
      throw new Error("El archivo supera el tamaño máximo permitido.");
    }

    const extension = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/svg+xml": "svg"
    }[mimeType] || "png";
    const blob = Utilities.newBlob(
      bytes,
      mimeType,
      clave.toLowerCase() + "_v" + version + "." + extension
    );
    const carpetaId = obtenerPropiedadMotor_(
      PROPIEDADES_MOTOR_SGT360.FOLDER_RESOURCES_ID,
      ""
    );

    if (!carpetaId) {
      throw new Error("No se configuró la carpeta de recursos visuales.");
    }

    archivoCreado = DriveApp.getFolderById(carpetaId).createFile(blob);
    idArchivo = archivoCreado.getId();
  }

  if (esFavicon) {
    if (!idArchivo) {
      throw new Error(
        "Selecciona una imagen PNG para configurar el favicon."
      );
    }

    const archivoFavicon =
      archivoCreado ||
      DriveApp.getFileById(
        idArchivo
      );

    const mimeFavicon =
      String(
        archivoFavicon.getMimeType() ||
        ""
      ).toLowerCase();

    if (
      mimeFavicon !==
      "image/png"
    ) {
      if (archivoCreado) {
        try {
          archivoCreado.setTrashed(
            true
          );
        } catch (errorLimpieza) {
          console.warn(
            errorLimpieza.message
          );
        }
      }

      throw new Error(
        "El ícono de la pestaña debe cargarse en formato PNG."
      );
    }

    // Paso 30D:
    // El navegador recibe el favicon como Data URL.
    // No se publica el archivo de Drive.
    urlPublica = "";

    PropertiesService
      .getScriptProperties()
      .deleteProperty(
        PROPIEDADES_MOTOR_SGT360
          .FAVICON_URL
      );
  }

  // Los recursos almacenados en Drive se sirven desde Apps Script.
  // Se elimina únicamente una URL directa de Drive heredada;
  // una URL externa real se conserva para recursos sin archivo.
  if (
    idArchivo &&
    esUrlDriveRecursoVisualPaso30D_(
      urlPublica
    )
  ) {
    urlPublica = "";
  }

  const ahora = new Date();
  const objeto = {
    ID_RECURSO: String(datos.idRecurso || "").trim() ||
      (existente ? existente.idRecurso : generarIdMotor_("VIS")),
    CLAVE: clave,
    NOMBRE: limpiarTextoMotor_(datos.nombre || clave, 150),
    TIPO: normalizarTexto(datos.tipo || "IMAGEN"),
    ID_ARCHIVO: idArchivo,
    URL_PUBLICA: urlPublica,
    VERSION: version,
    ESTADO: estado,
    FECHA_ACTUALIZACION: ahora
  };

  if (!existente) objeto.FECHA_CREACION = ahora;

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.RECURSOS,
    "ID_RECURSO",
    objeto
  );
  invalidarCacheMotor_("CONFIG");

  try {
    obtenerFuenteRecursoVisualMotor_(
      clave
    );
  } catch (errorRecurso) {
    console.warn(
      "El recurso visual fue guardado, pero no pudo precalentarse: %s",
      errorRecurso &&
      errorRecurso.message
        ? errorRecurso.message
        : String(errorRecurso)
    );
  }

  registrarEventoMotor_({
    modulo: "ADMIN_CONFIG_APP",
    accion: "GUARDAR_RECURSO_VISUAL",
    entidad: "RECURSO_VISUAL",
    idEntidad: objeto.ID_RECURSO,
    detalle: {
      clave: clave,
      version: version,
      faviconPrivadoDataUrl: esFavicon
    }
  });

  return listarRecursosVisualesAdminMotor().find(function(item) {
    return item.idRecurso === objeto.ID_RECURSO;
  });
}

/**
 * Catálogo funcional de tipos de documento para usuarios.
 *
 * El nombre visible se obtiene desde APP_CATALOGO_VALORES. Las reglas de
 * validación permanecen en código para impedir que un valor inválido sea
 * guardado aunque se manipule el formulario desde el navegador.
 */
const TIPOS_DOCUMENTO_USUARIO_SGT360 = Object.freeze({
  DNI: Object.freeze({
    codigo: "DNI",
    nombre: "DNI",
    patron: "^[0-9]{8}$",
    ayuda: "Ingresa exactamente 8 dígitos.",
    ejemplo: "12345678",
    inputMode: "numeric",
    longitudMaxima: 8
  }),
  CE: Object.freeze({
    codigo: "CE",
    nombre: "Carné de extranjería",
    patron: "^[A-Z0-9]{9,12}$",
    ayuda: "Ingresa entre 9 y 12 caracteres alfanuméricos.",
    ejemplo: "001234567",
    inputMode: "text",
    longitudMaxima: 12
  }),
  PASAPORTE: Object.freeze({
    codigo: "PASAPORTE",
    nombre: "Pasaporte",
    patron: "^[A-Z0-9]{6,12}$",
    ayuda: "Ingresa entre 6 y 12 caracteres alfanuméricos.",
    ejemplo: "123456789",
    inputMode: "text",
    longitudMaxima: 12
  })
});

/**
 * Devuelve proveedores, oficinas, grupos y tipos de documento para la consola.
 *
 * @return {Object} Estructura completa de asignación.
 */
function obtenerEstructuraAsignacionesAdminMotor() {
  return obtenerEstructuraAsignacionesMotor_();
}

/**
 * Construye la estructura organizativa sin aplicar permisos adicionales.
 *
 * Modelo:
 * - Las oficinas son maestras independientes.
 * - Los grupos pertenecen a una oficina.
 * - Los proveedores se relacionan con una o varias oficinas.
 *
 * @return {Object}
 * @private
 */
function obtenerEstructuraAsignacionesMotor_() {
  const relaciones = listarRelacionesProveedorOficinaAdminMotor_();
  const oficinas = listarOficinasAdminMotor_();
  const mapaOficinas = {};
  oficinas.forEach(function(oficina) {
    mapaOficinas[oficina.idOficina] = oficina;
  });

  const proveedores = listarProveedoresAdminMotor_().map(function(proveedor) {
    const idsOficina = relaciones.filter(function(relacion) {
      return relacion.idProveedor === proveedor.idProveedor &&
        relacion.estado === CONFIG.ESTADOS.ACTIVO;
    }).map(function(relacion) {
      return relacion.idOficina;
    }).filter(function(idOficina) {
      return Boolean(mapaOficinas[idOficina]);
    });

    return Object.assign({}, proveedor, {
      idsOficina: idsOficina,
      oficinas: idsOficina.map(function(idOficina) {
        return mapaOficinas[idOficina];
      })
    });
  });

  const grupos = listarGruposAdminMotor_().map(function(grupo) {
    const oficina = mapaOficinas[grupo.idOficina];
    return Object.assign({}, grupo, {
      nombreOficina: oficina ? oficina.nombre : grupo.idOficina
    });
  });

  return {
    proveedores: proveedores,
    oficinas: oficinas,
    grupos: grupos,
    relacionesProveedorOficina: relaciones,
    tiposDocumento: listarTiposDocumentoUsuarioMotor_(),
    reglas: {
      rolesProtegidos: [CONFIG.ROLES.SUPERADMIN, CONFIG.ROLES.ADMIN],
      proveedorObligatorioEnRolesConfigurables: true,
      oficinaOpcional: true,
      grupoOpcional: true
    }
  };
}


const ALCANCES_CATALOGO_PROVEEDOR_SGT360 = Object.freeze({
  SOLO_PROVEEDOR: "SOLO_PROVEEDOR",
  TODOS_PROVEEDORES: "TODOS_PROVEEDORES"
});

/**
 * Normaliza el alcance comercial del catálogo asociado a un proveedor.
 *
 * @param {*} valor Valor almacenado o recibido.
 * @param {string=} predeterminado Fallback cuando el valor está vacío.
 * @return {string}
 * @private
 */
function normalizarAlcanceCatalogoProveedorMotor_(
  valor,
  predeterminado
) {
  const fallback = normalizarTexto(
    predeterminado ||
    ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
  );

  const alcance = normalizarTexto(valor || fallback);

  if (
    [
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR,
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
    ].indexOf(alcance) === -1
  ) {
    throw new Error(
      "El alcance de catálogo debe ser SOLO_PROVEEDOR o TODOS_PROVEEDORES."
    );
  }

  return alcance;
}

/**
 * Paso 29S — agrega y normaliza ALCANCE_CATALOGO en MAE_PROVEEDORES.
 *
 * Compatibilidad:
 * - proveedores existentes sin valor -> TODOS_PROVEEDORES
 *   para no restringir de manera inesperada la operación actual;
 * - proveedores nuevos -> SOLO_PROVEEDOR por seguridad comercial.
 */
function actualizarAlcanceCatalogoProveedoresPaso29S() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarHojaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      [
        "ID_PROVEEDOR",
        "RAZON_SOCIAL",
        "NOMBRE_COMERCIAL",
        "NOMBRE",
        "CODIGO_SAP",
        "RUC",
        "DESCRIPCION",
        "ALCANCE_CATALOGO",
        "ESTADO",
        "FECHA_CREACION",
        "FECHA_MODIFICACION",
        "USUARIO_CREACION",
        "USUARIO_MODIFICACION",
        "FECHA_ACTUALIZACION",
        "ID_USUARIO_ACTUALIZACION"
      ]
    );

    const contexto = obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      [
        "ID_PROVEEDOR",
        "RAZON_SOCIAL",
        "ALCANCE_CATALOGO"
      ]
    );

    const ultimaFila = contexto.hoja.getLastRow();
    let normalizados = 0;

    if (ultimaFila > 1) {
      const rango = contexto.hoja.getRange(
        2,
        1,
        ultimaFila - 1,
        contexto.numeroColumnas
      );

      const filas = rango.getValues();
      const indice = contexto.mapa.ALCANCE_CATALOGO;

      filas.forEach(function(fila) {
        const actual = normalizarTexto(fila[indice] || "");

        if (!actual) {
          fila[indice] =
            ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES;
          normalizados++;
          return;
        }

        const corregido = normalizarAlcanceCatalogoProveedorMotor_(
          actual,
          ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
        );

        if (corregido !== actual) {
          fila[indice] = corregido;
          normalizados++;
        }
      });

      if (normalizados) {
        rango.setValues(filas);
        marcarRevisionDatosMotor_(
          MOTOR_SGT360.BASES.OPERATION,
          CONFIG.HOJAS.PROVEEDORES
        );
      }
    }

    invalidarCacheMotor_("ALL");
    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29S",
      proveedoresNormalizados: normalizados,
      valoresPermitidos: [
        ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR,
        ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
      ],
      mensaje:
        "ALCANCE_CATALOGO quedó habilitado en MAE_PROVEEDORES. Los registros existentes sin configuración se conservaron como TODOS_PROVEEDORES."
    };

    console.log(
      "ACTUALIZACION_ALCANCE_CATALOGO_PROVEEDORES_PASO29S\n" +
      JSON.stringify(resultado, null, 2)
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarAlcanceCatalogoProveedoresPaso29S() {
  const proveedores = listarProveedoresAdminMotor_();

  const resumen = {
    SOLO_PROVEEDOR: 0,
    TODOS_PROVEEDORES: 0,
    INVALIDO: 0
  };

  const detalle = proveedores.map(function(item) {
    const alcance = normalizarTexto(item.alcanceCatalogo || "");

    if (
      alcance ===
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
    ) {
      resumen.SOLO_PROVEEDOR++;
    } else if (
      alcance ===
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
    ) {
      resumen.TODOS_PROVEEDORES++;
    } else {
      resumen.INVALIDO++;
    }

    return {
      idProveedor: item.idProveedor,
      nombre: item.nombreMostrar,
      alcanceCatalogo: alcance,
      estado: item.estado
    };
  });

  const resultado = {
    correcto: resumen.INVALIDO === 0,
    paso: "29S",
    resumen: resumen,
    proveedores: detalle
  };

  console.log(
    "DIAGNOSTICO_ALCANCE_CATALOGO_PROVEEDORES_PASO29S\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

/**
 * Normaliza nombres legales y comerciales sin alterar su capitalización.
 * @private
 */
function normalizarNombreProveedorMotor_(valor, maximo) {
  return limpiarTextoMotor_(valor, maximo).replace(/\s+/g, " ");
}

/**
 * Resuelve el nombre visible sin utilizarlo como clave de asignación.
 * @private
 */
function resolverNombreVisualProveedorMotor_(razonSocial, nombreComercial, nombreLegado) {
  return normalizarNombreProveedorMotor_(nombreComercial, 180) ||
    normalizarNombreProveedorMotor_(razonSocial, 200) ||
    normalizarNombreProveedorMotor_(nombreLegado, 200);
}

/**
 * Verifica que la migración de identidad comercial ya se haya aplicado.
 * @private
 */
function validarEstructuraIdentidadProveedorMotor_() {
  try {
    obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      [
        "ID_PROVEEDOR",
        "RAZON_SOCIAL",
        "NOMBRE_COMERCIAL",
        "NOMBRE",
        "ALCANCE_CATALOGO"
      ]
    );
    return true;
  } catch (error) {
    throw new Error(
      "La estructura de proveedores no está actualizada. Ejecuta actualizarIdentidadComercialProveedoresPaso21A() antes de guardar o importar."
    );
  }
}

/** @private */
function listarProveedoresAdminMotor_() {
  const claveCache = construirClaveCacheMotor_(
    "PROVEEDORES_ADMIN",
    obtenerRevisionDatosMotor_()
  );

  return obtenerOConstruirCacheMotor_(claveCache, function() {
    return leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES
    ).map(function(item) {
      const idProveedor = String(item.ID_PROVEEDOR || "").trim();
      const razonSocial = normalizarNombreProveedorMotor_(
        item.RAZON_SOCIAL || item.NOMBRE,
        200
      );
      const nombreComercial = normalizarNombreProveedorMotor_(
        item.NOMBRE_COMERCIAL,
        180
      );
      const nombreMostrar = resolverNombreVisualProveedorMotor_(
        razonSocial,
        nombreComercial,
        item.NOMBRE
      ) || idProveedor;
      const fechaCreacion = item.FECHA_CREACION;
      const fechaModificacion = item.FECHA_MODIFICACION || item.FECHA_ACTUALIZACION;

      return {
        idProveedor: idProveedor,
        codigoInterno: idProveedor,
        razonSocial: razonSocial,
        nombreComercial: nombreComercial,
        nombre: nombreMostrar,
        nombreMostrar: nombreMostrar,
        codigoSap: String(item.CODIGO_SAP || "").trim(),
        ruc: String(item.RUC || "").trim(),
        descripcion: String(item.DESCRIPCION || "").trim(),
        alcanceCatalogo:
          normalizarAlcanceCatalogoProveedorMotor_(
            item.ALCANCE_CATALOGO,
            ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
          ),
        estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO),
        fechaCreacion: Object.prototype.toString.call(fechaCreacion) === "[object Date]" ?
          (Number.isNaN(fechaCreacion.getTime()) ? "" : fechaCreacion.toISOString()) :
          String(fechaCreacion || ""),
        fechaModificacion: Object.prototype.toString.call(fechaModificacion) === "[object Date]" ?
          (Number.isNaN(fechaModificacion.getTime()) ? "" : fechaModificacion.toISOString()) :
          String(fechaModificacion || ""),
        usuarioCreacion: String(item.USUARIO_CREACION || "").trim(),
        usuarioModificacion: String(
          item.USUARIO_MODIFICACION || item.ID_USUARIO_ACTUALIZACION || ""
        ).trim()
      };
    }).sort(function(a, b) {
      return compararTextoMotor_(a.nombreMostrar, b.nombreMostrar) ||
        compararTextoMotor_(a.razonSocial, b.razonSocial) ||
        compararTextoMotor_(a.idProveedor, b.idProveedor);
    });
  }, 180);
}

/** @private */
function listarOficinasAdminMotor_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.OFICINAS).map(function(item) {
    return {
      idOficina: String(item.ID_OFICINA || "").trim(),
      nombre: String(item.NOMBRE || "").trim(),
      descripcion: String(item.DESCRIPCION || "").trim(),
      estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO)
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.nombre, b.nombre);
  });
}

/** @private */
function listarGruposAdminMotor_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.GRUPOS).map(function(item) {
    return {
      idGrupo: String(item.ID_GRUPO || "").trim(),
      idOficina: String(item.ID_OFICINA || "").trim(),
      nombre: String(item.NOMBRE || "").trim(),
      descripcion: String(item.DESCRIPCION || "").trim(),
      estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO)
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.nombre, b.nombre);
  });
}

/** @private */
function listarRelacionesProveedorOficinaAdminMotor_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDOR_OFICINAS).map(function(item) {
    const idsGrupo = normalizarIdsGrupoRelacionProveedorPaso27P_(
      item.IDS_GRUPO || item.ID_GRUPOS || item.ID_GRUPO || ""
    );
    const alcance = normalizarTexto(
      item.ALCANCE_GRUPOS || item.ALCANCE_GRUPO ||
      (idsGrupo.length ? "RESTRINGIDO" : "TODOS")
    );
    return {
      idRelacion: String(item.ID_RELACION || "").trim(),
      idProveedor: String(item.ID_PROVEEDOR || "").trim(),
      idOficina: String(item.ID_OFICINA || "").trim(),
      idsGrupo: idsGrupo,
      alcanceGrupos: alcance === "RESTRINGIDO" ? "RESTRINGIDO" : "TODOS",
      estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO)
    };
  });
}

/**
 * Devuelve IDs de oficinas activas asignadas a un proveedor.
 *
 * @param {string} idProveedor
 * @return {Array<string>}
 * @private
 */
function listarIdsOficinaProveedorMotor_(idProveedor) {
  const id = String(idProveedor || "").trim();
  const oficinasActivas = {};
  listarOficinasAdminMotor_().forEach(function(oficina) {
    if (oficina.estado === CONFIG.ESTADOS.ACTIVO) oficinasActivas[oficina.idOficina] = true;
  });
  return listarRelacionesProveedorOficinaAdminMotor_().filter(function(relacion) {
    return relacion.idProveedor === id &&
      relacion.estado === CONFIG.ESTADOS.ACTIVO &&
      oficinasActivas[relacion.idOficina];
  }).map(function(relacion) {
    return relacion.idOficina;
  });
}

/**
 * Determina las oficinas asociadas al contexto organizativo principal del usuario.
 *
 * La función no interpreta nombres de roles. SUPERADMIN conserva visión global;
 * para los demás usuarios se utiliza la oficina específica, cuando exista, o las
 * oficinas activas del proveedor principal. Los módulos deben aplicar además sus
 * propios permisos y alcances en el backend.
 *
 * @param {Object} usuario
 * @return {Array<string>}
 */
function obtenerIdsOficinasPermitidasUsuarioMotor(usuario) {
  usuario = usuario || obtenerUsuarioActual();
  const rol = normalizarTexto(usuario.rol || usuario.ROL);
  const idProveedor = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  const idOficina = String(usuario.idOficina || usuario.ID_OFICINA || "").trim();

  if (rol === CONFIG.ROLES.SUPERADMIN) {
    return listarOficinasAdminMotor_().filter(function(oficina) {
      return oficina.estado === CONFIG.ESTADOS.ACTIVO;
    }).map(function(oficina) {
      return oficina.idOficina;
    });
  }

  if (idOficina) return [idOficina];
  if (idProveedor) return listarIdsOficinaProveedorMotor_(idProveedor);
  return [];
}

/**
 * Devuelve los tipos de documento activos.
 *
 * @return {Array<Object>}
 * @private
 */
function listarTiposDocumentoUsuarioMotor_() {
  const codigoCatalogo = CONFIG.CATALOGOS_SISTEMA.TIPOS_DOCUMENTO_USUARIO;
  let valores = [];

  try {
    valores = listarValoresCatalogoAdminMotor(codigoCatalogo).filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    });
  } catch (error) {
    valores = [];
  }

  if (!valores.length) {
    valores = Object.keys(TIPOS_DOCUMENTO_USUARIO_SGT360).map(function(codigo, indice) {
      return {
        codigo: codigo,
        nombre: TIPOS_DOCUMENTO_USUARIO_SGT360[codigo].nombre,
        orden: (indice + 1) * 10,
        estado: CONFIG.ESTADOS.ACTIVO
      };
    });
  }

  return valores.map(function(valor) {
    const codigo = normalizarTexto(valor.codigo);
    const regla = TIPOS_DOCUMENTO_USUARIO_SGT360[codigo] || {
      codigo: codigo,
      nombre: valor.nombre || codigo,
      patron: "^[A-Z0-9\\-]{4,20}$",
      ayuda: "Ingresa entre 4 y 20 caracteres alfanuméricos.",
      ejemplo: "",
      inputMode: "text",
      longitudMaxima: 20
    };

    return {
      codigo: codigo,
      nombre: String(valor.nombre || regla.nombre || codigo).trim(),
      patron: regla.patron,
      ayuda: regla.ayuda,
      ejemplo: regla.ejemplo,
      inputMode: regla.inputMode,
      longitudMaxima: regla.longitudMaxima,
      orden: Number(valor.orden) || 999
    };
  }).sort(function(a, b) {
    return a.orden - b.orden || compararTextoMotor_(a.nombre, b.nombre);
  });
}

/** @private */
function normalizarIdMaestroMotor_(valor, etiqueta) {
  const id = normalizarTexto(valor).replace(/\s+/g, "_").replace(/[^A-Z0-9_.\-]/g, "");
  if (!id) throw new Error("El " + etiqueta + " es obligatorio.");
  if (id.length > 100) throw new Error("El " + etiqueta + " no puede superar 100 caracteres.");
  return id;
}

/** @private */
function buscarProveedorAdminMotor_(idProveedor) {
  const id = String(idProveedor || "").trim();
  return listarProveedoresAdminMotor_().find(function(item) {
    return item.idProveedor === id;
  }) || null;
}

/** @private */
function buscarOficinaAdminMotor_(idOficina) {
  const id = String(idOficina || "").trim();
  return listarOficinasAdminMotor_().find(function(item) {
    return item.idOficina === id;
  }) || null;
}

/** @private */
function buscarGrupoAdminMotor_(idGrupo) {
  const id = String(idGrupo || "").trim();
  return listarGruposAdminMotor_().find(function(item) {
    return item.idGrupo === id;
  }) || null;
}

/** @private */
function normalizarListaIdsMotor_(valor, etiqueta) {
  const lista = Array.isArray(valor) ? valor : String(valor || "").split(/[|,;]/);
  const vistos = {};
  return lista.map(function(item) {
    return String(item || "").trim();
  }).filter(function(item) {
    if (!item) return false;
    const id = normalizarIdMaestroMotor_(item, etiqueta);
    if (vistos[id]) return false;
    vistos[id] = true;
    return true;
  }).map(function(item) {
    return normalizarIdMaestroMotor_(item, etiqueta);
  });
}

/**
 * Crea o actualiza un proveedor y define las oficinas que puede utilizar.
 */
function guardarProveedorAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    validarEstructuraIdentidadProveedorMotor_();
    const usuarioActual = obtenerUsuarioActual();
    const idRecibido = String(datos.idProveedor || "").trim();
    const existente = idRecibido ? buscarProveedorAdminMotor_(idRecibido) : null;

    if (idRecibido && !existente) {
      throw new Error(
        "El código interno del proveedor es generado por la aplicación y no puede definirse o modificarse manualmente."
      );
    }

    const idProveedor = existente ? existente.idProveedor : generarCodigoProveedorCortoUnicoPaso27O_();
    const razonSocial = normalizarNombreProveedorMotor_(
      datos.razonSocial || datos.nombre,
      200
    );
    const nombreComercial = normalizarNombreProveedorMotor_(
      datos.nombreComercial,
      180
    );
    const nombreMostrar = resolverNombreVisualProveedorMotor_(
      razonSocial,
      nombreComercial,
      datos.nombre
    );
    const codigoSap = Object.prototype.hasOwnProperty.call(datos, "codigoSap") ?
      normalizarCodigoSapProveedorMotor_(datos.codigoSap) :
      (existente ? existente.codigoSap : "");
    const ruc = Object.prototype.hasOwnProperty.call(datos, "ruc") ?
      normalizarRucProveedorMotor_(datos.ruc) :
      (existente ? existente.ruc : "");
    const alcanceCatalogo =
      Object.prototype.hasOwnProperty.call(
        datos,
        "alcanceCatalogo"
      )
        ? normalizarAlcanceCatalogoProveedorMotor_(
            datos.alcanceCatalogo,
            existente
              ? existente.alcanceCatalogo
              : ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
          )
        : (
            existente
              ? normalizarAlcanceCatalogoProveedorMotor_(
                  existente.alcanceCatalogo,
                  ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
                )
              : ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
          );

    const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);
    const idsOficina = normalizarListaIdsMotor_(datos.idsOficina, "ID de oficina");

    if (!razonSocial) throw new Error("La razón social es obligatoria.");
    validarUnicidadProveedorMotor_(idProveedor, codigoSap, ruc);
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado del proveedor no es válido.");
    }
    // La oficina es opcional para el proveedor. Solo se valida cuando se selecciona,
    // porque representa canal de ventas y no todos los proveedores venden.
    idsOficina.forEach(function(idOficina) {
      const oficina = buscarOficinaAdminMotor_(idOficina);
      if (!oficina || oficina.estado !== CONFIG.ESTADOS.ACTIVO) {
        throw new Error("La oficina " + idOficina + " no existe o está inactiva.");
      }
    });

    if (existente && estado === CONFIG.ESTADOS.INACTIVO) {
      validarProveedorSinDependenciasActivasMotor_(idProveedor);
    }

    validarRetiroOficinasProveedorMotor_(idProveedor, idsOficina);

    const ahora = new Date();
    const objeto = {
      ID_PROVEEDOR: idProveedor,
      RAZON_SOCIAL: razonSocial,
      NOMBRE_COMERCIAL: nombreComercial,
      NOMBRE: nombreMostrar,
      CODIGO_SAP: codigoSap,
      RUC: ruc,
      DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 1000),
      ALCANCE_CATALOGO: alcanceCatalogo,
      ESTADO: estado,
      FECHA_MODIFICACION: ahora,
      USUARIO_MODIFICACION: usuarioActual.idUsuario,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
    };
    if (!existente) {
      objeto.FECHA_CREACION = ahora;
      objeto.USUARIO_CREACION = usuarioActual.idUsuario;
    }

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      "ID_PROVEEDOR",
      objeto
    );
    sincronizarOficinasProveedorMotor_(
      idProveedor,
      idsOficina,
      usuarioActual.idUsuario
    );
    SpreadsheetApp.flush();

    registrarEventoMotor_({
      modulo: "ADMINISTRACION",
      accion: existente ? "EDITAR_PROVEEDOR" : "CREAR_PROVEEDOR",
      entidad: "PROVEEDOR",
      idEntidad: idProveedor,
      detalle: {
        codigoInterno: idProveedor,
        razonSocialAnterior: existente ? existente.razonSocial : "",
        razonSocialNueva: razonSocial,
        nombreComercialAnterior: existente ? existente.nombreComercial : "",
        nombreComercialNuevo: nombreComercial,
        alcanceCatalogoAnterior:
          existente ? existente.alcanceCatalogo : "",
        alcanceCatalogoNuevo:
          alcanceCatalogo,
        idsOficina: idsOficina
      }
    });

    return obtenerEstructuraAsignacionesMotor_().proveedores.find(function(item) {
      return item.idProveedor === idProveedor;
    }) || null;
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function validarRetiroOficinasProveedorMotor_(idProveedor, idsSeleccionadas) {
  const seleccionadas = {};
  idsSeleccionadas.forEach(function(idOficina) {
    seleccionadas[idOficina] = true;
  });

  listarIdsOficinaProveedorMotor_(idProveedor).forEach(function(idOficina) {
    if (seleccionadas[idOficina]) return;
    if (contarUsuariosProveedorOficinaMotor_(idProveedor, idOficina) > 0) {
      throw new Error("No puedes retirar la oficina " + idOficina +
        " porque existen asesores activos asignados a esa combinación.");
    }
  });
}

/** @private */
function sincronizarOficinasProveedorMotor_(idProveedor, idsOficina, idUsuario, opciones) {
  asegurarEstructuraRelacionProveedorGruposPaso27P_();
  opciones = opciones || {};
  const gruposPorOficina = opciones.idsGrupoPorOficina || {};
  const seleccionadas = {};
  idsOficina.forEach(function(idOficina) {
    seleccionadas[idOficina] = true;
  });
  const existentes = listarRelacionesProveedorOficinaAdminMotor_().filter(function(relacion) {
    return relacion.idProveedor === idProveedor;
  });
  const mapa = {};
  existentes.forEach(function(relacion) {
    mapa[relacion.idOficina] = relacion;
  });

  const todas = {};
  existentes.forEach(function(relacion) { todas[relacion.idOficina] = true; });
  idsOficina.forEach(function(idOficina) { todas[idOficina] = true; });

  let cambios = 0;
  Object.keys(todas).forEach(function(idOficina) {
    const existente = mapa[idOficina];
    const activo = Boolean(seleccionadas[idOficina]);
    const estado = activo ? CONFIG.ESTADOS.ACTIVO : CONFIG.ESTADOS.INACTIVO;
    const idsGrupo = activo ? normalizarIdsGrupoRelacionProveedorPaso27P_(gruposPorOficina[idOficina] || []) : [];
    const idsGrupoTexto = idsGrupo.join("|");
    const alcanceGrupos = activo ? (idsGrupo.length ? "RESTRINGIDO" : "TODOS") : "TODOS";
    const idsGrupoExistente = normalizarIdsGrupoRelacionProveedorPaso27P_(existente && existente.idsGrupo || []);
    const alcanceExistente = existente ? (existente.alcanceGrupos || "TODOS") : "";
    const sinCambios = existente &&
      existente.estado === estado &&
      idsGrupoExistente.join("|") === idsGrupoTexto &&
      alcanceExistente === alcanceGrupos;
    if (sinCambios) return;

    const ahora = new Date();
    const idRelacion = existente && existente.idRelacion ? existente.idRelacion :
      "REL_" + idProveedor + "__" + idOficina;
    const objeto = {
      ID_RELACION: idRelacion,
      ID_PROVEEDOR: idProveedor,
      ID_OFICINA: idOficina,
      IDS_GRUPO: idsGrupoTexto,
      ALCANCE_GRUPOS: alcanceGrupos,
      ESTADO: estado,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: idUsuario
    };
    if (!existente) objeto.FECHA_CREACION = ahora;
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDOR_OFICINAS,
      "ID_RELACION", objeto);
    cambios += 1;
  });
  if (cambios > 0) {
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDOR_OFICINAS);
  }
}


/**
 * Paso 27P — Asegura columnas para restringir grupos por proveedor/oficina.
 * @private
 */
function asegurarEstructuraRelacionProveedorGruposPaso27P_() {
  asegurarHojaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDOR_OFICINAS,
    [
      "ID_RELACION", "ID_PROVEEDOR", "ID_OFICINA", "IDS_GRUPO",
      "ALCANCE_GRUPOS", "ESTADO", "FECHA_CREACION",
      "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]
  );
}

/** @private */
function normalizarIdsGrupoRelacionProveedorPaso27P_(valor) {
  const lista = Array.isArray(valor) ? valor : String(valor || "").split(/[|,;]/);
  const vistos = {};
  return lista.map(function(item) {
    return String(item || "").trim();
  }).filter(function(item) {
    if (!item) return false;
    const id = normalizarIdMaestroMotor_(item, "ID de grupo");
    if (vistos[id]) return false;
    vistos[id] = true;
    return true;
  }).map(function(item) {
    return normalizarIdMaestroMotor_(item, "ID de grupo");
  });
}

/**
 * Crea o actualiza una oficina independiente.
 */
function guardarOficinaAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const usuarioActual = obtenerUsuarioActual();
    const idOficina = normalizarIdMaestroMotor_(datos.idOficina, "ID de oficina");
    const nombre = limpiarTextoMotor_(datos.nombre, 180);
    const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);
    const existente = buscarOficinaAdminMotor_(idOficina);

    if (!nombre) throw new Error("El nombre de la oficina es obligatorio.");
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado de la oficina no es válido.");
    }
    if (existente && estado === CONFIG.ESTADOS.INACTIVO) {
      validarOficinaSinDependenciasActivasMotor_(idOficina);
    }

    const ahora = new Date();
    const objeto = {
      ID_OFICINA: idOficina,
      NOMBRE: nombre,
      DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 500),
      ESTADO: estado,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
    };
    if (!existente) objeto.FECHA_CREACION = ahora;

    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.OFICINAS,
      "ID_OFICINA", objeto);
    SpreadsheetApp.flush();
    registrarEventoMotor_({
      modulo: "ADMINISTRACION",
      accion: existente ? "EDITAR_OFICINA" : "CREAR_OFICINA",
      entidad: "OFICINA",
      idEntidad: idOficina
    });
    return buscarOficinaAdminMotor_(idOficina);
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Crea o actualiza un grupo vinculado obligatoriamente a una oficina.
 */
function guardarGrupoAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const usuarioActual = obtenerUsuarioActual();
    const idGrupo = normalizarIdMaestroMotor_(datos.idGrupo, "ID de grupo");
    const idOficina = normalizarIdMaestroMotor_(datos.idOficina, "ID de oficina");
    const nombre = limpiarTextoMotor_(datos.nombre, 180);
    const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);
    const oficina = buscarOficinaAdminMotor_(idOficina);
    const existente = buscarGrupoAdminMotor_(idGrupo);

    if (!nombre) throw new Error("El nombre del grupo es obligatorio.");
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado del grupo no es válido.");
    }
    if (!oficina || oficina.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("Selecciona una oficina activa para el grupo.");
    }
    if (existente && existente.idOficina !== idOficina &&
      contarUsuariosAsignadosMotor_("ID_GRUPO", idGrupo) > 0) {
      throw new Error("No puedes cambiar la oficina de un grupo asignado a usuarios activos.");
    }
    if (existente && estado === CONFIG.ESTADOS.INACTIVO &&
      contarUsuariosAsignadosMotor_("ID_GRUPO", idGrupo) > 0) {
      throw new Error("No puedes desactivar un grupo asignado a usuarios activos.");
    }

    const ahora = new Date();
    const objeto = {
      ID_GRUPO: idGrupo,
      ID_OFICINA: idOficina,
      NOMBRE: nombre,
      DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 500),
      ESTADO: estado,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
    };
    if (!existente) objeto.FECHA_CREACION = ahora;

    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.GRUPOS,
      "ID_GRUPO", objeto);
    SpreadsheetApp.flush();
    registrarEventoMotor_({
      modulo: "ADMINISTRACION",
      accion: existente ? "EDITAR_GRUPO" : "CREAR_GRUPO",
      entidad: "GRUPO",
      idEntidad: idGrupo,
      detalle: { idOficina: idOficina }
    });
    return buscarGrupoAdminMotor_(idGrupo);
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Importa maestros organizativos mediante UPSERT.
 *
 * Tipos admitidos: PROVEEDORES, OFICINAS, GRUPOS y PROVEEDOR_OFICINAS.
 */
function importarMaestroAsignacionAdminMotor(tipo, contenidoCsv, metadatos) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const usuarioActual = obtenerUsuarioActual();
    const especificacion = obtenerEspecificacionImportacionAsignacionMotor_(tipo);
    const archivo = metadatos && typeof metadatos === "object" ? metadatos : {};
    if (especificacion.tipo === "PROVEEDORES") {
      return importarProveedoresModuloInterno_(contenidoCsv, archivo, usuarioActual, "ADMIN_ESTRUCTURA");
    }
    const parseado = parsearCsvAsignacionMotor_(contenidoCsv, especificacion);
    const validado = validarImportacionAsignacionMotor_(especificacion, parseado.registros);
    const resultado = aplicarImportacionAsignacionMotor_(especificacion, validado, usuarioActual);
    const respaldo = guardarRespaldoImportacionAsignacionMotor_(
      especificacion,
      contenidoCsv,
      archivo.nombre || ""
    );

    registrarEventoMotor_({
      modulo: "ADMINISTRACION",
      accion: "IMPORTAR_" + especificacion.tipo,
      entidad: especificacion.entidad,
      idEntidad: respaldo.nombre || String(archivo.nombre || "CARGA_CSV"),
      resultado: "OK",
      detalle: {
        tipo: especificacion.tipo,
        archivo: String(archivo.nombre || ""),
        filasLeidas: resultado.filasLeidas,
        creados: resultado.creados,
        actualizados: resultado.actualizados,
        sinCambios: resultado.sinCambios,
        respaldoGuardado: respaldo.guardado
      }
    });

    return Object.assign({
      correcto: true,
      tipo: especificacion.tipo,
      archivo: String(archivo.nombre || ""),
      respaldo: respaldo
    }, resultado, {
      mensaje: "La carga de " + especificacion.nombrePlural.toLowerCase() +
        " fue procesada correctamente."
    });
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function obtenerEspecificacionImportacionAsignacionMotor_(tipo) {
  const codigo = normalizarTexto(tipo);
  const especificaciones = {
    PROVEEDORES: {
      tipo: "PROVEEDORES",
      entidad: "PROVEEDOR",
      nombrePlural: "Proveedores",
      hoja: CONFIG.HOJAS.PROVEEDORES,
      clave: "ID_PROVEEDOR",
      requeridas: ["ID_PROVEEDOR", "RAZON_SOCIAL"],
      cabecerasPermitidas: [
        "ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL",
        "CODIGO_SAP", "RUC", "DESCRIPCION", "ALCANCE_CATALOGO", "ESTADO"
      ]
    },
    OFICINAS: {
      tipo: "OFICINAS",
      entidad: "OFICINA",
      nombrePlural: "Oficinas",
      hoja: CONFIG.HOJAS.OFICINAS,
      clave: "ID_OFICINA",
      requeridas: ["ID_OFICINA", "NOMBRE"],
      cabecerasPermitidas: ["ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO"]
    },
    GRUPOS: {
      tipo: "GRUPOS",
      entidad: "GRUPO",
      nombrePlural: "Grupos",
      hoja: CONFIG.HOJAS.GRUPOS,
      clave: "ID_GRUPO",
      requeridas: ["ID_GRUPO", "ID_OFICINA", "NOMBRE"],
      cabecerasPermitidas: ["ID_GRUPO", "ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO"]
    },
    PROVEEDOR_OFICINAS: {
      tipo: "PROVEEDOR_OFICINAS",
      entidad: "PROVEEDOR_OFICINA",
      nombrePlural: "Asignaciones proveedor-oficina",
      hoja: CONFIG.HOJAS.PROVEEDOR_OFICINAS,
      clave: "ID_RELACION",
      requeridas: ["ID_PROVEEDOR", "ID_OFICINA"],
      cabecerasPermitidas: ["ID_PROVEEDOR", "ID_OFICINA", "ESTADO"]
    }
  };
  if (!especificaciones[codigo]) {
    throw new Error("El tipo de maestro solicitado no está permitido.");
  }
  return especificaciones[codigo];
}

/** @private */
function detectarSeparadorCsvAsignacionMotor_(texto) {
  const primeraLinea = String(texto || "").split(/\r?\n/)[0] || "";
  const candidatos = [";", ",", "\t"];
  let mejor = ";";
  let cantidad = -1;
  candidatos.forEach(function(candidato) {
    const ocurrencias = primeraLinea.split(candidato).length - 1;
    if (ocurrencias > cantidad) {
      mejor = candidato;
      cantidad = ocurrencias;
    }
  });
  return mejor;
}

/** @private */
function parsearCsvAsignacionMotor_(contenidoCsv, especificacion) {
  const texto = String(contenidoCsv || "").replace(/^\uFEFF/, "").trim();
  if (!texto) throw new Error("El archivo CSV está vacío.");
  if (Utilities.newBlob(texto).getBytes().length > 5 * 1024 * 1024) {
    throw new Error("El archivo supera el máximo permitido de 5 MB.");
  }

  const separador = detectarSeparadorCsvAsignacionMotor_(texto);
  const filas = Utilities.parseCsv(texto, separador);
  if (filas.length < 2) throw new Error("El CSV debe incluir cabeceras y al menos un registro.");
  if (filas.length - 1 > 5000) throw new Error("El CSV no puede superar 5 000 registros.");

  const cabeceras = filas[0].map(function(cabecera) {
    return normalizarClaveMotor_(String(cabecera || "").replace(/^\uFEFF/, ""));
  });
  const mapa = crearMapaCabeceras(cabeceras);
  validarCabeceras(mapa, especificacion.requeridas, "CSV " + especificacion.nombrePlural);

  const noPermitidas = cabeceras.filter(function(cabecera) {
    return cabecera && especificacion.cabecerasPermitidas.indexOf(cabecera) === -1;
  });
  if (noPermitidas.length) {
    throw new Error("El CSV contiene cabeceras no permitidas: " + noPermitidas.join(", ") + ".");
  }

  const duplicadas = {};
  cabeceras.forEach(function(cabecera) {
    if (!cabecera) return;
    duplicadas[cabecera] = (duplicadas[cabecera] || 0) + 1;
  });
  const repetidas = Object.keys(duplicadas).filter(function(cabecera) {
    return duplicadas[cabecera] > 1;
  });
  if (repetidas.length) {
    throw new Error("El CSV contiene cabeceras duplicadas: " + repetidas.join(", ") + ".");
  }

  const registros = filas.slice(1).map(function(fila, indice) {
    const objeto = { __linea: indice + 2 };
    cabeceras.forEach(function(cabecera, posicion) {
      if (cabecera) objeto[cabecera] = String(fila[posicion] || "").trim();
    });
    return objeto;
  }).filter(function(registro) {
    return Object.keys(registro).some(function(clave) {
      return clave !== "__linea" && String(registro[clave] || "").trim();
    });
  });

  if (!registros.length) throw new Error("El CSV no contiene registros utilizables.");
  return { separador: separador, cabeceras: cabeceras, registros: registros };
}

/** @private */
function validarImportacionAsignacionMotor_(especificacion, registros) {
  if (especificacion.tipo === "PROVEEDORES") {
    throw new Error(
      "La importación de proveedores debe utilizar el proceso especializado de identidad comercial."
    );
  }

  const proveedores = {};
  listarProveedoresAdminMotor_().forEach(function(item) { proveedores[item.idProveedor] = item; });
  const oficinas = {};
  listarOficinasAdminMotor_().forEach(function(item) { oficinas[item.idOficina] = item; });
  const grupos = {};
  listarGruposAdminMotor_().forEach(function(item) { grupos[item.idGrupo] = item; });
  const relaciones = {};
  listarRelacionesProveedorOficinaAdminMotor_().forEach(function(item) {
    relaciones[item.idProveedor + "__" + item.idOficina] = item;
  });

  const usuariosActivos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS)
    .filter(function(item) {
      return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    });
  const vistos = {};
  const errores = [];

  const normalizados = registros.map(function(registro) {
    const linea = registro.__linea;
    const estado = normalizarTexto(registro.ESTADO || CONFIG.ESTADOS.ACTIVO);
    let clave = "";
    let nombre = "";
    let descripcion = "";
    let idProveedor = "";
    let idOficina = "";
    let existente = null;

    if (especificacion.tipo === "PROVEEDOR_OFICINAS") {
      idProveedor = normalizarIdMaestroMotor_(registro.ID_PROVEEDOR, "ID de proveedor");
      idOficina = normalizarIdMaestroMotor_(registro.ID_OFICINA, "ID de oficina");
      clave = idProveedor + "__" + idOficina;
      existente = relaciones[clave] || null;
    } else {
      clave = normalizarIdMaestroMotor_(registro[especificacion.clave],
        especificacion.clave.toLowerCase().replace(/_/g, " "));
      nombre = limpiarTextoMotor_(registro.NOMBRE, 180);
      descripcion = limpiarTextoMotor_(registro.DESCRIPCION, 500);
      existente = especificacion.tipo === "PROVEEDORES" ? proveedores[clave] :
        especificacion.tipo === "OFICINAS" ? oficinas[clave] : grupos[clave];
      if (especificacion.tipo === "GRUPOS") {
        idOficina = normalizarIdMaestroMotor_(registro.ID_OFICINA, "ID de oficina");
      }
    }

    if (vistos[clave]) errores.push("Línea " + linea + ": el ID " + clave + " está repetido.");
    vistos[clave] = true;
    if (especificacion.tipo !== "PROVEEDOR_OFICINAS" && !nombre) {
      errores.push("Línea " + linea + ": el nombre es obligatorio.");
    }
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      errores.push("Línea " + linea + ": ESTADO debe ser ACTIVO o INACTIVO.");
    }

    if (especificacion.tipo === "GRUPOS") {
      if (!oficinas[idOficina] || oficinas[idOficina].estado !== CONFIG.ESTADOS.ACTIVO) {
        errores.push("Línea " + linea + ": la oficina " + idOficina +
          " no existe o está inactiva.");
      }
      const asignados = usuariosActivos.filter(function(usuario) {
        return String(usuario.ID_GRUPO || "").trim() === clave;
      }).length;
      if (existente && existente.idOficina !== idOficina && asignados > 0) {
        errores.push("Línea " + linea + ": no se puede cambiar la oficina del grupo " +
          clave + " porque está asignado a usuarios activos.");
      }
      if (existente && estado === CONFIG.ESTADOS.INACTIVO && asignados > 0) {
        errores.push("Línea " + linea + ": no se puede inactivar el grupo " + clave +
          " porque está asignado a usuarios activos.");
      }
    }

    if (especificacion.tipo === "OFICINAS" && existente &&
      estado === CONFIG.ESTADOS.INACTIVO) {
      try {
        validarOficinaSinDependenciasActivasMotor_(clave);
      } catch (error) {
        errores.push("Línea " + linea + ": " + error.message);
      }
    }

    if (especificacion.tipo === "PROVEEDORES" && existente &&
      estado === CONFIG.ESTADOS.INACTIVO) {
      try {
        validarProveedorSinDependenciasActivasMotor_(clave);
      } catch (error) {
        errores.push("Línea " + linea + ": " + error.message);
      }
    }

    if (especificacion.tipo === "PROVEEDOR_OFICINAS") {
      if (!proveedores[idProveedor]) {
        errores.push("Línea " + linea + ": el proveedor " + idProveedor + " no existe.");
      }
      if (!oficinas[idOficina] || oficinas[idOficina].estado !== CONFIG.ESTADOS.ACTIVO) {
        errores.push("Línea " + linea + ": la oficina " + idOficina +
          " no existe o está inactiva.");
      }
      if (existente && estado === CONFIG.ESTADOS.INACTIVO &&
        contarUsuariosProveedorOficinaMotor_(idProveedor, idOficina) > 0) {
        errores.push("Línea " + linea + ": no se puede retirar la oficina " + idOficina +
          " del proveedor porque hay asesores activos asignados.");
      }
    }

    return {
      linea: linea,
      clave: clave,
      idProveedor: idProveedor,
      idOficina: idOficina,
      nombre: nombre,
      descripcion: descripcion,
      estado: estado,
      existente: existente
    };
  });

  if (errores.length) {
    const visibles = errores.slice(0, 20);
    const adicional = errores.length > visibles.length ?
      " Se detectaron " + (errores.length - visibles.length) + " errores adicionales." : "";
    throw new Error("La carga no fue aplicada. " + visibles.join(" ") + adicional);
  }
  return normalizados;
}

/** @private */
function aplicarImportacionAsignacionMotor_(especificacion, registros, usuarioActual) {
  if (especificacion.tipo === "PROVEEDORES") {
    throw new Error(
      "La importación de proveedores debe utilizar el proceso especializado de identidad comercial."
    );
  }

  const contexto = obtenerContextoTablaMotor_(MOTOR_SGT360.BASES.OPERATION,
    especificacion.hoja, [especificacion.clave]);
  const ultimaFila = contexto.hoja.getLastRow();
  const existentes = ultimaFila > 1 ? contexto.hoja.getRange(2, 1, ultimaFila - 1,
    contexto.numeroColumnas).getValues() : [];
  const indicePorClave = {};

  existentes.forEach(function(fila, indice) {
    const objeto = filaAObjetoMotor_(contexto.cabeceras, fila);
    let clave = String(objeto[especificacion.clave] || "").trim();
    if (especificacion.tipo === "PROVEEDOR_OFICINAS") {
      clave = String(objeto.ID_PROVEEDOR || "").trim() + "__" +
        String(objeto.ID_OFICINA || "").trim();
    }
    if (clave) indicePorClave[clave] = indice;
  });

  let creados = 0;
  let actualizados = 0;
  let sinCambios = 0;
  const ahora = new Date();

  registros.forEach(function(registro) {
    const posicion = indicePorClave[registro.clave];
    const existe = typeof posicion === "number";
    const actual = existe ? filaAObjetoMotor_(contexto.cabeceras, existentes[posicion]) : {};
    const objeto = {
      ESTADO: registro.estado,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
    };

    if (especificacion.tipo === "PROVEEDOR_OFICINAS") {
      objeto.ID_RELACION = existe ? String(actual.ID_RELACION || "").trim() :
        "REL_" + registro.idProveedor + "__" + registro.idOficina;
      objeto.ID_PROVEEDOR = registro.idProveedor;
      objeto.ID_OFICINA = registro.idOficina;
    } else {
      objeto[especificacion.clave] = registro.clave;
      objeto.NOMBRE = registro.nombre;
      objeto.DESCRIPCION = registro.descripcion;
      if (especificacion.tipo === "GRUPOS") objeto.ID_OFICINA = registro.idOficina;
    }

    const cambio = !existe || normalizarTexto(actual.ESTADO) !== registro.estado ||
      (especificacion.tipo !== "PROVEEDOR_OFICINAS" &&
        (String(actual.NOMBRE || "").trim() !== registro.nombre ||
          String(actual.DESCRIPCION || "").trim() !== registro.descripcion)) ||
      (especificacion.tipo === "GRUPOS" &&
        String(actual.ID_OFICINA || "").trim() !== registro.idOficina);

    if (!cambio) {
      sinCambios += 1;
      return;
    }

    if (!existe) {
      objeto.FECHA_CREACION = ahora;
      indicePorClave[registro.clave] = existentes.length;
      existentes.push(objetoAFilaMotor_(contexto.cabeceras, objeto));
      creados += 1;
    } else {
      existentes[posicion] = objetoAFilaMotor_(contexto.cabeceras, objeto, existentes[posicion]);
      actualizados += 1;
    }
  });

  if (creados || actualizados) {
    contexto.hoja.getRange(2, 1, existentes.length, contexto.numeroColumnas).setValues(existentes);
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, especificacion.hoja);
    SpreadsheetApp.flush();
  }

  return {
    filasLeidas: registros.length,
    creados: creados,
    actualizados: actualizados,
    sinCambios: sinCambios
  };
}

/** @private */
function guardarRespaldoImportacionAsignacionMotor_(especificacion, contenidoCsv, nombreOriginal) {
  const idCarpeta = String(CONFIG.CARPETAS.IMPORTACIONES || "").trim();
  if (!idCarpeta) return { guardado: false, nombre: "" };

  try {
    const carpeta = DriveApp.getFolderById(idCarpeta);
    const zona = MOTOR_SGT360.ZONA_HORARIA || Session.getScriptTimeZone();
    const sello = Utilities.formatDate(new Date(), zona, "yyyyMMdd_HHmmss");
    const nombreSeguro = String(nombreOriginal || especificacion.tipo + ".csv")
      .replace(/[^A-Za-z0-9_.\-]/g, "_")
      .slice(0, 120);
    const nombre = sello + "_" + especificacion.tipo + "_" + nombreSeguro;
    carpeta.createFile(Utilities.newBlob(String(contenidoCsv || ""), "text/csv", nombre));
    return { guardado: true, nombre: nombre };
  } catch (error) {
    console.warn("No se pudo guardar el respaldo de importación: " + error.message);
    return { guardado: false, nombre: "" };
  }
}

/** @private */
function contarUsuariosAsignadosMotor_(campo, valor) {
  const campoSeguro = normalizarTexto(campo);
  const valorSeguro = String(valor || "").trim();
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO &&
      String(item[campoSeguro] || "").trim() === valorSeguro;
  }).length;
}

/** @private */
function contarUsuariosProveedorOficinaMotor_(idProveedor, idOficina) {
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO &&
      String(item.ID_PROVEEDOR || "").trim() === idProveedor &&
      String(item.ID_OFICINA || "").trim() === idOficina;
  }).length;
}

/** @private */
function validarProveedorSinDependenciasActivasMotor_(idProveedor) {
  const usuariosActivos = contarUsuariosAsignadosMotor_("ID_PROVEEDOR", idProveedor);
  if (usuariosActivos) {
    throw new Error("No puedes desactivar el proveedor mientras tenga usuarios activos.");
  }
}

/** @private */
function validarOficinaSinDependenciasActivasMotor_(idOficina) {
  const gruposActivos = listarGruposAdminMotor_().filter(function(item) {
    return item.idOficina === idOficina && item.estado === CONFIG.ESTADOS.ACTIVO;
  }).length;
  const relacionesActivas = listarRelacionesProveedorOficinaAdminMotor_().filter(function(item) {
    return item.idOficina === idOficina && item.estado === CONFIG.ESTADOS.ACTIVO;
  }).length;
  const usuariosActivos = contarUsuariosAsignadosMotor_("ID_OFICINA", idOficina);

  if (gruposActivos || relacionesActivas || usuariosActivos) {
    throw new Error("No puedes desactivar la oficina mientras tenga grupos, proveedores o usuarios activos.");
  }
}


/**
 * SGT360 — Paso 24B: expiración automática de sesiones
 *
 * Estas funciones marcan como EXPIRADA toda sesión ABIERTA cuya vigencia máxima
 * ya terminó. No eliminan registros y mantienen auditoría por cada sesión cerrada.
 */
const SESIONES_EXPIRACION_PASO_24B = Object.freeze({
  HANDLER: "cerrarSesionesExpiradasAutomaticamente",
  INTERVALO_HORAS: 1,
  ESTADO_EXPIRADO: "EXPIRADA"
});

/**
 * Función invocable por disparador temporal. Debe ejecutarse cada 1 hora.
 *
 * @return {Object} Resultado de la limpieza automática.
 */
function cerrarSesionesExpiradasAutomaticamente() {
  return expirarSesionesVencidasPaso24B_({
    origen: "TRIGGER_HORARIO",
    accion: "EXPIRAR_SESION_AUTOMATICA",
    motivo: "Expiración automática por vigencia máxima de sesión.",
    actor: null
  });
}

/**
 * Ejecuta la limpieza manual desde Auditoría > Sesiones activas.
 *
 * @param {Object=} datos Motivo opcional.
 * @return {Object} Resultado de la limpieza manual.
 */
function limpiarSesionesExpiradasAuditoriaAdminMotor(datos) {
  datos = datos || {};
  const actor = obtenerUsuarioActual();
  const resultado = expirarSesionesVencidasPaso24B_({
    origen: "ADMIN_AUDITORIA",
    accion: "LIMPIAR_SESIONES_EXPIRADAS_ADMIN",
    motivo: limpiarTextoMotor_(datos.motivo || "Limpieza manual de sesiones expiradas desde Auditoría.", 500),
    actor: {
      idUsuario: actor.idUsuario,
      correo: actor.correo,
      rol: actor.rol
    }
  });
  resultado.ejecutadoPor = actor.correo;
  return resultado;
}

/** @private */
function expirarSesionesVencidasPaso24B_(opciones) {
  opciones = opciones || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const contexto = obtenerContextoSesionesPaso13D1_();
    const ultimaFila = contexto.hoja.getLastRow();
    const ahora = new Date();
    const horasSesion = obtenerHorasSesionAuditoriaPaso24A_();
    const expiradas = [];
    let revisadas = 0;

    if (ultimaFila < 2) {
      return {
        correcto: true,
        paso: "24B",
        proceso: "EXPIRACION_SESIONES",
        sesionesRevisadas: 0,
        sesionesExpiradas: 0,
        sesiones: [],
        fechaEjecucion: ahora.toISOString(),
        mensaje: "No existen sesiones para revisar."
      };
    }

    const filas = contexto.hoja
      .getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas)
      .getValues();

    filas.forEach(function(filaValores, indice) {
      const numeroFila = indice + 2;
      const estado = normalizarTexto(filaValores[contexto.mapa.ESTADO]);
      if (estado !== AUTH_PASO_13D1.ESTADO_ABIERTO) return;
      revisadas += 1;

      const fechaInicio = convertirFechaSesionAuditoriaPaso24A_(filaValores[contexto.mapa.FECHA_INICIO]);
      const fechaExpiracion = obtenerFechaExpiracionPaso13D1_(fechaInicio, horasSesion);
      if (!fechaExpiracion || fechaExpiracion.getTime() > ahora.getTime()) return;

      const sesion = leerSesionPaso13D1_(contexto, numeroFila);
      actualizarEstadoSesionPaso13D1_(
        contexto,
        numeroFila,
        AUTH_PASO_13D1.ESTADO_EXPIRADO,
        ahora
      );

      insertarAuditoriaOAuthSinBloqueoPaso13C_({
        usuario: {
          idUsuario: sesion.idUsuario,
          correo: sesion.correo,
          rol: sesion.rol
        },
        accion: limpiarTextoMotor_(opciones.accion || "EXPIRAR_SESION", 150),
        resultado: AUTH_PASO_13C.RESULTADOS_AUDITORIA.AUTORIZADO,
        motivo: limpiarTextoMotor_(opciones.motivo || "Sesión expirada.", 500),
        origen: limpiarTextoMotor_(opciones.origen || "SISTEMA", 150),
        idSesion: sesion.idSesion,
        detalle: {
          actor: opciones.actor || null,
          estadoAnterior: sesion.estado,
          estadoNuevo: AUTH_PASO_13D1.ESTADO_EXPIRADO,
          fechaInicio: fechaInicio ? fechaInicio.toISOString() : "",
          fechaExpiracion: fechaExpiracion.toISOString(),
          fechaCierre: ahora.toISOString(),
          horasSesion: horasSesion
        }
      });

      expiradas.push({
        idSesion: sesion.idSesion,
        idSesionEnmascarado: typeof enmascararIdSesionOAuthPaso13C_ === "function" ?
          enmascararIdSesionOAuthPaso13C_(sesion.idSesion) : sesion.idSesion,
        idUsuario: sesion.idUsuario,
        correo: sesion.correo,
        rol: sesion.rol,
        fechaExpiracion: fechaExpiracion.toISOString()
      });
    });

    SpreadsheetApp.flush();
    if (expiradas.length) invalidarCacheMotor_("SECURITY");

    return {
      correcto: true,
      paso: "24B",
      proceso: "EXPIRACION_SESIONES",
      sesionesRevisadas: revisadas,
      sesionesExpiradas: expiradas.length,
      sesiones: expiradas,
      intervaloRecomendadoHoras: SESIONES_EXPIRACION_PASO_24B.INTERVALO_HORAS,
      fechaEjecucion: ahora.toISOString(),
      mensaje: expiradas.length ?
        "Sesiones expiradas: " + expiradas.length + "." :
        "No se encontraron sesiones vencidas pendientes."
    };
  } finally {
    bloqueo.releaseLock();
  }
}
