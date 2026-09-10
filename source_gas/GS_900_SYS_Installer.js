/**
 * SGT360 — Instalación inicial
 *
 * Responsabilidad:
 * Crea o enlaza bases y carpetas, genera hojas, siembra datos y configura al
 * superadministrador.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * Instalación inicial, estructura y diagnóstico del motor.
 *
 * Ejecuta instalarMotorSGT360() una sola vez después de copiar todos los
 * archivos. Puedes entregar IDs existentes o dejar los campos vacíos para
 * que el instalador cree libros y carpetas nuevos.
 */

const CABECERAS_MOTOR_SGT360 = Object.freeze({
  SYS_PARAMETROS: Object.freeze([
    "CLAVE", "VALOR", "DESCRIPCION", "TIPO", "EDITABLE", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  APP_MODULOS: Object.freeze([
    "ID_MODULO", "CODIGO", "NOMBRE", "DESCRIPCION", "ICONO",
    "GRUPO_MENU", "ORDEN", "TIPO_VISTA", "BASE_ALIAS", "HOJA_DATOS",
    "CAMPO_CLAVE", "CAMPO_ESTADO", "CAMPO_USUARIO", "CAMPO_PROVEEDOR",
    "CAMPO_GRUPO", "ADMINISTRABLE", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  APP_CAMPOS: Object.freeze([
    "ID_CAMPO", "MODULO", "CAMPO", "ETIQUETA", "TIPO", "OBLIGATORIO",
    "VISIBLE_TABLA", "VISIBLE_FORMULARIO", "EDITABLE", "BUSCABLE",
    "CATALOGO", "ORDEN", "ANCHO", "AYUDA", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  APP_ACCIONES: Object.freeze([
    "ID_ACCION", "MODULO", "CODIGO", "NOMBRE", "TIPO", "OPERACION_RPC",
    "CONFIRMACION", "ORDEN", "ESTADO", "FECHA_CREACION",
    "FECHA_ACTUALIZACION"
  ]),
  APP_CATALOGOS: Object.freeze([
    "ID_CATALOGO", "CODIGO", "NOMBRE", "DESCRIPCION", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  APP_CATALOGO_VALORES: Object.freeze([
    "ID_VALOR", "CATALOGO", "CODIGO", "NOMBRE", "ORDEN", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  ADM_RECURSOS_VISUALES: Object.freeze([
    "ID_RECURSO", "CLAVE", "NOMBRE", "TIPO", "ID_ARCHIVO", "URL_PUBLICA",
    "VERSION", "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  MAE_PROVEEDORES: Object.freeze([
    "ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "NOMBRE",
    "CODIGO_SAP", "RUC", "DESCRIPCION", "ALCANCE_CATALOGO", "ESTADO",
    "FECHA_CREACION", "FECHA_MODIFICACION", "USUARIO_CREACION",
    "USUARIO_MODIFICACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  MAE_OFICINAS: Object.freeze([
    "ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  MAE_GRUPOS: Object.freeze([
    "ID_GRUPO", "ID_OFICINA", "NOMBRE", "DESCRIPCION", "ESTADO",
    "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  REL_PROVEEDOR_OFICINAS: Object.freeze([
    "ID_RELACION", "ID_PROVEEDOR", "ID_OFICINA", "IDS_GRUPO",
    "ALCANCE_GRUPOS", "ESTADO", "FECHA_CREACION",
    "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  SEG_USUARIOS: Object.freeze([
    "ID_USUARIO", "CORREO", "NOMBRE", "TELEFONO", "ROL", "ID_PROVEEDOR",
    "ID_OFICINA", "ID_GRUPO", "ESTADO", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO",
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  SEG_ROLES: Object.freeze([
    "ID_ROL", "CODIGO", "NOMBRE", "DESCRIPCION", "NIVEL", "ESTADO",
    "SISTEMA", "FECHA_CREACION", "FECHA_ACTUALIZACION",
    "USUARIO_CREACION", "USUARIO_MODIFICACION"
  ]),
  SEG_RECURSOS: Object.freeze([
    "ID_RECURSO", "MODULO", "CODIGO", "NOMBRE", "TIPO", "PADRE", "ORDEN",
    "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  SEG_PERMISOS: Object.freeze([
    "ID_PERMISO", "TIPO_SUJETO", "ID_SUJETO", "MODULO", "RECURSO",
    "PERMITIDO", "ALCANCE", "ESTADO", "FECHA_CREACION",
    "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
  ]),
  SEG_SESIONES: Object.freeze([
    "ID_SESION", "ID_USUARIO", "CORREO", "ROL", "FECHA_INICIO",
    "ULTIMA_ACTIVIDAD", "FECHA_FIN", "ESTADO", "MODULO_ACTUAL", "ORIGEN",
    "USER_AGENT", "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]),
  SEG_AUDITORIA_ACCESOS: Object.freeze([
    "ID_AUDITORIA_ACCESO", "FECHA_HORA", "ID_USUARIO", "CORREO", "ROL",
    "MODULO", "ACCION", "RESULTADO", "MOTIVO", "ORIGEN", "ID_SESION",
    "DETALLE"
  ]),
  SEG_AUDITORIA_EVENTOS: Object.freeze([
    "ID_EVENTO", "FECHA_HORA", "ID_USUARIO", "CORREO", "ROL", "MODULO",
    "ACCION", "ENTIDAD", "ID_ENTIDAD", "RESULTADO", "DETALLE"
  ]),
  SEG_AUDITORIA_PERMISOS: Object.freeze([
    "ID_AUDITORIA", "FECHA_HORA", "ID_USUARIO", "CORREO", "ROL_OBJETIVO",
    "MODULO", "RECURSO", "VALOR_ANTERIOR", "VALOR_NUEVO", "ALCANCE",
    "MOTIVO"
  ])
});

/**
 * Instala el motor y devuelve todos los IDs que deben conservarse.
 *
 * Ejemplo de propiedades aceptadas en configuracion:
 * - nombreAplicacion
 * - correoSuperadmin
 * - nombreSuperadmin
 * - idBaseConfiguracion
 * - idBaseSeguridad
 * - idBaseOperacion
 * - idCarpetaRaiz
 * - idCarpetaRecursos
 * - idCarpetaImportaciones
 * - idCarpetaExportaciones
 *
 * @param {Object=} configuracion
 * @return {Object}
 */
function instalarMotorSGT360(configuracion) {
  configuracion = configuracion || {};

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const recursos = prepararRecursosInstalacionMotor_(configuracion);

    configurarEntornoMotor({
      nombreAplicacion: String(configuracion.nombreAplicacion || "Seguimiento 360").trim(),
      versionAplicacion: String(configuracion.versionAplicacion || "1.0.0").trim(),
      entorno: normalizarTexto(configuracion.entorno || "DESARROLLO"),
      idBaseConfiguracion: recursos.idBaseConfiguracion,
      idBaseSeguridad: recursos.idBaseSeguridad,
      idBaseOperacion: recursos.idBaseOperacion,
      idCarpetaRecursos: recursos.idCarpetaRecursos,
      idCarpetaImportaciones: recursos.idCarpetaImportaciones,
      idCarpetaExportaciones: recursos.idCarpetaExportaciones,
      urlFavicon: String(configuracion.urlFavicon || "").trim()
    });

    crearEstructuraMotor_();
    sembrarDatosInicialesMotor_(configuracion);

    PropertiesService
      .getScriptProperties()
      .setProperty(
        PROPIEDADES_MOTOR_SGT360.INSTALLED,
        new Date().toISOString()
      );

    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");

    return {
      correcto: true,
      mensaje: "El motor SGT360 quedó instalado. Configura OAuth y crea una nueva implementación web.",
      recursos: recursos,
      diagnostico: ejecutarDiagnosticoMotorSGT360()
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Crea o enlaza libros y carpetas.
 *
 * @private
 */
function prepararRecursosInstalacionMotor_(configuracion) {
  const nombre = String(
    configuracion.nombreAplicacion ||
    "Seguimiento 360"
  ).trim();

  const raiz = configuracion.idCarpetaRaiz ?
    DriveApp.getFolderById(
      String(configuracion.idCarpetaRaiz).trim()
    ) :
    DriveApp.createFolder(
      nombre + " - Aplicación"
    );

  const recursos = obtenerOCrearCarpetaInstalacionMotor_(
    raiz,
    configuracion.idCarpetaRecursos,
    "01 Recursos visuales"
  );

  const importaciones = obtenerOCrearCarpetaInstalacionMotor_(
    raiz,
    configuracion.idCarpetaImportaciones,
    "02 Importaciones"
  );

  const exportaciones = obtenerOCrearCarpetaInstalacionMotor_(
    raiz,
    configuracion.idCarpetaExportaciones,
    "03 Exportaciones"
  );

  const idConfig = obtenerOCrearLibroInstalacionMotor_(
    configuracion.idBaseConfiguracion,
    nombre + " - Configuración",
    raiz
  );

  const idSeguridad = obtenerOCrearLibroInstalacionMotor_(
    configuracion.idBaseSeguridad,
    nombre + " - Seguridad",
    raiz
  );

  const idOperacion = obtenerOCrearLibroInstalacionMotor_(
    configuracion.idBaseOperacion,
    nombre + " - Operación",
    raiz
  );

  return {
    idCarpetaRaiz: raiz.getId(),
    idCarpetaRecursos: recursos.getId(),
    idCarpetaImportaciones: importaciones.getId(),
    idCarpetaExportaciones: exportaciones.getId(),
    idBaseConfiguracion: idConfig,
    idBaseSeguridad: idSeguridad,
    idBaseOperacion: idOperacion
  };
}

/** @private */
function obtenerOCrearCarpetaInstalacionMotor_(
  carpetaRaiz,
  idExistente,
  nombre
) {
  if (String(idExistente || "").trim()) {
    return DriveApp.getFolderById(
      String(idExistente).trim()
    );
  }

  return carpetaRaiz.createFolder(
    nombre
  );
}

/** @private */
function obtenerOCrearLibroInstalacionMotor_(
  idExistente,
  nombre,
  carpetaRaiz
) {
  if (String(idExistente || "").trim()) {
    const libroExistente = SpreadsheetApp.openById(
      String(idExistente).trim()
    );

    return libroExistente.getId();
  }

  const libro = SpreadsheetApp.create(
    nombre
  );

  const archivo = DriveApp.getFileById(
    libro.getId()
  );

  carpetaRaiz.addFile(
    archivo
  );

  try {
    DriveApp.getRootFolder().removeFile(
      archivo
    );
  } catch (error) {
    console.warn(
      "No fue posible retirar el libro de Mi unidad: %s",
      error.message
    );
  }

  return libro.getId();
}

/**
 * Crea las hojas técnicas en sus bases correspondientes.
 *
 * @private
 */
function crearEstructuraMotor_() {
  Object.keys(
    CABECERAS_MOTOR_SGT360
  ).forEach(function(nombreHoja) {
    asegurarHojaMotor_(
      obtenerAliasHojaMotor_(nombreHoja),
      nombreHoja,
      CABECERAS_MOTOR_SGT360[nombreHoja]
    );
  });

  limpiarHojasPredeterminadasMotor_(
    MOTOR_SGT360.BASES.CONFIG
  );

  limpiarHojasPredeterminadasMotor_(
    MOTOR_SGT360.BASES.SECURITY
  );

  limpiarHojasPredeterminadasMotor_(
    MOTOR_SGT360.BASES.OPERATION
  );
}

/** @private */
function limpiarHojasPredeterminadasMotor_(aliasBase) {
  const libro = obtenerLibroMotor_(
    aliasBase
  );

  const hojasTecnicas = Object.keys(
    CABECERAS_MOTOR_SGT360
  );

  libro.getSheets().forEach(function(hoja) {
    const nombre = hoja.getName();

    if (
      hojasTecnicas.indexOf(nombre) === -1 &&
      hoja.getLastRow() <= 1 &&
      libro.getSheets().length > 1
    ) {
      libro.deleteSheet(
        hoja
      );
    }
  });
}

/**
 * Inserta la configuración base de forma idempotente.
 *
 * @private
 */
function sembrarDatosInicialesMotor_(configuracion) {
  sembrarRolesMotor_();
  sembrarParametrosMotor_();
  sembrarCatalogosSistemaMotor_();
  sembrarModulosSistemaMotor_();
  sembrarRecursosSistemaMotor_();

  const correoSuperadmin = normalizarCorreo(
    configuracion.correoSuperadmin ||
    Session.getEffectiveUser().getEmail()
  );

  if (!correoSuperadmin) {
    throw new Error(
      "Indica correoSuperadmin en instalarMotorSGT360()."
    );
  }

  const usuarioExistente = buscarUsuarioPorCorreo(
    correoSuperadmin
  );

  const idUsuario = usuarioExistente ?
    usuarioExistente.idUsuario :
    generarIdMotor_("USR");

  const ahora = new Date();

  const usuario = {
    ID_USUARIO: idUsuario,
    CORREO: correoSuperadmin,
    NOMBRE: limpiarTextoMotor_(
      configuracion.nombreSuperadmin ||
      "Administrador principal",
      180
    ),
    TELEFONO: limpiarTextoMotor_(
      configuracion.telefonoSuperadmin,
      40
    ),
    ROL: CONFIG.ROLES.SUPERADMIN,
    ID_PROVEEDOR: "",
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    TIPO_DOCUMENTO: limpiarTextoMotor_(
      configuracion.tipoDocumentoSuperadmin,
      40
    ),
    NUMERO_DOCUMENTO: limpiarTextoMotor_(
      configuracion.numeroDocumentoSuperadmin,
      50
    ),
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: idUsuario
  };

  if (!usuarioExistente) {
    usuario.FECHA_CREACION = ahora;
  }

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.USUARIOS,
    "ID_USUARIO",
    usuario
  );

  concederPermisosTotalesSuperadminMotor_(
    idUsuario
  );
}

/** @private */
function sembrarRolesMotor_() {
  const definiciones = [
    ["SUPERADMIN", "Superadministrador", "Control total del sistema.", 1],
    ["ADMIN", "Administrador", "Administración delegada.", 10]
  ];

  const actuales = leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD
  );
  const actor = obtenerActorTecnicoRolesMotor_();

  definiciones.forEach(function(definicion) {
    const codigo = definicion[0];
    const existente = actuales.find(function(item) {
      return normalizarTexto(item.CODIGO) === codigo;
    });
    const ahora = new Date();
    const objeto = {
      ID_ROL: existente ? existente.ID_ROL : generarIdMotor_("ROL"),
      CODIGO: codigo,
      NOMBRE: definicion[1],
      DESCRIPCION: definicion[2],
      NIVEL: definicion[3],
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      SISTEMA: true,
      FECHA_ACTUALIZACION: ahora,
      USUARIO_MODIFICACION: actor
    };

    if (!existente) {
      objeto.FECHA_CREACION = ahora;
      objeto.USUARIO_CREACION = actor;
    }

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD,
      "ID_ROL",
      objeto
    );
  });
}

/** @private */
function obtenerActorTecnicoRolesMotor_() {
  try {
    const usuario = obtenerUsuarioActual();
    if (usuario && usuario.idUsuario) return String(usuario.idUsuario).trim();
  } catch (error) {
    // Las migraciones ejecutadas desde el editor no siempre tienen una sesión web.
  }
  const correo = normalizarCorreo(Session.getEffectiveUser().getEmail());
  return correo || "SISTEMA";
}

/** @private */
function sembrarParametrosMotor_() {
  const parametros = [
    [
      "APP_REFRESH_ENABLED",
      "TRUE",
      "Activa o desactiva la actualización automática de datos. Si está desactivada, los usuarios deben utilizar el botón Actualizar.",
      "BOOLEAN",
      true
    ],
    [
      "APP_REFRESH_SECONDS",
      "60",
      "Intervalo de actualización incremental de las vistas operativas.",
      "NUMBER",
      true
    ],
    [
      "THEME_PRIMARY",
      "#00A1DE",
      "Color celeste principal.",
      "COLOR",
      true
    ],
    [
      "THEME_PRIMARY_DARK",
      "#006F99",
      "Color celeste oscuro.",
      "COLOR",
      true
    ],
    [
      "THEME_PRIMARY_LIGHT",
      "#E2F6FC",
      "Color celeste claro.",
      "COLOR",
      true
    ],
    [
      "APP_PAGE_SIZE",
      "50",
      "Cantidad predeterminada de registros por página.",
      "NUMBER",
      true
    ],
    [
      "APP_TIMEZONE",
      MOTOR_SGT360.ZONA_HORARIA,
      "Zona horaria funcional.",
      "TEXT",
      false
    ]
  ];

  parametros.forEach(function(item) {
    const existente = buscarFilaPorCampoMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.PARAMETROS,
      "CLAVE",
      item[0]
    );

    const objeto = {
      CLAVE: item[0],
      VALOR: item[1],
      DESCRIPCION: item[2],
      TIPO: item[3],
      EDITABLE: item[4],
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: new Date()
    };

    if (!existente) {
      objeto.FECHA_CREACION = new Date();
    }

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.PARAMETROS,
      "CLAVE",
      objeto
    );
  });
}

/** @private */
function sembrarModulosSistemaMotor_() {
  const ahora = new Date();
  const definiciones = [{
    codigo: "DASHBOARD",
    nombre: "Inicio",
    descripcion: "Resumen general de la aplicación.",
    icono: "space_dashboard",
    grupo: "General",
    orden: 10,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "ADMIN_GENERAL",
    nombre: "Administración general",
    descripcion: "Indicadores generales reservados para el superadministrador.",
    icono: "admin_panel_settings",
    grupo: "Sistema",
    orden: 900,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "ADMIN_USUARIOS",
    nombre: "Usuarios",
    descripcion: "Altas, datos, roles y estado de los usuarios.",
    icono: "group",
    grupo: "Sistema",
    orden: 910,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "ADMIN_PERMISOS",
    nombre: "Roles y permisos",
    descripcion: "Roles, matriz de permisos, alcances y delegación.",
    icono: "shield_person",
    grupo: "Sistema",
    orden: 920,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "PROVEEDORES",
    nombre: "Proveedores",
    descripcion: "Administración y consulta del maestro general de proveedores.",
    icono: "domain",
    grupo: "Sistema",
    orden: 925,
    tipo: "ESPECIALIZADA",
    administrable: false,
    hojaDatos: CONFIG.HOJAS.PROVEEDORES,
    campoClave: "ID_PROVEEDOR",
    campoProveedor: "ID_PROVEEDOR"
  }, {
    codigo: "ADMIN_ESTRUCTURA",
    nombre: "Estructura comercial",
    descripcion: "Proveedores, oficinas, grupos y relaciones comerciales.",
    icono: "account_tree",
    grupo: "Sistema",
    orden: 930,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "ADMIN_CONFIG_APP",
    nombre: "Configuración de la aplicación",
    descripcion: "Módulos, catálogos, parámetros y recursos visuales.",
    icono: "settings_suggest",
    grupo: "Sistema",
    orden: 940,
    tipo: "ESPECIALIZADA",
    administrable: false
  }, {
    codigo: "ADMIN_AUDITORIA",
    nombre: "Auditoría",
    descripcion: "Consulta de accesos, eventos y cambios de permisos.",
    icono: "manage_search",
    grupo: "Sistema",
    orden: 950,
    tipo: "ESPECIALIZADA",
    administrable: false
  }];

  const actuales = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS);
  definiciones.forEach(function(definicion) {
    const existente = actuales.find(function(item) {
      return normalizarTexto(item.CODIGO) === definicion.codigo;
    });
    const objeto = {
      ID_MODULO: existente ? existente.ID_MODULO : generarIdMotor_("MOD"),
      CODIGO: definicion.codigo,
      NOMBRE: definicion.nombre,
      DESCRIPCION: definicion.descripcion,
      ICONO: definicion.icono,
      GRUPO_MENU: definicion.grupo,
      ORDEN: definicion.orden,
      TIPO_VISTA: definicion.tipo,
      BASE_ALIAS: MOTOR_SGT360.BASES.OPERATION,
      HOJA_DATOS: definicion.hojaDatos || "",
      CAMPO_CLAVE: definicion.campoClave || "ID",
      CAMPO_ESTADO: "ESTADO",
      CAMPO_USUARIO: "",
      CAMPO_PROVEEDOR: definicion.campoProveedor || "",
      CAMPO_GRUPO: "",
      ADMINISTRABLE: definicion.administrable,
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: ahora
    };
    if (!existente) objeto.FECHA_CREACION = ahora;
    guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS,
      "ID_MODULO", objeto);
  });

  // El módulo monolítico queda inactivo después de la separación.
  const anterior = actuales.find(function(item) {
    return normalizarTexto(item.CODIGO) === "ADMINISTRACION";
  });
  if (anterior) {
    guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS,
      "ID_MODULO", Object.assign({}, anterior, {
        ESTADO: CONFIG.ESTADOS.INACTIVO,
        FECHA_ACTUALIZACION: ahora
      }));
  }
}

/** @private */
function sembrarRecursosSistemaMotor_() {
  sincronizarRecursosModuloMotor_("DASHBOARD", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Acceder al inicio", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_RESUMEN", nombre: "Ver indicadores principales", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_ALERTAS", nombre: "Ver alertas y pendientes", tipo: "ACCION", orden: 30
  }, {
    codigo: "VER_ACTIVIDAD_RECIENTE", nombre: "Ver actividad reciente", tipo: "ACCION", orden: 40
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_GENERAL", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_RESUMEN", nombre: "Ver resumen administrativo", tipo: "ACCION", orden: 20
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_USUARIOS", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver usuarios", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_DETALLE", nombre: "Ver datos y asignaciones", tipo: "ACCION", orden: 30
  }, {
    codigo: "CREAR", nombre: "Crear usuarios", tipo: "ACCION", orden: 40
  }, {
    codigo: "EDITAR", nombre: "Editar usuarios", tipo: "ACCION", orden: 50
  }, {
    codigo: "CAMBIAR_ESTADO", nombre: "Activar o inactivar usuarios", tipo: "ACCION", orden: 60
  }, {
    codigo: "IMPORTAR", nombre: "Importar usuarios", tipo: "ACCION", orden: 70
  }, {
    codigo: "EXPORTAR", nombre: "Exportar usuarios", tipo: "ACCION", orden: 80
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_PERMISOS", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_ROLES", nombre: "Ver roles", tipo: "ACCION", orden: 20
  }, {
    codigo: "EDITAR_ROLES", nombre: "Crear y editar roles", tipo: "ACCION", orden: 30
  }, {
    codigo: "VER_PERMISOS", nombre: "Ver matriz de permisos", tipo: "ACCION", orden: 40
  }, {
    codigo: "EDITAR_PERMISOS", nombre: "Editar matriz de permisos", tipo: "ACCION", orden: 50
  }, {
    codigo: "DELEGAR_PERMISOS", nombre: "Delegar permisos", tipo: "ACCION", orden: 60
  }]);

  sincronizarRecursosModuloMotor_("PROVEEDORES", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver listado de proveedores", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_DETALLE", nombre: "Ver detalle de proveedores", tipo: "ACCION", orden: 30
  }, {
    codigo: "CREAR", nombre: "Crear proveedores", tipo: "ACCION", orden: 40
  }, {
    codigo: "EDITAR", nombre: "Editar proveedores", tipo: "ACCION", orden: 50
  }, {
    codigo: "CAMBIAR_ESTADO", nombre: "Activar o inactivar proveedores", tipo: "ACCION", orden: 60
  }, {
    codigo: "IMPORTAR", nombre: "Importar proveedores", tipo: "ACCION", orden: 70
  }, {
    codigo: "EXPORTAR", nombre: "Exportar proveedores", tipo: "ACCION", orden: 80
  }, {
    codigo: "ADMINISTRAR", nombre: "Administrar completamente proveedores", tipo: "ACCION", orden: 90
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_ESTRUCTURA", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver estructura comercial", tipo: "ACCION", orden: 20
  }, {
    codigo: "CREAR", nombre: "Crear maestros", tipo: "ACCION", orden: 30
  }, {
    codigo: "EDITAR", nombre: "Editar maestros", tipo: "ACCION", orden: 40
  }, {
    codigo: "CAMBIAR_ESTADO", nombre: "Activar o inactivar maestros", tipo: "ACCION", orden: 50
  }, {
    codigo: "IMPORTAR", nombre: "Importar maestros", tipo: "ACCION", orden: 60
  }, {
    codigo: "EXPORTAR", nombre: "Exportar maestros", tipo: "ACCION", orden: 70
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_CONFIG_APP", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_MODULOS", nombre: "Ver módulos y navegación", tipo: "ACCION", orden: 20
  }, {
    codigo: "EDITAR_MODULOS", nombre: "Editar módulos y campos", tipo: "ACCION", orden: 30
  }, {
    codigo: "VER_CATALOGOS", nombre: "Ver catálogos", tipo: "ACCION", orden: 40
  }, {
    codigo: "EDITAR_CATALOGOS", nombre: "Editar catálogos y valores", tipo: "ACCION", orden: 50
  }, {
    codigo: "VER_PARAMETROS", nombre: "Ver parámetros", tipo: "ACCION", orden: 60
  }, {
    codigo: "EDITAR_PARAMETROS", nombre: "Editar parámetros", tipo: "ACCION", orden: 70
  }, {
    codigo: "VER_RECURSOS", nombre: "Ver recursos visuales", tipo: "ACCION", orden: 80
  }, {
    codigo: "EDITAR_RECURSOS", nombre: "Editar recursos visuales", tipo: "ACCION", orden: 90
  }]);

  sincronizarRecursosModuloMotor_("ADMIN_AUDITORIA", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Acceder a auditoría", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver registros de auditoría", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_SESIONES", nombre: "Ver sesiones activas", tipo: "ACCION", orden: 30
  }, {
    codigo: "CERRAR_SESIONES", nombre: "Forzar cierre de sesiones", tipo: "ACCION", orden: 40
  }, {
    codigo: "EXPORTAR", nombre: "Exportar auditoría", tipo: "ACCION", orden: 50
  }]);

  // Los recursos del módulo anterior dejan de participar en matrices nuevas.
  const anteriores = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.RECURSOS_SEGURIDAD).filter(function(item) {
    return normalizarTexto(item.MODULO) === "ADMINISTRACION" &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  });
  anteriores.forEach(function(item) {
    guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD,
      "ID_RECURSO", Object.assign({}, item, {
        ESTADO: CONFIG.ESTADOS.INACTIVO,
        FECHA_ACTUALIZACION: new Date()
      }));
  });
}

