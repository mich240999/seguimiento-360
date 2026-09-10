/**
 * SGT360 — Motor de módulos dinámicos
 *
 * Responsabilidad:
 * Construye módulos, campos, catálogos y operaciones CRUD sencillas a partir de
 * metadatos.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Constructor y ejecución de módulos dinámicos simples. */
function listarModulosDisponiblesMotor_(usuario, seguridad) {
  usuario = usuario || obtenerUsuarioActual();
  seguridad = seguridad || construirContextoSeguridadMotor_(usuario);
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS).filter(function(item) {
    const codigo = normalizarTexto(item.CODIGO);
    if (codigo === "ADMIN_GENERAL" && normalizarTexto(usuario.rol) !== CONFIG.ROLES.SUPERADMIN) {
      return false;
    }
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO && seguridad.permisos[
      codigo] && seguridad.permisos[codigo].VISUALIZAR_MODULO && seguridad.permisos[codigo]
      .VISUALIZAR_MODULO.permitido;
  }).map(mapearModuloMotor_).sort(function(a, b) {
    return a.orden - b.orden;
  });
}

/**
 * Mapea modulo motor. Función interna del motor.
 */
function mapearModuloMotor_(item) {
  return {
    idModulo: String(item.ID_MODULO || "").trim(),
    codigo: normalizarTexto(item.CODIGO),
    nombre: String(item.NOMBRE || "").trim(),
    descripcion: String(item.DESCRIPCION || "").trim(),
    icono: String(item.ICONO || "grid_view").trim(),
    grupoMenu: String(item.GRUPO_MENU || "General").trim(),
    orden: Number(item.ORDEN) || 999,
    tipoVista: normalizarTexto(item.TIPO_VISTA || "DINAMICA"),
    baseAlias: normalizarTexto(item.BASE_ALIAS || MOTOR_SGT360.BASES.OPERATION),
    hojaDatos: String(item.HOJA_DATOS || "").trim(),
    campoClave: normalizarTexto(item.CAMPO_CLAVE || "ID"),
    campoEstado: normalizarTexto(item.CAMPO_ESTADO || "ESTADO"),
    campoUsuario: normalizarTexto(item.CAMPO_USUARIO),
    campoProveedor: normalizarTexto(item.CAMPO_PROVEEDOR),
    campoGrupo: normalizarTexto(item.CAMPO_GRUPO),
    administrable: convertirBooleanoMotor_(item.ADMINISTRABLE),
    estado: normalizarTexto(item.ESTADO)
  };
}

/**
 * Lista modulos administración motor.
 */
function listarModulosAdminMotor() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS).map(mapearModuloMotor_)
    .sort(function(a, b) {
      return a.orden - b.orden;
    });
}

/**
 * Obtiene definicion modulo motor. Función interna del motor.
 */
function obtenerDefinicionModuloMotor_(codigoModulo) {
  const codigo = normalizarTexto(codigoModulo);
  const modulo = listarModulosAdminMotor().find(function(item) {
    return item.codigo === codigo;
  });
  if (!modulo) throw new Error("No existe el módulo " + codigo + ".");
  const campos = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CAMPOS).filter(function(
    item) {
    return normalizarTexto(item.MODULO) === codigo && normalizarTexto(item.ESTADO) === CONFIG
      .ESTADOS.ACTIVO;
  }).map(function(item) {
    return {
      idCampo: String(item.ID_CAMPO || "").trim(),
      campo: normalizarTexto(item.CAMPO),
      etiqueta: String(item.ETIQUETA || item.CAMPO || "").trim(),
      tipo: normalizarTexto(item.TIPO || "TEXT"),
      obligatorio: convertirBooleanoMotor_(item.OBLIGATORIO),
      visibleTabla: convertirBooleanoMotor_(item.VISIBLE_TABLA),
      visibleFormulario: convertirBooleanoMotor_(item.VISIBLE_FORMULARIO),
      editable: convertirBooleanoMotor_(item.EDITABLE),
      buscable: convertirBooleanoMotor_(item.BUSCABLE),
      catalogo: normalizarTexto(item.CATALOGO),
      orden: Number(item.ORDEN) || 999,
      ancho: String(item.ANCHO || "").trim(),
      ayuda: String(item.AYUDA || "").trim()
    };
  }).sort(function(a, b) {
    return a.orden - b.orden;
  });
  return {
    modulo: modulo,
    campos: campos
  };
}

/**
 * Guarda modulo administración motor.
 */
