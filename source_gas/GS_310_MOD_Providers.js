/**
 * SGT360 — Módulo especializado de proveedores
 *
 * Responsabilidad:
 * Administra MAE_PROVEEDORES y REL_PROVEEDOR_OFICINAS sin crear maestros
 * paralelos. La relación con oficina representa canal de ventas y es opcional:
 * un proveedor puede estar activo sin oficina cuando solo provee y no vende.
 * Aplica permisos, alcances, validaciones duplicadas, carga atómica,
 * exportación y auditoría funcional.
 */

const PROVEEDORES_MODULO_SGT360 = Object.freeze({
  CODIGO: "PROVEEDORES",
  MAXIMO_IMPORTACION: 5000,
  MAXIMO_BYTES_CSV: 5 * 1024 * 1024,
  // Plantilla oficial para carga masiva. No incluye ID_PROVEEDOR ni ESTADO:
  // el ID lo genera la herramienta y el estado se crea como ACTIVO.
  CABECERAS_CSV: Object.freeze([
    "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "CODIGO_SAP", "RUC",
    "DESCRIPCION", "ALCANCE_CATALOGO",
    "CODIGO_CANALES_VENTA", "CODIGO_GRUPOS_VENDEDORES"
  ]),
  // Cabeceras aceptadas por compatibilidad. ID_PROVEEDOR y ESTADO no se
  // descargan en la plantilla; si llegan en un archivo legado se validan, pero
  // el estado se fuerza a ACTIVO.
  CABECERAS_CSV_PERMITIDAS: Object.freeze([
    "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "CODIGO_SAP", "RUC",
    "DESCRIPCION", "ALCANCE_CATALOGO",
    "CODIGO_CANALES_VENTA", "CODIGO_GRUPOS_VENDEDORES",
    "CANALES_VENTA", "GRUPOS_VENDEDORES", "ID_OFICINAS", "IDS_OFICINA",
    "ID_GRUPOS", "IDS_GRUPO", "ID_PROVEEDOR", "ESTADO"
  ]),
  CABECERAS_EXPORTACION_CSV: Object.freeze([
    "ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL",
    "CODIGO_SAP", "RUC", "DESCRIPCION", "ALCANCE_CATALOGO", "ESTADO"
  ])
});


/**
 * Paso 27O — Normaliza códigos internos de proveedores.
 *
 * Mantiene el campo funcional ID_PROVEEDOR, pero lo reescribe a un código
 * visible corto de 10 caracteres alfanuméricos, sin guiones ni símbolos,
 * actualizando sus relaciones en las bases CONFIG, SECURITY y OPERATION.
 * Ejecutar una sola vez después de reemplazar los archivos del Paso 27O.
 */
function actualizarModuloProveedoresPaso27O() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const resultado = normalizarCodigosProveedoresPaso27O_();
    invalidarCacheMotor_("ALL");
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27O",
      mensaje: "Proveedores actualizados. Los códigos internos usan 10 caracteres alfanuméricos sin separadores.",
      resultado: resultado
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Reescribe ID_PROVEEDOR y actualiza todas las referencias conocidas.
 * @private
 */
function normalizarCodigosProveedoresPaso27O_() {
  const contexto = obtenerContextoTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDORES,
    ["ID_PROVEEDOR", "RAZON_SOCIAL"]
  );
  const ultimaFila = contexto.hoja.getLastRow();
  if (ultimaFila < 2) {
    return {
      proveedoresLeidos: 0,
      codigosActualizados: 0,
      referenciasActualizadas: {},
      mensaje: "No hay proveedores registrados."
    };
  }

  const rango = contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas);
  const filas = rango.getValues();
  const indiceId = contexto.mapa.ID_PROVEEDOR;
  const indiceFechaActualizacion = contexto.mapa.FECHA_ACTUALIZACION;
  const indiceUsuarioActualizacion = contexto.mapa.ID_USUARIO_ACTUALIZACION;
  const usuario = typeof obtenerUsuarioActual === "function" ? obtenerUsuarioActual() : {};
  const ahora = new Date();
  const usados = {};

  filas.forEach(function(fila) {
    const actual = normalizarCodigoProveedorCortoPaso27O_(fila[indiceId]);
    if (/^[A-Z0-9]{10}$/.test(actual)) usados[actual] = true;
  });

  const mapa = {};
  let cambios = 0;
  filas.forEach(function(fila) {
    const original = String(fila[indiceId] || "").trim();
    const actual = normalizarCodigoProveedorCortoPaso27O_(original);
    if (/^[A-Z0-9]{10}$/.test(actual) && original === actual) {
      return;
    }
    const nuevo = generarCodigoProveedorCortoDesdeSetPaso27O_(usados);
    usados[nuevo] = true;
    if (original) mapa[original] = nuevo;
    if (actual && actual !== original) mapa[actual] = nuevo;
    fila[indiceId] = nuevo;
    if (typeof indiceFechaActualizacion === "number") fila[indiceFechaActualizacion] = ahora;
    if (typeof indiceUsuarioActualizacion === "number") fila[indiceUsuarioActualizacion] = usuario.idUsuario || "";
    cambios++;
  });

  if (cambios > 0) {
    rango.setValues(filas);
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES);
  }

  const referencias = Object.keys(mapa).length ?
    actualizarReferenciasProveedorPaso27O_(mapa) : {};

  return {
    proveedoresLeidos: filas.length,
    codigosActualizados: cambios,
    referenciasActualizadas: referencias,
    longitud: 10,
    patron: "^[A-Z0-9]{10}$",
    mensaje: cambios ?
      "Códigos internos de proveedores normalizados." :
      "Los proveedores ya cumplían el patrón corto."
  };
}

/**
 * Actualiza columnas de referencia proveedor en todas las bases configuradas.
 * @private
 */
function actualizarReferenciasProveedorPaso27O_(mapa) {
  const resumen = {};
  const aliases = [
    MOTOR_SGT360.BASES.CONFIG,
    MOTOR_SGT360.BASES.SECURITY,
    MOTOR_SGT360.BASES.OPERATION
  ];
  const librosVisitados = {};

  aliases.forEach(function(alias) {
    let libro = null;
    try {
      libro = obtenerLibroMotor_(alias);
    } catch (errorLibro) {
      resumen[alias] = { error: errorLibro.message };
      return;
    }
    const idLibro = libro.getId();
    if (librosVisitados[idLibro]) return;
    librosVisitados[idLibro] = true;

    libro.getSheets().forEach(function(hoja) {
      const ultimaFila = hoja.getLastRow();
      const ultimaColumna = hoja.getLastColumn();
      if (ultimaFila < 2 || ultimaColumna < 1) return;
      const cabeceras = hoja.getRange(1, 1, 1, ultimaColumna).getDisplayValues()[0];
      const columnas = [];
      cabeceras.forEach(function(cabecera, indice) {
        if (esCabeceraReferenciaProveedorPaso27O_(cabecera)) columnas.push(indice);
      });
      if (!columnas.length) return;

      const rango = hoja.getRange(2, 1, ultimaFila - 1, ultimaColumna);
      const valores = rango.getValues();
      let cambios = 0;
      valores.forEach(function(fila) {
        columnas.forEach(function(indiceColumna) {
          const actual = String(fila[indiceColumna] || "").trim();
          const nuevo = mapa[actual] || mapa[normalizarCodigoProveedorCortoPaso27O_(actual)] || "";
          if (nuevo && nuevo !== actual) {
            fila[indiceColumna] = nuevo;
            cambios++;
          }
        });
      });
      if (cambios > 0) {
        rango.setValues(valores);
        const nombreHoja = hoja.getName();
        resumen[nombreHoja] = (resumen[nombreHoja] || 0) + cambios;
        marcarRevisionDatosMotor_(obtenerAliasHojaMotor_(nombreHoja), nombreHoja);
      }
    });
  });
  return resumen;
}

