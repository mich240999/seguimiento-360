/**
 * SGT360 — Motor transversal de importaciones masivas
 *
 * Responsabilidad:
 * Implementa el flujo estándar de previsualización, validación, descarga de
 * observaciones y aprobación atómica para proveedores, oficinas, grupos y
 * relaciones proveedor-oficina.
 *
 * Reglas:
 * - La previsualización nunca escribe en Sheets.
 * - La aprobación exige un token temporal vinculado al usuario, archivo,
 *   tipo de importación y revisión de datos.
 * - Si existe al menos un error, ninguna fila puede aprobarse.
 * - Antes de escribir se vuelve a validar todo el archivo bajo bloqueo.
 * - Las funciones terminadas en "_" son internas.
 */

const IMPORTACION_MASIVA_SGT360 = Object.freeze({
  TTL_TOKEN_SEGUNDOS: 1800,
  MAXIMO_FILAS: 5000,
  MAXIMO_BYTES: 5 * 1024 * 1024,
  PREFIJO_TOKEN: "IMP"
});

/**
 * Previsualiza una importación de estructura comercial desde Administración.
 */
function previsualizarImportacionAsignacionAdminMotor(tipo, contenidoCsv, metadatos) {
  const usuario = obtenerUsuarioActual();
  return previsualizarImportacionMasivaInterna_(
    tipo,
    contenidoCsv,
    metadatos,
    usuario,
    "ADMIN_ESTRUCTURA"
  );
}

/**
 * Aprueba una importación de estructura comercial desde Administración.
 */
function aprobarImportacionAsignacionAdminMotor(tipo, token, contenidoCsv, metadatos) {
  const usuario = obtenerUsuarioActual();
  return aprobarImportacionMasivaInterna_(
    tipo,
    token,
    contenidoCsv,
    metadatos,
    usuario,
    "ADMIN_ESTRUCTURA"
  );
}

/**
 * Previsualiza una importación desde el módulo especializado PROVEEDORES.
 */
function previsualizarImportacionProveedoresModulo(contenidoCsv, metadatos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("IMPORTAR", usuario);
  validarAlcanceGlobalProveedorMotor_("IMPORTAR", usuario);
  return previsualizarImportacionMasivaInterna_(
    "PROVEEDORES",
    contenidoCsv,
    metadatos,
    usuario,
    PROVEEDORES_MODULO_SGT360.CODIGO
  );
}

/**
 * Aprueba una importación desde el módulo especializado PROVEEDORES.
 */
function aprobarImportacionProveedoresModulo(token, contenidoCsv, metadatos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("IMPORTAR", usuario);
  validarAlcanceGlobalProveedorMotor_("IMPORTAR", usuario);
  return aprobarImportacionMasivaInterna_(
    "PROVEEDORES",
    token,
    contenidoCsv,
    metadatos,
    usuario,
    PROVEEDORES_MODULO_SGT360.CODIGO
  );
}

/** @private */
function previsualizarImportacionMasivaInterna_(
  tipo,
  contenidoCsv,
  metadatos,
  usuario,
  origen
) {
  const especificacion = obtenerEspecificacionImportacionAsignacionMotor_(tipo);
  const archivo = normalizarMetadatosImportacionMasiva_(metadatos);
  let analisis;

  try {
    if (especificacion.tipo === "PROVEEDORES") {
      validarEstructuraIdentidadProveedorMotor_();
      const registrosProveedor = parsearCsvProveedoresMotor_(contenidoCsv);
      analisis = analizarImportacionProveedoresMasiva_(registrosProveedor);
    } else {
      const parseado = parsearCsvAsignacionMotor_(contenidoCsv, especificacion);
      analisis = analizarImportacionAsignacionMasiva_(
        especificacion,
        parseado.registros
      );
    }
  } catch (errorEstructura) {
    return construirResultadoErrorImportacionMasiva_(
      especificacion,
      archivo,
      errorEstructura
    );
  }

  const resultado = construirResultadoPrevisualizacionImportacionMasiva_(
    especificacion,
    archivo,
    analisis.filas
  );

  if (resultado.resumen.aprobable) {
    resultado.token = crearTokenImportacionMasiva_(
      especificacion.tipo,
      contenidoCsv,
      usuario,
      origen,
      resultado.revision
    );
  }

  registrarEventoMotor_({
    modulo: origen,
    accion: "PREVISUALIZAR_IMPORTACION_" + especificacion.tipo,
    entidad: especificacion.entidad,
    idEntidad: archivo.nombre || "CARGA_CSV",
    resultado: resultado.resumen.errores ? "CON_ERRORES" : "OK",
    detalle: {
      filasLeidas: resultado.resumen.filasLeidas,
      crear: resultado.resumen.crear,
      actualizar: resultado.resumen.actualizar,
      sinCambios: resultado.resumen.sinCambios,
      filasConError: resultado.resumen.filasConError,
      errores: resultado.resumen.errores,
      advertencias: resultado.resumen.advertencias
    }
  });

  return resultado;
}