/** @private */
function concederPermisosTotalesSuperadminMotor_(idUsuarioActualizacion) {
  // SUPERADMIN recibe todos los recursos activos de forma implícita desde
  // obtenerPermisosUsuarioMotor_. No se crean filas editables en SEG_PERMISOS.
  return 0;
}

/**
 * Diagnóstico no destructivo de instalación.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoMotorSGT360() {
  const entorno = obtenerDiagnosticoEntornoMotor();
  const bases = {};
  const errores = [];

  [
    MOTOR_SGT360.BASES.CONFIG,
    MOTOR_SGT360.BASES.SECURITY,
    MOTOR_SGT360.BASES.OPERATION
  ].forEach(function(aliasBase) {
    try {
      const libro = obtenerLibroMotor_(aliasBase);
      bases[aliasBase] = {
        correcto: true,
        id: libro.getId(),
        nombre: libro.getName(),
        hojas: libro.getSheets().map(function(hoja) {
          return hoja.getName();
        })
      };
    } catch (error) {
      bases[aliasBase] = {
        correcto: false,
        mensaje: error.message
      };
      errores.push(
        aliasBase + ": " + error.message
      );
    }
  });

  const hojas = [];

  Object.keys(
    CABECERAS_MOTOR_SGT360
  ).forEach(function(nombreHoja) {
    try {
      const contexto = obtenerContextoTablaMotor_(
        obtenerAliasHojaMotor_(nombreHoja),
        nombreHoja,
        CABECERAS_MOTOR_SGT360[nombreHoja]
      );

      hojas.push({
        hoja: nombreHoja,
        correcto: true,
        columnas: contexto.numeroColumnas,
        registros: Math.max(
          contexto.hoja.getLastRow() - 1,
          0
        )
      });
    } catch (error) {
      hojas.push({
        hoja: nombreHoja,
        correcto: false,
        mensaje: error.message
      });
      errores.push(
        nombreHoja + ": " + error.message
      );
    }
  });

  return {
    correcto: entorno.correcto &&
      errores.length === 0,
    motor: MOTOR_SGT360.VERSION_MOTOR,
    entorno: entorno,
    bases: bases,
    hojas: hojas,
    oauth: {
      google: Boolean(
        PropertiesService
        .getScriptProperties()
        .getProperty(
          "SGT360_AUTH_GOOGLE_CLIENT_ID"
        )
      ),
      microsoft: Boolean(
        PropertiesService
        .getScriptProperties()
        .getProperty(
          "SGT360_AUTH_MICROSOFT_CLIENT_ID"
        )
      )
    },
    errores: errores,
    mensaje: errores.length === 0 ?
      "El motor está estructuralmente preparado." :
      "El motor tiene " +
      errores.length +
      " observación(es)."
  };
}
/**
 * Siembra el catálogo de tipos de documento utilizado por el formulario de
 * usuarios. El proceso es idempotente y conserva cambios posteriores.
 *
 * @private
 */