/** @private */
function esCabeceraReferenciaProveedorPaso27O_(cabecera) {
  const clave = normalizarTexto(cabecera || "");
  return clave === "ID_PROVEEDOR" ||
    clave === "ID_PROVEEDOR_PRECIO" ||
    clave === "ID_PROVEEDOR_CONFIRMACION_ABONO" ||
    clave.indexOf("ID_PROVEEDOR_") === 0;
}

/**
 * Genera un código interno de proveedor de 10 caracteres alfanuméricos.
 * @private
 */
function generarCodigoProveedorCortoUnicoPaso27O_() {
  const usados = {};
  try {
    obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      ["ID_PROVEEDOR"]
    );
    leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES).forEach(function(item) {
      const codigo = normalizarCodigoProveedorCortoPaso27O_(item.ID_PROVEEDOR);
      if (codigo) usados[codigo] = true;
    });
  } catch (error) {
    // Si la hoja aún no existe, se genera de todas formas.
  }
  return generarCodigoProveedorCortoDesdeSetPaso27O_(usados);
}

/** @private */
function generarCodigoProveedorCortoDesdeSetPaso27O_(usados) {
  usados = usados || {};
  let codigo = "";
  let intentos = 0;
  do {
    const tiempo = new Date().getTime().toString(36).toUpperCase();
    const uuid = Utilities.getUuid().replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const semilla = (tiempo.slice(-4) + uuid).replace(/[^A-Z0-9]/g, "");
    codigo = ("PV" + semilla).slice(0, 10);
    intentos++;
  } while (usados[codigo] && intentos < 50);
  if (usados[codigo]) {
    throw new Error("No fue posible generar un código corto único de proveedor. Intenta nuevamente.");
  }
  return codigo;
}

/** @private */
function normalizarCodigoProveedorCortoPaso27O_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


/**
 * Paso 27P — Habilita la selección de grupos de vendedores por proveedor.
 *
 * Agrega las columnas IDS_GRUPO y ALCANCE_GRUPOS en REL_PROVEEDOR_OFICINAS.
 * Las relaciones existentes quedan con alcance TODOS, por lo que mantienen
 * acceso a todos los grupos de las oficinas que ya tenían asignadas.
 */
function actualizarModuloProveedoresPaso27P() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraRelacionProveedorGruposPaso27P_();
    const contexto = obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDOR_OFICINAS,
      ["ID_RELACION", "ID_PROVEEDOR", "ID_OFICINA", "ESTADO", "ALCANCE_GRUPOS", "IDS_GRUPO"]
    );
    const ultimaFila = contexto.hoja.getLastRow();
    let normalizadas = 0;
    if (ultimaFila >= 2) {
      const rango = contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas);
      const filas = rango.getValues();
      filas.forEach(function(fila) {
        const alcanceActual = normalizarTexto(fila[contexto.mapa.ALCANCE_GRUPOS] || "");
        if (!alcanceActual) {
          fila[contexto.mapa.ALCANCE_GRUPOS] = "TODOS";
          normalizadas += 1;
        }
      });
      if (normalizadas > 0) rango.setValues(filas);
    }
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDOR_OFICINAS);
    invalidarCacheMotor_("ALL");
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27P",
      relacionesNormalizadas: normalizadas,
      mensaje: "Relaciones proveedor-oficina preparadas para grupos de vendedores. Sin selección de grupos equivale a todos."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/** Lista proveedores respetando permisos, alcance, buscador y estado. */
/**
 * Paso 27R — Actualiza plantilla masiva de proveedores.
 *
 * La carga masiva ya no solicita ID_PROVEEDOR ni ESTADO. El proveedor queda
 * ACTIVO y el ID lo genera la herramienta. Los canales y grupos se informan con
 * CODIGO_CANALES_VENTA y CODIGO_GRUPOS_VENDEDORES.
 */
function actualizarModuloProveedoresPaso27R() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraRelacionProveedorGruposPaso27P_();
    invalidarCacheMotor_("ALL");
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27R",
      mensaje: "Plantilla masiva de proveedores actualizada: ID y estado son automáticos; canales y grupos se cargan por códigos."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function listarProveedoresModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("VER_LISTADO", usuario);
  filtros = filtros || {};

  let registros = construirVistaProveedoresMotor_();
  registros = filtrarProveedoresPorAlcanceMotor_(
    registros,
    "VER_LISTADO",
    usuario
  );

  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  const idProveedorUsuario = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  if (!texto && estado === "TODOS" && !idProveedorUsuario) {
    throw new Error("Aplica al menos un filtro antes de exportar proveedores.");
  }
  if (texto) {
    registros = registros.filter(function(item) {
      return [
        item.idProveedor,
        item.codigoInterno,
        item.razonSocial,
        item.nombreComercial,
        item.nombreMostrar,
        item.nombre,
        item.codigoSap,
        item.ruc
      ].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  if (estado && estado !== "TODOS") {
    registros = registros.filter(function(item) {
      return item.estado === estado;
    });
  }

  registros.sort(function(a, b) {
    return compararTextoMotor_(a.nombreMostrar, b.nombreMostrar) ||
      compararTextoMotor_(a.razonSocial, b.razonSocial) ||
      compararTextoMotor_(a.idProveedor, b.idProveedor);
  });

  const paginado = paginarArregloMotor_(
    registros,
    filtros.pagina,
    filtros.tamano
  );
  paginado.registros = paginado.registros.map(function(item) {
    return {
      idProveedor: item.idProveedor,
      codigoInterno: item.idProveedor,
      razonSocial: item.razonSocial,
      nombreComercial: item.nombreComercial,
      nombre: item.nombreMostrar,
      nombreMostrar: item.nombreMostrar,
      codigoSap: item.codigoSap,
      ruc: item.ruc,
      alcanceCatalogo: item.alcanceCatalogo,
      estado: item.estado,
      tieneCanalVentas: item.tieneCanalVentas,
      canalVentas: item.canalVentas,
      cantidadOficinas: item.cantidadOficinas,
      cantidadGrupos: item.cantidadGrupos,
      fechaModificacion: item.fechaModificacion
    };
  });
  paginado.resumen = {
    total: registros.length,
    activos: registros.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).length,
    inactivos: registros.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.INACTIVO;
    }).length,
    conCanalVentas: registros.filter(function(item) {
      return item.tieneCanalVentas === true;
    }).length,
    sinCanalVentas: registros.filter(function(item) {
      return item.tieneCanalVentas !== true;
    }).length
  };
  return paginado;
}

/** Obtiene el detalle completo y las relaciones derivadas de un proveedor. */
function obtenerDetalleProveedorModulo(idProveedor) {
  const usuario = obtenerUsuarioActual();
  const recursoAcceso = tienePermisoProveedorMotor_("VER_DETALLE", usuario) ?
    "VER_DETALLE" : "EDITAR";
  exigirPermisoProveedorMotor_(recursoAcceso, usuario);
  const id = normalizarIdMaestroMotor_(idProveedor, "ID de proveedor");
  const proveedor = construirVistaProveedoresMotor_().find(function(item) {
    return item.idProveedor === id;
  });
  if (!proveedor) throw new Error("No se encontró el proveedor solicitado.");
  validarAccesoProveedorMotor_(proveedor, recursoAcceso, usuario);
  return completarDetalleProveedorMotor_(proveedor);
}