/** @private */
function aprobarImportacionMasivaInterna_(
  tipo,
  token,
  contenidoCsv,
  metadatos,
  usuario,
  origen
) {
  const especificacion = obtenerEspecificacionImportacionAsignacionMotor_(tipo);
  const archivo = normalizarMetadatosImportacionMasiva_(metadatos);
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    validarTokenImportacionMasiva_(
      token,
      especificacion.tipo,
      contenidoCsv,
      usuario,
      origen
    );

    let analisis;
    if (especificacion.tipo === "PROVEEDORES") {
      validarEstructuraIdentidadProveedorMotor_();
      const registrosProveedor = parsearCsvProveedoresMotor_(contenidoCsv);
      analisis = analizarImportacionProveedoresMasiva_(registrosProveedor);
    } else {
      const parseado = parsearCsvAsignacionMotor_(contenidoCsv, especificacion);
      analisis = analizarImportacionAsignacionMasiva_(
        especificacion,
        parseado.registros
      );
    }

    const resumen = resumirFilasImportacionMasiva_(analisis.filas);
    if (resumen.errores > 0) {
      throw new Error(
        "Los datos cambiaron o el archivo contiene errores. " +
        "Vuelve a ejecutar la previsualización antes de aprobar."
      );
    }
    if (resumen.crear + resumen.actualizar < 1) {
      throw new Error("No existen cambios para aplicar.");
    }

    let resultado;
    if (especificacion.tipo === "PROVEEDORES") {
      const preparados = asignarIdsNuevosProveedoresImportacionMasiva_(
        analisis.registros
      );
      resultado = aplicarImportacionProveedoresMotor_(
        preparados.registros,
        usuario
      );
      resultado.registrosGenerados = preparados.generados;
    } else {
      resultado = aplicarImportacionAsignacionMotor_(
        especificacion,
        analisis.registros,
        usuario
      );
      resultado.registrosGenerados = [];
    }

    const respaldo = especificacion.tipo === "PROVEEDORES" ?
      guardarRespaldoProveedoresMotor_(contenidoCsv, archivo.nombre) :
      guardarRespaldoImportacionAsignacionMotor_(
        especificacion,
        contenidoCsv,
        archivo.nombre
      );

    consumirTokenImportacionMasiva_(token);

    registrarEventoMotor_({
      modulo: origen,
      accion: "APROBAR_IMPORTACION_" + especificacion.tipo,
      entidad: especificacion.entidad,
      idEntidad: respaldo.nombre || archivo.nombre || "CARGA_CSV",
      resultado: "OK",
      detalle: {
        filasLeidas: resultado.filasLeidas,
        creados: resultado.creados,
        actualizados: resultado.actualizados,
        sinCambios: resultado.sinCambios,
        registrosGenerados: resultado.registrosGenerados || [],
        cambiosRazonSocial: Number(resultado.cambiosRazonSocial || 0),
        cambiosNombreComercial: Number(resultado.cambiosNombreComercial || 0),
        cambiosCodigoSap: Number(resultado.cambiosCodigoSap || 0),
        cambiosRuc: Number(resultado.cambiosRuc || 0),
        respaldoGuardado: respaldo.guardado
      }
    });

    return Object.assign({
      correcto: true,
      tipo: especificacion.tipo,
      archivo: archivo.nombre,
      respaldo: respaldo,
      mensaje: "La importación fue aprobada y aplicada completamente."
    }, resultado);
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function normalizarMetadatosImportacionMasiva_(metadatos) {
  const datos = metadatos && typeof metadatos === "object" ? metadatos : {};
  return {
    nombre: limpiarTextoMotor_(datos.nombre || "carga.csv", 240),
    tamano: Math.max(0, Number(datos.tamano) || 0),
    tipoMime: limpiarTextoMotor_(datos.tipoMime || "text/csv", 120)
  };
}

/** @private */
function construirResultadoErrorImportacionMasiva_(
  especificacion,
  archivo,
  error
) {
  const mensaje = error && error.message ? error.message : String(error);
  return {
    correcto: true,
    tipo: especificacion.tipo,
    entidad: especificacion.entidad,
    nombrePlural: especificacion.nombrePlural,
    archivo: archivo,
    token: "",
    revision: obtenerRevisionDatosMotor_(),
    venceEnSegundos: 0,
    resumen: {
      filasLeidas: 0,
      crear: 0,
      actualizar: 0,
      sinCambios: 0,
      filasConError: 1,
      errores: 1,
      advertencias: 0,
      aprobable: false
    },
    filas: [{
      linea: 1,
      accion: "ERROR",
      accionBase: "",
      clave: "ARCHIVO",
      etiqueta: archivo.nombre || "Archivo CSV",
      entrada: {},
      actual: {},
      propuesto: {},
      cambios: [],
      errores: [{
        codigo: "ESTRUCTURA_CSV",
        campo: "ARCHIVO",
        mensaje: mensaje,
        sugerencia: "Corrige el archivo y vuelve a ejecutar la validación."
      }],
      advertencias: []
    }]
  };
}

/** @private */
function construirResultadoPrevisualizacionImportacionMasiva_(
  especificacion,
  archivo,
  filas
) {
  const resumen = resumirFilasImportacionMasiva_(filas);
  return {
    correcto: true,
    tipo: especificacion.tipo,
    entidad: especificacion.entidad,
    nombrePlural: especificacion.nombrePlural,
    archivo: archivo,
    token: "",
    revision: obtenerRevisionDatosMotor_(),
    venceEnSegundos: IMPORTACION_MASIVA_SGT360.TTL_TOKEN_SEGUNDOS,
    resumen: resumen,
    filas: filas
  };
}

/** @private */
function resumirFilasImportacionMasiva_(filas) {
  const lista = Array.isArray(filas) ? filas : [];
  const resumen = {
    filasLeidas: lista.length,
    crear: 0,
    actualizar: 0,
    sinCambios: 0,
    filasConError: 0,
    errores: 0,
    advertencias: 0,
    aprobable: false
  };

  lista.forEach(function(fila) {
    if (fila.accion === "CREAR") resumen.crear += 1;
    if (fila.accion === "ACTUALIZAR") resumen.actualizar += 1;
    if (fila.accion === "SIN_CAMBIOS") resumen.sinCambios += 1;
    if (Array.isArray(fila.errores) && fila.errores.length) {
      resumen.filasConError += 1;
      resumen.errores += fila.errores.length;
    }
    if (Array.isArray(fila.advertencias)) {
      resumen.advertencias += fila.advertencias.length;
    }
  });

  resumen.aprobable = resumen.errores === 0 &&
    (resumen.crear + resumen.actualizar > 0);
  return resumen;
}

/** @private */
function analizarImportacionAsignacionMasiva_(especificacion, registros) {
  const proveedores = {};
  listarProveedoresAdminMotor_().forEach(function(item) {
    proveedores[item.idProveedor] = item;
  });
  const oficinas = {};
  listarOficinasAdminMotor_().forEach(function(item) {
    oficinas[item.idOficina] = item;
  });
  const grupos = {};
  listarGruposAdminMotor_().forEach(function(item) {
    grupos[item.idGrupo] = item;
  });
  const relaciones = {};
  listarRelacionesProveedorOficinaAdminMotor_().forEach(function(item) {
    relaciones[item.idProveedor + "__" + item.idOficina] = item;
  });

  const dependencias = construirDependenciasImportacionMasiva_(
    oficinas,
    grupos,
    relaciones
  );
  const campos = obtenerCamposImportacionMasiva_(especificacion.tipo);
  const filas = [];
  const vistos = {};

  registros.forEach(function(registro) {
    const fila = crearFilaImportacionMasiva_(
      registro.__linea,
      copiarEntradaImportacionMasiva_(registro, especificacion.cabecerasPermitidas)
    );
    let normalizado = null;
    let existente = null;

    if (especificacion.tipo === "OFICINAS") {
      normalizado = normalizarFilaOficinaImportacionMasiva_(
        registro,
        fila
      );
      existente = normalizado.idOficina ?
        (oficinas[normalizado.idOficina] || null) : null;
      fila.clave = normalizado.idOficina || "LÍNEA_" + fila.linea;
      fila.etiqueta = normalizado.nombre || fila.clave;

      if (
        existente &&
        normalizado.estado === CONFIG.ESTADOS.INACTIVO &&
        existente.estado !== CONFIG.ESTADOS.INACTIVO
      ) {
        if (
          dependencias.gruposPorOficina[normalizado.idOficina] ||
          dependencias.relacionesPorOficina[normalizado.idOficina] ||
          dependencias.usuariosPorOficina[normalizado.idOficina]
        ) {
          agregarErrorImportacionMasiva_(
            fila,
            "OFICINA_CON_DEPENDENCIAS",
            "ESTADO",
            "No se puede inactivar la oficina porque tiene grupos, proveedores o usuarios activos.",
            "Inactiva o reasigna primero las dependencias activas."
          );
        }
      }
      fila.actual = existente ? {
        ID_OFICINA: existente.idOficina,
        NOMBRE: existente.nombre,
        DESCRIPCION: existente.descripcion,
        ESTADO: existente.estado
      } : {};
      fila.propuesto = {
        ID_OFICINA: normalizado.idOficina,
        NOMBRE: normalizado.nombre,
        DESCRIPCION: normalizado.descripcion,
        ESTADO: normalizado.estado
      };
    }

    if (especificacion.tipo === "GRUPOS") {
      normalizado = normalizarFilaGrupoImportacionMasiva_(
        registro,
        fila
      );
      existente = normalizado.idGrupo ?
        (grupos[normalizado.idGrupo] || null) : null;
      fila.clave = normalizado.idGrupo || "LÍNEA_" + fila.linea;
      fila.etiqueta = normalizado.nombre || fila.clave;

      const oficina = oficinas[normalizado.idOficina];
      if (
        normalizado.idOficina &&
        (!oficina || oficina.estado !== CONFIG.ESTADOS.ACTIVO)
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "OFICINA_NO_DISPONIBLE",
          "ID_OFICINA",
          "La oficina " + normalizado.idOficina +
            " no existe o está inactiva.",
          "Usa el código interno de una oficina activa."
        );
      }
      const usuariosAsignados = dependencias.usuariosPorGrupo[
        normalizado.idGrupo
      ] || 0;
      if (
        existente &&
        existente.idOficina !== normalizado.idOficina &&
        usuariosAsignados > 0
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "GRUPO_ASIGNADO",
          "ID_OFICINA",
          "No se puede cambiar la oficina del grupo porque está asignado a usuarios activos.",
          "Reasigna primero a los usuarios activos."
        );
      }
      if (
        existente &&
        normalizado.estado === CONFIG.ESTADOS.INACTIVO &&
        existente.estado !== CONFIG.ESTADOS.INACTIVO &&
        usuariosAsignados > 0
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "GRUPO_CON_USUARIOS",
          "ESTADO",
          "No se puede inactivar el grupo porque está asignado a usuarios activos.",
          "Reasigna primero a los usuarios activos."
        );
      }
      fila.actual = existente ? {
        ID_GRUPO: existente.idGrupo,
        ID_OFICINA: existente.idOficina,
        NOMBRE: existente.nombre,
        DESCRIPCION: existente.descripcion,
        ESTADO: existente.estado
      } : {};
      fila.propuesto = {
        ID_GRUPO: normalizado.idGrupo,
        ID_OFICINA: normalizado.idOficina,
        NOMBRE: normalizado.nombre,
        DESCRIPCION: normalizado.descripcion,
        ESTADO: normalizado.estado
      };
    }

    if (especificacion.tipo === "PROVEEDOR_OFICINAS") {
      normalizado = normalizarFilaRelacionImportacionMasiva_(
        registro,
        fila
      );
      const claveRelacion = normalizado.idProveedor + "__" +
        normalizado.idOficina;
      existente = normalizado.idProveedor && normalizado.idOficina ?
        (relaciones[claveRelacion] || null) : null;
      fila.clave = normalizado.idProveedor && normalizado.idOficina ?
        claveRelacion : "LÍNEA_" + fila.linea;
      fila.etiqueta = [
        normalizado.idProveedor,
        normalizado.idOficina
      ].filter(Boolean).join(" → ") || fila.clave;

      if (
        normalizado.idProveedor &&
        !proveedores[normalizado.idProveedor]
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "PROVEEDOR_NO_EXISTE",
          "ID_PROVEEDOR",
          "El proveedor " + normalizado.idProveedor + " no existe.",
          "Usa un código interno generado por la aplicación."
        );
      }
      const oficinaRelacion = oficinas[normalizado.idOficina];
      if (
        normalizado.idOficina &&
        (!oficinaRelacion ||
          oficinaRelacion.estado !== CONFIG.ESTADOS.ACTIVO)
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "OFICINA_NO_DISPONIBLE",
          "ID_OFICINA",
          "La oficina " + normalizado.idOficina +
            " no existe o está inactiva.",
          "Usa el código interno de una oficina activa."
        );
      }
      if (
        existente &&
        normalizado.estado === CONFIG.ESTADOS.INACTIVO &&
        existente.estado !== CONFIG.ESTADOS.INACTIVO &&
        (dependencias.usuariosPorProveedorOficina[claveRelacion] || 0) > 0
      ) {
        agregarErrorImportacionMasiva_(
          fila,
          "RELACION_CON_USUARIOS",
          "ESTADO",
          "No se puede retirar la oficina del proveedor porque hay usuarios activos asignados.",
          "Reasigna primero a los usuarios activos."
        );
      }
      fila.actual = existente ? {
        ID_PROVEEDOR: existente.idProveedor,
        ID_OFICINA: existente.idOficina,
        ESTADO: existente.estado
      } : {};
      fila.propuesto = {
        ID_PROVEEDOR: normalizado.idProveedor,
        ID_OFICINA: normalizado.idOficina,
        ESTADO: normalizado.estado
      };
    }

    if (normalizado && normalizado.claveValidacion) {
      if (vistos[normalizado.claveValidacion]) {
        agregarErrorImportacionMasiva_(
          fila,
          "CLAVE_REPETIDA",
          especificacion.clave,
          "La clave está repetida dentro del archivo.",
          "Conserva una sola fila por código interno o relación."
        );
        agregarErrorImportacionMasiva_(
          vistos[normalizado.claveValidacion],
          "CLAVE_REPETIDA",
          especificacion.clave,
          "La clave está repetida dentro del archivo.",
          "Conserva una sola fila por código interno o relación."
        );
      } else {
        vistos[normalizado.claveValidacion] = fila;
      }
    }

    fila.cambios = construirCambiosImportacionMasiva_(
      campos,
      fila.actual,
      fila.propuesto
    );
    fila.accionBase = !existente ? "CREAR" :
      (fila.cambios.length ? "ACTUALIZAR" : "SIN_CAMBIOS");
    fila.accion = fila.errores.length ? "ERROR" : fila.accionBase;
    fila.__normalizado = normalizado;
    filas.push(fila);
  });

  filas.forEach(function(fila) {
    fila.accion = fila.errores.length ? "ERROR" : fila.accionBase;
  });

  const aplicables = filas.filter(function(fila) {
    return !fila.errores.length &&
      (fila.accionBase === "CREAR" ||
        fila.accionBase === "ACTUALIZAR" ||
        fila.accionBase === "SIN_CAMBIOS");
  }).map(function(fila) {
    return fila.__normalizado;
  });

  filas.forEach(function(fila) {
    delete fila.__normalizado;
  });

  return {
    filas: filas,
    registros: aplicables
  };
}

