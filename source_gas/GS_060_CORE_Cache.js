/**
 * SGT360 — Caché de configuración y seguridad
 *
 * Responsabilidad:
 * Reduce lecturas repetitivas de Google Sheets para configuraciones, módulos,
 * roles, permisos, catálogos y recursos visuales.
 *
 * Dependencias:
 * - GS_030_CORE_Utils.gs: normalizarTexto() y normalizarClaveMotor_().
 * - CacheService (servicio nativo de Apps Script).
 *
 * Consideraciones:
 * - La caché no reemplaza a las bases; solo conserva copias temporales.
 * - CacheService puede expulsar valores antes del tiempo solicitado.
 * - Los datos críticos siempre deben poder reconstruirse desde Sheets.
 */

const CACHE_MOTOR_SGT360 = Object.freeze({
  TTL_PREDETERMINADO_SEGUNDOS: 300,
  TTL_MAXIMO_SEGUNDOS: 21600,
  TAMANO_MAXIMO_BYTES: 90000,
  CLAVES: Object.freeze({
    CONFIG: "SGT360_CFG",
    MODULOS: "SGT360_MODULES",
    RECURSOS: "SGT360_RESOURCES",
    USUARIOS: "SGT360_USERS",
    ROLES: "SGT360_ROLES",
    PERMISOS: "SGT360_PERMISSIONS",
    CATALOGOS: "SGT360_CATALOGS",
    PARAMETROS: "SGT360_PARAMETERS",
    RECURSOS_VISUALES: "SGT360_VISUAL_RESOURCES"
  })
});

/**
 * Normaliza una clave para CacheService.
 *
 * @param {*} clave Clave original.
 * @return {string} Clave segura.
 * @private
 */
function normalizarClaveCacheMotor_(clave) {
  const texto = String(clave === null || clave === undefined ? "" : clave).trim();

  if (!texto) {
    throw new Error("La clave de caché no puede estar vacía.");
  }

  return texto
    .replace(/[^A-Za-z0-9_:\-.]/g, "_")
    .slice(0, 240);
}

/**
 * Construye una clave consistente para datos cacheados por grupo o entidad.
 *
 * Ejemplo:
 *   construirClaveCacheMotor_("MODULO", "PEDIDOS")
 *   // "SGT360_MODULO_PEDIDOS"
 *
 * @param {string} grupo Grupo funcional.
 * @param {string=} identificador Identificador opcional.
 * @return {string} Clave completa.
 * @private
 */
function construirClaveCacheMotor_(grupo, identificador) {
  const partes = ["SGT360", normalizarClaveMotor_(grupo || "CACHE")];

  if (identificador !== undefined && identificador !== null && String(identificador).trim()) {
    partes.push(normalizarClaveMotor_(identificador));
  }

  return normalizarClaveCacheMotor_(partes.filter(Boolean).join("_"));
}

/**
 * Obtiene y deserializa un valor JSON desde la caché del script.
 *
 * Si el JSON está corrupto, elimina la clave y devuelve null.
 *
 * @param {string} clave Clave de caché.
 * @return {*|null} Valor almacenado o null.
 * @private
 */
function obtenerCacheJsonMotor_(clave) {
  const claveSegura = normalizarClaveCacheMotor_(clave);
  const cache = CacheService.getScriptCache();
  const texto = cache.get(claveSegura);

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    cache.remove(claveSegura);
    console.warn("Se eliminó una entrada de caché inválida: %s", claveSegura);
    return null;
  }
}

/**
 * Serializa y guarda un valor JSON en la caché del script.
 *
 * El método devuelve false cuando el contenido supera el margen seguro de
 * 90 KB o no puede serializarse. Esto evita errores que interrumpan el flujo.
 *
 * @param {string} clave Clave de caché.
 * @param {*} valor Valor serializable.
 * @param {number=} segundos Duración solicitada.
 * @return {boolean} true si se almacenó correctamente.
 * @private
 */