/** Entrega oficinas activas para el formulario de creación o edición. */
function obtenerOpcionesProveedorModulo() {
  const usuario = obtenerUsuarioActual();
  if (!["VER_DETALLE", "CREAR", "EDITAR"].some(function(recurso) {
    return tienePermisoProveedorMotor_(recurso, usuario);
  })) {
    throw new Error("No tienes permiso para consultar las opciones del formulario.");
  }

  const claveCache = construirClaveCacheMotor_(
    "OPCIONES_FORMULARIO_PROVEEDORES",
    obtenerRevisionDatosMotor_()
  );
  const opciones = obtenerOConstruirCacheMotor_(claveCache, function() {
    const oficinas = listarOficinasAdminMotor_().filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).map(function(item) {
      return {
        idOficina: item.idOficina,
        nombre: item.nombre,
        descripcion: item.descripcion
      };
    });
    const mapaOficinas = {};
    oficinas.forEach(function(oficina) {
      mapaOficinas[oficina.idOficina] = oficina;
    });
    const grupos = listarGruposAdminMotor_().filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO && mapaOficinas[item.idOficina];
    }).map(function(item) {
      return {
        idGrupo: item.idGrupo,
        idOficina: item.idOficina,
        nombre: item.nombre,
        descripcion: item.descripcion,
        nombreOficina: mapaOficinas[item.idOficina] ? mapaOficinas[item.idOficina].nombre : item.idOficina
      };
    });
    return { oficinas: oficinas, grupos: grupos };
  }, 600);

  return {
    oficinas: opciones.oficinas || [],
    grupos: opciones.grupos || [],
    revision: obtenerRevisionDatosMotor_()
  };
}

/** Crea o actualiza un proveedor y sincroniza sus oficinas. */
function guardarProveedorModulo(datos) {
  datos = datos || {};
  const usuario = obtenerUsuarioActual();
  const idRecibido = String(datos.idProveedor || "").trim();
  const esNuevo = !idRecibido;
  exigirPermisoProveedorMotor_(esNuevo ? "CREAR" : "EDITAR", usuario);
  validarAlcanceEscrituraProveedorMotor_(
    esNuevo ? "CREAR" : "EDITAR",
    idRecibido,
    usuario
  );

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    validarEstructuraIdentidadProveedorMotor_();
    const idProveedor = esNuevo ? generarCodigoProveedorCortoUnicoPaso27O_() :
      normalizarIdMaestroMotor_(idRecibido, "código interno del proveedor");
    const existente = buscarProveedorCompletoMotor_(idProveedor);

    if (!esNuevo && !existente) {
      throw new Error("No se encontró el proveedor que deseas editar.");
    }
    if (esNuevo && existente) {
      throw new Error(
        "El código interno generado ya existe. Intenta nuevamente."
      );
    }

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
    const codigoSap = normalizarCodigoSapProveedorMotor_(datos.codigoSap);
    const ruc = normalizarRucProveedorMotor_(datos.ruc);
    const descripcion = limpiarTextoMotor_(datos.descripcion, 1000);

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

    const estado = normalizarTexto(
      datos.estado || CONFIG.ESTADOS.ACTIVO
    );
    const idsOficina = normalizarListaIdsMotor_(
      datos.idsOficina,
      "ID de oficina"
    );
    const idsGrupo = normalizarListaIdsMotor_(
      datos.idsGrupo,
      "ID de grupo"
    );
    const gruposPorOficina = construirGruposSeleccionadosProveedorPaso27P_(
      idsOficina,
      idsGrupo
    );

    if (!razonSocial) throw new Error("La razón social es obligatoria.");
    if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
      throw new Error("El estado del proveedor debe ser ACTIVO o INACTIVO.");
    }

    validarUnicidadProveedorMotor_(idProveedor, codigoSap, ruc);
    validarOficinasProveedorMotor_(estado, idsOficina);
    validarGruposProveedorPaso27P_(estado, idsOficina, idsGrupo);
    if (existente) {
      validarRetiroOficinasProveedorMotor_(idProveedor, idsOficina);
    }
    if (
      existente &&
      existente.estado === CONFIG.ESTADOS.ACTIVO &&
      estado === CONFIG.ESTADOS.INACTIVO
    ) {
      validarProveedorSinDependenciasActivasMotor_(idProveedor);
    }

    const ahora = new Date();
    const objeto = {
      ID_PROVEEDOR: idProveedor,
      RAZON_SOCIAL: razonSocial,
      NOMBRE_COMERCIAL: nombreComercial,
      NOMBRE: nombreMostrar,
      CODIGO_SAP: codigoSap,
      RUC: ruc,
      DESCRIPCION: descripcion,
      ALCANCE_CATALOGO: alcanceCatalogo,
      ESTADO: estado,
      FECHA_MODIFICACION: ahora,
      USUARIO_MODIFICACION: usuario.idUsuario,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    };
    if (!existente) {
      objeto.FECHA_CREACION = ahora;
      objeto.USUARIO_CREACION = usuario.idUsuario;
    }

    const oficinasAnteriores = existente ?
      listarIdsOficinaProveedorMotor_(idProveedor) : [];

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES,
      "ID_PROVEEDOR",
      objeto
    );
    sincronizarOficinasProveedorMotor_(
      idProveedor,
      idsOficina,
      usuario.idUsuario,
      { idsGrupoPorOficina: gruposPorOficina }
    );
    SpreadsheetApp.flush();

    auditarGuardadoProveedorMotor_(
      existente,
      objeto,
      oficinasAnteriores,
      idsOficina
    );

    return completarDetalleProveedorMotor_(
      construirVistaProveedoresMotor_().find(function(item) {
        return item.idProveedor === idProveedor;
      })
    );
  } finally {
    bloqueo.releaseLock();
  }
}

/** Activa o inactiva un proveedor respetando relaciones y dependencias. */
function cambiarEstadoProveedorModulo(idProveedor, nuevoEstado) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("CAMBIAR_ESTADO", usuario);
  const id = normalizarIdMaestroMotor_(idProveedor, "ID de proveedor");
  validarAlcanceEscrituraProveedorMotor_("CAMBIAR_ESTADO", id, usuario);
  const estado = normalizarTexto(nuevoEstado);
  if ([CONFIG.ESTADOS.ACTIVO, CONFIG.ESTADOS.INACTIVO].indexOf(estado) === -1) {
    throw new Error("El estado debe ser ACTIVO o INACTIVO.");
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const existente = buscarProveedorCompletoMotor_(id);
    if (!existente) throw new Error("No se encontró el proveedor solicitado.");
    if (existente.estado === estado) return completarDetalleProveedorMotor_(
      construirVistaProveedoresMotor_().find(function(item) { return item.idProveedor === id; })
    );

    if (estado === CONFIG.ESTADOS.INACTIVO) {
      validarProveedorSinDependenciasActivasMotor_(id);
    }

    const ahora = new Date();
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES,
      "ID_PROVEEDOR", {
        ID_PROVEEDOR: id,
        ESTADO: estado,
        FECHA_MODIFICACION: ahora,
        USUARIO_MODIFICACION: usuario.idUsuario,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario
      });
    SpreadsheetApp.flush();

    registrarCambioMotor_(PROVEEDORES_MODULO_SGT360.CODIGO,
      estado === CONFIG.ESTADOS.ACTIVO ? "ACTIVAR_PROVEEDOR" : "INACTIVAR_PROVEEDOR",
      "PROVEEDOR", id, { estadoAnterior: existente.estado, estadoNuevo: estado });
    return completarDetalleProveedorMotor_(construirVistaProveedoresMotor_().find(function(item) {
      return item.idProveedor === id;
    }));
  } finally {
    bloqueo.releaseLock();
  }
}

/** Importa proveedores mediante UPSERT atómico. */
function importarProveedoresModulo(contenidoCsv, metadatos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("IMPORTAR", usuario);
  validarAlcanceGlobalProveedorMotor_("IMPORTAR", usuario);
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    return importarProveedoresModuloInterno_(contenidoCsv, metadatos, usuario,
      PROVEEDORES_MODULO_SGT360.CODIGO);
  } finally {
    bloqueo.releaseLock();
  }
}