/** @private */
function analizarImportacionProveedoresMasiva_(registros) {
  const existentes = {};
  construirVistaProveedoresMotor_().forEach(function(item) {
    existentes[item.idProveedor] = item;
  });

  const campos = obtenerCamposImportacionMasiva_("PROVEEDORES");
  const dependencias = construirDependenciasImportacionMasiva_({}, {}, {});
  const filas = [];
  const vistos = {};
  const filasPorClaveFinal = {};
  const finales = {};

  Object.keys(existentes).forEach(function(id) {
    const item = existentes[id];
    finales[id] = {
      idProveedor: id,
      razonSocial: item.razonSocial,
      nombreComercial: item.nombreComercial,
      nombreMostrar: item.nombreMostrar,
      codigoSap: item.codigoSap,
      ruc: item.ruc,
      descripcion: item.descripcion,
      estado: item.estado,
      idsOficina: item.idsOficina || [],
      idsGrupo: item.idsGrupo || [],
      canalesTexto: item.canalesTexto || "",
      gruposTexto: item.gruposTexto || "",
      cantidadOficinas: Number(item.cantidadOficinas || 0)
    };
  });

  registros.forEach(function(registro) {
    const fila = crearFilaImportacionMasiva_(
      registro.__linea,
      copiarEntradaImportacionMasiva_(
        registro,
        PROVEEDORES_MODULO_SGT360.CABECERAS_CSV
      )
    );
    const normalizado = normalizarFilaProveedorImportacionMasiva_(
      registro,
      fila,
      existentes
    );
    const claveFinal = normalizado.idProveedor ||
      "__NUEVO_LINEA_" + fila.linea;
    const existente = normalizado.idProveedor ?
      (existentes[normalizado.idProveedor] || null) : null;

    fila.clave = normalizado.idProveedor ||
      "CÓDIGO_PENDIENTE_LÍNEA_" + fila.linea;
    fila.etiqueta = normalizado.nombreMostrar ||
      normalizado.razonSocial ||
      fila.clave;

    if (normalizado.idProveedor) {
      if (vistos[normalizado.idProveedor]) {
        agregarErrorImportacionMasiva_(
          fila,
          "ID_REPETIDO",
          "ID_PROVEEDOR",
          "El código interno está repetido dentro del archivo.",
          "Conserva una sola fila por proveedor."
        );
        agregarErrorImportacionMasiva_(
          vistos[normalizado.idProveedor],
          "ID_REPETIDO",
          "ID_PROVEEDOR",
          "El código interno está repetido dentro del archivo.",
          "Conserva una sola fila por proveedor."
        );
      } else {
        vistos[normalizado.idProveedor] = fila;
      }
    }

    // Proveedor activo sin oficina es válido: la oficina solo se usa cuando tiene canal de ventas.

    if (
      existente &&
      existente.estado === CONFIG.ESTADOS.ACTIVO &&
      normalizado.estado === CONFIG.ESTADOS.INACTIVO
    ) {
      const usuarios = dependencias.usuariosPorProveedor[
        normalizado.idProveedor
      ] || 0;
      if (usuarios > 0) {
        agregarErrorImportacionMasiva_(
          fila,
          "PROVEEDOR_CON_USUARIOS",
          "ESTADO",
          "No se puede inactivar el proveedor porque tiene usuarios activos.",
          "Reasigna primero a los usuarios activos."
        );
      }
    }

    fila.actual = existente ? {
      RAZON_SOCIAL: existente.razonSocial,
      NOMBRE_COMERCIAL: existente.nombreComercial,
      CODIGO_SAP: existente.codigoSap,
      RUC: existente.ruc,
      DESCRIPCION: existente.descripcion,
      CODIGO_CANALES_VENTA: existente.canalesTexto || "",
      CODIGO_GRUPOS_VENDEDORES: existente.gruposTexto || ""
    } : {};
    fila.propuesto = {
      RAZON_SOCIAL: normalizado.razonSocial,
      NOMBRE_COMERCIAL: normalizado.nombreComercial,
      CODIGO_SAP: normalizado.codigoSap,
      RUC: normalizado.ruc,
      DESCRIPCION: normalizado.descripcion,
      CODIGO_CANALES_VENTA: normalizado.canalesTexto || "",
      CODIGO_GRUPOS_VENDEDORES: normalizado.gruposTexto || ""
    };

    fila.cambios = construirCambiosImportacionMasiva_(
      campos,
      fila.actual,
      fila.propuesto
    );
    fila.accionBase = !existente ? "CREAR" :
      (fila.cambios.length ? "ACTUALIZAR" : "SIN_CAMBIOS");
    fila.accion = fila.errores.length ? "ERROR" : fila.accionBase;
    fila.__normalizado = normalizado;
    filas.push(fila);

    finales[claveFinal] = {
      idProveedor: normalizado.idProveedor,
      razonSocial: normalizado.razonSocial,
      nombreComercial: normalizado.nombreComercial,
      nombreMostrar: normalizado.nombreMostrar,
      codigoSap: normalizado.codigoSap,
      ruc: normalizado.ruc,
      descripcion: normalizado.descripcion,
      estado: normalizado.estado,
      idsOficina: normalizado.idsOficina || [],
      idsGrupo: normalizado.idsGrupo || [],
      canalesTexto: normalizado.canalesTexto || "",
      gruposTexto: normalizado.gruposTexto || "",
      cantidadOficinas: normalizado.idsOficina ? normalizado.idsOficina.length : 0
    };
    filasPorClaveFinal[claveFinal] = fila;
  });

  validarDuplicadosComercialesImportacionMasiva_(
    finales,
    filasPorClaveFinal
  );

  filas.forEach(function(fila) {
    fila.accion = fila.errores.length ? "ERROR" : fila.accionBase;
  });

  const aplicables = filas.filter(function(fila) {
    return !fila.errores.length;
  }).map(function(fila) {
    return fila.__normalizado;
  });

  filas.forEach(function(fila) {
    delete fila.__normalizado;
  });

  return {
    filas: filas,
    registros: aplicables
  };
}