function sembrarCatalogosSistemaMotor_() {
  const codigoCatalogo = CONFIG.CATALOGOS_SISTEMA.TIPOS_DOCUMENTO_USUARIO;
  const ahora = new Date();
  const catalogos = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS);
  const existente = catalogos.find(function(item) {
    return normalizarTexto(item.CODIGO) === codigoCatalogo;
  });

  const objetoCatalogo = {
    ID_CATALOGO: existente ? String(existente.ID_CATALOGO || "").trim() : generarIdMotor_("CAT"),
    CODIGO: codigoCatalogo,
    NOMBRE: "Tipos de documento de usuario",
    DESCRIPCION: "Documentos habilitados y validados en el maestro de usuarios.",
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora
  };
  if (!existente) objetoCatalogo.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS, "ID_CATALOGO", objetoCatalogo);

  const definiciones = [
    ["DNI", "DNI", 10],
    ["CE", "Carné de extranjería", 20],
    ["PASAPORTE", "Pasaporte", 30]
  ];
  const actuales = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES);

  definiciones.forEach(function(definicion) {
    const valorExistente = actuales.find(function(item) {
      return normalizarTexto(item.CATALOGO) === codigoCatalogo &&
        normalizarTexto(item.CODIGO) === definicion[0];
    });

    const objetoValor = {
      ID_VALOR: valorExistente ? String(valorExistente.ID_VALOR || "").trim() : generarIdMotor_("VAL"),
      CATALOGO: codigoCatalogo,
      CODIGO: definicion[0],
      NOMBRE: definicion[1],
      ORDEN: definicion[2],
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: ahora
    };
    if (!valorExistente) objetoValor.FECHA_CREACION = ahora;
    guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES, "ID_VALOR", objetoValor);
  });
}

/**
 * Copia ADMIN_ESTRUCTURA a los roles que ya podían administrar usuarios.
 * Así las delegaciones existentes no pierden la capacidad de completar las
 * asignaciones requeridas por el formulario.
 *
 * @return {number} Cantidad de roles actualizados.
 * @private
 */