/** @private */
function importarProveedoresModuloInterno_(contenidoCsv, metadatos, usuario, moduloAuditoria) {
  validarEstructuraIdentidadProveedorMotor_();
  const archivo = metadatos && typeof metadatos === "object" ? metadatos : {};
  const registros = parsearCsvProveedoresMotor_(contenidoCsv);
  const validacion = validarImportacionProveedoresMotor_(registros);
  const resultado = aplicarImportacionProveedoresMotor_(validacion.registros, usuario);
  const respaldo = guardarRespaldoProveedoresMotor_(contenidoCsv, archivo.nombre || "");

  registrarCambioMotor_(moduloAuditoria || PROVEEDORES_MODULO_SGT360.CODIGO,
    "IMPORTACION_MASIVA_PROVEEDORES", "PROVEEDOR", archivo.nombre || "CARGA_CSV", {
      filasLeidas: resultado.filasLeidas,
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      sinCambios: resultado.sinCambios,
      cambiosCodigoSap: resultado.cambiosCodigoSap,
      cambiosRuc: resultado.cambiosRuc,
      cambiosRazonSocial: resultado.cambiosRazonSocial,
      cambiosNombreComercial: resultado.cambiosNombreComercial,
      idsGenerados: resultado.idsGenerados,
      respaldoGuardado: respaldo.guardado
    });
  if (resultado.cambiosCodigoSap) {
    registrarCambioMotor_(moduloAuditoria || PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_CODIGO_SAP_MASIVO", "PROVEEDOR", archivo.nombre || "CARGA_CSV",
      { cantidad: resultado.cambiosCodigoSap });
  }
  if (resultado.cambiosRuc) {
    registrarCambioMotor_(moduloAuditoria || PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_RUC_MASIVO", "PROVEEDOR", archivo.nombre || "CARGA_CSV",
      { cantidad: resultado.cambiosRuc });
  }

  return Object.assign({
    correcto: true,
    archivo: String(archivo.nombre || ""),
    respaldo: respaldo,
    mensaje: "La carga de proveedores fue aplicada completamente."
  }, resultado);
}