/** @private */
function normalizarFilaOficinaImportacionMasiva_(registro, fila) {
  let idOficina = "";
  try {
    idOficina = normalizarIdMaestroMotor_(
      registro.ID_OFICINA,
      "ID de oficina"
    );
  } catch (errorId) {
    agregarErrorImportacionMasiva_(
      fila,
      "ID_INVALIDO",
      "ID_OFICINA",
      errorId.message,
      "Usa el código interno de la oficina."
    );
  }

  const nombre = limpiarTextoMotor_(registro.NOMBRE, 180);
  if (!nombre) {
    agregarErrorImportacionMasiva_(
      fila,
      "NOMBRE_OBLIGATORIO",
      "NOMBRE",
      "El nombre es obligatorio.",
      "Completa el nombre de la oficina."
    );
  }

  const estado = normalizarEstadoImportacionMasiva_(
    registro.ESTADO,
    fila
  );
  return {
    claveValidacion: idOficina,
    clave: idOficina,
    idOficina: idOficina,
    nombre: nombre,
    descripcion: limpiarTextoMotor_(registro.DESCRIPCION, 500),
    estado: estado
  };
}

/** @private */
function normalizarFilaGrupoImportacionMasiva_(registro, fila) {
  let idGrupo = "";
  let idOficina = "";
  try {
    idGrupo = normalizarIdMaestroMotor_(
      registro.ID_GRUPO,
      "ID de grupo"
    );
  } catch (errorId) {
    agregarErrorImportacionMasiva_(
      fila,
      "ID_INVALIDO",
      "ID_GRUPO",
      errorId.message,
      "Usa el código interno del grupo."
    );
  }
  try {
    idOficina = normalizarIdMaestroMotor_(
      registro.ID_OFICINA,
      "ID de oficina"
    );
  } catch (errorOficina) {
    agregarErrorImportacionMasiva_(
      fila,
      "OFICINA_INVALIDA",
      "ID_OFICINA",
      errorOficina.message,
      "Usa el código interno de una oficina."
    );
  }

  const nombre = limpiarTextoMotor_(registro.NOMBRE, 180);
  if (!nombre) {
    agregarErrorImportacionMasiva_(
      fila,
      "NOMBRE_OBLIGATORIO",
      "NOMBRE",
      "El nombre es obligatorio.",
      "Completa el nombre del grupo."
    );
  }

  return {
    claveValidacion: idGrupo,
    clave: idGrupo,
    idGrupo: idGrupo,
    idOficina: idOficina,
    nombre: nombre,
    descripcion: limpiarTextoMotor_(registro.DESCRIPCION, 500),
    estado: normalizarEstadoImportacionMasiva_(
      registro.ESTADO,
      fila
    )
  };
}