function migrarPermisoEstructuraDesdeUsuariosMotor_() {
  const permisos = leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.PERMISOS_RECURSOS
  );
  const ahora = new Date();
  let actualizados = 0;

  permisos.filter(function(item) {
    return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
      normalizarTexto(item.MODULO) === "ADMINISTRACION" &&
      normalizarTexto(item.RECURSO) === "ADMIN_USUARIOS" &&
      convertirBooleanoMotor_(item.PERMITIDO) &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).forEach(function(origen) {
    const rol = normalizarTexto(origen.ID_SUJETO);
    const existente = permisos.find(function(item) {
      return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
        normalizarTexto(item.ID_SUJETO) === rol &&
        normalizarTexto(item.MODULO) === "ADMINISTRACION" &&
        normalizarTexto(item.RECURSO) === "ADMIN_ESTRUCTURA";
    });

    const permisoEstructura = {
      ID_PERMISO: existente ? String(existente.ID_PERMISO || "").trim() : generarIdMotor_("PER"),
      TIPO_SUJETO: "ROL",
      ID_SUJETO: rol,
      MODULO: "ADMINISTRACION",
      RECURSO: "ADMIN_ESTRUCTURA",
      PERMITIDO: true,
      ALCANCE: normalizarTexto(origen.ALCANCE || "GLOBAL"),
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: "MIGRACION_16A"
    };
    if (!existente) permisoEstructura.FECHA_CREACION = ahora;

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS,
      "ID_PERMISO",
      permisoEstructura
    );
    actualizados++;
  });

  return actualizados;
}

/**
 * Migra una instalación existente al modelo organizativo de la versión 8.
 *
 * Ejecutar una sola vez después de reemplazar los archivos entregados.
 * Es idempotente: puede repetirse si una ejecución fue interrumpida.
 *
 * @return {Object} Resultado de la actualización estructural.
 */
function actualizarEstructuraUsuariosPaso16A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    [
      CONFIG.HOJAS.PROVEEDORES,
      CONFIG.HOJAS.OFICINAS,
      CONFIG.HOJAS.GRUPOS,
      CONFIG.HOJAS.PROVEEDOR_OFICINAS
    ].forEach(function(nombreHoja) {
      asegurarHojaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        nombreHoja,
        CABECERAS_MOTOR_SGT360[nombreHoja]
      );
    });

    sembrarCatalogosSistemaMotor_();
    sembrarRecursosSistemaMotor_();

    const superadministradores = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.USUARIOS
    ).filter(function(item) {
      return normalizarTexto(item.ROL) === CONFIG.ROLES.SUPERADMIN &&
        normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    });

    superadministradores.forEach(function(item) {
      concederPermisosTotalesSuperadminMotor_(String(item.ID_USUARIO || "").trim());
    });

    const rolesEstructuraActualizados = migrarPermisoEstructuraDesdeUsuariosMotor_();

    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES);

    return {
      correcto: true,
      paso: "16A",
      hojas: [CONFIG.HOJAS.PROVEEDORES, CONFIG.HOJAS.OFICINAS, CONFIG.HOJAS.GRUPOS,
        CONFIG.HOJAS.PROVEEDOR_OFICINAS],
      catalogoDocumento: CONFIG.CATALOGOS_SISTEMA.TIPOS_DOCUMENTO_USUARIO,
      recursoPermisos: "ADMIN_ESTRUCTURA",
      superadministradoresActualizados: superadministradores.length,
      rolesEstructuraActualizados: rolesEstructuraActualizados,
      mensaje: "La estructura independiente de oficinas, grupos por oficina y proveedores con oficinas asignadas quedó preparada."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Migra los permisos administrativos del módulo monolítico a los módulos
 * independientes. Solo procesa permisos permitidos y nunca crea permisos
 * explícitos para SUPERADMIN.
 *
 * @return {number} Cantidad de permisos creados o actualizados.
 * @private
 */
function migrarPermisosAdministrativosSeparadosMotor_() {
  const permisos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.PERMISOS_RECURSOS);
  const fuentes = permisos.filter(function(item) {
    return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
      normalizarTexto(item.ID_SUJETO) !== CONFIG.ROLES.SUPERADMIN &&
      normalizarTexto(item.MODULO) === "ADMINISTRACION" &&
      convertirBooleanoMotor_(item.PERMITIDO) &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  });
  const mapa = {
    ADMIN_USUARIOS: [["ADMIN_USUARIOS", ["VISUALIZAR_MODULO", "VER_LISTADO", "VER_DETALLE", "CREAR", "EDITAR", "CAMBIAR_ESTADO", "IMPORTAR", "EXPORTAR"]]],
    ADMIN_ESTRUCTURA: [["ADMIN_ESTRUCTURA", ["VISUALIZAR_MODULO", "VER_LISTADO", "CREAR", "EDITAR", "CAMBIAR_ESTADO", "IMPORTAR", "EXPORTAR"]]],
    ADMIN_ROLES: [["ADMIN_PERMISOS", ["VISUALIZAR_MODULO", "VER_ROLES", "EDITAR_ROLES"]]],
    ADMIN_PERMISOS: [["ADMIN_PERMISOS", ["VISUALIZAR_MODULO", "VER_PERMISOS", "EDITAR_PERMISOS"]]],
    DELEGAR_PERMISOS: [["ADMIN_PERMISOS", ["VISUALIZAR_MODULO", "VER_PERMISOS", "EDITAR_PERMISOS", "DELEGAR_PERMISOS"]]],
    ADMIN_MODULOS: [["ADMIN_CONFIG_APP", ["VISUALIZAR_MODULO", "VER_MODULOS", "EDITAR_MODULOS"]]],
    ADMIN_CATALOGOS: [["ADMIN_CONFIG_APP", ["VISUALIZAR_MODULO", "VER_CATALOGOS", "EDITAR_CATALOGOS"]]],
    ADMIN_CONFIGURACION: [["ADMIN_CONFIG_APP", ["VISUALIZAR_MODULO", "VER_PARAMETROS", "EDITAR_PARAMETROS"]]],
    ADMIN_RECURSOS_VISUALES: [["ADMIN_CONFIG_APP", ["VISUALIZAR_MODULO", "VER_RECURSOS", "EDITAR_RECURSOS"]]],
    ADMIN_AUDITORIA: [["ADMIN_AUDITORIA", ["VISUALIZAR_MODULO", "VER_LISTADO", "EXPORTAR"]]]
  };
  let total = 0;
  const vistos = {};
  fuentes.forEach(function(origen) {
    const destinos = mapa[normalizarTexto(origen.RECURSO)] || [];
    destinos.forEach(function(destino) {
      destino[1].forEach(function(recurso) {
        const rol = normalizarTexto(origen.ID_SUJETO);
        const clave = rol + "|" + destino[0] + "|" + recurso;
        if (vistos[clave]) return;
        vistos[clave] = true;
        guardarPermisoMigradoAdministrativoMotor_(
          rol,
          destino[0],
          recurso,
          normalizarTexto(origen.ALCANCE || "GLOBAL"),
          permisos
        );
        total++;
      });
    });
  });
  return total;
}

/** @private */
function guardarPermisoMigradoAdministrativoMotor_(rol, modulo, recurso, alcance, permisos,
  idUsuarioActualizacion) {
  const existente = permisos.find(function(item) {
    return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
      normalizarTexto(item.ID_SUJETO) === rol &&
      normalizarTexto(item.MODULO) === modulo &&
      normalizarTexto(item.RECURSO) === recurso;
  });
  const ahora = new Date();
  const objeto = {
    ID_PERMISO: existente ? String(existente.ID_PERMISO || "").trim() : generarIdMotor_("PER"),
    TIPO_SUJETO: "ROL",
    ID_SUJETO: rol,
    MODULO: modulo,
    RECURSO: recurso,
    PERMITIDO: true,
    ALCANCE: alcance || "GLOBAL",
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: idUsuarioActualizacion || "MIGRACION_17A"
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.PERMISOS_RECURSOS,
    "ID_PERMISO", objeto);
}

/**
 * Desactiva las filas históricas de permisos del rol SUPERADMIN. El acceso no
 * se pierde porque se resuelve de forma implícita y GLOBAL.
 *
 * @return {number} Filas desactivadas.
 * @private
 */
function retirarPermisosExplicitosSuperadminMotor_(idUsuarioActualizacion) {
  const permisos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.PERMISOS_RECURSOS).filter(function(item) {
    return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
      normalizarTexto(item.ID_SUJETO) === CONFIG.ROLES.SUPERADMIN &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  });
  permisos.forEach(function(item) {
    guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.PERMISOS_RECURSOS,
      "ID_PERMISO", Object.assign({}, item, {
        ESTADO: CONFIG.ESTADOS.INACTIVO,
        FECHA_ACTUALIZACION: new Date(),
        ID_USUARIO_ACTUALIZACION: idUsuarioActualizacion || "MIGRACION_17A"
      }));
  });
  return permisos.length;
}

/**
 * Actualiza una instalación v8/v12 a la navegación administrativa separada.
 * Ejecutar una sola vez después de reemplazar los archivos de la versión 13.
 * Es idempotente y puede repetirse si una ejecución fue interrumpida.
 *
 * @return {Object} Resultado de la migración.
 */