/** Exporta los proveedores accesibles según filtros y alcance. */
function exportarProveedoresModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("EXPORTAR", usuario);
  filtros = filtros || {};

  let registros = construirVistaProveedoresMotor_();
  registros = filtrarProveedoresPorAlcanceMotor_(
    registros,
    "EXPORTAR",
    usuario
  );

  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  if (texto) {
    registros = registros.filter(function(item) {
      return [
        item.idProveedor,
        item.razonSocial,
        item.nombreComercial,
        item.nombreMostrar,
        item.codigoSap,
        item.ruc
      ].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  if (estado !== "TODOS") {
    registros = registros.filter(function(item) {
      return item.estado === estado;
    });
  }

  const filas = registros.map(function(item) {
    return [
      item.idProveedor,
      item.razonSocial,
      item.nombreComercial,
      item.codigoSap,
      item.ruc,
      item.descripcion,
      item.alcanceCatalogo,
      item.estado
    ];
  });

  const contenido = construirCsvMotor_(
    PROVEEDORES_MODULO_SGT360.CABECERAS_EXPORTACION_CSV,
    filas,
    { separador: ";", protegerFormulas: true }
  );
  const sello = Utilities.formatDate(
    new Date(),
    MOTOR_SGT360.ZONA_HORARIA,
    "yyyyMMdd_HHmmss"
  );

  registrarCambioMotor_(
    PROVEEDORES_MODULO_SGT360.CODIGO,
    "EXPORTAR_PROVEEDORES",
    "PROVEEDOR",
    "EXPORT_" + sello,
    { cantidad: filas.length }
  );

  return {
    nombre: "proveedores_" + sello + ".csv",
    contenido: contenido,
    cantidad: filas.length
  };
}

/** Entrega la plantilla CSV oficial de proveedores. */
function obtenerPlantillaProveedoresModulo() {
  const usuario = obtenerUsuarioActual();
  exigirPermisoProveedorMotor_("IMPORTAR", usuario);
  return {
    nombre: "plantilla_proveedores.csv",
    contenido: construirCsvMotor_(PROVEEDORES_MODULO_SGT360.CABECERAS_CSV, [],
      { separador: ";", protegerFormulas: false })
  };
}

/** @private */
function tienePermisoProveedorMotor_(recurso, usuario) {
  return tienePermisoMotor_(PROVEEDORES_MODULO_SGT360.CODIGO, recurso, usuario) ||
    tienePermisoMotor_(PROVEEDORES_MODULO_SGT360.CODIGO, "ADMINISTRAR", usuario);
}

/** @private */
function exigirPermisoProveedorMotor_(recurso, usuario) {
  if (!tienePermisoProveedorMotor_(recurso, usuario)) {
    throw new Error("No tienes permiso para " + normalizarTexto(recurso) + " en PROVEEDORES.");
  }
}

/** @private */
function obtenerAlcanceProveedorMotor_(recurso, usuario) {
  if (tienePermisoMotor_(PROVEEDORES_MODULO_SGT360.CODIGO, recurso, usuario)) {
    return obtenerAlcancePermisoMotor_(PROVEEDORES_MODULO_SGT360.CODIGO, recurso, usuario);
  }
  return obtenerAlcancePermisoMotor_(PROVEEDORES_MODULO_SGT360.CODIGO, "ADMINISTRAR", usuario);
}

/** @private */
function filtrarProveedoresPorAlcanceMotor_(registros, recurso, usuario) {
  const idProveedorUsuario = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  const alcance = obtenerAlcanceProveedorMotor_(recurso, usuario);
  if (alcance === "GLOBAL") return registros;
  if (alcance === "PROVEEDOR") {
    if (!idProveedorUsuario) return [];
    return registros.filter(function(item) { return item.idProveedor === idProveedorUsuario; });
  }
  if (["PROPIO", "GRUPO", "ASIGNADOS"].indexOf(alcance) !== -1) {
    throw new Error("El alcance " + alcance + " no tiene una asociación funcional válida en PROVEEDORES.");
  }
  return [];
}

/** @private */
function validarAccesoProveedorMotor_(proveedor, recurso, usuario) {
  if (filtrarProveedoresPorAlcanceMotor_([proveedor], recurso, usuario).length !== 1) {
    throw new Error("No tienes acceso al proveedor solicitado.");
  }
}

/** @private */
function validarAlcanceEscrituraProveedorMotor_(recurso, idProveedor, usuario) {
  const idProveedorUsuario = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  const alcance = obtenerAlcanceProveedorMotor_(recurso, usuario);
  if (alcance === "GLOBAL") return;
  if (alcance === "PROVEEDOR" && idProveedor && idProveedor === idProveedorUsuario) return;
  if (alcance === "PROVEEDOR" && !idProveedor) {
    throw new Error("El alcance PROVEEDOR no permite crear un proveedor distinto al asociado al usuario.");
  }
  throw new Error("El alcance " + alcance + " no permite esta operación sobre proveedores.");
}

/** @private */
function validarAlcanceGlobalProveedorMotor_(recurso, usuario) {
  const alcance = obtenerAlcanceProveedorMotor_(recurso, usuario);
  if (alcance !== "GLOBAL") {
    throw new Error("La operación masiva requiere alcance GLOBAL.");
  }
}

/** @private */
function normalizarCodigoSapProveedorMotor_(valor) {
  const codigo = String(valor === null || valor === undefined ? "" : valor).trim().toUpperCase();
  if (!codigo) return "";
  if (!/^[A-Z0-9]+$/.test(codigo)) {
    throw new Error("El código SAP solo puede contener caracteres alfanuméricos, sin espacios ni símbolos.");
  }
  if (codigo.length > 80) throw new Error("El código SAP no puede superar 80 caracteres.");
  return codigo;
}

/** @private */
function normalizarRucProveedorMotor_(valor) {
  const ruc = String(valor === null || valor === undefined ? "" : valor).trim();
  if (!ruc) return "";
  if (!/^\d{11}$/.test(ruc)) throw new Error("El RUC debe contener exactamente 11 dígitos.");
  return ruc;
}

/** @private */
function validarUnicidadProveedorMotor_(idProveedor, codigoSap, ruc) {
  const id = String(idProveedor || "").trim();
  const registros = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES);
  registros.forEach(function(item) {
    const idActual = String(item.ID_PROVEEDOR || "").trim();
    if (idActual === id) return;
    const codigoActual = String(item.CODIGO_SAP || "").trim().toUpperCase();
    const rucActual = String(item.RUC || "").trim();
    if (codigoSap && codigoActual === codigoSap) {
      throw new Error("El código SAP ya está registrado en el proveedor " + idActual + ".");
    }
    if (ruc && rucActual === ruc) {
      throw new Error("El RUC ya está registrado en el proveedor " + idActual + ".");
    }
  });
}

/** @private */
function validarOficinasProveedorMotor_(estado, idsOficina) {
  // La oficina representa canal de ventas y es opcional para el proveedor.
  // Un proveedor activo puede no tener oficina cuando solo abastece materiales.
  idsOficina.forEach(function(idOficina) {
    const oficina = buscarOficinaAdminMotor_(idOficina);
    if (!oficina || oficina.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("La oficina " + idOficina + " no existe o está inactiva.");
    }
  });
}


/** @private */
function validarGruposProveedorPaso27P_(estado, idsOficina, idsGrupo) {
  if (!idsGrupo.length) return;
  if (!idsOficina.length) {
    throw new Error("No puedes seleccionar grupos de vendedores sin seleccionar al menos una oficina de ventas.");
  }
  const oficinasSeleccionadas = {};
  idsOficina.forEach(function(idOficina) { oficinasSeleccionadas[idOficina] = true; });
  idsGrupo.forEach(function(idGrupo) {
    const grupo = buscarGrupoAdminMotor_(idGrupo);
    if (!grupo || grupo.estado !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("El grupo " + idGrupo + " no existe o está inactivo.");
    }
    if (!oficinasSeleccionadas[grupo.idOficina]) {
      throw new Error("El grupo " + idGrupo + " pertenece a una oficina no seleccionada.");
    }
  });
}

/** @private */
function construirGruposSeleccionadosProveedorPaso27P_(idsOficina, idsGrupo) {
  const oficinasSeleccionadas = {};
  idsOficina.forEach(function(idOficina) { oficinasSeleccionadas[idOficina] = true; });
  const gruposPorOficina = {};
  idsOficina.forEach(function(idOficina) { gruposPorOficina[idOficina] = []; });
  idsGrupo.forEach(function(idGrupo) {
    const grupo = buscarGrupoAdminMotor_(idGrupo);
    if (!grupo || !oficinasSeleccionadas[grupo.idOficina]) return;
    if (!gruposPorOficina[grupo.idOficina]) gruposPorOficina[grupo.idOficina] = [];
    if (gruposPorOficina[grupo.idOficina].indexOf(idGrupo) === -1) {
      gruposPorOficina[grupo.idOficina].push(idGrupo);
    }
  });
  return gruposPorOficina;
}

/** @private */
function buscarProveedorCompletoMotor_(idProveedor) {
  const id = String(idProveedor || "").trim();
  const item = listarProveedoresAdminMotor_().find(function(proveedor) {
    return proveedor.idProveedor === id;
  });
  return item ? Object.assign({}, item) : null;
}

/** @private */
function construirVistaProveedoresMotor_() {
  const claveCache = construirClaveCacheMotor_(
    "VISTA_PROVEEDORES",
    obtenerRevisionDatosMotor_()
  );

  return obtenerOConstruirCacheMotor_(
    claveCache,
    construirVistaProveedoresSinCacheMotor_,
    180
  );
}

/** Construye la vista resumida sin caché. @private */
function construirVistaProveedoresSinCacheMotor_() {
  const proveedores = listarProveedoresAdminMotor_();
  const oficinas = listarOficinasAdminMotor_();
  const relaciones = listarRelacionesProveedorOficinaAdminMotor_();
  const grupos = listarGruposAdminMotor_();
  const oficinasActivas = {};

  oficinas.forEach(function(item) {
    if (item.estado === CONFIG.ESTADOS.ACTIVO) {
      oficinasActivas[item.idOficina] = item;
    }
  });

  const relacionesPorProveedor = {};
  relaciones.forEach(function(relacion) {
    if (
      relacion.estado !== CONFIG.ESTADOS.ACTIVO ||
      !oficinasActivas[relacion.idOficina]
    ) {
      return;
    }
    if (!relacionesPorProveedor[relacion.idProveedor]) {
      relacionesPorProveedor[relacion.idProveedor] = [];
    }
    relacionesPorProveedor[relacion.idProveedor].push(relacion);
  });

  const gruposPorOficina = {};
  grupos.forEach(function(grupo) {
    if (grupo.estado !== CONFIG.ESTADOS.ACTIVO) return;
    if (!gruposPorOficina[grupo.idOficina]) {
      gruposPorOficina[grupo.idOficina] = [];
    }
    gruposPorOficina[grupo.idOficina].push(grupo);
  });

  return proveedores.map(function(item) {
    const id = item.idProveedor;
    const relacionesProveedor = relacionesPorProveedor[id] || [];
    const ids = relacionesProveedor.map(function(relacion) {
      return relacion.idOficina;
    });
    let cantidadGrupos = 0;

    relacionesProveedor.forEach(function(relacion) {
      const gruposOficina = gruposPorOficina[relacion.idOficina] || [];
      if (relacion.alcanceGrupos === "RESTRINGIDO" && relacion.idsGrupo && relacion.idsGrupo.length) {
        cantidadGrupos += gruposOficina.filter(function(grupo) {
          return relacion.idsGrupo.indexOf(grupo.idGrupo) !== -1;
        }).length;
        return;
      }
      cantidadGrupos += gruposOficina.length;
    });

    return Object.assign({}, item, {
      idProveedor: id,
      codigoInterno: id,
      nombre: item.nombreMostrar,
      nombreMostrar: item.nombreMostrar,
      tieneCanalVentas: ids.length > 0,
      canalVentas: ids.length > 0 ? "CON_CANAL_VENTAS" : "SOLO_PROVEEDOR",
      cantidadOficinas: ids.length,
      cantidadGrupos: cantidadGrupos
    });
  });
}

/** @private */
function completarDetalleProveedorMotor_(proveedor) {
  if (!proveedor) return null;
  const oficinas = listarOficinasAdminMotor_();
  const mapaOficinas = {};
  oficinas.forEach(function(item) { mapaOficinas[item.idOficina] = item; });
  const relaciones = listarRelacionesProveedorOficinaAdminMotor_().filter(function(item) {
    return item.idProveedor === proveedor.idProveedor && item.estado === CONFIG.ESTADOS.ACTIVO;
  });
  const relacionesPorOficina = {};
  relaciones.forEach(function(relacion) {
    relacionesPorOficina[relacion.idOficina] = relacion;
  });
  const oficinasAsignadas = relaciones.map(function(item) {
    const oficina = mapaOficinas[item.idOficina];
    const idsGrupo = normalizarIdsGrupoRelacionProveedorPaso27P_(item.idsGrupo || []);
    const alcanceGrupos = item.alcanceGrupos === "RESTRINGIDO" && idsGrupo.length ? "RESTRINGIDO" : "TODOS";
    return oficina ? {
      idOficina: oficina.idOficina,
      nombre: oficina.nombre,
      descripcion: oficina.descripcion,
      idsGrupo: idsGrupo,
      alcanceGrupos: alcanceGrupos,
      estado: oficina.estado
    } : {
      idOficina: item.idOficina,
      nombre: item.idOficina,
      descripcion: "",
      idsGrupo: idsGrupo,
      alcanceGrupos: alcanceGrupos,
      estado: "NO_DISPONIBLE"
    };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
  const ids = {};
  oficinasAsignadas.forEach(function(item) { ids[item.idOficina] = true; });
  const gruposDerivados = listarGruposAdminMotor_().filter(function(item) {
    if (!ids[item.idOficina] || item.estado !== CONFIG.ESTADOS.ACTIVO) return false;
    const relacion = relacionesPorOficina[item.idOficina];
    if (relacion && relacion.alcanceGrupos === "RESTRINGIDO" && relacion.idsGrupo && relacion.idsGrupo.length) {
      return relacion.idsGrupo.indexOf(item.idGrupo) !== -1;
    }
    return true;
  }).map(function(item) {
    return {
      idGrupo: item.idGrupo,
      nombre: item.nombre,
      idOficina: item.idOficina,
      nombreOficina: mapaOficinas[item.idOficina] ? mapaOficinas[item.idOficina].nombre : item.idOficina
    };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
  const idsGrupoSeleccionados = [];
  relaciones.forEach(function(relacion) {
    if (relacion.alcanceGrupos === "RESTRINGIDO") {
      normalizarIdsGrupoRelacionProveedorPaso27P_(relacion.idsGrupo || []).forEach(function(idGrupo) {
        if (idsGrupoSeleccionados.indexOf(idGrupo) === -1) idsGrupoSeleccionados.push(idGrupo);
      });
    }
  });
  const alcanceGruposProveedor = relaciones.some(function(relacion) {
    return relacion.alcanceGrupos === "RESTRINGIDO" && relacion.idsGrupo && relacion.idsGrupo.length;
  }) ? "RESTRINGIDO" : "TODOS";
  return Object.assign({}, proveedor, {
    idsOficina: oficinasAsignadas.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).map(function(item) { return item.idOficina; }),
    idsGrupo: idsGrupoSeleccionados,
    alcanceGrupos: alcanceGruposProveedor,
    tieneCanalVentas: oficinasAsignadas.some(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }),
    canalVentas: oficinasAsignadas.some(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }) ? "CON_CANAL_VENTAS" : "SOLO_PROVEEDOR",
    oficinasAsignadas: oficinasAsignadas,
    gruposDerivados: gruposDerivados,
    cantidadOficinas: oficinasAsignadas.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).length,
    cantidadGrupos: gruposDerivados.length
  });
}

/** @private */
function fechaProveedorIsoMotor_(valor) {
  const fecha = convertirFechaMotor_(valor);
  return fecha ? fecha.toISOString() : "";
}

/** @private */
function auditarGuardadoProveedorMotor_(
  anterior,
  nuevo,
  oficinasAnteriores,
  oficinasNuevas
) {
  const id = nuevo.ID_PROVEEDOR;
  registrarCambioMotor_(
    PROVEEDORES_MODULO_SGT360.CODIGO,
    anterior ? "MODIFICAR_PROVEEDOR" : "CREAR_PROVEEDOR",
    "PROVEEDOR",
    id,
    {
      codigoInterno: id,
      razonSocial: nuevo.RAZON_SOCIAL,
      nombreComercial: nuevo.NOMBRE_COMERCIAL,
      estado: nuevo.ESTADO
    }
  );

  if (anterior && anterior.razonSocial !== nuevo.RAZON_SOCIAL) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_RAZON_SOCIAL",
      "PROVEEDOR",
      id,
      {
        valorAnterior: anterior.razonSocial,
        valorNuevo: nuevo.RAZON_SOCIAL
      }
    );
  }

  if (
    anterior &&
    anterior.nombreComercial !== nuevo.NOMBRE_COMERCIAL
  ) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_NOMBRE_COMERCIAL",
      "PROVEEDOR",
      id,
      {
        valorAnterior: anterior.nombreComercial,
        valorNuevo: nuevo.NOMBRE_COMERCIAL
      }
    );
  }

  if (anterior && anterior.codigoSap !== nuevo.CODIGO_SAP) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_CODIGO_SAP",
      "PROVEEDOR",
      id,
      {
        teniaValor: Boolean(anterior.codigoSap),
        tieneValor: Boolean(nuevo.CODIGO_SAP)
      }
    );
  }

  if (anterior && anterior.ruc !== nuevo.RUC) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_RUC",
      "PROVEEDOR",
      id,
      {
        teniaValor: Boolean(anterior.ruc),
        tieneValor: Boolean(nuevo.RUC)
      }
    );
  }

  const antes = {};
  oficinasAnteriores.forEach(function(item) {
    antes[item] = true;
  });
  const despues = {};
  oficinasNuevas.forEach(function(item) {
    despues[item] = true;
  });

  const agregadas = oficinasNuevas.filter(function(item) {
    return !antes[item];
  });
  const retiradas = oficinasAnteriores.filter(function(item) {
    return !despues[item];
  });

  if (agregadas.length || retiradas.length) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      "CAMBIO_OFICINAS_PROVEEDOR",
      "PROVEEDOR",
      id,
      {
        oficinasAgregadas: agregadas,
        oficinasRetiradas: retiradas
      }
    );
  }

  if (anterior && anterior.estado !== nuevo.ESTADO) {
    registrarCambioMotor_(
      PROVEEDORES_MODULO_SGT360.CODIGO,
      nuevo.ESTADO === CONFIG.ESTADOS.ACTIVO ?
        "ACTIVAR_PROVEEDOR" : "INACTIVAR_PROVEEDOR",
      "PROVEEDOR",
      id,
      {
        estadoAnterior: anterior.estado,
        estadoNuevo: nuevo.ESTADO
      }
    );
  }
}