/** @private */
function normalizarFilaRelacionImportacionMasiva_(registro, fila) {
  let idProveedor = "";
  let idOficina = "";
  try {
    idProveedor = normalizarIdMaestroMotor_(
      registro.ID_PROVEEDOR,
      "ID de proveedor"
    );
  } catch (errorProveedor) {
    agregarErrorImportacionMasiva_(
      fila,
      "PROVEEDOR_INVALIDO",
      "ID_PROVEEDOR",
      errorProveedor.message,
      "Usa el código interno generado por la aplicación."
    );
  }
  try {
    idOficina = normalizarIdMaestroMotor_(
      registro.ID_OFICINA,
      "ID de oficina"
    );
  } catch (errorOficina) {
    agregarErrorImportacionMasiva_(
      fila,
      "OFICINA_INVALIDA",
      "ID_OFICINA",
      errorOficina.message,
      "Usa el código interno de una oficina."
    );
  }

  return {
    claveValidacion: idProveedor && idOficina ?
      idProveedor + "__" + idOficina : "",
    clave: idProveedor && idOficina ?
      idProveedor + "__" + idOficina : "",
    idProveedor: idProveedor,
    idOficina: idOficina,
    estado: normalizarEstadoImportacionMasiva_(
      registro.ESTADO,
      fila
    )
  };
}