function guardarCacheJsonMotor_(clave, valor, segundos) {
  const claveSegura = normalizarClaveCacheMotor_(clave);
  let texto;

  try {
    texto = JSON.stringify(valor);
  } catch (errorSerializacion) {
    console.warn("No se pudo serializar la caché %s: %s", claveSegura, errorSerializacion.message);
    return false;
  }

  if (texto === undefined) {
    return false;
  }

  const tamanoBytes = Utilities.newBlob(texto).getBytes().length;

  if (tamanoBytes > CACHE_MOTOR_SGT360.TAMANO_MAXIMO_BYTES) {
    console.warn(
      "La entrada %s no se guardó porque ocupa %s bytes.",
      claveSegura,
      tamanoBytes
    );
    return false;
  }

  const ttlSolicitado = Number(segundos);
  const ttl = Math.max(
    1,
    Math.min(
      Number.isFinite(ttlSolicitado) && ttlSolicitado > 0 ?
        Math.floor(ttlSolicitado) :
        CACHE_MOTOR_SGT360.TTL_PREDETERMINADO_SEGUNDOS,
      CACHE_MOTOR_SGT360.TTL_MAXIMO_SEGUNDOS
    )
  );

  try {
    CacheService.getScriptCache().put(claveSegura, texto, ttl);
    return true;
  } catch (errorCache) {
    console.warn("No se pudo guardar la caché %s: %s", claveSegura, errorCache.message);
    return false;
  }
}

/**
 * Elimina una clave específica de la caché.
 *
 * @param {string} clave Clave a eliminar.
 * @return {true}
 * @private
 */
function eliminarCacheMotor_(clave) {
  CacheService.getScriptCache().remove(normalizarClaveCacheMotor_(clave));
  return true;
}

/**
 * Devuelve un valor cacheado o lo construye cuando todavía no existe.
 *
 * @param {string} clave Clave de caché.
 * @param {Function} constructor Función sin argumentos que obtiene el dato real.
 * @param {number=} segundos Duración de la caché.
 * @return {*} Valor cacheado o recién construido.
 * @private
 */
function obtenerOConstruirCacheMotor_(clave, constructor, segundos) {
  const existente = obtenerCacheJsonMotor_(clave);

  if (existente !== null) {
    return existente;
  }

  if (typeof constructor !== "function") {
    throw new Error("Se requiere una función constructora para reconstruir la caché.");
  }

  const nuevoValor = constructor();
  guardarCacheJsonMotor_(clave, nuevoValor, segundos);
  return nuevoValor;
}

/**
 * Invalida grupos conocidos de caché después de modificar datos.
 *
 * Grupos disponibles:
 * - CONFIG: parámetros, módulos, catálogos y recursos visuales.
 * - SECURITY: usuarios, roles, permisos, módulos y recursos.
 * - ALL: todas las claves conocidas.
 *
 * @param {string=} grupo Grupo a limpiar.
 * @return {Array<string>} Claves eliminadas.
 * @private
 */
function invalidarCacheMotor_(grupo) {
  const k = CACHE_MOTOR_SGT360.CLAVES;
  const grupos = {
    CONFIG: [
      k.CONFIG,
      k.MODULOS,
      k.CATALOGOS,
      k.PARAMETROS,
      k.RECURSOS_VISUALES
    ],
    SECURITY: [
      k.USUARIOS,
      k.ROLES,
      k.PERMISOS,
      k.MODULOS,
      k.RECURSOS
    ],
    ALL: [
      k.CONFIG,
      k.MODULOS,
      k.RECURSOS,
      k.USUARIOS,
      k.ROLES,
      k.PERMISOS,
      k.CATALOGOS,
      k.PARAMETROS,
      k.RECURSOS_VISUALES
    ]
  };
  const grupoSeguro = normalizarTexto(grupo || "ALL");
  const claves = grupos[grupoSeguro] || grupos.ALL;

  CacheService.getScriptCache().removeAll(claves);
  return claves.slice();
}