/** @private */
/** @private */
function obtenerCampoProveedorImportacionPaso27R_(registro, campos) {
  const datos = registro || {};
  for (let i = 0; i < campos.length; i++) {
    const valor = datos[campos[i]];
    if (valor !== undefined && valor !== null && String(valor).trim()) {
      return String(valor).trim();
    }
  }
  return "";
}

/** @private */
function normalizarAsignacionProveedorImportacionPaso27R_(registro) {
  const textoOficinas = obtenerCampoProveedorImportacionPaso27R_(registro, [
    "CODIGO_CANALES_VENTA", "CANALES_VENTA", "ID_OFICINAS", "IDS_OFICINA",
    "ID_OFICINA"
  ]);
  const textoGrupos = obtenerCampoProveedorImportacionPaso27R_(registro, [
    "CODIGO_GRUPOS_VENDEDORES", "GRUPOS_VENDEDORES", "ID_GRUPOS",
    "IDS_GRUPO", "ID_GRUPO"
  ]);
  const idsOficina = normalizarListaIdsMotor_(textoOficinas, "ID de oficina");
  const idsGrupo = normalizarListaIdsMotor_(textoGrupos, "ID de grupo");

  validarOficinasProveedorMotor_(CONFIG.ESTADOS.ACTIVO, idsOficina);
  validarGruposProveedorPaso27P_(CONFIG.ESTADOS.ACTIVO, idsOficina, idsGrupo);

  return {
    idsOficina: idsOficina,
    idsGrupo: idsGrupo,
    canalesTexto: idsOficina.join("|"),
    gruposTexto: idsGrupo.join("|"),
    alcanceGrupos: idsOficina.length ? (idsGrupo.length ? "RESTRINGIDO" : "TODOS") : "SIN_CANAL"
  };
}

/** @private */
function resolverIdProveedorExistenteImportacionPaso27R_(idIngresado, codigoSap, ruc, existentes) {
  const mapa = existentes || {};
  const coincidencias = {};
  const idNormalizado = String(idIngresado || "").trim() ?
    normalizarIdMaestroMotor_(idIngresado, "código interno del proveedor") : "";
  if (idNormalizado) {
    if (!mapa[idNormalizado]) {
      throw new Error("El código interno " + idNormalizado + " no existe. El ID_PROVEEDOR no se usa para crear proveedores masivos.");
    }
    coincidencias[idNormalizado] = "ID_PROVEEDOR";
  }

  Object.keys(mapa).forEach(function(id) {
    const item = mapa[id] || {};
    if (codigoSap && String(item.codigoSap || "").trim().toUpperCase() === codigoSap) {
      coincidencias[id] = "CODIGO_SAP";
    }
    if (ruc && String(item.ruc || "").trim() === ruc) {
      coincidencias[id] = "RUC";
    }
  });

  const ids = Object.keys(coincidencias);
  if (ids.length > 1) {
    throw new Error("El CODIGO_SAP/RUC/ID_PROVEEDOR coincide con más de un proveedor existente: " + ids.join(", ") + ".");
  }
  return ids[0] || "";
}