/** @private */
function normalizarFilaProveedorImportacionMasiva_(
  registro,
  fila,
  existentes
) {
  const razonSocial = normalizarNombreProveedorMotor_(
    registro.RAZON_SOCIAL,
    200
  );
  const nombreComercial = normalizarNombreProveedorMotor_(
    registro.NOMBRE_COMERCIAL,
    180
  );
  if (!razonSocial) {
    agregarErrorImportacionMasiva_(
      fila,
      "RAZON_SOCIAL_OBLIGATORIA",
      "RAZON_SOCIAL",
      "La razón social es obligatoria.",
      "Completa la razón social legal del proveedor."
    );
  }

  let codigoSap = "";
  let ruc = "";
  try {
    codigoSap = normalizarCodigoSapProveedorMotor_(
      registro.CODIGO_SAP
    );
  } catch (errorSap) {
    agregarErrorImportacionMasiva_(
      fila,
      "CODIGO_SAP_INVALIDO",
      "CODIGO_SAP",
      errorSap.message,
      "Usa únicamente caracteres alfanuméricos o deja el campo vacío."
    );
  }
  try {
    ruc = normalizarRucProveedorMotor_(registro.RUC);
  } catch (errorRuc) {
    agregarErrorImportacionMasiva_(
      fila,
      "RUC_INVALIDO",
      "RUC",
      errorRuc.message,
      "Usa 11 dígitos o deja el campo vacío."
    );
  }

  let asignacion = { idsOficina: [], idsGrupo: [], canalesTexto: "", gruposTexto: "", alcanceGrupos: "SIN_CANAL" };
  try {
    asignacion = normalizarAsignacionProveedorImportacionPaso27R_(registro);
  } catch (errorAsignacion) {
    agregarErrorImportacionMasiva_(
      fila,
      "ASIGNACION_CANAL_INVALIDA",
      "CODIGO_CANALES_VENTA",
      errorAsignacion.message,
      "Usa códigos internos de oficinas y grupos activos. Separa varios valores con |."
    );
  }

  let idProveedor = "";
  try {
    idProveedor = resolverIdProveedorExistenteImportacionPaso27R_(
      registro.ID_PROVEEDOR,
      codigoSap,
      ruc,
      existentes
    );
  } catch (errorId) {
    agregarErrorImportacionMasiva_(
      fila,
      "IDENTIDAD_PROVEEDOR_INVALIDA",
      "CODIGO_SAP",
      errorId.message,
      "No incluyas ID_PROVEEDOR para proveedores nuevos. Usa CODIGO_SAP o RUC para reconocer proveedores existentes."
    );
  }

  const nombreMostrar = resolverNombreVisualProveedorMotor_(
    razonSocial,
    nombreComercial,
    ""
  );

  return {
    claveValidacion: idProveedor || (codigoSap ? "SAP:" + codigoSap : (ruc ? "RUC:" + ruc : "LINEA:" + fila.linea)),
    clave: idProveedor,
    idProveedor: idProveedor,
    razonSocial: razonSocial,
    nombreComercial: nombreComercial,
    nombre: nombreMostrar,
    nombreMostrar: nombreMostrar,
    codigoSap: codigoSap,
    ruc: ruc,
    descripcion: limpiarTextoMotor_(registro.DESCRIPCION, 1000),
    estado: CONFIG.ESTADOS.ACTIVO,
    idsOficina: asignacion.idsOficina,
    idsGrupo: asignacion.idsGrupo,
    canalesTexto: asignacion.canalesTexto,
    gruposTexto: asignacion.gruposTexto,
    alcanceGrupos: asignacion.alcanceGrupos,
    asignacionCanalesInformada: true,
    existente: idProveedor ? (existentes[idProveedor] || null) : null,
    linea: fila.linea,
    idGenerado: !idProveedor
  };
}

/** @private */
function normalizarEstadoImportacionMasiva_(
  valor,
  fila,
  usarPredeterminado
) {
  const texto = String(valor || "").trim();
  const estado = normalizarTexto(
    texto || (usarPredeterminado === false ? "" : CONFIG.ESTADOS.ACTIVO)
  );
  if (
    [CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO]
      .indexOf(estado) === -1
  ) {
    agregarErrorImportacionMasiva_(
      fila,
      "ESTADO_INVALIDO",
      "ESTADO",
      "ESTADO debe ser ACTIVO o INACTIVO.",
      "Corrige el valor de la columna ESTADO."
    );
  }
  return estado;
}

