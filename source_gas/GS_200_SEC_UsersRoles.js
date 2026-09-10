/**
 * SGT360 — Usuarios y roles dinámicos
 *
 * Responsabilidad:
 * Consulta, crea y actualiza usuarios y roles. Mantiene únicamente SUPERADMIN
 * y ADMIN como roles protegidos; los demás roles son configurables, poseen un
 * código técnico estable y reciben permisos y alcances desde SEG_PERMISOS.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Busca un usuario por correo. */
function buscarUsuarioPorCorreo(correo) {
  const buscado = normalizarCorreo(correo);
  if (!buscado) return null;
  const fila = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).find(function(
    item) {
    return normalizarCorreo(item.CORREO) === buscado;
  });
  return fila ? mapearUsuarioMotor_(fila) : null;
}

/** Busca un usuario por ID. */
function buscarUsuarioPorId(idUsuario) {
  const buscado = String(idUsuario || "").trim();
  if (!buscado) return null;
  const fila = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).find(function(
    item) {
    return String(item.ID_USUARIO || "").trim() === buscado;
  });
  return fila ? mapearUsuarioMotor_(fila) : null;
}

/** @private */
function mapearUsuarioMotor_(fila) {
  return {
    idUsuario: String(fila.ID_USUARIO || "").trim(),
    correo: normalizarCorreo(fila.CORREO),
    nombre: String(fila.NOMBRE || "").trim(),
    telefono: String(fila.TELEFONO || "").trim(),
    rol: normalizarTexto(fila.ROL),
    idProveedor: String(fila.ID_PROVEEDOR || "").trim(),
    idOficina: String(fila.ID_OFICINA || "").trim(),
    idGrupo: String(fila.ID_GRUPO || "").trim(),
    tipoDocumento: String(fila.TIPO_DOCUMENTO || "").trim(),
    numeroDocumento: String(fila.NUMERO_DOCUMENTO || "").trim(),
    estado: normalizarTexto(fila.ESTADO)
  };
}

/** @private */
function mapearRolMotor_(item, usuariosActivos) {
  const codigo = normalizarTexto(item.CODIGO);
  return {
    idRol: String(item.ID_ROL || "").trim(),
    codigo: codigo,
    nombre: String(item.NOMBRE || "").trim(),
    descripcion: String(item.DESCRIPCION || "").trim(),
    nivel: Number(item.NIVEL) || 0,
    estado: normalizarTexto(item.ESTADO),
    sistema: esCodigoRolProtegidoMotor_(codigo),
    protegido: esCodigoRolProtegidoMotor_(codigo),
    tipo: esCodigoRolProtegidoMotor_(codigo) ? "PROTEGIDO" : "CONFIGURABLE",
    usuariosActivos: usuariosActivos && usuariosActivos[codigo] ? usuariosActivos[codigo] : 0,
    fechaCreacion: serializarFechaRolRpcMotor_(item.FECHA_CREACION),
    fechaActualizacion: serializarFechaRolRpcMotor_(item.FECHA_ACTUALIZACION),
    usuarioCreacion: String(item.USUARIO_CREACION || "").trim(),
    usuarioModificacion: String(item.USUARIO_MODIFICACION || "").trim()
  };
}

/**
 * Convierte una fecha de Sheets en un valor compatible con google.script.run.
 * @private
 */
function serializarFechaRolRpcMotor_(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? "" : valor.toISOString();
  }
  return String(valor);
}

/** @private */
function esCodigoRolProtegidoMotor_(codigo) {
  const valor = normalizarTexto(codigo);
  return valor === CONFIG.ROLES.SUPERADMIN || valor === CONFIG.ROLES.ADMIN;
}

/** @private */
function normalizarCodigoRolMotor_(valor) {
  const codigo = normalizarTexto(valor)
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!codigo) throw new Error("El código técnico del rol es obligatorio.");
  if (!/^[A-Z][A-Z0-9_]{1,59}$/.test(codigo)) {
    throw new Error("El código debe iniciar con una letra y contener entre 2 y 60 caracteres: letras, números o guion bajo.");
  }
  return codigo;
}

/** @private */
function obtenerRolPorCodigoMotor_(codigo, requerirActivo) {
  const buscado = normalizarTexto(codigo);
  const fila = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD).find(function(item) {
    return normalizarTexto(item.CODIGO) === buscado;
  });
  if (!fila) return null;
  const rol = mapearRolMotor_(fila, null);
  if (requerirActivo !== false && rol.estado !== CONFIG.ESTADOS.ACTIVO) return null;
  return rol;
}

/** @private */
function obtenerRolPorIdMotor_(idRol) {
  const buscado = String(idRol || "").trim();
  if (!buscado) return null;
  const fila = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD).find(function(item) {
    return String(item.ID_ROL || "").trim() === buscado;
  });
  return fila ? mapearRolMotor_(fila, null) : null;
}