function parsearCsvProveedoresMotor_(contenidoCsv) {
  const texto = String(contenidoCsv || "").replace(/^\uFEFF/, "").trim();
  if (!texto) throw new Error("El archivo CSV está vacío.");
  if (
    Utilities.newBlob(texto).getBytes().length >
    PROVEEDORES_MODULO_SGT360.MAXIMO_BYTES_CSV
  ) {
    throw new Error("El archivo supera el máximo permitido de 5 MB.");
  }

  const separador = detectarSeparadorCsvAsignacionMotor_(texto);
  const filas = Utilities.parseCsv(texto, separador);
  if (filas.length < 2) {
    throw new Error("El CSV debe incluir cabeceras y al menos un registro.");
  }
  if (filas.length - 1 > PROVEEDORES_MODULO_SGT360.MAXIMO_IMPORTACION) {
    throw new Error("El CSV no puede superar 5 000 registros.");
  }

  const cabeceras = filas[0].map(function(item) {
    return normalizarClaveMotor_(
      String(item || "").replace(/^\uFEFF/, "")
    );
  });
  const repetidas = {};
  cabeceras.forEach(function(item) {
    if (item) repetidas[item] = (repetidas[item] || 0) + 1;
  });
  const duplicadas = Object.keys(repetidas).filter(function(item) {
    return repetidas[item] > 1;
  });
  if (duplicadas.length) {
    throw new Error(
      "El CSV contiene cabeceras duplicadas: " +
      duplicadas.join(", ") + "."
    );
  }

  validarCabeceras(
    crearMapaCabeceras(cabeceras),
    ["RAZON_SOCIAL"],
    "CSV Proveedores"
  );

  const permitidas = PROVEEDORES_MODULO_SGT360.CABECERAS_CSV_PERMITIDAS ||
    PROVEEDORES_MODULO_SGT360.CABECERAS_CSV;
  const noPermitidas = cabeceras.filter(function(item) {
    return item && permitidas.indexOf(item) === -1;
  });
  if (noPermitidas.length) {
    throw new Error(
      "El CSV contiene cabeceras no permitidas: " +
      noPermitidas.join(", ") + "."
    );
  }

  const registros = filas.slice(1).map(function(fila, indice) {
    const item = { __linea: indice + 2 };
    cabeceras.forEach(function(cabecera, posicion) {
      if (cabecera) {
        item[cabecera] = String(fila[posicion] || "").trim();
      }
    });
    return item;
  }).filter(function(item) {
    return permitidas.some(function(campo) {
      return String(item[campo] || "").trim();
    });
  });

  if (!registros.length) {
    throw new Error("El CSV no contiene registros utilizables.");
  }
  return registros;
}

/** @private */
function validarImportacionProveedoresMotor_(registros) {
  const existentes = {};
  construirVistaProveedoresMotor_().forEach(function(item) {
    existentes[item.idProveedor] = item;
  });

  const finales = {};
  Object.keys(existentes).forEach(function(id) {
    finales[id] = Object.assign({}, existentes[id]);
  });

  const vistos = {};
  const errores = [];
  const normalizados = [];
  const idsGenerados = [];

  registros.forEach(function(registro) {
    const linea = registro.__linea;
    const idIngresado = String(registro.ID_PROVEEDOR || "").trim();
    let id = "";
    let codigoSap = "";
    let ruc = "";
    let asignacion = { idsOficina: [], idsGrupo: [], canalesTexto: "", gruposTexto: "", alcanceGrupos: "SIN_CANAL" };

    const razonSocial = normalizarNombreProveedorMotor_(
      registro.RAZON_SOCIAL,
      200
    );
    const nombreComercial = normalizarNombreProveedorMotor_(
      registro.NOMBRE_COMERCIAL,
      180
    );
    const nombreMostrar = resolverNombreVisualProveedorMotor_(
      razonSocial,
      nombreComercial,
      ""
    );

    try {
      codigoSap = normalizarCodigoSapProveedorMotor_(registro.CODIGO_SAP);
    } catch (errorSap) {
      errores.push("Línea " + linea + ": " + errorSap.message);
    }
    try {
      ruc = normalizarRucProveedorMotor_(registro.RUC);
    } catch (errorRuc) {
      errores.push("Línea " + linea + ": " + errorRuc.message);
    }
    try {
      asignacion = normalizarAsignacionProveedorImportacionPaso27R_(registro);
    } catch (errorAsignacion) {
      errores.push("Línea " + linea + ": " + errorAsignacion.message);
    }
    try {
      id = resolverIdProveedorExistenteImportacionPaso27R_(
        idIngresado,
        codigoSap,
        ruc,
        existentes
      );
    } catch (errorId) {
      errores.push("Línea " + linea + ": " + errorId.message);
    }

    if (!id) {
      do {
        id = generarCodigoProveedorCortoUnicoPaso27O_();
      } while (vistos[id]);
      idsGenerados.push(id);
    }

    if (id && vistos[id]) {
      errores.push("Línea " + linea + ": el proveedor queda repetido dentro del archivo.");
    }
    if (id) vistos[id] = true;
    if (!razonSocial) {
      errores.push("Línea " + linea + ": la razón social es obligatoria.");
    }
    if (!id) return;

    const actual = existentes[id] || null;

    let alcanceCatalogo =
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR;

    try {
      alcanceCatalogo =
        String(registro.ALCANCE_CATALOGO || "").trim()
          ? normalizarAlcanceCatalogoProveedorMotor_(
              registro.ALCANCE_CATALOGO,
              ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
            )
          : (
              actual
                ? normalizarAlcanceCatalogoProveedorMotor_(
                    actual.alcanceCatalogo,
                    ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
                  )
                : ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
            );
    } catch (errorAlcanceCatalogo) {
      errores.push(
        "Línea " + linea + ": " +
        errorAlcanceCatalogo.message
      );
    }

    const final = {
      idProveedor: id,
      codigoInterno: id,
      razonSocial: razonSocial,
      nombreComercial: nombreComercial,
      nombre: nombreMostrar,
      nombreMostrar: nombreMostrar,
      codigoSap: codigoSap,
      ruc: ruc,
      descripcion: limpiarTextoMotor_(registro.DESCRIPCION, 1000),
      alcanceCatalogo: alcanceCatalogo,
      estado: CONFIG.ESTADOS.ACTIVO,
      idsOficina: asignacion.idsOficina,
      idsGrupo: asignacion.idsGrupo,
      canalesTexto: asignacion.canalesTexto,
      gruposTexto: asignacion.gruposTexto,
      alcanceGrupos: asignacion.alcanceGrupos,
      asignacionCanalesInformada: true,
      existente: actual,
      linea: linea,
      idGenerado: !actual
    };

    finales[id] = final;
    normalizados.push(final);
  });

  const sap = {};
  const rucs = {};
  Object.keys(finales).forEach(function(id) {
    const item = finales[id];
    const codigoClave = String(item.codigoSap || "").trim().toUpperCase();
    const rucClave = String(item.ruc || "").trim();

    if (codigoClave) {
      if (sap[codigoClave] && sap[codigoClave] !== id) {
        errores.push(
          "El código SAP " + codigoClave +
          " quedaría duplicado entre " + sap[codigoClave] +
          " y " + id + "."
        );
      }
      sap[codigoClave] = id;
    }
    if (rucClave) {
      if (rucs[rucClave] && rucs[rucClave] !== id) {
        errores.push(
          "El RUC " + rucClave +
          " quedaría duplicado entre " + rucs[rucClave] +
          " y " + id + "."
        );
      }
      rucs[rucClave] = id;
    }
  });

  normalizados.forEach(function(item) {
    if (item.existente) {
      try {
        validarRetiroOficinasProveedorMotor_(item.idProveedor, item.idsOficina || []);
      } catch (errorRetiro) {
        errores.push("Línea " + item.linea + ": " + errorRetiro.message);
      }
    }
  });

  if (errores.length) {
    const visibles = errores.slice(0, 25);
    const extra = errores.length > visibles.length ?
      " Se detectaron " +
      (errores.length - visibles.length) +
      " errores adicionales." : "";
    throw new Error(
      "La carga no fue aplicada. " +
      visibles.join(" ") + extra
    );
  }

  return {
    registros: normalizados,
    idsGenerados: idsGenerados
  };
}