/** @private */
function validarDuplicadosComercialesImportacionMasiva_(
  finales,
  filasPorClave
) {
  const sap = {};
  const ruc = {};

  Object.keys(finales).forEach(function(clave) {
    const item = finales[clave];
    const codigoSap = String(item.codigoSap || "").trim().toUpperCase();
    const numeroRuc = String(item.ruc || "").trim();

    if (codigoSap) {
      if (sap[codigoSap] && sap[codigoSap] !== clave) {
        registrarDuplicadoComercialImportacionMasiva_(
          "CODIGO_SAP",
          codigoSap,
          sap[codigoSap],
          clave,
          filasPorClave
        );
      } else {
        sap[codigoSap] = clave;
      }
    }

    if (numeroRuc) {
      if (ruc[numeroRuc] && ruc[numeroRuc] !== clave) {
        registrarDuplicadoComercialImportacionMasiva_(
          "RUC",
          numeroRuc,
          ruc[numeroRuc],
          clave,
          filasPorClave
        );
      } else {
        ruc[numeroRuc] = clave;
      }
    }
  });
}

/** @private */
function registrarDuplicadoComercialImportacionMasiva_(
  campo,
  valor,
  primeraClave,
  segundaClave,
  filasPorClave
) {
  const mensaje = campo === "RUC" ?
    "El RUC " + valor + " quedaría duplicado." :
    "El código SAP " + valor + " quedaría duplicado.";
  const sugerencia = "Cada valor debe pertenecer a un solo proveedor.";
  const primera = filasPorClave[primeraClave];
  const segunda = filasPorClave[segundaClave];

  if (primera) {
    agregarErrorImportacionMasiva_(
      primera,
      campo + "_DUPLICADO",
      campo,
      mensaje,
      sugerencia
    );
  }
  if (segunda) {
    agregarErrorImportacionMasiva_(
      segunda,
      campo + "_DUPLICADO",
      campo,
      mensaje,
      sugerencia
    );
  }
}

/** @private */
function construirDependenciasImportacionMasiva_(
  oficinas,
  grupos,
  relaciones
) {
  const resultado = {
    gruposPorOficina: {},
    relacionesPorOficina: {},
    usuariosPorOficina: {},
    usuariosPorGrupo: {},
    usuariosPorProveedor: {},
    usuariosPorProveedorOficina: {}
  };

  Object.keys(grupos).forEach(function(id) {
    const item = grupos[id];
    if (item.estado === CONFIG.ESTADOS.ACTIVO) {
      resultado.gruposPorOficina[item.idOficina] =
        (resultado.gruposPorOficina[item.idOficina] || 0) + 1;
    }
  });

  Object.keys(relaciones).forEach(function(clave) {
    const item = relaciones[clave];
    if (item.estado === CONFIG.ESTADOS.ACTIVO) {
      resultado.relacionesPorOficina[item.idOficina] =
        (resultado.relacionesPorOficina[item.idOficina] || 0) + 1;
    }
  });

  leerTablaMotor_(
    MOTOR_SGT360.BASES.SECURITY,
    CONFIG.HOJAS.USUARIOS
  ).forEach(function(item) {
    if (normalizarTexto(item.ESTADO) !== CONFIG.ESTADOS.ACTIVO) return;
    const idProveedor = String(item.ID_PROVEEDOR || "").trim();
    const idOficina = String(item.ID_OFICINA || "").trim();
    const idGrupo = String(item.ID_GRUPO || "").trim();

    if (idProveedor) {
      resultado.usuariosPorProveedor[idProveedor] =
        (resultado.usuariosPorProveedor[idProveedor] || 0) + 1;
    }
    if (idOficina) {
      resultado.usuariosPorOficina[idOficina] =
        (resultado.usuariosPorOficina[idOficina] || 0) + 1;
    }
    if (idGrupo) {
      resultado.usuariosPorGrupo[idGrupo] =
        (resultado.usuariosPorGrupo[idGrupo] || 0) + 1;
    }
    if (idProveedor && idOficina) {
      const clave = idProveedor + "__" + idOficina;
      resultado.usuariosPorProveedorOficina[clave] =
        (resultado.usuariosPorProveedorOficina[clave] || 0) + 1;
    }
  });

  return resultado;
}

/** @private */
function obtenerCamposImportacionMasiva_(tipo) {
  const campos = {
    PROVEEDORES: [
      { campo: "RAZON_SOCIAL", etiqueta: "Razón social" },
      { campo: "NOMBRE_COMERCIAL", etiqueta: "Nombre comercial" },
      { campo: "CODIGO_SAP", etiqueta: "Código SAP" },
      { campo: "RUC", etiqueta: "RUC" },
      { campo: "DESCRIPCION", etiqueta: "Descripción" },
      { campo: "CODIGO_CANALES_VENTA", etiqueta: "Canales de venta" },
      { campo: "CODIGO_GRUPOS_VENDEDORES", etiqueta: "Grupos de vendedores" }
    ],
    OFICINAS: [
      { campo: "ID_OFICINA", etiqueta: "Código interno" },
      { campo: "NOMBRE", etiqueta: "Nombre" },
      { campo: "DESCRIPCION", etiqueta: "Descripción" },
      { campo: "ESTADO", etiqueta: "Estado" }
    ],
    GRUPOS: [
      { campo: "ID_GRUPO", etiqueta: "Código interno" },
      { campo: "ID_OFICINA", etiqueta: "Oficina" },
      { campo: "NOMBRE", etiqueta: "Nombre" },
      { campo: "DESCRIPCION", etiqueta: "Descripción" },
      { campo: "ESTADO", etiqueta: "Estado" }
    ],
    PROVEEDOR_OFICINAS: [
      { campo: "ID_PROVEEDOR", etiqueta: "Proveedor" },
      { campo: "ID_OFICINA", etiqueta: "Oficina" },
      { campo: "ESTADO", etiqueta: "Estado" }
    ]
  };
  return campos[normalizarTexto(tipo)] || [];
}

/** @private */
function construirCambiosImportacionMasiva_(
  campos,
  actual,
  propuesto
) {
  const cambios = [];
  (campos || []).forEach(function(definicion) {
    const campo = definicion.campo;
    const valorActual = actual && actual[campo] !== undefined ?
      actual[campo] : "";
    const valorPropuesto = propuesto && propuesto[campo] !== undefined ?
      propuesto[campo] : "";

    if (String(valorActual || "") !== String(valorPropuesto || "")) {
      cambios.push({
        campo: campo,
        etiqueta: definicion.etiqueta,
        actual: valorActual,
        propuesto: valorPropuesto
      });
    }
  });
  return cambios;
}