function actualizarModulosAdministrativosPaso17A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    sembrarModulosSistemaMotor_();
    sembrarRecursosSistemaMotor_();
    const permisosMigrados = migrarPermisosAdministrativosSeparadosMotor_();
    const permisosSuperadminDesactivados = retirarPermisosExplicitosSuperadminMotor_();

    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS);

    return {
      correcto: true,
      paso: "17A",
      modulos: [
        "ADMIN_GENERAL", "ADMIN_USUARIOS", "ADMIN_PERMISOS",
        "ADMIN_ESTRUCTURA", "ADMIN_CONFIG_APP", "ADMIN_AUDITORIA"
      ],
      moduloAnteriorInactivo: "ADMINISTRACION",
      permisosMigrados: permisosMigrados,
      permisosSuperadminDesactivados: permisosSuperadminDesactivados,
      superadminImplicito: true,
      mensaje: "La administración quedó separada en módulos independientes y SUPERADMIN conserva acceso total implícito."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Agrega el control global de actualización automática a una instalación v13.
 *
 * Es idempotente: conserva el valor existente y solo crea el parámetro cuando
 * todavía no está registrado.
 *
 * @return {Object} Resultado de la actualización.
 */
function actualizarActualizacionAutomaticaPaso18A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const parametros = leerTablaMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.PARAMETROS
    );
    const existente = parametros.find(function(item) {
      return normalizarTexto(item.CLAVE) === "APP_REFRESH_ENABLED";
    });

    const ahora = new Date();
    const valor = existente ?
      (convertirBooleanoMotor_(existente.VALOR) ? "TRUE" : "FALSE") :
      "TRUE";

    const objeto = {
      CLAVE: "APP_REFRESH_ENABLED",
      VALOR: valor,
      DESCRIPCION: "Activa o desactiva la actualización automática de datos. Si está desactivada, los usuarios deben utilizar el botón Actualizar.",
      TIPO: "BOOLEAN",
      EDITABLE: true,
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: ahora
    };

    if (!existente) objeto.FECHA_CREACION = ahora;

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.PARAMETROS,
      "CLAVE",
      objeto
    );

    SpreadsheetApp.flush();
    invalidarCacheMotor_("CONFIG");

    return {
      correcto: true,
      paso: "18A",
      parametro: "APP_REFRESH_ENABLED",
      valor: valor,
      creado: !existente,
      mensaje: "El control de actualización automática quedó disponible en Configuración de la aplicación."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Actualiza una instalación existente al módulo independiente PROVEEDORES.
 *
 * La migración es incremental e idempotente: agrega columnas faltantes, conserva
 * columnas heredadas, registra el módulo y sus recursos sin duplicarlos y migra
 * permisos equivalentes desde ADMIN_ESTRUCTURA para no retirar accesos existentes.
 *
 * @return {Object} Resultado de la migración.
 */
function actualizarModuloProveedoresPaso19A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const hoja = asegurarHojaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      CABECERAS_MOTOR_SGT360.MAE_PROVEEDORES
    );
    const filasActualizadas = completarTrazabilidadProveedoresPaso19A_(hoja);

    sembrarModulosSistemaMotor_();
    sembrarRecursosSistemaMotor_();
    const permisosMigrados = migrarPermisosProveedoresPaso19A_();
    const permisosSuperadminDesactivados = retirarPermisosExplicitosSuperadminMotor_(
      "MIGRACION_19A"
    );

    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES);

    return {
      correcto: true,
      paso: "19A",
      funcion: "actualizarModuloProveedoresPaso19A",
      modulo: "PROVEEDORES",
      hoja: CONFIG.HOJAS.PROVEEDORES,
      filasTrazabilidadCompletadas: filasActualizadas,
      permisosMigrados: permisosMigrados,
      permisosSuperadminDesactivados: permisosSuperadminDesactivados,
      mensaje: "El módulo PROVEEDORES quedó registrado sobre MAE_PROVEEDORES sin crear un maestro paralelo."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function completarTrazabilidadProveedoresPaso19A_(hoja) {
  if (!hoja || hoja.getLastRow() < 2) return 0;
  const contexto = obtenerContextoTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDORES,
    ["ID_PROVEEDOR"]
  );
  const rango = hoja.getRange(2, 1, hoja.getLastRow() - 1, contexto.numeroColumnas);
  const filas = rango.getValues();
  let actualizadas = 0;

  filas.forEach(function(fila, indice) {
    const item = filaAObjetoMotor_(contexto.cabeceras, fila);
    const parche = {};
    if (!item.FECHA_MODIFICACION && item.FECHA_ACTUALIZACION) {
      parche.FECHA_MODIFICACION = item.FECHA_ACTUALIZACION;
    }
    if (!item.USUARIO_CREACION && item.ID_USUARIO_ACTUALIZACION) {
      parche.USUARIO_CREACION = item.ID_USUARIO_ACTUALIZACION;
    }
    if (!item.USUARIO_MODIFICACION && item.ID_USUARIO_ACTUALIZACION) {
      parche.USUARIO_MODIFICACION = item.ID_USUARIO_ACTUALIZACION;
    }
    if (!Object.keys(parche).length) return;
    filas[indice] = objetoAFilaMotor_(contexto.cabeceras, parche, fila);
    actualizadas += 1;
  });

  if (actualizadas) rango.setValues(filas);
  return actualizadas;
}

/** @private */
function migrarPermisosProveedoresPaso19A_() {
  const permisos = leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.PERMISOS_RECURSOS
  );
  const fuentes = permisos.filter(function(item) {
    return normalizarTexto(item.TIPO_SUJETO) === "ROL" &&
      normalizarTexto(item.ID_SUJETO) !== CONFIG.ROLES.SUPERADMIN &&
      normalizarTexto(item.MODULO) === "ADMIN_ESTRUCTURA" &&
      convertirBooleanoMotor_(item.PERMITIDO) &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  });
  const permitidos = {
    VISUALIZAR_MODULO: true,
    VER_LISTADO: true,
    CREAR: true,
    EDITAR: true,
    CAMBIAR_ESTADO: true,
    IMPORTAR: true,
    EXPORTAR: true
  };
  const vistos = {};
  let total = 0;

  fuentes.forEach(function(origen) {
    const recursoOrigen = normalizarTexto(origen.RECURSO);
    if (!permitidos[recursoOrigen]) return;
    const rol = normalizarTexto(origen.ID_SUJETO);
    const recursosDestino = recursoOrigen === "VER_LISTADO" ?
      ["VER_LISTADO", "VER_DETALLE"] : [recursoOrigen];

    recursosDestino.forEach(function(recurso) {
      const clave = rol + "|PROVEEDORES|" + recurso;
      if (vistos[clave]) return;
      vistos[clave] = true;
      guardarPermisoMigradoAdministrativoMotor_(
        rol,
        "PROVEEDORES",
        recurso,
        normalizarTexto(origen.ALCANCE || "GLOBAL"),
        permisos,
        "MIGRACION_19A"
      );
      total += 1;
    });
  });

  return total;
}

/**
 * Actualiza una instalación existente al esquema de roles dinámicos Paso 20A.
 *
 * Conserva IDs, códigos, usuarios y permisos. Únicamente SUPERADMIN y ADMIN
 * permanecen protegidos; los demás roles pasan a ser configurables. La función
 * agrega trazabilidad faltante, revisa incompatibilidades y puede ejecutarse
 * más de una vez sin crear registros duplicados.
 *
 * @return {Object} Resultado de la migración.
 */
function actualizarRolesDinamicosPaso20A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD,
      CABECERAS_MOTOR_SGT360.SEG_ROLES
    );

    const actor = obtenerActorTecnicoRolesMotor_();
    const protegidos = asegurarRolesProtegidosPaso20A_(actor);
    const rolesAntes = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD);
    let rolesConvertidos = 0;
    let trazabilidadCompletada = 0;

    rolesAntes.forEach(function(item) {
      const codigo = normalizarTexto(item.CODIGO);
      if (!codigo || codigo === CONFIG.ROLES.SUPERADMIN || codigo === CONFIG.ROLES.ADMIN) return;
      const parche = {};
      if (convertirBooleanoMotor_(item.SISTEMA)) parche.SISTEMA = false;
      if (!String(item.USUARIO_CREACION || "").trim()) {
        parche.USUARIO_CREACION = String(item.USUARIO_MODIFICACION || "").trim() || actor;
      }
      if (!String(item.USUARIO_MODIFICACION || "").trim()) {
        parche.USUARIO_MODIFICACION = actor;
      }
      if (!Object.keys(parche).length) return;

      parche.ID_ROL = String(item.ID_ROL || "").trim();
      parche.FECHA_ACTUALIZACION = new Date();
      guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD,
        "ID_ROL", parche);
      if (Object.prototype.hasOwnProperty.call(parche, "SISTEMA")) rolesConvertidos += 1;
      if (parche.USUARIO_CREACION || parche.USUARIO_MODIFICACION) trazabilidadCompletada += 1;
    });

    const diagnostico = diagnosticarRolesPaso20A_();
    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD);

    return {
      correcto: true,
      paso: "20A",
      funcion: "actualizarRolesDinamicosPaso20A",
      rolesProtegidosCreados: protegidos.creados,
      rolesProtegidosActualizados: protegidos.actualizados,
      rolesConvertidosAConfigurables: rolesConvertidos,
      filasTrazabilidadCompletadas: trazabilidadCompletada,
      codigosDuplicados: diagnostico.codigosDuplicados,
      nombresActivosDuplicados: diagnostico.nombresActivosDuplicados,
      rolesInactivosConUsuariosActivos: diagnostico.rolesInactivosConUsuariosActivos,
      usuariosConfigurablesSinProveedor: diagnostico.usuariosConfigurablesSinProveedor,
      permisosGlobalesActivos: diagnostico.permisosGlobalesActivos,
      requiereRevision: diagnostico.codigosDuplicados.length > 0 ||
        diagnostico.nombresActivosDuplicados.length > 0 ||
        diagnostico.rolesInactivosConUsuariosActivos.length > 0 ||
        diagnostico.usuariosConfigurablesSinProveedor.length > 0,
      mensaje: "Los roles quedaron preparados para administración dinámica. SUPERADMIN y ADMIN permanecen protegidos."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function asegurarRolesProtegidosPaso20A_(actor) {
  const definiciones = [
    { codigo: "SUPERADMIN", nombre: "Superadministrador", descripcion: "Control total del sistema.", nivel: 1 },
    { codigo: "ADMIN", nombre: "Administrador", descripcion: "Administración delegada.", nivel: 10 }
  ];
  const actuales = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD);
  let creados = 0;
  let actualizados = 0;

  definiciones.forEach(function(definicion) {
    const existente = actuales.find(function(item) {
      return normalizarTexto(item.CODIGO) === definicion.codigo;
    });
    const necesitaActualizar = !existente ||
      String(existente.NOMBRE || "").trim() !== definicion.nombre ||
      String(existente.DESCRIPCION || "").trim() !== definicion.descripcion ||
      Number(existente.NIVEL) !== definicion.nivel ||
      normalizarTexto(existente.ESTADO) !== CONFIG.ESTADOS.ACTIVO ||
      !convertirBooleanoMotor_(existente.SISTEMA) ||
      !String(existente.USUARIO_CREACION || "").trim() ||
      !String(existente.USUARIO_MODIFICACION || "").trim();
    if (!necesitaActualizar) return;

    const ahora = new Date();
    const objeto = {
      ID_ROL: existente ? existente.ID_ROL : generarIdMotor_("ROL"),
      CODIGO: definicion.codigo,
      NOMBRE: definicion.nombre,
      DESCRIPCION: definicion.descripcion,
      NIVEL: definicion.nivel,
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      SISTEMA: true,
      FECHA_ACTUALIZACION: ahora,
      USUARIO_MODIFICACION: actor
    };
    if (!existente) {
      objeto.FECHA_CREACION = ahora;
      objeto.USUARIO_CREACION = actor;
      creados += 1;
    } else {
      if (!String(existente.USUARIO_CREACION || "").trim()) {
        objeto.USUARIO_CREACION = actor;
      }
      actualizados += 1;
    }
    guardarObjetoMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD,
      "ID_ROL", objeto);
  });
  return { creados: creados, actualizados: actualizados };
}