/** Obtiene roles activos. */
function obtenerRolesActivos() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD).filter(function(
    item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    return mapearRolMotor_(item, null);
  }).sort(function(a, b) {
    return a.nivel - b.nivel || compararTextoMotor_(a.nombre, b.nombre);
  });
}

/** Obtiene un rol activo por código. */
function obtenerRolActivoPorCodigo(codigo) {
  const rol = obtenerRolPorCodigoMotor_(codigo, true);
  if (!rol) throw new Error("El rol " + normalizarTexto(codigo) + " no existe o está inactivo.");
  return rol;
}

/** Lista usuarios para administración. */
/**
 * Construye el catálogo enriquecido de usuarios una sola vez por revisión de datos.
 * La clave cambia automáticamente cuando se modifica seguridad, estructura o maestros.
 * @private
 */

/**
 * Devuelve el nivel administrativo conocido para un código de rol.
 * @private
 */
function obtenerNivelRolUsuariosMotor_(codigoRol) {
  const rol = obtenerRolPorCodigoMotor_(codigoRol, false);
  return rol ? Number(rol.nivel || 9999) : 9999;
}

/**
 * Obtiene exclusivamente la identidad establecida por el RPC seguro.
 * Nunca utiliza Session.getActiveUser() como respaldo para administrar usuarios.
 * @private
 */
function obtenerUsuarioAdministracionSeguroMotor_() {
  const contexto = typeof obtenerUsuarioEjecucionPaso15A_ === "function" ?
    obtenerUsuarioEjecucionPaso15A_() : null;
  if (!contexto || !String(contexto.idUsuario || "").trim()) {
    throw new Error(
      "No se pudo determinar la identidad segura de la operación. Vuelve a iniciar sesión."
    );
  }

  const usuario = buscarUsuarioPorId(contexto.idUsuario);
  if (!usuario || normalizarTexto(usuario.estado) !== CONFIG.ESTADOS.ACTIVO) {
    throw new Error("El usuario de la sesión no existe o está inactivo.");
  }
  if (
    contexto.correo &&
    normalizarCorreo(contexto.correo) !== normalizarCorreo(usuario.correo)
  ) {
    throw new Error("La identidad de la sesión no coincide con el usuario registrado.");
  }
  if (
    contexto.rol &&
    normalizarTexto(contexto.rol) !== normalizarTexto(usuario.rol)
  ) {
    throw new Error("El rol de la sesión cambió. Vuelve a iniciar sesión.");
  }
  return usuario;
}

/**
 * Determina si un usuario objetivo pertenece al alcance del operador.
 * @private
 */
function usuarioPerteneceAlcanceAdminMotor_(objetivo, operador, alcance) {
  if (!objetivo || !operador) return false;
  if (normalizarTexto(operador.rol) === CONFIG.ROLES.SUPERADMIN) return true;

  const codigoAlcance = normalizarAlcanceSeguridadMotor_(alcance || "PROPIO");
  if (normalizarTexto(objetivo.rol) === CONFIG.ROLES.SUPERADMIN) return false;
  if (
    obtenerNivelRolUsuariosMotor_(objetivo.rol) <
    obtenerNivelRolUsuariosMotor_(operador.rol)
  ) {
    return false;
  }

  if (codigoAlcance === "GLOBAL") return true;
  if (codigoAlcance === "PROPIO" || codigoAlcance === "ASIGNADOS") {
    return String(objetivo.idUsuario || "") === String(operador.idUsuario || "");
  }
  if (codigoAlcance === "PROVEEDOR") {
    return Boolean(
      operador.idProveedor &&
      objetivo.idProveedor &&
      String(objetivo.idProveedor) === String(operador.idProveedor)
    );
  }
  if (codigoAlcance === "GRUPO") {
    return Boolean(
      operador.idGrupo &&
      objetivo.idGrupo &&
      String(objetivo.idGrupo) === String(operador.idGrupo)
    );
  }
  return false;
}

/**
 * Aplica el alcance efectivo antes de entregar usuarios al navegador.
 * @private
 */
function filtrarUsuariosPorAlcanceAdminMotor_(registros, usuario, recurso) {
  usuario = usuario || obtenerUsuarioAdministracionSeguroMotor_();
  const alcance = obtenerAlcancePermisoMotor_(
    "ADMIN_USUARIOS",
    recurso || "VER_LISTADO",
    usuario
  );
  if (alcance === "NINGUNO") return [];
  return (Array.isArray(registros) ? registros : []).filter(function(item) {
    return usuarioPerteneceAlcanceAdminMotor_(item, usuario, alcance);
  });
}

/**
 * Entrega únicamente las asignaciones organizativas que el usuario puede usar.
 */