/** @private */
function crearFilaImportacionMasiva_(linea, entrada) {
  return {
    linea: Number(linea) || 0,
    accion: "",
    accionBase: "",
    clave: "",
    etiqueta: "",
    entrada: entrada || {},
    actual: {},
    propuesto: {},
    cambios: [],
    errores: [],
    advertencias: []
  };
}

/** @private */
function agregarErrorImportacionMasiva_(
  fila,
  codigo,
  campo,
  mensaje,
  sugerencia
) {
  if (!fila || !Array.isArray(fila.errores)) return;
  const codigoSeguro = normalizarTexto(codigo || "VALIDACION");
  const campoSeguro = normalizarTexto(campo || "");
  const mensajeSeguro = String(mensaje || "Dato no válido.");
  const existe = fila.errores.some(function(item) {
    return item.codigo === codigoSeguro &&
      item.campo === campoSeguro &&
      item.mensaje === mensajeSeguro;
  });
  if (existe) return;
  fila.errores.push({
    codigo: codigoSeguro,
    campo: campoSeguro,
    mensaje: mensajeSeguro,
    sugerencia: String(sugerencia || "")
  });
}

/** @private */
function copiarEntradaImportacionMasiva_(registro, cabeceras) {
  const salida = {};
  (cabeceras || []).forEach(function(campo) {
    salida[campo] = String(registro[campo] || "");
  });
  return salida;
}

/** @private */
function asignarIdsNuevosProveedoresImportacionMasiva_(registros) {
  const usados = {};
  listarProveedoresAdminMotor_().forEach(function(item) {
    usados[item.idProveedor] = true;
  });
  const generados = [];

  const preparados = (registros || []).map(function(registro) {
    const copia = Object.assign({}, registro);
    if (!copia.idProveedor) {
      let id = "";
      do {
        id = generarCodigoProveedorCortoUnicoPaso27O_();
      } while (usados[id]);
      usados[id] = true;
      copia.idProveedor = id;
      copia.idGenerado = true;
      generados.push({
        linea: copia.linea,
        idProveedor: id,
        razonSocial: copia.razonSocial,
        nombreComercial: copia.nombreComercial,
        nombreMostrar: copia.nombreMostrar
      });
    }
    return copia;
  });

  return {
    registros: preparados,
    generados: generados
  };
}

/** @private */
function crearTokenImportacionMasiva_(
  tipo,
  contenidoCsv,
  usuario,
  origen,
  revision
) {
  const token = IMPORTACION_MASIVA_SGT360.PREFIJO_TOKEN + "-" +
    Utilities.getUuid().toUpperCase();
  const metadatos = {
    token: token,
    tipo: normalizarTexto(tipo),
    origen: normalizarTexto(origen),
    idUsuario: String(usuario.idUsuario || "").trim(),
    correo: normalizarCorreo(usuario.correo),
    huella: calcularHuellaImportacionMasiva_(contenidoCsv),
    revision: String(revision || ""),
    fechaCreacion: new Date().toISOString()
  };
  const guardado = guardarCacheJsonMotor_(
    construirClaveTokenImportacionMasiva_(token),
    metadatos,
    IMPORTACION_MASIVA_SGT360.TTL_TOKEN_SEGUNDOS
  );
  if (!guardado) {
    throw new Error(
      "No fue posible preparar la aprobación temporal. " +
      "Vuelve a validar el archivo."
    );
  }
  return token;
}

/** @private */
function validarTokenImportacionMasiva_(
  token,
  tipo,
  contenidoCsv,
  usuario,
  origen
) {
  const codigo = String(token || "").trim();
  if (!codigo) {
    throw new Error("La previsualización no contiene un token de aprobación.");
  }

  const datos = obtenerCacheJsonMotor_(
    construirClaveTokenImportacionMasiva_(codigo)
  );
  if (!datos) {
    throw new Error(
      "La previsualización expiró o ya fue utilizada. " +
      "Vuelve a validar el archivo."
    );
  }

  const idUsuario = String(usuario.idUsuario || "").trim();
  const correo = normalizarCorreo(usuario.correo);
  if (
    String(datos.idUsuario || "") !== idUsuario ||
    normalizarCorreo(datos.correo) !== correo
  ) {
    throw new Error("La aprobación pertenece a otro usuario.");
  }
  if (normalizarTexto(datos.tipo) !== normalizarTexto(tipo)) {
    throw new Error("El token no corresponde al tipo de importación.");
  }
  if (normalizarTexto(datos.origen) !== normalizarTexto(origen)) {
    throw new Error("El token no corresponde al módulo actual.");
  }
  if (
    String(datos.huella || "") !==
    calcularHuellaImportacionMasiva_(contenidoCsv)
  ) {
    throw new Error(
      "El archivo cambió después de la previsualización. " +
      "Vuelve a validarlo."
    );
  }
  if (
    String(datos.revision || "") !==
    String(obtenerRevisionDatosMotor_() || "")
  ) {
    throw new Error(
      "Los datos fueron modificados después de la previsualización. " +
      "Vuelve a validar antes de aprobar."
    );
  }
  return datos;
}

/** @private */
function consumirTokenImportacionMasiva_(token) {
  eliminarCacheMotor_(construirClaveTokenImportacionMasiva_(token));
}

/** @private */
function construirClaveTokenImportacionMasiva_(token) {
  return construirClaveCacheMotor_(
    "IMPORTACION_MASIVA_TOKEN",
    String(token || "").trim()
  );
}

/** @private */
function calcularHuellaImportacionMasiva_(contenidoCsv) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.newBlob(String(contenidoCsv || ""), "text/plain").getBytes()
  );
  return bytes.map(function(valor) {
    const numero = valor < 0 ? valor + 256 : valor;
    return ("0" + numero.toString(16)).slice(-2);
  }).join("");
}