/** @private */
function diagnosticarRolesPaso20A_() {
  const roles = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.ROLES_SEGURIDAD);
  const usuarios = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.USUARIOS);
  const permisos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.PERMISOS_RECURSOS);
  const codigos = {};
  const nombresActivos = {};

  roles.forEach(function(item) {
    const codigo = normalizarTexto(item.CODIGO);
    const nombre = normalizarTexto(item.NOMBRE);
    if (codigo) {
      if (!codigos[codigo]) codigos[codigo] = [];
      codigos[codigo].push(String(item.ID_ROL || "").trim());
    }
    if (nombre && normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO) {
      if (!nombresActivos[nombre]) nombresActivos[nombre] = [];
      nombresActivos[nombre].push(codigo);
    }
  });

  const codigosDuplicados = Object.keys(codigos).filter(function(codigo) {
    return codigos[codigo].length > 1;
  }).map(function(codigo) {
    return { codigo: codigo, idsRol: codigos[codigo] };
  });
  const nombresActivosDuplicados = Object.keys(nombresActivos).filter(function(nombre) {
    return nombresActivos[nombre].length > 1;
  }).map(function(nombre) {
    return { nombre: nombre, codigos: nombresActivos[nombre] };
  });

  const rolesPorCodigo = {};
  roles.forEach(function(item) {
    rolesPorCodigo[normalizarTexto(item.CODIGO)] = item;
  });
  const usuariosActivosPorRol = {};
  usuarios.forEach(function(item) {
    if (normalizarTexto(item.ESTADO) !== CONFIG.ESTADOS.ACTIVO) return;
    const codigo = normalizarTexto(item.ROL);
    if (!usuariosActivosPorRol[codigo]) usuariosActivosPorRol[codigo] = [];
    usuariosActivosPorRol[codigo].push(String(item.ID_USUARIO || "").trim());
  });

  const rolesInactivosConUsuariosActivos = Object.keys(usuariosActivosPorRol).filter(function(codigo) {
    const rol = rolesPorCodigo[codigo];
    return rol && normalizarTexto(rol.ESTADO) !== CONFIG.ESTADOS.ACTIVO;
  }).map(function(codigo) {
    return { codigo: codigo, usuarios: usuariosActivosPorRol[codigo] };
  });

  const usuariosConfigurablesSinProveedor = usuarios.filter(function(item) {
    if (normalizarTexto(item.ESTADO) !== CONFIG.ESTADOS.ACTIVO) return false;
    const codigo = normalizarTexto(item.ROL);
    if (codigo === CONFIG.ROLES.SUPERADMIN || codigo === CONFIG.ROLES.ADMIN) return false;
    return !String(item.ID_PROVEEDOR || "").trim();
  }).map(function(item) {
    return {
      idUsuario: String(item.ID_USUARIO || "").trim(),
      correo: normalizarCorreo(item.CORREO),
      rol: normalizarTexto(item.ROL)
    };
  });

  const permisosGlobalesActivos = permisos.filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO &&
      convertirBooleanoMotor_(item.PERMITIDO) && normalizarTexto(item.ALCANCE) === "GLOBAL" &&
      normalizarTexto(item.ID_SUJETO) !== CONFIG.ROLES.SUPERADMIN;
  }).map(function(item) {
    return {
      tipoSujeto: normalizarTexto(item.TIPO_SUJETO),
      idSujeto: String(item.ID_SUJETO || "").trim(),
      modulo: normalizarTexto(item.MODULO),
      recurso: normalizarTexto(item.RECURSO)
    };
  });

  return {
    codigosDuplicados: codigosDuplicados,
    nombresActivosDuplicados: nombresActivosDuplicados,
    rolesInactivosConUsuariosActivos: rolesInactivosConUsuariosActivos,
    usuariosConfigurablesSinProveedor: usuariosConfigurablesSinProveedor,
    permisosGlobalesActivos: permisosGlobalesActivos
  };
}

/**
 * Corrección Paso 20A Revisión 1.
 *
 * Restaura de forma idempotente el catálogo SEG_ROLES a partir de los códigos
 * todavía referenciados por SEG_USUARIOS y SEG_PERMISOS. No elimina ni modifica
 * permisos existentes. También garantiza SUPERADMIN y ADMIN y completa IDs o
 * trazabilidad faltante.
 *
 * @return {Object} Resultado de la reparación.
 */
function corregirRolesPermisosPaso20ARevision1() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const hojaRoles = asegurarHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD,
      CABECERAS_MOTOR_SGT360.SEG_ROLES
    );
    asegurarHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS,
      CABECERAS_MOTOR_SGT360.SEG_PERMISOS
    );

    const actor = obtenerActorTecnicoRolesMotor_();
    const ahora = new Date();
    const contextoRoles = obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD,
      ["ID_ROL", "CODIGO", "NOMBRE", "NIVEL", "ESTADO", "SISTEMA"]
    );
    const rolesExistentes = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD
    );
    const usuarios = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.USUARIOS
    );
    const permisos = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    );

    const definicionesBase = {
      SUPERADMIN: { nombre: "Superadministrador", descripcion: "Control total del sistema.", nivel: 1, sistema: true },
      ADMIN: { nombre: "Administrador", descripcion: "Administración delegada.", nivel: 10, sistema: true },
      AUDITOR: { nombre: "Auditor", descripcion: "Revisión y trazabilidad.", nivel: 20, sistema: false },
      PROVEEDOR: { nombre: "Proveedor", descripcion: "Gestión del proveedor asignado.", nivel: 30, sistema: false },
      SUPERVISOR: { nombre: "Supervisor", descripcion: "Supervisión de usuarios asignados.", nivel: 40, sistema: false },
      ASESOR: { nombre: "Asesor", descripcion: "Gestión de registros propios o asignados.", nivel: 50, sistema: false }
    };

    const codigosReferenciados = {};
    Object.keys(definicionesBase).forEach(function(codigo) {
      codigosReferenciados[codigo] = true;
    });
    rolesExistentes.forEach(function(item) {
      const codigo = normalizarTexto(item.CODIGO);
      if (codigo) codigosReferenciados[codigo] = true;
    });
    usuarios.forEach(function(item) {
      const codigo = normalizarTexto(item.ROL);
      if (codigo) codigosReferenciados[codigo] = true;
    });
    permisos.forEach(function(item) {
      if (normalizarTexto(item.TIPO_SUJETO) !== "ROL") return;
      const codigo = normalizarTexto(item.ID_SUJETO);
      if (codigo) codigosReferenciados[codigo] = true;
    });

    const rolesPorCodigo = {};
    rolesExistentes.forEach(function(item) {
      const codigo = normalizarTexto(item.CODIGO);
      if (codigo && !rolesPorCodigo[codigo]) rolesPorCodigo[codigo] = item;
    });

    let creados = 0;
    let reparados = 0;
    let idsCompletados = 0;
    const codigosCreados = [];

    Object.keys(codigosReferenciados).sort().forEach(function(codigo, indice) {
      const existente = rolesPorCodigo[codigo];
      const base = definicionesBase[codigo] || {
        nombre: convertirCodigoRolANombrePaso20AR1_(codigo),
        descripcion: "Rol recuperado desde referencias existentes de seguridad.",
        nivel: 100 + indice,
        sistema: false
      };

      if (existente) {
        let idRol = String(existente.ID_ROL || "").trim();
        if (!idRol) {
          idRol = generarIdMotor_("ROL");
          contextoRoles.hoja.getRange(
            Number(existente.__FILA),
            contextoRoles.mapa.ID_ROL + 1
          ).setValue(idRol);
          idsCompletados += 1;
        }

        const parche = {
          ID_ROL: idRol,
          CODIGO: codigo,
          NOMBRE: String(existente.NOMBRE || "").trim() || base.nombre,
          DESCRIPCION: String(existente.DESCRIPCION || "").trim() || base.descripcion,
          NIVEL: Number(existente.NIVEL) || base.nivel,
          ESTADO: normalizarTexto(existente.ESTADO) || CONFIG.ESTADOS.ACTIVO,
          SISTEMA: codigo === CONFIG.ROLES.SUPERADMIN || codigo === CONFIG.ROLES.ADMIN,
          FECHA_ACTUALIZACION: ahora,
          USUARIO_CREACION: String(existente.USUARIO_CREACION || "").trim() || actor,
          USUARIO_MODIFICACION: actor
        };
        if (!existente.FECHA_CREACION) parche.FECHA_CREACION = ahora;
        guardarObjetoMotor_(
          MOTOR_SGT360.BASES.SECURITY,
          CONFIG.HOJAS.ROLES_SEGURIDAD,
          "ID_ROL",
          parche
        );
        reparados += 1;
        return;
      }

      guardarObjetoMotor_(
        MOTOR_SGT360.BASES.SECURITY,
        CONFIG.HOJAS.ROLES_SEGURIDAD,
        "ID_ROL",
        {
          ID_ROL: generarIdMotor_("ROL"),
          CODIGO: codigo,
          NOMBRE: base.nombre,
          DESCRIPCION: base.descripcion,
          NIVEL: base.nivel,
          ESTADO: CONFIG.ESTADOS.ACTIVO,
          SISTEMA: codigo === CONFIG.ROLES.SUPERADMIN || codigo === CONFIG.ROLES.ADMIN,
          FECHA_CREACION: ahora,
          FECHA_ACTUALIZACION: ahora,
          USUARIO_CREACION: actor,
          USUARIO_MODIFICACION: actor
        }
      );
      creados += 1;
      codigosCreados.push(codigo);
    });

    SpreadsheetApp.flush();
    const rolesFinales = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.ROLES_SEGURIDAD
    ).filter(function(item) {
      return Boolean(normalizarTexto(item.CODIGO));
    });
    const permisosFinales = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    );

    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.ROLES_SEGURIDAD);

    return {
      correcto: true,
      paso: "20A-R1",
      funcion: "corregirRolesPermisosPaso20ARevision1",
      rolesDisponibles: rolesFinales.length,
      rolesCreados: creados,
      rolesReparados: reparados,
      idsRolCompletados: idsCompletados,
      codigosCreados: codigosCreados,
      permisosConservados: permisosFinales.length,
      mensaje: "El catálogo de roles fue restaurado sin eliminar ni reemplazar permisos existentes."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function convertirCodigoRolANombrePaso20AR1_(codigo) {
  return String(codigo || "")
    .toLowerCase()
    .split("_")
    .filter(function(parte) { return Boolean(parte); })
    .map(function(parte) {
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(" ") || "Rol recuperado";
}

/**
 * Migra la identidad comercial de proveedores sin modificar ID_PROVEEDOR.
 *
 * Reglas:
 * - RAZON_SOCIAL se completa desde el NOMBRE histórico cuando está vacía.
 * - NOMBRE_COMERCIAL permanece opcional.
 * - NOMBRE se conserva como campo de compatibilidad y se recalcula usando
 *   NOMBRE_COMERCIAL o RAZON_SOCIAL.
 * - Las relaciones y usuarios continúan vinculados por ID_PROVEEDOR.
 * - La función es idempotente y no elimina datos.
 */
function actualizarIdentidadComercialProveedoresPaso21A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const hoja = asegurarHojaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      CABECERAS_MOTOR_SGT360.MAE_PROVEEDORES
    );
    const resultado = migrarIdentidadComercialProveedoresPaso21A_(hoja);

    SpreadsheetApp.flush();
    invalidarCacheMotor_("ALL");
    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES
    );

    registrarEventoMotor_({
      modulo: "PROVEEDORES",
      accion: "MIGRACION_IDENTIDAD_COMERCIAL_21A",
      entidad: "PROVEEDOR",
      idEntidad: "PASO_21A",
      resultado: "OK",
      detalle: resultado
    });

    return Object.assign({
      correcto: true,
      paso: "21A",
      funcion: "actualizarIdentidadComercialProveedoresPaso21A",
      hoja: CONFIG.HOJAS.PROVEEDORES,
      mensaje:
        "La razón social y el nombre comercial fueron habilitados sin modificar los códigos internos."
    }, resultado);
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function migrarIdentidadComercialProveedoresPaso21A_(hoja) {
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 2 || ultimaColumna < 1) {
    return {
      filasLeidas: 0,
      filasActualizadas: 0,
      razonesSocialesCompletadas: 0,
      nombresCompatibilidadActualizados: 0,
      idsProveedorModificados: 0,
      idsDuplicados: [],
      filasSinId: [],
      usuariosConReferenciaInvalida: [],
      relacionesConReferenciaInvalida: []
    };
  }

  const rango = hoja.getRange(1, 1, ultimaFila, ultimaColumna);
  const valores = rango.getValues();
  const mapa = crearMapaCabeceras(valores[0]);
  validarCabeceras(
    mapa,
    ["ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "NOMBRE"],
    CONFIG.HOJAS.PROVEEDORES
  );

  let filasActualizadas = 0;
  let razonesSocialesCompletadas = 0;
  let nombresCompatibilidadActualizados = 0;
  const idsAntes = {};
  const idsProveedor = {};
  const idsDuplicados = [];
  const filasSinId = [];

  for (let i = 1; i < valores.length; i++) {
    const fila = valores[i];
    const idProveedor = String(fila[mapa.ID_PROVEEDOR] || "").trim();
    const tieneDatos = fila.some(function(valor) {
      return valor !== null && valor !== undefined &&
        String(valor).trim() !== "";
    });
    if (!tieneDatos) continue;

    idsAntes[i] = idProveedor;
    if (!idProveedor) {
      filasSinId.push(i + 1);
    } else if (idsProveedor[idProveedor]) {
      idsDuplicados.push(idProveedor);
    } else {
      idsProveedor[idProveedor] = true;
    }

    const nombreHistorico = normalizarNombreProveedorMotor_(
      fila[mapa.NOMBRE],
      200
    );
    let razonSocial = normalizarNombreProveedorMotor_(
      fila[mapa.RAZON_SOCIAL],
      200
    );
    const nombreComercial = normalizarNombreProveedorMotor_(
      fila[mapa.NOMBRE_COMERCIAL],
      180
    );

    let cambio = false;
    if (!razonSocial && nombreHistorico) {
      razonSocial = nombreHistorico;
      fila[mapa.RAZON_SOCIAL] = razonSocial;
      razonesSocialesCompletadas += 1;
      cambio = true;
    }

    const nombreCompatibilidad = resolverNombreVisualProveedorMotor_(
      razonSocial,
      nombreComercial,
      nombreHistorico
    );
    if (
      nombreCompatibilidad &&
      String(fila[mapa.NOMBRE] || "").trim() !== nombreCompatibilidad
    ) {
      fila[mapa.NOMBRE] = nombreCompatibilidad;
      nombresCompatibilidadActualizados += 1;
      cambio = true;
    }

    if (cambio) filasActualizadas += 1;
  }

  let idsProveedorModificados = 0;
  Object.keys(idsAntes).forEach(function(indice) {
    const idActual = String(
      valores[Number(indice)][mapa.ID_PROVEEDOR] || ""
    ).trim();
    if (idActual !== idsAntes[indice]) idsProveedorModificados += 1;
  });

  if (filasSinId.length || idsDuplicados.length) {
    throw new Error(
      "No se aplicó la migración. Filas sin ID_PROVEEDOR: " +
      (filasSinId.join(", ") || "ninguna") +
      ". Códigos duplicados: " +
      (idsDuplicados.join(", ") || "ninguno") + "."
    );
  }

  if (filasActualizadas) {
    const cantidadDatos = Math.max(0, valores.length - 1);
    if (cantidadDatos) {
      hoja.getRange(
        2,
        mapa.RAZON_SOCIAL + 1,
        cantidadDatos,
        1
      ).setValues(valores.slice(1).map(function(fila) {
        return [fila[mapa.RAZON_SOCIAL]];
      }));
      hoja.getRange(
        2,
        mapa.NOMBRE + 1,
        cantidadDatos,
        1
      ).setValues(valores.slice(1).map(function(fila) {
        return [fila[mapa.NOMBRE]];
      }));
    }
  }

  const usuariosConReferenciaInvalida = leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.USUARIOS
  ).filter(function(usuario) {
    const id = String(usuario.ID_PROVEEDOR || "").trim();
    return id && !idsProveedor[id];
  }).map(function(usuario) {
    return {
      idUsuario: String(usuario.ID_USUARIO || "").trim(),
      idProveedor: String(usuario.ID_PROVEEDOR || "").trim()
    };
  });

  const relacionesConReferenciaInvalida = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDOR_OFICINAS
  ).filter(function(relacion) {
    const id = String(relacion.ID_PROVEEDOR || "").trim();
    return id && !idsProveedor[id];
  }).map(function(relacion) {
    return {
      idRelacion: String(relacion.ID_RELACION || "").trim(),
      idProveedor: String(relacion.ID_PROVEEDOR || "").trim()
    };
  });

  if (idsProveedorModificados) {
    throw new Error(
      "La migración detectó una alteración inesperada de ID_PROVEEDOR y fue detenida."
    );
  }

  return {
    filasLeidas: Math.max(0, ultimaFila - 1),
    filasActualizadas: filasActualizadas,
    razonesSocialesCompletadas: razonesSocialesCompletadas,
    nombresCompatibilidadActualizados:
      nombresCompatibilidadActualizados,
    idsProveedorModificados: idsProveedorModificados,
    idsDuplicados: idsDuplicados,
    filasSinId: filasSinId,
    usuariosConReferenciaInvalida: usuariosConReferenciaInvalida,
    relacionesConReferenciaInvalida:
      relacionesConReferenciaInvalida
  };
}

