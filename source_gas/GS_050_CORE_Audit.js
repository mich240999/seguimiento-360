/**
 * SGT360 — Auditoría general del motor
 *
 * Responsabilidad:
 * Registra eventos funcionales y técnicos en SEG_AUDITORIA_EVENTOS sin
 * interrumpir la operación principal cuando la auditoría no está disponible.
 *
 * Dependencias:
 * - GS_010_CFG_App.gs: CONFIG y nombre de hoja de auditoría.
 * - GS_020_CFG_Environment.gs: MOTOR_SGT360 y acceso a bases.
 * - GS_030_CORE_Utils.gs: generación de IDs, normalización y limpieza.
 * - GS_040_CORE_Data.gs: asegurarHojaMotor_(), obtenerContextoTablaMotor_(),
 *   objetoAFilaMotor_().
 * - GS_150_AUTH_UserContext.gs: contexto de usuario, cuando ya está cargado.
 *
 * Importante:
 * La auditoría es tolerante a fallos. Si no puede escribir, registra una
 * advertencia en el log y devuelve correcto:false, pero no bloquea la acción
 * del usuario.
 */

const CABECERAS_AUDITORIA_EVENTOS_MOTOR_ = Object.freeze([
  "ID_EVENTO",
  "FECHA_HORA",
  "ID_USUARIO",
  "CORREO",
  "ROL",
  "MODULO",
  "ACCION",
  "ENTIDAD",
  "ID_ENTIDAD",
  "RESULTADO",
  "DETALLE"
]);

/**
 * Obtiene el actor que se registrará en la auditoría.
 *
 * Prioridad:
 * 1. Contexto autenticado establecido por el RPC.
 * 2. Correo de la sesión activa de Google, cuando esté disponible.
 *
 * @return {Object} Datos básicos del actor.
 * @private
 */
function obtenerActorAuditoriaMotor_() {
  let usuario = null;

  if (typeof obtenerUsuarioEjecucionPaso15A_ === "function") {
    try {
      usuario = obtenerUsuarioEjecucionPaso15A_();
    } catch (errorContexto) {
      usuario = null;
    }
  }

  if (usuario && typeof usuario === "object") {
    return {
      idUsuario: String(usuario.idUsuario || usuario.ID_USUARIO || "").trim(),
      correo: normalizarCorreo(usuario.correo || usuario.CORREO),
      rol: normalizarTexto(usuario.rol || usuario.ROL)
    };
  }

  let correoSesion = "";

  try {
    correoSesion = normalizarCorreo(Session.getActiveUser().getEmail());
  } catch (errorSesion) {
    correoSesion = "";
  }

  return {
    idUsuario: "",
    correo: correoSesion,
    rol: ""
  };
}

/**
 * Convierte el detalle de auditoría en texto JSON y oculta valores sensibles.
 *
 * Las propiedades cuyo nombre contiene SECRET, TOKEN, PASSWORD, CONTRASENA,
 * API_KEY o CREDENTIAL se reemplazan por [REDACTADO].
 *
 * @param {*} detalle Detalle recibido.
 * @return {string} Texto seguro y limitado.
 * @private
 */
function serializarDetalleAuditoriaMotor_(detalle) {
  if (detalle === null || detalle === undefined || detalle === "") {
    return "";
  }

  if (typeof detalle === "string") {
    return limpiarTextoMotor_(detalle, 10000);
  }

  try {
    const texto = JSON.stringify(detalle, function(clave, valor) {
      if (/SECRET|TOKEN|PASSWORD|CONTRASENA|API_KEY|CREDENTIAL/i.test(clave)) {
        return "[REDACTADO]";
      }

      if (typeof valor === "function") {
        return "[FUNCION]";
      }

      return valor;
    });

    return limpiarTextoMotor_(texto || "", 10000);
  } catch (error) {
    return limpiarTextoMotor_(String(detalle), 10000);
  }
}

