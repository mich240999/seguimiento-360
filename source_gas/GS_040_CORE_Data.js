/**
 * SGT360 — Repositorio genérico de datos
 *
 * Responsabilidad:
 * Centraliza el acceso a Google Sheets para que los módulos no trabajen
 * directamente con SpreadsheetApp. Convierte filas en objetos, valida
 * cabeceras y realiza inserciones o actualizaciones por una clave única.
 *
 * Dependencias:
 * - GS_020_CFG_Environment.gs:
 *     obtenerLibroMotor_(), obtenerHojaMotor_().
 * - GS_030_CORE_Utils.gs:
 *     normalizarClaveMotor_(), crearMapaCabeceras(), validarCabeceras(),
 *     obtenerValorObjetoMotor_(), esFilaVaciaMotor_().
 *
 * Uso recomendado:
 * - Tablas administrativas y operativas de tamaño pequeño o medio.
 * - Para la futura carga de 24 000 pedidos se debe utilizar un proceso de
 *   staging y escritura masiva especializado, no guardar fila por fila.
 *
 * Convención:
 * - Todas las funciones terminadas en "_" son internas del backend.
 */

const PROPIEDAD_REVISION_DATOS_SGT360 = "SGT360_DATA_REVISION";

/**
 * Devuelve la revisión global de datos que utilizan los navegadores para
 * detectar cambios guardados por otros usuarios.
 *
 * @return {string} Revisión vigente.
 * @private
 */
function obtenerRevisionDatosMotor_() {
  return String(
    PropertiesService.getScriptProperties().getProperty(PROPIEDAD_REVISION_DATOS_SGT360) || "0"
  );
}

/**
 * Marca que existe una modificación funcional en las bases de la aplicación.
 *
 * Se excluyen sesiones y auditorías porque cambian constantemente y no deben
 * provocar recargas visuales en los demás navegadores.
 *
 * @param {string} aliasBase Base modificada.
 * @param {string} nombreHoja Hoja modificada.
 * @return {string} Nueva revisión o revisión anterior si la hoja es técnica.
 * @private
 */
function marcarRevisionDatosMotor_(aliasBase, nombreHoja) {
  const hoja = normalizarTexto(nombreHoja);
  const hojasTecnicas = [
    normalizarTexto(CONFIG.HOJAS.SESIONES_USUARIOS),
    normalizarTexto(CONFIG.HOJAS.AUDITORIA_ACCESOS),
    normalizarTexto(CONFIG.HOJAS.AUDITORIA_EVENTOS),
    normalizarTexto(CONFIG.HOJAS.AUDITORIA_PERMISOS)
  ];

  if (hojasTecnicas.indexOf(hoja) !== -1) {
    return obtenerRevisionDatosMotor_();
  }

  const revision = [
    new Date().toISOString(),
    normalizarTexto(aliasBase || "BASE"),
    hoja || "HOJA",
    Utilities.getUuid().slice(0, 8)
  ].join("|");

  PropertiesService.getScriptProperties().setProperty(
    PROPIEDAD_REVISION_DATOS_SGT360,
    revision
  );

  return revision;
}

/**
 * Obtiene una hoja y crea las cabeceras que todavía no existan.
 *
 * No elimina ni reordena cabeceras existentes. Esto permite ampliar una tabla
 * sin perder datos ya registrados.
 *
 * @param {string} aliasBase CONFIG, SECURITY u OPERATION.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @param {Array<string>=} cabeceras Cabeceras esperadas.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} Hoja lista para usar.
 * @private
 */
function asegurarHojaMotor_(aliasBase, nombreHoja, cabeceras) {
  const nombreSeguro = String(nombreHoja || "").trim();

  if (!nombreSeguro) {
    throw new Error("No se indicó el nombre de la hoja que debe asegurarse.");
  }

  const libro = obtenerLibroMotor_(aliasBase);
  let hoja = libro.getSheetByName(nombreSeguro);

  if (!hoja) {
    hoja = libro.insertSheet(nombreSeguro);
  }

  const esperadas = Array.isArray(cabeceras) ? cabeceras.filter(function(cabecera) {
    return normalizarClaveMotor_(cabecera) !== "";
  }) : [];

  if (!esperadas.length) {
    return hoja;
  }

  const ultimaColumna = hoja.getLastColumn();
  const actuales = ultimaColumna > 0 ?
    hoja.getRange(1, 1, 1, ultimaColumna).getDisplayValues()[0] : [];
  const tieneCabeceras = actuales.some(function(valor) {
    return String(valor || "").trim() !== "";
  });

  if (!tieneCabeceras) {
    hoja.getRange(1, 1, 1, esperadas.length).setValues([esperadas]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, esperadas.length).setFontWeight("bold");
    hoja.autoResizeColumns(1, esperadas.length);
    return hoja;
  }

  const mapaActual = crearMapaCabeceras(actuales);
  const faltantes = esperadas.filter(function(cabecera) {
    return typeof mapaActual[normalizarClaveMotor_(cabecera)] !== "number";
  });

  if (faltantes.length) {
    const primeraColumnaNueva = hoja.getLastColumn() + 1;
    hoja.getRange(1, primeraColumnaNueva, 1, faltantes.length).setValues([faltantes]);
    hoja.getRange(1, primeraColumnaNueva, 1, faltantes.length).setFontWeight("bold");
    hoja.autoResizeColumns(primeraColumnaNueva, faltantes.length);
  }

  return hoja;
}