function obtenerEstructuraAsignacionesUsuariosMotor() {
  const usuario = obtenerUsuarioAdministracionSeguroMotor_();
  const alcance = obtenerAlcancePermisoMotor_(
    "ADMIN_USUARIOS",
    "VER_DETALLE",
    usuario
  );
  const estructura = obtenerEstructuraAsignacionesMotor_();

  if (normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN || alcance === "GLOBAL") {
    return estructura;
  }

  let idsProveedor = [];
  let idsOficina = [];
  let idsGrupo = [];

  if (alcance === "PROVEEDOR") {
    if (usuario.idProveedor) idsProveedor = [usuario.idProveedor];
    idsOficina = estructura.relacionesProveedorOficina.filter(function(relacion) {
      return idsProveedor.indexOf(relacion.idProveedor) !== -1 &&
        relacion.estado === CONFIG.ESTADOS.ACTIVO;
    }).map(function(relacion) {
      return relacion.idOficina;
    });
    idsGrupo = estructura.grupos.filter(function(grupo) {
      return idsOficina.indexOf(grupo.idOficina) !== -1;
    }).map(function(grupo) {
      return grupo.idGrupo;
    });
  } else if (alcance === "GRUPO") {
    if (usuario.idProveedor) idsProveedor = [usuario.idProveedor];
    if (usuario.idOficina) idsOficina = [usuario.idOficina];
    if (usuario.idGrupo) idsGrupo = [usuario.idGrupo];
  } else {
    if (usuario.idProveedor) idsProveedor = [usuario.idProveedor];
    if (usuario.idOficina) idsOficina = [usuario.idOficina];
    if (usuario.idGrupo) idsGrupo = [usuario.idGrupo];
  }

  return {
    proveedores: estructura.proveedores.filter(function(item) {
      return idsProveedor.indexOf(item.idProveedor) !== -1;
    }),
    oficinas: estructura.oficinas.filter(function(item) {
      return idsOficina.indexOf(item.idOficina) !== -1;
    }),
    grupos: estructura.grupos.filter(function(item) {
      return idsGrupo.indexOf(item.idGrupo) !== -1;
    }),
    relacionesProveedorOficina: estructura.relacionesProveedorOficina.filter(function(item) {
      return idsProveedor.indexOf(item.idProveedor) !== -1 &&
        idsOficina.indexOf(item.idOficina) !== -1;
    }),
    tiposDocumento: estructura.tiposDocumento,
    reglas: estructura.reglas
  };
}

/**
 * Impide crear o modificar usuarios fuera del alcance autorizado.
 * @private
 */
function validarOperacionUsuarioPorAlcanceMotor_(
  operador,
  existente,
  propuesta,
  recurso
) {
  if (normalizarTexto(operador.rol) === CONFIG.ROLES.SUPERADMIN) return true;

  const alcance = obtenerAlcancePermisoMotor_(
    "ADMIN_USUARIOS",
    recurso,
    operador
  );
  if (alcance === "NINGUNO") {
    throw new Error("No tienes un alcance válido para administrar usuarios.");
  }

  if (recurso === "CREAR") {
    if (alcance === "PROPIO" || alcance === "ASIGNADOS") {
      throw new Error("El alcance " + alcance + " no permite crear otros usuarios.");
    }
    if (!usuarioPerteneceAlcanceAdminMotor_(propuesta, operador, alcance)) {
      throw new Error("El nuevo usuario está fuera de tu alcance autorizado.");
    }
    return true;
  }

  if (!existente || !usuarioPerteneceAlcanceAdminMotor_(existente, operador, alcance)) {
    throw new Error("No puedes modificar un usuario fuera de tu alcance.");
  }
  if (!usuarioPerteneceAlcanceAdminMotor_(propuesta, operador, alcance)) {
    throw new Error(
      "La modificación movería al usuario fuera de tu alcance autorizado."
    );
  }

  if (alcance === "PROPIO" || alcance === "ASIGNADOS") {
    const camposProtegidos = [
      ["correo", existente.correo, propuesta.correo],
      ["rol", existente.rol, propuesta.rol],
      ["proveedor", existente.idProveedor, propuesta.idProveedor],
      ["oficina", existente.idOficina, propuesta.idOficina],
      ["grupo", existente.idGrupo, propuesta.idGrupo],
      ["estado", existente.estado, propuesta.estado]
    ];
    const modificado = camposProtegidos.find(function(item) {
      return String(item[1] || "") !== String(item[2] || "");
    });
    if (modificado) {
      throw new Error(
        "Con alcance propio no puedes cambiar " + modificado[0] +
        " ni las asignaciones de seguridad."
      );
    }
  }
  return true;
}