/** @private */
function aplicarImportacionProveedoresMotor_(registros, usuario) {
  const contexto = obtenerContextoTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDORES,
    ["ID_PROVEEDOR", "RAZON_SOCIAL", "NOMBRE_COMERCIAL", "NOMBRE"]
  );
  const ultimaFila = contexto.hoja.getLastRow();
  const filas = ultimaFila > 1 ?
    contexto.hoja.getRange(
      2,
      1,
      ultimaFila - 1,
      contexto.numeroColumnas
    ).getValues() : [];
  const indices = {};

  filas.forEach(function(fila, indice) {
    const item = filaAObjetoMotor_(contexto.cabeceras, fila);
    const id = String(item.ID_PROVEEDOR || "").trim();
    if (id) indices[id] = indice;
  });

  (registros || []).forEach(function(registro) {
    if (registro.asignacionCanalesInformada === true) {
      validarOficinasProveedorMotor_(CONFIG.ESTADOS.ACTIVO, registro.idsOficina || []);
      validarGruposProveedorPaso27P_(CONFIG.ESTADOS.ACTIVO, registro.idsOficina || [], registro.idsGrupo || []);
      if (indices[registro.idProveedor] !== undefined) {
        validarRetiroOficinasProveedorMotor_(registro.idProveedor, registro.idsOficina || []);
      }
    }
  });

  let creados = 0;
  let actualizados = 0;
  let sinCambios = 0;
  let cambiosCodigoSap = 0;
  let cambiosRuc = 0;
  let cambiosRazonSocial = 0;
  let cambiosNombreComercial = 0;
  const idsGenerados = [];
  const ahora = new Date();

  registros.forEach(function(registro) {
    const posicion = indices[registro.idProveedor];
    const existe = typeof posicion === "number";
    const actual = existe ?
      filaAObjetoMotor_(contexto.cabeceras, filas[posicion]) : {};

    const razonActual = normalizarNombreProveedorMotor_(
      actual.RAZON_SOCIAL || actual.NOMBRE,
      200
    );
    const comercialActual = normalizarNombreProveedorMotor_(
      actual.NOMBRE_COMERCIAL,
      180
    );
    const nombreActual = resolverNombreVisualProveedorMotor_(
      razonActual,
      comercialActual,
      actual.NOMBRE
    );

    const cambioProveedor = !existe ||
      razonActual !== registro.razonSocial ||
      comercialActual !== registro.nombreComercial ||
      nombreActual !== registro.nombreMostrar ||
      String(actual.CODIGO_SAP || "").trim() !== registro.codigoSap ||
      String(actual.RUC || "").trim() !== registro.ruc ||
      String(actual.DESCRIPCION || "").trim() !== registro.descripcion ||
      normalizarAlcanceCatalogoProveedorMotor_(
        actual.ALCANCE_CATALOGO,
        ALCANCES_CATALOGO_PROVEEDOR_SGT360.TODOS_PROVEEDORES
      ) !== registro.alcanceCatalogo ||
      normalizarTexto(actual.ESTADO) !== CONFIG.ESTADOS.ACTIVO;
    const sincronizarCanales = registro.asignacionCanalesInformada === true;

    if (!cambioProveedor && !sincronizarCanales) {
      sinCambios += 1;
      return;
    }

    if (existe && razonActual !== registro.razonSocial) {
      cambiosRazonSocial += 1;
    }
    if (existe && comercialActual !== registro.nombreComercial) {
      cambiosNombreComercial += 1;
    }
    if (
      existe &&
      String(actual.CODIGO_SAP || "").trim() !== registro.codigoSap
    ) {
      cambiosCodigoSap += 1;
    }
    if (
      existe &&
      String(actual.RUC || "").trim() !== registro.ruc
    ) {
      cambiosRuc += 1;
    }

    if (cambioProveedor) {
      const objeto = {
        ID_PROVEEDOR: registro.idProveedor,
        RAZON_SOCIAL: registro.razonSocial,
        NOMBRE_COMERCIAL: registro.nombreComercial,
        NOMBRE: registro.nombreMostrar,
        CODIGO_SAP: registro.codigoSap,
        RUC: registro.ruc,
        DESCRIPCION: registro.descripcion,
        ALCANCE_CATALOGO: registro.alcanceCatalogo,
        ESTADO: CONFIG.ESTADOS.ACTIVO,
        FECHA_MODIFICACION: ahora,
        USUARIO_MODIFICACION: usuario.idUsuario,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario
      };

      if (!existe) {
        objeto.FECHA_CREACION = ahora;
        objeto.USUARIO_CREACION = usuario.idUsuario;
        indices[registro.idProveedor] = filas.length;
        filas.push(objetoAFilaMotor_(contexto.cabeceras, objeto));
        creados += 1;
        if (registro.idGenerado) idsGenerados.push(registro.idProveedor);
      } else {
        filas[posicion] = objetoAFilaMotor_(
          contexto.cabeceras,
          objeto,
          filas[posicion]
        );
        actualizados += 1;
      }
    } else if (sincronizarCanales) {
      actualizados += 1;
    }

    if (sincronizarCanales) {
      sincronizarOficinasProveedorMotor_(
        registro.idProveedor,
        registro.idsOficina || [],
        usuario.idUsuario,
        {
          idsGrupoPorOficina: construirGruposSeleccionadosProveedorPaso27P_(
            registro.idsOficina || [],
            registro.idsGrupo || []
          )
        }
      );
    }
  });

  if (creados || actualizados) {
    if (filas.length) {
      contexto.hoja.getRange(
        2,
        1,
        filas.length,
        contexto.numeroColumnas
      ).setValues(filas);
    }
    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      CONFIG.HOJAS.PROVEEDORES
    );
    SpreadsheetApp.flush();
  }

  return {
    filasLeidas: registros.length,
    creados: creados,
    actualizados: actualizados,
    sinCambios: sinCambios,
    cambiosRazonSocial: cambiosRazonSocial,
    cambiosNombreComercial: cambiosNombreComercial,
    cambiosCodigoSap: cambiosCodigoSap,
    cambiosRuc: cambiosRuc,
    idsGenerados: idsGenerados
  };
}

/** @private */
function guardarRespaldoProveedoresMotor_(contenidoCsv, nombreOriginal) {
  const idCarpeta = String(CONFIG.CARPETAS.IMPORTACIONES || "").trim();
  if (!idCarpeta) return { guardado: false, nombre: "" };
  try {
    const carpeta = DriveApp.getFolderById(idCarpeta);
    const sello = Utilities.formatDate(new Date(), MOTOR_SGT360.ZONA_HORARIA, "yyyyMMdd_HHmmss");
    const nombreSeguro = String(nombreOriginal || "proveedores.csv")
      .replace(/[^A-Za-z0-9_.\-]/g, "_").slice(0, 120);
    const nombre = sello + "_PROVEEDORES_" + nombreSeguro;
    carpeta.createFile(Utilities.newBlob(String(contenidoCsv || ""), "text/csv", nombre));
    return { guardado: true, nombre: nombre };
  } catch (error) {
    console.warn("No se pudo guardar el respaldo de proveedores: " + error.message);
    return { guardado: false, nombre: "" };
  }
}
