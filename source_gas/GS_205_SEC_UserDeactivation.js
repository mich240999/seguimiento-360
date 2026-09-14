/**
 * SGT360 — Baja administrativa de usuarios.
 * Usa CAMBIAR_ESTADO como permiso independiente de EDITAR.
 */
function darDeBajaUsuarioAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const operador = obtenerUsuarioAdministracionSeguroMotor_();
    const idUsuario = String(datos.idUsuario || "").trim();
    if (!idUsuario) throw new Error("No se recibió el usuario que deseas dar de baja.");

    exigirPermisoMotor_("ADMIN_USUARIOS", "CAMBIAR_ESTADO", operador);

    const objetivo = buscarUsuarioPorId(idUsuario);
    if (!objetivo) throw new Error("No se encontró el usuario seleccionado.");
    if (normalizarTexto(objetivo.estado) !== CONFIG.ESTADOS.ACTIVO) {
      return { correcto: true, yaInactivo: true, usuario: objetivo };
    }

    if (String(objetivo.idUsuario) === String(operador.idUsuario)) {
      throw new Error("No puedes dar de baja tu propio usuario desde esta acción.");
    }

    if (normalizarTexto(operador.rol) !== CONFIG.ROLES.SUPERADMIN) {
      const alcance = obtenerAlcancePermisoMotor_("ADMIN_USUARIOS", "CAMBIAR_ESTADO", operador);
      if (alcance === "NINGUNO" || !usuarioPerteneceAlcanceAdminMotor_(objetivo, operador, alcance)) {
        throw new Error("El usuario seleccionado está fuera de tu alcance autorizado.");
      }
      if (normalizarTexto(objetivo.rol) === CONFIG.ROLES.SUPERADMIN) {
        throw new Error("Solo un SUPERADMIN puede administrar a otro SUPERADMIN.");
      }
    }

    const usuarios = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS);
    const filaUsuario = usuarios.find(function(item) {
      return String(item.ID_USUARIO || "").trim() === idUsuario;
    });
    if (!filaUsuario) throw new Error("No se encontró la fila del usuario seleccionado.");

    const ahora = new Date();
    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.USUARIOS,
      "ID_USUARIO",
      Object.assign({}, filaUsuario, {
        ESTADO: CONFIG.ESTADOS.INACTIVO,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: operador.idUsuario
      })
    );

    const sesiones = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.SESIONES_USUARIOS);
    sesiones.forEach(function(sesion) {
      if (String(sesion.ID_USUARIO || "").trim() !== idUsuario) return;
      if (["ABIERTA", "ACTIVA"].indexOf(normalizarTexto(sesion.ESTADO)) === -1) return;
      guardarObjetoMotor_(
        MOTOR_SGT360.BASES.SECURITY,
        CONFIG.HOJAS.SESIONES_USUARIOS,
        "ID_SESION",
        Object.assign({}, sesion, {
          ESTADO: "CERRADA",
          FECHA_FIN: ahora,
          ULTIMA_ACTIVIDAD: ahora,
          MODULO_ACTUAL: "BAJA_ADMINISTRATIVA",
          FECHA_ACTUALIZACION: ahora
        })
      );
    });

    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");
    registrarEventoMotor_({
      modulo: "ADMIN_USUARIOS",
      accion: "DAR_DE_BAJA_USUARIO",
      entidad: "USUARIO",
      idEntidad: idUsuario,
      detalle: {
        usuario: objetivo.correo,
        estadoAnterior: objetivo.estado,
        estadoNuevo: CONFIG.ESTADOS.INACTIVO
      }
    });

    return { correcto: true, usuario: buscarUsuarioPorId(idUsuario) };
  } finally {
    bloqueo.releaseLock();
  }
}