function construirCatalogoUsuariosAdminMotor_() {
  const claveCache = construirClaveCacheMotor_(
    "ADMIN_USUARIOS_LISTADO",
    obtenerRevisionDatosMotor_()
  );

  return obtenerOConstruirCacheMotor_(claveCache, function() {
    const estructura = obtenerEstructuraAsignacionesMotor_();
    const proveedores = {};
    const oficinas = {};
    const grupos = {};
    const roles = {};

    estructura.proveedores.forEach(function(item) {
      proveedores[item.idProveedor] = {
        nombre: item.nombreComercial || item.razonSocial || item.nombre || "",
        razonSocial: item.razonSocial || "",
        nombreComercial: item.nombreComercial || ""
      };
    });
    estructura.oficinas.forEach(function(item) {
      oficinas[item.idOficina] = item.nombre;
    });
    estructura.grupos.forEach(function(item) {
      grupos[item.idGrupo] = item.nombre;
    });
    listarRolesAdminMotor().forEach(function(item) {
      roles[item.codigo] = item.nombre || "";
    });

    return leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.USUARIOS
    ).map(mapearUsuarioMotor_).map(function(item) {
      const proveedor = proveedores[item.idProveedor] || null;
      return Object.assign({}, item, {
        codigoRol: item.rol,
        nombreRol: roles[item.rol] || "",
        nombreProveedor: proveedor ? proveedor.nombre : "",
        razonSocialProveedor: proveedor ? proveedor.razonSocial : "",
        nombreComercialProveedor: proveedor ? proveedor.nombreComercial : "",
        codigoInternoProveedor: item.idProveedor || "",
        nombreOficina: oficinas[item.idOficina] || "",
        nombreGrupo: grupos[item.idGrupo] || ""
      });
    }).sort(function(a, b) {
      return compararTextoMotor_(a.nombre, b.nombre);
    });
  }, 300);
}

/**
 * Construye una vista cacheada que ya está segmentada por identidad y alcance.
 * @private
 */
function construirCatalogoUsuariosAutorizadoMotor_(usuario, recurso, alcance) {
  usuario = usuario || obtenerUsuarioAdministracionSeguroMotor_();
  const codigoRecurso = normalizarTexto(recurso || "VER_LISTADO");
  const codigoAlcance = alcance || obtenerAlcancePermisoMotor_(
    "ADMIN_USUARIOS",
    codigoRecurso,
    usuario
  );
  if (codigoAlcance === "NINGUNO") return [];

  const identificador = [
    obtenerRevisionDatosMotor_(),
    usuario.idUsuario,
    usuario.rol,
    usuario.idProveedor,
    usuario.idGrupo,
    codigoRecurso,
    codigoAlcance
  ].join("|");
  const claveCache = construirClaveCacheMotor_(
    "ADMIN_USUARIOS_AUTORIZADOS",
    identificador
  );

  return obtenerOConstruirCacheMotor_(claveCache, function() {
    const registros = filtrarUsuariosPorAlcanceAdminMotor_(
      construirCatalogoUsuariosAdminMotor_(),
      usuario,
      codigoRecurso
    ).filter(function(item) {
      if (normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN) return true;
      return normalizarTexto(item.rol) !== CONFIG.ROLES.SUPERADMIN;
    });

    if (
      normalizarTexto(usuario.rol) !== CONFIG.ROLES.SUPERADMIN &&
      registros.some(function(item) {
        return normalizarTexto(item.rol) === CONFIG.ROLES.SUPERADMIN;
      })
    ) {
      throw new Error("La validación de alcance detectó un registro protegido.");
    }
    if (
      codigoAlcance === "PROVEEDOR" &&
      registros.some(function(item) {
        return !usuario.idProveedor ||
          String(item.idProveedor || "") !== String(usuario.idProveedor || "");
      })
    ) {
      throw new Error("La validación de alcance detectó usuarios de otro proveedor.");
    }
    if (
      (codigoAlcance === "PROPIO" || codigoAlcance === "ASIGNADOS") &&
      registros.some(function(item) {
        return String(item.idUsuario || "") !== String(usuario.idUsuario || "");
      })
    ) {
      throw new Error("La validación de alcance detectó usuarios ajenos.");
    }
    return registros;
  }, 120);
}


/**
 * Lista usuarios para administración.
 *
 * Con todos:true devuelve el catálogo completo autorizado para que el navegador
 * realice búsquedas instantáneas sin consultar Apps Script por cada tecla.
 */