function guardarModuloAdminMotor(datos) {
  datos = datos || {};
  const codigo = normalizarTexto(datos.codigo).replace(/[^A-Z0-9_]/g, "_");
  if (!codigo) throw new Error("El código del módulo es obligatorio.");
  const existentes = listarModulosAdminMotor();
  const existente = existentes.find(function(item) {
    return item.codigo === codigo;
  });
  const idModulo = String(datos.idModulo || "").trim() || (existente ? existente.idModulo :
    generarIdMotor_("MOD"));
  if (existente && existente.idModulo !== idModulo) throw new Error(
    "Ya existe un módulo con ese código.");
  const ahora = new Date();
  const objeto = {
    ID_MODULO: idModulo,
    CODIGO: codigo,
    NOMBRE: limpiarTextoMotor_(datos.nombre || codigo, 120),
    DESCRIPCION: limpiarTextoMotor_(datos.descripcion, 500),
    ICONO: limpiarTextoMotor_(datos.icono || "grid_view", 60),
    GRUPO_MENU: limpiarTextoMotor_(datos.grupoMenu || "General", 100),
    ORDEN: Number(datos.orden) || 999,
    TIPO_VISTA: normalizarTexto(datos.tipoVista || "DINAMICA"),
    BASE_ALIAS: normalizarTexto(datos.baseAlias || MOTOR_SGT360.BASES.OPERATION),
    HOJA_DATOS: limpiarTextoMotor_(datos.hojaDatos, 100),
    CAMPO_CLAVE: normalizarTexto(datos.campoClave || "ID"),
    CAMPO_ESTADO: normalizarTexto(datos.campoEstado || "ESTADO"),
    CAMPO_USUARIO: normalizarTexto(datos.campoUsuario),
    CAMPO_PROVEEDOR: normalizarTexto(datos.campoProveedor),
    CAMPO_GRUPO: normalizarTexto(datos.campoGrupo),
    ADMINISTRABLE: datos.administrable !== false,
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_CREACION: existente ? undefined : ahora,
    FECHA_ACTUALIZACION: ahora
  };
  Object.keys(objeto).forEach(function(k) {
    if (objeto[k] === undefined) delete objeto[k];
  });
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS, "ID_MODULO", objeto);
  sincronizarRecursosModuloMotor_(codigo, [{
    codigo: "VISUALIZAR_MODULO",
    nombre: "Visualizar módulo",
    tipo: "MODULO",
    padre: "",
    orden: 10
  }, {
    codigo: "VER_LISTADO",
    nombre: "Ver listado",
    tipo: "ACCION",
    orden: 20
  }, {
    codigo: "VER_DETALLE",
    nombre: "Ver detalle",
    tipo: "ACCION",
    orden: 30
  }, {
    codigo: "CREAR",
    nombre: "Crear",
    tipo: "ACCION",
    orden: 40
  }, {
    codigo: "EDITAR",
    nombre: "Editar",
    tipo: "ACCION",
    orden: 50
  }, {
    codigo: "CAMBIAR_ESTADO",
    nombre: "Cambiar estado",
    tipo: "ACCION",
    orden: 60
  }, {
    codigo: "IMPORTAR",
    nombre: "Importar",
    tipo: "ACCION",
    orden: 70
  }, {
    codigo: "EXPORTAR",
    nombre: "Exportar",
    tipo: "ACCION",
    orden: 80
  }, {
    codigo: "ADMINISTRAR",
    nombre: "Administrar",
    tipo: "ACCION",
    orden: 90
  }]);
  if (objeto.TIPO_VISTA === "DINAMICA" && objeto.HOJA_DATOS) {
    asegurarHojaMotor_(objeto.BASE_ALIAS, objeto.HOJA_DATOS, [objeto.CAMPO_CLAVE, objeto
      .CAMPO_ESTADO, objeto.CAMPO_USUARIO, objeto.CAMPO_PROVEEDOR, objeto.CAMPO_GRUPO,
      "FECHA_CREACION", "FECHA_ACTUALIZACION"
    ].filter(Boolean));
  }
  invalidarCacheMotor_("ALL");
  return listarModulosAdminMotor().find(function(item) {
    return item.idModulo === idModulo;
  });
}

/**
 * Lista campos modulo administración motor.
 */
function listarCamposModuloAdminMotor(codigoModulo) {
  return obtenerDefinicionModuloMotor_(codigoModulo).campos;
}

/**
 * Guarda campo modulo administración motor.
 */
