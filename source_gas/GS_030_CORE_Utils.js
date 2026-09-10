/**
 * SGT360 — Utilidades generales del motor
 *
 * Responsabilidad:
 * Reúne funciones pequeñas y reutilizables para normalización, cabeceras,
 * identificadores, conversiones, paginación, CSV y serialización segura.
 *
 * Dependencias:
 * - Utilities (servicio nativo de Apps Script).
 *
 * Uso:
 * - Las funciones sin guion bajo final se conservan públicas por compatibilidad.
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Este archivo debe existir antes de utilizar Data, Audit, Cache o los módulos.
 */

const CORE_UTILS_SGT360 = Object.freeze({
  TAMANO_PAGINA_PREDETERMINADO: 25,
  TAMANO_PAGINA_MAXIMO: 200,
  PREFIJO_ID_PREDETERMINADO: "ID"
});

/**
 * Convierte cualquier valor en texto normalizado para comparaciones internas.
 *
 * Ejemplo:
 *   normalizarTexto("  Administración ") // "ADMINISTRACION"
 *
 * @param {*} valor Valor de entrada.
 * @return {string} Texto sin espacios externos, en mayúsculas y sin tildes.
 */
function normalizarTexto(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza una dirección de correo para búsquedas y validaciones.
 *
 * @param {*} valor Correo recibido.
 * @return {string} Correo en minúsculas y sin espacios externos.
 */
function normalizarCorreo(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .trim()
    .toLowerCase();
}

/**
 * Genera una clave técnica estable para cabeceras y propiedades.
 *
 * Ejemplo:
 *   normalizarClaveMotor_("Fecha de actualización")
 *   // "FECHA_DE_ACTUALIZACION"
 *
 * @param {*} valor Valor a convertir.
 * @return {string} Clave alfanumérica en mayúsculas y separada por guiones bajos.
 * @private
 */
function normalizarClaveMotor_(valor) {
  return normalizarTexto(valor)
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Limpia un texto y, opcionalmente, limita su longitud.
 *
 * @param {*} valor Valor recibido.
 * @param {number=} maximo Longitud máxima permitida.
 * @return {string} Texto limpio.
 * @private
 */
function limpiarTextoMotor_(valor, maximo) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  const limite = Number(maximo);

  if (!Number.isFinite(limite) || limite <= 0) {
    return texto;
  }

  return texto.slice(0, Math.floor(limite));
}

/**
 * Construye un mapa CABECERA_NORMALIZADA -> índice de columna.
 *
 * El índice es base cero porque se utiliza directamente sobre arreglos.
 * Las cabeceras vacías se omiten.
 *
 * @param {Array<*>} cabeceras Fila de cabeceras.
 * @return {Object<string, number>} Mapa de posiciones.
 */
function crearMapaCabeceras(cabeceras) {
  const mapa = {};

  (Array.isArray(cabeceras) ? cabeceras : []).forEach(function(cabecera, indice) {
    const clave = normalizarClaveMotor_(cabecera);

    if (clave) {
      mapa[clave] = indice;
    }
  });

  return mapa;
}

/**
 * Valida que un mapa de cabeceras contenga todas las columnas requeridas.
 *
 * Corrección aplicada:
 * El archivo original normalizaba las cabeceras del mapa con guiones bajos,
 * pero validaba las requeridas sin aplicar la misma regla. Esta versión utiliza
 * normalizarClaveMotor_() en ambos lados.
 *
 * @param {Object<string, number>} mapa Mapa generado por crearMapaCabeceras().
 * @param {Array<string>} requeridas Cabeceras obligatorias.
 * @param {string=} nombreHoja Nombre usado en el mensaje de error.
 * @return {true}
 * @throws {Error} Cuando falta una o más cabeceras.
 */
function validarCabeceras(mapa, requeridas, nombreHoja) {
  const mapaSeguro = mapa && typeof mapa === "object" ? mapa : {};
  const faltantes = (Array.isArray(requeridas) ? requeridas : []).filter(function(cabecera) {
    const clave = normalizarClaveMotor_(cabecera);
    return !clave || typeof mapaSeguro[clave] !== "number";
  });

  if (faltantes.length) {
    throw new Error(
      "La hoja " + (nombreHoja || "sin nombre") +
      " no contiene las cabeceras requeridas: " + faltantes.join(", ") + "."
    );
  }

  return true;
}

/**
 * Genera un identificador único con un prefijo reconocible.
 *
 * Ejemplo:
 *   generarIdMotor_("USR") // "USR-...UUID..."
 *
 * @param {string=} prefijo Prefijo funcional.
 * @return {string} Identificador único.
 * @private
 */
function generarIdMotor_(prefijo) {
  const prefijoSeguro = normalizarClaveMotor_(
    prefijo || CORE_UTILS_SGT360.PREFIJO_ID_PREDETERMINADO
  ) || CORE_UTILS_SGT360.PREFIJO_ID_PREDETERMINADO;

  return prefijoSeguro + "-" + Utilities.getUuid().toUpperCase();
}

/**
 * Convierte representaciones frecuentes de verdadero/falso a booleano.
 *
 * Se consideran verdaderos: true, 1, SI, SÍ, TRUE, ACTIVO y PERMITIDO.
 * Cualquier otro valor devuelve false.
 *
 * @param {*} valor Valor de origen.
 * @return {boolean}
 * @private
 */
function convertirBooleanoMotor_(valor) {
  if (valor === true || valor === 1) {
    return true;
  }

  return ["SI", "TRUE", "1", "ACTIVO", "PERMITIDO"]
    .indexOf(normalizarTexto(valor)) !== -1;
}

/**
 * Convierte un valor a Date sin lanzar error por fechas inválidas.
 *
 * Admite:
 * - Objetos Date.
 * - Marcas de tiempo numéricas.
 * - Fechas ISO reconocidas por JavaScript.
 * - Texto en formato dd/mm/aaaa o dd-mm-aaaa.
 *
 * @param {*} valor Valor a convertir.
 * @return {Date|null} Fecha válida o null.
 * @private
 */
function convertirFechaMotor_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  }

  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    const fechaNumerica = new Date(valor);
    return Number.isNaN(fechaNumerica.getTime()) ? null : fechaNumerica;
  }

  const texto = String(valor).trim();
  const formatoDiaMesAno = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (formatoDiaMesAno) {
    const dia = Number(formatoDiaMesAno[1]);
    const mes = Number(formatoDiaMesAno[2]);
    const ano = Number(formatoDiaMesAno[3]);
    const fechaLocal = new Date(ano, mes - 1, dia);

    if (
      fechaLocal.getFullYear() === ano &&
      fechaLocal.getMonth() === mes - 1 &&
      fechaLocal.getDate() === dia
    ) {
      return fechaLocal;
    }

    return null;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Divide un arreglo en páginas y devuelve metadatos de navegación.
 *
 * @param {Array<*>} registros Registros completos.
 * @param {number=} pagina Página solicitada, iniciando en 1.
 * @param {number=} tamano Cantidad por página.
 * @return {{registros:Array<*>, paginacion:Object}}
 * @private
 */
function paginarArregloMotor_(registros, pagina, tamano) {
  const lista = Array.isArray(registros) ? registros : [];
  const tamanoSolicitado = Number(tamano);
  const pageSize = Math.max(
    1,
    Math.min(
      Number.isFinite(tamanoSolicitado) && tamanoSolicitado > 0 ?
        Math.floor(tamanoSolicitado) :
        CORE_UTILS_SGT360.TAMANO_PAGINA_PREDETERMINADO,
      CORE_UTILS_SGT360.TAMANO_PAGINA_MAXIMO
    )
  );

  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaSolicitada = Number(pagina);
  const currentPage = Math.max(
    1,
    Math.min(
      Number.isFinite(paginaSolicitada) && paginaSolicitada > 0 ?
        Math.floor(paginaSolicitada) : 1,
      totalPaginas
    )
  );
  const inicio = (currentPage - 1) * pageSize;

  return {
    registros: lista.slice(inicio, inicio + pageSize),
    paginacion: {
      pagina: currentPage,
      tamano: pageSize,
      total: total,
      totalPaginas: totalPaginas
    }
  };
}

/**
 * Compara dos textos normalizados para ordenamiento alfabético en español.
 *
 * @param {*} a Primer valor.
 * @param {*} b Segundo valor.
 * @return {number} Resultado compatible con Array.sort().
 * @private
 */
function compararTextoMotor_(a, b) {
  return normalizarTexto(a).localeCompare(normalizarTexto(b), "es");
}

/**
 * Protege textos CSV que podrían interpretarse como fórmulas en Excel.
 *
 * Solo se modifica el valor cuando originalmente es texto y comienza con
 * =, +, - o @. Los números reales no se alteran.
 *
 * @param {*} valor Valor de la celda.
 * @return {*} Valor seguro.
 * @private
 */
function protegerFormulaCsvMotor_(valor) {
  if (typeof valor !== "string") {
    return valor;
  }

  return /^[=+\-@]/.test(valor.trimStart()) ? "'" + valor : valor;
}

/**
 * Escapa una celda para CSV.
 *
 * @param {*} valor Valor de la celda.
 * @param {boolean=} protegerFormulas Indica si se protege contra fórmulas.
 * @return {string} Celda CSV escapada.
 * @private
 */
function escaparCsvMotor_(valor, protegerFormulas) {
  const valorSeguro = protegerFormulas === false ? valor : protegerFormulaCsvMotor_(valor);
  const texto = String(valorSeguro === null || valorSeguro === undefined ? "" : valorSeguro);

  return /[",\n\r]/.test(texto) ?
    '"' + texto.replace(/"/g, '""') + '"' :
    texto;
}

/**
 * Construye un archivo CSV con BOM UTF-8 para mejorar la apertura en Excel.
 *
 * @param {Array<*>} cabeceras Cabeceras del archivo.
 * @param {Array<Array<*>>} filas Filas de datos.
 * @param {Object=} opciones Configuración opcional:
 *   - separador: "," por defecto.
 *   - protegerFormulas: true por defecto.
 * @return {string} Contenido completo del CSV.
 * @private
 */
function construirCsvMotor_(cabeceras, filas, opciones) {
  const config = opciones || {};
  const separador = String(config.separador || ",").charAt(0) || ",";
  const protegerFormulas = config.protegerFormulas !== false;
  const encabezados = Array.isArray(cabeceras) ? cabeceras : [];
  const registros = Array.isArray(filas) ? filas : [];
  const lineas = [
    encabezados.map(function(valor) {
      return escaparCsvMotor_(valor, protegerFormulas);
    }).join(separador)
  ];

  registros.forEach(function(fila) {
    const filaSegura = Array.isArray(fila) ? fila : [];
    lineas.push(
      filaSegura.map(function(valor) {
        return escaparCsvMotor_(valor, protegerFormulas);
      }).join(separador)
    );
  });

  return "\uFEFF" + lineas.join("\r\n");
}

/**
 * Serializa un objeto para insertarlo de forma segura en una plantilla HTML.
 *
 * Evita que caracteres como <, > o & puedan cerrar etiquetas o alterar el DOM.
 *
 * @param {*} objeto Objeto a serializar.
 * @return {string} JSON seguro para HTML.
 * @private
 */
function serializarSeguroHtml_(objeto) {
  const json = JSON.stringify(objeto === undefined ? {} : objeto) || "{}";

  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Obtiene una propiedad de un objeto aceptando claves exactas o normalizadas.
 *
 * Esta función permite que Data reciba tanto ID_USUARIO como idUsuario o
 * "Id Usuario", sin duplicar lógica de búsqueda.
 *
 * @param {Object} objeto Objeto de origen.
 * @param {string} claveBuscada Clave requerida.
 * @return {*} Valor encontrado o undefined.
 * @private
 */
function obtenerValorObjetoMotor_(objeto, claveBuscada) {
  if (!objeto || typeof objeto !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(objeto, claveBuscada)) {
    return objeto[claveBuscada];
  }

  const claveNormalizada = normalizarClaveMotor_(claveBuscada);
  const claves = Object.keys(objeto);

  for (let i = 0; i < claves.length; i++) {
    if (normalizarClaveMotor_(claves[i]) === claveNormalizada) {
      return objeto[claves[i]];
    }
  }

  return undefined;
}

/**
 * Determina si una fila está completamente vacía.
 *
 * @param {Array<*>} fila Fila de datos.
 * @return {boolean}
 * @private
 */
function esFilaVaciaMotor_(fila) {
  return !Array.isArray(fila) || fila.every(function(valor) {
    return valor === null || valor === undefined || String(valor).trim() === "";
  });
}