function listarUsuariosAdminMotor(filtros) {
  filtros = filtros || {};
  const usuarioActual = obtenerUsuarioAdministracionSeguroMotor_();
  const alcance = obtenerAlcancePermisoMotor_(
    "ADMIN_USUARIOS",
    "VER_LISTADO",
    usuarioActual
  );
  const texto = normalizarTexto(filtros.texto || "");
  const rol = normalizarTexto(filtros.rol || "");
  const estado = normalizarTexto(filtros.estado || "");

  const registrosAutorizados = construirCatalogoUsuariosAutorizadoMotor_(
    usuarioActual,
    "VER_LISTADO",
    alcance
  );

  const registros = registrosAutorizados.filter(function(item) {
    if (rol && item.rol !== rol) return false;
    if (estado && item.estado !== estado) return false;
    if (texto && normalizarTexto([
      item.nombre,
      item.correo,
      item.numeroDocumento,
      item.nombreRol,
      item.nombreProveedor,
      item.razonSocialProveedor,
      item.nombreComercialProveedor,
      item.nombreOficina,
      item.nombreGrupo
    ].join(" ")).indexOf(texto) === -1) return false;
    return true;
  });

  const contextoAcceso = {
    idUsuario: usuarioActual.idUsuario,
    rol: usuarioActual.rol,
    idProveedor: usuarioActual.idProveedor || "",
    idGrupo: usuarioActual.idGrupo || "",
    alcance: alcance,
    revision: obtenerRevisionDatosMotor_()
  };

  if (convertirBooleanoMotor_(filtros.todos)) {
    return {
      registros: registros,
      paginacion: {
        pagina: 1,
        tamano: registros.length,
        total: registros.length,
        totalPaginas: 1
      },
      contextoAcceso: contextoAcceso
    };
  }

  const respuesta = paginarArregloMotor_(registros, filtros.pagina, filtros.tamano);
  respuesta.contextoAcceso = contextoAcceso;
  return respuesta;
}

/** Guarda un usuario desde la administración. */
function guardarUsuarioAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const usuarioActual = obtenerUsuarioAdministracionSeguroMotor_();
    const idUsuarioRecibido = String(datos.idUsuario || "").trim();
    const idUsuario = idUsuarioRecibido || generarIdMotor_("USR");
    const correo = normalizarCorreo(datos.correo);
    const nombre = limpiarTextoMotor_(datos.nombre, 180);
    const codigoRol = normalizarTexto(datos.rol);
    const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);
    const esSuperadminActual =
      normalizarTexto(usuarioActual.rol) === CONFIG.ROLES.SUPERADMIN;
    const tipoDocumento = normalizarTexto(datos.tipoDocumento);
    const numeroDocumento = normalizarNumeroDocumentoUsuarioMotor_(
      datos.numeroDocumento
    );
    const idProveedor = String(datos.idProveedor || "").trim();
    const idOficina = String(datos.idOficina || "").trim();
    const idGrupo = String(datos.idGrupo || "").trim();

    if (!nombre) throw new Error("El nombre completo es obligatorio.");
    if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      throw new Error("Ingresa un correo válido.");
    }
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado del usuario no es válido.");
    }

    const rolObjetivo = obtenerRolActivoPorCodigo(codigoRol);
    const rolOperador = obtenerRolActivoPorCodigo(usuarioActual.rol);
    if (
      !esSuperadminActual &&
      Number(rolObjetivo.nivel) < Number(rolOperador.nivel)
    ) {
      throw new Error(
        "No puedes asignar un rol con un nivel administrativo superior al tuyo."
      );
    }

    validarDocumentoUsuarioMotor_(tipoDocumento, numeroDocumento, idUsuario);
    validarAsignacionesUsuarioMotor_(
      rolObjetivo,
      idProveedor,
      idOficina,
      idGrupo
    );

    const existenteCorreo = buscarUsuarioPorCorreo(correo);
    if (existenteCorreo && existenteCorreo.idUsuario !== idUsuario) {
      throw new Error("El correo ya pertenece a otro usuario.");
    }

    const ahora = new Date();
    const existente = buscarUsuarioPorId(idUsuario);
    const recursoOperacion = existente ? "EDITAR" : "CREAR";

    if (
      !esSuperadminActual &&
      (
        codigoRol === CONFIG.ROLES.SUPERADMIN ||
        (existente && normalizarTexto(existente.rol) === CONFIG.ROLES.SUPERADMIN)
      )
    ) {
      throw new Error(
        "Solo un superadministrador puede crear o modificar usuarios SUPERADMIN."
      );
    }

    if (!esSuperadminActual && existente) {
      const rolExistente = obtenerRolPorCodigoMotor_(existente.rol, false);
      if (
        rolExistente &&
        Number(rolExistente.nivel) < Number(rolOperador.nivel)
      ) {
        throw new Error(
          "No puedes modificar un usuario con nivel administrativo superior al tuyo."
        );
      }
    }

    const propuestaAlcance = {
      idUsuario: idUsuario,
      correo: correo,
      nombre: nombre,
      rol: codigoRol,
      idProveedor: idProveedor,
      idOficina: idOficina,
      idGrupo: idGrupo,
      estado: estado
    };
    validarOperacionUsuarioPorAlcanceMotor_(
      usuarioActual,
      existente,
      propuestaAlcance,
      recursoOperacion
    );
    validarConservacionSuperadminMotor_(existente, codigoRol, estado);

    const objeto = {
      ID_USUARIO: idUsuario,
      CORREO: correo,
      NOMBRE: nombre,
      TELEFONO: limpiarTextoMotor_(datos.telefono, 40),
      ROL: codigoRol,
      ID_PROVEEDOR: idProveedor,
      ID_OFICINA: idOficina,
      ID_GRUPO: idGrupo,
      ESTADO: estado,
      TIPO_DOCUMENTO: tipoDocumento,
      NUMERO_DOCUMENTO: numeroDocumento,
      FECHA_CREACION: existente ? undefined : ahora,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuarioActual.idUsuario
    };

    Object.keys(objeto).forEach(function(k) {
      if (objeto[k] === undefined) delete objeto[k];
    });

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.USUARIOS,
      "ID_USUARIO",
      objeto
    );
    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");

    registrarEventoMotor_({
      modulo: "ADMIN_USUARIOS",
      accion: existente ? "EDITAR_USUARIO" : "CREAR_USUARIO",
      entidad: "USUARIO",
      idEntidad: idUsuario,
      detalle: {
        rolAnterior: existente ? existente.rol : "",
        rolNuevo: codigoRol,
        proveedorAnterior: existente ? existente.idProveedor : "",
        proveedorNuevo: idProveedor
      }
    });

    return buscarUsuarioPorId(idUsuario);
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function normalizarNumeroDocumentoUsuarioMotor_(numeroDocumento) {
  return normalizarTexto(numeroDocumento).replace(/[^A-Z0-9\-]/g, "");
}