function guardarCampoModuloAdminMotor(codigoModulo, datos) {
  const modulo = obtenerDefinicionModuloMotor_(codigoModulo).modulo;
  datos = datos || {};
  const campo = normalizarTexto(datos.campo).replace(/[^A-Z0-9_]/g, "_");
  if (!campo) throw new Error("El nombre técnico del campo es obligatorio.");
  const tipo = normalizarTexto(datos.tipo || "TEXT");
  if (MOTOR_SGT360.TIPOS_CAMPO.indexOf(tipo) === -1) throw new Error(
    "El tipo de campo no está permitido.");
  const existentes = listarCamposModuloAdminMotor(modulo.codigo);
  const existente = existentes.find(function(item) {
    return item.campo === campo;
  });
  const idCampo = String(datos.idCampo || "").trim() || (existente ? existente.idCampo :
    generarIdMotor_("CAM"));
  const ahora = new Date();
  const objeto = {
    ID_CAMPO: idCampo,
    MODULO: modulo.codigo,
    CAMPO: campo,
    ETIQUETA: limpiarTextoMotor_(datos.etiqueta || campo, 120),
    TIPO: tipo,
    OBLIGATORIO: datos.obligatorio === true,
    VISIBLE_TABLA: datos.visibleTabla !== false,
    VISIBLE_FORMULARIO: datos.visibleFormulario !== false,
    EDITABLE: datos.editable !== false,
    BUSCABLE: datos.buscable === true,
    CATALOGO: normalizarTexto(datos.catalogo),
    ORDEN: Number(datos.orden) || 999,
    ANCHO: limpiarTextoMotor_(datos.ancho, 30),
    AYUDA: limpiarTextoMotor_(datos.ayuda, 300),
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_CREACION: existente ? undefined : ahora,
    FECHA_ACTUALIZACION: ahora
  };
  Object.keys(objeto).forEach(function(k) {
    if (objeto[k] === undefined) delete objeto[k];
  });
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CAMPOS, "ID_CAMPO", objeto);
  if (modulo.tipoVista === "DINAMICA" && modulo.hojaDatos) asegurarHojaMotor_(modulo.baseAlias,
    modulo.hojaDatos, [modulo.campoClave, campo, modulo.campoEstado, "FECHA_CREACION",
      "FECHA_ACTUALIZACION"
    ]);
  return listarCamposModuloAdminMotor(modulo.codigo).find(function(item) {
    return item.idCampo === idCampo;
  });
}

/**
 * Lista valores catalogo modulo dinamico.
 */
function listarValoresCatalogoModuloDinamico(codigoModulo, codigoCatalogo) {
  const definicion = obtenerDefinicionModuloMotor_(codigoModulo);
  const catalogo = normalizarTexto(codigoCatalogo);
  const permitido = definicion.campos.some(function(campo) {
    return campo.tipo === "SELECT" && campo.catalogo === catalogo;
  });
  if (!permitido) throw new Error("El catálogo no está asociado al módulo solicitado.");
  return leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES).filter(function(
    item) {
    return normalizarTexto(item.CATALOGO) === catalogo && normalizarTexto(item.ESTADO) ===
      CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    return {
      codigo: normalizarTexto(item.CODIGO),
      nombre: String(item.NOMBRE || "").trim(),
      orden: Number(item.ORDEN) || 999
    };
  }).sort(function(a, b) {
    return a.orden - b.orden;
  });
}

/**
 * Lista registros modulo dinamico.
 */
function listarRegistrosModuloDinamico(codigoModulo, filtros) {
  filtros = filtros || {};
  const definicion = obtenerDefinicionModuloMotor_(codigoModulo);
  const modulo = definicion.modulo;
  if (modulo.tipoVista !== "DINAMICA") throw new Error(
    "Este módulo utiliza una vista especializada.");
  if (!modulo.hojaDatos) throw new Error("El módulo no tiene una hoja de datos configurada.");
  const usuario = obtenerUsuarioActual();
  let registros = leerTablaMotor_(modulo.baseAlias, modulo.hojaDatos);
  registros = filtrarRegistrosPorAlcanceModuloMotor_(registros, modulo, "VER_LISTADO", usuario);
  const texto = normalizarTexto(filtros.texto || "");
  const buscables = definicion.campos.filter(function(campo) {
    return campo.buscable;
  }).map(function(campo) {
    return campo.campo;
  });
  if (texto && buscables.length) registros = registros.filter(function(registro) {
    return buscables.some(function(campo) {
      return normalizarTexto(registro[campo]).indexOf(texto) !== -1;
    });
  });
  if (filtros.estado && modulo.campoEstado) {
    const estado = normalizarTexto(filtros.estado);
    registros = registros.filter(function(item) {
      return normalizarTexto(item[modulo.campoEstado]) === estado;
    });
  }
  const camposTabla = definicion.campos.filter(function(campo) {
    return campo.visibleTabla;
  });
  const salida = registros.map(function(registro) {
    const item = {
      __ID: registro[modulo.campoClave],
      __FILA: registro.__FILA
    };
    camposTabla.forEach(function(campo) {
      item[campo.campo] = registro[campo.campo];
    });
    return item;
  });
  const paginado = paginarArregloMotor_(salida, filtros.pagina, filtros.tamano);
  paginado.definicion = definicion;
  return paginado;
}

