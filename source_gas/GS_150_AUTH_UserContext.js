/**
 * SGT360 — Contexto del usuario
 *
 * Responsabilidad:
 * Mantiene la identidad validada durante cada ejecución y resuelve el usuario
 * activo.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * Contexto de usuario autenticado para Google y Microsoft.
 */

var AUTH_USUARIO_EJECUCION_PASO_15A_ = null;

/**
 * Establece usuario ejecucion paso15 a. Función interna del motor.
 */
function establecerUsuarioEjecucionPaso15A_(usuario) {
  if (!usuario || typeof usuario !== "object") {
    throw new Error(
      "No se recibió un usuario autenticado válido."
    );
  }

  const correo = normalizarCorreo(
    usuario.correo || usuario.CORREO
  );

  if (!correo) {
    throw new Error(
      "El usuario autenticado no tiene correo."
    );
  }

  AUTH_USUARIO_EJECUCION_PASO_15A_ = {
    idUsuario: String(
      usuario.idUsuario || usuario.ID_USUARIO || ""
    ).trim(),
    correo: correo,
    nombre: String(
      usuario.nombre || usuario.NOMBRE || ""
    ).trim(),
    telefono: String(
      usuario.telefono || usuario.TELEFONO || ""
    ).trim(),
    rol: normalizarTexto(
      usuario.rol || usuario.ROL
    ),
    idProveedor: String(
      usuario.idProveedor || usuario.ID_PROVEEDOR || ""
    ).trim(),
    idOficina: String(
      usuario.idOficina || usuario.ID_OFICINA || ""
    ).trim(),
    idGrupo: String(
      usuario.idGrupo || usuario.ID_GRUPO || ""
    ).trim(),
    estado: normalizarTexto(
      usuario.estado || usuario.ESTADO
    )
  };

  return Object.assign({},
    AUTH_USUARIO_EJECUCION_PASO_15A_
  );
}

/**
 * Limpia usuario ejecucion paso15 a. Función interna del motor.
 */
function limpiarUsuarioEjecucionPaso15A_() {
  AUTH_USUARIO_EJECUCION_PASO_15A_ = null;
}

/**
 * Obtiene usuario ejecucion paso15 a. Función interna del motor.
 */
function obtenerUsuarioEjecucionPaso15A_() {
  return AUTH_USUARIO_EJECUCION_PASO_15A_ ?
    Object.assign({},
      AUTH_USUARIO_EJECUCION_PASO_15A_
    ) :
    null;
}

/**
 * Obtiene email usuario.
 */
function obtenerEmailUsuario() {
  const usuarioEjecucion =
    obtenerUsuarioEjecucionPaso15A_();

  if (usuarioEjecucion && usuarioEjecucion.correo) {
    return usuarioEjecucion.correo;
  }

  return normalizarCorreo(
    Session.getActiveUser().getEmail()
  );
}

/**
 * Obtiene usuario actual.
 */
function obtenerUsuarioActual() {
  const usuarioEjecucion =
    obtenerUsuarioEjecucionPaso15A_();

  let usuario = null;

  if (
    usuarioEjecucion &&
    usuarioEjecucion.idUsuario
  ) {
    usuario = buscarUsuarioPorId(
      usuarioEjecucion.idUsuario
    );
  } else {
    const correo = obtenerEmailUsuario();

    if (!correo) {
      throw new Error(
        "No fue posible obtener la identidad del usuario autenticado."
      );
    }

    usuario = buscarUsuarioPorCorreo(correo);
  }

  if (!usuario) {
    throw new Error(
      "Usuario no registrado."
    );
  }

  if (
    usuarioEjecucion &&
    usuarioEjecucion.correo &&
    usuarioEjecucion.correo !== usuario.correo
  ) {
    throw new Error(
      "La credencial de acceso cambió. Vuelve a iniciar sesión."
    );
  }

  if (
    normalizarTexto(usuario.estado) !==
    normalizarTexto(CONFIG.ESTADOS.ACTIVO)
  ) {
    throw new Error(
      "Usuario inactivo."
    );
  }

  return usuario;
}