/** @private */
function validarDocumentoUsuarioMotor_(tipoDocumento, numeroDocumento, idUsuarioActual) {
  if (!tipoDocumento) throw new Error("Selecciona el tipo de documento.");
  if (!numeroDocumento) throw new Error("Ingresa el número de documento.");

  const tiposActivos = listarTiposDocumentoUsuarioMotor_();
  const tipo = tiposActivos.find(function(item) {
    return item.codigo === tipoDocumento;
  });
  if (!tipo) throw new Error("El tipo de documento seleccionado no está activo.");

  const patron = new RegExp(tipo.patron);
  if (!patron.test(numeroDocumento)) {
    throw new Error(tipo.ayuda || "El número de documento no tiene un formato válido.");
  }

  const repetido = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).find(
    function(item) {
      return String(item.ID_USUARIO || "").trim() !== String(idUsuarioActual || "").trim() &&
        normalizarTexto(item.TIPO_DOCUMENTO) === tipoDocumento &&
        normalizarNumeroDocumentoUsuarioMotor_(item.NUMERO_DOCUMENTO) === numeroDocumento;
    });
  if (repetido) throw new Error("El documento ya está registrado para otro usuario.");
}

/**
 * Valida la asignación principal del usuario sin depender del nombre del rol.
 * Los roles configurables requieren proveedor. Oficina y grupo son opcionales.
 * @private
 */
function validarAsignacionesUsuarioMotor_(rol, idProveedor, idOficina, idGrupo) {
  if (!rol || !rol.codigo) throw new Error("Selecciona un rol válido.");
  const requiereProveedor = !esCodigoRolProtegidoMotor_(rol.codigo);

  if (requiereProveedor && !idProveedor) {
    throw new Error("El proveedor principal es obligatorio para los roles configurables.");
  }
  if ((idOficina || idGrupo) && !idProveedor) {
    throw new Error("Selecciona primero el proveedor principal.");
  }
  if (idGrupo && !idOficina) {
    throw new Error("Selecciona primero la oficina antes de asignar un grupo.");
  }

  if (idProveedor) {
    const proveedor = buscarProveedorAdminMotor_(idProveedor);
    if (!proveedor || proveedor.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("El proveedor seleccionado no existe o está inactivo.");
    }
  }

  if (idOficina) {
    const oficina = buscarOficinaAdminMotor_(idOficina);
    if (!oficina || oficina.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("La oficina seleccionada no existe o está inactiva.");
    }
    if (listarIdsOficinaProveedorMotor_(idProveedor).indexOf(idOficina) === -1) {
      throw new Error("La oficina no está asignada al proveedor seleccionado.");
    }
  }

  if (idGrupo) {
    const grupo = buscarGrupoAdminMotor_(idGrupo);
    if (!grupo || grupo.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("El grupo seleccionado no existe o está inactivo.");
    }
    if (grupo.idOficina !== idOficina) {
      throw new Error("El grupo no pertenece a la oficina seleccionada.");
    }
  }
}

/** Lista todos los roles para administración. */
function listarRolesAdminMotor() {
  const usuariosActivos = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).forEach(function(item) {
    if (normalizarTexto(item.ESTADO) !== CONFIG.ESTADOS.ACTIVO) return;
    const codigo = normalizarTexto(item.ROL);
    if (codigo) usuariosActivos[codigo] = (usuariosActivos[codigo] || 0) + 1;
  });

  const roles = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD).filter(function(item) {
    return Boolean(normalizarTexto(item.CODIGO));
  }).map(function(item) {
    return mapearRolMotor_(item, usuariosActivos);
  }).sort(function(a, b) {
    return a.nivel - b.nivel || compararTextoMotor_(a.nombre, b.nombre);
  });

  if (!roles.length) {
    throw new Error(
      "El catálogo SEG_ROLES no contiene registros utilizables. Ejecuta corregirRolesPermisosPaso20ARevision1() y vuelve a cargar el módulo."
    );
  }

  return roles;
}