/**
 * Obtiene la hoja, cabeceras y mapa de columnas de una tabla.
 *
 * @param {string} aliasBase CONFIG, SECURITY u OPERATION.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @param {Array<string>=} requeridas Cabeceras obligatorias.
 * @return {{hoja:Object, cabeceras:Array<string>, mapa:Object, numeroColumnas:number}}
 * @private
 */
function obtenerContextoTablaMotor_(aliasBase, nombreHoja, requeridas) {
  const hoja = obtenerHojaMotor_(aliasBase, nombreHoja, true);
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaColumna < 1) {
    throw new Error("La hoja " + nombreHoja + " no tiene cabeceras.");
  }

  const cabeceras = hoja
    .getRange(1, 1, 1, ultimaColumna)
    .getDisplayValues()[0];
  const mapa = crearMapaCabeceras(cabeceras);

  validarCabeceras(mapa, requeridas || [], nombreHoja);

  return {
    hoja: hoja,
    cabeceras: cabeceras,
    mapa: mapa,
    numeroColumnas: cabeceras.length
  };
}

/**
 * Convierte una fila de Sheets en un objeto con claves normalizadas.
 *
 * @param {Array<string>} cabeceras Cabeceras de la tabla.
 * @param {Array<*>} fila Valores de la fila.
 * @return {Object} Registro convertido.
 * @private
 */
function filaAObjetoMotor_(cabeceras, fila) {
  const objeto = {};
  const encabezados = Array.isArray(cabeceras) ? cabeceras : [];
  const valores = Array.isArray(fila) ? fila : [];

  encabezados.forEach(function(cabecera, indice) {
    const clave = normalizarClaveMotor_(cabecera);

    if (clave) {
      objeto[clave] = valores[indice];
    }
  });

  return objeto;
}

/**
 * Convierte un objeto en una fila respetando el orden de las cabeceras.
 *
 * Si se recibe filaBase, únicamente se reemplazan los campos presentes en el
 * objeto y se conservan los valores no enviados. Esto permite actualizaciones
 * parciales sin borrar columnas.
 *
 * @param {Array<string>} cabeceras Cabeceras de la tabla.
 * @param {Object} objeto Datos a escribir.
 * @param {Array<*>=} filaBase Fila existente para actualización parcial.
 * @return {Array<*>} Fila lista para setValues().
 * @private
 */
function objetoAFilaMotor_(cabeceras, objeto, filaBase) {
  const encabezados = Array.isArray(cabeceras) ? cabeceras : [];
  const fila = Array.isArray(filaBase) ?
    filaBase.slice(0, encabezados.length) :
    new Array(encabezados.length).fill("");
  const datos = objeto && typeof objeto === "object" ? objeto : {};
  const mapaObjeto = {};

  Object.keys(datos).forEach(function(clave) {
    mapaObjeto[normalizarClaveMotor_(clave)] = datos[clave];
  });

  encabezados.forEach(function(cabecera, indice) {
    const clave = normalizarClaveMotor_(cabecera);

    if (clave && Object.prototype.hasOwnProperty.call(mapaObjeto, clave)) {
      fila[indice] = mapaObjeto[clave];
    }
  });

  return fila;
}

/**
 * Lee una tabla completa y devuelve objetos con la propiedad técnica __FILA.
 *
 * @param {string} aliasBase CONFIG, SECURITY u OPERATION.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @param {Object=} opciones Opciones:
 *   - usarValoresMostrados: utiliza getDisplayValues() en lugar de getValues().
 *   - incluirFilasVacias: incluye filas completamente vacías.
 * @return {Array<Object>} Registros de la tabla.
 * @private
 */
function leerTablaMotor_(aliasBase, nombreHoja, opciones) {
  const config = opciones || {};
  const contexto = obtenerContextoTablaMotor_(aliasBase, nombreHoja, []);
  const ultimaFila = contexto.hoja.getLastRow();

  if (ultimaFila < 2) {
    return [];
  }

  const rango = contexto.hoja.getRange(
    2,
    1,
    ultimaFila - 1,
    contexto.numeroColumnas
  );
  const datos = config.usarValoresMostrados ?
    rango.getDisplayValues() :
    rango.getValues();
  const registros = [];

  datos.forEach(function(fila, indice) {
    if (!config.incluirFilasVacias && esFilaVaciaMotor_(fila)) {
      return;
    }

    const objeto = filaAObjetoMotor_(contexto.cabeceras, fila);
    objeto.__FILA = indice + 2;
    registros.push(objeto);
  });

  return registros;
}