/**
 * Paso 23B — Limpia el dashboard principal y sincroniza sus permisos futuros.
 *
 * No elimina permisos existentes ni modifica otros módulos.
 */
function actualizarDashboardPrincipalPaso23B() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const moduloDashboard = "DASHBOARD";
    const recursosEsperados = [{
      codigo: "VISUALIZAR_MODULO",
      nombre: "Acceder al inicio",
      tipo: "MODULO",
      padre: "",
      orden: 10
    }, {
      codigo: "VER_RESUMEN",
      nombre: "Ver indicadores principales",
      tipo: "ACCION",
      padre: "VISUALIZAR_MODULO",
      orden: 20
    }, {
      codigo: "VER_ALERTAS",
      nombre: "Ver alertas y pendientes",
      tipo: "ACCION",
      padre: "VISUALIZAR_MODULO",
      orden: 30
    }, {
      codigo: "VER_ACTIVIDAD_RECIENTE",
      nombre: "Ver actividad reciente",
      tipo: "ACCION",
      padre: "VISUALIZAR_MODULO",
      orden: 40
    }];

    const recursosAntes = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.RECURSOS_SEGURIDAD
    );
    const permisosAntes = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    );

    const firmaPermisosAntes = construirFirmaPermisosDashboardPaso23B_(permisosAntes);
    const firmaOtrosModulosAntes = construirFirmaRecursosOtrosModulosPaso23B_(
      recursosAntes,
      moduloDashboard
    );
    const recursosDashboardAntes = recursosAntes.filter(function(item) {
      return normalizarTexto(item.MODULO) === moduloDashboard;
    });
    const mapaAntes = {};

    recursosDashboardAntes.forEach(function(item) {
      const codigo = normalizarTexto(item.CODIGO);
      if (codigo && !mapaAntes[codigo]) mapaAntes[codigo] = item;
    });

    const recursosAgregados = recursosEsperados.filter(function(recurso) {
      return !mapaAntes[normalizarTexto(recurso.codigo)];
    }).map(function(recurso) {
      return normalizarTexto(recurso.codigo);
    });
    const nombresActualizados = recursosEsperados.filter(function(recurso) {
      const existente = mapaAntes[normalizarTexto(recurso.codigo)];
      return existente && String(existente.NOMBRE || "").trim() !== recurso.nombre;
    }).map(function(recurso) {
      return normalizarTexto(recurso.codigo);
    });

    sincronizarRecursosModuloMotor_(moduloDashboard, recursosEsperados);
    SpreadsheetApp.flush();

    const recursosDespues = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.RECURSOS_SEGURIDAD
    );
    const permisosDespues = leerTablaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    );
    const firmaPermisosDespues = construirFirmaPermisosDashboardPaso23B_(permisosDespues);
    const firmaOtrosModulosDespues = construirFirmaRecursosOtrosModulosPaso23B_(
      recursosDespues,
      moduloDashboard
    );

    if (firmaPermisosAntes !== firmaPermisosDespues) {
      throw new Error("La migración 23B detectó una modificación inesperada de permisos.");
    }
    if (firmaOtrosModulosAntes !== firmaOtrosModulosDespues) {
      throw new Error("La migración 23B detectó una modificación inesperada en otros módulos.");
    }

    const recursosDashboardDespues = recursosDespues.filter(function(item) {
      return normalizarTexto(item.MODULO) === moduloDashboard;
    });
    const faltantes = recursosEsperados.filter(function(recurso) {
      const codigo = normalizarTexto(recurso.codigo);
      return !recursosDashboardDespues.some(function(item) {
        return normalizarTexto(item.CODIGO) === codigo &&
          String(item.NOMBRE || "").trim() === recurso.nombre &&
          normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
      });
    }).map(function(recurso) {
      return normalizarTexto(recurso.codigo);
    });

    if (faltantes.length) {
      throw new Error(
        "No fue posible sincronizar los recursos del Dashboard: " + faltantes.join(", ") + "."
      );
    }

    const cacheSeguridad = invalidarCacheMotor_("SECURITY");
    const cacheConfiguracion = invalidarCacheMotor_("CONFIG");
    const revision = marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      CONFIG.HOJAS.RECURSOS_SEGURIDAD
    );

    return {
      correcto: true,
      paso: "23B",
      funcion: "actualizarDashboardPrincipalPaso23B",
      idempotente: true,
      recursosDashboard: recursosEsperados.map(function(recurso) {
        return normalizarTexto(recurso.codigo);
      }),
      recursosAgregados: recursosAgregados,
      nombresActualizados: nombresActualizados,
      permisosConservados: firmaPermisosAntes === firmaPermisosDespues,
      otrosModulosConservados: firmaOtrosModulosAntes === firmaOtrosModulosDespues,
      registrosEliminados: 0,
      cachesInvalidadas: Array.from(new Set(cacheSeguridad.concat(cacheConfiguracion))),
      revision: revision,
      mensaje: "El Dashboard quedó limitado a la bienvenida y sus permisos futuros fueron sincronizados."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Construye una firma estable de los permisos para comprobar que el Paso 23B
 * no crea, elimina ni modifica asignaciones existentes.
 *
 * @param {Array<Object>} permisos Registros de SEG_PERMISOS.
 * @return {string} Firma serializada y ordenada.
 * @private
 */
function construirFirmaPermisosDashboardPaso23B_(permisos) {
  return (permisos || []).map(function(item) {
    return [
      String(item.ID_PERMISO || "").trim(),
      normalizarTexto(item.TIPO_SUJETO),
      normalizarTexto(item.ID_SUJETO),
      normalizarTexto(item.MODULO),
      normalizarTexto(item.RECURSO),
      String(item.PERMITIDO === true || convertirBooleanoMotor_(item.PERMITIDO)),
      normalizarTexto(item.ALCANCE),
      normalizarTexto(item.ESTADO)
    ].join("|");
  }).sort().join("\n");
}

/**
 * Construye una firma estable de todos los recursos que no pertenecen al
 * Dashboard para garantizar el alcance aislado de la migración.
 *
 * @param {Array<Object>} recursos Registros de SEG_RECURSOS.
 * @param {string} moduloExcluido Código del módulo que sí puede actualizarse.
 * @return {string} Firma serializada y ordenada.
 * @private
 */
function construirFirmaRecursosOtrosModulosPaso23B_(recursos, moduloExcluido) {
  const excluido = normalizarTexto(moduloExcluido);
  return (recursos || []).filter(function(item) {
    return normalizarTexto(item.MODULO) !== excluido;
  }).map(function(item) {
    return [
      String(item.ID_RECURSO || "").trim(),
      normalizarTexto(item.MODULO),
      normalizarTexto(item.CODIGO),
      String(item.NOMBRE || "").trim(),
      normalizarTexto(item.TIPO),
      normalizarTexto(item.PADRE),
      Number(item.ORDEN) || 0,
      normalizarTexto(item.ESTADO)
    ].join("|");
  }).sort().join("\n");
}

/**
 * PASO 24A — Sesiones activas en Auditoría.
 *
 * Migración incremental e idempotente:
 * - sincroniza recursos visibles de ADMIN_AUDITORIA;
 * - agrega VER_SESIONES y CERRAR_SESIONES si no existen;
 * - conserva permisos existentes;
 * - no elimina registros ni modifica permisos de otros módulos;
 * - invalida cachés de seguridad.
 *
 * @return {Object} Diagnóstico de migración.
 */
function actualizarAuditoriaSesionesActivasPaso24A() {
  const antes = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD)
    .filter(function(item) {
      return normalizarTexto(item.MODULO) === "ADMIN_AUDITORIA";
    }).length;

  sincronizarRecursosModuloMotor_("ADMIN_AUDITORIA", [{
    codigo: "VISUALIZAR_MODULO", nombre: "Acceder a auditoría", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver registros de auditoría", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_SESIONES", nombre: "Ver sesiones activas", tipo: "ACCION", orden: 30
  }, {
    codigo: "CERRAR_SESIONES", nombre: "Forzar cierre de sesiones", tipo: "ACCION", orden: 40
  }, {
    codigo: "EXPORTAR", nombre: "Exportar auditoría", tipo: "ACCION", orden: 50
  }]);

  invalidarCacheMotor_("SECURITY");
  invalidarCacheMotor_("CONFIG");

  const recursos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD)
    .filter(function(item) {
      return normalizarTexto(item.MODULO) === "ADMIN_AUDITORIA" &&
        normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    }).map(function(item) {
      return {
        codigo: normalizarTexto(item.CODIGO),
        nombre: String(item.NOMBRE || "").trim(),
        tipo: normalizarTexto(item.TIPO),
        orden: Number(item.ORDEN) || 999
      };
    }).sort(function(a, b) {
      return a.orden - b.orden;
    });

  return {
    correcto: true,
    paso: "24A",
    modulo: "ADMIN_AUDITORIA",
    recursosAntes: antes,
    recursosActivos: recursos.length,
    recursos: recursos,
    permisosConservados: true,
    instaladorEjecutado: false,
    mensaje: "Sesiones activas quedó disponible dentro de Auditoría. Ejecuta esta migración una sola vez; es idempotente."
  };
}