/**
 * Obtiene registro modulo dinamico.
 */
function obtenerRegistroModuloDinamico(codigoModulo, idRegistro) {
  const definicion = obtenerDefinicionModuloMotor_(codigoModulo);
  const modulo = definicion.modulo;
  if (!modulo.hojaDatos) throw new Error("El módulo no tiene una hoja de datos configurada.");
  const usuario = obtenerUsuarioActual();
  const registro = leerTablaMotor_(modulo.baseAlias, modulo.hojaDatos).find(function(item) {
    return String(item[modulo.campoClave] || "").trim() === String(idRegistro || "").trim();
  });
  if (!registro) throw new Error("No se encontró el registro solicitado.");
  validarAccesoRegistroModuloMotor_(registro, modulo, "VER_DETALLE", usuario);
  const salida = {
    __ID: registro[modulo.campoClave]
  };
  definicion.campos.forEach(function(campo) {
    salida[campo.campo] = registro[campo.campo];
  });
  return {
    registro: salida,
    definicion: definicion
  };
}

/**
 * Guarda registro modulo dinamico.
 */
function guardarRegistroModuloDinamico(codigoModulo, datos) {
  datos = datos || {};
  const definicion = obtenerDefinicionModuloMotor_(codigoModulo);
  const modulo = definicion.modulo;
  if (!modulo.administrable) throw new Error("El módulo no permite edición dinámica.");
  const usuario = obtenerUsuarioActual();
  const esNuevo = datos.__ES_NUEVO === true || !datos[modulo.campoClave];
  const recurso = esNuevo ? "CREAR" : "EDITAR";
  exigirPermisoMotor_(modulo.codigo, recurso, usuario);
  if (!esNuevo) {
    const existente = leerTablaMotor_(modulo.baseAlias, modulo.hojaDatos).find(function(item) {
      return String(item[modulo.campoClave] || "").trim() === String(datos[modulo.campoClave] ||
        "").trim();
    });
    if (!existente) throw new Error("No se encontró el registro que deseas editar.");
    validarAccesoRegistroModuloMotor_(existente, modulo, recurso, usuario);
  }
  const objeto = {};
  definicion.campos.forEach(function(campo) {
    if (!campo.editable && !esNuevo) return;
    if (!Object.prototype.hasOwnProperty.call(datos, campo.campo)) return;
    const valor = datos[campo.campo];
    if (campo.obligatorio && String(valor === null || valor === undefined ? "" : valor)
    .trim() === "") throw new Error("El campo " + campo.etiqueta + " es obligatorio.");
    objeto[campo.campo] = valor;
  });
  if (esNuevo && !objeto[modulo.campoClave]) objeto[modulo.campoClave] = generarIdMotor_(modulo
    .codigo.slice(0, 3));
  aplicarPropiedadAlcanceNuevoRegistroMotor_(objeto, modulo, recurso, usuario);
  if (modulo.campoEstado && !objeto[modulo.campoEstado]) objeto[modulo.campoEstado] = CONFIG.ESTADOS
    .ACTIVO;
  objeto.FECHA_ACTUALIZACION = new Date();
  if (esNuevo) objeto.FECHA_CREACION = new Date();
  guardarObjetoMotor_(modulo.baseAlias, modulo.hojaDatos, modulo.campoClave, objeto);
  registrarEventoMotor_({
    modulo: modulo.codigo,
    accion: esNuevo ? "CREAR" : "EDITAR",
    entidad: modulo.hojaDatos,
    idEntidad: objeto[modulo.campoClave] || datos[modulo.campoClave]
  });
  return {
    correcto: true,
    id: objeto[modulo.campoClave] || datos[modulo.campoClave]
  };
}

/**
 * Ejecuta cambiar estado registro modulo dinamico.
 */