/** Lista roles activos asignables por el usuario actual. */
function listarRolesAsignablesUsuariosMotor() {
  const usuarioActual = obtenerUsuarioAdministracionSeguroMotor_();
  const roles = listarRolesAdminMotor().filter(function(rol) {
    return rol.estado === CONFIG.ESTADOS.ACTIVO;
  });

  if (normalizarTexto(usuarioActual.rol) === CONFIG.ROLES.SUPERADMIN) {
    return roles;
  }

  const rolActual = obtenerRolActivoPorCodigo(usuarioActual.rol);
  return roles.filter(function(rol) {
    return rol.codigo !== CONFIG.ROLES.SUPERADMIN &&
      Number(rol.nivel) >= Number(rolActual.nivel);
  });
}

/** Guarda un rol dinámico. Los códigos existentes son inmutables. */
function guardarRolAdminMotor(datos) {
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const usuarioActual = obtenerUsuarioAdministracionSeguroMotor_();
    const esSuperadmin = normalizarTexto(usuarioActual.rol) === CONFIG.ROLES.SUPERADMIN;
    const rolOperador = obtenerRolActivoPorCodigo(usuarioActual.rol);
    const idRecibido = String(datos.idRol || "").trim();
    const existente = idRecibido ? obtenerRolPorIdMotor_(idRecibido) : null;

    if (idRecibido && !existente) throw new Error("No se encontró el rol que deseas editar.");
    if (existente && esCodigoRolProtegidoMotor_(existente.codigo)) {
      throw new Error("Los roles SUPERADMIN y ADMIN están protegidos y no pueden modificarse.");
    }

    const codigoSolicitado = normalizarCodigoRolMotor_(datos.codigo || (existente && existente.codigo));
    if (existente && codigoSolicitado !== existente.codigo) {
      throw new Error("El código técnico del rol no puede modificarse después de su creación.");
    }
    if (!existente && esCodigoRolProtegidoMotor_(codigoSolicitado)) {
      throw new Error("El código " + codigoSolicitado + " está reservado para el sistema.");
    }

    const roles = listarRolesAdminMotor();
    const repetidoCodigo = roles.find(function(item) {
      return item.codigo === codigoSolicitado && (!existente || item.idRol !== existente.idRol);
    });
    if (repetidoCodigo) throw new Error("Ya existe un rol con ese código técnico.");

    const nombre = limpiarTextoMotor_(datos.nombre, 120);
    const descripcion = limpiarTextoMotor_(datos.descripcion, 500);
    const nivel = Math.floor(Number(datos.nivel));
    const estado = normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO);
    if (!nombre) throw new Error("El nombre visible del rol es obligatorio.");
    if (!Number.isFinite(nivel) || nivel < 1 || nivel > 999) {
      throw new Error("El nivel administrativo debe ser un número entre 1 y 999.");
    }
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado del rol debe ser ACTIVO o INACTIVO.");
    }

    const nombreNormalizado = normalizarTexto(nombre);
    const repetidoNombre = roles.find(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO && estado === CONFIG.ESTADOS.ACTIVO &&
        normalizarTexto(item.nombre) === nombreNormalizado &&
        (!existente || item.idRol !== existente.idRol);
    });
    if (repetidoNombre) throw new Error("Ya existe un rol activo con el mismo nombre visible.");

    if (!esSuperadmin) {
      if (existente && Number(existente.nivel) < Number(rolOperador.nivel)) {
        throw new Error("No puedes modificar un rol con un nivel administrativo superior al tuyo.");
      }
      if (nivel < Number(rolOperador.nivel)) {
        throw new Error("No puedes establecer un nivel administrativo superior al tuyo.");
      }
    }

    const usuariosActivos = existente ? contarUsuariosActivosPorRolMotor_(existente.codigo) : 0;
    if (existente && estado === CONFIG.ESTADOS.INACTIVO && usuariosActivos > 0) {
      throw new Error("No puedes inactivar el rol mientras tenga usuarios activos asignados.");
    }

    const idRol = existente ? existente.idRol : generarIdMotor_("ROL");
    const ahora = new Date();
    const objeto = {
      ID_ROL: idRol,
      CODIGO: existente ? existente.codigo : codigoSolicitado,
      NOMBRE: nombre,
      DESCRIPCION: descripcion,
      NIVEL: nivel,
      ESTADO: estado,
      SISTEMA: false,
      FECHA_CREACION: existente ? undefined : ahora,
      FECHA_ACTUALIZACION: ahora,
      USUARIO_CREACION: existente ? undefined : usuarioActual.idUsuario,
      USUARIO_MODIFICACION: usuarioActual.idUsuario
    };
    Object.keys(objeto).forEach(function(k) {
      if (objeto[k] === undefined) delete objeto[k];
    });

    guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD,
      "ID_ROL", objeto);
    SpreadsheetApp.flush();
    invalidarCacheMotor_("SECURITY");

    registrarEventoMotor_({
      modulo: "ADMIN_PERMISOS",
      accion: existente ? "MODIFICAR_ROL" : "CREAR_ROL",
      entidad: "ROL",
      idEntidad: objeto.CODIGO,
      detalle: {
        nombreAnterior: existente ? existente.nombre : "",
        nombreNuevo: nombre,
        nivelAnterior: existente ? existente.nivel : "",
        nivelNuevo: nivel,
        estadoAnterior: existente ? existente.estado : "",
        estadoNuevo: estado
      }
    });
    if (existente && existente.nombre !== nombre) {
      registrarEventoMotor_({
        modulo: "ADMIN_PERMISOS",
        accion: "CAMBIAR_NOMBRE_ROL",
        entidad: "ROL",
        idEntidad: existente.codigo,
        detalle: { anterior: existente.nombre, nuevo: nombre }
      });
    }
    if (existente && Number(existente.nivel) !== nivel) {
      registrarEventoMotor_({
        modulo: "ADMIN_PERMISOS",
        accion: "CAMBIAR_NIVEL_ROL",
        entidad: "ROL",
        idEntidad: existente.codigo,
        detalle: { anterior: existente.nivel, nuevo: nivel }
      });
    }
    if (existente && existente.estado !== estado) {
      registrarEventoMotor_({
        modulo: "ADMIN_PERMISOS",
        accion: estado === CONFIG.ESTADOS.ACTIVO ? "ACTIVAR_ROL" : "INACTIVAR_ROL",
        entidad: "ROL",
        idEntidad: existente.codigo,
        detalle: { anterior: existente.estado, nuevo: estado }
      });
    }

    return listarRolesAdminMotor().find(function(item) {
      return item.idRol === idRol;
    });
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function contarUsuariosActivosPorRolMotor_(codigoRol) {
  const codigo = normalizarTexto(codigoRol);
  return leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).filter(function(item) {
    return normalizarTexto(item.ROL) === codigo &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).length;
}