/**
 * Paso 24B — Expiración automática de sesiones.
 *
 * Incremental e idempotente:
 * - registra el recurso de limpieza de sesiones expiradas;
 * - conserva permisos existentes;
 * - crea un único disparador horario para cerrar sesiones vencidas;
 * - no ejecuta instalarMotorSGT360().
 *
 * @return {Object} Diagnóstico de migración.
 */
function actualizarExpiracionAutomaticaSesionesPaso24B() {
  const modulo = "ADMIN_AUDITORIA";
  const recursosAntes = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD)
    .filter(function(item) {
      return normalizarTexto(item.MODULO) === modulo;
    }).length;

  sincronizarRecursosModuloMotor_(modulo, [{
    codigo: "VISUALIZAR_MODULO", nombre: "Acceder a auditoría", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_LISTADO", nombre: "Ver registros de auditoría", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_SESIONES", nombre: "Ver sesiones activas", tipo: "ACCION", orden: 30
  }, {
    codigo: "CERRAR_SESIONES", nombre: "Forzar cierre de sesiones", tipo: "ACCION", orden: 40
  }, {
    codigo: "LIMPIAR_SESIONES_EXPIRADAS", nombre: "Limpiar sesiones expiradas", tipo: "ACCION", orden: 45
  }, {
    codigo: "EXPORTAR", nombre: "Exportar auditoría", tipo: "ACCION", orden: 50
  }]);

  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS, "CLAVE", {
    CLAVE: "SESSION_AUTO_EXPIRE_ENABLED",
    VALOR: "TRUE",
    DESCRIPCION: "Activa la expiración automática de sesiones vencidas mediante disparador horario.",
    TIPO: "BOOLEAN",
    EDITABLE: false,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: new Date()
  });

  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.PARAMETROS, "CLAVE", {
    CLAVE: "SESSION_AUTO_EXPIRE_INTERVAL_HOURS",
    VALOR: "1",
    DESCRIPCION: "Intervalo configurado para revisar y expirar sesiones vencidas.",
    TIPO: "NUMBER",
    EDITABLE: false,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: new Date()
  });

  const disparador = instalarDisparadorExpiracionSesionesPaso24B_();
  invalidarCacheMotor_("SECURITY");
  invalidarCacheMotor_("CONFIG");

  const recursos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD)
    .filter(function(item) {
      return normalizarTexto(item.MODULO) === modulo &&
        normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
    }).map(function(item) {
      return {
        codigo: normalizarTexto(item.CODIGO),
        nombre: String(item.NOMBRE || "").trim(),
        tipo: normalizarTexto(item.TIPO),
        orden: Number(item.ORDEN) || 999
      };
    }).sort(function(a, b) {
      return a.orden - b.orden;
    });

  return {
    correcto: true,
    paso: "24B",
    modulo: modulo,
    recursosAntes: recursosAntes,
    recursosActivos: recursos.length,
    recursos: recursos,
    permisosConservados: true,
    disparador: disparador,
    instaladorEjecutado: false,
    mensaje: "Expiración automática de sesiones configurada cada 1 hora."
  };
}

/**
 * Reinstala el disparador horario de expiración para garantizar intervalo de 1 hora.
 * @return {Object}
 * @private
 */
function instalarDisparadorExpiracionSesionesPaso24B_() {
  const handler = "cerrarSesionesExpiradasAutomaticamente";
  const existentes = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === handler;
  });

  existentes.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  const nuevo = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(1)
    .create();

  return {
    correcto: true,
    handler: handler,
    intervaloHoras: 1,
    disparadoresPreviosEliminados: existentes.length,
    disparadoresActivos: contarDisparadoresPorFuncionPaso24B_(handler),
    idDisparador: typeof nuevo.getUniqueId === "function" ? nuevo.getUniqueId() : ""
  };
}

/**
 * Diagnostica el disparador horario de expiración de sesiones.
 * @return {Object}
 */
function diagnosticarDisparadorExpiracionSesionesPaso24B() {
  const handler = "cerrarSesionesExpiradasAutomaticamente";
  return {
    correcto: contarDisparadoresPorFuncionPaso24B_(handler) === 1,
    paso: "24B",
    handler: handler,
    disparadoresActivos: contarDisparadoresPorFuncionPaso24B_(handler),
    intervaloEsperadoHoras: 1,
    mensaje: "Debe existir un único disparador temporal para la función de expiración automática."
  };
}

/** @private */
function contarDisparadoresPorFuncionPaso24B_(handler) {
  return ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === handler;
  }).length;
}


/**
 * Ejecutar manualmente una sola vez para autorizar UrlFetchApp.
 */
function autorizarUrlFetchSGT360() {
  const url = "https://www.googleapis.com/oauth2/v3/certs";

  const respuesta = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true
  });

  console.log({
    codigoHttp: respuesta.getResponseCode(),
    mensaje: "UrlFetchApp autorizado correctamente."
  });

  return respuesta.getResponseCode();
}


function autorizarServiciosSGT360() {
  const propiedades = PropertiesService.getScriptProperties();

  const idBase =
    propiedades.getProperty("SGT360_DB_CONFIG_ID") ||
    propiedades.getProperty("SGT360_DB_SECURITY_ID") ||
    propiedades.getProperty("SGT360_DB_OPERATION_ID");

  if (!idBase) {
    throw new Error(
      "No se encontró una base configurada en las Propiedades del script."
    );
  }

  // Google Sheets
  const libro = SpreadsheetApp.openById(idBase);
  console.log("Base autorizada: " + libro.getName());

  // Google Drive
  console.log("Carpeta raíz: " + DriveApp.getRootFolder().getName());

  // Solicitudes externas
  const respuesta = UrlFetchApp.fetch(
    "https://www.googleapis.com/generate_204",
    {
      muteHttpExceptions: true
    }
  );
  console.log("UrlFetchApp: HTTP " + respuesta.getResponseCode());

  // Correo, sin enviar ningún mensaje
  console.log(
    "Cuota de correo disponible: " +
    MailApp.getRemainingDailyQuota()
  );

  return {
    correcto: true,
    base: libro.getName(),
    mensaje: "Servicios de SGT360 autorizados."
  };
}