function cambiarEstadoRegistroModuloDinamico(codigoModulo, idRegistro, estado) {
  const definicion = obtenerDefinicionModuloMotor_(codigoModulo);
  const modulo = definicion.modulo;
  if (!modulo.campoEstado) throw new Error("El módulo no tiene un campo de estado configurado.");
  const usuario = obtenerUsuarioActual();
  const registro = leerTablaMotor_(modulo.baseAlias, modulo.hojaDatos).find(function(item) {
    return String(item[modulo.campoClave] || "").trim() === String(idRegistro || "").trim();
  });
  if (!registro) throw new Error("No se encontró el registro solicitado.");
  validarAccesoRegistroModuloMotor_(registro, modulo, "CAMBIAR_ESTADO", usuario);
  const objeto = {};
  objeto[modulo.campoClave] = idRegistro;
  objeto[modulo.campoEstado] = normalizarTexto(estado);
  objeto.FECHA_ACTUALIZACION = new Date();
  guardarObjetoMotor_(modulo.baseAlias, modulo.hojaDatos, modulo.campoClave, objeto);
  registrarEventoMotor_({
    modulo: modulo.codigo,
    accion: "CAMBIAR_ESTADO",
    entidad: modulo.hojaDatos,
    idEntidad: idRegistro,
    detalle: {
      estado: estado
    }
  });
  return {
    correcto: true,
    id: idRegistro,
    estado: normalizarTexto(estado)
  };
}

/**
 * Ejecuta filtrar registros por alcance modulo motor. Función interna del motor.
 */
function filtrarRegistrosPorAlcanceModuloMotor_(registros, modulo, recurso, usuario) {
  const alcance = obtenerAlcancePermisoMotor_(modulo.codigo, recurso, usuario);
  if (alcance === "GLOBAL") return registros;
  if (alcance === "PROPIO") {
    if (!modulo.campoUsuario) throw new Error(
      "El módulo requiere CAMPO_USUARIO para aplicar el alcance PROPIO.");
    return registros.filter(function(item) {
      return String(item[modulo.campoUsuario] || "").trim() === usuario.idUsuario;
    });
  }
  if (alcance === "PROVEEDOR") {
    if (!modulo.campoProveedor || !usuario.idProveedor) throw new Error(
      "El módulo o el usuario no tienen proveedor configurado.");
    return registros.filter(function(item) {
      return String(item[modulo.campoProveedor] || "").trim() === usuario.idProveedor;
    });
  }
  if (alcance === "GRUPO") {
    if (!modulo.campoGrupo || !usuario.idGrupo) throw new Error(
      "El módulo o el usuario no tienen grupo configurado.");
    return registros.filter(function(item) {
      return String(item[modulo.campoGrupo] || "").trim() === usuario.idGrupo;
    });
  }
  if (alcance === "ASIGNADOS") throw new Error(
    "El alcance ASIGNADOS requiere un módulo especializado.");
  return [];
}

/**
 * Valida acceso registro modulo motor. Función interna del motor.
 */
function validarAccesoRegistroModuloMotor_(registro, modulo, recurso, usuario) {
  const permitidos = filtrarRegistrosPorAlcanceModuloMotor_([registro], modulo, recurso, usuario);
  if (permitidos.length !== 1) throw new Error("No tienes acceso al registro solicitado.");
}

/**
 * Aplica propiedad alcance nuevo registro motor. Función interna del motor.
 */
function aplicarPropiedadAlcanceNuevoRegistroMotor_(objeto, modulo, recurso, usuario) {
  const alcance = obtenerAlcancePermisoMotor_(modulo.codigo, recurso, usuario);
  if (alcance === "GLOBAL") return;
  if (alcance === "PROPIO") {
    if (!modulo.campoUsuario) throw new Error(
      "Configura CAMPO_USUARIO para crear registros con alcance PROPIO.");
    objeto[modulo.campoUsuario] = usuario.idUsuario;
    return;
  }
  if (alcance === "PROVEEDOR") {
    if (!modulo.campoProveedor || !usuario.idProveedor) throw new Error(
      "Configura el proveedor del módulo y del usuario.");
    objeto[modulo.campoProveedor] = usuario.idProveedor;
    return;
  }
  if (alcance === "GRUPO") {
    if (!modulo.campoGrupo || !usuario.idGrupo) throw new Error(
      "Configura el grupo del módulo y del usuario.");
    objeto[modulo.campoGrupo] = usuario.idGrupo;
    return;
  }
  throw new Error("El alcance " + alcance + " requiere una operación especializada.");
}