/** @private */
function validarConservacionSuperadminMotor_(usuarioExistente, nuevoRol, nuevoEstado) {
  if (!usuarioExistente || normalizarTexto(usuarioExistente.rol) !== CONFIG.ROLES.SUPERADMIN ||
    normalizarTexto(usuarioExistente.estado) !== CONFIG.ESTADOS.ACTIVO) return;
  if (normalizarTexto(nuevoRol) === CONFIG.ROLES.SUPERADMIN && normalizarTexto(nuevoEstado) ===
    CONFIG.ESTADOS.ACTIVO) return;
  const otros = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS).filter(function(
    item) {
    return String(item.ID_USUARIO || "").trim() !== usuarioExistente.idUsuario &&
      normalizarTexto(item.ROL) === CONFIG.ROLES.SUPERADMIN && normalizarTexto(item.ESTADO) ===
      CONFIG.ESTADOS.ACTIVO;
  });
  if (otros.length === 0) throw new Error(
    "No puedes desactivar o cambiar el rol del último superadministrador activo.");
}


/**
 * Diagnóstico de seguridad por alcance para ejecución manual desde Apps Script.
 * No modifica datos.
 */
function diagnosticarAlcancesUsuariosPaso23ARevision1() {
  const catalogo = construirCatalogoUsuariosAdminMotor_();
  return catalogo.filter(function(usuario) {
    return normalizarTexto(usuario.estado) === CONFIG.ESTADOS.ACTIVO &&
      normalizarTexto(usuario.rol) !== CONFIG.ROLES.SUPERADMIN;
  }).map(function(usuario) {
    const alcance = obtenerAlcancePermisoMotor_(
      "ADMIN_USUARIOS",
      "VER_LISTADO",
      usuario
    );
    const visibles = filtrarUsuariosPorAlcanceAdminMotor_(
      catalogo,
      usuario,
      "VER_LISTADO"
    );
    return {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || "",
      alcance: alcance,
      visibles: visibles.length,
      incluyeSuperadmin: visibles.some(function(item) {
        return normalizarTexto(item.rol) === CONFIG.ROLES.SUPERADMIN;
      }),
      proveedoresVisibles: visibles.map(function(item) {
        return item.idProveedor || "";
      }).filter(function(valor, indice, lista) {
        return lista.indexOf(valor) === indice;
      })
    };
  });
}