/**
 * Registra un evento general del motor.
 *
 * Campos admitidos en evento:
 * - idUsuario, correo y rol: sobrescriben al actor detectado.
 * - modulo: código del módulo.
 * - accion: operación realizada.
 * - resultado: OK, ERROR, DENEGADO u otro estado normalizado.
 * - entidad e idEntidad: objeto funcional afectado.
 * - detalle: texto u objeto complementario.
 *
 * Ejemplo:
 *   registrarEventoMotor_({
 *     modulo: "ADMINISTRACION",
 *     accion: "ACTUALIZAR_USUARIO",
 *     entidad: "USUARIO",
 *     idEntidad: "USR-123",
 *     resultado: "OK"
 *   });
 *
 * @param {Object=} evento Información del evento.
 * @return {{correcto:boolean, idEvento:string, mensaje:string}}
 * @private
 */
function registrarEventoMotor_(evento) {
  const datosEvento = evento && typeof evento === "object" ? evento : {};
  const idEvento = generarIdMotor_("EVT");

  try {
    const nombreHoja = CONFIG.HOJAS.AUDITORIA_EVENTOS;

    asegurarHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      nombreHoja,
      CABECERAS_AUDITORIA_EVENTOS_MOTOR_
    );

    const contexto = obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      nombreHoja,
      ["ID_EVENTO", "FECHA_HORA", "ACCION", "RESULTADO"]
    );
    const actor = obtenerActorAuditoriaMotor_();
    const objeto = {
      ID_EVENTO: idEvento,
      FECHA_HORA: new Date(),
      ID_USUARIO: limpiarTextoMotor_(datosEvento.idUsuario || actor.idUsuario, 200),
      CORREO: normalizarCorreo(datosEvento.correo || actor.correo),
      ROL: normalizarTexto(datosEvento.rol || actor.rol),
      MODULO: normalizarTexto(datosEvento.modulo || "SISTEMA"),
      ACCION: normalizarTexto(datosEvento.accion || "EVENTO"),
      ENTIDAD: limpiarTextoMotor_(datosEvento.entidad, 120),
      ID_ENTIDAD: limpiarTextoMotor_(datosEvento.idEntidad, 200),
      RESULTADO: normalizarTexto(datosEvento.resultado || "OK"),
      DETALLE: serializarDetalleAuditoriaMotor_(datosEvento.detalle)
    };
    const fila = objetoAFilaMotor_(contexto.cabeceras, objeto);
    const filaDestino = contexto.hoja.getLastRow() + 1;

    contexto.hoja
      .getRange(filaDestino, 1, 1, fila.length)
      .setValues([fila]);

    return {
      correcto: true,
      idEvento: idEvento,
      mensaje: "Evento registrado."
    };
  } catch (error) {
    console.warn(
      "No se pudo registrar la auditoría general [%s]: %s",
      idEvento,
      error && error.message ? error.message : String(error)
    );

    return {
      correcto: false,
      idEvento: idEvento,
      mensaje: error && error.message ? error.message : String(error)
    };
  }
}

/**
 * Atajo para registrar errores técnicos de manera uniforme.
 *
 * @param {string} modulo Código del módulo.
 * @param {string} accion Acción que falló.
 * @param {*} error Error capturado.
 * @param {Object=} detalle Información adicional.
 * @return {Object} Resultado de registrarEventoMotor_().
 * @private
 */
function registrarErrorMotor_(modulo, accion, error, detalle) {
  return registrarEventoMotor_({
    modulo: modulo || "SISTEMA",
    accion: accion || "ERROR",
    resultado: "ERROR",
    detalle: {
      mensaje: error && error.message ? error.message : String(error || "Error no especificado"),
      nombre: error && error.name ? error.name : "Error",
      contexto: detalle || {}
    }
  });
}

/**
 * Atajo para registrar un cambio sobre una entidad.
 *
 * @param {string} modulo Código del módulo.
 * @param {string} accion Acción ejecutada.
 * @param {string} entidad Tipo de entidad.
 * @param {string} idEntidad Identificador afectado.
 * @param {*} detalle Resumen del cambio.
 * @return {Object} Resultado de registrarEventoMotor_().
 * @private
 */
function registrarCambioMotor_(modulo, accion, entidad, idEntidad, detalle) {
  return registrarEventoMotor_({
    modulo: modulo,
    accion: accion,
    resultado: "OK",
    entidad: entidad,
    idEntidad: idEntidad,
    detalle: detalle
  });
}