/**
 * Busca una fila dentro de un contexto ya cargado.
 *
 * Esta función evita volver a leer cabeceras durante guardarObjetoMotor_().
 *
 * @param {Object} contexto Contexto generado por obtenerContextoTablaMotor_().
 * @param {string} campo Campo clave.
 * @param {*} valor Valor buscado.
 * @param {Object=} opciones Opciones:
 *   - normalizar: compara con normalizarTexto().
 * @return {number} Número de fila de Sheets o 0.
 * @private
 */
function buscarFilaEnContextoMotor_(contexto, campo, valor, opciones) {
  const config = opciones || {};
  const claveCampo = normalizarClaveMotor_(campo);
  const indiceColumna = contexto.mapa[claveCampo];

  if (typeof indiceColumna !== "number") {
    throw new Error("No existe la columna " + campo + " en la tabla.");
  }

  const ultimaFila = contexto.hoja.getLastRow();

  if (ultimaFila < 2) {
    return 0;
  }

  const valores = contexto.hoja
    .getRange(2, indiceColumna + 1, ultimaFila - 1, 1)
    .getDisplayValues();
  const buscado = String(valor === null || valor === undefined ? "" : valor).trim();
  const buscadoComparable = config.normalizar ? normalizarTexto(buscado) : buscado;

  for (let i = 0; i < valores.length; i++) {
    const actual = String(valores[i][0] || "").trim();
    const actualComparable = config.normalizar ? normalizarTexto(actual) : actual;

    if (actualComparable === buscadoComparable) {
      return i + 2;
    }
  }

  return 0;
}

/**
 * Busca una fila por el valor de una columna.
 *
 * @param {string} aliasBase CONFIG, SECURITY u OPERATION.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @param {string} campo Columna de búsqueda.
 * @param {*} valor Valor buscado.
 * @param {Object=} opciones Opciones de comparación.
 * @return {number} Número de fila o 0 si no existe.
 * @private
 */
function buscarFilaPorCampoMotor_(aliasBase, nombreHoja, campo, valor, opciones) {
  const contexto = obtenerContextoTablaMotor_(aliasBase, nombreHoja, [campo]);
  return buscarFilaEnContextoMotor_(contexto, campo, valor, opciones);
}

/**
 * Inserta o actualiza un objeto utilizando una columna como clave única.
 *
 * Comportamiento:
 * - Si la clave ya existe, actualiza solo los campos enviados.
 * - Si no existe, agrega una fila nueva.
 * - Si la clave está vacía, detiene la operación para evitar duplicados.
 *
 * Esta operación no incorpora un bloqueo por sí misma. Las acciones que puedan
 * ejecutarse concurrentemente deben envolverse en el bloqueo del servicio o
 * motor correspondiente, especialmente las cargas y cambios de permisos.
 *
 * @param {string} aliasBase CONFIG, SECURITY u OPERATION.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @param {string} campoClave Columna que identifica al registro.
 * @param {Object} objeto Datos a guardar.
 * @return {{creado:boolean, fila:number, campoClave:string, valorClave:*}}
 * @private
 */
function guardarObjetoMotor_(aliasBase, nombreHoja, campoClave, objeto) {
  if (!objeto || typeof objeto !== "object" || Array.isArray(objeto)) {
    throw new Error("guardarObjetoMotor_ requiere un objeto de datos válido.");
  }

  const contexto = obtenerContextoTablaMotor_(aliasBase, nombreHoja, [campoClave]);
  const valorClave = obtenerValorObjetoMotor_(objeto, campoClave);

  if (
    valorClave === null ||
    valorClave === undefined ||
    String(valorClave).trim() === ""
  ) {
    throw new Error(
      "No se puede guardar en " + nombreHoja +
      " porque el campo clave " + campoClave + " está vacío."
    );
  }

  const numeroFila = buscarFilaEnContextoMotor_(
    contexto,
    campoClave,
    valorClave,
    { normalizar: false }
  );

  if (numeroFila) {
    const rango = contexto.hoja.getRange(
      numeroFila,
      1,
      1,
      contexto.numeroColumnas
    );
    const actual = rango.getValues()[0];
    const filaActualizada = objetoAFilaMotor_(contexto.cabeceras, objeto, actual);

    rango.setValues([filaActualizada]);
    marcarRevisionDatosMotor_(aliasBase, nombreHoja);

    return {
      creado: false,
      fila: numeroFila,
      campoClave: normalizarClaveMotor_(campoClave),
      valorClave: valorClave
    };
  }

  const filaNueva = objetoAFilaMotor_(contexto.cabeceras, objeto);
  const filaDestino = contexto.hoja.getLastRow() + 1;

  contexto.hoja
    .getRange(filaDestino, 1, 1, filaNueva.length)
    .setValues([filaNueva]);

  marcarRevisionDatosMotor_(aliasBase, nombreHoja);

  return {
    creado: true,
    fila: filaDestino,
    campoClave: normalizarClaveMotor_(campoClave),
    valorClave: valorClave
  };
}
