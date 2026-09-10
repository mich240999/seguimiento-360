/**
 * SGT360 — Módulo Ventas al contado
 *
 * Responsabilidad:
 * Registra ventas al contado desde un formulario condicional, resuelve el alcance
 * comercial del usuario, consulta materiales/precios vigentes y permite descargar
 * el consolidado en formato compatible con Excel.
 *
 * Paso 27A:
 * - Cliente Cálidda / no Cálidda.
 * - Entrega en cuenta contrato o dirección alternativa.
 * - Oficina y grupo según asignación del usuario.
 * - Grupo siempre depende de oficina; oficina puede operar sin grupo.
 * - Si no existe oficina válida, se usa alcance general de materiales/precios.
 * - Materiales filtrados por tipo y precio vigente.
 * - Cabecera + detalle de venta.
 * - Exportación "Ventas al contado" filtrada.
 *
 * Paso 27B:
 * - Vista principal enfocada en ventas registradas.
 * - Nueva venta desde modal guiado y selector inicial de gasodoméstico.
 * - Adjunta comprobante de pago y lo registra en Drive.
 * - Proveedor visualiza ventas asociadas a sus materiales/precios y confirma abono.
 *
 * Paso 29D:
 * - Validación de abono con lectura más ágil desde la consola.
 * - Gestión de entrega con estado Programada y fecha de programación.
 * - Datos de venta visibles al abrir la gestión de entrega.
 *
 * Paso 29F:
 * - Gestión de entrega enfocada al proveedor con estados Pendiente/Programada/Observada/Entregada.
 * - Evidencia específica para observaciones y evidencias de entrega por estado.
 * - Anulación de venta observada restringida al usuario responsable de la venta.
 *
 * Paso 29E:
 * - Aprobar/observar abono usa una lectura ligera de la venta.
 * - Recupera proveedor-material desde PRE_LISTAS_PRECIOS / PRE_LISTA_PRECIO_DETALLE.
 * - Paso 29G: fallback histórico por Material + Precio + Alcance y revisión ligera para cache de vistas.
 * - La consola del proveedor recibe únicamente sus líneas/productos de entrega.
 *
 * Paso 29J:
 * - PROGRAMADA forma parte del estado global visible de la venta.
 * - El detalle de la venta expone el estado de entrega de cada material.
 * - El estado de cada material se obtiene de la gestión del proveedor asociado a su precio.
 */



/* =========================================================
 * Paso 30E — Índice rápido compartido de Ventas
 * ========================================================= */

const VENTAS_CONTADO_INDICE_29Y_ = Object.freeze({
  META_KEY: "VTA29Y_IDX_META",
  CHUNK_PREFIX: "VTA29Y_IDX_",
  DETAIL_PREFIX: "VTA29Y_DET_",
  DIRTY_PROPERTY: "VTA29Y_IDX_DIRTY",
  TRIGGER_FUNCTION: "mantenerIndiceVentasPaso29Y",
  CHUNK_SIZE: 75000,
  INLINE_JSON_MAX_BYTES: 70000,
  MAX_DETAIL_SIZE: 90000,
  TTL_SECONDS: 21600,
  MAX_DETALLES_PRECARGADOS: 40,
  EDAD_REFRESCO_MS: 10 * 60 * 1000
});

var VENTAS_CONTADO_INDICE_MEMORIA_29Y_ = null;

function obtenerCacheIndiceVentasPaso29Y_() {
  return CacheService.getScriptCache();
}

function invalidarCacheVentasContadoPaso29Y_() {
  invalidarCacheMotor_("VENTAS_CONTADO");
  marcarIndiceVentasSucioPaso29Y_();
}

function marcarIndiceVentasSucioPaso29Y_() {
  try {
    PropertiesService
      .getScriptProperties()
      .setProperty(
        VENTAS_CONTADO_INDICE_29Y_.DIRTY_PROPERTY,
        String(Date.now())
      );
  } catch (error) {
    console.warn(
      "No se pudo marcar el índice de Ventas como pendiente: " +
      (
        error && error.message
          ? error.message
          : String(error)
      )
    );
  }
}

function limpiarMarcaIndiceVentasSucioPaso29Y_() {
  PropertiesService
    .getScriptProperties()
    .deleteProperty(
      VENTAS_CONTADO_INDICE_29Y_.DIRTY_PROPERTY
    );
}

function indiceVentasEstaSucioPaso29Y_() {
  return Boolean(
    PropertiesService
      .getScriptProperties()
      .getProperty(
        VENTAS_CONTADO_INDICE_29Y_.DIRTY_PROPERTY
      )
  );
}

function comprimirValorVentasPaso29Y_(valor) {
  const json =
    JSON.stringify(valor);

  const gzip =
    Utilities.gzip(
      Utilities.newBlob(
        json,
        "application/json",
        "ventas29y.json"
      )
    );

  return Utilities.base64Encode(
    gzip.getBytes()
  );
}

function descomprimirValorVentasPaso29Y_(texto) {
  const bytes =
    Utilities.base64Decode(
      String(texto || "")
    );

  // Paso 30E:
  // Utilities.ungzip requiere un Blob con contentType no nulo.
  const gzipBlob =
    Utilities.newBlob(
      bytes,
      "application/gzip",
      "ventas30e.json.gz"
    );

  const blob =
    Utilities.ungzip(
      gzipBlob
    );

  return JSON.parse(
    blob.getDataAsString("UTF-8")
  );
}

function leerMetaIndiceVentasPaso29Y_() {
  const texto =
    obtenerCacheIndiceVentasPaso29Y_()
      .get(
        VENTAS_CONTADO_INDICE_29Y_.META_KEY
      );

  if (!texto) return null;

  try {
    return JSON.parse(texto);
  } catch (error) {
    return null;
  }
}

function limpiarChunksIndiceVentasPaso29Y_(
  cantidadAnterior
) {
  const cache =
    obtenerCacheIndiceVentasPaso29Y_();

  const total =
    Number(cantidadAnterior || 0);

  for (let i = 0; i < total; i++) {
    cache.remove(
      VENTAS_CONTADO_INDICE_29Y_
        .CHUNK_PREFIX + i
    );
  }
}

function guardarIndiceVentasPaso29Y_(
  payload
) {
  const cache =
    obtenerCacheIndiceVentasPaso29Y_();

  const metaAnterior =
    leerMetaIndiceVentasPaso29Y_();

  const json =
    JSON.stringify(
      payload
    );

  const bytesJson =
    Utilities
      .newBlob(
        json,
        "application/json"
      )
      .getBytes()
      .length;

  const metaBase = {
    version:
      String(
        payload.version || "30E"
      ),
    estructura:
      String(
        payload.estructura ||
        "RESUMEN_BANDEJAS"
      ),
    revision:
      String(
        payload.revision || ""
      ),
    generadoEn:
      String(
        payload.generadoEn || ""
      ),
    totalVentas:
      Number(
        payload.ventas &&
        payload.ventas.length ||
        0
      )
  };

  // Paso 30E:
  // Si el índice cabe cómodamente en una entrada de CacheService,
  // se guarda completo dentro del mismo META.
  //
  // Resultado:
  // 1 cache.get()
  // 0 Base64
  // 0 GZIP
  // 0 getAll()
  // 0 chunks
  if (
    bytesJson <=
    VENTAS_CONTADO_INDICE_29Y_
      .INLINE_JSON_MAX_BYTES
  ) {
    const metaInline =
      Object.assign(
        {},
        metaBase,
        {
          almacenamiento:
            "INLINE_JSON",
          chunks: 0,
          bytesJson:
            bytesJson,
          payload:
            payload
        }
      );

    cache.put(
      VENTAS_CONTADO_INDICE_29Y_
        .META_KEY,
      JSON.stringify(metaInline),
      VENTAS_CONTADO_INDICE_29Y_
        .TTL_SECONDS
    );

    if (
      metaAnterior &&
      Number(
        metaAnterior.chunks || 0
      ) > 0
    ) {
      limpiarChunksIndiceVentasPaso29Y_(
        metaAnterior.chunks
      );
    }

    VENTAS_CONTADO_INDICE_MEMORIA_29Y_ = {
      meta:
        metaInline,
      payload:
        payload
    };

    return metaInline;
  }

  // Solo índices mayores usan GZIP + chunks.
  const comprimido =
    comprimirValorVentasPaso29Y_(
      payload
    );

  const tamano =
    VENTAS_CONTADO_INDICE_29Y_
      .CHUNK_SIZE;

  const chunks = [];

  for (
    let i = 0;
    i < comprimido.length;
    i += tamano
  ) {
    chunks.push(
      comprimido.substring(
        i,
        i + tamano
      )
    );
  }

  const mapaChunks = {};

  chunks.forEach(function(
    parte,
    indice
  ) {
    mapaChunks[
      VENTAS_CONTADO_INDICE_29Y_
        .CHUNK_PREFIX +
      indice
    ] = parte;
  });

  if (chunks.length) {
    cache.putAll(
      mapaChunks,
      VENTAS_CONTADO_INDICE_29Y_
        .TTL_SECONDS
    );
  }

  if (
    metaAnterior &&
    Number(
      metaAnterior.chunks || 0
    ) > chunks.length
  ) {
    for (
      let i = chunks.length;
      i <
      Number(
        metaAnterior.chunks || 0
      );
      i++
    ) {
      cache.remove(
        VENTAS_CONTADO_INDICE_29Y_
          .CHUNK_PREFIX +
        i
      );
    }
  }

  const meta =
    Object.assign(
      {},
      metaBase,
      {
        almacenamiento:
          "GZIP_CHUNKS",
        chunks:
          chunks.length,
        bytesJson:
          bytesJson,
        caracteresComprimidos:
          comprimido.length
      }
    );

  cache.put(
    VENTAS_CONTADO_INDICE_29Y_
      .META_KEY,
    JSON.stringify(meta),
    VENTAS_CONTADO_INDICE_29Y_
      .TTL_SECONDS
  );

  VENTAS_CONTADO_INDICE_MEMORIA_29Y_ = {
    meta: meta,
    payload: payload
  };

  return meta;
}

function leerIndiceVentasPaso29Y_() {
  const inicioTotal =
    Date.now();

  const meta =
    leerMetaIndiceVentasPaso29Y_();

  if (!meta) {
    return null;
  }

  if (
    VENTAS_CONTADO_INDICE_MEMORIA_29Y_ &&
    VENTAS_CONTADO_INDICE_MEMORIA_29Y_.meta &&
    VENTAS_CONTADO_INDICE_MEMORIA_29Y_
      .meta.generadoEn ===
      meta.generadoEn
  ) {
    return {
      meta: meta,
      payload:
        VENTAS_CONTADO_INDICE_MEMORIA_29Y_
          .payload,
      desactualizado:
        indiceVentasEstaSucioPaso29Y_(),
      lectura: {
        fuente:
          "MEMORIA_EJECUCION",
        totalMs:
          Date.now() - inicioTotal
      }
    };
  }

  if (
    String(
      meta.almacenamiento || ""
    ).toUpperCase() ===
      "INLINE_JSON" &&
    meta.payload
  ) {
    const payload =
      meta.payload;

    VENTAS_CONTADO_INDICE_MEMORIA_29Y_ = {
      meta: meta,
      payload: payload
    };

    return {
      meta: meta,
      payload: payload,
      desactualizado:
        indiceVentasEstaSucioPaso29Y_(),
      lectura: {
        fuente:
          "INLINE_JSON",
        totalMs:
          Date.now() - inicioTotal
      }
    };
  }

  const cache =
    obtenerCacheIndiceVentasPaso29Y_();

  const claves = [];

  for (
    let i = 0;
    i <
    Number(
      meta.chunks || 0
    );
    i++
  ) {
    claves.push(
      VENTAS_CONTADO_INDICE_29Y_
        .CHUNK_PREFIX +
      i
    );
  }

  const inicioChunks =
    Date.now();

  const mapa =
    claves.length
      ? cache.getAll(claves)
      : {};

  const chunksMs =
    Date.now() - inicioChunks;

  const partes = [];

  for (
    let i = 0;
    i < claves.length;
    i++
  ) {
    const parte =
      mapa[claves[i]];

    if (!parte) {
      return null;
    }

    partes.push(parte);
  }

  const inicioDescompresion =
    Date.now();

  let payload;

  try {
    payload =
      descomprimirValorVentasPaso29Y_(
        partes.join("")
      );
  } catch (error) {
    console.error(
      "No se pudo descomprimir el índice de Ventas: %s",
      error &&
      error.message
        ? error.message
        : String(error)
    );

    return null;
  }

  const descompresionMs =
    Date.now() -
    inicioDescompresion;

  VENTAS_CONTADO_INDICE_MEMORIA_29Y_ = {
    meta: meta,
    payload: payload
  };

  return {
    meta: meta,
    payload: payload,
    desactualizado:
      indiceVentasEstaSucioPaso29Y_(),
    lectura: {
      fuente:
        "GZIP_CHUNKS",
      chunksMs:
        chunksMs,
      descompresionMs:
        descompresionMs,
      totalMs:
        Date.now() -
        inicioTotal
    }
  };
}

function claveDetalleIndiceVentasPaso29Y_(
  idVenta
) {
  return (
    VENTAS_CONTADO_INDICE_29Y_
      .DETAIL_PREFIX +
    String(idVenta || "").trim()
  );
}

function guardarPaqueteDetalleVentasPaso29Y_(
  paquete
) {
  if (
    !paquete ||
    !paquete.venta ||
    !paquete.venta.idVenta
  ) {
    return false;
  }

  try {
    const comprimido =
      comprimirValorVentasPaso29Y_(
        paquete
      );

    if (
      comprimido.length >
      VENTAS_CONTADO_INDICE_29Y_
        .MAX_DETAIL_SIZE
    ) {
      return false;
    }

    obtenerCacheIndiceVentasPaso29Y_()
      .put(
        claveDetalleIndiceVentasPaso29Y_(
          paquete.venta.idVenta
        ),
        comprimido,
        VENTAS_CONTADO_INDICE_29Y_
          .TTL_SECONDS
      );

    return true;
  } catch (error) {
    return false;
  }
}

function leerPaqueteDetalleVentasPaso29Y_(
  idVenta
) {
  if (indiceVentasEstaSucioPaso29Y_()) {
    return null;
  }

  const texto =
    obtenerCacheIndiceVentasPaso29Y_()
      .get(
        claveDetalleIndiceVentasPaso29Y_(
          idVenta
        )
      );

  if (!texto) return null;

  try {
    return descomprimirValorVentasPaso29Y_(
      texto
    );
  } catch (error) {
    return null;
  }
}


function resumirVentaIndicePaso30C_(
  venta
) {
  venta = venta || {};

  return {
    idVenta:
      venta.idVenta || "",

    codigoVenta:
      venta.codigoVenta || "",

    fechaRegistro:
      venta.fechaRegistro || "",

    fechaOrden:
      Number(
        venta.fechaOrden || 0
      ),

    tipoVenta:
      venta.tipoVenta || "",

    nombreTipoVenta:
      venta.nombreTipoVenta || "",

    idUsuario:
      venta.idUsuario || "",

    nombreUsuario:
      venta.nombreUsuario || "",

    idOficina:
      venta.idOficina || "",

    nombreOficina:
      venta.nombreOficina || "",

    idGrupo:
      venta.idGrupo || "",

    nombreGrupo:
      venta.nombreGrupo || "",

    tipoRegistro:
      venta.tipoRegistro || "COMERCIAL",

    estadoPrueba:
      venta.estadoPrueba || "",

    cuentaContrato:
      venta.cuentaContrato || "",

    dni:
      venta.dni || "",

    nombreCliente:
      venta.nombreCliente || "",

    telefono:
      venta.telefono || "",

    estadoAbono:
      venta.estadoAbono || "",

    estado:
      venta.estado || "",

    totalItems:
      Number(
        venta.totalItems || 0
      ),

    totalVenta:
      Number(
        venta.totalVenta || 0
      ),

    totalVentaVigente:
      Number(
        venta.totalVentaVigente ||
        venta.totalVenta ||
        0
      ),

    moneda:
      venta.moneda || "PEN",

    observacionConfirmacionAbono:
      venta.observacionConfirmacionAbono || "",

    idArchivoComprobante:
      venta.idArchivoComprobante || "",

    urlComprobante:
      venta.urlComprobante || "",

    nombreComprobante:
      venta.nombreComprobante || "",

    mimeComprobante:
      venta.mimeComprobante || "",

    estadoComprobantePagoCliente:
      venta.estadoComprobantePagoCliente || "",

    idArchivoDepositoProveedor:
      venta.idArchivoDepositoProveedor || "",

    urlDepositoProveedor:
      venta.urlDepositoProveedor || "",

    nombreDepositoProveedor:
      venta.nombreDepositoProveedor || "",

    mimeDepositoProveedor:
      venta.mimeDepositoProveedor || "",

    estadoDepositoProveedor:
      venta.estadoDepositoProveedor || "",

    idArchivoBoletaVentaCliente:
      venta.idArchivoBoletaVentaCliente || "",

    urlBoletaVentaCliente:
      venta.urlBoletaVentaCliente || "",

    nombreBoletaVentaCliente:
      venta.nombreBoletaVentaCliente || "",

    mimeBoletaVentaCliente:
      venta.mimeBoletaVentaCliente || "",

    estadoBoletaVentaCliente:
      venta.estadoBoletaVentaCliente || ""
  };
}

function construirIndiceVentasPaso29Y_() {
  const inicio = Date.now();

  limpiarCacheEjecucionVentasPaso29P_();

  const cabecerasRaw =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360
        .HOJAS.CABECERA
    );

  const detallesRaw =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360
        .HOJAS.DETALLE
    );

  const gestionesRaw =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360
        .HOJAS.GESTION_ENTREGA
    );

  const evidenciasRaw =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360
        .HOJAS.EVIDENCIAS_ENTREGA
    );

  const ventasCompletas =
    cabecerasRaw
      .map(mapearVentaContado_)
      .sort(function(a, b) {
        return (
          Number(b.fechaOrden || 0) -
          Number(a.fechaOrden || 0)
        );
      });

  const detalles =
    detallesRaw
      .filter(function(row) {
        return (
          normalizarTexto(
            row.ESTADO ||
            CONFIG.ESTADOS.ACTIVO
          ) === CONFIG.ESTADOS.ACTIVO
        );
      })
      .map(mapearDetalleVentaContado_);

  const gestiones =
    gestionesRaw
      .map(
        mapearGestionEntregaVentaContadoPaso29A_
      );

  const evidencias =
    evidenciasRaw
      .filter(function(row) {
        return (
          normalizarTexto(
            row.ESTADO ||
            CONFIG.ESTADOS.ACTIVO
          ) === CONFIG.ESTADOS.ACTIVO
        );
      })
      .map(
        mapearEvidenciaEntregaVentaContadoPaso29A_
      );

  const detallesPorVenta = {};
  const gestionesPorVenta = {};
  const evidenciasPorVenta = {};

  const proveedorPorVenta = {};
  const importeProveedorPorVenta = {};
  const entregaConfirmadaPorVenta = {};

  detalles.forEach(function(detalle) {
    const idVenta =
      String(
        detalle.idVenta || ""
      ).trim();

    if (!idVenta) return;

    if (!detallesPorVenta[idVenta]) {
      detallesPorVenta[idVenta] = [];
    }

    detallesPorVenta[idVenta].push(
      detalle
    );

    if (
      !esDetalleVentaActivoPaso29K_(
        detalle
      )
    ) {
      return;
    }

    const idProveedor =
      String(
        detalle.idProveedorPrecio || ""
      ).trim();

    if (!idProveedor) return;

    if (!proveedorPorVenta[idVenta]) {
      proveedorPorVenta[idVenta] = {};
    }

    if (
      !importeProveedorPorVenta[idVenta]
    ) {
      importeProveedorPorVenta[
        idVenta
      ] = {};
    }

    proveedorPorVenta[
      idVenta
    ][
      idProveedor
    ] = true;

    importeProveedorPorVenta[
      idVenta
    ][
      idProveedor
    ] =
      (
        importeProveedorPorVenta[
          idVenta
        ][
          idProveedor
        ] || 0
      ) +
      Number(
        detalle.totalLinea || 0
      );
  });

  gestiones.forEach(function(gestion) {
    const idVenta =
      String(
        gestion.idVenta || ""
      ).trim();

    if (!idVenta) return;

    if (!gestionesPorVenta[idVenta]) {
      gestionesPorVenta[idVenta] = [];
    }

    gestionesPorVenta[idVenta].push(
      gestion
    );

    if (
      normalizarTexto(
        gestion.estadoEntrega || ""
      ) ===
      VENTAS_CONTADO_SGT360
        .ENTREGA.ESTADOS.ENTREGADA
    ) {
      entregaConfirmadaPorVenta[
        idVenta
      ] = true;
    }
  });

  evidencias.forEach(function(evidencia) {
    const idVenta =
      String(
        evidencia.idVenta || ""
      ).trim();

    if (!idVenta) return;

    if (!evidenciasPorVenta[idVenta]) {
      evidenciasPorVenta[idVenta] = [];
    }

    evidenciasPorVenta[idVenta].push(
      evidencia
    );
  });

  const ventasResumen =
    ventasCompletas
      .map(function(venta) {
        const idVenta =
          venta.idVenta;

        const resumen =
          resumirVentaIndicePaso30C_(
            venta
          );

        resumen._proveedoresVenta29Y =
          Object.keys(
            proveedorPorVenta[
              idVenta
            ] || {}
          );

        resumen._importeProveedor29Y =
          importeProveedorPorVenta[
            idVenta
          ] || {};

        resumen._tieneEntregaConfirmada29Y =
          entregaConfirmadaPorVenta[
            idVenta
          ] === true;

        return resumen;
      });

  const revision =
    obtenerRevisionDatosMotor_();

  const generadoEn =
    new Date().toISOString();

  const payload = {
    version: "30C",
    estructura:
      "RESUMEN_BANDEJAS",
    revision: revision,
    generadoEn: generadoEn,
    ventas: ventasResumen
  };

  const meta =
    guardarIndiceVentasPaso29Y_(
      payload
    );

  let detallesPrecargados = 0;

  ventasCompletas
    .slice(
      0,
      VENTAS_CONTADO_INDICE_29Y_
        .MAX_DETALLES_PRECARGADOS
    )
    .forEach(function(venta) {
      const idVenta =
        venta.idVenta;

      const paquete = {
        revision: revision,
        generadoEn: generadoEn,
        venta: venta,
        detalles:
          (
            detallesPorVenta[
              idVenta
            ] || []
          )
            .slice()
            .sort(function(a, b) {
              return a.linea - b.linea;
            }),

        gestiones:
          (
            gestionesPorVenta[
              idVenta
            ] || []
          ).slice(),

        evidencias:
          (
            evidenciasPorVenta[
              idVenta
            ] || []
          ).slice()
      };

      if (
        guardarPaqueteDetalleVentasPaso29Y_(
          paquete
        )
      ) {
        detallesPrecargados++;
      }
    });

  limpiarMarcaIndiceVentasSucioPaso29Y_();

  return {
    correcto: true,
    version: "30C",
    estructura:
      "RESUMEN_BANDEJAS",
    revision: revision,
    generadoEn: generadoEn,
    totalVentas:
      ventasResumen.length,
    detallesPrecargados:
      detallesPrecargados,
    chunks:
      meta.chunks,
    ms:
      Date.now() - inicio
  };
}


function obtenerIndiceVentasDisponiblePaso29Y_() {
  let indice =
    leerIndiceVentasPaso29Y_();

  if (indice) {
    return indice;
  }

  // Solo debe ocurrir en primera instalación / pérdida completa del caché.
  // El updater y el trigger de mantenimiento están diseñados para evitar
  // que un usuario normal llegue a esta ruta.
  construirIndiceVentasPaso29Y_();

  indice =
    leerIndiceVentasPaso29Y_();

  if (!indice) {
    throw new Error(
      "No fue posible preparar el índice rápido de Ventas."
    );
  }

  return indice;
}

function instalarMantenimientoIndiceVentasPaso29Y_() {
  const funcion =
    VENTAS_CONTADO_INDICE_29Y_
      .TRIGGER_FUNCTION;

  ScriptApp
    .getProjectTriggers()
    .filter(function(trigger) {
      return (
        trigger.getHandlerFunction() ===
        funcion
      );
    })
    .forEach(function(trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp
    .newTrigger(funcion)
    .timeBased()
    .everyMinutes(5)
    .create();

  return true;
}

function mantenerIndiceVentasPaso29Y() {
  const meta =
    leerMetaIndiceVentasPaso29Y_();

  const generado =
    meta && meta.generadoEn
      ? new Date(meta.generadoEn).getTime()
      : 0;

  const requiere =
    !meta ||
    indiceVentasEstaSucioPaso29Y_() ||
    !generado ||
    (
      Date.now() - generado >
      VENTAS_CONTADO_INDICE_29Y_
        .EDAD_REFRESCO_MS
    );

  if (!requiere) {
    return {
      correcto: true,
      actualizado: false,
      mensaje:
        "El índice rápido de Ventas continúa vigente."
    };
  }

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    return {
      correcto: true,
      actualizado: false,
      enProceso: true
    };
  }

  try {
    return Object.assign(
      {
        actualizado: true
      },
      construirIndiceVentasPaso29Y_()
    );
  } finally {
    lock.releaseLock();
  }
}

function refrescarIndiceVentasContadoModulo() {
  const usuario =
    obtenerUsuarioActual();

  exigirPermisoVentasContado_(
    "VISUALIZAR_MODULO",
    usuario
  );

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(750)) {
    return {
      correcto: true,
      actualizado: false,
      enProceso: true,
      mensaje:
        "La sincronización ya está en curso."
    };
  }

  try {
    const resultado =
      construirIndiceVentasPaso29Y_();

    return Object.assign(
      {
        actualizado: true
      },
      resultado
    );
  } finally {
    lock.releaseLock();
  }
}

function leerFilasPorVentaPaso29Y_(
  nombreHoja,
  idVenta
) {
  const id =
    String(idVenta || "").trim();

  if (!id) return [];

  const contexto =
    obtenerContextoTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      nombreHoja,
      ["ID_VENTA"]
    );

  const hoja =
    contexto.hoja;

  const ultimaFila =
    hoja.getLastRow();

  if (ultimaFila < 2) {
    return [];
  }

  const columnaId =
    contexto.mapa.ID_VENTA + 1;

  const coincidencias =
    hoja
      .getRange(
        2,
        columnaId,
        ultimaFila - 1,
        1
      )
      .createTextFinder(id)
      .matchEntireCell(true)
      .findAll();

  if (!coincidencias.length) {
    return [];
  }

  const filas =
    coincidencias
      .map(function(range) {
        return range.getRow();
      })
      .sort(function(a, b) {
        return a - b;
      });

  const primera =
    filas[0];

  const ultima =
    filas[filas.length - 1];

  const encabezados =
    hoja
      .getRange(
        1,
        1,
        1,
        contexto.numeroColumnas
      )
      .getValues()[0];

  let valores;

  if (
    ultima - primera <= 200
  ) {
    valores =
      hoja
        .getRange(
          primera,
          1,
          ultima - primera + 1,
          contexto.numeroColumnas
        )
        .getValues();
  } else {
    valores =
      filas.map(function(numeroFila) {
        return hoja
          .getRange(
            numeroFila,
            1,
            1,
            contexto.numeroColumnas
          )
          .getValues()[0];
      });
  }

  const indiceId =
    contexto.mapa.ID_VENTA;

  return valores
    .filter(function(fila) {
      return (
        String(
          fila[indiceId] || ""
        ).trim() === id
      );
    })
    .map(function(fila) {
      const objeto = {};

      encabezados.forEach(
        function(cabecera, indice) {
          objeto[
            String(cabecera || "").trim()
          ] = fila[indice];
        }
      );

      return objeto;
    });
}

function construirPaqueteDetallePuntualPaso29Y_(
  idVenta
) {
  const cabeceraRaw =
    leerFilasPorVentaPaso29Y_(
      VENTAS_CONTADO_SGT360
        .HOJAS.CABECERA,
      idVenta
    );

  if (!cabeceraRaw.length) {
    return null;
  }

  const detalles =
    leerFilasPorVentaPaso29Y_(
      VENTAS_CONTADO_SGT360
        .HOJAS.DETALLE,
      idVenta
    )
      .filter(function(row) {
        return (
          normalizarTexto(
            row.ESTADO ||
            CONFIG.ESTADOS.ACTIVO
          ) === CONFIG.ESTADOS.ACTIVO
        );
      })
      .map(mapearDetalleVentaContado_)
      .sort(function(a, b) {
        return a.linea - b.linea;
      });

  const gestiones =
    leerFilasPorVentaPaso29Y_(
      VENTAS_CONTADO_SGT360
        .HOJAS.GESTION_ENTREGA,
      idVenta
    )
      .map(
        mapearGestionEntregaVentaContadoPaso29A_
      );

  const evidencias =
    leerFilasPorVentaPaso29Y_(
      VENTAS_CONTADO_SGT360
        .HOJAS.EVIDENCIAS_ENTREGA,
      idVenta
    )
      .filter(function(row) {
        return (
          normalizarTexto(
            row.ESTADO ||
            CONFIG.ESTADOS.ACTIVO
          ) === CONFIG.ESTADOS.ACTIVO
        );
      })
      .map(
        mapearEvidenciaEntregaVentaContadoPaso29A_
      );

  return {
    revision:
      obtenerRevisionDatosMotor_(),
    generadoEn:
      new Date().toISOString(),
    venta:
      mapearVentaContado_(
        cabeceraRaw[0]
      ),
    detalles: detalles,
    gestiones: gestiones,
    evidencias: evidencias
  };
}

function obtenerPaqueteDetalleVentaPaso29Y_(
  idVenta
) {
  const id =
    String(idVenta || "").trim();

  if (!id) {
    throw new Error(
      "Selecciona la venta."
    );
  }

  const cacheado =
    leerPaqueteDetalleVentasPaso29Y_(
      id
    );

  if (cacheado) {
    return {
      paquete: cacheado,
      fuente: "CACHE_DETALLE_29Y"
    };
  }

  const puntual =
    construirPaqueteDetallePuntualPaso29Y_(
      id
    );

  if (!puntual) {
    return {
      paquete: null,
      fuente: "NO_ENCONTRADO"
    };
  }

  // Solo se conserva si el índice general no está pendiente.
  if (!indiceVentasEstaSucioPaso29Y_()) {
    guardarPaqueteDetalleVentasPaso29Y_(
      puntual
    );
  }

  return {
    paquete: puntual,
    fuente: "LECTURA_PUNTUAL_29Y"
  };
}


/** Paso 29Y — caché de lectura solo dentro del RPC actual. */
var VENTAS_CONTADO_CACHE_EJECUCION_29P_ = {};

function limpiarCacheEjecucionVentasPaso29P_() {
  VENTAS_CONTADO_CACHE_EJECUCION_29P_ = {};
}

function leerCabecerasVentasSnapshotPaso29P_() {
  if (!VENTAS_CONTADO_CACHE_EJECUCION_29P_.cabeceras) {
    VENTAS_CONTADO_CACHE_EJECUCION_29P_.cabeceras =
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.CABECERA
      );
  }
  return VENTAS_CONTADO_CACHE_EJECUCION_29P_.cabeceras;
}

function leerDetallesVentasSnapshotPaso29P_() {
  if (!VENTAS_CONTADO_CACHE_EJECUCION_29P_.detalles) {
    VENTAS_CONTADO_CACHE_EJECUCION_29P_.detalles =
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.DETALLE
      );
  }
  return VENTAS_CONTADO_CACHE_EJECUCION_29P_.detalles;
}

function leerGestionesVentasSnapshotPaso29P_() {
  if (!VENTAS_CONTADO_CACHE_EJECUCION_29P_.gestiones) {
    VENTAS_CONTADO_CACHE_EJECUCION_29P_.gestiones =
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
      );
  }
  return VENTAS_CONTADO_CACHE_EJECUCION_29P_.gestiones;
}

function leerEvidenciasVentasSnapshotPaso29P_() {
  if (!VENTAS_CONTADO_CACHE_EJECUCION_29P_.evidencias) {
    VENTAS_CONTADO_CACHE_EJECUCION_29P_.evidencias =
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.EVIDENCIAS_ENTREGA
      );
  }
  return VENTAS_CONTADO_CACHE_EJECUCION_29P_.evidencias;
}

const VENTAS_CONTADO_SGT360 = Object.freeze({
  CODIGO: "VENTAS_CONTADO",
  NOMBRE: "Ventas al contado",
  MONEDA: "PEN",
  HOJAS: Object.freeze({
    CABECERA: "VTA_VENTAS_CONTADO",
    DETALLE: "VTA_VENTAS_CONTADO_DETALLE",
    GESTION_ENTREGA: "VTA_GESTION_ENTREGA",
    EVIDENCIAS_ENTREGA: "VTA_EVIDENCIAS_ENTREGA"
  }),
  ESTADOS: Object.freeze({
    REGISTRADA: "REGISTRADA",
    POR_ENTREGAR: "POR_ENTREGAR",
    PROGRAMADA: "PROGRAMADA",
    OBSERVADA: "OBSERVADA",
    ENTREGADA: "ENTREGADA",
    ANULADA: "ANULADA",
    EXPORTADA: "EXPORTADA"
  }),
  TIPOS_RECEPTOR: Object.freeze({
    COMPRADOR: "COMPRADOR",
    OTRA_PERSONA: "OTRA_PERSONA"
  }),
  ESTADOS_VISIBLES: Object.freeze([
    Object.freeze({ codigo: "REGISTRADA", nombre: "Registrada" }),
    Object.freeze({ codigo: "POR_ENTREGAR", nombre: "Por entregar" }),
    Object.freeze({ codigo: "PROGRAMADA", nombre: "Programada" }),
    Object.freeze({ codigo: "OBSERVADA", nombre: "Observada" }),
    Object.freeze({ codigo: "ENTREGADA", nombre: "Entregada" }),
    Object.freeze({ codigo: "ANULADA", nombre: "Anulada" })
  ]),
  CABECERAS: Object.freeze({
    VTA_VENTAS_CONTADO: Object.freeze([
      "ID_VENTA", "CODIGO_VENTA", "FECHA_REGISTRO", "TIPO_VENTA", "ES_GASODOMESTICO",
      "ID_USUARIO", "CORREO_USUARIO", "NOMBRE_USUARIO", "ROL_USUARIO", "ID_OFICINA",
      "NOMBRE_OFICINA", "ID_GRUPO", "NOMBRE_GRUPO", "ALCANCE_COMERCIAL",
      "TIPO_REGISTRO", "ESTADO_PRUEBA",
      "FECHA_ARCHIVO_PRUEBA", "ID_USUARIO_ARCHIVO_PRUEBA", "CORREO_USUARIO_ARCHIVO_PRUEBA",
      "OBSERVACION_ARCHIVO_PRUEBA",
      "TIPO_REGISTRO_ANTERIOR", "MOTIVO_RECLASIFICACION",
      "FECHA_RECLASIFICACION", "ID_USUARIO_RECLASIFICACION", "CORREO_USUARIO_RECLASIFICACION",
      "ES_CLIENTE_CALIDDA", "USA_CUENTA_CONTRATO", "RECIBE_DIRECCION_CUENTA",
      "CUENTA_CONTRATO", "DNI", "DNI_CLIENTE", "NOMBRE_CLIENTE", "DIRECCION_ENTREGA",
      "REFERENCIA", "TELEFONO", "TELEFONO_CLIENTE",
      "TIPO_RECEPTOR", "NOMBRE_RECEPTOR", "DNI_RECEPTOR", "TELEFONO_RECEPTOR",
      "RELACION_RECEPTOR", "OBSERVACIONES",
      "ID_ARCHIVO_COMPROBANTE", "URL_COMPROBANTE", "NOMBRE_COMPROBANTE", "MIME_COMPROBANTE", "ESTADO_COMPROBANTE_PAGO_CLIENTE",
      "ID_ARCHIVO_DEPOSITO_PROVEEDOR", "URL_DEPOSITO_PROVEEDOR", "NOMBRE_DEPOSITO_PROVEEDOR", "MIME_DEPOSITO_PROVEEDOR", "ESTADO_DEPOSITO_PROVEEDOR",
      "ID_ARCHIVO_BOLETA_VENTA_CLIENTE", "URL_BOLETA_VENTA_CLIENTE", "NOMBRE_BOLETA_VENTA_CLIENTE", "MIME_BOLETA_VENTA_CLIENTE", "ESTADO_BOLETA_VENTA_CLIENTE",
      "ESTADO_ABONO", "ID_PROVEEDOR_CONFIRMACION_ABONO", "FECHA_CONFIRMACION_ABONO",
      "ID_USUARIO_CONFIRMACION_ABONO", "CORREO_CONFIRMACION_ABONO", "OBSERVACION_CONFIRMACION_ABONO",
      "ESTADO", "TOTAL_ITEMS", "TOTAL_VENTA", "TOTAL_VENTA_ORIGINAL", "TOTAL_VENTA_VIGENTE",
      "TOTAL_ANULADO", "IMPORTE_ABONO_APROBADO", "MONEDA", "FECHA_CREACION", "FECHA_ACTUALIZACION",
      "ID_USUARIO_ACTUALIZACION"
    ]),
    VTA_VENTAS_CONTADO_DETALLE: Object.freeze([
      "ID_DETALLE_VENTA", "ID_VENTA", "LINEA", "ID_TIPO_MATERIAL", "TIPO_MATERIAL",
      "ID_MATERIAL", "CODIGO_MATERIAL", "CODIGO_SAP", "DESCRIPCION_MATERIAL",
      "ID_PROVEEDOR_PRECIO", "CODIGO_SAP_PROVEEDOR", "NOMBRE_COMERCIAL_PROVEEDOR", "ID_LISTA_PRECIO", "ID_DETALLE_PRECIO", "ALCANCE_PRECIO",
      "ID_OFICINA_PRECIO", "ID_GRUPO_PRECIO", "PRECIO_UNITARIO", "MONEDA", "CANTIDAD",
      "TOTAL_LINEA", "OBSERVACION_LINEA", "ESTADO_ITEM", "MOTIVO_ANULACION_ITEM",
      "OBSERVACION_ANULACION_ITEM", "FECHA_ANULACION_ITEM", "ID_USUARIO_ANULACION_ITEM",
      "CORREO_USUARIO_ANULACION_ITEM", "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION",
      "ID_USUARIO_ACTUALIZACION"
    ]),
    VTA_GESTION_ENTREGA: Object.freeze([
      "ID_GESTION_ENTREGA", "ID_VENTA", "ID_PROVEEDOR", "ESTADO_ENTREGA",
      "MOTIVO_OBSERVACION", "DETALLE_OBSERVACION", "FECHA_PROGRAMADA_ENTREGA", "FECHA_ULTIMA_GESTION", "FECHA_ENTREGA",
      "ID_USUARIO_GESTION", "CORREO_USUARIO_GESTION", "FECHA_CREACION", "FECHA_ACTUALIZACION",
      "ID_USUARIO_ACTUALIZACION"
    ]),
    VTA_EVIDENCIAS_ENTREGA: Object.freeze([
      "ID_EVIDENCIA", "ID_GESTION_ENTREGA", "ID_VENTA", "ID_PROVEEDOR", "TIPO_EVIDENCIA",
      "ID_ARCHIVO", "URL_ARCHIVO", "NOMBRE_ARCHIVO", "MIME_ARCHIVO", "FECHA_CREACION",
      "ID_USUARIO_CREACION", "ESTADO"
    ])
  }),
  RECURSOS: Object.freeze([
    { codigo: "VISUALIZAR_MODULO", nombre: "Visualizar módulo", tipo: "MODULO", padre: "", orden: 10 },
    { codigo: "REGISTRAR_VENTA", nombre: "Registrar venta", tipo: "ACCION", padre: "VISUALIZAR_MODULO", orden: 20 },
    { codigo: "VER_LISTADO", nombre: "Ver ventas", tipo: "ACCION", padre: "VISUALIZAR_MODULO", orden: 30 },
    { codigo: "VER_DETALLE", nombre: "Ver detalle", tipo: "ACCION", padre: "VER_LISTADO", orden: 40 },
    { codigo: "EXPORTAR", nombre: "Descargar ventas", tipo: "ACCION", padre: "VER_LISTADO", orden: 50 },
    { codigo: "EDITAR_VENTA", nombre: "Modificar venta", tipo: "ACCION", padre: "VER_DETALLE", orden: 55 },
    { codigo: "ANULAR", nombre: "Anular venta o material", tipo: "ACCION", padre: "VER_DETALLE", orden: 60 },
    { codigo: "CONFIRMAR_ABONO", nombre: "Validar abono", tipo: "ACCION", padre: "VISUALIZAR_MODULO", orden: 70 },
    { codigo: "GESTIONAR_ENTREGA", nombre: "Gestionar entrega", tipo: "ACCION", padre: "VISUALIZAR_MODULO", orden: 80 },
    { codigo: "GESTIONAR_PRUEBAS", nombre: "Gestionar ventas de prueba", tipo: "ACCION", padre: "VISUALIZAR_MODULO", orden: 90 }
  ]),
  TIPOS_REGISTRO: Object.freeze({
    COMERCIAL: "COMERCIAL",
    PRUEBA: "PRUEBA"
  }),
  ESTADOS_PRUEBA: Object.freeze({
    ACTIVA: "ACTIVA",
    ARCHIVADA: "ARCHIVADA"
  }),
  ESTADOS_ABONO: Object.freeze({
    PENDIENTE: "PENDIENTE_CONFIRMACION",
    OBSERVADO: "ABONO_OBSERVADO",
    CONFIRMADO: "ABONO_CONFIRMADO"
  }),
  ESTADOS_ABONO_VISIBLES: Object.freeze([
    Object.freeze({ codigo: "PENDIENTE_CONFIRMACION", nombre: "Pendiente" }),
    Object.freeze({ codigo: "ABONO_CONFIRMADO", nombre: "Aprobado" }),
    Object.freeze({ codigo: "ABONO_OBSERVADO", nombre: "Observado" })
  ]),
  TIPOS_VENTA: Object.freeze({
    GASODOMESTICO: "GASODOMESTICO",
    OTRO: "OTRO"
  }),
  COMPROBANTES: Object.freeze({
    TAMANO_MAXIMO_BYTES: 5 * 1024 * 1024,
    MIMES_PERMITIDOS: Object.freeze(["application/pdf", "image/png", "image/jpeg", "image/webp"])
  }),
  ENTREGA: Object.freeze({
    MAX_EVIDENCIAS: 6,
    TAMANO_MAXIMO_BYTES: 5 * 1024 * 1024,
    MIMES_PERMITIDOS: Object.freeze(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
    ESTADOS: Object.freeze({ PENDIENTE: "PENDIENTE", PROGRAMADA: "PROGRAMADA", OBSERVADA: "OBSERVADA", ENTREGADA: "ENTREGADA" }),
    MOTIVOS_OBSERVACION: Object.freeze([
      Object.freeze({ codigo: "CLIENTE_DESISTIO", nombre: "Cliente desistió de la compra" }),
      Object.freeze({ codigo: "CLIENTE_RECHAZO", nombre: "Cliente no aceptó / rechazó la entrega" }),
      Object.freeze({ codigo: "CLIENTE_NO_UBICADO", nombre: "Cliente no fue ubicado en el domicilio" }),
      Object.freeze({ codigo: "DIRECCION_INCORRECTA", nombre: "Dirección incorrecta o incompleta" }),
      Object.freeze({ codigo: "REPROGRAMACION_SOLICITADA", nombre: "Cliente solicitó reprogramación" }),
      Object.freeze({ codigo: "OTRO", nombre: "Otro" })
    ]),
    TIPOS_EVIDENCIA: Object.freeze([
      Object.freeze({ codigo: "BOLETA_ENTREGA", nombre: "Boleta de entrega" }),
      Object.freeze({ codigo: "EVIDENCIA_RECEPCION", nombre: "Evidencia de recepción" }),
      Object.freeze({ codigo: "ACTA_CONFORMIDAD", nombre: "Acta de conformidad" }),
      Object.freeze({ codigo: "SUSTENTO_OBSERVACION", nombre: "Sustento de observación" }),
      Object.freeze({ codigo: "OTRO", nombre: "Otro sustento" })
    ])
  })
});


/* =========================================================
 * Paso 29T — Ventas comerciales y ventas de prueba
 * ========================================================= */
function esAdministradorVentasPaso29T_(usuario) {
  const rol = normalizarTexto(usuario && usuario.rol || "");
  return rol === CONFIG.ROLES.SUPERADMIN || rol === CONFIG.ROLES.ADMIN;
}

function puedeGestionarPruebasVentasPaso29T_(usuario) {
  usuario = usuario || obtenerUsuarioActual();
  if (esAdministradorVentasPaso29T_(usuario)) return true;
  return tienePermisoVentasContado_("GESTIONAR_PRUEBAS", usuario);
}

function puedeReclasificarVentaPaso29T_(usuario) {
  return esAdministradorVentasPaso29T_(usuario || obtenerUsuarioActual());
}

function normalizarTipoRegistroVentaPaso29T_(valor) {
  const tipo = normalizarTexto(valor || VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL);
  return tipo === VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA
    ? VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA
    : VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL;
}

function normalizarEstadoPruebaVentaPaso29T_(valor, tipoRegistro) {
  const tipo = normalizarTipoRegistroVentaPaso29T_(tipoRegistro);
  if (tipo !== VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA) return "";
  return normalizarTexto(valor || "") === VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ARCHIVADA
    ? VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ARCHIVADA
    : VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ACTIVA;
}

function esVentaPruebaPaso29T_(venta) {
  return normalizarTipoRegistroVentaPaso29T_(venta && (venta.tipoRegistro || venta.TIPO_REGISTRO)) ===
    VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA;
}

function esVentaPruebaArchivadaPaso29T_(venta) {
  return esVentaPruebaPaso29T_(venta) &&
    normalizarEstadoPruebaVentaPaso29T_(venta && (venta.estadoPrueba || venta.ESTADO_PRUEBA), VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA) ===
      VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ARCHIVADA;
}

function exigirVisibilidadTipoRegistroVentaPaso29T_(venta, usuario) {
  if (esVentaPruebaPaso29T_(venta) && !puedeGestionarPruebasVentasPaso29T_(usuario)) {
    throw new Error("No tienes acceso a esta venta.");
  }
  return true;
}

function exigirVentaPruebaActivaPaso29T_(venta) {
  if (esVentaPruebaArchivadaPaso29T_(venta)) {
    throw new Error("La venta de prueba está archivada y no admite gestión operativa.");
  }
  return true;
}

function normalizarTipoRegistroSolicitadoPaso29T_(valor, usuario) {
  const solicitado = normalizarTipoRegistroVentaPaso29T_(valor);
  if (solicitado === VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA && !puedeGestionarPruebasVentasPaso29T_(usuario)) {
    return VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL;
  }
  return solicitado;
}

function normalizarSegmentoRegistroVentasPaso29T_(valor, usuario, vista) {
  if (!puedeGestionarPruebasVentasPaso29T_(usuario)) return "COMERCIAL";
  const segmento = normalizarTexto(valor || "COMERCIAL");
  if (["COMERCIAL", "PRUEBA_ACTIVA", "PRUEBA_ARCHIVADA"].indexOf(segmento) !== -1) return segmento;
  return "COMERCIAL";
}

function filtrarTipoRegistroVentasPaso29T_(registros, filtros, usuario) {
  const lista = Array.isArray(registros) ? registros : [];
  filtros = filtros || {};
  usuario = usuario || obtenerUsuarioActual();
  const vista = normalizarVistaVentasContadoPaso29M_(filtros.vista || "REGISTRADAS");
  const segmento = normalizarSegmentoRegistroVentasPaso29T_(filtros.segmentoRegistro || filtros.tipoRegistroFiltro, usuario, vista);
  if (segmento === "PRUEBA_ACTIVA") {
    return lista.filter(function(item){ return esVentaPruebaPaso29T_(item) && !esVentaPruebaArchivadaPaso29T_(item); });
  }
  if (segmento === "PRUEBA_ARCHIVADA") {
    if (vista !== "REGISTRADAS") return [];
    return lista.filter(esVentaPruebaArchivadaPaso29T_);
  }
  return lista.filter(function(item){ return !esVentaPruebaPaso29T_(item); });
}

function usuarioPuedeAccederVentaPaso29T_(venta, usuario) {
  if (!venta || !usuario) return false;
  if (normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN) return true;
  const recursos = ["VER_DETALLE", "VER_LISTADO", "CONFIRMAR_ABONO", "GESTIONAR_ENTREGA"];
  return recursos.some(function(recurso){
    if (!tienePermisoVentasContado_(recurso, usuario)) return false;
    return filtrarVentasContadoPorAlcance_([venta], usuario, recurso).length > 0;
  });
}

function normalizarClasificacionVentasExistentesPaso29T_() {
  asegurarEstructuraVentasContado_();
  const contexto = obtenerContextoTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, ["ID_VENTA", "TIPO_REGISTRO", "ESTADO_PRUEBA"]);
  const ultimaFila = contexto.hoja.getLastRow();
  if (ultimaFila < 2) return { total: 0, actualizadas: 0 };
  const rango = contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas);
  const filas = rango.getValues();
  const iTipo = contexto.mapa.TIPO_REGISTRO;
  const iEstado = contexto.mapa.ESTADO_PRUEBA;
  let actualizadas = 0;
  filas.forEach(function(fila){
    const tipo = normalizarTipoRegistroVentaPaso29T_(fila[iTipo] || VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL);
    const estado = normalizarEstadoPruebaVentaPaso29T_(fila[iEstado], tipo);
    if (String(fila[iTipo] || "").trim() !== tipo || String(fila[iEstado] || "").trim() !== estado) {
      fila[iTipo] = tipo; fila[iEstado] = estado; actualizadas++;
    }
  });
  if (actualizadas) {
    rango.setValues(filas);
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
    SpreadsheetApp.flush();
  }
  return { total: filas.length, actualizadas: actualizadas };
}







function actualizarModuloVentasContadoPaso30A() {
  limpiarCacheSeguridadVentasPaso29W_();
  invalidarCacheMotor_("VENTAS_CONTADO");

  const indice =
    mantenerIndiceVentasPaso29Y();

  const resultado = {
    correcto: true,
    paso: "30A",
    indice: indice,
    mensaje:
      "Paso 30A aplicado. Se eliminó la recursión del alcance ASIGNADOS y los modales pueden resolver oficinas sin desbordar la pila."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO30A\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarHotfixVentasPaso30A() {
  const usuario =
    obtenerUsuarioActual();

  limpiarCacheSeguridadVentasPaso29W_();

  const inicioOficinas =
    Date.now();

  let oficinas = [];
  let errorOficinas = "";

  try {
    oficinas =
      obtenerIdsOficinasPermitidasVentasPaso29W_(
        usuario
      );
  } catch (error) {
    errorOficinas =
      error.message || String(error);
  }

  const indice =
    leerIndiceVentasPaso29Y_();

  let detalle = null;
  let errorDetalle = "";

  if (
    indice &&
    indice.payload &&
    Array.isArray(
      indice.payload.ventas
    ) &&
    indice.payload.ventas.length
  ) {
    const primera =
      indice.payload.ventas[0];

    try {
      const inicioDetalle =
        Date.now();

      const resultadoDetalle =
        obtenerDetalleVentaContadoModulo(
          primera.idVenta,
          "REGISTRADAS"
        );

      detalle = {
        idVenta:
          primera.idVenta,
        codigoVenta:
          primera.codigoVenta,
        ms:
          Date.now() - inicioDetalle,
        fuente:
          resultadoDetalle &&
          resultadoDetalle.rendimiento
            ? resultadoDetalle.rendimiento.fuente
            : "",
        correcto: true
      };
    } catch (error) {
      errorDetalle =
        error.message || String(error);
    }
  }

  const resultado = {
    correcto:
      !errorOficinas &&
      !errorDetalle,

    paso: "30A",

    usuario: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol,
      idOficina:
        usuario.idOficina || "",
      idGrupo:
        usuario.idGrupo || ""
    },

    oficinas: {
      correcto:
        !errorOficinas,
      ids:
        oficinas,
      total:
        oficinas.length,
      ms:
        Date.now() - inicioOficinas,
      error:
        errorOficinas
    },

    detalle: detalle,

    errorDetalle:
      errorDetalle,

    mensaje:
      "Si oficinas.correcto=true y no existe errorDetalle, el desbordamiento de pila fue eliminado."
  };

  console.log(
    "DIAGNOSTICO_HOTFIX_VENTAS_PASO30A\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29Z() {
  const resultado29Y =
    actualizarModuloVentasContadoPaso29Y();

  const resultado = Object.assign(
    {},
    resultado29Y,
    {
      paso: "29Z",
      hotfix:
        "EVIDENCIAS_ENTREGA",
      mensaje:
        "Paso 29Z aplicado. El índice rápido utiliza correctamente VTA_EVIDENCIAS_ENTREGA tanto en la construcción completa como en la lectura puntual de modales."
    }
  );

  console.log(
    "ACTUALIZACION_VENTAS_PASO29Z\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarEstructuraIndiceVentasPaso29Z() {
  const hojas = {
    cabecera:
      VENTAS_CONTADO_SGT360
        .HOJAS.CABECERA,

    detalle:
      VENTAS_CONTADO_SGT360
        .HOJAS.DETALLE,

    gestionEntrega:
      VENTAS_CONTADO_SGT360
        .HOJAS.GESTION_ENTREGA,

    evidenciasEntrega:
      VENTAS_CONTADO_SGT360
        .HOJAS.EVIDENCIAS_ENTREGA
  };

  const existencia = {};

  Object.keys(hojas)
    .forEach(function(clave) {
      const nombre =
        hojas[clave];

      existencia[clave] = {
        nombre: nombre,
        definido:
          Boolean(
            String(nombre || "").trim()
          ),
        existe:
          Boolean(
            nombre &&
            obtenerHojaMotor_(
              MOTOR_SGT360.BASES.OPERATION,
              nombre,
              false
            )
          )
      };
    });

  const resultado = {
    correcto:
      Object.keys(existencia)
        .every(function(clave) {
          return (
            existencia[clave].definido &&
            existencia[clave].existe
          );
        }),

    paso: "29Z",
    hojas: existencia,

    referenciaEvidenciasEsperada:
      "VTA_EVIDENCIAS_ENTREGA"
  };

  console.log(
    "DIAGNOSTICO_ESTRUCTURA_INDICE_PASO29Z\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29Y() {
  asegurarEstructuraVentasContado_();
  sincronizarModuloVentasContado_();
  sincronizarRecursosVentasContado_();

  limpiarMarcaIndiceVentasSucioPaso29Y_();

  const indice =
    construirIndiceVentasPaso29Y_();

  instalarMantenimientoIndiceVentasPaso29Y_();

  invalidarCacheMotor_(
    "VENTAS_CONTADO"
  );

  SpreadsheetApp.flush();

  const resultado = {
    correcto: true,
    paso: "29Y",
    indice: indice,
    triggerMantenimiento:
      "Cada 5 minutos",
    mensaje:
      "Paso 29Y aplicado. Ventas utiliza un índice precalculado y los detalles recientes quedan precargados para acelerar modales."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29Y\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarRendimientoVentasPaso29Y() {
  const usuario =
    obtenerUsuarioActual();

  const medir = function(
    nombre,
    funcion
  ) {
    const inicio =
      Date.now();

    try {
      const valor =
        funcion();

      return {
        nombre: nombre,
        correcto: true,
        ms:
          Date.now() - inicio,
        fuente:
          valor &&
          valor.rendimiento
            ? valor.rendimiento.fuente
            : (
                valor &&
                valor.listadoInicial &&
                valor.listadoInicial
                  .fuenteDatos
                  ? valor.listadoInicial
                      .fuenteDatos
                  : ""
              ),
        total:
          valor &&
          valor.paginacion
            ? valor.paginacion.total
            : (
                valor &&
                valor.listadoInicial &&
                valor.listadoInicial
                  .paginacion
                  ? valor.listadoInicial
                      .paginacion.total
                  : null
              )
      };
    } catch (error) {
      return {
        nombre: nombre,
        correcto: false,
        ms:
          Date.now() - inicio,
        error:
          error.message ||
          String(error)
      };
    }
  };

  const indice =
    leerIndiceVentasPaso29Y_();

  const pruebas = [];

  pruebas.push(
    medir(
      "INICIO_INDICE_29Y",
      function() {
        return obtenerContextoVentasContadoModulo({
          vista: "REGISTRADAS",
          pagina: 1,
          tamano: 50,
          segmentoRegistro:
            "COMERCIAL",
          modoLigero: true,
          incluirListadoInicial: true
        });
      }
    )
  );

  pruebas.push(
    medir(
      "LISTADO_INDICE_29Y",
      function() {
        return listarVentasContadoModulo({
          vista: "REGISTRADAS",
          pagina: 1,
          tamano: 50,
          segmentoRegistro:
            "COMERCIAL"
        });
      }
    )
  );

  let pruebaDetalle = null;

  if (
    indice &&
    indice.payload &&
    indice.payload.ventas &&
    indice.payload.ventas.length
  ) {
    const idVenta =
      indice.payload.ventas[0]
        .idVenta;

    pruebaDetalle =
      medir(
        "DETALLE_RECIENTE_29Y",
        function() {
          return obtenerDetalleVentaContadoModulo(
            idVenta,
            "REGISTRADAS"
          );
        }
      );

    pruebaDetalle.idVenta =
      idVenta;

    pruebas.push(
      pruebaDetalle
    );
  }

  const resultado = {
    correcto:
      pruebas.every(function(item) {
        return item.correcto;
      }),
    paso: "29Y",

    usuario: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol
    },

    indice: indice
      ? {
          disponible: true,
          desactualizado:
            indice.desactualizado,
          totalVentas:
            indice.meta.totalVentas,
          revision:
            indice.meta.revision,
          generadoEn:
            indice.meta.generadoEn
        }
      : {
          disponible: false
        },

    pruebas: pruebas,

    referenciaObjetivo: {
      aperturaModulo:
        "<= 5000 ms en la ruta habitual con índice caliente",
      detalleReciente:
        "idealmente <= 2500 ms; frecuentemente menor con detalle precargado"
    },

    nota:
      "Apps Script y Google Sheets no ofrecen un SLA rígido. El objetivo de 5 segundos se consigue evitando las lecturas completas en la ruta habitual, no prometiendo una latencia fija de infraestructura."
  };

  console.log(
    "DIAGNOSTICO_RENDIMIENTO_VENTAS_PASO29Y\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29W() {
  asegurarEstructuraVentasContado_();
  sincronizarModuloVentasContado_();
  sincronizarRecursosVentasContado_();

  invalidarCacheVentasContadoPaso29Y_();

  SpreadsheetApp.flush();

  const resultado = {
    correcto: true,
    paso: "29W",
    mensaje:
      "Paso 29W aplicado. Inicio ligero, caché de permisos/oficinas por ejecución y control de modal único habilitados."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29W\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarRendimientoVentasPaso29W() {
  const usuario =
    obtenerUsuarioActual();

  const medir = function(nombre, funcion) {
    const inicio = Date.now();

    try {
      const valor = funcion();

      return {
        nombre: nombre,
        correcto: true,
        ms: Date.now() - inicio,
        resumen:
          valor &&
          valor.paginacion
            ? {
                total:
                  valor.paginacion.total || 0
              }
            : (
                valor &&
                valor.listadoInicial &&
                valor.listadoInicial.paginacion
                  ? {
                      total:
                        valor.listadoInicial
                          .paginacion
                          .total || 0,
                      modo:
                        valor.rendimiento &&
                        valor.rendimiento.modo
                    }
                  : null
              )
      };
    } catch (error) {
      return {
        nombre: nombre,
        correcto: false,
        ms: Date.now() - inicio,
        error:
          error.message || String(error)
      };
    }
  };

  const pruebas = [];

  pruebas.push(
    medir(
      "INICIO_LIGERO",
      function() {
        return obtenerContextoVentasContadoModulo({
          vista: "REGISTRADAS",
          pagina: 1,
          tamano: 50,
          segmentoRegistro: "COMERCIAL",
          modoLigero: true,
          incluirListadoInicial: true
        });
      }
    )
  );

  pruebas.push(
    medir(
      "LISTADO_REGISTRADAS",
      function() {
        return listarVentasContadoModulo({
          vista: "REGISTRADAS",
          pagina: 1,
          tamano: 50,
          segmentoRegistro: "COMERCIAL"
        });
      }
    )
  );

  const resultado = {
    correcto:
      pruebas.every(function(item) {
        return item.correcto;
      }),
    paso: "29W",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol
    },
    pruebas: pruebas,
    objetivo:
      "El inicio del módulo debe resolverse en una sola RPC y sin cargar estructura comercial hasta que se abra Nueva venta o Modificar."
  };

  console.log(
    "DIAGNOSTICO_RENDIMIENTO_VENTAS_PASO29W\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29V() {
  asegurarEstructuraVentasContado_();
  sincronizarModuloVentasContado_();
  sincronizarRecursosVentasContado_();

  invalidarCacheMotor_("CONFIG");
  invalidarCacheMotor_("SECURITY");
  invalidarCacheVentasContadoPaso29Y_();

  SpreadsheetApp.flush();

  const resultado = {
    correcto: true,
    paso: "29V",
    mensaje:
      "Paso 29V aplicado. La ejecución de Modificar venta ya no bloquea usuarios por tener ID_PROVEEDOR; se valida exclusivamente EDITAR_VENTA + alcance + reglas operativas."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29V\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarGuardEdicionProveedorPaso29V(idVenta) {
  const usuario = obtenerUsuarioActual();

  const permitido =
    tienePermisoVentasContado_(
      "EDITAR_VENTA",
      usuario
    );

  const alcance =
    permitido
      ? normalizarTexto(
          obtenerAlcancePermisoVentasContado_(
        "EDITAR_VENTA",
        usuario
      )
        )
      : "SIN_PERMISO";

  const id =
    String(idVenta || "").trim();

  const ventas =
    leerCabecerasVentasSnapshotPaso29P_()
      .map(mapearVentaContado_)
      .filter(function(item) {
        return !id || item.idVenta === id;
      })
      .slice(0, 50);

  const resultado = {
    correcto: true,
    paso: "29V",

    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || "",
      idOficina: usuario.idOficina || "",
      idGrupo: usuario.idGrupo || ""
    },

    permisoEditarVenta: {
      permitido: permitido,
      alcance: alcance
    },

    nota:
      "ID_PROVEEDOR es informativo/comercial y no constituye un bloqueo automático de EDITAR_VENTA.",

    ventas:
      ventas.map(function(venta) {
        return {
          idVenta: venta.idVenta,
          codigoVenta: venta.codigoVenta,
          estado: venta.estado,
          estadoAbono: venta.estadoAbono,
          idUsuarioVenta: venta.idUsuario,
          idOficina: venta.idOficina,
          idGrupo: venta.idGrupo,
          dentroAlcance:
            permitido
              ? filtrarVentasContadoPorAlcance_(
                  [venta],
                  usuario,
                  "EDITAR_VENTA"
                ).length > 0
              : false,
          puedeModificar:
            usuarioPuedeModificarVentaContado_(
              venta,
              usuario
            )
        };
      })
  };

  console.log(
    "DIAGNOSTICO_GUARD_EDICION_PROVEEDOR_PASO29V\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29U() {
  asegurarEstructuraVentasContado_();
  sincronizarModuloVentasContado_();
  sincronizarRecursosVentasContado_();

  invalidarCacheMotor_("CONFIG");
  invalidarCacheMotor_("SECURITY");
  invalidarCacheVentasContadoPaso29Y_();

  SpreadsheetApp.flush();

  const resultado = {
    correcto: true,
    paso: "29U",
    mensaje:
      "Paso 29U aplicado. EDITAR_VENTA respeta su alcance aunque el usuario tenga ID_PROVEEDOR y los archivos se abren de forma segura desde Cálidda 360."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29U\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29T() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    const clasificacion = normalizarClasificacionVentasExistentesPaso29T_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    const resultado = { correcto:true, paso:"29T", clasificacion:clasificacion, recursoNuevo:"GESTIONAR_PRUEBAS", mensaje:"Paso 29T aplicado. Las ventas históricas quedaron como COMERCIAL y se habilitó la gestión controlada de ventas de prueba." };
    console.log("ACTUALIZACION_VENTAS_PASO29T\n" + JSON.stringify(resultado,null,2));
    return resultado;
  } finally { bloqueo.releaseLock(); }
}

function diagnosticarModuloVentasContadoPaso29T() {
  const ventas = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA).map(mapearVentaContado_);
  const resumen={comerciales:0,pruebasActivas:0,pruebasArchivadas:0};
  ventas.forEach(function(v){
    if (!esVentaPruebaPaso29T_(v)) resumen.comerciales++;
    else if (esVentaPruebaArchivadaPaso29T_(v)) resumen.pruebasArchivadas++;
    else resumen.pruebasActivas++;
  });
  const recurso=listarRecursosSeguridadMotor_().some(function(x){return x.modulo===VENTAS_CONTADO_SGT360.CODIGO && x.codigo==="GESTIONAR_PRUEBAS";});
  const r={correcto:recurso,paso:"29T",recursoGestionarPruebas:recurso,resumen:resumen};
  console.log("DIAGNOSTICO_VENTAS_PASO29T\n"+JSON.stringify(r,null,2));
  return r;
}

/** Migración incremental e idempotente del Paso 27A. */
function actualizarModuloVentasContadoPaso27A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    return diagnosticarModuloVentasContadoPaso27A();
  } finally {
    bloqueo.releaseLock();
  }
}

/** Migración incremental e idempotente del Paso 27B. */
function actualizarModuloVentasContadoPaso27B() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    return diagnosticarModuloVentasContadoPaso27A();
  } finally {
    bloqueo.releaseLock();
  }
}

/** Migración incremental e idempotente del Paso 27G.
 *  Alias operativo para instalaciones que ya recibieron 27B/27F y solo necesitan
 *  resincronizar estructura, módulo y permisos sin reinstalar el motor.
 */
function actualizarModuloVentasContadoPaso27G() {
  const resultado = actualizarModuloVentasContadoPaso27B();
  resultado.paso = "27G";
  resultado.mensaje = "Paso 27G aplicado: edición de ventas, vista proveedor y ajustes de selector comercial preparados.";
  return resultado;
}

function diagnosticarModuloVentasContadoPaso27G() {
  const resultado = diagnosticarModuloVentasContadoPaso27A();
  resultado.paso = "27G";
  resultado.mensaje = "El módulo de ventas al contado está preparado hasta el Paso 27G.";
  return resultado;
}

/** Migración incremental del Paso 27Q: proveedor destino obligatorio por material y exportación con datos SAP/comerciales. */
function actualizarModuloVentasContadoPaso27Q() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    return diagnosticarModuloVentasContadoPaso27Q();
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso27Q() {
  const resultado = diagnosticarModuloVentasContadoPaso27G();
  resultado.paso = "27Q";
  resultado.mensaje = "Paso 27Q aplicado: proveedor destino en ventas al contado y exportación con código SAP/nombre comercial.";
  return resultado;
}

/** Migración incremental del Paso 27T: carga inmediata, precio por alcance y etiquetas SAP/RUC. */
function actualizarModuloVentasContadoPaso27T() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    return diagnosticarModuloVentasContadoPaso27T();
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso27T() {
  const resultado = diagnosticarModuloVentasContadoPaso27Q();
  resultado.paso = "27T";
  resultado.mensaje = "Paso 27T aplicado: ventas al contado con carga inmediata, proveedor destino y etiquetas SAP/RUC.";
  return resultado;
}

/** Migración incremental del Paso 27U: campos obligatorios y validación de abono observado/confirmado. */
function actualizarModuloVentasContadoPaso27U() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    return diagnosticarModuloVentasContadoPaso27U();
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso27U() {
  const resultado = diagnosticarModuloVentasContadoPaso27T();
  resultado.paso = "27U";
  resultado.mensaje = "Paso 27U aplicado: nueva venta con campos obligatorios y flujo de abono confirmado u observado con observación.";
  return resultado;
}

function diagnosticarModuloVentasContadoPaso27A() {
  const diagnostico = {
    correcto: true,
    paso: "27A",
    modulo: VENTAS_CONTADO_SGT360.CODIGO,
    hojas: {},
    recursos: [],
    mensaje: "El módulo de ventas al contado está preparado."
  };
  Object.keys(VENTAS_CONTADO_SGT360.HOJAS).forEach(function(clave) {
    const nombre = VENTAS_CONTADO_SGT360.HOJAS[clave];
    const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombre, false);
    diagnostico.hojas[nombre] = {
      existe: Boolean(hoja),
      filas: hoja ? Math.max(0, hoja.getLastRow() - 1) : 0,
      columnas: hoja ? hoja.getLastColumn() : 0
    };
    if (!hoja) diagnostico.correcto = false;
  });
  diagnostico.recursos = listarRecursosSeguridadMotor_().filter(function(item) {
    return item.modulo === VENTAS_CONTADO_SGT360.CODIGO;
  }).map(function(item) { return item.codigo; });
  if (!diagnostico.recursos.length) diagnostico.correcto = false;
  return diagnostico;
}


/**
 * Paso 29A — Consola de Ventas por permisos, abonos separados, gestión de entrega
 * y catálogo de ofertas/carrito basado directamente en precios vigentes.
 * Migración incremental e idempotente: no elimina ventas ni evidencias.
 */
function actualizarModuloVentasContadoPaso29A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    const normalizacion = normalizarEstadosVentasContadoPaso29A_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "29A",
      normalizacion: normalizacion,
      mensaje: "Paso 29A aplicado. Ventas usa bandejas internas por permiso, catálogo de ofertas y gestión de entregas. Asigna GESTIONAR_ENTREGA a los perfiles que correspondan."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29A() {
  const resultado = diagnosticarModuloVentasContadoPaso27A();
  resultado.paso = "29A";
  resultado.hojasEntrega = {
    gestion: Boolean(obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA, false)),
    evidencias: Boolean(obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.EVIDENCIAS_ENTREGA, false))
  };
  resultado.recursosEsperados = ["CONFIRMAR_ABONO", "GESTIONAR_ENTREGA"];
  resultado.mensaje = "Diagnóstico Paso 29A: valida estructura, recursos y bandejas de Ventas.";
  if (!resultado.hojasEntrega.gestion || !resultado.hojasEntrega.evidencias) resultado.correcto = false;
  return resultado;
}

/**
 * Paso 29D — Ajustes de validación de abono y gestión de entrega.
 * Añade Programada con fecha de programación en la gestión por proveedor.
 */
function actualizarModuloVentasContadoPaso29D() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "29D",
      mensaje: "Paso 29D aplicado. Validación de abono y gestión de entrega actualizadas con soporte para Programada."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29D() {
  const resultado = diagnosticarModuloVentasContadoPaso29A();
  resultado.paso = "29D";
  resultado.mensaje = "Diagnóstico Paso 29D: valida estructura de entrega con fecha programada y bandejas de Ventas.";
  return resultado;
}

/**
 * Paso 29E — rendimiento de abonos + proveedor de entrega derivado del precio.
 * Migración incremental: no elimina ventas ni precios.
 */
function actualizarModuloVentasContadoPaso29E() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const proveedoresRecuperados =
      normalizarProveedorDetallesVentasDesdePreciosPaso29E_();

    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "29E",
      proveedoresRecuperados: proveedoresRecuperados,
      mensaje:
        "Paso 29E aplicado. Abonos optimizados y relación proveedor-material de ventas sincronizada desde precios."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29E() {
  const resultado = diagnosticarModuloVentasContadoPaso29D();
  const detalles = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.DETALLE
  ).filter(function(row) {
    return normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
      CONFIG.ESTADOS.ACTIVO;
  });

  const pendientesProveedor = detalles.filter(function(row) {
    return !String(row.ID_PROVEEDOR_PRECIO || "").trim() &&
      Boolean(
        String(row.ID_LISTA_PRECIO || "").trim() ||
        String(row.ID_DETALLE_PRECIO || "").trim()
      );
  }).length;

  resultado.paso = "29E";
  resultado.detallesSinProveedorRecuperable = pendientesProveedor;
  resultado.correcto = resultado.correcto && pendientesProveedor === 0;
  resultado.mensaje = pendientesProveedor ?
    "Existen líneas de venta con referencia de precio pero sin proveedor. Ejecuta actualizarModuloVentasContadoPaso29E()." :
    "Diagnóstico Paso 29E correcto: las líneas con precio tienen proveedor disponible para gestión de entrega.";

  return resultado;
}



/**
 * Paso 29F — Gestión de entrega enfocada al proveedor y anulación observada
 * restringida al responsable de la venta. No elimina información histórica.
 */
function actualizarModuloVentasContadoPaso29F() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const proveedoresRecuperados =
      normalizarProveedorDetallesVentasDesdePreciosPaso29E_();

    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "29F",
      proveedoresRecuperados: proveedoresRecuperados,
      mensaje:
        "Paso 29F aplicado. Gestión de entrega y anulación por responsable actualizadas."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29F() {
  const resultado = diagnosticarModuloVentasContadoPaso29E();
  resultado.paso = "29F";
  resultado.estadosEntrega = Object.keys(
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS
  );
  resultado.tiposEvidencia =
    VENTAS_CONTADO_SGT360.ENTREGA.TIPOS_EVIDENCIA.map(function(item) {
      return item.codigo;
    });
  resultado.mensaje =
    "Diagnóstico Paso 29F: valida proveedor por precio, estados de entrega y sustento de observación.";
  return resultado;
}

/**
 * Paso 29G — navegación de bandejas con revisión ligera y recuperación robusta
 * del proveedor histórico desde precios.
 */
function actualizarModuloVentasContadoPaso29G() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const proveedoresRecuperados =
      normalizarProveedorDetallesVentasDesdePreciosPaso29E_();

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "29G",
      proveedoresRecuperados: proveedoresRecuperados,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        "Paso 29G aplicado. Se optimizó el cambio entre bandejas y se reforzó la relación proveedor-material desde precios."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29G() {
  const resultado = diagnosticarModuloVentasContadoPaso29F();

  const detalles = enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    ).filter(function(row) {
      return normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
        CONFIG.ESTADOS.ACTIVO;
    }).map(mapearDetalleVentaContado_)
  );

  const sinProveedor = detalles.filter(function(item) {
    return String(item.idMaterial || "").trim() &&
      Number.isFinite(Number(item.precioUnitario)) &&
      !String(item.idProveedorPrecio || "").trim();
  });

  resultado.paso = "29G";
  resultado.revisionDatos = obtenerRevisionDatosMotor_();
  resultado.detallesActivosSinProveedor = sinProveedor.length;
  resultado.muestrasSinProveedor = sinProveedor.slice(0, 10).map(function(item) {
    return {
      idVenta: item.idVenta,
      codigoMaterial: item.codigoMaterial,
      idMaterial: item.idMaterial,
      precioUnitario: item.precioUnitario,
      idListaPrecio: item.idListaPrecio,
      idDetallePrecio: item.idDetallePrecio
    };
  });
  resultado.correcto = resultado.correcto && sinProveedor.length === 0;
  resultado.mensaje = sinProveedor.length
    ? "Aún existen líneas históricas cuyo proveedor no es inequívoco por precio. Revisa las muestras del diagnóstico."
    : "Diagnóstico Paso 29G correcto: los productos de venta tienen proveedor resoluble desde Precios.";

  return resultado;
}

/**
 * Paso 29H — preserva explícitamente en la venta el proveedor/lista elegido
 * en el carrito y mejora la recuperación histórica usando el contexto de la
 * venta (fecha, negocio, oficina, grupo, combo y precio).
 */
function actualizarModuloVentasContadoPaso29H() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const proveedoresRecuperados =
      normalizarProveedorDetallesVentasDesdePreciosPaso29E_();

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "29H",
      proveedoresRecuperados: proveedoresRecuperados,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        "Paso 29H aplicado. La venta conserva explícitamente el proveedor seleccionado en el carrito y se reforzó la recuperación histórica desde Precios."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29H() {
  const resultado = diagnosticarModuloVentasContadoPaso29G();

  const detalles = enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    ).filter(function(row) {
      return normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
        CONFIG.ESTADOS.ACTIVO;
    }).map(mapearDetalleVentaContado_)
  );

  const sinProveedor = detalles.filter(function(item) {
    return String(item.idMaterial || "").trim() &&
      !String(item.idProveedorPrecio || "").trim();
  });

  resultado.paso = "29H";
  resultado.detallesActivosSinProveedor = sinProveedor.length;
  resultado.muestrasSinProveedor = sinProveedor.slice(0, 20).map(function(item) {
    return {
      idVenta: item.idVenta,
      codigoMaterial: item.codigoMaterial,
      idMaterial: item.idMaterial,
      precioUnitario: item.precioUnitario,
      detalleCombo: item.detalleCombo || item.observacionLinea || "",
      idListaPrecio: item.idListaPrecio,
      idDetallePrecio: item.idDetallePrecio
    };
  });
  resultado.correcto = resultado.correcto && sinProveedor.length === 0;
  resultado.mensaje = sinProveedor.length
    ? "Existen líneas históricas donde el proveedor original no puede reconstruirse de forma inequívoca. Las ventas nuevas conservarán el proveedor elegido en el carrito."
    : "Diagnóstico Paso 29H correcto: las líneas activas de venta tienen proveedor asociado al precio.";

  return resultado;
}

/**
 * Paso 29I — la venta mantiene en Cálidda 360 los datos completos del comprador,
 * la dirección de entrega y una fotografía de la persona autorizada para recibir.
 *
 * No elimina información histórica. Solo asegura las nuevas columnas y copia
 * DNI/Teléfono del comprador desde las columnas legacy cuando ya existen.
 */
function actualizarModuloVentasContadoPaso29I() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const hoja = obtenerLibroMotor_(MOTOR_SGT360.BASES.OPERATION)
      .getSheetByName(VENTAS_CONTADO_SGT360.HOJAS.CABECERA);

    let compradoresNormalizados = 0;

    if (hoja && hoja.getLastRow() > 1) {
      const cabeceras = hoja.getRange(
        1,
        1,
        1,
        hoja.getLastColumn()
      ).getDisplayValues()[0];

      const idx = crearMapaCabeceras(cabeceras);
      const datos = hoja.getRange(
        2,
        1,
        hoja.getLastRow() - 1,
        hoja.getLastColumn()
      ).getValues();

      datos.forEach(function(fila, index) {
        const cambios = {};

        const dniLegacy = String(
          fila[idx.DNI] || ""
        ).trim();

        const telefonoLegacy = String(
          fila[idx.TELEFONO] || ""
        ).trim();

        const dniCliente = typeof idx.DNI_CLIENTE === "number"
          ? String(fila[idx.DNI_CLIENTE] || "").trim()
          : "";

        const telefonoCliente =
          typeof idx.TELEFONO_CLIENTE === "number"
            ? String(fila[idx.TELEFONO_CLIENTE] || "").trim()
            : "";

        if (!dniCliente && dniLegacy) {
          cambios.DNI_CLIENTE = dniLegacy;
        }

        if (!telefonoCliente && telefonoLegacy) {
          cambios.TELEFONO_CLIENTE = telefonoLegacy;
        }

        if (Object.keys(cambios).length) {
          cambios.ID_VENTA = String(
            fila[idx.ID_VENTA] || ""
          ).trim();

          if (cambios.ID_VENTA) {
            guardarObjetoMotor_(
              MOTOR_SGT360.BASES.OPERATION,
              VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
              "ID_VENTA",
              cambios
            );
            compradoresNormalizados++;
          }
        }
      });
    }

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "29I",
      compradoresNormalizados: compradoresNormalizados,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        "Paso 29I aplicado. Las nuevas ventas guardarán comprador, dirección y receptor dentro de Cálidda 360."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29I() {
  asegurarEstructuraVentasContado_();

  const libro = obtenerLibroMotor_(MOTOR_SGT360.BASES.OPERATION);
  const hoja = libro.getSheetByName(
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  );

  const requeridas = [
    "RECIBE_DIRECCION_CUENTA",
    "DNI_CLIENTE",
    "TELEFONO_CLIENTE",
    "TIPO_RECEPTOR",
    "NOMBRE_RECEPTOR",
    "DNI_RECEPTOR",
    "TELEFONO_RECEPTOR",
    "RELACION_RECEPTOR"
  ];

  const cabeceras = hoja && hoja.getLastColumn()
    ? hoja.getRange(
        1,
        1,
        1,
        hoja.getLastColumn()
      ).getDisplayValues()[0]
    : [];

  const mapa = crearMapaCabeceras(cabeceras);
  const faltantes = requeridas.filter(function(nombre) {
    return typeof mapa[nombre] !== "number";
  });

  const ventas = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  ).map(mapearVentaContado_);

  const ventasConReceptor = ventas.filter(function(venta) {
    return Boolean(String(venta.tipoReceptor || "").trim());
  }).length;

  const resultado = {
    correcto: faltantes.length === 0,
    paso: "29I",
    columnasFaltantes: faltantes,
    ventasTotales: ventas.length,
    ventasConReceptorRegistrado: ventasConReceptor,
    mensaje: faltantes.length
      ? "Faltan columnas del Paso 29I."
      : "Estructura Paso 29I correcta. Las ventas nuevas pueden guardar comprador y receptor."
  };

  console.log(
    "DIAGNOSTICO_VENTAS_PASO29I\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

/**
 * Paso 29J — recalcula en bloque el estado global de las ventas usando las
 * gestiones de entrega existentes.
 *
 * Prioridad:
 * ANULADA > OBSERVADA > ENTREGADA (todos) > PROGRAMADA (alguno) > POR_ENTREGAR
 *
 * Las ventas cuyo abono todavía no está aprobado permanecen REGISTRADA.
 */
function recalcularEstadosVentasDesdeGestionesPaso29J_() {
  const ventas = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  ).map(mapearVentaContado_);

  const detalles = enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    )
      .filter(function(row) {
        return normalizarTexto(
          row.ESTADO || CONFIG.ESTADOS.ACTIVO
        ) === CONFIG.ESTADOS.ACTIVO;
      })
      .map(mapearDetalleVentaContado_)
  );

  const gestiones = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
  );

  const proveedoresPorVenta = {};
  detalles
    .filter(esDetalleVentaActivoPaso29K_)
    .forEach(function(detalle) {
    const idVenta = String(detalle.idVenta || "").trim();
    const idProveedor = String(
      detalle.idProveedorPrecio || ""
    ).trim();

    if (!idVenta || !idProveedor) return;

    if (!proveedoresPorVenta[idVenta]) {
      proveedoresPorVenta[idVenta] = {};
    }

    proveedoresPorVenta[idVenta][idProveedor] = true;
  });

  const estadoPorVentaProveedor = {};
  gestiones.forEach(function(row) {
    const idVenta = String(row.ID_VENTA || "").trim();
    const idProveedor = String(row.ID_PROVEEDOR || "").trim();

    if (!idVenta || !idProveedor) return;

    estadoPorVentaProveedor[
      idVenta + "|" + idProveedor
    ] = normalizarTexto(
      row.ESTADO_ENTREGA ||
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE
    );
  });

  const ahora = new Date();
  let actualizadas = 0;
  const cambios = [];

  ventas.forEach(function(venta) {
    const estadoActual = normalizarTexto(
      venta.estado ||
      VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA
    );

    if (
      estadoActual ===
      VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
    ) {
      return;
    }

    let nuevoEstado =
      VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA;

    if (
      venta.estadoAbono ===
      VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
    ) {
      const idsProveedores = Object.keys(
        proveedoresPorVenta[venta.idVenta] || {}
      );

      const estados = idsProveedores.map(function(idProveedor) {
        return estadoPorVentaProveedor[
          venta.idVenta + "|" + idProveedor
        ] || VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE;
      });

      nuevoEstado =
        VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR;

      if (
        estados.some(function(estado) {
          return estado ===
            VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA;
        })
      ) {
        nuevoEstado =
          VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA;
      } else if (
        estados.length &&
        estados.every(function(estado) {
          return estado ===
            VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA;
        })
      ) {
        nuevoEstado =
          VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA;
      } else if (
        estados.some(function(estado) {
          return estado ===
            VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA;
        })
      ) {
        nuevoEstado =
          VENTAS_CONTADO_SGT360.ESTADOS.PROGRAMADA;
      }
    }

    if (nuevoEstado === estadoActual) return;

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
      "ID_VENTA",
      {
        ID_VENTA: venta.idVenta,
        ESTADO: nuevoEstado,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: "MIGRACION_29J"
      }
    );

    actualizadas++;

    cambios.push({
      idVenta: venta.idVenta,
      codigoVenta: venta.codigoVenta,
      anterior: estadoActual,
      nuevo: nuevoEstado
    });
  });

  if (actualizadas) {
    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    );
  }

  return {
    totalVentas: ventas.length,
    actualizadas: actualizadas,
    cambios: cambios.slice(0, 50)
  };
}

function actualizarModuloVentasContadoPaso29J() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const recalculo =
      recalcularEstadosVentasDesdeGestionesPaso29J_();

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29J",
      estadosRecalculados: recalculo.actualizadas,
      ventasRevisadas: recalculo.totalVentas,
      cambios: recalculo.cambios,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        "Paso 29J aplicado. Programada ya forma parte del estado global de la venta y el detalle muestra el estado de entrega de cada material."
    };

    console.log(
      "ACTUALIZACION_VENTAS_PASO29J\n" +
      JSON.stringify(resultado, null, 2)
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29J() {
  const ventas = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  ).map(mapearVentaContado_);

  const conteo = {};

  ventas.forEach(function(venta) {
    const estado = normalizarTexto(
      venta.estado ||
      VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA
    );

    conteo[estado] = (conteo[estado] || 0) + 1;
  });

  const estadosInvalidos = Object.keys(conteo).filter(function(estado) {
    return [
      VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA,
      VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR,
      VENTAS_CONTADO_SGT360.ESTADOS.PROGRAMADA,
      VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA,
      VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA,
      VENTAS_CONTADO_SGT360.ESTADOS.ANULADA,
      VENTAS_CONTADO_SGT360.ESTADOS.EXPORTADA
    ].indexOf(estado) !== -1;
  });

  const resultado = {
    correcto: estadosInvalidos.length === 0,
    paso: "29J",
    ventasTotales: ventas.length,
    ventasPorEstado: conteo,
    estadosInvalidos: estadosInvalidos,
    mensaje: estadosInvalidos.length
      ? "Se encontraron estados de venta no reconocidos."
      : "Diagnóstico Paso 29J correcto."
  };

  console.log(
    "DIAGNOSTICO_VENTAS_PASO29J\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29K() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    const libro =
      obtenerLibroMotor_(MOTOR_SGT360.BASES.OPERATION);

    const hojaVentas = libro.getSheetByName(
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    );

    const hojaDetalle = libro.getSheetByName(
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    );

    let ventasNormalizadas = 0;
    let detallesNormalizados = 0;

    if (hojaDetalle && hojaDetalle.getLastRow() > 1) {
      const headers = hojaDetalle.getRange(
        1, 1, 1, hojaDetalle.getLastColumn()
      ).getDisplayValues()[0];

      const idx = crearMapaCabeceras(headers);

      const values = hojaDetalle.getRange(
        2,
        1,
        hojaDetalle.getLastRow() - 1,
        hojaDetalle.getLastColumn()
      ).getValues();

      let cambio = false;

      values.forEach(function(row) {
        if (
          typeof idx.ESTADO_ITEM === "number" &&
          !String(row[idx.ESTADO_ITEM] || "").trim()
        ) {
          row[idx.ESTADO_ITEM] = CONFIG.ESTADOS.ACTIVO;
          detallesNormalizados++;
          cambio = true;
        }
      });

      if (cambio) {
        hojaDetalle.getRange(
          2,
          1,
          values.length,
          hojaDetalle.getLastColumn()
        ).setValues(values);

        marcarRevisionDatosMotor_(
          MOTOR_SGT360.BASES.OPERATION,
          VENTAS_CONTADO_SGT360.HOJAS.DETALLE
        );
      }
    }

    if (hojaVentas && hojaVentas.getLastRow() > 1) {
      const headers = hojaVentas.getRange(
        1, 1, 1, hojaVentas.getLastColumn()
      ).getDisplayValues()[0];

      const idx = crearMapaCabeceras(headers);

      const values = hojaVentas.getRange(
        2,
        1,
        hojaVentas.getLastRow() - 1,
        hojaVentas.getLastColumn()
      ).getValues();

      let cambio = false;

      values.forEach(function(row) {
        const total = Number(
          typeof idx.TOTAL_VENTA === "number"
            ? row[idx.TOTAL_VENTA] || 0
            : 0
        );

        let rowCambio = false;

        if (
          typeof idx.TOTAL_VENTA_ORIGINAL === "number" &&
          !String(row[idx.TOTAL_VENTA_ORIGINAL] || "").trim()
        ) {
          row[idx.TOTAL_VENTA_ORIGINAL] = total;
          rowCambio = true;
        }

        if (
          typeof idx.TOTAL_VENTA_VIGENTE === "number" &&
          !String(row[idx.TOTAL_VENTA_VIGENTE] || "").trim()
        ) {
          row[idx.TOTAL_VENTA_VIGENTE] = total;
          rowCambio = true;
        }

        if (
          typeof idx.TOTAL_ANULADO === "number" &&
          !String(row[idx.TOTAL_ANULADO] || "").trim()
        ) {
          row[idx.TOTAL_ANULADO] = 0;
          rowCambio = true;
        }

        const abono = typeof idx.ESTADO_ABONO === "number"
          ? normalizarTexto(row[idx.ESTADO_ABONO] || "")
          : "";

        if (
          abono ===
            VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO &&
          typeof idx.IMPORTE_ABONO_APROBADO === "number" &&
          !String(row[idx.IMPORTE_ABONO_APROBADO] || "").trim()
        ) {
          row[idx.IMPORTE_ABONO_APROBADO] = total;
          rowCambio = true;
        }

        if (rowCambio) {
          ventasNormalizadas++;
          cambio = true;
        }
      });

      if (cambio) {
        hojaVentas.getRange(
          2,
          1,
          values.length,
          hojaVentas.getLastColumn()
        ).setValues(values);

        marcarRevisionDatosMotor_(
          MOTOR_SGT360.BASES.OPERATION,
          VENTAS_CONTADO_SGT360.HOJAS.CABECERA
        );
      }
    }

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29K",
      ventasNormalizadas: ventasNormalizadas,
      detallesNormalizados: detallesNormalizados,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        "Paso 29K aplicado. La anulación lógica de materiales y la trazabilidad financiera quedaron habilitadas."
    };

    console.log(
      "ACTUALIZACION_VENTAS_PASO29K\n" +
      JSON.stringify(resultado, null, 2)
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}










function actualizarModuloVentasContadoPaso29S() {
  const proveedores =
    actualizarAlcanceCatalogoProveedoresPaso29S();

  invalidarCacheVentasContadoPaso29Y_();
  SpreadsheetApp.flush();

  const resultado = {
    correcto: true,
    paso: "29S",
    proveedores: proveedores,
    mensaje:
      "Paso 29S aplicado. El catálogo de Ventas usa ALCANCE_CATALOGO del proveedor: SOLO_PROVEEDOR o TODOS_PROVEEDORES."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29S\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarCatalogoVentasPaso29S() {
  const usuario = obtenerUsuarioActual();

  const configuracion =
    obtenerConfiguracionCatalogoProveedorVentasPaso29S_(
      usuario
    );

  const comercial =
    resolverOpcionesComercialesVentasContado_(
      usuario
    );

  const resultado = {
    correcto: true,
    paso: "29S",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || ""
    },
    configuracionCatalogo:
      configuracion,
    oficinasPermitidas:
      (comercial.oficinas || []).map(function(item) {
        return {
          idOficina: item.idOficina,
          nombre: item.nombre
        };
      }),
    reglaPrecio:
      "Para cada proveedor permitido se mantiene la prioridad GRUPO > OFICINA > GENERAL. El fallback nunca cambia de proveedor.",
    mensaje:
      configuracion.idProveedorRestriccion
        ? "El usuario solo recibe ofertas del proveedor asociado."
        : "El usuario puede recibir ofertas de todos los proveedores válidos para el contexto comercial."
  };

  console.log(
    "DIAGNOSTICO_CATALOGO_VENTAS_PASO29S\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29R() {
  asegurarEstructuraVentasContado_();
  invalidarCacheVentasContadoPaso29Y_();

  const resultado = {
    correcto: true,
    paso: "29R",
    mensaje:
      "Paso 29R aplicado. El catálogo de Nueva venta solo se restringe por proveedor cuando REGISTRAR_VENTA tiene alcance PROVEEDOR."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29R\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarCatalogoVentasPaso29R() {
  const usuario =
    obtenerUsuarioActual();

  const comercial =
    resolverOpcionesComercialesVentasContado_(
      usuario
    );

  const negocios =
    listarNegociosVentasContado_();

  const restriccionProveedor =
    obtenerProveedorRestriccionCatalogoVentasPaso29R_(
      usuario
    );

  const alcanceRegistrar =
    tienePermisoVentasContado_(
      "REGISTRAR_VENTA",
      usuario
    )
      ? normalizarTexto(
          obtenerAlcancePermisoVentasContado_(
        "REGISTRAR_VENTA",
        usuario
      )
        )
      : "SIN_PERMISO";

  const contextos = [];

  negocios.forEach(function(negocio) {
    (comercial.oficinas || [])
      .forEach(function(oficina) {
        const grupos =
          comercial.gruposPorOficina &&
          comercial.gruposPorOficina[
            oficina.idOficina
          ]
            ? comercial.gruposPorOficina[
                oficina.idOficina
              ]
            : [];

        grupos.forEach(function(grupo) {
          const alcance = {
            idNegocio:
              negocio.codigo,
            idOficina:
              oficina.idOficina,
            idGrupo:
              grupo.idGrupo,
            alcanceComercial:
              "GRUPO"
          };

          let ofertas = [];
          let error = "";

          try {
            ofertas =
              construirOfertasVentasContadoPaso29A_(
                alcance,
                usuario,
                new Date()
              );
          } catch (e) {
            error =
              e.message || String(e);
          }

          contextos.push({
            negocio:
              negocio.codigo,
            oficina: {
              id:
                oficina.idOficina,
              nombre:
                oficina.nombre
            },
            grupo: {
              id:
                grupo.idGrupo,
              nombre:
                grupo.nombre
            },
            totalOfertas:
              ofertas.length,
            proveedores:
              Array.from(
                new Set(
                  ofertas.map(function(item) {
                    return (
                      item.proveedor ||
                      item.idProveedor
                    );
                  })
                )
              ),
            error:
              error
          });
        });
      });
  });

  const resultado = {
    correcto: true,
    paso: "29R",

    usuario: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol,
      idProveedorFicha:
        usuario.idProveedor || ""
    },

    permisoRegistrarVenta: {
      permitido:
        tienePermisoVentasContado_(
          "REGISTRAR_VENTA",
          usuario
        ),
      alcance:
        alcanceRegistrar,
      proveedorQueRestringeCatalogo:
        restriccionProveedor
    },

    oficinas:
      (comercial.oficinas || [])
        .map(function(item) {
          return {
            id:
              item.idOficina,
            nombre:
              item.nombre
          };
        }),

    contextos:
      contextos,

    contextosSinOfertas:
      contextos
        .filter(function(item) {
          return (
            !item.error &&
            item.totalOfertas === 0
          );
        })
        .length,

    mensaje:
      "Si proveedorQueRestringeCatalogo está vacío, un supervisor puede ver ofertas de todos los proveedores válidos para su Negocio + Oficina + Grupo."
  };

  console.log(
    "DIAGNOSTICO_CATALOGO_VENTAS_PASO29R\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29Q() {
  asegurarEstructuraVentasContado_();
  invalidarCacheVentasContadoPaso29Y_();

  const resultado = {
    correcto: true,
    paso: "29Q",
    mensaje:
      "Paso 29Q aplicado. Un usuario sin grupo específico puede seleccionar cualquier grupo activo de sus oficinas permitidas."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29Q\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarAlcanceComercialVentasPaso29Q() {
  const usuario =
    obtenerUsuarioActual();

  const opciones =
    resolverOpcionesComercialesVentasContado_(
      usuario
    );

  const resultado = {
    correcto: true,
    paso: "29Q",

    usuario: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol,
      idOficina:
        usuario.idOficina || "",
      idGrupo:
        usuario.idGrupo || ""
    },

    oficinasPermitidas:
      (opciones.oficinas || [])
        .map(function(item) {
          return {
            idOficina:
              item.idOficina,
            nombre:
              item.nombre
          };
        }),

    gruposDisponibles:
      (opciones.grupos || [])
        .map(function(item) {
          return {
            idGrupo:
              item.idGrupo,
            nombre:
              item.nombre,
            idOficina:
              item.idOficina
          };
        }),

    gruposPorOficina:
      Object.keys(
        opciones.gruposPorOficina || {}
      ).reduce(function(salida, idOficina) {
        salida[idOficina] =
          (
            opciones.gruposPorOficina[
              idOficina
            ] || []
          ).map(function(item) {
            return {
              idGrupo:
                item.idGrupo,
              nombre:
                item.nombre
            };
          });

        return salida;
      }, {}),

    predeterminados: {
      idOficina:
        opciones.idOficinaPredeterminada,
      idGrupo:
        opciones.idGrupoPredeterminado
    },

    tieneGrupoAsignado:
      opciones.tieneGrupoAsignado,

    advertencias:
      opciones.advertencias || []
  };

  console.log(
    "DIAGNOSTICO_ALCANCE_COMERCIAL_PASO29Q\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29P() {
  asegurarEstructuraVentasContado_();
  invalidarCacheVentasContadoPaso29Y_();

  const resultado = {
    correcto: true,
    paso: "29P",
    mensaje:
      "Paso 29P aplicado. Se optimizaron bandejas, modales, catálogo y búsqueda de Nueva venta."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29P\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarRendimientoVentasPaso29P() {
  const usuario = obtenerUsuarioActual();

  const medir = function(nombre, fn) {
    const inicio = Date.now();
    let resultado = null;
    let error = "";

    try {
      resultado = fn();
    } catch (e) {
      error = e.message || String(e);
    }

    return {
      nombre: nombre,
      ms: Date.now() - inicio,
      correcto: !error,
      error: error,
      filas:
        resultado && resultado.registros
          ? resultado.registros.length
          : 0
    };
  };

  const pruebas = [];

  [
    ["REGISTRADAS", "VER_LISTADO"],
    ["ABONOS", "CONFIRMAR_ABONO"],
    ["ENTREGAS", "GESTIONAR_ENTREGA"]
  ].forEach(function(item) {
    if (
      tienePermisoVentasContado_(
        item[1],
        usuario
      )
    ) {
      limpiarCacheEjecucionVentasPaso29P_();

      pruebas.push(
        medir(
          "LISTADO_" + item[0],
          function() {
            return construirListadoVentasContado_(
              {
                vista: item[0],
                pagina: 1,
                tamano: 50,
                estado: "TODOS",
                estadoAbono: "TODOS",
                texto: ""
              },
              usuario
            );
          }
        )
      );
    }
  });

  const resultado = {
    correcto:
      pruebas.every(function(item) {
        return item.correcto;
      }),
    paso: "29P",
    usuario: {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || ""
    },
    pruebas: pruebas
  };

  console.log(
    "RENDIMIENTO_VENTAS_PASO29P\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29O() {
  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();

    const libro =
      obtenerLibroMotor_(
        MOTOR_SGT360.BASES.OPERATION
      );

    const hoja =
      libro.getSheetByName(
        VENTAS_CONTADO_SGT360.HOJAS.CABECERA
      );

    let registrosNormalizados = 0;

    if (
      hoja &&
      hoja.getLastRow() > 1
    ) {
      const headers =
        hoja.getRange(
          1,
          1,
          1,
          hoja.getLastColumn()
        ).getDisplayValues()[0];

      const idx =
        crearMapaCabeceras(headers);

      const values =
        hoja.getRange(
          2,
          1,
          hoja.getLastRow() - 1,
          hoja.getLastColumn()
        ).getValues();

      let huboCambios = false;

      values.forEach(function(row) {
        let cambioFila = false;

        const estadoComprobante =
          obtenerEstadoAdjuntoVentaPaso29O_(
            typeof idx.ID_ARCHIVO_COMPROBANTE === "number"
              ? row[idx.ID_ARCHIVO_COMPROBANTE]
              : "",
            typeof idx.URL_COMPROBANTE === "number"
              ? row[idx.URL_COMPROBANTE]
              : ""
          );

        const estadoDeposito =
          obtenerEstadoAdjuntoVentaPaso29O_(
            typeof idx.ID_ARCHIVO_DEPOSITO_PROVEEDOR === "number"
              ? row[idx.ID_ARCHIVO_DEPOSITO_PROVEEDOR]
              : "",
            typeof idx.URL_DEPOSITO_PROVEEDOR === "number"
              ? row[idx.URL_DEPOSITO_PROVEEDOR]
              : ""
          );

        const estadoBoleta =
          obtenerEstadoAdjuntoVentaPaso29O_(
            typeof idx.ID_ARCHIVO_BOLETA_VENTA_CLIENTE === "number"
              ? row[idx.ID_ARCHIVO_BOLETA_VENTA_CLIENTE]
              : "",
            typeof idx.URL_BOLETA_VENTA_CLIENTE === "number"
              ? row[idx.URL_BOLETA_VENTA_CLIENTE]
              : ""
          );

        if (
          typeof idx.ESTADO_COMPROBANTE_PAGO_CLIENTE === "number" &&
          String(
            row[idx.ESTADO_COMPROBANTE_PAGO_CLIENTE] || ""
          ).trim() !== estadoComprobante
        ) {
          row[idx.ESTADO_COMPROBANTE_PAGO_CLIENTE] =
            estadoComprobante;
          cambioFila = true;
        }

        if (
          typeof idx.ESTADO_DEPOSITO_PROVEEDOR === "number" &&
          String(
            row[idx.ESTADO_DEPOSITO_PROVEEDOR] || ""
          ).trim() !== estadoDeposito
        ) {
          row[idx.ESTADO_DEPOSITO_PROVEEDOR] =
            estadoDeposito;
          cambioFila = true;
        }

        if (
          typeof idx.ESTADO_BOLETA_VENTA_CLIENTE === "number" &&
          String(
            row[idx.ESTADO_BOLETA_VENTA_CLIENTE] || ""
          ).trim() !== estadoBoleta
        ) {
          row[idx.ESTADO_BOLETA_VENTA_CLIENTE] =
            estadoBoleta;
          cambioFila = true;
        }

        if (cambioFila) {
          registrosNormalizados++;
          huboCambios = true;
        }
      });

      if (huboCambios) {
        hoja.getRange(
          2,
          1,
          values.length,
          hoja.getLastColumn()
        ).setValues(values);

        marcarRevisionDatosMotor_(
          MOTOR_SGT360.BASES.OPERATION,
          VENTAS_CONTADO_SGT360.HOJAS.CABECERA
        );
      }
    }

    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    invalidarCacheVentasContadoPaso29Y_();

    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29O",
      registrosNormalizados:
        registrosNormalizados,
      estadosDocumentales: [
        "CARGADO",
        "NO_CARGADO"
      ],
      mensaje:
        "Paso 29O aplicado. Los tres adjuntos comerciales cuentan con un estado documental persistido y exportable."
    };

    console.log(
      "ACTUALIZACION_VENTAS_PASO29O\n" +
      JSON.stringify(
        resultado,
        null,
        2
      )
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29O() {
  asegurarEstructuraVentasContado_();

  const libro =
    obtenerLibroMotor_(
      MOTOR_SGT360.BASES.OPERATION
    );

  const hoja =
    libro.getSheetByName(
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    );

  const requeridas = [
    "ESTADO_COMPROBANTE_PAGO_CLIENTE",
    "ESTADO_DEPOSITO_PROVEEDOR",
    "ESTADO_BOLETA_VENTA_CLIENTE"
  ];

  const headers =
    hoja && hoja.getLastColumn()
      ? hoja.getRange(
          1,
          1,
          1,
          hoja.getLastColumn()
        ).getDisplayValues()[0]
      : [];

  const mapa =
    crearMapaCabeceras(headers);

  const faltantes =
    requeridas.filter(function(nombre) {
      return typeof mapa[nombre] !== "number";
    });

  const ventas =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    ).map(mapearVentaContado_);

  const resumen = {
    comprobantePagoCliente: {
      cargado: 0,
      noCargado: 0
    },
    depositoProveedor: {
      cargado: 0,
      noCargado: 0
    },
    boletaVentaCliente: {
      cargado: 0,
      noCargado: 0
    }
  };

  ventas.forEach(function(venta) {
    const sumar = function(obj, estado) {
      if (estado === "CARGADO") {
        obj.cargado++;
      } else {
        obj.noCargado++;
      }
    };

    sumar(
      resumen.comprobantePagoCliente,
      venta.estadoComprobantePagoCliente
    );

    sumar(
      resumen.depositoProveedor,
      venta.estadoDepositoProveedor
    );

    sumar(
      resumen.boletaVentaCliente,
      venta.estadoBoletaVentaCliente
    );
  });

  const resultado = {
    correcto:
      faltantes.length === 0,
    paso: "29O",
    columnasFaltantes:
      faltantes,
    ventasTotales:
      ventas.length,
    resumenAdjuntos:
      resumen,
    mensaje:
      faltantes.length
        ? "Faltan columnas de estado documental."
        : "Diagnóstico Paso 29O correcto."
  };

  console.log(
    "DIAGNOSTICO_VENTAS_PASO29O\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29N() {
  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29N",
      mensaje:
        "Paso 29N aplicado. La aprobación de abonos puede almacenar el comprobante de depósito al proveedor y la boleta de venta para el cliente."
    };

    console.log(
      "ACTUALIZACION_VENTAS_PASO29N\n" +
      JSON.stringify(
        resultado,
        null,
        2
      )
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarModuloVentasContadoPaso29N() {
  asegurarEstructuraVentasContado_();

  const libro =
    obtenerLibroMotor_(
      MOTOR_SGT360.BASES.OPERATION
    );

  const hoja =
    libro.getSheetByName(
      VENTAS_CONTADO_SGT360
        .HOJAS.CABECERA
    );

  const requeridas = [
    "ID_ARCHIVO_DEPOSITO_PROVEEDOR",
    "URL_DEPOSITO_PROVEEDOR",
    "NOMBRE_DEPOSITO_PROVEEDOR",
    "MIME_DEPOSITO_PROVEEDOR",
    "ID_ARCHIVO_BOLETA_VENTA_CLIENTE",
    "URL_BOLETA_VENTA_CLIENTE",
    "NOMBRE_BOLETA_VENTA_CLIENTE",
    "MIME_BOLETA_VENTA_CLIENTE"
  ];

  const cabeceras =
    hoja && hoja.getLastColumn()
      ? hoja.getRange(
          1,
          1,
          1,
          hoja.getLastColumn()
        ).getDisplayValues()[0]
      : [];

  const mapa =
    crearMapaCabeceras(cabeceras);

  const faltantes =
    requeridas.filter(function(nombre) {
      return typeof mapa[nombre] !== "number";
    });

  const ventas =
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360
        .HOJAS.CABECERA
    ).map(mapearVentaContado_);

  const aprobadas =
    ventas.filter(function(venta) {
      return (
        venta.estadoAbono ===
        VENTAS_CONTADO_SGT360
          .ESTADOS_ABONO.CONFIRMADO
      );
    });

  const aprobadasConDocumentos =
    aprobadas.filter(function(venta) {
      return (
        Boolean(venta.urlDepositoProveedor) &&
        Boolean(venta.urlBoletaVentaCliente)
      );
    });

  const resultado = {
    correcto:
      faltantes.length === 0,

    paso:
      "29N",

    columnasFaltantes:
      faltantes,

    ventasAprobadas:
      aprobadas.length,

    ventasAprobadasConNuevosDocumentos:
      aprobadasConDocumentos.length,

    nota:
      "Las ventas aprobadas antes del Paso 29N pueden no tener estos dos documentos.",

    mensaje:
      faltantes.length
        ? "Faltan columnas del Paso 29N."
        : "Estructura Paso 29N correcta."
  };

  console.log(
    "DIAGNOSTICO_VENTAS_PASO29N\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29M() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();

    // Regraba definición/nombre/padre de los recursos sin tocar
    // las asignaciones existentes por rol.
    sincronizarModuloVentasContado_();
    sincronizarRecursosVentasContado_();

    invalidarCacheVentasContadoPaso29Y_();
    SpreadsheetApp.flush();

    const resultado = {
      correcto: true,
      paso: "29M",
      mensaje:
        "Paso 29M aplicado. Cada bandeja usa su propio permiso y alcance: Ver ventas, Validar abono y Gestionar entrega."
    };

    console.log(
      "ACTUALIZACION_VENTAS_PASO29M\n" +
      JSON.stringify(resultado, null, 2)
    );

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function diagnosticarPermisosVentasContadoPaso29M() {
  const usuario = obtenerUsuarioActual();

  const recursos = [
    "VISUALIZAR_MODULO",
    "VER_LISTADO",
    "VER_DETALLE",
    "CONFIRMAR_ABONO",
    "GESTIONAR_ENTREGA"
  ];

  const permisos = {};

  recursos.forEach(function(recurso) {
    const permitido =
      tienePermisoVentasContado_(
        recurso,
        usuario
      );

    permisos[recurso] = {
      permitido: permitido,
      alcance: permitido
        ? normalizarTexto(
            obtenerAlcancePermisoVentasContado_(
        recurso,
        usuario
      )
          )
        : "SIN_PERMISO"
    };
  });

  const resultado = {
    correcto: true,
    paso: "29M",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || ""
    },
    permisos: permisos,
    comportamientoEsperado: {
      ventasRegistradas:
        "VER_LISTADO",
      detalleVentasRegistradas:
        "VER_DETALLE",
      validacionAbonos:
        "CONFIRMAR_ABONO",
      gestionEntregas:
        "GESTIONAR_ENTREGA"
    }
  };

  console.log(
    "DIAGNOSTICO_PERMISOS_VENTAS_PASO29M\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso29L() {
  asegurarEstructuraVentasContado_();
  invalidarCacheVentasContadoPaso29Y_();

  const resultado = {
    correcto: true,
    paso: "29L",
    mensaje:
      "Hotfix Paso 29L aplicado. No requiere migración de datos; las bandejas usan el proveedor guardado en la venta y ya no reconstruyen todo el histórico de precios."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO29L\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

/**
 * Paso 29L — diagnóstico manual de rendimiento.
 * Ejecutar desde el editor si se desea medir la carga real del usuario actual.
 */
function diagnosticarRendimientoVentasPaso29L() {
  const inicio = Date.now();
  const usuario = obtenerUsuarioActual();

  const t1 = Date.now();
  asegurarEstructuraVentasContado_();
  const msEstructura = Date.now() - t1;

  const t2 = Date.now();
  const contexto = obtenerContextoVentasContadoModulo({
    incluirListadoInicial: false
  });
  const msContexto = Date.now() - t2;

  const t3 = Date.now();
  const listado = listarVentasContadoModulo({
    vista: "REGISTRADAS",
    pagina: 1,
    tamano: 50,
    estado: "TODOS",
    estadoAbono: "TODOS",
    texto: ""
  });
  const msListado = Date.now() - t3;

  const resultado = {
    correcto: true,
    paso: "29L",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || ""
    },
    tiemposMs: {
      estructura: msEstructura,
      contextoSinListado: msContexto,
      listadoRegistradas: msListado,
      total: Date.now() - inicio
    },
    filasListado:
      listado && listado.registros
        ? listado.registros.length
        : 0,
    revisionDatos:
      listado && listado.revisionDatos
        ? listado.revisionDatos
        : (
            contexto && contexto.revisionDatos
              ? contexto.revisionDatos
              : ""
          )
  };

  console.log(
    "RENDIMIENTO_VENTAS_PASO29L\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function diagnosticarModuloVentasContadoPaso29K() {
  asegurarEstructuraVentasContado_();

  const ventas = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  ).map(mapearVentaContado_);

  const detalles = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.DETALLE
  )
    .filter(function(row) {
      return normalizarTexto(
        row.ESTADO || CONFIG.ESTADOS.ACTIVO
      ) === CONFIG.ESTADOS.ACTIVO;
    })
    .map(mapearDetalleVentaContado_);

  const sinEstadoItem = detalles.filter(function(item) {
    return !String(item.estadoItem || "").trim();
  });

  const anulados = detalles.filter(
    esDetalleVentaAnuladoPaso29K_
  );

  const aprobadasSinSnapshot = ventas.filter(function(venta) {
    return (
      venta.estadoAbono ===
        VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO &&
      !Number(venta.importeAbonoAprobado || 0) &&
      Number(venta.totalVenta || 0) > 0
    );
  });

  const resultado = {
    correcto:
      sinEstadoItem.length === 0 &&
      aprobadasSinSnapshot.length === 0,
    paso: "29K",
    ventasTotales: ventas.length,
    detallesTotales: detalles.length,
    materialesAnulados: anulados.length,
    detallesSinEstadoItem: sinEstadoItem.length,
    ventasAprobadasSinImporteSnapshot:
      aprobadasSinSnapshot.length,
    mensaje:
      sinEstadoItem.length || aprobadasSinSnapshot.length
        ? "Existen registros pendientes de normalización."
        : "Diagnóstico Paso 29K correcto."
  };

  console.log(
    "DIAGNOSTICO_VENTAS_PASO29K\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}





function normalizarEstadosVentasContadoPaso29A_() {
  const ventas = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
  let actualizadas = 0;
  ventas.forEach(function(row) {
    const id = String(row.ID_VENTA || "").trim();
    if (!id) return;
    const estadoActual = normalizarTexto(row.ESTADO || VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA);
    const abono = normalizarTexto(row.ESTADO_ABONO || VENTAS_CONTADO_SGT360.ESTADOS_ABONO.PENDIENTE);
    let nuevo = estadoActual;
    if (
      estadoActual === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA ||
      estadoActual === VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA ||
      estadoActual === VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA ||
      estadoActual === VENTAS_CONTADO_SGT360.ESTADOS.PROGRAMADA
    ) return;
    if (abono === VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO) {
      nuevo = VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR;
    } else if (estadoActual === VENTAS_CONTADO_SGT360.ESTADOS.EXPORTADA) {
      nuevo = VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA;
    }
    if (nuevo !== estadoActual) {
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, "ID_VENTA", {
        ID_VENTA: id,
        ESTADO: nuevo,
        FECHA_ACTUALIZACION: new Date(),
        ID_USUARIO_ACTUALIZACION: "MIGRACION_29A"
      });
      actualizadas++;
    }
  });
  if (actualizadas) marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
  return { total: ventas.length, actualizadas: actualizadas };
}

/** Contexto inicial del módulo. */
function obtenerContextoVentasContadoModulo(filtrosIniciales) {
  const inicio = Date.now();

  limpiarCacheSeguridadVentasPaso29W_();
  limpiarCacheEjecucionVentasPaso29P_();

  const usuario = obtenerUsuarioActual();

  exigirPermisoVentasContado_(
    "VISUALIZAR_MODULO",
    usuario
  );

  filtrosIniciales =
    filtrosIniciales || {};

  const modoLigero =
    filtrosIniciales.modoLigero === true;

  const permisos = {
    puedeRegistrar:
      tienePermisoVentasContado_(
        "REGISTRAR_VENTA",
        usuario
      ),

    puedeListar:
      tienePermisoVentasContado_(
        "VER_LISTADO",
        usuario
      ),

    puedeExportar:
      tienePermisoVentasContado_(
        "EXPORTAR",
        usuario
      ),

    puedeEditar:
      tienePermisoVentasContado_(
        "EDITAR_VENTA",
        usuario
      ),

    puedeAnular:
      tienePermisoVentasContado_(
        "ANULAR",
        usuario
      ),

    puedeValidarAbono:
      tienePermisoVentasContado_(
        "CONFIRMAR_ABONO",
        usuario
      ),

    puedeConfirmarAbono:
      tienePermisoVentasContado_(
        "CONFIRMAR_ABONO",
        usuario
      ),

    puedeGestionarEntrega:
      tienePermisoVentasContado_(
        "GESTIONAR_ENTREGA",
        usuario
      ),

    puedeGestionarPruebas:
      puedeGestionarPruebasVentasPaso29T_(
        usuario
      ),

    puedeReclasificarTipoRegistro:
      puedeReclasificarVentaPaso29T_(
        usuario
      )
  };

  let vistaInicial =
    normalizarVistaVentasContadoPaso29M_(
      filtrosIniciales.vista ||
      "REGISTRADAS"
    );

  const vistaPermitida = function(vista) {
    if (vista === "ABONOS") {
      return permisos.puedeValidarAbono;
    }

    if (vista === "ENTREGAS") {
      return permisos.puedeGestionarEntrega;
    }

    return permisos.puedeListar;
  };

  if (!vistaPermitida(vistaInicial)) {
    if (permisos.puedeListar) {
      vistaInicial = "REGISTRADAS";
    } else if (permisos.puedeValidarAbono) {
      vistaInicial = "ABONOS";
    } else if (permisos.puedeGestionarEntrega) {
      vistaInicial = "ENTREGAS";
    } else {
      vistaInicial = "";
    }
  }

  // Paso 29W:
  // al abrir el módulo NO se leen oficinas, grupos ni negocios.
  // Esos datos se cargan únicamente al abrir Nueva venta / Modificar.
  const comercial =
    modoLigero
      ? {
          oficinas: [],
          grupos: [],
          gruposPorOficina: {},
          idOficinaPredeterminada: "",
          idGrupoPredeterminado: "",
          advertencias: []
        }
      : resolverOpcionesComercialesVentasContado_(
          usuario
        );

  const negociosVenta =
    modoLigero
      ? []
      : listarNegociosVentasContado_();

  const contexto = {
    correcto: true,

    contextoCompleto:
      modoLigero !== true,

    vistaInicial:
      vistaInicial,

    usuario: {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono || "",
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || "",
      esProveedor:
        Boolean(
          String(
            usuario.idProveedor || ""
          ).trim()
        )
    },

    comercial: comercial,
    permisos: permisos,

    estados:
      VENTAS_CONTADO_SGT360
        .ESTADOS_VISIBLES
        .slice(),

    estadosAbono:
      VENTAS_CONTADO_SGT360
        .ESTADOS_ABONO_VISIBLES
        .slice(),

    tiposRegistro: [
      {
        codigo: "COMERCIAL",
        nombre: "Venta comercial"
      },
      {
        codigo: "PRUEBA",
        nombre: "Venta de prueba"
      }
    ],

    negociosVenta: negociosVenta,

    tiposVenta:
      negociosVenta.map(function(item) {
        return {
          codigo: item.codigo,
          nombre: item.nombre,
          esGasodomestico:
            item.esGasodomestico === true
        };
      }),

    comprobantes: {
      tamanoMaximoBytes:
        VENTAS_CONTADO_SGT360
          .COMPROBANTES
          .TAMANO_MAXIMO_BYTES,

      mimesPermitidos:
        VENTAS_CONTADO_SGT360
          .COMPROBANTES
          .MIMES_PERMITIDOS
          .slice()
    },

    entrega: {
      motivosObservacion:
        VENTAS_CONTADO_SGT360
          .ENTREGA
          .MOTIVOS_OBSERVACION
          .slice(),

      tiposEvidencia:
        VENTAS_CONTADO_SGT360
          .ENTREGA
          .TIPOS_EVIDENCIA
          .slice(),

      maxEvidencias:
        VENTAS_CONTADO_SGT360
          .ENTREGA
          .MAX_EVIDENCIAS,

      tamanoMaximoBytes:
        VENTAS_CONTADO_SGT360
          .ENTREGA
          .TAMANO_MAXIMO_BYTES,

      mimesPermitidos:
        VENTAS_CONTADO_SGT360
          .ENTREGA
          .MIMES_PERMITIDOS
          .slice()
    },

    moneda:
      VENTAS_CONTADO_SGT360.MONEDA,

    revisionDatos:
      modoLigero
        ? ""
        : obtenerRevisionDatosMotor_(),

    fechaServidor:
      new Date().toISOString()
  };

  if (
    filtrosIniciales.incluirListadoInicial !== false &&
    vistaInicial
  ) {
    const filtrosListado =
      Object.assign(
        {
          pagina: 1,
          tamano: 50,
          estado: "TODOS",
          estadoAbono: "TODOS",
          texto: "",
          segmentoRegistro: "COMERCIAL"
        },
        filtrosIniciales,
        {
          vista: vistaInicial
        }
      );

    delete filtrosListado.incluirListadoInicial;
    delete filtrosListado.modoLigero;

    contexto.listadoInicial =
      construirListadoVentasContado_(
        filtrosListado,
        usuario
      );

    contexto.revisionDatos =
      contexto.listadoInicial
        .revisionDatos ||
      contexto.revisionDatos ||
      "";

    contexto.indiceDesactualizado =
      contexto.listadoInicial
        .indiceDesactualizado === true;
  }

  contexto.rendimiento = {
    servidorMs:
      Date.now() - inicio,
    modo:
      modoLigero
        ? "INICIO_LIGERO"
        : "FORMULARIO_COMPLETO"
  };

  return contexto;
}


/** Opciones rápidas del formulario de venta: productos, subtipos, materiales, proveedores y precio vigente por proveedor. */
function obtenerOpcionesFormularioVentaContadoModulo(filtros) {
  limpiarCacheSeguridadVentasPaso29W_();
  limpiarCacheEjecucionVentasPaso29P_();

  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);

  filtros = filtros || {};

  const alcance =
    validarAlcanceComercialVentasContado_(
      filtros,
      usuario,
      false
    );

  alcance.idNegocio =
    normalizarNegocioVentaContado_(
      filtros.idNegocio ||
      filtros.tipoVenta
    );

  if (!alcance.idNegocio) {
    return {
      correcto: true,
      ofertas: [],
      totalOfertas: 0,
      filtrosDisponibles: {
        productos: [],
        tipos: [],
        subtipos: [],
        marcas: [],
        proveedores: []
      },
      mensaje:
        "Selecciona el negocio de la venta."
    };
  }

  const ofertas =
    construirOfertasVentasContadoPaso29A_(
      alcance,
      usuario,
      convertirFechaMotor_(filtros.fecha) ||
      new Date()
    );

  ofertas.sort(function(a, b) {
    return (
      compararTextoMotor_(
        a.nombreMaterial ||
        a.descripcionMaterial,
        b.nombreMaterial ||
        b.descripcionMaterial
      ) ||
      compararTextoMotor_(a.proveedor, b.proveedor) ||
      compararTextoMotor_(
        a.detalleCombo,
        b.detalleCombo
      )
    );
  });

  const limite =
    Math.max(
      100,
      Math.min(
        Number(filtros.limite) || 1000,
        1500
      )
    );

  return {
    correcto: true,
    alcance: alcance.alcanceComercial,
    idNegocio: alcance.idNegocio,
    ofertas: ofertas.slice(0, limite),
    totalOfertas: ofertas.length,
    catalogoRecortado: ofertas.length > limite,
    limiteCatalogo: limite,
    filtrosDisponibles:
      construirFiltrosOfertasVentasContadoPaso29A_(
        ofertas
      ),
    mensaje:
      ofertas.length
        ? ""
        : "No se encontraron ofertas vigentes para el contexto seleccionado.",
    generadoEn:
      new Date().toISOString()
  };
}


function obtenerConfiguracionCatalogoProveedorVentasPaso29S_(
  usuario
) {
  usuario = usuario || obtenerUsuarioActual();

  const idProveedor =
    String(usuario.idProveedor || "").trim();

  // Usuarios internos/no asociados a proveedor trabajan con catálogo multimarca.
  if (!idProveedor) {
    return {
      idProveedor: "",
      alcanceCatalogo: "TODOS_PROVEEDORES",
      idProveedorRestriccion: ""
    };
  }

  const proveedor =
    listarProveedoresAdminMotor_()
      .find(function(item) {
        return (
          String(item.idProveedor || "").trim() ===
          idProveedor
        );
      }) || null;

  if (!proveedor) {
    throw new Error(
      "El proveedor asociado al usuario no existe en MAE_PROVEEDORES."
    );
  }

  if (
    proveedor.estado !==
    CONFIG.ESTADOS.ACTIVO
  ) {
    throw new Error(
      "El proveedor asociado al usuario está inactivo."
    );
  }

  const alcanceCatalogo =
    normalizarAlcanceCatalogoProveedorMotor_(
      proveedor.alcanceCatalogo,
      ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
    );

  return {
    idProveedor: idProveedor,
    nombreProveedor:
      proveedor.nombreMostrar ||
      proveedor.nombre ||
      idProveedor,
    alcanceCatalogo: alcanceCatalogo,
    idProveedorRestriccion:
      alcanceCatalogo ===
        ALCANCES_CATALOGO_PROVEEDOR_SGT360.SOLO_PROVEEDOR
        ? idProveedor
        : ""
  };
}

/**
 * Compatibilidad con el helper introducido en 29R.
 * En 29S la restricción ya no depende del alcance REGISTRAR_VENTA.
 */
function obtenerProveedorRestriccionCatalogoVentasPaso29R_(
  usuario
) {
  return obtenerConfiguracionCatalogoProveedorVentasPaso29S_(
    usuario
  ).idProveedorRestriccion;
}

function construirOfertasVentasContadoPaso29A_(alcance, usuario, fecha) {
  alcance = alcance || {};
  usuario = usuario || obtenerUsuarioActual();
  fecha = fecha || new Date();
  const materiales = construirVistaMaterialesPreciosCache_().filter(function(item) {
    return item && item.idMaterial && normalizarTexto(item.estado) === CONFIG.ESTADOS.ACTIVO;
  });
  const materialesPorId = {};
  materiales.forEach(function(item) { materialesPorId[String(item.idMaterial || "").trim()] = item; });
  const proveedoresPorId = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES, { usarValoresMostrados: true }).forEach(function(row) {
    const id = String(row.ID_PROVEEDOR || "").trim();
    if (!id || normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    proveedoresPorId[id] = {
      idProveedor: id,
      codigo: String(row.CODIGO_SAP || row.RUC || id).trim(),
      codigoSap: String(row.CODIGO_SAP || "").trim(),
      ruc: String(row.RUC || "").trim(),
      nombre: String(row.NOMBRE_COMERCIAL || row.RAZON_SOCIAL || row.NOMBRE || id).trim()
    };
  });
  const proveedorUsuario =
    obtenerProveedorRestriccionCatalogoVentasPaso29R_(
      usuario
    );
  const listasPorId = {};
  leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS).forEach(function(lista) {
    const id = String(lista.ID_LISTA_PRECIO || "").trim();
    const idProveedor = String(lista.ID_PROVEEDOR || "").trim();
    if (!id || !idProveedor || !proveedoresPorId[idProveedor]) return;
    if (proveedorUsuario && idProveedor !== proveedorUsuario) return;
    if (!listaVentaCumpleAlcance_(lista, alcance, fecha)) return;
    listasPorId[id] = lista;
  });
  const mejorPorMaterialProveedor = {};
  leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).forEach(function(detalle) {
    if (normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    const idMaterial = String(detalle.ID_MATERIAL || "").trim();
    const material = materialesPorId[idMaterial];
    if (!material) return;
    const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()];
    if (!lista) return;
    const idProveedor = String(lista.ID_PROVEEDOR || "").trim();
    const clave = idMaterial + "|" + idProveedor;
    const prioridad = prioridadOfertaVentaContadoPaso29A_(lista, alcance);
    const actual = mejorPorMaterialProveedor[clave];
    if (!actual || prioridad > actual.prioridad) {
      mejorPorMaterialProveedor[clave] = { detalle: detalle, lista: lista, prioridad: prioridad };
    }
  });
  return Object.keys(mejorPorMaterialProveedor).map(function(clave) {
    const candidato = mejorPorMaterialProveedor[clave];
    const detalle = candidato.detalle || {};
    const lista = candidato.lista || {};
    const material = materialesPorId[String(detalle.ID_MATERIAL || "").trim()] || {};
    const proveedor = proveedoresPorId[String(lista.ID_PROVEEDOR || "").trim()] || {};
    const combo = String(detalle.DETALLE_COMBO || detalle.COMPONENTES_INCLUIDOS || "").trim();
    const precio = Number(detalle.PRECIO_BASE || detalle.PRECIO || 0);
    return {
      idOferta: String(detalle.ID_DETALLE_PRECIO || "").trim(),
      idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
      idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
      idMaterial: String(material.idMaterial || "").trim(),
      codigoMaterial: String(material.codigoMaterial || "").trim(),
      codigoSap: String(material.codigoSap || "").trim(),
      nombreMaterial: String(material.nombreMaterial || material.descripcionMaterial || material.codigoMaterial || "").trim(),
      descripcionMaterial: String(material.descripcionMaterial || material.nombreMaterial || "").trim(),
      idProducto: String(material.idProducto || "").trim(),
      producto: String(material.producto || "").trim(),
      idTipoMaterial: String(material.idTipoMaterial || "").trim(),
      tipo: String(material.tipo || "").trim(),
      idSubtipoMaterial: String(material.idSubtipoMaterial || "").trim(),
      subtipo: String(material.subtipo || "").trim(),
      idMarca: String(material.idMarca || "").trim(),
      marca: String(material.marca || "").trim(),
      idProveedor: String(lista.ID_PROVEEDOR || "").trim(),
      codigoProveedor: proveedor.codigo || "",
      codigoSapProveedor: proveedor.codigoSap || proveedor.ruc || "",
      proveedor: proveedor.nombre || proveedor.idProveedor || "",
      precioBase: precio,
      precio: precio,
      moneda: String(detalle.MONEDA || VENTAS_CONTADO_SGT360.MONEDA).trim(),
      detalleCombo: combo,
      comentarioComercial: String(detalle.COMENTARIO_COMERCIAL || "").trim(),
      alcancePrecio: determinarAlcanceListaPrecio_(lista),
      idOficina: String(lista.ID_OFICINA || "").trim(),
      idGrupo: String(lista.ID_GRUPO || "").trim(),
      fechaInicio: normalizarFechaSalidaPrecio_(lista.FECHA_INICIO),
      fechaFin: normalizarFechaSalidaPrecio_(lista.FECHA_FIN)
    };
  }).filter(function(item) { return item.idOferta && item.idMaterial && item.idProveedor && Number.isFinite(item.precioBase); });
}

function prioridadOfertaVentaContadoPaso29A_(lista, alcance) {
  const lo = String(lista.ID_OFICINA || "").trim();
  const lg = String(lista.ID_GRUPO || "").trim();
  const ao = String(alcance && alcance.idOficina || "").trim();
  const ag = String(alcance && alcance.idGrupo || "").trim();
  let base = 100;
  if (ag && lg === ag && lo === ao) base = 300;
  else if (ao && lo === ao && !lg) base = 200;
  else if (!lo && !lg) base = 100;
  return base + Math.max(0, 40 - (Number(lista.PRIORIDAD) || 30));
}

function construirFiltrosOfertasVentasContadoPaso29A_(ofertas) {
  function opciones(campoId, campoNombre) {
    const mapa = {};
    (ofertas || []).forEach(function(item) {
      const id = String(item[campoId] || "").trim();
      if (!id) return;
      mapa[id] = { id: id, codigo: id, nombre: String(item[campoNombre] || id).trim() };
    });
    return Object.keys(mapa).map(function(id) { return mapa[id]; }).sort(function(a,b){ return compararTextoMotor_(a.nombre,b.nombre); });
  }
  return {
    productos: opciones("idProducto", "producto"),
    tipos: opciones("idTipoMaterial", "tipo"),
    subtipos: opciones("idSubtipoMaterial", "subtipo"),
    marcas: opciones("idMarca", "marca"),
    proveedores: opciones("idProveedor", "proveedor")
  };
}

function resolverOfertaVentaContadoPaso29A_(idDetallePrecio, alcance, usuario) {
  const id = String(idDetallePrecio || "").trim();
  if (!id) throw new Error("Selecciona una oferta vigente.");
  const ofertas = construirOfertasVentasContadoPaso29A_(alcance, usuario, new Date());
  const oferta = ofertas.find(function(item) { return item.idDetallePrecio === id; });
  if (!oferta) throw new Error("La oferta seleccionada ya no está vigente para el alcance comercial. Actualiza el catálogo y vuelve a seleccionarla.");
  return oferta;
}

function mapearPrecioVentaResueltoRapido_(idMaterial, candidato, totalCandidatos, idProveedorSeleccionado, proveedor) {
  const lista = candidato.lista || {};
  const detalle = candidato.detalle || {};
  const idOficina = String(lista.ID_OFICINA || "").trim();
  const idGrupo = String(lista.ID_GRUPO || "").trim();
  const proveedorPrecio = String(lista.ID_PROVEEDOR || "").trim();
  const idProveedor = String(idProveedorSeleccionado || proveedorPrecio || "").trim();
  proveedor = proveedor || {};
  return {
    correcto: true,
    encontrado: true,
    requiereSeleccion: false,
    requiereProveedor: false,
    totalCandidatos: totalCandidatos || 1,
    idMaterial: idMaterial,
    idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
    idProveedor: idProveedor,
    codigoSapProveedor: proveedor.codigoSap || "",
    rucProveedor: proveedor.ruc || "",
    nombreComercialProveedor: proveedor.nombreComercial || proveedor.razonSocial || proveedor.nombre || "",
    proveedor: proveedor,
    idOficina: idOficina,
    idGrupo: idGrupo,
    alcancePrecio: idGrupo ? "GRUPO" : (idOficina ? "OFICINA" : "GENERAL"),
    tipoPrecio: proveedorPrecio ? "ESPECIFICO_PROVEEDOR" : "GENERAL_MATERIAL",
    precioBase: Number(detalle.PRECIO_BASE || 0),
    moneda: String(detalle.MONEDA || lista.MONEDA || VENTAS_CONTADO_SGT360.MONEDA).trim(),
    fechaInicio: normalizarFechaSalidaPrecio_(lista.FECHA_INICIO),
    fechaFin: normalizarFechaSalidaPrecio_(lista.FECHA_FIN),
    tieneCombo: convertirBooleanoMotor_(detalle.TIENE_COMBO || detalle.ES_COMBO) ? "SI" : "NO",
    detalleCombo: String(detalle.DETALLE_COMBO || detalle.COMPONENTES_INCLUIDOS || "").trim(),
    mensaje: "Precio vigente resuelto."
  };
}

/** Lista productos principales con precio vigente en el alcance solicitado. */
function listarProductosVentasContadoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);
  filtros = filtros || {};
  const alcance = validarAlcanceComercialVentasContado_(filtros, usuario, false);
  alcance.idNegocio = normalizarNegocioVentaContado_(filtros.idNegocio || filtros.tipoVenta);
  const materiales = obtenerMaterialesConPrecioVigenteVentasContado_(alcance, usuario);
  const productos = {};
  materiales.forEach(function(item) {
    if (!item.idProducto) return;
    productos[item.idProducto] = {
      id: item.idProducto,
      nombre: item.producto || item.idProducto,
      totalMateriales: (productos[item.idProducto] ? productos[item.idProducto].totalMateriales : 0) + 1
    };
  });
  return {
    correcto: true,
    alcance: alcance.alcanceComercial,
    registros: Object.keys(productos).map(function(id) { return productos[id]; }).sort(function(a, b) {
      return compararTextoMotor_(a.nombre, b.nombre);
    })
  };
}

/** Lista subtipos con precio vigente para un producto principal. */
function listarSubtiposVentasContadoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);
  filtros = filtros || {};
  const alcance = validarAlcanceComercialVentasContado_(filtros, usuario, false);
  alcance.idNegocio = normalizarNegocioVentaContado_(filtros.idNegocio || filtros.tipoVenta);
  const idProducto = String(filtros.idProducto || "").trim();
  if (!idProducto) return { correcto: true, registros: [], mensaje: "Selecciona el producto principal." };
  const subtipos = {};
  obtenerMaterialesConPrecioVigenteVentasContado_(alcance, usuario).filter(function(item) {
    return item.idProducto === idProducto;
  }).forEach(function(item) {
    if (!item.idSubtipoMaterial) return;
    subtipos[item.idSubtipoMaterial] = {
      id: item.idSubtipoMaterial,
      nombre: item.subtipo || item.idSubtipoMaterial,
      idProducto: item.idProducto,
      producto: item.producto || "",
      totalMateriales: (subtipos[item.idSubtipoMaterial] ? subtipos[item.idSubtipoMaterial].totalMateriales : 0) + 1
    };
  });
  return {
    correcto: true,
    alcance: alcance.alcanceComercial,
    registros: Object.keys(subtipos).map(function(id) { return subtipos[id]; }).sort(function(a, b) {
      return compararTextoMotor_(a.nombre, b.nombre);
    })
  };
}

/** Lista tipos de material que tienen al menos un precio vigente en el alcance solicitado. */
function listarTiposMaterialesVentasContadoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);
  const alcance = validarAlcanceComercialVentasContado_(filtros || {}, usuario, false);
  alcance.idNegocio = normalizarNegocioVentaContado_(filtros && (filtros.idNegocio || filtros.tipoVenta));
  const materiales = obtenerMaterialesConPrecioVigenteVentasContado_(alcance, usuario);
  const tipos = {};
  materiales.forEach(function(item) {
    if (!item.idTipoMaterial) return;
    tipos[item.idTipoMaterial] = {
      id: item.idTipoMaterial,
      nombre: item.tipo || item.idTipoMaterial,
      totalMateriales: (tipos[item.idTipoMaterial] ? tipos[item.idTipoMaterial].totalMateriales : 0) + 1
    };
  });
  return {
    correcto: true,
    alcance: alcance.alcanceComercial,
    registros: Object.keys(tipos).map(function(id) { return tipos[id]; }).sort(function(a, b) {
      return compararTextoMotor_(a.nombre, b.nombre);
    })
  };
}

/** Lista materiales activos de un tipo con precio vigente. */
function listarMaterialesVentaContadoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);
  filtros = filtros || {};
  const alcance = validarAlcanceComercialVentasContado_(filtros, usuario, false);
  alcance.idNegocio = normalizarNegocioVentaContado_(filtros.idNegocio || filtros.tipoVenta);
  const idProducto = String(filtros.idProducto || "").trim();
  const idSubtipo = String(filtros.idSubtipoMaterial || filtros.idSubtipo || "").trim();
  const idTipo = String(filtros.idTipoMaterial || "").trim();
  if (!idProducto) return { correcto: true, registros: [], mensaje: "Selecciona el producto principal." };
  if (!idSubtipo) return { correcto: true, registros: [], mensaje: "Selecciona el subtipo." };
  const texto = normalizarTexto(filtros.texto || "");
  const limite = Math.max(20, Math.min(Number(filtros.limite) || 200, 300));
  let materiales = obtenerMaterialesConPrecioVigenteVentasContado_(alcance, usuario).filter(function(item) {
    return item.idProducto === idProducto && item.idSubtipoMaterial === idSubtipo && (!idTipo || item.idTipoMaterial === idTipo);
  });
  if (texto) {
    materiales = materiales.filter(function(item) {
      return [item.codigoMaterial, item.codigoSap, item.descripcionMaterial, item.nombreMaterial, item.tipo, item.subtipo, item.marca].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  materiales.sort(function(a, b) {
    return compararTextoMotor_(a.descripcionMaterial || a.nombreMaterial, b.descripcionMaterial || b.nombreMaterial) ||
      compararTextoMotor_(a.codigoMaterial, b.codigoMaterial);
  });
  return {
    correcto: true,
    alcance: alcance.alcanceComercial,
    registros: materiales.slice(0, limite).map(function(item) {
      return {
        idMaterial: item.idMaterial,
        codigoMaterial: item.codigoMaterial,
        codigoSap: item.codigoSap,
        descripcionMaterial: item.descripcionMaterial || item.nombreMaterial,
        unidadMedida: item.unidadMedida,
        idProducto: item.idProducto,
        producto: item.producto,
        idTipoMaterial: item.idTipoMaterial,
        tipo: item.tipo,
        idSubtipoMaterial: item.idSubtipoMaterial,
        subtipo: item.subtipo,
        precioReferencial: item.precioResuelto && item.precioResuelto.encontrado ? item.precioResuelto.precioBase : "",
        moneda: item.precioResuelto && item.precioResuelto.moneda || VENTAS_CONTADO_SGT360.MONEDA,
        requiereSeleccionPrecio: item.precioResuelto && item.precioResuelto.requiereSeleccion === true
      };
    }),
    totalFiltrado: materiales.length,
    limite: limite
  };
}

/** Resuelve precio vigente para un material en el contexto del formulario. */
function resolverPrecioVentaContadoRapidoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("VISUALIZAR_MODULO", usuario);
  filtros = filtros || {};
  const alcance = validarAlcanceComercialVentasContado_(filtros, usuario, false);
  alcance.idNegocio = normalizarNegocioVentaContado_(filtros.idNegocio || filtros.tipoVenta);
  if (filtros.idDetallePrecio || filtros.idOferta) {
    const oferta = resolverOfertaVentaContadoPaso29A_(filtros.idDetallePrecio || filtros.idOferta, alcance, usuario);
    return { correcto: true, encontrado: true, oferta: oferta, idMaterial: oferta.idMaterial, idDetallePrecio: oferta.idDetallePrecio, idListaPrecio: oferta.idListaPrecio, idProveedor: oferta.idProveedor, precioBase: oferta.precioBase, moneda: oferta.moneda, detalleCombo: oferta.detalleCombo, alcancePrecio: oferta.alcancePrecio };
  }
  const idMaterial = String(filtros.idMaterial || "").trim();
  if (!idMaterial) throw new Error("Selecciona el material.");
  const resuelto = resolverPrecioVentaContado_(idMaterial, alcance, usuario, filtros);
  return Object.assign({ correcto: resuelto.encontrado === true }, resuelto);
}

/** Resuelve precio vigente para un material en el contexto del formulario. */
function resolverPrecioVentaContadoModulo(filtros) {
  return resolverPrecioVentaContadoRapidoModulo(filtros);
}

/** Registra una venta y sus detalles. */

function resolverOfertaSeleccionadaCarritoPaso29H_(linea, alcance, usuario, numeroLinea) {
  linea = linea || {};
  const idDetallePrecio = String(
    linea.idDetallePrecio ||
    linea.idOferta ||
    linea.ID_DETALLE_PRECIO ||
    ""
  ).trim();

  if (!idDetallePrecio) {
    throw new Error(
      "La línea " + numeroLinea + " no tiene una oferta seleccionada."
    );
  }

  const oferta = resolverOfertaVentaContadoPaso29A_(
    idDetallePrecio,
    alcance,
    usuario
  );

  const idProveedorCarrito = String(
    linea.idProveedor ||
    linea.idProveedorPrecio ||
    linea.ID_PROVEEDOR_PRECIO ||
    ""
  ).trim();

  const idListaCarrito = String(
    linea.idListaPrecio ||
    linea.ID_LISTA_PRECIO ||
    ""
  ).trim();

  // El carrito ya conoce el proveedor/lista exactos de la oferta.
  // Se envían al servidor y se contrastan con el precio vigente para evitar
  // que una línea termine vinculada silenciosamente a otro proveedor.
  if (
    idProveedorCarrito &&
    String(oferta.idProveedor || "").trim() !== idProveedorCarrito
  ) {
    throw new Error(
      "La oferta de la línea " + numeroLinea +
      " cambió de proveedor. Actualiza el catálogo y vuelve a agregar el producto."
    );
  }

  if (
    idListaCarrito &&
    String(oferta.idListaPrecio || "").trim() !== idListaCarrito
  ) {
    throw new Error(
      "La oferta de la línea " + numeroLinea +
      " cambió de lista de precios. Actualiza el catálogo y vuelve a agregar el producto."
    );
  }

  if (!String(oferta.idProveedor || "").trim()) {
    throw new Error(
      "La oferta de la línea " + numeroLinea +
      " no tiene proveedor asociado en PRE_LISTAS_PRECIOS."
    );
  }

  return oferta;
}

function construirDetallesVentaContadoPaso29A_(idVenta, detallesEntrada, alcance, usuario, ahora) {
  if (!Array.isArray(detallesEntrada) || !detallesEntrada.length) throw new Error("Agrega al menos una oferta al carrito.");
  return detallesEntrada.map(function(linea, indice) {
    linea = linea || {};
    const oferta = resolverOfertaSeleccionadaCarritoPaso29H_(
      linea,
      alcance,
      usuario,
      indice + 1
    );
    const material = obtenerMaterialVentaContadoPorId_(oferta.idMaterial);
    if (!material || material.estado !== CONFIG.ESTADOS.ACTIVO) throw new Error("El material de la línea " + (indice + 1) + " no está activo.");
    let cantidad = Math.floor(Number(linea.cantidad || 1));
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 99) throw new Error("La cantidad de la línea " + (indice + 1) + " debe estar entre 1 y 99.");
    const precioUnitario = Number(oferta.precioBase || 0);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) throw new Error("La oferta de la línea " + (indice + 1) + " tiene un precio inválido.");
    const totalLinea = Math.round(precioUnitario * cantidad * 100) / 100;
    return {
      ID_DETALLE_VENTA: generarIdMotor_("DVT"),
      ID_VENTA: idVenta,
      LINEA: indice + 1,
      ID_TIPO_MATERIAL: material.idTipoMaterial,
      TIPO_MATERIAL: material.tipo,
      ID_MATERIAL: material.idMaterial,
      CODIGO_MATERIAL: material.codigoMaterial,
      CODIGO_SAP: material.codigoSap,
      DESCRIPCION_MATERIAL: material.descripcionMaterial || material.nombreMaterial,
      ID_PROVEEDOR_PRECIO: oferta.idProveedor || "",
      CODIGO_SAP_PROVEEDOR: oferta.codigoSapProveedor || "",
      NOMBRE_COMERCIAL_PROVEEDOR: oferta.proveedor || "",
      ID_LISTA_PRECIO: oferta.idListaPrecio || "",
      ID_DETALLE_PRECIO: oferta.idDetallePrecio || "",
      ALCANCE_PRECIO: oferta.alcancePrecio || "GENERAL",
      ID_OFICINA_PRECIO: oferta.idOficina || "",
      ID_GRUPO_PRECIO: oferta.idGrupo || "",
      PRECIO_UNITARIO: precioUnitario,
      MONEDA: oferta.moneda || VENTAS_CONTADO_SGT360.MONEDA,
      CANTIDAD: cantidad,
      TOTAL_LINEA: totalLinea,
      OBSERVACION_LINEA: limpiarTextoMotor_(oferta.detalleCombo || linea.observacion || "", 1000),
      ESTADO_ITEM: CONFIG.ESTADOS.ACTIVO,
      MOTIVO_ANULACION_ITEM: "",
      OBSERVACION_ANULACION_ITEM: "",
      FECHA_ANULACION_ITEM: "",
      ID_USUARIO_ANULACION_ITEM: "",
      CORREO_USUARIO_ANULACION_ITEM: "",
      ESTADO: CONFIG.ESTADOS.ACTIVO,
      FECHA_CREACION: ahora,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    };
  });
}


function estadoItemDetalleVentaContadoPaso29K_(detalle) {
  detalle = detalle || {};

  return normalizarTexto(
    detalle.estadoItem ||
    detalle.ESTADO_ITEM ||
    CONFIG.ESTADOS.ACTIVO
  );
}

function esDetalleVentaAnuladoPaso29K_(detalle) {
  return estadoItemDetalleVentaContadoPaso29K_(detalle) === "ANULADO";
}

function esDetalleVentaActivoPaso29K_(detalle) {
  return !esDetalleVentaAnuladoPaso29K_(detalle);
}

function totalLineaDetalleVentaPaso29K_(detalle) {
  return Number(
    detalle.totalLinea !== undefined
      ? detalle.totalLinea
      : detalle.TOTAL_LINEA || 0
  );
}

function cantidadDetalleVentaPaso29K_(detalle) {
  return Number(
    detalle.cantidad !== undefined
      ? detalle.cantidad
      : detalle.CANTIDAD || 0
  );
}

function calcularTotalesVigentesVentaPaso29K_(detalles) {
  const lista = Array.isArray(detalles) ? detalles : [];

  const activos = lista.filter(esDetalleVentaActivoPaso29K_);
  const anulados = lista.filter(esDetalleVentaAnuladoPaso29K_);

  return {
    totalItems: activos.reduce(function(total, item) {
      return total + cantidadDetalleVentaPaso29K_(item);
    }, 0),
    totalVentaVigente: Math.round(
      activos.reduce(function(total, item) {
        return total + totalLineaDetalleVentaPaso29K_(item);
      }, 0) * 100
    ) / 100,
    totalAnulado: Math.round(
      anulados.reduce(function(total, item) {
        return total + totalLineaDetalleVentaPaso29K_(item);
      }, 0) * 100
    ) / 100,
    cantidadLineasActivas: activos.length,
    cantidadLineasAnuladas: anulados.length
  };
}

function obtenerGestionesVentaPorProveedorPaso29K_(idVenta) {
  const mapa = {};

  leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
  ).forEach(function(row) {
    if (String(row.ID_VENTA || "").trim() !== idVenta) return;

    const idProveedor = String(row.ID_PROVEEDOR || "").trim();
    if (!idProveedor) return;

    mapa[idProveedor] = normalizarTexto(
      row.ESTADO_ENTREGA ||
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE
    );
  });

  return mapa;
}

function calcularEstadoVentaDesdeDetallesPaso29K_(
  venta,
  detalles,
  gestionesPorProveedor
) {
  venta = venta || {};
  detalles = Array.isArray(detalles) ? detalles : [];
  gestionesPorProveedor = gestionesPorProveedor || {};

  const activos = detalles.filter(esDetalleVentaActivoPaso29K_);

  if (!activos.length) {
    return VENTAS_CONTADO_SGT360.ESTADOS.ANULADA;
  }

  if (
    venta.estadoAbono !==
    VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
  ) {
    return VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA;
  }

  const proveedores = {};

  activos.forEach(function(detalle) {
    const idProveedor = String(
      detalle.idProveedorPrecio ||
      detalle.ID_PROVEEDOR_PRECIO ||
      ""
    ).trim();

    if (idProveedor) proveedores[idProveedor] = true;
  });

  const idsProveedores = Object.keys(proveedores);

  const estados = idsProveedores.map(function(idProveedor) {
    return gestionesPorProveedor[idProveedor] ||
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE;
  });

  if (
    estados.some(function(estado) {
      return estado ===
        VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA;
    })
  ) {
    return VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA;
  }

  if (
    estados.length &&
    estados.every(function(estado) {
      return estado ===
        VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA;
    })
  ) {
    return VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA;
  }

  if (
    estados.some(function(estado) {
      return estado ===
        VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA;
    })
  ) {
    return VENTAS_CONTADO_SGT360.ESTADOS.PROGRAMADA;
  }

  return VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR;
}

function puedeAnularMaterialVentaContadoPaso29K_(
  venta,
  detalle,
  usuario,
  estadoEntregaProveedor
) {
  if (!venta || !detalle || !usuario) return false;
  if (esVentaPruebaArchivadaPaso29T_(venta)) return false;
  if (esVentaPruebaPaso29T_(venta) && !puedeGestionarPruebasVentasPaso29T_(usuario)) return false;
  if (!tienePermisoVentasContado_("ANULAR", usuario)) return false;
  if (!esResponsableVentaContadoPaso29F_(venta, usuario)) return false;
  if (String(usuario.idProveedor || "").trim()) return false;

  if (
    normalizarTexto(venta.estado || "") ===
    VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
  ) {
    return false;
  }

  if (esDetalleVentaAnuladoPaso29K_(detalle)) return false;

  if (
    normalizarTexto(estadoEntregaProveedor || "") ===
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
  ) {
    return false;
  }

  return true;
}

function calcularTotalesVentaContadoPaso29A_(detalles) {
  return {
    totalItems: (detalles || []).reduce(function(total, item) { return total + Number(item.CANTIDAD || 0); }, 0),
    totalVenta: Math.round((detalles || []).reduce(function(total, item) { return total + Number(item.TOTAL_LINEA || 0); }, 0) * 100) / 100
  };
}

function guardarVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("REGISTRAR_VENTA", usuario);
  datos = datos || {};
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraVentasContado_();
    const tipoVenta = normalizarTipoVentaContado_(datos.tipoVenta || datos.idNegocio || "");
    const tipoRegistro = normalizarTipoRegistroSolicitadoPaso29T_(datos.tipoRegistro, usuario);
    datos.idNegocio = tipoVenta;
    const alcance = validarAlcanceComercialVentasContado_(datos, usuario, true);
    alcance.idNegocio = tipoVenta;
    const cliente = normalizarClienteVentaContado_(datos);
    const observacionesVenta = normalizarObservacionesVentaContado_(datos.observaciones);
    const ahora = new Date();
    const idVenta = generarIdMotor_("VTA");
    const codigoVenta = generarCodigoVentaContado_();
    const detalles = construirDetallesVentaContadoPaso29A_(idVenta, datos.detalles, alcance, usuario, ahora);
    const totales = calcularTotalesVentaContadoPaso29A_(detalles);
    const comprobante = guardarComprobanteVentaContado_(datos.comprobante, codigoVenta);
    const cabecera = {
      ID_VENTA: idVenta,
      CODIGO_VENTA: codigoVenta,
      FECHA_REGISTRO: ahora,
      TIPO_VENTA: tipoVenta,
      ES_GASODOMESTICO: esNegocioGasodomesticoVentaContado_(tipoVenta) ? "SI" : "NO",
      ID_USUARIO: usuario.idUsuario,
      CORREO_USUARIO: usuario.correo,
      NOMBRE_USUARIO: usuario.nombre,
      ROL_USUARIO: usuario.rol,
      ID_OFICINA: alcance.idOficina || "",
      NOMBRE_OFICINA: alcance.nombreOficina || "",
      ID_GRUPO: alcance.idGrupo || "",
      NOMBRE_GRUPO: alcance.nombreGrupo || "",
      ALCANCE_COMERCIAL: alcance.alcanceComercial,
      TIPO_REGISTRO: tipoRegistro,
      ESTADO_PRUEBA: tipoRegistro === VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.PRUEBA ? VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ACTIVA : "",
      FECHA_ARCHIVO_PRUEBA: "",
      ID_USUARIO_ARCHIVO_PRUEBA: "",
      CORREO_USUARIO_ARCHIVO_PRUEBA: "",
      OBSERVACION_ARCHIVO_PRUEBA: "",
      TIPO_REGISTRO_ANTERIOR: "",
      MOTIVO_RECLASIFICACION: "",
      FECHA_RECLASIFICACION: "",
      ID_USUARIO_RECLASIFICACION: "",
      CORREO_USUARIO_RECLASIFICACION: "",
      ES_CLIENTE_CALIDDA: cliente.esClienteCalidda ? "SI" : "NO",
      USA_CUENTA_CONTRATO: cliente.usaCuentaContrato ? "SI" : "NO",
      RECIBE_DIRECCION_CUENTA: cliente.recibeDireccionCuenta ? "SI" : "NO",
      CUENTA_CONTRATO: cliente.cuentaContrato,
      DNI: cliente.dni,
      DNI_CLIENTE: cliente.dniCliente,
      NOMBRE_CLIENTE: cliente.nombreCliente,
      DIRECCION_ENTREGA: cliente.direccionEntrega,
      REFERENCIA: cliente.referencia,
      TELEFONO: cliente.telefono,
      TELEFONO_CLIENTE: cliente.telefonoCliente,
      TIPO_RECEPTOR: cliente.tipoReceptor,
      NOMBRE_RECEPTOR: cliente.nombreReceptor,
      DNI_RECEPTOR: cliente.dniReceptor,
      TELEFONO_RECEPTOR: cliente.telefonoReceptor,
      RELACION_RECEPTOR: cliente.relacionReceptor,
      OBSERVACIONES: observacionesVenta,
      ID_ARCHIVO_COMPROBANTE: comprobante.idArchivo,
      URL_COMPROBANTE: comprobante.url,
      NOMBRE_COMPROBANTE: comprobante.nombre,
      MIME_COMPROBANTE: comprobante.mimeType,
      ESTADO_COMPROBANTE_PAGO_CLIENTE: "CARGADO",

      ID_ARCHIVO_DEPOSITO_PROVEEDOR: "",
      URL_DEPOSITO_PROVEEDOR: "",
      NOMBRE_DEPOSITO_PROVEEDOR: "",
      MIME_DEPOSITO_PROVEEDOR: "",
      ESTADO_DEPOSITO_PROVEEDOR: "NO_CARGADO",

      ID_ARCHIVO_BOLETA_VENTA_CLIENTE: "",
      URL_BOLETA_VENTA_CLIENTE: "",
      NOMBRE_BOLETA_VENTA_CLIENTE: "",
      MIME_BOLETA_VENTA_CLIENTE: "",
      ESTADO_BOLETA_VENTA_CLIENTE: "NO_CARGADO",

      ESTADO_ABONO: VENTAS_CONTADO_SGT360.ESTADOS_ABONO.PENDIENTE,
      ID_PROVEEDOR_CONFIRMACION_ABONO: "",
      FECHA_CONFIRMACION_ABONO: "",
      ID_USUARIO_CONFIRMACION_ABONO: "",
      CORREO_CONFIRMACION_ABONO: "",
      OBSERVACION_CONFIRMACION_ABONO: "",
      ESTADO: VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA,
      TOTAL_ITEMS: totales.totalItems,
      TOTAL_VENTA: totales.totalVenta,
      TOTAL_VENTA_ORIGINAL: totales.totalVenta,
      TOTAL_VENTA_VIGENTE: totales.totalVenta,
      TOTAL_ANULADO: 0,
      IMPORTE_ABONO_APROBADO: "",
      MONEDA: VENTAS_CONTADO_SGT360.MONEDA,
      FECHA_CREACION: ahora,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    };
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, "ID_VENTA", cabecera);
    detalles.forEach(function(detalle) { guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE, "ID_DETALLE_VENTA", detalle); });
    SpreadsheetApp.flush();
    registrarCambioMotor_(VENTAS_CONTADO_SGT360.CODIGO, "REGISTRAR_VENTA", "VENTA", idVenta, { codigoVenta: codigoVenta, totalVenta: totales.totalVenta, totalItems: totales.totalItems, alcance: alcance.alcanceComercial, tipoVenta: tipoVenta, tipoRegistro: tipoRegistro });
    const ventaListado = mapearVentaContado_(cabecera); delete ventaListado.fechaOrden;
    return { correcto: true, idVenta: idVenta, codigoVenta: codigoVenta, totalVenta: totales.totalVenta, totalItems: totales.totalItems, venta: ventaListado, detalles: detalles.map(mapearDetalleVentaContado_), mensaje: "Venta registrada correctamente. El abono queda Pendiente." };
  } finally {
    bloqueo.releaseLock();
  }
}

/** Lista ventas paginadas. */

/**
 * Construye mapas mínimos para recuperar el proveedor comercial desde el precio.
 * La relación funcional es:
 * PRE_LISTAS_PRECIOS.ID_PROVEEDOR -> PRE_LISTA_PRECIO_DETALLE -> material.
 */
function normalizarPrecioClaveVentaPaso29G_(precio) {
  const numero = Number(precio);
  return Number.isFinite(numero) ? numero.toFixed(4) : "";
}

function claveMaterialPrecioVentaPaso29G_(idMaterial, precio) {
  const id = String(idMaterial || "").trim();
  const valor = normalizarPrecioClaveVentaPaso29G_(precio);
  return id && valor ? id + "|" + valor : "";
}

function normalizarComboComparacionVentaPaso29G_(valor) {
  return normalizarTexto(valor || "").replace(/\s+/g, " ").trim();
}

/**
 * Construye mapas para recuperar el proveedor desde la oferta/precio que originó
 * la línea de venta. Incluye un fallback histórico Material + Precio + Alcance.
 */
function construirContextoProveedorPrecioVentaPaso29E_(necesitaDetallePrecio) {
  const listasPorId = {};

  leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS).forEach(function(lista) {
    const id = String(lista.ID_LISTA_PRECIO || "").trim();
    if (!id) return;

    listasPorId[id] = {
      idListaPrecio: id,
      idProveedor: String(lista.ID_PROVEEDOR || "").trim(),
      idNegocio: String(lista.ID_NEGOCIO || "").trim(),
      idOficina: String(lista.ID_OFICINA || "").trim(),
      idGrupo: String(lista.ID_GRUPO || "").trim(),
      fechaInicio: lista.FECHA_INICIO || "",
      fechaFin: lista.FECHA_FIN || "",
      estado: normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO)
    };
  });

  const listaPorDetalle = {};
  const detallePrecioPorId = {};
  const candidatosPorMaterialPrecio = {};

  if (necesitaDetallePrecio) {
    leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).forEach(function(detalle) {
      const idDetalle = String(detalle.ID_DETALLE_PRECIO || "").trim();
      const idLista = String(detalle.ID_LISTA_PRECIO || "").trim();
      const idMaterial = String(detalle.ID_MATERIAL || "").trim();
      const precio = Number(detalle.PRECIO_BASE || detalle.PRECIO || 0);

      if (!idDetalle) return;

      listaPorDetalle[idDetalle] = idLista;
      detallePrecioPorId[idDetalle] = {
        idDetallePrecio: idDetalle,
        idListaPrecio: idLista,
        idMaterial: idMaterial,
        precio: precio,
        detalleCombo: String(
          detalle.DETALLE_COMBO ||
          detalle.COMPONENTES_INCLUIDOS ||
          ""
        ).trim()
      };

      const lista = listasPorId[idLista] || {};
      const clave = claveMaterialPrecioVentaPaso29G_(idMaterial, precio);

      if (!clave || !lista.idProveedor) return;
      if (!candidatosPorMaterialPrecio[clave]) {
        candidatosPorMaterialPrecio[clave] = [];
      }

      candidatosPorMaterialPrecio[clave].push({
        idDetallePrecio: idDetalle,
        idListaPrecio: idLista,
        idMaterial: idMaterial,
        precio: precio,
        detalleCombo: String(
          detalle.DETALLE_COMBO ||
          detalle.COMPONENTES_INCLUIDOS ||
          ""
        ).trim(),
        idProveedor: String(lista.idProveedor || "").trim(),
        idOficina: String(lista.idOficina || "").trim(),
        idGrupo: String(lista.idGrupo || "").trim(),
        idNegocio: String(lista.idNegocio || "").trim(),
        fechaInicio: lista.fechaInicio || "",
        fechaFin: lista.fechaFin || "",
        estadoLista: String(lista.estado || "").trim()
      });
    });
  }

  const proveedoresPorId = {};

  leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    CONFIG.HOJAS.PROVEEDORES,
    { usarValoresMostrados: true }
  ).forEach(function(row) {
    const id = String(row.ID_PROVEEDOR || "").trim();
    if (!id) return;

    proveedoresPorId[id] = {
      idProveedor: id,
      codigoSap: String(row.CODIGO_SAP || "").trim(),
      nombre: String(
        row.NOMBRE_COMERCIAL ||
        row.RAZON_SOCIAL ||
        row.NOMBRE ||
        id
      ).trim()
    };
  });

  return {
    listasPorId: listasPorId,
    listaPorDetalle: listaPorDetalle,
    detallePrecioPorId: detallePrecioPorId,
    candidatosPorMaterialPrecio: candidatosPorMaterialPrecio,
    proveedoresPorId: proveedoresPorId
  };
}

function fechaVentaDentroVigenciaPrecioPaso29H_(fechaVenta, inicio, fin) {
  if (!fechaVenta) return true;

  const fv = new Date(fechaVenta);
  if (Number.isNaN(fv.getTime())) return true;

  const fi = inicio ? new Date(inicio) : null;
  const ff = fin ? new Date(fin) : null;

  if (fi && !Number.isNaN(fi.getTime()) && fv.getTime() < fi.getTime()) {
    return false;
  }

  if (ff && !Number.isNaN(ff.getTime()) && fv.getTime() > ff.getTime()) {
    return false;
  }

  return true;
}

function resolverProveedorLineaVentaDesdeContextoPrecioPaso29G_(
  detalle,
  contexto,
  venta
) {
  detalle = detalle || {};
  contexto = contexto || {};
  venta = venta || {};

  let idLista = String(detalle.idListaPrecio || "").trim();
  let idDetalle = String(detalle.idDetallePrecio || "").trim();
  let idProveedor = String(detalle.idProveedorPrecio || "").trim();

  // 1. La referencia exacta guardada en la línea siempre tiene prioridad.
  if (!idLista && idDetalle) {
    idLista = String(
      (contexto.listaPorDetalle || {})[idDetalle] || ""
    ).trim();
  }

  if (
    !idProveedor &&
    idLista &&
    contexto.listasPorId &&
    contexto.listasPorId[idLista]
  ) {
    idProveedor = String(
      contexto.listasPorId[idLista].idProveedor || ""
    ).trim();
  }

  // 2. Fallback histórico. Solo se usa para ventas antiguas que no conservaron
  //    la referencia exacta del precio/proveedor.
  if (!idProveedor) {
    const clave = claveMaterialPrecioVentaPaso29G_(
      detalle.idMaterial,
      detalle.precioUnitario
    );

    let candidatos = clave && contexto.candidatosPorMaterialPrecio
      ? (contexto.candidatosPorMaterialPrecio[clave] || []).slice()
      : [];

    const idGrupo = String(
      detalle.idGrupoPrecio ||
      venta.idGrupo ||
      ""
    ).trim();

    const idOficina = String(
      detalle.idOficinaPrecio ||
      venta.idOficina ||
      ""
    ).trim();

    const negocioVenta = String(
      venta.tipoVenta ||
      venta.idNegocio ||
      ""
    ).trim();

    const fechaVenta =
      venta.fechaRegistroRaw ||
      venta.fechaRegistro ||
      venta.fechaCreacion ||
      "";

    // Negocio de la venta.
    if (negocioVenta) {
      const negocioExacto = candidatos.filter(function(item) {
        return !String(item.idNegocio || "").trim() ||
          String(item.idNegocio || "").trim() === negocioVenta;
      });
      if (negocioExacto.length) candidatos = negocioExacto;
    }

    // Vigencia que existía cuando se registró la venta.
    if (fechaVenta) {
      const vigentesFecha = candidatos.filter(function(item) {
        return fechaVentaDentroVigenciaPrecioPaso29H_(
          fechaVenta,
          item.fechaInicio,
          item.fechaFin
        );
      });
      if (vigentesFecha.length) candidatos = vigentesFecha;
    }

    // Se reproduce la misma prioridad utilizada al vender:
    // Grupo -> Oficina -> General.
    if (idGrupo && idOficina) {
      const grupoExacto = candidatos.filter(function(item) {
        return String(item.idGrupo || "").trim() === idGrupo &&
          String(item.idOficina || "").trim() === idOficina;
      });

      if (grupoExacto.length) {
        candidatos = grupoExacto;
      } else {
        const oficinaExacta = candidatos.filter(function(item) {
          return String(item.idOficina || "").trim() === idOficina &&
            !String(item.idGrupo || "").trim();
        });

        if (oficinaExacta.length) {
          candidatos = oficinaExacta;
        } else {
          const generales = candidatos.filter(function(item) {
            return !String(item.idOficina || "").trim() &&
              !String(item.idGrupo || "").trim();
          });
          if (generales.length) candidatos = generales;
        }
      }
    } else if (idOficina) {
      const oficinaExacta = candidatos.filter(function(item) {
        return String(item.idOficina || "").trim() === idOficina &&
          !String(item.idGrupo || "").trim();
      });

      if (oficinaExacta.length) {
        candidatos = oficinaExacta;
      } else {
        const generales = candidatos.filter(function(item) {
          return !String(item.idOficina || "").trim() &&
            !String(item.idGrupo || "").trim();
        });
        if (generales.length) candidatos = generales;
      }
    }

    const comboLinea = normalizarComboComparacionVentaPaso29G_(
      detalle.detalleCombo ||
      detalle.observacionLinea ||
      ""
    );

    if (comboLinea && candidatos.length > 1) {
      const exactosCombo = candidatos.filter(function(item) {
        return normalizarComboComparacionVentaPaso29G_(
          item.detalleCombo
        ) === comboLinea;
      });

      if (exactosCombo.length) candidatos = exactosCombo;
    }

    const proveedoresUnicos = {};
    candidatos.forEach(function(item) {
      const id = String(item.idProveedor || "").trim();
      if (id) proveedoresUnicos[id] = true;
    });

    const idsProveedores = Object.keys(proveedoresUnicos);

    // Nunca se adivina un proveedor si quedan dos candidatos diferentes.
    if (idsProveedores.length === 1) {
      idProveedor = idsProveedores[0];

      const candidato = candidatos.find(function(item) {
        return String(item.idProveedor || "").trim() === idProveedor;
      }) || {};

      if (!idLista) {
        idLista = String(candidato.idListaPrecio || "").trim();
      }

      if (!idDetalle) {
        idDetalle = String(candidato.idDetallePrecio || "").trim();
      }
    }
  }

  return {
    idProveedor: idProveedor,
    idListaPrecio: idLista,
    idDetallePrecio: idDetalle,
    proveedor: idProveedor && contexto.proveedoresPorId
      ? (contexto.proveedoresPorId[idProveedor] || null)
      : null
  };
}

/**
 * Completa en memoria el proveedor de cada línea de venta usando la lista/precio
 * que realmente originó la venta. No depende de REL_PROVEEDOR_MATERIAL.
 */
function enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(detalles) {
  const lista = Array.isArray(detalles) ? detalles : [];

  const requiereProveedor = lista.some(function(detalle) {
    return !String(detalle.idProveedorPrecio || "").trim() &&
      Boolean(
        String(detalle.idListaPrecio || "").trim() ||
        String(detalle.idDetallePrecio || "").trim() ||
        (
          String(detalle.idMaterial || "").trim() &&
          Number.isFinite(Number(detalle.precioUnitario))
        )
      );
  });

  const requiereNombre = lista.some(function(detalle) {
    return Boolean(String(detalle.idProveedorPrecio || "").trim()) &&
      !String(detalle.nombreComercialProveedor || "").trim();
  });

  if (!requiereProveedor && !requiereNombre) return lista;

  const contexto = construirContextoProveedorPrecioVentaPaso29E_(
    requiereProveedor
  );

  const ventasPorId = {};

  if (requiereProveedor) {
    leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    ).map(mapearVentaContado_).forEach(function(venta) {
      const id = String(venta.idVenta || "").trim();
      if (id) ventasPorId[id] = venta;
    });
  }

  lista.forEach(function(detalle) {
    const venta =
      ventasPorId[String(detalle.idVenta || "").trim()] ||
      {};

    const resolucion =
      resolverProveedorLineaVentaDesdeContextoPrecioPaso29G_(
        detalle,
        contexto,
        venta
      );

    if (resolucion.idListaPrecio && !detalle.idListaPrecio) {
      detalle.idListaPrecio = resolucion.idListaPrecio;
    }

    if (resolucion.idDetallePrecio && !detalle.idDetallePrecio) {
      detalle.idDetallePrecio = resolucion.idDetallePrecio;
    }

    if (resolucion.idProveedor && !detalle.idProveedorPrecio) {
      detalle.idProveedorPrecio = resolucion.idProveedor;
    }

    const proveedor = resolucion.proveedor || (
      detalle.idProveedorPrecio && contexto.proveedoresPorId
        ? contexto.proveedoresPorId[detalle.idProveedorPrecio]
        : null
    );

    if (proveedor) {
      if (!detalle.codigoSapProveedor) {
        detalle.codigoSapProveedor = proveedor.codigoSap || "";
      }

      if (!detalle.nombreComercialProveedor) {
        detalle.nombreComercialProveedor =
          proveedor.nombre ||
          detalle.idProveedorPrecio ||
          "";
      }
    }
  });

  return lista;
}

/**
 * Migra líneas históricas. Además de ID_LISTA_PRECIO / ID_DETALLE_PRECIO,
 * Paso 29G recupera el proveedor por Material + Precio + Alcance cuando la
 * combinación identifica un único proveedor.
 */
function normalizarProveedorDetallesVentasDesdePreciosPaso29E_() {
  const hoja = obtenerHojaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.DETALLE,
    false
  );

  if (!hoja || hoja.getLastRow() < 2) {
    return { revisadas: 0, actualizadas: 0, sinResolver: 0 };
  }

  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();
  const cabeceras = hoja
    .getRange(1, 1, 1, ultimaColumna)
    .getDisplayValues()[0];

  const indice = {};
  cabeceras.forEach(function(cabecera, i) {
    indice[normalizarTexto(cabecera)] = i;
  });

  const requeridas = [
    "ID_DETALLE_VENTA",
    "ID_VENTA",
    "ID_PROVEEDOR_PRECIO",
    "ID_LISTA_PRECIO",
    "ID_DETALLE_PRECIO",
    "ID_MATERIAL",
    "PRECIO_UNITARIO"
  ];

  if (requeridas.some(function(campo) { return indice[campo] === undefined; })) {
    return { revisadas: 0, actualizadas: 0, sinResolver: 0 };
  }

  const valores = hoja
    .getRange(2, 1, ultimaFila - 1, ultimaColumna)
    .getValues();

  const contexto = construirContextoProveedorPrecioVentaPaso29E_(true);

  const ventasPorId = {};
  leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  ).map(mapearVentaContado_).forEach(function(venta) {
    const id = String(venta.idVenta || "").trim();
    if (id) ventasPorId[id] = venta;
  });

  let revisadas = 0;
  let actualizadas = 0;
  let sinResolver = 0;

  valores.forEach(function(fila) {
    if (
      indice.ESTADO !== undefined &&
      normalizarTexto(fila[indice.ESTADO] || CONFIG.ESTADOS.ACTIVO) !==
        CONFIG.ESTADOS.ACTIVO
    ) {
      return;
    }

    revisadas++;

    const detalle = {
      idVenta: String(fila[indice.ID_VENTA] || "").trim(),
      idMaterial: String(fila[indice.ID_MATERIAL] || "").trim(),
      idProveedorPrecio: String(fila[indice.ID_PROVEEDOR_PRECIO] || "").trim(),
      idListaPrecio: String(fila[indice.ID_LISTA_PRECIO] || "").trim(),
      idDetallePrecio: String(fila[indice.ID_DETALLE_PRECIO] || "").trim(),
      precioUnitario: Number(fila[indice.PRECIO_UNITARIO] || 0),
      alcancePrecio: indice.ALCANCE_PRECIO !== undefined
        ? String(fila[indice.ALCANCE_PRECIO] || "").trim()
        : "",
      idOficinaPrecio: indice.ID_OFICINA_PRECIO !== undefined
        ? String(fila[indice.ID_OFICINA_PRECIO] || "").trim()
        : "",
      idGrupoPrecio: indice.ID_GRUPO_PRECIO !== undefined
        ? String(fila[indice.ID_GRUPO_PRECIO] || "").trim()
        : "",
      observacionLinea: indice.OBSERVACION_LINEA !== undefined
        ? String(fila[indice.OBSERVACION_LINEA] || "").trim()
        : ""
    };

    const resolucion = resolverProveedorLineaVentaDesdeContextoPrecioPaso29G_(
      detalle,
      contexto,
      ventasPorId[detalle.idVenta] || {}
    );

    if (!resolucion.idProveedor) {
      if (detalle.idMaterial && Number.isFinite(detalle.precioUnitario)) {
        sinResolver++;
      }
      return;
    }

    let cambio = false;

    function asignar(campo, valor) {
      if (indice[campo] === undefined) return;
      const actual = String(fila[indice[campo]] || "").trim();
      const nuevo = String(valor || "").trim();
      if (actual !== nuevo) {
        fila[indice[campo]] = nuevo;
        cambio = true;
      }
    }

    asignar("ID_PROVEEDOR_PRECIO", resolucion.idProveedor);
    asignar("ID_LISTA_PRECIO", resolucion.idListaPrecio);
    asignar("ID_DETALLE_PRECIO", resolucion.idDetallePrecio);

    if (resolucion.proveedor) {
      asignar("CODIGO_SAP_PROVEEDOR", resolucion.proveedor.codigoSap || "");
      asignar("NOMBRE_COMERCIAL_PROVEEDOR", resolucion.proveedor.nombre || "");
    }

    if (cambio) actualizadas++;
  });

  if (actualizadas) {
    hoja.getRange(2, 1, valores.length, ultimaColumna).setValues(valores);
    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    );
    SpreadsheetApp.flush();
  }

  return {
    revisadas: revisadas,
    actualizadas: actualizadas,
    sinResolver: sinResolver
  };
}


function normalizarVistaVentasContadoPaso29M_(vista) {
  const valor = normalizarTexto(vista || "REGISTRADAS");

  if (
    ["REGISTRADAS", "ABONOS", "ENTREGAS"].indexOf(valor) === -1
  ) {
    throw new Error("La bandeja de Ventas solicitada no es válida.");
  }

  return valor;
}

function obtenerRecursoBandejaVentasContadoPaso29M_(
  vista,
  paraDetalle
) {
  const normalizada =
    normalizarVistaVentasContadoPaso29M_(vista);

  if (normalizada === "ABONOS") {
    return "CONFIRMAR_ABONO";
  }

  if (normalizada === "ENTREGAS") {
    return "GESTIONAR_ENTREGA";
  }

  return paraDetalle === true
    ? "VER_DETALLE"
    : "VER_LISTADO";
}

function obtenerAlcanceBandejaVentasContadoPaso29M_(
  vista,
  usuario,
  paraDetalle
) {
  const recurso =
    obtenerRecursoBandejaVentasContadoPaso29M_(
      vista,
      paraDetalle
    );

  return normalizarTexto(
    obtenerAlcancePermisoVentasContado_(
        recurso,
        usuario
      )
  );
}

function listarVentasContadoModulo(filtros) {
  limpiarCacheSeguridadVentasPaso29W_();

  const usuario = obtenerUsuarioActual();

  filtros = filtros || {};

  const vista =
    normalizarVistaVentasContadoPaso29M_(
      filtros.vista || "REGISTRADAS"
    );

  const recurso =
    obtenerRecursoBandejaVentasContadoPaso29M_(
      vista,
      false
    );

  // Paso 29M:
  // cada bandeja se autoriza con su propio permiso.
  //
  // REGISTRADAS -> VER_LISTADO
  // ABONOS      -> CONFIRMAR_ABONO
  // ENTREGAS    -> GESTIONAR_ENTREGA
  exigirPermisoVentasContado_(recurso, usuario);

  filtros.vista = vista;

  limpiarCacheEjecucionVentasPaso29P_();

  return construirListadoVentasContado_(
    filtros,
    usuario
  );
}

function construirListadoVentasContado_(filtros, usuario) {
  const inicio = Date.now();

  filtros = filtros || {};
  usuario = usuario || obtenerUsuarioActual();

  const vista =
    normalizarVistaVentasContadoPaso29M_(
      filtros.vista || "REGISTRADAS"
    );

  const recursoVista =
    obtenerRecursoBandejaVentasContadoPaso29M_(
      vista,
      false
    );

  const alcanceVista =
    normalizarTexto(
      obtenerAlcancePermisoVentasContado_(
        recursoVista,
        usuario
      )
    );

  const inicioIndice =
    Date.now();

  const indice =
    obtenerIndiceVentasDisponiblePaso29Y_();

  const indiceMs =
    Date.now() -
    inicioIndice;

  let registros =
    (
      indice.payload &&
      indice.payload.ventas ||
      []
    )
      .map(function(item) {
        return Object.assign({}, item);
      });

  registros =
    filtrarVentasContadoPorAlcance_(
      registros,
      usuario,
      recursoVista
    );

  registros =
    filtrarTipoRegistroVentasPaso29T_(
      registros,
      filtros,
      usuario
    );

  if (vista === "ABONOS") {
    registros =
      registros.filter(function(item) {
        if (
          item.estado ===
          VENTAS_CONTADO_SGT360
            .ESTADOS.ANULADA
        ) {
          return false;
        }

        return (
          item.estadoAbono ===
            VENTAS_CONTADO_SGT360
              .ESTADOS_ABONO.PENDIENTE ||
          item.estadoAbono ===
            VENTAS_CONTADO_SGT360
              .ESTADOS_ABONO.OBSERVADO
        );
      });
  } else if (vista === "ENTREGAS") {
    registros =
      registros.filter(function(item) {
        return (
          item.estadoAbono ===
            VENTAS_CONTADO_SGT360
              .ESTADOS_ABONO.CONFIRMADO &&
          [
            VENTAS_CONTADO_SGT360
              .ESTADOS.POR_ENTREGAR,
            VENTAS_CONTADO_SGT360
              .ESTADOS.PROGRAMADA,
            VENTAS_CONTADO_SGT360
              .ESTADOS.OBSERVADA,
            VENTAS_CONTADO_SGT360
              .ESTADOS.ENTREGADA
          ].indexOf(item.estado) !== -1
        );
      });
  }

  const proveedorUsuario =
    alcanceVista === "PROVEEDOR"
      ? String(
          usuario.idProveedor || ""
        ).trim()
      : "";

  registros =
    registros.map(function(item) {
      const copia =
        Object.assign({}, item);

      const mapaImportes =
        copia._importeProveedor29Y ||
        {};

      copia.importeVisible =
        proveedorUsuario
          ? (
              Math.round(
                Number(
                  mapaImportes[
                    proveedorUsuario
                  ] || 0
                ) * 100
              ) / 100
            )
          : Number(
              copia.totalVenta || 0
            );

      copia.puedeModificar =
        usuarioPuedeModificarVentaContado_(
          copia,
          usuario
        ) &&
        copia.estado ===
          VENTAS_CONTADO_SGT360
            .ESTADOS.REGISTRADA &&
        copia.estadoAbono !==
          VENTAS_CONTADO_SGT360
            .ESTADOS_ABONO.CONFIRMADO;

      copia.puedeAnularObservada =
        puedeAnularVentaObservadaPaso29F_(
          copia,
          usuario
        ) &&
        copia._tieneEntregaConfirmada29Y !==
          true;

      copia.puedeArchivarPrueba =
        esVentaPruebaPaso29T_(copia) &&
        !esVentaPruebaArchivadaPaso29T_(
          copia
        ) &&
        puedeGestionarPruebasVentasPaso29T_(
          usuario
        ) &&
        usuarioPuedeAccederVentaPaso29T_(
          copia,
          usuario
        );

      copia.puedeReclasificarTipoRegistro =
        puedeReclasificarVentaPaso29T_(
          usuario
        ) &&
        usuarioPuedeAccederVentaPaso29T_(
          copia,
          usuario
        );

      return copia;
    });

  registros =
    aplicarFiltrosVentasContado_(
      registros,
      filtros
    );

  // El índice ya está ordenado descendente por fecha.
  // Los filtros preservan el orden; no se vuelve a ordenar el arreglo completo.

  const importe =
    Math.round(
      registros.reduce(
        function(total, item) {
          return (
            total +
            Number(
              item.importeVisible || 0
            )
          );
        },
        0
      ) * 100
    ) / 100;

  const salida =
    paginarArregloMotor_(
      registros.map(function(item) {
        const copia =
          Object.assign({}, item);

        delete copia.fechaOrden;
        delete copia._proveedoresVenta29Y;
        delete copia._importeProveedor29Y;
        delete copia._tieneEntregaConfirmada29Y;

        return copia;
      }),
      filtros.pagina || 1,
      Math.min(
        200,
        Number(filtros.tamano) || 50
      )
    );

  salida.correcto = true;
  salida.vista = vista;

  salida.segmentoRegistro =
    normalizarSegmentoRegistroVentasPaso29T_(
      filtros.segmentoRegistro,
      usuario,
      vista
    );

  salida.resumen = {
    total: registros.length,
    importe: importe
  };

  salida.revisionDatos =
    String(
      indice.meta &&
      indice.meta.revision || ""
    );

  salida.generadoEn =
    new Date().toISOString();

  salida.fuenteDatos =
    "INDICE_RAPIDO_29Y";

  salida.indiceGeneradoEn =
    String(
      indice.meta &&
      indice.meta.generadoEn || ""
    );

  salida.indiceDesactualizado =
    indice.desactualizado === true;

  salida.rendimiento = {
    servidorMs:
      Date.now() - inicio,

    fuente:
      "INDICE_RAPIDO_29Y",

    indiceMs:
      indiceMs,

    almacenamientoIndice:
      String(
        indice.meta &&
        indice.meta.almacenamiento ||
        ""
      ),

    lecturaIndice:
      indice.lectura || null
  };

  return salida;
}

function obtenerDetalleVentaContadoModulo(
  idVenta,
  vistaSolicitada
) {
  limpiarCacheSeguridadVentasPaso29W_();

  const usuario =
    obtenerUsuarioActual();

  return obtenerDetalleVentaContadoPaso29Y_(
    idVenta,
    vistaSolicitada,
    usuario
  );
}

function obtenerDetalleVentaContadoPaso29Y_(
  idVenta,
  vistaSolicitada,
  usuario
) {
  const inicio = Date.now();

  usuario =
    usuario || obtenerUsuarioActual();

  const vista =
    normalizarVistaVentasContadoPaso29M_(
      vistaSolicitada ||
      "REGISTRADAS"
    );

  const recursoDetalle =
    obtenerRecursoBandejaVentasContadoPaso29M_(
      vista,
      true
    );

  exigirPermisoVentasContado_(
    recursoDetalle,
    usuario
  );

  const alcanceDetalle =
    normalizarTexto(
      obtenerAlcancePermisoVentasContado_(
        recursoDetalle,
        usuario
      )
    );

  const id =
    String(idVenta || "").trim();

  const resultadoPaquete =
    obtenerPaqueteDetalleVentaPaso29Y_(
      id
    );

  const paquete =
    resultadoPaquete.paquete;

  if (!paquete || !paquete.venta) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  const venta =
    Object.assign(
      {},
      paquete.venta
    );

  exigirVisibilidadTipoRegistroVentaPaso29T_(
    venta,
    usuario
  );

  if (
    !filtrarVentasContadoPorAlcance_(
      [venta],
      usuario,
      recursoDetalle
    ).length
  ) {
    throw new Error(
      "No tienes acceso a esta venta en la bandeja seleccionada."
    );
  }

  const detallesTodos =
    (paquete.detalles || [])
      .map(function(detalle) {
        const copia =
          Object.assign({}, detalle);

        copia.detalleCombo =
          copia.detalleCombo ||
          copia.observacionLinea ||
          "";

        return copia;
      })
      .sort(function(a, b) {
        return a.linea - b.linea;
      });

  const detalles =
    filtrarDetallesVentaContadoParaUsuario_(
      detallesTodos,
      usuario,
      recursoDetalle
    );

  const proveedorUsuario =
    alcanceDetalle === "PROVEEDOR"
      ? String(
          usuario.idProveedor || ""
        ).trim()
      : "";

  const detallesVisiblesActivos =
    detalles.filter(
      esDetalleVentaActivoPaso29K_
    );

  venta.importeVisible =
    proveedorUsuario
      ? (
          Math.round(
            detallesVisiblesActivos
              .reduce(
                function(total, item) {
                  return (
                    total +
                    Number(
                      item.totalLinea || 0
                    )
                  );
                },
                0
              ) * 100
          ) / 100
        )
      : Number(
          venta.totalVenta || 0
        );

  if (proveedorUsuario) {
    venta.totalVenta =
      venta.importeVisible;

    venta.totalVentaVigente =
      venta.importeVisible;

    venta.totalItems =
      detallesVisiblesActivos
        .reduce(
          function(total, item) {
            return (
              total +
              Number(
                item.cantidad || 0
              )
            );
          },
          0
        );
  }

  const idsProveedores = {};

  detallesTodos
    .filter(
      esDetalleVentaActivoPaso29K_
    )
    .forEach(function(item) {
      const proveedor =
        String(
          item.idProveedorPrecio || ""
        ).trim();

      if (proveedor) {
        idsProveedores[
          proveedor
        ] = true;
      }
    });

  const gestiones =
    (paquete.gestiones || [])
      .filter(function(gestion) {
        return (
          !proveedorUsuario ||
          String(
            gestion.idProveedor || ""
          ).trim() === proveedorUsuario
        );
      })
      .map(function(gestion) {
        return Object.assign(
          {},
          gestion
        );
      });

  const evidencias =
    (paquete.evidencias || [])
      .filter(function(evidencia) {
        return (
          !proveedorUsuario ||
          String(
            evidencia.idProveedor || ""
          ).trim() === proveedorUsuario
        );
      })
      .map(function(evidencia) {
        return Object.assign(
          {},
          evidencia
        );
      });

  gestiones.forEach(function(gestion) {
    gestion.evidencias =
      evidencias.filter(
        function(evidencia) {
          return (
            evidencia.idGestionEntrega ===
            gestion.idGestionEntrega
          );
        }
      );
  });

  const gestionPorProveedor = {};

  gestiones.forEach(function(gestion) {
    const proveedor =
      String(
        gestion.idProveedor || ""
      ).trim();

    if (proveedor) {
      gestionPorProveedor[
        proveedor
      ] = gestion;
    }
  });

  detalles.forEach(function(detalle) {
    const proveedor =
      String(
        detalle.idProveedorPrecio || ""
      ).trim();

    const gestion =
      proveedor
        ? (
            gestionPorProveedor[
              proveedor
            ] || null
          )
        : null;

    detalle.estadoEntrega =
      gestion
        ? gestion.estadoEntrega
        : VENTAS_CONTADO_SGT360
            .ENTREGA.ESTADOS.PENDIENTE;

    detalle.fechaProgramadaEntrega =
      gestion
        ? gestion.fechaProgramadaEntrega
        : "";

    detalle.detalleObservacionEntrega =
      gestion
        ? gestion.detalleObservacion
        : "";

    detalle.fechaUltimaGestionEntrega =
      gestion
        ? gestion.fechaUltimaGestion
        : "";

    detalle.fechaEntrega =
      gestion
        ? gestion.fechaEntrega
        : "";

    detalle.idGestionEntrega =
      gestion
        ? gestion.idGestionEntrega
        : "";

    detalle.puedeAnularMaterial =
      puedeAnularMaterialVentaContadoPaso29K_(
        venta,
        detalle,
        usuario,
        gestion
          ? gestion.estadoEntrega
          : ""
      );
  });

  const diferenciaRegularizacion =
    Math.max(
      0,
      Math.round(
        (
          Number(
            venta.importeAbonoAprobado || 0
          ) -
          Number(
            venta.totalVentaVigente ||
            venta.totalVenta ||
            0
          )
        ) * 100
      ) / 100
    );

  venta.requiereRegularizacionFinanciera =
    (
      venta.estadoAbono ===
        VENTAS_CONTADO_SGT360
          .ESTADOS_ABONO.CONFIRMADO &&
      diferenciaRegularizacion > 0
    );

  venta.diferenciaRegularizacion =
    diferenciaRegularizacion;

  return {
    correcto: true,
    venta: venta,
    detalles: detalles,
    proveedoresVenta:
      Object.keys(
        idsProveedores
      ),
    gestionesEntrega: gestiones,
    evidenciasEntrega: evidencias,

    puedeModificar:
      usuarioPuedeModificarVentaContado_(
        venta,
        usuario
      ) &&
      venta.estado ===
        VENTAS_CONTADO_SGT360
          .ESTADOS.REGISTRADA &&
      venta.estadoAbono !==
        VENTAS_CONTADO_SGT360
          .ESTADOS_ABONO.CONFIRMADO,

    puedeConfirmarAbono:
      puedeConfirmarAbonoVentaContado_(
        venta,
        detallesTodos,
        usuario
      ),

    puedeObservarAbono:
      puedeObservarAbonoVentaContado_(
        venta,
        detallesTodos,
        usuario
      ),

    puedeGestionarEntrega:
      puedeGestionarEntregaVentaContadoPaso29A_(
        venta,
        detallesTodos,
        usuario
      ),

    puedeAnularObservada:
      puedeAnularVentaObservadaPaso29F_(
        venta,
        usuario
      ),

    puedeArchivarPrueba:
      esVentaPruebaPaso29T_(venta) &&
      !esVentaPruebaArchivadaPaso29T_(
        venta
      ) &&
      puedeGestionarPruebasVentasPaso29T_(
        usuario
      ) &&
      usuarioPuedeAccederVentaPaso29T_(
        venta,
        usuario
      ),

    puedeReclasificarTipoRegistro:
      puedeReclasificarVentaPaso29T_(
        usuario
      ) &&
      usuarioPuedeAccederVentaPaso29T_(
        venta,
        usuario
      ),

    rendimiento: {
      servidorMs:
        Date.now() - inicio,
      fuente:
        resultadoPaquete.fuente
    }
  };
}


/**
 * Paso 30B
 *
 * Precarga en UNA sola ejecución todas las bandejas de Ventas que el usuario
 * está autorizado a utilizar.
 *
 * Buenas prácticas:
 * - usa únicamente el índice rápido 29Y;
 * - no abre hojas completas en la ruta habitual;
 * - conserva el alcance independiente de cada bandeja;
 * - no entrega bandejas para las que el usuario no tenga permiso;
 * - los detalles incluidos son solo los que ya están calientes en CacheService;
 * - nunca fuerza lecturas puntuales de Sheets durante esta precarga.
 */
function precargarBandejasVentasContadoModulo(
  opciones
) {
  const inicio =
    Date.now();

  limpiarCacheSeguridadVentasPaso29W_();

  const usuario =
    obtenerUsuarioActual();

  exigirPermisoVentasContado_(
    "VISUALIZAR_MODULO",
    usuario
  );

  opciones =
    opciones || {};

  const segmentoSolicitado =
    normalizarTexto(
      opciones.segmentoRegistro ||
      "COMERCIAL"
    );

  const tamano =
    Math.max(
      10,
      Math.min(
        100,
        Number(
          opciones.tamano || 50
        )
      )
    );

  const incluirDetalles =
    opciones.incluirDetalles !==
    false;

  const permisos = {
    REGISTRADAS:
      tienePermisoVentasContado_(
        "VER_LISTADO",
        usuario
      ),

    ABONOS:
      tienePermisoVentasContado_(
        "CONFIRMAR_ABONO",
        usuario
      ),

    ENTREGAS:
      tienePermisoVentasContado_(
        "GESTIONAR_ENTREGA",
        usuario
      )
  };

  const vistas =
    [
      "REGISTRADAS",
      "ABONOS",
      "ENTREGAS"
    ]
      .filter(function(vista) {
        return permisos[vista] === true;
      });

  const bandejas = {};
  const detallesCalientes = {};

  let revision = "";
  let indiceDesactualizado = false;

  vistas.forEach(function(vista) {
    const segmento =
      normalizarSegmentoRegistroVentasPaso29T_(
        segmentoSolicitado,
        usuario,
        vista
      );

    const filtros = {
      texto: "",
      estado: "TODOS",
      estadoAbono: "TODOS",
      segmentoRegistro: segmento,
      fechaDesde: "",
      fechaHasta: "",
      pagina: 1,
      tamano: tamano,
      vista: vista
    };

    const resultado =
      construirListadoVentasContado_(
        filtros,
        usuario
      );

    bandejas[vista] =
      resultado;

    if (
      resultado.revisionDatos
    ) {
      revision =
        String(
          resultado.revisionDatos
        );
    }

    if (
      resultado.indiceDesactualizado ===
      true
    ) {
      indiceDesactualizado =
        true;
    }
  });

  if (incluirDetalles) {
    let totalDetalles = 0;

    vistas.forEach(function(vista) {
      if (totalDetalles >= 9) {
        return;
      }

      const resultado =
        bandejas[vista] || {};

      const filas =
        (
          resultado.registros ||
          resultado.items ||
          []
        )
          .slice(0, 3);

      filas.forEach(function(venta) {
        if (totalDetalles >= 9) {
          return;
        }

        const idVenta =
          String(
            venta.idVenta || ""
          ).trim();

        if (!idVenta) {
          return;
        }

        // Solo usar un detalle que YA esté caliente.
        // Si no está en CacheService se omite para no aumentar la espera
        // de esta precarga de bandejas.
        const paqueteCaliente =
          leerPaqueteDetalleVentasPaso29Y_(
            idVenta
          );

        if (!paqueteCaliente) {
          return;
        }

        try {
          const detalle =
            obtenerDetalleVentaContadoPaso29Y_(
              idVenta,
              vista,
              usuario
            );

          if (!detallesCalientes[vista]) {
            detallesCalientes[vista] = {};
          }

          detallesCalientes[vista][
            idVenta
          ] = detalle;

          totalDetalles++;
        } catch (error) {
          // La precarga nunca debe fallar completa por un detalle individual.
        }
      });
    });
  }

  return {
    correcto: true,
    paso: "30B",

    vistas: vistas,

    bandejas:
      bandejas,

    detallesCalientes:
      detallesCalientes,

    revisionDatos:
      revision,

    indiceDesactualizado:
      indiceDesactualizado,

    generadoEn:
      new Date().toISOString(),

    rendimiento: {
      servidorMs:
        Date.now() - inicio,

      bandejas:
        vistas.reduce(
          function(acumulado, vista) {
            const resultado =
              bandejas[vista] || {};

            acumulado[vista] =
              resultado.rendimiento &&
              Number(
                resultado.rendimiento
                  .servidorMs || 0
              ) || 0;

            return acumulado;
          },
          {}
        ),

      detallesCalientes:
        Object.keys(
          detallesCalientes
        )
          .reduce(
            function(total, vista) {
              return (
                total +
                Object.keys(
                  detallesCalientes[
                    vista
                  ] || {}
                ).length
              );
            },
            0
          )
    }
  };
}




function actualizarModuloVentasContadoPaso30E() {
  limpiarMarcaIndiceVentasSucioPaso29Y_();

  const indice =
    construirIndiceVentasPaso29Y_();

  instalarMantenimientoIndiceVentasPaso29Y_();

  invalidarCacheMotor_(
    "VENTAS_CONTADO"
  );

  const diagnostico =
    diagnosticarIndiceVentasPaso30E();

  const resultado = {
    correcto:
      diagnostico.correcto,
    paso: "30E",
    indice:
      indice,
    diagnostico:
      diagnostico,
    mensaje:
      "Paso 30E aplicado. Índices pequeños se almacenan como JSON inline en una sola entrada; índices grandes conservan GZIP + chunks."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO30E\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso30D() {
  const resultado30C =
    actualizarModuloVentasContadoPaso30C();

  const resultado = {
    correcto: true,
    paso: "30D",
    ventas: resultado30C,
    mensaje:
      "Paso 30D aplicado en Ventas. Se conserva la precarga inteligente 30B y se utiliza el índice compacto 30C para reducir el costo de la primera bandeja."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO30D\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso30C() {
  limpiarMarcaIndiceVentasSucioPaso29Y_();

  const indice =
    construirIndiceVentasPaso29Y_();

  instalarMantenimientoIndiceVentasPaso29Y_();

  invalidarCacheMotor_(
    "VENTAS_CONTADO"
  );

  const resultado = {
    correcto: true,
    paso: "30C",
    indice: indice,
    mensaje:
      "Paso 30C aplicado. El índice principal contiene solo campos de bandeja, los chunks se leen en lote y el acceso a archivos dispone de diagnóstico de permisos/Drive."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO30C\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarIndiceVentasPaso30C() {
  VENTAS_CONTADO_INDICE_MEMORIA_29Y_ =
    null;

  const tiempos = {};

  let inicio =
    Date.now();

  const meta =
    leerMetaIndiceVentasPaso29Y_();

  tiempos.metaMs =
    Date.now() - inicio;

  if (!meta) {
    return {
      correcto: false,
      paso: "30E",
      error:
        "No existe meta del índice."
    };
  }

  let payload = null;
  let fuente = "";

  if (
    String(
      meta.almacenamiento || ""
    ).toUpperCase() ===
      "INLINE_JSON" &&
    meta.payload
  ) {
    fuente =
      "INLINE_JSON";

    inicio =
      Date.now();

    payload =
      meta.payload;

    tiempos.materializacionMs =
      Date.now() - inicio;

    tiempos.getAllChunksMs = 0;
    tiempos.descompresionMs = 0;
  } else {
    fuente =
      "GZIP_CHUNKS";

    const cache =
      obtenerCacheIndiceVentasPaso29Y_();

    const claves = [];

    for (
      let i = 0;
      i <
      Number(
        meta.chunks || 0
      );
      i++
    ) {
      claves.push(
        VENTAS_CONTADO_INDICE_29Y_
          .CHUNK_PREFIX +
        i
      );
    }

    inicio =
      Date.now();

    const mapa =
      claves.length
        ? cache.getAll(claves)
        : {};

    tiempos.getAllChunksMs =
      Date.now() - inicio;

    const partes =
      claves.map(function(clave) {
        return mapa[clave] || "";
      });

    const completos =
      partes.length > 0 &&
      partes.every(Boolean);

    if (completos) {
      inicio =
        Date.now();

      payload =
        descomprimirValorVentasPaso29Y_(
          partes.join("")
        );

      tiempos.descompresionMs =
        Date.now() - inicio;
    }

    tiempos.materializacionMs = 0;
  }

  inicio =
    Date.now();

  const dirty =
    indiceVentasEstaSucioPaso29Y_();

  tiempos.dirtyMs =
    Date.now() - inicio;

  const resultado = {
    correcto:
      Boolean(payload),

    paso: "30E",

    fuente:
      fuente,

    meta: {
      version:
        meta.version || "",
      estructura:
        meta.estructura || "",
      almacenamiento:
        meta.almacenamiento || "",
      chunks:
        Number(
          meta.chunks || 0
        ),
      bytesJson:
        Number(
          meta.bytesJson || 0
        ),
      caracteresComprimidos:
        Number(
          meta.caracteresComprimidos ||
          0
        ),
      revision:
        meta.revision || "",
      generadoEn:
        meta.generadoEn || "",
      totalVentas:
        Number(
          meta.totalVentas || 0
        )
    },

    totalVentas:
      payload &&
      Array.isArray(
        payload.ventas
      )
        ? payload.ventas.length
        : 0,

    estructura:
      payload
        ? (
            payload.estructura ||
            ""
          )
        : "",

    tiempos:
      tiempos,

    totalMs:
      Object.keys(tiempos)
        .reduce(function(
          total,
          clave
        ) {
          return (
            total +
            Number(
              tiempos[clave] ||
              0
            )
          );
        }, 0),

    indiceDesactualizado:
      dirty
  };

  console.log(
    "DIAGNOSTICO_INDICE_VENTAS_PASO30E\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarIndiceVentasPaso30E() {
  return diagnosticarIndiceVentasPaso30C();
}

function diagnosticarAccesoArchivosVentasPaso30C(
  idVenta,
  correoUsuario
) {
  const actor =
    obtenerUsuarioActual();

  const correoObjetivo =
    normalizarCorreo(
      correoUsuario ||
      actor.correo
    );

  if (
    normalizarTexto(actor.rol) !==
      CONFIG.ROLES.SUPERADMIN &&
    correoObjetivo !==
      normalizarCorreo(actor.correo)
  ) {
    throw new Error(
      "Solo SUPERADMIN puede diagnosticar el acceso de otro usuario."
    );
  }

  const usuario =
    correoObjetivo ===
      normalizarCorreo(actor.correo)
      ? actor
      : buscarUsuarioPorCorreo(
          correoObjetivo
        );

  if (!usuario) {
    throw new Error(
      "No se encontró el usuario indicado."
    );
  }

  limpiarCacheSeguridadVentasPaso29W_();

  const id =
    String(idVenta || "").trim();

  const paqueteResultado =
    obtenerPaqueteDetalleVentaPaso29Y_(
      id
    );

  const paquete =
    paqueteResultado &&
    paqueteResultado.paquete
      ? paqueteResultado.paquete
      : null;

  const venta =
    paquete &&
    paquete.venta
      ? paquete.venta
      : null;

  if (!venta) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  const recursos = [
    "VER_LISTADO",
    "VER_DETALLE",
    "CONFIRMAR_ABONO",
    "GESTIONAR_ENTREGA"
  ];

  const accesos = {};

  recursos.forEach(function(recurso) {
    const permitido =
      tienePermisoVentasContado_(
        recurso,
        usuario
      );

    const alcance =
      permitido
        ? obtenerAlcancePermisoVentasContado_(
            recurso,
            usuario
          )
        : "SIN_PERMISO";

    const incluyeVenta =
      permitido
        ? filtrarVentasContadoPorAlcance_(
            [venta],
            usuario,
            recurso
          ).length > 0
        : false;

    accesos[recurso] = {
      permitido:
        permitido,
      alcance:
        alcance,
      incluyeVenta:
        incluyeVenta
    };
  });

  const autorizadoArchivo =
    usuarioPuedeLeerArchivoVentaPaso29U_(
      venta,
      usuario
    );

  const archivos = [
    {
      tipo:
        "COMPROBANTE_PAGO_CLIENTE",
      id:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoComprobante,
          venta.urlComprobante
        )
    },
    {
      tipo:
        "DEPOSITO_PROVEEDOR",
      id:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoDepositoProveedor,
          venta.urlDepositoProveedor
        )
    },
    {
      tipo:
        "BOLETA_VENTA_CLIENTE",
      id:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoBoletaVentaCliente,
          venta.urlBoletaVentaCliente
        )
    }
  ];

  (paquete.evidencias || [])
    .forEach(function(evidencia) {
      const idArchivo =
        extraerIdArchivoDriveVentaPaso29U_(
          evidencia.idArchivo,
          evidencia.url
        );

      if (idArchivo) {
        archivos.push({
          tipo:
            evidencia.tipoEvidencia ||
            "EVIDENCIA_ENTREGA",
          id:
            idArchivo
        });
      }
    });

  const pruebasDrive =
    archivos
      .filter(function(item) {
        return Boolean(item.id);
      })
      .map(function(item) {
        try {
          const archivo =
            DriveApp.getFileById(
              item.id
            );

          return {
            tipo:
              item.tipo,
            idArchivo:
              item.id,
            driveLegible:
              true,
            nombreDrive:
              archivo.getName()
          };
        } catch (error) {
          return {
            tipo:
              item.tipo,
            idArchivo:
              item.id,
            driveLegible:
              false,
            error:
              error &&
              error.message
                ? error.message
                : String(error)
          };
        }
      });

  const effectiveUser =
    normalizarCorreo(
      Session
        .getEffectiveUser()
        .getEmail()
    );

  const activeUser =
    normalizarCorreo(
      Session
        .getActiveUser()
        .getEmail()
    );

  const resultado = {
    correcto: true,
    paso: "30C",

    actor:
      actor.correo,

    usuarioDiagnosticado: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol,
      idProveedor:
        usuario.idProveedor || "",
      idOficina:
        usuario.idOficina || "",
      idGrupo:
        usuario.idGrupo || ""
    },

    venta: {
      idVenta:
        venta.idVenta,
      codigoVenta:
        venta.codigoVenta,
      idUsuario:
        venta.idUsuario,
      idOficina:
        venta.idOficina,
      idGrupo:
        venta.idGrupo
    },

    accesos:
      accesos,

    autorizadoArchivoPorAplicacion:
      autorizadoArchivo,

    identidadAppsScript: {
      effectiveUser:
        effectiveUser,
      activeUser:
        activeUser,
      coincideConUsuarioDiagnosticado:
        effectiveUser ===
          normalizarCorreo(
            usuario.correo
          )
    },

    archivosDrive:
      pruebasDrive,

    interpretacion: {
      permisoAplicacion:
        autorizadoArchivo
          ? "OK"
          : "BLOQUEADO",

      drive:
        pruebasDrive.length &&
        pruebasDrive.every(
          function(item) {
            return item.driveLegible;
          }
        )
          ? "OK"
          : "REVISAR",

      posibleEjecucionComoUsuario:
        effectiveUser &&
        effectiveUser ===
          normalizarCorreo(
            usuario.correo
          )
    }
  };

  console.log(
    "DIAGNOSTICO_ACCESO_ARCHIVOS_PASO30C\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarModuloVentasContadoPaso30B() {
  instalarMantenimientoIndiceVentasPaso29Y_();

  const indice =
    mantenerIndiceVentasPaso29Y();

  const resultado = {
    correcto: true,
    paso: "30B",
    indice: indice,
    mensaje:
      "Paso 30B aplicado. Las bandejas permitidas se precargan en lote desde el índice 29Y y los modales reutilizan detalles calientes sin bloquear la primera visualización."
  };

  console.log(
    "ACTUALIZACION_VENTAS_PASO30B\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function diagnosticarPrecargaVentasPaso30B() {
  const usuario =
    obtenerUsuarioActual();

  const inicio =
    Date.now();

  let respuesta = null;
  let error = "";

  try {
    respuesta =
      precargarBandejasVentasContadoModulo({
        segmentoRegistro:
          "COMERCIAL",
        tamano: 50,
        incluirDetalles: true
      });
  } catch (ex) {
    error =
      ex.message ||
      String(ex);
  }

  const bandejas = {};

  if (
    respuesta &&
    respuesta.bandejas
  ) {
    Object.keys(
      respuesta.bandejas
    )
      .forEach(function(vista) {
        const item =
          respuesta.bandejas[vista] ||
          {};

        bandejas[vista] = {
          total:
            item.paginacion &&
            item.paginacion.total !==
              undefined
              ? item.paginacion.total
              : (
                  item.resumen &&
                  item.resumen.total !==
                    undefined
                    ? item.resumen.total
                    : (
                        item.registros ||
                        item.items ||
                        []
                      ).length
                ),

          servidorMs:
            item.rendimiento &&
            Number(
              item.rendimiento
                .servidorMs || 0
            ) || 0,

          fuente:
            item.fuenteDatos ||
            (
              item.rendimiento &&
              item.rendimiento.fuente
            ) ||
            ""
        };
      });
  }

  const resultado = {
    correcto:
      !error &&
      Boolean(respuesta),

    paso: "30B",

    usuario: {
      idUsuario:
        usuario.idUsuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol
    },

    totalMs:
      Date.now() - inicio,

    vistas:
      respuesta
        ? respuesta.vistas
        : [],

    bandejas:
      bandejas,

    detallesCalientes:
      respuesta &&
      respuesta.rendimiento
        ? respuesta.rendimiento
            .detallesCalientes
        : 0,

    revisionDatos:
      respuesta
        ? respuesta.revisionDatos
        : "",

    indiceDesactualizado:
      respuesta
        ? respuesta.indiceDesactualizado
        : null,

    error: error,

    objetivo:
      "Una sola RPC debe dejar listas REGISTRADAS, ABONOS y ENTREGAS permitidas, sin lecturas completas de Sheets."
  };

  console.log(
    "DIAGNOSTICO_PRECARGA_VENTAS_PASO30B\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function precalentarDetallesVentasContadoModulo(
  idsVentas,
  vistaSolicitada
) {
  limpiarCacheSeguridadVentasPaso29W_();

  const usuario =
    obtenerUsuarioActual();

  const vista =
    normalizarVistaVentasContadoPaso29M_(
      vistaSolicitada ||
      "REGISTRADAS"
    );

  const recurso =
    obtenerRecursoBandejaVentasContadoPaso29M_(
      vista,
      true
    );

  exigirPermisoVentasContado_(
    recurso,
    usuario
  );

  const ids = [];

  (Array.isArray(idsVentas)
    ? idsVentas
    : []
  )
    .forEach(function(idVenta) {
      const id =
        String(idVenta || "").trim();

      if (
        id &&
        ids.indexOf(id) === -1 &&
        ids.length < 5
      ) {
        ids.push(id);
      }
    });

  const detalles = {};
  const errores = {};

  ids.forEach(function(idVenta) {
    try {
      detalles[idVenta] =
        obtenerDetalleVentaContadoPaso29Y_(
          idVenta,
          vista,
          usuario
        );
    } catch (error) {
      errores[idVenta] =
        error.message || String(error);
    }
  });

  return {
    correcto: true,
    vista: vista,
    detalles: detalles,
    errores: errores,
    total:
      Object.keys(detalles).length
  };
}

/**
 * Lectura ligera para Aprobar/Observar abono.
 * Evita cargar productos enriquecidos, gestiones y evidencias de entrega.
 */
function obtenerVentaValidacionAbonoRapidaPaso29E_(
  idVenta,
  usuario
) {
  const id =
    String(idVenta || "").trim();

  if (!id) {
    throw new Error(
      "Selecciona la venta."
    );
  }

  const resultadoPaquete =
    obtenerPaqueteDetalleVentaPaso29Y_(
      id
    );

  const venta =
    resultadoPaquete.paquete &&
    resultadoPaquete.paquete.venta
      ? Object.assign(
          {},
          resultadoPaquete.paquete.venta
        )
      : null;

  if (!venta) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  exigirVisibilidadTipoRegistroVentaPaso29T_(
    venta,
    usuario
  );

  exigirVentaPruebaActivaPaso29T_(
    venta
  );

  if (
    !filtrarVentasContadoPorAlcance_(
      [venta],
      usuario,
      "CONFIRMAR_ABONO"
    ).length
  ) {
    throw new Error(
      "No tienes acceso para validar el abono de esta venta."
    );
  }

  return venta;
}


function obtenerEstadoAdjuntoVentaPaso29O_(
  idArchivo,
  urlArchivo
) {
  return (
    String(idArchivo || "").trim() ||
    String(urlArchivo || "").trim()
  )
    ? "CARGADO"
    : "NO_CARGADO";
}

function normalizarEstadoAdjuntoVentaPaso29O_(valor) {
  const estado = normalizarTexto(valor || "");

  return estado === "CARGADO"
    ? "CARGADO"
    : "NO_CARGADO";
}

function normalizarAdjuntoAprobacionAbonoPaso29N_(
  archivo,
  nombreCampo
) {
  archivo = archivo || {};

  const etiqueta =
    String(nombreCampo || "archivo").trim();

  const nombreOriginal =
    limpiarTextoMotor_(
      archivo.nombre ||
      archivo.name ||
      etiqueta,
      180
    ) || etiqueta;

  const mimeType = String(
    archivo.mimeType ||
    archivo.type ||
    ""
  ).trim().toLowerCase();

  if (
    VENTAS_CONTADO_SGT360.COMPROBANTES.MIMES_PERMITIDOS
      .indexOf(mimeType) === -1
  ) {
    throw new Error(
      etiqueta +
      " debe ser PDF, PNG, JPG o WEBP."
    );
  }

  let base64 = String(
    archivo.base64 ||
    archivo.dataUrl ||
    ""
  ).trim();

  if (base64.indexOf(",") !== -1) {
    base64 = base64.split(",").pop();
  }

  if (!base64) {
    throw new Error(
      "No se pudo leer " + etiqueta + "."
    );
  }

  const bytes =
    Utilities.base64Decode(base64);

  if (
    bytes.length >
    VENTAS_CONTADO_SGT360.COMPROBANTES.TAMANO_MAXIMO_BYTES
  ) {
    throw new Error(
      etiqueta + " no debe superar 5 MB."
    );
  }

  return {
    nombre: nombreOriginal,
    mimeType: mimeType,
    bytes: bytes
  };
}

function guardarAdjuntoAprobacionAbonoPaso29N_(
  archivo,
  codigoVenta,
  tipoDocumento
) {
  const tipo =
    normalizarTexto(tipoDocumento || "");

  const etiquetas = {
    DEPOSITO_PROVEEDOR:
      "El comprobante de depósito al proveedor",
    BOLETA_VENTA_CLIENTE:
      "La boleta de venta para el cliente"
  };

  if (!etiquetas[tipo]) {
    throw new Error(
      "Tipo de documento de aprobación no válido."
    );
  }

  const normalizado =
    normalizarAdjuntoAprobacionAbonoPaso29N_(
      archivo,
      etiquetas[tipo]
    );

  const extension =
    obtenerExtensionComprobanteVentaContado_(
      normalizado.nombre,
      normalizado.mimeType
    );

  const nombreArchivo = [
    normalizarClaveMotor_(
      codigoVenta || "VENTA"
    ),
    tipo,
    Utilities.getUuid()
      .slice(0, 8)
      .toUpperCase()
  ].join("_") + extension;

  const blob = Utilities.newBlob(
    normalizado.bytes,
    normalizado.mimeType,
    nombreArchivo
  );

  const carpeta =
    obtenerCarpetaComprobantesVentaContado_();

  const creado =
    carpeta.createFile(blob);

  return {
    idArchivo: creado.getId(),
    url: creado.getUrl(),
    nombre: normalizado.nombre,
    mimeType: normalizado.mimeType
  };
}

function eliminarArchivoDriveSilenciosoPaso29N_(idArchivo) {
  const id = String(idArchivo || "").trim();
  if (!id) return;

  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (error) {
    console.warn(
      "No se pudo eliminar el archivo temporal %s: %s",
      id,
      error.message
    );
  }
}

function confirmarAbonoVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();

  exigirPermisoVentasContado_(
    "CONFIRMAR_ABONO",
    usuario
  );

  datos = datos || {};

  const id =
    String(datos.idVenta || "").trim();

  if (!id) {
    throw new Error("Selecciona la venta.");
  }

  if (!datos.comprobanteDepositoProveedor) {
    throw new Error(
      "Adjunta el comprobante de depósito al proveedor."
    );
  }

  if (!datos.boletaVentaCliente) {
    throw new Error(
      "Adjunta la boleta de venta que irá al cliente."
    );
  }

  // Primera validación rápida antes de subir archivos.
  const ventaInicial =
    obtenerVentaValidacionAbonoRapidaPaso29E_(
      id,
      usuario
    );

  if (
    !puedeConfirmarAbonoVentaContado_(
      ventaInicial,
      [],
      usuario
    )
  ) {
    throw new Error(
      "No tienes acceso para aprobar el abono de esta venta."
    );
  }

  if (
    ventaInicial.estado ===
    VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
  ) {
    throw new Error(
      "No se puede validar una venta anulada."
    );
  }

  if (
    ventaInicial.estadoAbono ===
    VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
  ) {
    throw new Error(
      "El abono ya fue aprobado."
    );
  }

  let deposito = null;
  let boleta = null;

  try {
    deposito =
      guardarAdjuntoAprobacionAbonoPaso29N_(
        datos.comprobanteDepositoProveedor,
        ventaInicial.codigoVenta,
        "DEPOSITO_PROVEEDOR"
      );

    boleta =
      guardarAdjuntoAprobacionAbonoPaso29N_(
        datos.boletaVentaCliente,
        ventaInicial.codigoVenta,
        "BOLETA_VENTA_CLIENTE"
      );
  } catch (error) {
    if (deposito && deposito.idArchivo) {
      eliminarArchivoDriveSilenciosoPaso29N_(
        deposito.idArchivo
      );
    }

    if (boleta && boleta.idArchivo) {
      eliminarArchivoDriveSilenciosoPaso29N_(
        boleta.idArchivo
      );
    }

    throw error;
  }

  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(30000);

  let guardado = false;

  try {
    // Se vuelve a validar dentro del bloqueo para evitar doble aprobación.
    const venta =
      obtenerVentaValidacionAbonoRapidaPaso29E_(
        id,
        usuario
      );

    if (
      venta.estadoAbono ===
      VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
    ) {
      throw new Error(
        "El abono ya fue aprobado por otro usuario."
      );
    }

    if (
      venta.estado ===
      VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
    ) {
      throw new Error(
        "La venta fue anulada antes de completar la aprobación."
      );
    }

    const ahora = new Date();

    const observacion =
      limpiarTextoMotor_(
        datos.observacion || "",
        1000
      );

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
      "ID_VENTA",
      {
        ID_VENTA: id,

        ID_ARCHIVO_DEPOSITO_PROVEEDOR:
          deposito.idArchivo,
        URL_DEPOSITO_PROVEEDOR:
          deposito.url,
        NOMBRE_DEPOSITO_PROVEEDOR:
          deposito.nombre,
        MIME_DEPOSITO_PROVEEDOR:
          deposito.mimeType,
        ESTADO_DEPOSITO_PROVEEDOR:
          "CARGADO",

        ID_ARCHIVO_BOLETA_VENTA_CLIENTE:
          boleta.idArchivo,
        URL_BOLETA_VENTA_CLIENTE:
          boleta.url,
        NOMBRE_BOLETA_VENTA_CLIENTE:
          boleta.nombre,
        MIME_BOLETA_VENTA_CLIENTE:
          boleta.mimeType,
        ESTADO_BOLETA_VENTA_CLIENTE:
          "CARGADO",

        ESTADO_ABONO:
          VENTAS_CONTADO_SGT360
            .ESTADOS_ABONO.CONFIRMADO,

        ID_PROVEEDOR_CONFIRMACION_ABONO:
          String(
            usuario.idProveedor || ""
          ).trim(),

        FECHA_CONFIRMACION_ABONO:
          ahora,

        ID_USUARIO_CONFIRMACION_ABONO:
          usuario.idUsuario,

        CORREO_CONFIRMACION_ABONO:
          usuario.correo,

        OBSERVACION_CONFIRMACION_ABONO:
          observacion,

        IMPORTE_ABONO_APROBADO:
          Number(
            venta.totalVentaVigente ||
            venta.totalVenta ||
            0
          ),

        ESTADO:
          VENTAS_CONTADO_SGT360
            .ESTADOS.POR_ENTREGAR,

        FECHA_ACTUALIZACION:
          ahora,

        ID_USUARIO_ACTUALIZACION:
          usuario.idUsuario
      }
    );

    guardado = true;

    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    );

    try {
      registrarCambioMotor_(
        VENTAS_CONTADO_SGT360.CODIGO,
        "APROBAR_ABONO",
        "VENTA",
        id,
        {
          codigoVenta:
            venta.codigoVenta,

          observacion:
            observacion,

          estadoVenta:
            VENTAS_CONTADO_SGT360
              .ESTADOS.POR_ENTREGAR,

          comprobanteDepositoProveedor: {
            idArchivo:
              deposito.idArchivo,
            nombre:
              deposito.nombre
          },

          boletaVentaCliente: {
            idArchivo:
              boleta.idArchivo,
            nombre:
              boleta.nombre
          }
        }
      );
    } catch (auditError) {
      console.warn(
        "El abono fue aprobado, pero no se pudo registrar auditoría: %s",
        auditError.message
      );
    }

    SpreadsheetApp.flush();

    return {
      correcto: true,
      idVenta: id,
      codigoVenta:
        venta.codigoVenta,

      estadoAbono:
        VENTAS_CONTADO_SGT360
          .ESTADOS_ABONO.CONFIRMADO,

      estado:
        VENTAS_CONTADO_SGT360
          .ESTADOS.POR_ENTREGAR,

      urlDepositoProveedor:
        deposito.url,

      nombreDepositoProveedor:
        deposito.nombre,

      urlBoletaVentaCliente:
        boleta.url,

      nombreBoletaVentaCliente:
        boleta.nombre,

      revisionDatos:
        obtenerRevisionDatosMotor_(),

      mensaje:
        "Abono aprobado. Se guardaron el depósito al proveedor y la boleta para el cliente."
    };
  } catch (error) {
    if (!guardado) {
      eliminarArchivoDriveSilenciosoPaso29N_(
        deposito && deposito.idArchivo
      );

      eliminarArchivoDriveSilenciosoPaso29N_(
        boleta && boleta.idArchivo
      );
    }

    throw error;
  } finally {
    bloqueo.releaseLock();
  }
}

function observarAbonoVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("CONFIRMAR_ABONO", usuario);
  datos = datos || {};

  const id = String(datos.idVenta || "").trim();
  const observacion = limpiarTextoMotor_(datos.observacion || "", 1000);

  if (!observacion) {
    throw new Error("Ingresa la observación del abono.");
  }

  const venta = obtenerVentaValidacionAbonoRapidaPaso29E_(id, usuario);

  if (!puedeObservarAbonoVentaContado_(venta, [], usuario)) {
    throw new Error("No tienes acceso para observar el abono de esta venta.");
  }

  const ahora = new Date();

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
    "ID_VENTA",
    {
      ID_VENTA: id,
      ESTADO_ABONO: VENTAS_CONTADO_SGT360.ESTADOS_ABONO.OBSERVADO,
      ID_PROVEEDOR_CONFIRMACION_ABONO: String(usuario.idProveedor || "").trim(),
      FECHA_CONFIRMACION_ABONO: ahora,
      ID_USUARIO_CONFIRMACION_ABONO: usuario.idUsuario,
      CORREO_CONFIRMACION_ABONO: usuario.correo,
      OBSERVACION_CONFIRMACION_ABONO: observacion,
      ESTADO: VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    }
  );

  marcarRevisionDatosMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  );

  registrarCambioMotor_(
    VENTAS_CONTADO_SGT360.CODIGO,
    "OBSERVAR_ABONO",
    "VENTA",
    id,
    {
      codigoVenta: venta.codigoVenta,
      observacion: observacion,
      estadoVenta: VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA
    }
  );

  return {
    correcto: true,
    idVenta: id,
    codigoVenta: venta.codigoVenta,
    estadoAbono: VENTAS_CONTADO_SGT360.ESTADOS_ABONO.OBSERVADO,
    estado: VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA,
    observacion: observacion,
    mensaje: "Abono observado. La venta queda disponible para corrección."
  };
}



function modificarVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();

  // Paso 29V:
  // La modificación depende de EDITAR_VENTA y de su alcance.
  // Tener ID_PROVEEDOR no bloquea la edición por sí mismo.
  //
  // Ejemplos:
  // - Asesor IBR + EDITAR_VENTA=PROPIO -> puede editar sus ventas habilitadas.
  // - Supervisor IBR + EDITAR_VENTA=ASIGNADOS -> puede editar ventas habilitadas
  //   de sus oficinas asignadas.
  // - Usuario con alcance PROVEEDOR -> se evalúa por ese alcance.
  exigirPermisoVentasContado_(
    "EDITAR_VENTA",
    usuario
  );

  datos = datos || {};
  const idVenta = String(datos.idVenta || "").trim();
  if (!idVenta) throw new Error("Selecciona la venta a modificar.");
  const actual = obtenerDetalleVentaContadoModulo(idVenta);
  const ventaActual = actual.venta || {};
  if (!usuarioPuedeModificarVentaContado_(ventaActual, usuario)) throw new Error("No tienes acceso para modificar esta venta.");
  if (ventaActual.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA) throw new Error("No se puede modificar una venta anulada.");
  if (ventaActual.estadoAbono === VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO || ventaActual.estado === VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR || ventaActual.estado === VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA) {
    throw new Error("La venta ya tiene el abono aprobado y su información comercial está bloqueada.");
  }
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const tipoVenta = normalizarTipoVentaContado_(datos.tipoVenta || datos.idNegocio || ventaActual.tipoVenta);
    datos.idNegocio = tipoVenta;
    const alcance = validarAlcanceComercialVentasContado_(datos, usuario, true); alcance.idNegocio = tipoVenta;
    const cliente = normalizarClienteVentaContado_(datos);
    const observacionesVenta = normalizarObservacionesVentaContado_(datos.observaciones);
    const ahora = new Date();
    leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE).filter(function(item) {
      return String(item.ID_VENTA || "").trim() === idVenta && normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
    }).forEach(function(item) {
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE, "ID_DETALLE_VENTA", { ID_DETALLE_VENTA: item.ID_DETALLE_VENTA, ESTADO: CONFIG.ESTADOS.INACTIVO, FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario });
    });
    const detalles = construirDetallesVentaContadoPaso29A_(idVenta, datos.detalles, alcance, usuario, ahora);
    const totales = calcularTotalesVentaContadoPaso29A_(detalles);
    let comprobante = { idArchivo: ventaActual.idArchivoComprobante || "", url: ventaActual.urlComprobante || "", nombre: ventaActual.nombreComprobante || "", mimeType: ventaActual.mimeComprobante || "" };
    if (datos.comprobante && typeof datos.comprobante === "object") comprobante = guardarComprobanteVentaContado_(datos.comprobante, ventaActual.codigoVenta || idVenta);
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, "ID_VENTA", {
      ID_VENTA: idVenta,
      TIPO_VENTA: tipoVenta,
      ES_GASODOMESTICO: esNegocioGasodomesticoVentaContado_(tipoVenta) ? "SI" : "NO",
      ID_OFICINA: alcance.idOficina || "", NOMBRE_OFICINA: alcance.nombreOficina || "", ID_GRUPO: alcance.idGrupo || "", NOMBRE_GRUPO: alcance.nombreGrupo || "", ALCANCE_COMERCIAL: alcance.alcanceComercial,
      ES_CLIENTE_CALIDDA: cliente.esClienteCalidda ? "SI" : "NO",
      USA_CUENTA_CONTRATO: cliente.usaCuentaContrato ? "SI" : "NO",
      RECIBE_DIRECCION_CUENTA: cliente.recibeDireccionCuenta ? "SI" : "NO",
      CUENTA_CONTRATO: cliente.cuentaContrato,
      DNI: cliente.dni,
      DNI_CLIENTE: cliente.dniCliente,
      NOMBRE_CLIENTE: cliente.nombreCliente,
      DIRECCION_ENTREGA: cliente.direccionEntrega,
      REFERENCIA: cliente.referencia,
      TELEFONO: cliente.telefono,
      TELEFONO_CLIENTE: cliente.telefonoCliente,
      TIPO_RECEPTOR: cliente.tipoReceptor,
      NOMBRE_RECEPTOR: cliente.nombreReceptor,
      DNI_RECEPTOR: cliente.dniReceptor,
      TELEFONO_RECEPTOR: cliente.telefonoReceptor,
      RELACION_RECEPTOR: cliente.relacionReceptor,
      OBSERVACIONES: observacionesVenta,
      ID_ARCHIVO_COMPROBANTE: comprobante.idArchivo,
      URL_COMPROBANTE: comprobante.url,
      NOMBRE_COMPROBANTE: comprobante.nombre,
      MIME_COMPROBANTE: comprobante.mimeType,
      ESTADO_COMPROBANTE_PAGO_CLIENTE:
        obtenerEstadoAdjuntoVentaPaso29O_(
          comprobante.idArchivo,
          comprobante.url
        ),
      ESTADO_ABONO: VENTAS_CONTADO_SGT360.ESTADOS_ABONO.PENDIENTE,
      ID_PROVEEDOR_CONFIRMACION_ABONO: "", FECHA_CONFIRMACION_ABONO: "", ID_USUARIO_CONFIRMACION_ABONO: "", CORREO_CONFIRMACION_ABONO: "", OBSERVACION_CONFIRMACION_ABONO: "",
      ESTADO: VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA,
      TOTAL_ITEMS: totales.totalItems,
      TOTAL_VENTA: totales.totalVenta,
      TOTAL_VENTA_ORIGINAL: totales.totalVenta,
      TOTAL_VENTA_VIGENTE: totales.totalVenta,
      TOTAL_ANULADO: 0,
      IMPORTE_ABONO_APROBADO: "",
      MONEDA: VENTAS_CONTADO_SGT360.MONEDA,
      FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    });
    detalles.forEach(function(detalle) { guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE, "ID_DETALLE_VENTA", detalle); });
    SpreadsheetApp.flush();
    registrarCambioMotor_(VENTAS_CONTADO_SGT360.CODIGO, "MODIFICAR_VENTA", "VENTA", idVenta, { codigoVenta: ventaActual.codigoVenta, totalVenta: totales.totalVenta, totalItems: totales.totalItems, abonoReiniciado: ventaActual.estadoAbono === VENTAS_CONTADO_SGT360.ESTADOS_ABONO.OBSERVADO });
    return { correcto: true, idVenta: idVenta, codigoVenta: ventaActual.codigoVenta, totalVenta: totales.totalVenta, totalItems: totales.totalItems, estadoAbono: VENTAS_CONTADO_SGT360.ESTADOS_ABONO.PENDIENTE, mensaje: "Venta modificada. El abono quedó nuevamente Pendiente para validación." };
  } finally {
    bloqueo.releaseLock();
  }
}


function diagnosticarPermisoEdicionVentasPaso29U(idVenta) {
  const usuario = obtenerUsuarioActual();

  const permitido =
    tienePermisoVentasContado_(
      "EDITAR_VENTA",
      usuario
    );

  const alcance =
    permitido
      ? normalizarTexto(
          obtenerAlcancePermisoVentasContado_(
        "EDITAR_VENTA",
        usuario
      )
        )
      : "SIN_PERMISO";

  const id =
    String(idVenta || "").trim();

  const ventas =
    leerCabecerasVentasSnapshotPaso29P_()
      .map(mapearVentaContado_)
      .filter(function(venta) {
        return !id || venta.idVenta === id;
      })
      .slice(0, 50);

  const resultado = {
    correcto: true,
    paso: "29U",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      idProveedor: usuario.idProveedor || "",
      idOficina: usuario.idOficina || "",
      idGrupo: usuario.idGrupo || ""
    },
    permisoEditarVenta: {
      permitido: permitido,
      alcance: alcance
    },
    ventas: ventas.map(function(venta) {
      return {
        idVenta: venta.idVenta,
        codigoVenta: venta.codigoVenta,
        idUsuarioVenta: venta.idUsuario,
        idOficina: venta.idOficina,
        idGrupo: venta.idGrupo,
        estado: venta.estado,
        estadoAbono: venta.estadoAbono,
        dentroAlcanceEditar:
          permitido
            ? filtrarVentasContadoPorAlcance_(
                [venta],
                usuario,
                "EDITAR_VENTA"
              ).length > 0
            : false,
        puedeModificar:
          usuarioPuedeModificarVentaContado_(
            venta,
            usuario
          )
      };
    }),
    reglas:
      "EDITAR_VENTA + alcance; venta REGISTRADA; abono no aprobado; prueba archivada no editable."
  };

  console.log(
    "DIAGNOSTICO_EDICION_VENTAS_PASO29U\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}

function usuarioPuedeModificarVentaContado_(venta, usuario) {
  if (!venta || !usuario) return false;

  if (esVentaPruebaArchivadaPaso29T_(venta)) {
    return false;
  }

  if (
    esVentaPruebaPaso29T_(venta) &&
    !puedeGestionarPruebasVentasPaso29T_(usuario)
  ) {
    return false;
  }

  if (
    venta.estadoAbono ===
    VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
  ) {
    return false;
  }

  if (
    venta.estado !==
    VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA
  ) {
    return false;
  }

  if (
    normalizarTexto(usuario.rol) ===
    CONFIG.ROLES.SUPERADMIN
  ) {
    return true;
  }

  // Paso 29U:
  // ID_PROVEEDOR ya no bloquea la edición.
  // La autorización depende de EDITAR_VENTA y de su alcance.
  if (
    !tienePermisoVentasContado_(
      "EDITAR_VENTA",
      usuario
    )
  ) {
    return false;
  }

  return (
    filtrarVentasContadoPorAlcance_(
      [venta],
      usuario,
      "EDITAR_VENTA"
    ).length > 0
  );
}


function esResponsableVentaContadoPaso29F_(venta, usuario) {
  if (!venta || !usuario) return false;
  if (String(usuario.idProveedor || "").trim()) return false;
  return String(venta.idUsuario || "").trim() ===
    String(usuario.idUsuario || "").trim();
}

function puedeAnularVentaObservadaPaso29F_(venta, usuario) {
  if (!venta || !usuario) return false;
  if (esVentaPruebaArchivadaPaso29T_(venta)) return false;
  if (esVentaPruebaPaso29T_(venta) && !puedeGestionarPruebasVentasPaso29T_(usuario)) return false;
  if (!tienePermisoVentasContado_("ANULAR", usuario)) return false;
  if (!esResponsableVentaContadoPaso29F_(venta, usuario)) return false;
  return normalizarTexto(venta.estado || "") ===
    VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA;
}

function puedeGestionarEntregaVentaContadoPaso29A_(
  venta,
  detalles,
  usuario
) {
  if (!venta || !usuario) return false;
  if (esVentaPruebaArchivadaPaso29T_(venta)) return false;
  if (esVentaPruebaPaso29T_(venta) && !puedeGestionarPruebasVentasPaso29T_(usuario)) return false;

  if (
    !tienePermisoVentasContado_(
      "GESTIONAR_ENTREGA",
      usuario
    )
  ) {
    return false;
  }

  if (
    venta.estadoAbono !==
    VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
  ) {
    return false;
  }

  if (
    venta.estado ===
    VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
  ) {
    return false;
  }

  if (
    !filtrarVentasContadoPorAlcance_(
      [venta],
      usuario,
      "GESTIONAR_ENTREGA"
    ).length
  ) {
    return false;
  }

  const alcance =
    normalizarTexto(
      obtenerAlcancePermisoVentasContado_(
        "GESTIONAR_ENTREGA",
        usuario
      )
    );

  if (alcance !== "PROVEEDOR") {
    return true;
  }

  const proveedorUsuario = String(
    usuario.idProveedor || ""
  ).trim();

  if (!proveedorUsuario) return false;

  return (detalles || []).some(function(item) {
    return (
      esDetalleVentaActivoPaso29K_(item) &&
      String(
        item.idProveedorPrecio ||
        item.ID_PROVEEDOR_PRECIO ||
        ""
      ).trim() === proveedorUsuario
    );
  });
}

function guardarGestionEntregaVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("GESTIONAR_ENTREGA", usuario);
  datos = datos || {};

  const idVenta = String(datos.idVenta || "").trim();
  if (!idVenta) throw new Error("Selecciona la venta.");

  // PASO 29F: no reconstruye el detalle completo del modal para guardar.
  // Lee cabecera y líneas una sola vez, suficientes para seguridad y proveedor.
  const venta = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  )
    .map(mapearVentaContado_)
    .find(function(item) {
      return item.idVenta === idVenta;
    });

  if (!venta) throw new Error("No se encontró la venta.");

  exigirVisibilidadTipoRegistroVentaPaso29T_(venta, usuario);
  exigirVentaPruebaActivaPaso29T_(venta);

  const todosDetalles =
    enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.DETALLE
      )
        .filter(function(row) {
          return (
            String(row.ID_VENTA || "").trim() === idVenta &&
            normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
              CONFIG.ESTADOS.ACTIVO
          );
        })
        .map(mapearDetalleVentaContado_)
    );

  if (!puedeGestionarEntregaVentaContadoPaso29A_(venta, todosDetalles, usuario)) {
    throw new Error("No tienes acceso para gestionar la entrega de esta venta.");
  }

  if (
    venta.estadoAbono !==
    VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO
  ) {
    throw new Error(
      "La entrega solo puede gestionarse después de aprobar el abono."
    );
  }

  if (venta.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA) {
    throw new Error("No se puede gestionar una venta anulada.");
  }

  const participantes = {};
  todosDetalles
    .filter(esDetalleVentaActivoPaso29K_)
    .forEach(function(item) {
      const proveedor = String(item.idProveedorPrecio || "").trim();
      if (proveedor) participantes[proveedor] = true;
    });

  const proveedorUsuario = String(usuario.idProveedor || "").trim();
  const idProveedor = proveedorUsuario || String(datos.idProveedor || "").trim();

  if (!idProveedor || !participantes[idProveedor]) {
    throw new Error(
      "El proveedor seleccionado no participa en los precios de esta venta."
    );
  }

  const estadoEntrega = normalizarTexto(
    datos.estadoEntrega || VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE
  );

  const estadosPermitidos = [
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE,
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA,
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA,
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
  ];

  if (estadosPermitidos.indexOf(estadoEntrega) === -1) {
    throw new Error(
      "Selecciona Pendiente, Programada, Observada o Entregada."
    );
  }

  const detalleObservacion = limpiarTextoMotor_(
    datos.detalleObservacion || datos.observacion || "",
    1500
  );

  const fechaProgramadaEntrada =
    datos.fechaProgramadaEntrega ||
    datos.fechaProgramada ||
    "";

  const fechaProgramada = fechaProgramadaEntrada
    ? new Date(fechaProgramadaEntrada + (String(fechaProgramadaEntrada).length <= 10 ? "T12:00:00" : ""))
    : "";

  if (
    estadoEntrega ===
    VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
  ) {
    if (
      !(fechaProgramada instanceof Date) ||
      isNaN(fechaProgramada.getTime())
    ) {
      throw new Error(
        "Selecciona la fecha acordada de programación de la entrega."
      );
    }
  }

  if (
    estadoEntrega ===
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA &&
    !detalleObservacion
  ) {
    throw new Error("Ingresa la observación de la entrega.");
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();

    const ahora = new Date();
    const existente = leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
    ).find(function(row) {
      return (
        String(row.ID_VENTA || "").trim() === idVenta &&
        String(row.ID_PROVEEDOR || "").trim() === idProveedor
      );
    }) || null;

    const idGestion = existente
      ? String(existente.ID_GESTION_ENTREGA || "").trim()
      : generarIdMotor_("ENT");

    const evidenciasEntrada = Array.isArray(datos.evidencias)
      ? datos.evidencias
      : [];

    if (
      evidenciasEntrada.length >
      VENTAS_CONTADO_SGT360.ENTREGA.MAX_EVIDENCIAS
    ) {
      throw new Error(
        "Solo se permiten hasta " +
        VENTAS_CONTADO_SGT360.ENTREGA.MAX_EVIDENCIAS +
        " evidencias por gestión."
      );
    }

    evidenciasEntrada.forEach(function(evidencia) {
      guardarEvidenciaEntregaVentaContadoPaso29A_(
        evidencia,
        idGestion,
        idVenta,
        idProveedor,
        venta.codigoVenta,
        usuario,
        ahora
      );
    });

    const evidenciasActivas = leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.EVIDENCIAS_ENTREGA
    ).filter(function(row) {
      return (
        String(row.ID_GESTION_ENTREGA || "").trim() === idGestion &&
        normalizarTexto(row.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
          CONFIG.ESTADOS.ACTIVO
      );
    });

    if (
      estadoEntrega ===
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA
    ) {
      const sustentoObservacion = evidenciasActivas.some(function(row) {
        return normalizarTexto(row.TIPO_EVIDENCIA || "") ===
          "SUSTENTO_OBSERVACION";
      });

      if (!sustentoObservacion) {
        throw new Error(
          "Adjunta el sustento de la observación antes de guardar."
        );
      }
    }

    if (
      estadoEntrega ===
      VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
    ) {
      const sustentoEntrega = evidenciasActivas.some(function(row) {
        return normalizarTexto(row.TIPO_EVIDENCIA || "") !==
          "SUSTENTO_OBSERVACION";
      });

      if (!sustentoEntrega) {
        throw new Error(
          "Adjunta al menos una evidencia de entrega para confirmar Entregada."
        );
      }
    }

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA,
      "ID_GESTION_ENTREGA",
      {
        ID_GESTION_ENTREGA: idGestion,
        ID_VENTA: idVenta,
        ID_PROVEEDOR: idProveedor,
        ESTADO_ENTREGA: estadoEntrega,
        MOTIVO_OBSERVACION: "",
        DETALLE_OBSERVACION:
          estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA ||
          estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
            ? detalleObservacion
            : "",
        FECHA_PROGRAMADA_ENTREGA:
          estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
            ? fechaProgramada
            : "",
        FECHA_ULTIMA_GESTION: ahora,
        FECHA_ENTREGA:
          estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
            ? ahora
            : "",
        ID_USUARIO_GESTION: usuario.idUsuario,
        CORREO_USUARIO_GESTION: usuario.correo,
        FECHA_CREACION:
          existente && existente.FECHA_CREACION
            ? existente.FECHA_CREACION
            : ahora,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario
      }
    );

    const estadoVenta = recalcularEstadoEntregaVentaContadoPaso29A_(
      idVenta,
      Object.keys(participantes),
      usuario,
      ahora
    );

    const accion =
      estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
        ? "CONFIRMAR_ENTREGA"
        : estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
          ? "PROGRAMAR_ENTREGA"
          : estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA
            ? "OBSERVAR_ENTREGA"
            : "MANTENER_ENTREGA_PENDIENTE";

    registrarCambioMotor_(
      VENTAS_CONTADO_SGT360.CODIGO,
      accion,
      "VENTA",
      idVenta,
      {
        idProveedor: idProveedor,
        estadoEntrega: estadoEntrega,
        observacion: detalleObservacion,
        fechaProgramadaEntrega:
          estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
            ? fechaProgramada
            : "",
        estadoVenta: estadoVenta
      }
    );

    const mensajes = {};
    mensajes[VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE] =
      "La entrega permanece Pendiente.";
    mensajes[VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA] =
      "Entrega programada correctamente.";
    mensajes[VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA] =
      "Entrega marcada como Observada.";
    mensajes[VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA] =
      "Entrega confirmada correctamente.";

    return {
      correcto: true,
      idVenta: idVenta,
      codigoVenta: venta.codigoVenta,
      idProveedor: idProveedor,
      idGestionEntrega: idGestion,
      estadoEntrega: estadoEntrega,
      estadoVenta: estadoVenta,
      fechaProgramadaEntrega:
        estadoEntrega === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA
          ? fechaProgramada
          : "",
      mensaje: mensajes[estadoEntrega] || "Gestión guardada."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function guardarEvidenciaEntregaVentaContadoPaso29A_(evidencia, idGestion, idVenta, idProveedor, codigoVenta, usuario, ahora) {
  evidencia = evidencia || {};
  const tipo = normalizarTexto(evidencia.tipoEvidencia || evidencia.tipo || "OTRO");
  if (!VENTAS_CONTADO_SGT360.ENTREGA.TIPOS_EVIDENCIA.some(function(item){ return item.codigo===tipo; })) throw new Error("Tipo de evidencia no válido.");
  const nombreOriginal = limpiarTextoMotor_(evidencia.nombre || evidencia.name || "evidencia", 180) || "evidencia";
  const mimeType = String(evidencia.mimeType || evidencia.type || "").trim().toLowerCase();
  if (VENTAS_CONTADO_SGT360.ENTREGA.MIMES_PERMITIDOS.indexOf(mimeType) === -1) throw new Error("Las evidencias deben ser PDF, PNG, JPG o WEBP.");
  let base64 = String(evidencia.base64 || evidencia.dataUrl || "").trim();
  if (base64.indexOf(",") !== -1) base64 = base64.split(",").pop();
  if (!base64) throw new Error("No se pudo leer una de las evidencias.");
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > VENTAS_CONTADO_SGT360.ENTREGA.TAMANO_MAXIMO_BYTES) throw new Error("Cada evidencia no debe superar 5 MB.");
  const extension = obtenerExtensionComprobanteVentaContado_(nombreOriginal, mimeType);
  const nombreArchivo = [normalizarClaveMotor_(codigoVenta || idVenta), normalizarClaveMotor_(tipo), Utilities.getUuid().slice(0,8).toUpperCase()].join("_") + extension;
  const archivo = obtenerCarpetaComprobantesVentaContado_().createFile(Utilities.newBlob(bytes, mimeType, nombreArchivo));
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.EVIDENCIAS_ENTREGA, "ID_EVIDENCIA", {
    ID_EVIDENCIA: generarIdMotor_("EVD"), ID_GESTION_ENTREGA: idGestion, ID_VENTA: idVenta, ID_PROVEEDOR: idProveedor,
    TIPO_EVIDENCIA: tipo, ID_ARCHIVO: archivo.getId(), URL_ARCHIVO: archivo.getUrl(), NOMBRE_ARCHIVO: nombreOriginal, MIME_ARCHIVO: mimeType,
    FECHA_CREACION: ahora, ID_USUARIO_CREACION: usuario.idUsuario, ESTADO: CONFIG.ESTADOS.ACTIVO
  });
}

function recalcularEstadoEntregaVentaContadoPaso29A_(idVenta, idsProveedores, usuario, ahora) {
  const mapa = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA).forEach(function(row){
    if (String(row.ID_VENTA||"").trim()!==idVenta) return;
    mapa[String(row.ID_PROVEEDOR||"").trim()] = normalizarTexto(row.ESTADO_ENTREGA || VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE);
  });
  const estados = (idsProveedores || []).map(function(id){
    return mapa[id] || VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE;
  });

  let estadoVenta = (idsProveedores || []).length
    ? VENTAS_CONTADO_SGT360.ESTADOS.POR_ENTREGAR
    : VENTAS_CONTADO_SGT360.ESTADOS.ANULADA;

  if (
    estados.some(function(e) {
      return e === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.OBSERVADA;
    })
  ) {
    estadoVenta = VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA;
  } else if (
    estados.length &&
    estados.every(function(e) {
      return e === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA;
    })
  ) {
    estadoVenta = VENTAS_CONTADO_SGT360.ESTADOS.ENTREGADA;
  } else if (
    estados.some(function(e) {
      return e === VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PROGRAMADA;
    })
  ) {
    estadoVenta = VENTAS_CONTADO_SGT360.ESTADOS.PROGRAMADA;
  }

  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, "ID_VENTA", {
    ID_VENTA: idVenta,
    ESTADO: estadoVenta,
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario
  });
  marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
  return estadoVenta;
}

function mapearGestionEntregaVentaContadoPaso29A_(row) {
  return {
    idGestionEntrega: String(row.ID_GESTION_ENTREGA || "").trim(),
    idVenta: String(row.ID_VENTA || "").trim(),
    idProveedor: String(row.ID_PROVEEDOR || "").trim(),
    estadoEntrega: normalizarTexto(row.ESTADO_ENTREGA || VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE),
    motivoObservacion: normalizarTexto(row.MOTIVO_OBSERVACION || ""),
    detalleObservacion: String(row.DETALLE_OBSERVACION || "").trim(),
    fechaProgramadaEntrega: normalizarFechaHoraVentasContado_(row.FECHA_PROGRAMADA_ENTREGA),
    fechaUltimaGestion: normalizarFechaHoraVentasContado_(row.FECHA_ULTIMA_GESTION),
    fechaEntrega: normalizarFechaHoraVentasContado_(row.FECHA_ENTREGA),
    correoUsuarioGestion: String(row.CORREO_USUARIO_GESTION || "").trim()
  };
}

function mapearEvidenciaEntregaVentaContadoPaso29A_(row) {
  return {
    idEvidencia: String(row.ID_EVIDENCIA || "").trim(), idGestionEntrega: String(row.ID_GESTION_ENTREGA || "").trim(), idVenta: String(row.ID_VENTA || "").trim(), idProveedor: String(row.ID_PROVEEDOR || "").trim(),
    tipoEvidencia: normalizarTexto(row.TIPO_EVIDENCIA || "OTRO"), idArchivo: String(row.ID_ARCHIVO || "").trim(), url: String(row.URL_ARCHIVO || "").trim(), nombreArchivo: String(row.NOMBRE_ARCHIVO || "").trim(), mimeArchivo: String(row.MIME_ARCHIVO || "").trim(), fechaCreacion: normalizarFechaHoraVentasContado_(row.FECHA_CREACION)
  };
}


function anularMaterialVentaContadoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("ANULAR", usuario);

  datos = datos || {};

  const idVenta = String(datos.idVenta || "").trim();
  const idDetalleVenta = String(datos.idDetalleVenta || "").trim();
  const motivo = normalizarTexto(datos.motivo || "");
  const observacion = limpiarTextoMotor_(
    datos.observacion || "",
    1000
  );

  const motivosPermitidos = {
    CLIENTE_DESISTIO_PRODUCTO: "Cliente ya no desea el producto",
    CAMBIO_PRODUCTO: "Cambio de producto",
    PRODUCTO_NO_REQUERIDO: "Producto ya no requerido",
    ERROR_REGISTRO: "Error de registro",
    OTRO: "Otro"
  };

  if (!idVenta) throw new Error("Selecciona la venta.");
  if (!idDetalleVenta) throw new Error("Selecciona el material.");
  if (!motivosPermitidos[motivo]) {
    throw new Error("Selecciona el motivo de anulación del material.");
  }

  if (!observacion) {
    throw new Error(
      "Ingresa una observación para sustentar la anulación del material."
    );
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraVentasContado_();

    const venta = leerTablaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    )
      .map(mapearVentaContado_)
      .find(function(item) {
        return item.idVenta === idVenta;
      });

    if (!venta) throw new Error("No se encontró la venta.");

    exigirVisibilidadTipoRegistroVentaPaso29T_(venta, usuario);
    exigirVentaPruebaActivaPaso29T_(venta);

    if (!esResponsableVentaContadoPaso29F_(venta, usuario)) {
      throw new Error(
        "Solo el responsable que registró la venta puede anular un material."
      );
    }

    if (
      venta.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA
    ) {
      throw new Error("La venta ya está anulada.");
    }

    const detalles = enriquecerProveedorDetallesVentaDesdePreciosPaso29E_(
      leerTablaMotor_(
        MOTOR_SGT360.BASES.OPERATION,
        VENTAS_CONTADO_SGT360.HOJAS.DETALLE
      )
        .filter(function(row) {
          return (
            String(row.ID_VENTA || "").trim() === idVenta &&
            normalizarTexto(
              row.ESTADO || CONFIG.ESTADOS.ACTIVO
            ) === CONFIG.ESTADOS.ACTIVO
          );
        })
        .map(mapearDetalleVentaContado_)
    );

    const detalle = detalles.find(function(item) {
      return item.idDetalleVenta === idDetalleVenta;
    });

    if (!detalle) {
      throw new Error("No se encontró el material dentro de la venta.");
    }

    if (esDetalleVentaAnuladoPaso29K_(detalle)) {
      throw new Error("El material ya está anulado.");
    }

    const idProveedor = String(
      detalle.idProveedorPrecio || ""
    ).trim();

    const gestionProveedor = idProveedor
      ? leerTablaMotor_(
          MOTOR_SGT360.BASES.OPERATION,
          VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
        ).find(function(row) {
          return (
            String(row.ID_VENTA || "").trim() === idVenta &&
            String(row.ID_PROVEEDOR || "").trim() === idProveedor
          );
        }) || null
      : null;

    const estadoEntregaProveedor = gestionProveedor
      ? normalizarTexto(
          gestionProveedor.ESTADO_ENTREGA ||
          VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE
        )
      : VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.PENDIENTE;

    if (
      !puedeAnularMaterialVentaContadoPaso29K_(
        venta,
        detalle,
        usuario,
        estadoEntregaProveedor
      )
    ) {
      if (
        estadoEntregaProveedor ===
        VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
      ) {
        throw new Error(
          "El material pertenece a una entrega ya confirmada. Debe gestionarse una devolución o reversa; no corresponde una anulación simple."
        );
      }

      throw new Error(
        "No tienes permiso para anular este material."
      );
    }

    const ahora = new Date();

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE,
      "ID_DETALLE_VENTA",
      {
        ID_DETALLE_VENTA: idDetalleVenta,
        ESTADO_ITEM: "ANULADO",
        MOTIVO_ANULACION_ITEM: motivo,
        OBSERVACION_ANULACION_ITEM: observacion,
        FECHA_ANULACION_ITEM: ahora,
        ID_USUARIO_ANULACION_ITEM: usuario.idUsuario,
        CORREO_USUARIO_ANULACION_ITEM: usuario.correo,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario
      }
    );

    detalle.estadoItem = "ANULADO";
    detalle.motivoAnulacionItem = motivo;
    detalle.observacionAnulacionItem = observacion;

    const totales =
      calcularTotalesVigentesVentaPaso29K_(detalles);

    let totalOriginal = Number(
      venta.totalVentaOriginal || 0
    );

    if (!totalOriginal) {
      totalOriginal = Math.round(
        detalles.reduce(function(total, item) {
          return total + Number(item.totalLinea || 0);
        }, 0) * 100
      ) / 100;
    }

    const gestionesPorProveedor =
      obtenerGestionesVentaPorProveedorPaso29K_(idVenta);

    const estadoVenta =
      calcularEstadoVentaDesdeDetallesPaso29K_(
        venta,
        detalles,
        gestionesPorProveedor
      );

    let importeAbonoAprobado = Number(
      venta.importeAbonoAprobado || 0
    );

    if (
      venta.estadoAbono ===
        VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO &&
      !importeAbonoAprobado
    ) {
      importeAbonoAprobado = Number(
        venta.totalVentaVigente ||
        venta.totalVenta ||
        totalOriginal ||
        0
      );
    }

    const diferenciaRegularizacion = Math.max(
      0,
      Math.round(
        (
          importeAbonoAprobado -
          totales.totalVentaVigente
        ) * 100
      ) / 100
    );

    guardarObjetoMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
      "ID_VENTA",
      {
        ID_VENTA: idVenta,
        ESTADO: estadoVenta,
        TOTAL_ITEMS: totales.totalItems,
        TOTAL_VENTA: totales.totalVentaVigente,
        TOTAL_VENTA_ORIGINAL: totalOriginal,
        TOTAL_VENTA_VIGENTE: totales.totalVentaVigente,
        TOTAL_ANULADO: totales.totalAnulado,
        IMPORTE_ABONO_APROBADO:
          importeAbonoAprobado || "",
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario
      }
    );

    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.DETALLE
    );

    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      VENTAS_CONTADO_SGT360.HOJAS.CABECERA
    );

    registrarCambioMotor_(
      VENTAS_CONTADO_SGT360.CODIGO,
      "ANULAR_MATERIAL_VENTA",
      "DETALLE_VENTA",
      idDetalleVenta,
      {
        idVenta: idVenta,
        codigoVenta: venta.codigoVenta,
        codigoMaterial: detalle.codigoMaterial,
        descripcionMaterial: detalle.descripcionMaterial,
        idProveedorPrecio: detalle.idProveedorPrecio,
        motivo: motivo,
        motivoVisible: motivosPermitidos[motivo],
        observacion: observacion,
        estadoVenta: estadoVenta,
        totalOriginal: totalOriginal,
        totalVigente: totales.totalVentaVigente,
        totalAnulado: totales.totalAnulado,
        estadoAbono: venta.estadoAbono,
        importeAbonoAprobado: importeAbonoAprobado,
        diferenciaRegularizacion: diferenciaRegularizacion
      }
    );

    SpreadsheetApp.flush();

    return {
      correcto: true,
      idVenta: idVenta,
      idDetalleVenta: idDetalleVenta,
      codigoVenta: venta.codigoVenta,
      estadoItem: "ANULADO",
      estadoVenta: estadoVenta,
      totalItems: totales.totalItems,
      totalVenta: totales.totalVentaVigente,
      totalVentaOriginal: totalOriginal,
      totalVentaVigente: totales.totalVentaVigente,
      totalAnulado: totales.totalAnulado,
      importeAbonoAprobado: importeAbonoAprobado,
      requiereRegularizacionFinanciera:
        diferenciaRegularizacion > 0,
      diferenciaRegularizacion:
        diferenciaRegularizacion,
      revisionDatos: obtenerRevisionDatosMotor_(),
      mensaje:
        diferenciaRegularizacion > 0
          ? "Material anulado. La venta fue recalculada y existe una diferencia pendiente de regularización financiera."
          : "Material anulado correctamente. La venta fue recalculada."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function anularVentaContadoModulo(idVenta, motivo) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("ANULAR", usuario);

  const id = String(idVenta || "").trim();
  const motivoLimpio = limpiarTextoMotor_(motivo || "", 1000);

  if (!id) throw new Error("Selecciona la venta.");
  if (!motivoLimpio) throw new Error("Ingresa el motivo de anulación.");

  const venta = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  )
    .map(mapearVentaContado_)
    .find(function(item) {
      return item.idVenta === id;
    });

  if (!venta) throw new Error("No se encontró la venta.");

  exigirVisibilidadTipoRegistroVentaPaso29T_(venta, usuario);
  exigirVentaPruebaActivaPaso29T_(venta);

  if (venta.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA) {
    throw new Error("La venta ya está anulada.");
  }

  if (!esResponsableVentaContadoPaso29F_(venta, usuario)) {
    throw new Error(
      "Solo el usuario responsable que registró la venta puede anularla."
    );
  }

  if (
    venta.estado !== VENTAS_CONTADO_SGT360.ESTADOS.OBSERVADA
  ) {
    throw new Error(
      "La anulación por este flujo solo está disponible para ventas Observadas."
    );
  }

  const existeEntregaConfirmada = leerTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA
  ).some(function(row) {
    return (
      String(row.ID_VENTA || "").trim() === id &&
      normalizarTexto(row.ESTADO_ENTREGA || "") ===
        VENTAS_CONTADO_SGT360.ENTREGA.ESTADOS.ENTREGADA
    );
  });

  if (existeEntregaConfirmada) {
    throw new Error(
      "La venta ya tiene al menos una entrega confirmada. Debe gestionarse una devolución o reversa; no corresponde una anulación simple."
    );
  }

  const ahora = new Date();

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
    "ID_VENTA",
    {
      ID_VENTA: id,
      ESTADO: VENTAS_CONTADO_SGT360.ESTADOS.ANULADA,
      OBSERVACIONES: [
        venta.observaciones || "",
        "ANULACIÓN RESPONSABLE: " + motivoLimpio
      ].filter(Boolean).join(" | "),
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario
    }
  );

  marcarRevisionDatosMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA
  );

  registrarCambioMotor_(
    VENTAS_CONTADO_SGT360.CODIGO,
    "ANULAR_VENTA_OBSERVADA",
    "VENTA",
    id,
    {
      codigoVenta: venta.codigoVenta,
      motivo: motivoLimpio,
      responsable: usuario.idUsuario,
      estadoAbono: venta.estadoAbono
    }
  );

  return {
    correcto: true,
    idVenta: id,
    codigoVenta: venta.codigoVenta,
    estado: VENTAS_CONTADO_SGT360.ESTADOS.ANULADA,
    estadoAbono: venta.estadoAbono,
    mensaje:
      "Venta anulada. El estado del abono se conserva para trazabilidad y cualquier devolución debe gestionarse por el flujo financiero correspondiente."
  };
}


function archivarVentaPruebaModulo(datos) {
  const usuario = obtenerUsuarioActual();
  if (!puedeGestionarPruebasVentasPaso29T_(usuario)) throw new Error("No tienes permiso para gestionar ventas de prueba.");
  datos = datos || {};
  const idVenta = String(datos.idVenta || "").trim();
  const observacion = limpiarTextoMotor_(datos.observacion || "",1000);
  if (!idVenta) throw new Error("Selecciona la venta de prueba.");
  const venta = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA).map(mapearVentaContado_).find(function(x){return x.idVenta===idVenta;});
  if (!venta) throw new Error("No se encontró la venta.");
  exigirVisibilidadTipoRegistroVentaPaso29T_(venta, usuario);
  if (!usuarioPuedeAccederVentaPaso29T_(venta, usuario)) throw new Error("No tienes acceso para archivar esta venta.");
  if (!esVentaPruebaPaso29T_(venta)) throw new Error("Solo las ventas de prueba pueden archivarse.");
  if (esVentaPruebaArchivadaPaso29T_(venta)) throw new Error("La venta de prueba ya está archivada.");
  const ahora=new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION,VENTAS_CONTADO_SGT360.HOJAS.CABECERA,"ID_VENTA",{
    ID_VENTA:idVenta,ESTADO_PRUEBA:VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ARCHIVADA,
    FECHA_ARCHIVO_PRUEBA:ahora,ID_USUARIO_ARCHIVO_PRUEBA:usuario.idUsuario,CORREO_USUARIO_ARCHIVO_PRUEBA:usuario.correo,
    OBSERVACION_ARCHIVO_PRUEBA:observacion,FECHA_ACTUALIZACION:ahora,ID_USUARIO_ACTUALIZACION:usuario.idUsuario
  });
  marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION,VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
  registrarCambioMotor_(VENTAS_CONTADO_SGT360.CODIGO,"ARCHIVAR_VENTA_PRUEBA","VENTA",idVenta,{codigoVenta:venta.codigoVenta,observacion:observacion});
  invalidarCacheVentasContadoPaso29Y_();
  return {correcto:true,idVenta:idVenta,codigoVenta:venta.codigoVenta,tipoRegistro:"PRUEBA",estadoPrueba:"ARCHIVADA",revisionDatos:obtenerRevisionDatosMotor_(),mensaje:"Venta de prueba archivada. Se conserva como historial y deja de participar en las bandejas activas."};
}

function reclasificarVentaContadoModulo(datos) {
  const usuario=obtenerUsuarioActual();
  if (!puedeReclasificarVentaPaso29T_(usuario)) throw new Error("Solo SUPERADMIN o ADMIN pueden cambiar la clasificación de una venta.");
  datos=datos||{};
  const idVenta=String(datos.idVenta||"").trim();
  const nuevoTipo=normalizarTipoRegistroVentaPaso29T_(datos.tipoRegistro);
  const motivo=limpiarTextoMotor_(datos.motivo||"",1000);
  if(!idVenta) throw new Error("Selecciona la venta.");
  if(!motivo) throw new Error("Ingresa el motivo de la reclasificación.");
  const venta=leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION,VENTAS_CONTADO_SGT360.HOJAS.CABECERA).map(mapearVentaContado_).find(function(x){return x.idVenta===idVenta;});
  if(!venta) throw new Error("No se encontró la venta.");
  if(!usuarioPuedeAccederVentaPaso29T_(venta,usuario)) throw new Error("No tienes acceso para reclasificar esta venta.");
  const anterior=normalizarTipoRegistroVentaPaso29T_(venta.tipoRegistro);
  if(anterior===nuevoTipo) throw new Error("La venta ya tiene esa clasificación.");
  const ahora=new Date();
  const obj={ID_VENTA:idVenta,TIPO_REGISTRO:nuevoTipo,TIPO_REGISTRO_ANTERIOR:anterior,MOTIVO_RECLASIFICACION:motivo,
    FECHA_RECLASIFICACION:ahora,ID_USUARIO_RECLASIFICACION:usuario.idUsuario,CORREO_USUARIO_RECLASIFICACION:usuario.correo,
    FECHA_ACTUALIZACION:ahora,ID_USUARIO_ACTUALIZACION:usuario.idUsuario,
    ESTADO_PRUEBA:nuevoTipo==="PRUEBA"?VENTAS_CONTADO_SGT360.ESTADOS_PRUEBA.ACTIVA:"",
    FECHA_ARCHIVO_PRUEBA:"",ID_USUARIO_ARCHIVO_PRUEBA:"",CORREO_USUARIO_ARCHIVO_PRUEBA:"",OBSERVACION_ARCHIVO_PRUEBA:""};
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION,VENTAS_CONTADO_SGT360.HOJAS.CABECERA,"ID_VENTA",obj);
  marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION,VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
  registrarCambioMotor_(VENTAS_CONTADO_SGT360.CODIGO,"RECLASIFICAR_VENTA","VENTA",idVenta,{codigoVenta:venta.codigoVenta,tipoAnterior:anterior,tipoNuevo:nuevoTipo,motivo:motivo,estadoVenta:venta.estado,estadoAbono:venta.estadoAbono});
  invalidarCacheVentasContadoPaso29Y_();
  return {correcto:true,idVenta:idVenta,codigoVenta:venta.codigoVenta,tipoAnterior:anterior,tipoRegistro:nuevoTipo,revisionDatos:obtenerRevisionDatosMotor_(),mensaje:nuevoTipo==="PRUEBA"?"La venta fue reclasificada como Venta de prueba.":"La venta fue reclasificada como Venta comercial."};
}


/* =========================================================
 * Paso 29U — Acceso seguro a archivos
 * ========================================================= */

function extraerIdArchivoDriveVentaPaso29U_(
  idArchivo,
  url
) {
  const id =
    String(idArchivo || "").trim();

  if (id) return id;

  const texto =
    String(url || "").trim();

  if (!texto) return "";

  let match =
    texto.match(/\/d\/([A-Za-z0-9_-]{10,})/);

  if (match && match[1]) {
    return match[1];
  }

  match =
    texto.match(/[?&]id=([A-Za-z0-9_-]{10,})/);

  return match && match[1]
    ? match[1]
    : "";
}

function usuarioPuedeLeerArchivoVentaPaso29U_(
  venta,
  usuario
) {
  if (!venta || !usuario) {
    return false;
  }

  if (
    normalizarTexto(usuario.rol) ===
    CONFIG.ROLES.SUPERADMIN
  ) {
    return true;
  }

  return [
    "VER_DETALLE",
    "CONFIRMAR_ABONO",
    "GESTIONAR_ENTREGA"
  ].some(function(recurso) {
    if (
      !tienePermisoVentasContado_(
        recurso,
        usuario
      )
    ) {
      return false;
    }

    return (
      filtrarVentasContadoPorAlcance_(
        [venta],
        usuario,
        recurso
      ).length > 0
    );
  });
}

function obtenerReferenciaArchivoVentaPaso29U_(
  venta,
  idArchivoSolicitado
) {
  const solicitado =
    String(idArchivoSolicitado || "").trim();

  if (!venta || !solicitado) {
    return null;
  }

  const cabecera = [
    {
      tipo: "COMPROBANTE_PAGO_CLIENTE",
      idArchivo:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoComprobante,
          venta.urlComprobante
        ),
      nombre:
        venta.nombreArchivoComprobante ||
        "Comprobante de pago",
      mime:
        venta.mimeArchivoComprobante || ""
    },
    {
      tipo: "DEPOSITO_PROVEEDOR",
      idArchivo:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoDepositoProveedor,
          venta.urlDepositoProveedor
        ),
      nombre:
        venta.nombreDepositoProveedor ||
        "Depósito al proveedor",
      mime:
        venta.mimeDepositoProveedor || ""
    },
    {
      tipo: "BOLETA_VENTA_CLIENTE",
      idArchivo:
        extraerIdArchivoDriveVentaPaso29U_(
          venta.idArchivoBoletaVentaCliente,
          venta.urlBoletaVentaCliente
        ),
      nombre:
        venta.nombreBoletaVentaCliente ||
        "Boleta de venta",
      mime:
        venta.mimeBoletaVentaCliente || ""
    }
  ].find(function(item) {
    return item.idArchivo === solicitado;
  });

  if (cabecera) {
    return cabecera;
  }

  const evidencia =
    leerEvidenciasVentasSnapshotPaso29P_()
      .find(function(row) {
        return (
          String(row.ID_VENTA || "").trim() ===
            venta.idVenta &&
          normalizarTexto(
            row.ESTADO ||
            CONFIG.ESTADOS.ACTIVO
          ) === CONFIG.ESTADOS.ACTIVO &&
          extraerIdArchivoDriveVentaPaso29U_(
            row.ID_ARCHIVO,
            row.URL_ARCHIVO
          ) === solicitado
        );
      });

  if (!evidencia) {
    return null;
  }

  return {
    tipo:
      normalizarTexto(
        evidencia.TIPO_EVIDENCIA ||
        "EVIDENCIA_ENTREGA"
      ),
    idArchivo: solicitado,
    nombre:
      String(
        evidencia.NOMBRE_ARCHIVO ||
        "Evidencia de entrega"
      ).trim(),
    mime:
      String(
        evidencia.MIME_ARCHIVO || ""
      ).trim()
  };
}

function obtenerArchivoVentaContadoModulo(datos) {
  const usuario =
    obtenerUsuarioActual();

  datos = datos || {};

  const idVenta =
    String(datos.idVenta || "").trim();

  const idArchivo =
    String(datos.idArchivo || "").trim();

  if (!idVenta || !idArchivo) {
    throw new Error(
      "No se pudo identificar el archivo solicitado."
    );
  }

  const resultadoPaquete =
    obtenerPaqueteDetalleVentaPaso29Y_(
      idVenta
    );

  const paquete =
    resultadoPaquete &&
    resultadoPaquete.paquete
      ? resultadoPaquete.paquete
      : null;

  const venta =
    paquete &&
    paquete.venta
      ? Object.assign(
          {},
          paquete.venta
        )
      : null;

  if (!venta) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  exigirVisibilidadTipoRegistroVentaPaso29T_(
    venta,
    usuario
  );

  if (
    !usuarioPuedeLeerArchivoVentaPaso29U_(
      venta,
      usuario
    )
  ) {
    throw new Error(
      "No tienes permiso para consultar los archivos de esta venta."
    );
  }

  let referencia =
    obtenerReferenciaArchivoVentaPaso29U_(
      venta,
      idArchivo
    );

  if (
    !referencia &&
    paquete &&
    Array.isArray(
      paquete.evidencias
    )
  ) {
    const evidenciaPaquete =
      paquete.evidencias
        .find(function(evidencia) {
          return (
            extraerIdArchivoDriveVentaPaso29U_(
              evidencia.idArchivo,
              evidencia.url
            ) === idArchivo
          );
        });

    if (evidenciaPaquete) {
      referencia = {
        tipo:
          evidenciaPaquete.tipoEvidencia ||
          "EVIDENCIA_ENTREGA",
        idArchivo:
          idArchivo,
        nombre:
          evidenciaPaquete.nombreArchivo ||
          "Evidencia de entrega",
        mime:
          evidenciaPaquete.mimeArchivo ||
          ""
      };
    }
  }

  if (!referencia) {
    throw new Error(
      "El archivo no pertenece a esta venta o ya no está disponible."
    );
  }

  let archivo;

  try {
    archivo =
      DriveApp.getFileById(
        referencia.idArchivo
      );
  } catch (error) {
    const efectivo =
      normalizarCorreo(
        Session
          .getEffectiveUser()
          .getEmail()
      );

    const activo =
      normalizarCorreo(
        Session
          .getActiveUser()
          .getEmail()
      );

    console.error(
      "ARCHIVO_VENTA_DRIVE_DENEGADO %s",
      JSON.stringify({
        idVenta: idVenta,
        idArchivo:
          referencia.idArchivo,
        usuarioApp:
          usuario.correo || "",
        effectiveUser:
          efectivo,
        activeUser:
          activo,
        error:
          error &&
          error.message
            ? error.message
            : String(error)
      })
    );

    throw new Error(
      "La venta está autorizada en Cálidda 360, pero la identidad que ejecuta la Web App no pudo leer el archivo privado de Drive. Revisa la configuración de la implementación de la Web App."
    );
  }

  const blob =
    archivo.getBlob();

  const bytes =
    blob.getBytes();

  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error(
      "El archivo supera el tamaño permitido para abrirlo desde la plataforma."
    );
  }

  const nombre =
    limpiarTextoMotor_(
      referencia.nombre ||
      archivo.getName() ||
      "archivo",
      180
    ) || "archivo";

  const mime =
    String(
      referencia.mime ||
      blob.getContentType() ||
      "application/octet-stream"
    ).trim();

  registrarCambioMotor_(
    VENTAS_CONTADO_SGT360.CODIGO,
    "LEER_ARCHIVO_VENTA",
    "VENTA",
    idVenta,
    {
      idArchivo:
        referencia.idArchivo,
      tipoArchivo:
        referencia.tipo,
      nombreArchivo:
        nombre
    }
  );

  return {
    correcto: true,
    idVenta: idVenta,
    idArchivo: referencia.idArchivo,
    tipoArchivo: referencia.tipo,
    nombreArchivo: nombre,
    mimeType: mime,
    tamanoBytes: bytes.length,
    base64:
      Utilities.base64Encode(bytes)
  };
}

function diagnosticarAccesoArchivosVentasPaso29U(
  idVenta
) {
  const usuario =
    obtenerUsuarioActual();

  const id =
    String(idVenta || "").trim();

  const venta =
    leerCabecerasVentasSnapshotPaso29P_()
      .map(mapearVentaContado_)
      .find(function(item) {
        return item.idVenta === id;
      }) || null;

  const resultado = {
    correcto: true,
    paso: "29U",
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      rol: usuario.rol
    },
    idVenta: id,
    ventaEncontrada: Boolean(venta),
    puedeLeerArchivos:
      venta
        ? usuarioPuedeLeerArchivoVentaPaso29U_(
            venta,
            usuario
          )
        : null,
    archivos:
      venta
        ? {
            comprobantePago:
              extraerIdArchivoDriveVentaPaso29U_(
                venta.idArchivoComprobante,
                venta.urlComprobante
              ),
            depositoProveedor:
              extraerIdArchivoDriveVentaPaso29U_(
                venta.idArchivoDepositoProveedor,
                venta.urlDepositoProveedor
              ),
            boletaCliente:
              extraerIdArchivoDriveVentaPaso29U_(
                venta.idArchivoBoletaVentaCliente,
                venta.urlBoletaVentaCliente
              )
          }
        : {}
  };

  console.log(
    "DIAGNOSTICO_ARCHIVOS_VENTAS_PASO29U\n" +
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}


/** Exporta ventas filtradas en formato HTML compatible con Excel (.xls). */
function exportarVentasContadoModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoVentasContado_("EXPORTAR", usuario);
  filtros = filtros || {};
  let registros = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA).map(mapearVentaContado_);
  registros = filtrarVentasContadoPorAlcance_(registros, usuario, "EXPORTAR");
  registros = filtrarTipoRegistroVentasPaso29T_(registros, filtros, usuario);
  registros = aplicarFiltrosVentasContado_(registros, filtros);
  registros.sort(function(a, b) { return a.fechaOrden - b.fechaOrden; });
  let detalles = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE)
    .filter(function(item) { return normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO; })
    .map(mapearDetalleVentaContado_);
  detalles = filtrarDetallesVentaContadoParaUsuario_(detalles, usuario, "EXPORTAR");
  const detallesPorVenta = {};
  detalles.forEach(function(item) {
    if (!detallesPorVenta[item.idVenta]) detallesPorVenta[item.idVenta] = [];
    detallesPorVenta[item.idVenta].push(item);
  });
  const cabeceras = [
    "CODIGO_VENTA", "FECHA_REGISTRO", "TIPO_VENTA", "ES_GASODOMESTICO", "ESTADO", "ESTADO_ABONO", "FECHA_VALIDACION_ABONO", "OBSERVACION_VALIDACION_ABONO",
    "USUARIO", "CODIGO_OFICINA", "OFICINA", "CODIGO_GRUPO", "GRUPO", "ALCANCE", "TIPO_REGISTRO", "ESTADO_PRUEBA", "ES_CLIENTE_CALIDDA", "USA_CUENTA_CONTRATO",
    "CUENTA_CONTRATO", "DNI_CLIENTE", "NOMBRE_CLIENTE", "DIRECCION_ENTREGA", "REFERENCIA", "TELEFONO_CLIENTE",
    "RECIBE_DIRECCION_CUENTA", "TIPO_RECEPTOR", "NOMBRE_RECEPTOR", "DNI_RECEPTOR", "TELEFONO_RECEPTOR", "RELACION_RECEPTOR",

    "ESTADO_COMPROBANTE_PAGO_CLIENTE", "NOMBRE_COMPROBANTE_PAGO_CLIENTE", "URL_COMPROBANTE_PAGO_CLIENTE",
    "ESTADO_DEPOSITO_PROVEEDOR", "NOMBRE_DEPOSITO_PROVEEDOR", "URL_DEPOSITO_PROVEEDOR",
    "ESTADO_BOLETA_VENTA_CLIENTE", "NOMBRE_BOLETA_VENTA_CLIENTE", "URL_BOLETA_VENTA_CLIENTE",

    "CODIGO_SAP_PROVEEDOR", "NOMBRE_COMERCIAL_PROVEEDOR", "CODIGO_MATERIAL", "CODIGO_SAP", "DESCRIPCION_MATERIAL", "TIPO_MATERIAL",
    "ESTADO_ITEM", "MOTIVO_ANULACION_ITEM", "OBSERVACION_ANULACION_ITEM",
    "CANTIDAD", "PRECIO_UNITARIO", "TOTAL_LINEA", "TOTAL_VENTA_ORIGINAL", "TOTAL_VENTA_VIGENTE", "TOTAL_ANULADO",
    "IMPORTE_ABONO_APROBADO", "MONEDA", "OBSERVACIONES"
  ];
  const filas = [];
  registros.forEach(function(venta) {
    const lineas = detallesPorVenta[venta.idVenta] || [];
    if (!lineas.length) lineas.push({});
    lineas.forEach(function(detalle) {
      if (detalle.idProveedorPrecio && (!detalle.codigoSapProveedor || !detalle.nombreComercialProveedor)) {
        const provExport = obtenerProveedorVentaContadoPorId_(detalle.idProveedorPrecio);
        detalle.codigoSapProveedor = detalle.codigoSapProveedor || provExport.codigoSap || provExport.ruc || "";
        detalle.nombreComercialProveedor = detalle.nombreComercialProveedor || provExport.nombreComercial || provExport.razonSocial || provExport.nombre || "";
      }
      filas.push([
        venta.codigoVenta, venta.fechaRegistro, venta.tipoVenta, venta.esGasodomestico, venta.estado, venta.estadoAbono, venta.fechaConfirmacionAbono, venta.observacionConfirmacionAbono,
        venta.nombreUsuario, venta.idOficina, venta.nombreOficina, venta.idGrupo, venta.nombreGrupo, venta.alcanceComercial, venta.tipoRegistro, venta.estadoPrueba, venta.esClienteCalidda,
        venta.usaCuentaContrato, venta.cuentaContrato, venta.dniCliente || venta.dni, venta.nombreCliente, venta.direccionEntrega,
        venta.referencia, venta.telefonoCliente || venta.telefono, venta.recibeDireccionCuenta,
        venta.tipoReceptor, venta.nombreReceptor, venta.dniReceptor, venta.telefonoReceptor, venta.relacionReceptor,

        venta.estadoComprobantePagoCliente,
        venta.nombreComprobante || "",
        venta.urlComprobante || "",

        venta.estadoDepositoProveedor,
        venta.nombreDepositoProveedor || "",
        venta.urlDepositoProveedor || "",

        venta.estadoBoletaVentaCliente,
        venta.nombreBoletaVentaCliente || "",
        venta.urlBoletaVentaCliente || "",

        detalle.codigoSapProveedor || "", detalle.nombreComercialProveedor || "",
        detalle.codigoMaterial || "", detalle.codigoSap || "", detalle.descripcionMaterial || "", detalle.tipoMaterial || "",
        detalle.estadoItem || "ACTIVO", detalle.motivoAnulacionItem || "", detalle.observacionAnulacionItem || "",
        detalle.cantidad || "", detalle.precioUnitario || "", detalle.totalLinea || "",
        venta.totalVentaOriginal, venta.totalVentaVigente || venta.totalVenta, venta.totalAnulado,
        venta.importeAbonoAprobado, venta.moneda, venta.observaciones
      ]);
    });
  });
  const contenido = construirHtmlExcelVentasContado_(cabeceras, filas, "Ventas al contado");
  const sello = Utilities.formatDate(new Date(), MOTOR_SGT360.ZONA_HORARIA, "yyyyMMdd_HHmmss");
  registrarCambioMotor_(VENTAS_CONTADO_SGT360.CODIGO, "EXPORTAR_VENTAS", "VENTA", "EXPORT_" + sello, { cantidad: filas.length });
  return {
    correcto: true,
    nombreArchivo: (normalizarSegmentoRegistroVentasPaso29T_(filtros.segmentoRegistro, usuario, "REGISTRADAS") === "COMERCIAL" ? "Ventas_comerciales_" : "Ventas_prueba_") + sello + ".xls",
    mimeType: "application/vnd.ms-excel;charset=utf-8",
    contenido: contenido,
    totalVentas: registros.length,
    totalFilas: filas.length
  };
}

/* =========================
 * Internas: estructura y seguridad
 * ========================= */

function asegurarEstructuraVentasContado_() {
  asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA, VENTAS_CONTADO_SGT360.CABECERAS.VTA_VENTAS_CONTADO);
  asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.DETALLE, VENTAS_CONTADO_SGT360.CABECERAS.VTA_VENTAS_CONTADO_DETALLE);
  asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.GESTION_ENTREGA, VENTAS_CONTADO_SGT360.CABECERAS.VTA_GESTION_ENTREGA);
  asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.EVIDENCIAS_ENTREGA, VENTAS_CONTADO_SGT360.CABECERAS.VTA_EVIDENCIAS_ENTREGA);
}

function sincronizarModuloVentasContado_() {
  const existentes = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS);
  const existente = existentes.find(function(item) { return normalizarTexto(item.CODIGO) === VENTAS_CONTADO_SGT360.CODIGO; });
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS, "ID_MODULO", {
    ID_MODULO: existente ? existente.ID_MODULO : generarIdMotor_("MOD"),
    CODIGO: VENTAS_CONTADO_SGT360.CODIGO,
    NOMBRE: VENTAS_CONTADO_SGT360.NOMBRE,
    DESCRIPCION: "Registro y descarga de ventas al contado con materiales y precios vigentes.",
    ICONO: "point_of_sale",
    GRUPO_MENU: "Ventas",
    ORDEN: 45,
    TIPO_VISTA: "ESPECIALIZADA",
    BASE_ALIAS: MOTOR_SGT360.BASES.OPERATION,
    HOJA_DATOS: VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
    CAMPO_CLAVE: "ID_VENTA",
    CAMPO_ESTADO: "ESTADO",
    CAMPO_USUARIO: "ID_USUARIO",
    CAMPO_PROVEEDOR: "",
    CAMPO_GRUPO: "ID_GRUPO",
    ADMINISTRABLE: "NO",
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_CREACION: existente ? existente.FECHA_CREACION : ahora,
    FECHA_ACTUALIZACION: ahora
  });
}

function sincronizarRecursosVentasContado_() {
  sincronizarRecursosModuloMotor_(VENTAS_CONTADO_SGT360.CODIGO, VENTAS_CONTADO_SGT360.RECURSOS);
}

const VENTAS_CONTADO_CACHE_SEGURIDAD_29W_ = {};
const VENTAS_CONTADO_CACHE_OFICINAS_29W_ = {};

function limpiarCacheSeguridadVentasPaso29W_() {
  Object.keys(
    VENTAS_CONTADO_CACHE_SEGURIDAD_29W_
  ).forEach(function(clave) {
    delete VENTAS_CONTADO_CACHE_SEGURIDAD_29W_[clave];
  });

  Object.keys(
    VENTAS_CONTADO_CACHE_OFICINAS_29W_
  ).forEach(function(clave) {
    delete VENTAS_CONTADO_CACHE_OFICINAS_29W_[clave];
  });
}

function claveUsuarioVentasPaso29W_(usuario) {
  usuario = usuario || {};

  return [
    String(usuario.idUsuario || "").trim(),
    normalizarTexto(usuario.rol || ""),
    String(usuario.idProveedor || "").trim(),
    String(usuario.idOficina || "").trim(),
    String(usuario.idGrupo || "").trim()
  ].join("|");
}

/**
 * Lee la matriz de permisos UNA sola vez por usuario durante el RPC actual.
 *
 * Antes, cada llamada a tienePermisoMotor_ / obtenerAlcancePermisoMotor_
 * volvía a leer SEG_PERMISOS. En listados, esa operación podía repetirse
 * decenas o cientos de veces.
 */
function obtenerMatrizPermisosVentasPaso29W_(usuario) {
  usuario = usuario || obtenerUsuarioActual();

  const clave =
    claveUsuarioVentasPaso29W_(usuario);

  if (
    VENTAS_CONTADO_CACHE_SEGURIDAD_29W_[clave]
  ) {
    return VENTAS_CONTADO_CACHE_SEGURIDAD_29W_[clave];
  }

  const permisos =
    obtenerPermisosUsuarioMotor_(usuario);

  const modulo =
    permisos[
      normalizarTexto(
        VENTAS_CONTADO_SGT360.CODIGO
      )
    ] || {};

  VENTAS_CONTADO_CACHE_SEGURIDAD_29W_[clave] =
    modulo;

  return modulo;
}

function obtenerPermisoVentasContadoPaso29W_(
  recurso,
  usuario
) {
  usuario = usuario || obtenerUsuarioActual();

  if (
    normalizarTexto(usuario.rol) ===
    CONFIG.ROLES.SUPERADMIN
  ) {
    return {
      permitido: true,
      alcance: "GLOBAL"
    };
  }

  const codigo =
    normalizarTexto(recurso);

  const matriz =
    obtenerMatrizPermisosVentasPaso29W_(
      usuario
    );

  const directo =
    matriz[codigo];

  if (
    directo &&
    directo.permitido === true
  ) {
    return {
      permitido: true,
      alcance:
        normalizarTexto(
          directo.alcance || "PROPIO"
        )
    };
  }

  const administrar =
    matriz.ADMINISTRAR;

  if (
    administrar &&
    administrar.permitido === true
  ) {
    return {
      permitido: true,
      alcance:
        normalizarTexto(
          administrar.alcance || "GLOBAL"
        )
    };
  }

  return {
    permitido: false,
    alcance: "NINGUNO"
  };
}

function tienePermisoVentasContado_(
  recurso,
  usuario
) {
  return (
    obtenerPermisoVentasContadoPaso29W_(
      recurso,
      usuario
    ).permitido === true
  );
}

function obtenerAlcancePermisoVentasContado_(
  recurso,
  usuario
) {
  return obtenerPermisoVentasContadoPaso29W_(
    recurso,
    usuario
  ).alcance;
}

function exigirPermisoVentasContado_(
  recurso,
  usuario
) {
  if (
    !tienePermisoVentasContado_(
      recurso,
      usuario
    )
  ) {
    throw new Error(
      "No tienes permiso para " +
      normalizarTexto(recurso) +
      " en Ventas al contado."
    );
  }
}

function obtenerIdsOficinasPermitidasVentasPaso29W_(
  usuario
) {
  usuario = usuario || obtenerUsuarioActual();

  const clave =
    claveUsuarioVentasPaso29W_(usuario);

  if (
    Object.prototype.hasOwnProperty.call(
      VENTAS_CONTADO_CACHE_OFICINAS_29W_,
      clave
    )
  ) {
    return VENTAS_CONTADO_CACHE_OFICINAS_29W_[
      clave
    ].slice();
  }

  // Paso 30A:
  // Esta función es un wrapper cacheado. Debe leer las oficinas desde
  // el motor general y NO volver a llamarse a sí misma.
  const ids =
    obtenerIdsOficinasPermitidasUsuarioMotor(
      usuario
    )
      .map(function(id) {
        return String(id || "").trim();
      })
      .filter(Boolean);

  VENTAS_CONTADO_CACHE_OFICINAS_29W_[clave] =
    ids.slice();

  return ids;
}

/* =========================
 * Internas: alcance comercial
 * ========================= */

function resolverOpcionesComercialesVentasContado_(usuario) {
  usuario = usuario || obtenerUsuarioActual();

  const oficinasActivas =
    listarOficinasAdminMotor_()
      .filter(function(item) {
        return item.estado === CONFIG.ESTADOS.ACTIVO;
      });

  const gruposActivos =
    listarGruposAdminMotor_()
      .filter(function(item) {
        return item.estado === CONFIG.ESTADOS.ACTIVO;
      });

  const idsOficinas =
    obtenerIdsOficinasPermitidasVentasPaso29W_(
      usuario
    );

  const mapaOficinasPermitidas = {};

  idsOficinas.forEach(function(id) {
    const valor =
      String(id || "").trim();

    if (valor) {
      mapaOficinasPermitidas[valor] = true;
    }
  });

  const oficinas =
    oficinasActivas
      .filter(function(item) {
        return Boolean(
          mapaOficinasPermitidas[item.idOficina]
        );
      })
      .sort(function(a, b) {
        return compararTextoMotor_(
          a.nombre,
          b.nombre
        );
      });

  const idGrupoUsuario =
    String(usuario.idGrupo || "").trim();

  const grupoUsuario =
    idGrupoUsuario
      ? gruposActivos.find(function(item) {
          return item.idGrupo === idGrupoUsuario;
        }) || null
      : null;

  const grupoUsuarioValido =
    Boolean(
      grupoUsuario &&
      mapaOficinasPermitidas[
        grupoUsuario.idOficina
      ]
    );

  const advertencias = [];

  if (
    idGrupoUsuario &&
    !grupoUsuarioValido
  ) {
    advertencias.push(
      "El grupo asignado al usuario no pertenece a una oficina habilitada. Se ignorará esa asignación y podrá seleccionar entre los grupos de sus oficinas permitidas."
    );
  }

  let idOficinaPredeterminada =
    oficinas.length === 1
      ? oficinas[0].idOficina
      : "";

  let idGrupoPredeterminado = "";

  // Si el usuario tiene un grupo válido, queda restringido a ese grupo.
  if (grupoUsuarioValido) {
    if (
      !idOficinaPredeterminada ||
      idOficinaPredeterminada ===
        grupoUsuario.idOficina
    ) {
      idOficinaPredeterminada =
        grupoUsuario.idOficina;

      idGrupoPredeterminado =
        grupoUsuario.idGrupo;
    }
  }

  /**
   * Paso 29Q:
   *
   * - Con ID_GRUPO válido:
   *     solo ese grupo.
   *
   * - Sin ID_GRUPO:
   *     todos los grupos activos de TODAS las oficinas permitidas.
   *
   * Esto permite que un supervisor asignado a una oficina, pero sin grupo
   * específico, registre ventas para cualquiera de los grupos de esa oficina.
   */
  const gruposDisponibles =
    gruposActivos
      .filter(function(grupo) {
        if (
          !mapaOficinasPermitidas[
            grupo.idOficina
          ]
        ) {
          return false;
        }

        if (grupoUsuarioValido) {
          return (
            grupo.idGrupo ===
            grupoUsuario.idGrupo
          );
        }

        return true;
      })
      .sort(function(a, b) {
        return (
          compararTextoMotor_(
            a.nombreOficina || "",
            b.nombreOficina || ""
          ) ||
          compararTextoMotor_(
            a.nombre,
            b.nombre
          )
        );
      });

  const gruposPorOficina = {};

  gruposDisponibles.forEach(function(grupo) {
    const idOficina =
      String(grupo.idOficina || "").trim();

    if (!idOficina) return;

    if (!gruposPorOficina[idOficina]) {
      gruposPorOficina[idOficina] = [];
    }

    gruposPorOficina[idOficina].push(
      grupo
    );
  });

  Object.keys(gruposPorOficina)
    .forEach(function(idOficina) {
      gruposPorOficina[idOficina] =
        gruposPorOficina[idOficina]
          .sort(function(a, b) {
            return compararTextoMotor_(
              a.nombre,
              b.nombre
            );
          });
    });

  // Si no tiene grupo asignado y la única oficina permitida tiene
  // exactamente un grupo, lo seleccionamos automáticamente.
  if (
    !grupoUsuarioValido &&
    idOficinaPredeterminada
  ) {
    const gruposOficina =
      gruposPorOficina[
        idOficinaPredeterminada
      ] || [];

    if (gruposOficina.length === 1) {
      idGrupoPredeterminado =
        gruposOficina[0].idGrupo;
    }
  }

  const oficinaPred =
    oficinas.find(function(item) {
      return (
        item.idOficina ===
        idOficinaPredeterminada
      );
    }) || null;

  const grupoPred =
    gruposDisponibles.find(function(item) {
      return (
        item.idGrupo ===
        idGrupoPredeterminado
      );
    }) || null;

  return {
    oficinas: oficinas,
    grupos: gruposDisponibles,
    gruposPorOficina: gruposPorOficina,

    idOficinaPredeterminada:
      idOficinaPredeterminada,

    nombreOficinaPredeterminada:
      oficinaPred
        ? oficinaPred.nombre
        : "",

    idGrupoPredeterminado:
      idGrupoPredeterminado,

    nombreGrupoPredeterminado:
      grupoPred
        ? grupoPred.nombre
        : "",

    puedeSeleccionarOficina:
      oficinas.length > 1,

    puedeSeleccionarGrupo:
      Boolean(
        idOficinaPredeterminada &&
        (
          gruposPorOficina[
            idOficinaPredeterminada
          ] || []
        ).length > 1
      ),

    alcancePredeterminado:
      idGrupoPredeterminado
        ? "GRUPO"
        : (
            idOficinaPredeterminada
              ? "OFICINA"
              : "GENERAL"
          ),

    tieneGrupoAsignado:
      grupoUsuarioValido,

    advertencias: advertencias
  };
}

function validarAlcanceComercialVentasContado_(datos, usuario, exigirSeleccionOficina) {
  usuario = usuario || obtenerUsuarioActual();
  datos = datos || {};
  const opciones = resolverOpcionesComercialesVentasContado_(usuario);
  const oficinasPermitidas = {};
  opciones.oficinas.forEach(function(item) { oficinasPermitidas[item.idOficina] = item; });
  const gruposPermitidos = {};
  opciones.grupos.forEach(function(item) { gruposPermitidos[item.idGrupo] = item; });
  let idOficina = String(datos.idOficina || opciones.idOficinaPredeterminada || "").trim();
  let idGrupo = String(datos.idGrupo || opciones.idGrupoPredeterminado || "").trim();

  if (opciones.oficinas.length === 1) idOficina = opciones.oficinas[0].idOficina;
  if (opciones.oficinas.length > 1 && exigirSeleccionOficina && !idOficina) {
    throw new Error("Selecciona la oficina de ventas.");
  }
  if (idOficina && !oficinasPermitidas[idOficina]) {
    throw new Error("La oficina seleccionada no está habilitada para tu usuario.");
  }
  if (!idOficina) idGrupo = "";
  if (idGrupo) {
    const grupo = gruposPermitidos[idGrupo];
    if (!grupo) throw new Error("El grupo seleccionado no está habilitado para tu usuario.");
    if (!idOficina || grupo.idOficina !== idOficina) {
      throw new Error("El grupo seleccionado no pertenece a la oficina de ventas.");
    }
  }
  const gruposDeOficina = idOficina && opciones.gruposPorOficina ? (opciones.gruposPorOficina[idOficina] || []) : [];
  if (exigirSeleccionOficina && idOficina && gruposDeOficina.length > 0 && !idGrupo) {
    throw new Error("Selecciona el grupo de vendedores.");
  }
  const oficina = idOficina ? oficinasPermitidas[idOficina] : null;
  const grupoSel = idGrupo ? gruposPermitidos[idGrupo] : null;
  return {
    idOficina: idOficina,
    nombreOficina: oficina ? oficina.nombre : "",
    idGrupo: idGrupo,
    nombreGrupo: grupoSel ? grupoSel.nombre : "",
    alcanceComercial: idGrupo ? "GRUPO" : (idOficina ? "OFICINA" : "GENERAL"),
    opciones: opciones
  };
}

/* =========================
 * Internas: negocios de venta
 * ========================= */

function listarNegociosVentasContado_() {
  const valores = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES).filter(function(item) {
    return normalizarTexto(item.CATALOGO) === "MP_NEGOCIOS" &&
      normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    const codigo = normalizarTexto(item.CODIGO);
    let metadata = {};
    try { metadata = item.METADATA_JSON ? JSON.parse(String(item.METADATA_JSON)) : {}; } catch (error) { metadata = {}; }
    return {
      codigo: codigo,
      id: codigo,
      nombre: String(item.NOMBRE || codigo).trim(),
      orden: Number(item.ORDEN) || 999,
      esGasodomestico: codigo === "GASODOMESTICOS" || codigo === "GASODOMESTICO" || normalizarTexto(metadata.negocio) === "GASODOMESTICOS"
    };
  }).filter(function(item) { return Boolean(item.codigo); }).sort(function(a, b) {
    return a.orden - b.orden || compararTextoMotor_(a.nombre, b.nombre);
  });
  return valores;
}

/* =========================
 * Internas: materiales y precios
 * ========================= */


/** Lista proveedores destino activos asociados al material para ventas al contado. */
function listarProveedoresDestinoVentaContado_(idMaterial, usuario) {
  const id = String(idMaterial || "").trim();
  if (!id) return [];
  usuario = usuario || obtenerUsuarioActual();
  const negocios = listarNegociosVentasContado_();
  const proveedorUsuario =
    obtenerProveedorRestriccionCatalogoVentasPaso29R_(
      usuario
    );
  const salida = {};
  negocios.forEach(function(negocio) {
    const alcance = { idNegocio: negocio.codigo, idOficina: "", idGrupo: "", alcanceComercial: "GENERAL" };
    construirOfertasVentasContadoPaso29A_(alcance, usuario, new Date()).forEach(function(item) {
      if (item.idMaterial !== id) return;
      if (proveedorUsuario && item.idProveedor !== proveedorUsuario) return;
      salida[item.idProveedor] = {
        idProveedor: item.idProveedor,
        codigoSap: item.codigoSapProveedor || "",
        nombreComercial: item.proveedor || "",
        nombre: item.proveedor || item.idProveedor
      };
    });
  });
  return Object.keys(salida).map(function(k){ return salida[k]; }).sort(function(a,b){ return compararTextoMotor_(a.nombre,b.nombre); });
}

/** Obtiene datos básicos de proveedor por ID para guardar/exportar ventas. */
function obtenerProveedorVentaContadoPorId_(idProveedor) {
  const id = String(idProveedor || "").trim();
  if (!id) return {};
  const proveedor = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES, { usarValoresMostrados: true }).find(function(item) {
    return String(item.ID_PROVEEDOR || "").trim() === id;
  }) || {};
  return {
    idProveedor: id,
    codigoSap: String(proveedor.CODIGO_SAP || "").trim(),
    ruc: String(proveedor.RUC || "").trim(),
    razonSocial: String(proveedor.RAZON_SOCIAL || proveedor.NOMBRE || "").trim(),
    nombreComercial: String(proveedor.NOMBRE_COMERCIAL || proveedor.RAZON_SOCIAL || proveedor.NOMBRE || "").trim(),
    nombre: String(proveedor.NOMBRE_COMERCIAL || proveedor.RAZON_SOCIAL || proveedor.NOMBRE || id).trim(),
    estado: normalizarTexto(proveedor.ESTADO || CONFIG.ESTADOS.ACTIVO)
  };
}

/** Devuelve proveedor resuelto a partir de la lista ya calculada o del maestro. */
function obtenerProveedorDestinoResueltoVentaContado_(idProveedor, proveedoresDestino) {
  const id = String(idProveedor || "").trim();
  if (!id) return {};
  const lista = Array.isArray(proveedoresDestino) ? proveedoresDestino : [];
  const encontrado = lista.find(function(item) {
    return String(item.idProveedor || item.ID_PROVEEDOR || "").trim() === id;
  });
  return encontrado || obtenerProveedorVentaContadoPorId_(id);
}

function obtenerMaterialVentaContadoPorId_(idMaterial) {
  const id = String(idMaterial || "").trim();
  if (!id) return null;
  return construirVistaMaterialesPreciosCache_().find(function(item) { return String(item.idMaterial || "").trim() === id; }) || null;
}

function obtenerMaterialesConPrecioVigenteVentasContado_(alcance, usuario) {
  const materiales = construirVistaMaterialesPreciosCache_().filter(function(item) { return item.estado === CONFIG.ESTADOS.ACTIVO; });
  return materiales.map(function(material) {
    const precio = resolverPrecioVentaContado_(material.idMaterial, alcance, usuario, { silencioso: true, permitirFallbackUnico: true });
    if (!precio.encontrado && !precio.requiereProveedor) return null;
    return Object.assign({}, material, { precioResuelto: precio });
  }).filter(Boolean);
}


function resolverPrecioVentaContadoDesdeLineaRapida_(idMaterial, alcance, usuario, linea) {
  linea = linea || {};
  const id = String(idMaterial || linea.idMaterial || "").trim();
  const idDetallePrecio = String(linea.idDetallePrecio || linea.idOferta || linea.ID_DETALLE_PRECIO || "").trim();
  if (idDetallePrecio) {
    const oferta = resolverOfertaVentaContadoPaso29A_(idDetallePrecio, alcance, usuario);
    if (id && oferta.idMaterial !== id) throw new Error("La oferta seleccionada no corresponde al material de la línea.");
    return {
      correcto: true,
      encontrado: true,
      requiereSeleccion: false,
      requiereProveedor: false,
      idMaterial: oferta.idMaterial,
      idDetallePrecio: oferta.idDetallePrecio,
      idListaPrecio: oferta.idListaPrecio,
      idProveedor: oferta.idProveedor,
      codigoSapProveedor: oferta.codigoSapProveedor || "",
      nombreComercialProveedor: oferta.proveedor || "",
      precioBase: Number(oferta.precioBase || 0),
      moneda: oferta.moneda || VENTAS_CONTADO_SGT360.MONEDA,
      detalleCombo: oferta.detalleCombo || "",
      tieneCombo: oferta.detalleCombo ? "SI" : "NO",
      alcancePrecio: oferta.alcancePrecio || "GENERAL",
      idOficina: oferta.idOficina || "",
      idGrupo: oferta.idGrupo || "",
      proveedor: {
        idProveedor: oferta.idProveedor,
        codigoSap: oferta.codigoSapProveedor || "",
        nombreComercial: oferta.proveedor || "",
        nombre: oferta.proveedor || oferta.idProveedor
      }
    };
  }
  return resolverPrecioVentaContado_(id, alcance, usuario, { idProveedor: linea.idProveedor || "" });
}

function resolverPrecioVentaContado_(idMaterial, alcance, usuario, opciones) {
  opciones = opciones || {};
  const id = String(idMaterial || "").trim();
  const idProveedor = String(opciones.idProveedor || opciones.ID_PROVEEDOR || "").trim();
  let ofertas = construirOfertasVentasContadoPaso29A_(alcance, usuario, convertirFechaMotor_(opciones.fecha) || new Date()).filter(function(item) {
    return item.idMaterial === id && (!idProveedor || item.idProveedor === idProveedor);
  });
  if (!ofertas.length) {
    return {
      correcto: false,
      encontrado: false,
      requiereProveedor: false,
      requiereSeleccion: false,
      proveedores: [],
      mensaje: opciones.silencioso ? "" : "No existe una oferta vigente para este material y alcance."
    };
  }
  if (!idProveedor && ofertas.length > 1) {
    const proveedores = {};
    ofertas.forEach(function(item) {
      proveedores[item.idProveedor] = {
        idProveedor: item.idProveedor,
        codigoSap: item.codigoSapProveedor || "",
        nombreComercial: item.proveedor || "",
        nombre: item.proveedor || item.idProveedor
      };
    });
    return {
      correcto: false,
      encontrado: false,
      requiereProveedor: true,
      requiereSeleccion: true,
      proveedores: Object.keys(proveedores).map(function(k){ return proveedores[k]; }),
      mensaje: "Selecciona una oferta/proveedor del catálogo."
    };
  }
  const oferta = ofertas[0];
  return {
    correcto: true,
    encontrado: true,
    requiereProveedor: false,
    requiereSeleccion: false,
    idMaterial: oferta.idMaterial,
    idDetallePrecio: oferta.idDetallePrecio,
    idListaPrecio: oferta.idListaPrecio,
    idProveedor: oferta.idProveedor,
    codigoSapProveedor: oferta.codigoSapProveedor || "",
    nombreComercialProveedor: oferta.proveedor || "",
    precioBase: Number(oferta.precioBase || 0),
    moneda: oferta.moneda || VENTAS_CONTADO_SGT360.MONEDA,
    detalleCombo: oferta.detalleCombo || "",
    tieneCombo: oferta.detalleCombo ? "SI" : "NO",
    alcancePrecio: oferta.alcancePrecio || "GENERAL",
    idOficina: oferta.idOficina || "",
    idGrupo: oferta.idGrupo || "",
    proveedor: {
      idProveedor: oferta.idProveedor,
      codigoSap: oferta.codigoSapProveedor || "",
      nombreComercial: oferta.proveedor || "",
      nombre: oferta.proveedor || oferta.idProveedor
    },
    mensaje: "Precio vigente encontrado."
  };
}

function listaVentaCumpleAlcance_(lista, alcance, fecha) {
  if (normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
  if (!fechaDentroVigenciaPrecio_(fecha || new Date(), lista.FECHA_INICIO, lista.FECHA_FIN)) return false;
  const listaNegocio = String(lista.ID_NEGOCIO || "").trim();
  const idNegocio = String(alcance && alcance.idNegocio || "").trim();
  if (idNegocio && listaNegocio !== idNegocio) return false;
  const listaOficina = String(lista.ID_OFICINA || "").trim();
  const listaGrupo = String(lista.ID_GRUPO || "").trim();
  const idOficina = String(alcance && alcance.idOficina || "").trim();
  const idGrupo = String(alcance && alcance.idGrupo || "").trim();
  if (!idOficina) return !listaOficina && !listaGrupo;
  if (listaOficina && listaOficina !== idOficina) return false;
  if (!idGrupo) return !listaGrupo;
  return !listaGrupo || listaGrupo === idGrupo;
}

function calcularPrioridadPrecioVenta_(lista, alcance, usuario, idProveedorSeleccionado) {
  const idProveedorUsuario =
    obtenerProveedorRestriccionCatalogoVentasPaso29R_(
      usuario
    );
  const proveedorLista = String(lista.ID_PROVEEDOR || "").trim();
  const proveedorSeleccionado = String(idProveedorSeleccionado || "").trim();
  const idOficina = String(alcance && alcance.idOficina || "").trim();
  const idGrupo = String(alcance && alcance.idGrupo || "").trim();
  let puntos = 0;
  if (proveedorSeleccionado && proveedorLista === proveedorSeleccionado) puntos += 1200;
  if (idProveedorUsuario && proveedorLista === idProveedorUsuario) puntos += 1000;
  if (!idProveedorUsuario && !proveedorLista) puntos += 300;
  if (!proveedorLista) puntos += 100;
  if (idGrupo && String(lista.ID_GRUPO || "").trim() === idGrupo) puntos += 300;
  if (idOficina && String(lista.ID_OFICINA || "").trim() === idOficina) puntos += 200;
  if (!String(lista.ID_OFICINA || "").trim()) puntos += 50;
  puntos += Math.max(0, 40 - (Number(lista.PRIORIDAD) || 30));
  return puntos;
}

function precioVentaVisibleParaUsuario_(detalle, lista, usuario) {
  usuario = usuario || obtenerUsuarioActual();
  const idProveedorUsuario =
    obtenerProveedorRestriccionCatalogoVentasPaso29R_(
      usuario
    );
  if (!idProveedorUsuario) return true;
  return String(lista && lista.ID_PROVEEDOR || "").trim() === idProveedorUsuario;
}

function mapearPrecioVentaResuelto_(idMaterial, candidato, totalCandidatos, fallback, idProveedorSeleccionado, proveedoresDestino) {
  const lista = candidato.lista || {};
  const detalle = candidato.detalle || {};
  const idOficina = String(lista.ID_OFICINA || "").trim();
  const idGrupo = String(lista.ID_GRUPO || "").trim();
  const proveedorPrecio = String(lista.ID_PROVEEDOR || "").trim();
  const idProveedor = String(idProveedorSeleccionado || proveedorPrecio || "").trim();
  const proveedor = obtenerProveedorDestinoResueltoVentaContado_(idProveedor, proveedoresDestino);
  return {
    correcto: true,
    encontrado: true,
    requiereSeleccion: false,
    fallback: fallback === true,
    totalCandidatos: totalCandidatos || 1,
    idMaterial: idMaterial,
    idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
    idProveedor: idProveedor,
    codigoSapProveedor: proveedor.codigoSap || "",
    rucProveedor: proveedor.ruc || "",
    nombreComercialProveedor: proveedor.nombreComercial || proveedor.razonSocial || proveedor.nombre || "",
    proveedor: proveedor,
    idOficina: idOficina,
    idGrupo: idGrupo,
    alcancePrecio: idGrupo ? "GRUPO" : (idOficina ? "OFICINA" : "GENERAL"),
    tipoPrecio: proveedorPrecio ? "ESPECIFICO_PROVEEDOR" : "GENERAL_MATERIAL",
    precioBase: Number(detalle.PRECIO_BASE || 0),
    moneda: String(detalle.MONEDA || lista.MONEDA || VENTAS_CONTADO_SGT360.MONEDA).trim(),
    fechaInicio: normalizarFechaSalidaPrecio_(lista.FECHA_INICIO),
    fechaFin: normalizarFechaSalidaPrecio_(lista.FECHA_FIN),
    tieneCombo: convertirBooleanoMotor_(detalle.TIENE_COMBO || detalle.ES_COMBO) ? "SI" : "NO",
    detalleCombo: String(detalle.DETALLE_COMBO || detalle.COMPONENTES_INCLUIDOS || "").trim(),
    mensaje: "Precio vigente resuelto."
  };
}

/* =========================
 * Internas: ventas
 * ========================= */

function normalizarTipoVentaContado_(tipoVenta) {
  const tipo = normalizarTexto(tipoVenta || "");
  if (!tipo) throw new Error("Selecciona el negocio de la venta.");
  const normalizado = normalizarNegocioVentaContado_(tipo);
  if (normalizado) return normalizado;
  if (tipo === VENTAS_CONTADO_SGT360.TIPOS_VENTA.GASODOMESTICO) {
    const gas = listarNegociosVentasContado_().find(function(item) { return item.esGasodomestico === true; });
    if (gas) return gas.codigo;
  }
  if (tipo === VENTAS_CONTADO_SGT360.TIPOS_VENTA.OTRO) return VENTAS_CONTADO_SGT360.TIPOS_VENTA.OTRO;
  throw new Error("El negocio seleccionado no está registrado en el catálogo MP_NEGOCIOS.");
}

function normalizarNegocioVentaContado_(codigoNegocio) {
  const codigo = normalizarTexto(codigoNegocio || "");
  if (!codigo) return "";
  const negocios = listarNegociosVentasContado_();
  const encontrado = negocios.find(function(item) { return item.codigo === codigo; });
  return encontrado ? encontrado.codigo : "";
}

function esNegocioGasodomesticoVentaContado_(codigoNegocio) {
  const codigo = normalizarTexto(codigoNegocio || "");
  if (codigo === "GASODOMESTICO" || codigo === "GASODOMESTICOS") return true;
  const negocio = listarNegociosVentasContado_().find(function(item) { return item.codigo === codigo; });
  return negocio ? negocio.esGasodomestico === true : false;
}

function obtenerNombreNegocioVentaContado_(codigoNegocio) {
  const codigo = normalizarTexto(codigoNegocio || "");
  const negocio = listarNegociosVentasContado_().find(function(item) { return item.codigo === codigo; });
  return negocio ? negocio.nombre : String(codigoNegocio || "").trim();
}

function guardarComprobanteVentaContado_(comprobante, codigoVenta) {
  if (!comprobante || typeof comprobante !== "object") {
    throw new Error("Adjunta el comprobante de pago.");
  }
  const nombreOriginal = limpiarTextoMotor_(comprobante.nombre || comprobante.name || "comprobante", 180) || "comprobante";
  const mimeType = String(comprobante.mimeType || comprobante.type || "").trim().toLowerCase();
  if (VENTAS_CONTADO_SGT360.COMPROBANTES.MIMES_PERMITIDOS.indexOf(mimeType) === -1) {
    throw new Error("El comprobante debe ser PDF, PNG, JPG o WEBP.");
  }
  let base64 = String(comprobante.base64 || comprobante.dataUrl || "").trim();
  if (base64.indexOf(",") !== -1) base64 = base64.split(",").pop();
  if (!base64) throw new Error("No se pudo leer el comprobante de pago.");
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > VENTAS_CONTADO_SGT360.COMPROBANTES.TAMANO_MAXIMO_BYTES) {
    throw new Error("El comprobante no debe superar 5 MB.");
  }
  const extension = obtenerExtensionComprobanteVentaContado_(nombreOriginal, mimeType);
  const nombreArchivo = [normalizarClaveMotor_(codigoVenta || "VENTA"), "COMPROBANTE", Utilities.getUuid().slice(0, 8).toUpperCase()].join("_") + extension;
  const blob = Utilities.newBlob(bytes, mimeType, nombreArchivo);
  const carpeta = obtenerCarpetaComprobantesVentaContado_();
  const archivo = carpeta.createFile(blob);
  return {
    idArchivo: archivo.getId(),
    url: archivo.getUrl(),
    nombre: nombreOriginal,
    mimeType: mimeType
  };
}

function obtenerExtensionComprobanteVentaContado_(nombre, mimeType) {
  const texto = String(nombre || "").trim();
  const match = texto.match(/\.[A-Za-z0-9]{2,5}$/);
  if (match) return match[0].toLowerCase();
  const mapa = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp"
  };
  return mapa[mimeType] || ".dat";
}

function obtenerCarpetaComprobantesVentaContado_() {
  const idCarpeta = String((CONFIG.CARPETAS && (CONFIG.CARPETAS.IMPORTACIONES || CONFIG.CARPETAS.EXPORTACIONES)) || "").trim();
  if (idCarpeta) {
    try {
      return DriveApp.getFolderById(idCarpeta);
    } catch (error) {
      console.warn("No se pudo abrir la carpeta configurada para comprobantes: %s", error.message);
    }
  }
  return DriveApp.getRootFolder();
}

function normalizarObservacionesVentaContado_(valor) {
  const observaciones = limpiarTextoMotor_(valor || "", 1500);
  if (!observaciones) throw new Error("Ingresa las observaciones de la venta.");
  return observaciones;
}

function normalizarTipoReceptorVentaContadoPaso29I_(valor) {
  const tipo = normalizarTexto(
    valor ||
    VENTAS_CONTADO_SGT360.TIPOS_RECEPTOR.COMPRADOR
  );

  if (
    tipo !== VENTAS_CONTADO_SGT360.TIPOS_RECEPTOR.COMPRADOR &&
    tipo !== VENTAS_CONTADO_SGT360.TIPOS_RECEPTOR.OTRA_PERSONA
  ) {
    throw new Error("Selecciona quién recibirá el pedido.");
  }

  return tipo;
}

function normalizarClienteVentaContado_(datos) {
  datos = datos || {};

  const esCliente = convertirBooleanoMotor_(
    datos.esClienteCalidda === true
      ? "SI"
      : datos.esClienteCalidda
  );

  const recibeDireccionCuenta = convertirBooleanoMotor_(
    datos.recibeDireccionCuenta === true
      ? "SI"
      : datos.recibeDireccionCuenta
  );

  const cuentaContrato = limpiarTextoMotor_(
    datos.cuentaContrato || "",
    40
  );

  const nombre = limpiarTextoMotor_(
    datos.nombreCliente,
    180
  );

  const dni = limpiarTextoMotor_(
    datos.dniCliente || datos.dni,
    12
  );

  const telefono = limpiarTextoMotor_(
    datos.telefonoCliente || datos.telefono,
    30
  );

  const direccion = limpiarTextoMotor_(
    datos.direccionEntrega,
    300
  );

  const referencia = limpiarTextoMotor_(
    datos.referencia,
    300
  );

  if (!nombre) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  if (!dni) {
    throw new Error("El DNI del cliente es obligatorio.");
  }

  if (!/^\d{8}$/.test(dni)) {
    throw new Error("El DNI del cliente debe tener 8 dígitos.");
  }

  if (!telefono) {
    throw new Error("El teléfono del cliente es obligatorio.");
  }

  if (!direccion) {
    throw new Error("La dirección de entrega es obligatoria.");
  }

  if (!referencia) {
    throw new Error("La referencia de la dirección es obligatoria.");
  }

  const tipoReceptor =
    normalizarTipoReceptorVentaContadoPaso29I_(
      datos.tipoReceptor
    );

  let nombreReceptor = "";
  let dniReceptor = "";
  let telefonoReceptor = "";
  let relacionReceptor = "";

  if (
    tipoReceptor ===
    VENTAS_CONTADO_SGT360.TIPOS_RECEPTOR.COMPRADOR
  ) {
    // Snapshot: aunque el receptor sea el comprador, se guardan los datos
    // nuevamente para preservar exactamente quién estaba definido al vender.
    nombreReceptor = nombre;
    dniReceptor = dni;
    telefonoReceptor = telefono;
  } else {
    nombreReceptor = limpiarTextoMotor_(
      datos.nombreReceptor,
      180
    );

    dniReceptor = limpiarTextoMotor_(
      datos.dniReceptor,
      12
    );

    telefonoReceptor = limpiarTextoMotor_(
      datos.telefonoReceptor,
      30
    );

    relacionReceptor = limpiarTextoMotor_(
      datos.relacionReceptor || "",
      100
    );

    if (!nombreReceptor) {
      throw new Error(
        "Ingresa el nombre de la persona que recibirá el pedido."
      );
    }

    if (!dniReceptor) {
      throw new Error(
        "Ingresa el DNI de la persona que recibirá el pedido."
      );
    }

    if (!/^\d{8}$/.test(dniReceptor)) {
      throw new Error(
        "El DNI del receptor debe tener 8 dígitos."
      );
    }

    if (!telefonoReceptor) {
      throw new Error(
        "Ingresa el teléfono de la persona que recibirá el pedido."
      );
    }
  }

  return {
    esClienteCalidda: esCliente,

    // Campo legacy. Ya no gobierna la interfaz; se conserva para
    // compatibilidad e indica si la venta tiene una cuenta contrato registrada.
    usaCuentaContrato: Boolean(cuentaContrato),

    recibeDireccionCuenta: recibeDireccionCuenta,
    cuentaContrato: cuentaContrato,

    dni: dni,
    dniCliente: dni,
    nombreCliente: nombre,

    direccionEntrega: direccion,
    referencia: referencia,

    telefono: telefono,
    telefonoCliente: telefono,

    tipoReceptor: tipoReceptor,
    nombreReceptor: nombreReceptor,
    dniReceptor: dniReceptor,
    telefonoReceptor: telefonoReceptor,
    relacionReceptor: relacionReceptor
  };
}

function generarCodigoVentaContado_() {
  const usados = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA).forEach(function(item) {
    const codigo = normalizarCodigoVentaCortoPaso27L_(item.CODIGO_VENTA || "");
    if (codigo) usados[codigo] = true;
  });
  return generarCodigoVentaCortoUnicoPaso27L_(usados);
}

/**
 * Normaliza los códigos visibles de ventas registradas a 10 caracteres
 * alfanuméricos, sin guiones ni caracteres especiales.
 *
 * Regla Paso 27L Rev.1:
 * - El ID técnico de venta se mantiene intacto.
 * - Solo se corrige CODIGO_VENTA visible.
 * - La función es idempotente: los códigos que ya cumplen A-Z/0-9 y longitud 10
 *   se conservan.
 * - Los códigos antiguos, largos o con guiones se reemplazan por un código corto.
 *
 * @return {Object} Resultado de normalización.
 */
function normalizarCodigosVentasContadoPaso27L() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    return normalizarCodigosVentasContadoPaso27L_();
  } finally {
    bloqueo.releaseLock();
  }
}

/** Actualización incremental del módulo de ventas para el Paso 27L Rev.1. */
function actualizarModuloVentasContadoPaso27L() {
  const resultadoBase = actualizarModuloVentasContadoPaso27G();
  const codigosVentas = normalizarCodigosVentasContadoPaso27L();
  return {
    correcto: true,
    paso: "27L_REV1",
    mensaje: "Ventas al contado actualizadas. Los códigos visibles de ventas registradas usan 10 caracteres alfanuméricos sin separadores.",
    modulo: resultadoBase,
    codigosVentas: codigosVentas
  };
}

/**
 * Reescribe códigos de venta visibles que no cumplan el patrón corto.
 * @private
 */
function normalizarCodigosVentasContadoPaso27L_() {
  asegurarEstructuraVentasContado_();
  const contexto = obtenerContextoTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    VENTAS_CONTADO_SGT360.HOJAS.CABECERA,
    ["ID_VENTA", "CODIGO_VENTA"]
  );
  const ultimaFila = contexto.hoja.getLastRow();
  if (ultimaFila < 2) {
    return { ventasLeidas: 0, codigosActualizados: 0, mensaje: "No hay ventas registradas." };
  }

  const rango = contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas);
  const filas = rango.getValues();
  const indiceCodigo = contexto.mapa.CODIGO_VENTA;
  const indiceFechaActualizacion = contexto.mapa.FECHA_ACTUALIZACION;
  const indiceUsuarioActualizacion = contexto.mapa.ID_USUARIO_ACTUALIZACION;
  const usuario = typeof obtenerUsuarioActual === "function" ? obtenerUsuarioActual() : {};
  const ahora = new Date();
  const usados = {};

  filas.forEach(function(fila) {
    const codigoActual = normalizarCodigoVentaCortoPaso27L_(fila[indiceCodigo]);
    if (/^[A-Z0-9]{10}$/.test(codigoActual)) {
      usados[codigoActual] = true;
    }
  });

  let cambios = 0;
  filas.forEach(function(fila) {
    const codigoActual = normalizarCodigoVentaCortoPaso27L_(fila[indiceCodigo]);
    if (/^[A-Z0-9]{10}$/.test(codigoActual)) {
      return;
    }
    const nuevoCodigo = generarCodigoVentaCortoUnicoPaso27L_(usados);
    usados[nuevoCodigo] = true;
    fila[indiceCodigo] = nuevoCodigo;
    if (typeof indiceFechaActualizacion === "number") fila[indiceFechaActualizacion] = ahora;
    if (typeof indiceUsuarioActualizacion === "number") fila[indiceUsuarioActualizacion] = usuario.idUsuario || "";
    cambios++;
  });

  if (cambios > 0) {
    rango.setValues(filas);
    marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, VENTAS_CONTADO_SGT360.HOJAS.CABECERA);
    SpreadsheetApp.flush();
  }

  return {
    ventasLeidas: filas.length,
    codigosActualizados: cambios,
    longitud: 10,
    patron: "^[A-Z0-9]{10}$",
    mensaje: cambios ? "Códigos de venta normalizados." : "Los códigos de venta ya cumplían el patrón corto."
  };
}

/**
 * Genera un código visible de venta de 10 caracteres alfanuméricos.
 * Usa prefijo V para lectura humana y 9 caracteres de semilla.
 * @private
 */
function generarCodigoVentaCortoUnicoPaso27L_(usados) {
  usados = usados || {};
  let codigo = "";
  let intentos = 0;
  do {
    const tiempo = new Date().getTime().toString(36).toUpperCase();
    const uuid = Utilities.getUuid().replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const semilla = (tiempo.slice(-4) + uuid).replace(/[^A-Z0-9]/g, "");
    codigo = ("V" + semilla).slice(0, 10);
    intentos++;
  } while (usados[codigo] && intentos < 50);
  if (usados[codigo]) {
    throw new Error("No fue posible generar un código corto único de venta. Intenta nuevamente.");
  }
  return codigo;
}

/**
 * Limpia un código de venta para comparaciones internas.
 * @private
 */
function normalizarCodigoVentaCortoPaso27L_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function mapearVentaContado_(item) {
  const fecha = convertirFechaMotor_(item.FECHA_REGISTRO);
  return {
    idVenta: String(item.ID_VENTA || "").trim(),
    codigoVenta: String(item.CODIGO_VENTA || "").trim(),
    fechaRegistro: normalizarFechaHoraVentasContado_(item.FECHA_REGISTRO),
    fechaOrden: fecha ? fecha.getTime() : 0,
    tipoVenta: String(item.TIPO_VENTA || "").trim(),
    nombreTipoVenta: obtenerNombreNegocioVentaContado_(item.TIPO_VENTA),
    esGasodomestico: String(item.ES_GASODOMESTICO || "").trim(),
    idUsuario: String(item.ID_USUARIO || "").trim(),
    correoUsuario: String(item.CORREO_USUARIO || "").trim(),
    nombreUsuario: String(item.NOMBRE_USUARIO || "").trim(),
    rolUsuario: normalizarTexto(item.ROL_USUARIO),
    idOficina: String(item.ID_OFICINA || "").trim(),
    nombreOficina: String(item.NOMBRE_OFICINA || "").trim(),
    idGrupo: String(item.ID_GRUPO || "").trim(),
    nombreGrupo: String(item.NOMBRE_GRUPO || "").trim(),
    alcanceComercial: String(item.ALCANCE_COMERCIAL || "").trim(),
    tipoRegistro: normalizarTipoRegistroVentaPaso29T_(item.TIPO_REGISTRO || VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL),
    estadoPrueba: normalizarEstadoPruebaVentaPaso29T_(item.ESTADO_PRUEBA, item.TIPO_REGISTRO || VENTAS_CONTADO_SGT360.TIPOS_REGISTRO.COMERCIAL),
    fechaArchivoPrueba: normalizarFechaHoraVentasContado_(item.FECHA_ARCHIVO_PRUEBA),
    idUsuarioArchivoPrueba: String(item.ID_USUARIO_ARCHIVO_PRUEBA || "").trim(),
    correoUsuarioArchivoPrueba: String(item.CORREO_USUARIO_ARCHIVO_PRUEBA || "").trim(),
    observacionArchivoPrueba: String(item.OBSERVACION_ARCHIVO_PRUEBA || "").trim(),
    tipoRegistroAnterior: normalizarTexto(item.TIPO_REGISTRO_ANTERIOR || ""),
    motivoReclasificacion: String(item.MOTIVO_RECLASIFICACION || "").trim(),
    fechaReclasificacion: normalizarFechaHoraVentasContado_(item.FECHA_RECLASIFICACION),
    idUsuarioReclasificacion: String(item.ID_USUARIO_RECLASIFICACION || "").trim(),
    correoUsuarioReclasificacion: String(item.CORREO_USUARIO_RECLASIFICACION || "").trim(),
    esClienteCalidda: String(item.ES_CLIENTE_CALIDDA || "").trim(),
    usaCuentaContrato: String(item.USA_CUENTA_CONTRATO || "").trim(),
    recibeDireccionCuenta: String(item.RECIBE_DIRECCION_CUENTA || "").trim(),
    cuentaContrato: String(item.CUENTA_CONTRATO || "").trim(),
    dni: String(item.DNI_CLIENTE || item.DNI || "").trim(),
    dniCliente: String(item.DNI_CLIENTE || item.DNI || "").trim(),
    nombreCliente: String(item.NOMBRE_CLIENTE || "").trim(),
    direccionEntrega: String(item.DIRECCION_ENTREGA || "").trim(),
    referencia: String(item.REFERENCIA || "").trim(),
    telefono: String(item.TELEFONO_CLIENTE || item.TELEFONO || "").trim(),
    telefonoCliente: String(item.TELEFONO_CLIENTE || item.TELEFONO || "").trim(),
    tipoReceptor: String(item.TIPO_RECEPTOR || "").trim(),
    nombreReceptor: String(item.NOMBRE_RECEPTOR || "").trim(),
    dniReceptor: String(item.DNI_RECEPTOR || "").trim(),
    telefonoReceptor: String(item.TELEFONO_RECEPTOR || "").trim(),
    relacionReceptor: String(item.RELACION_RECEPTOR || "").trim(),
    observaciones: String(item.OBSERVACIONES || "").trim(),
    idArchivoComprobante: String(item.ID_ARCHIVO_COMPROBANTE || "").trim(),
    urlComprobante: String(item.URL_COMPROBANTE || "").trim(),
    nombreComprobante: String(item.NOMBRE_COMPROBANTE || "").trim(),
    mimeComprobante: String(item.MIME_COMPROBANTE || "").trim(),
    estadoComprobantePagoCliente:
      normalizarEstadoAdjuntoVentaPaso29O_(
        item.ESTADO_COMPROBANTE_PAGO_CLIENTE ||
        obtenerEstadoAdjuntoVentaPaso29O_(
          item.ID_ARCHIVO_COMPROBANTE,
          item.URL_COMPROBANTE
        )
      ),

    idArchivoDepositoProveedor: String(item.ID_ARCHIVO_DEPOSITO_PROVEEDOR || "").trim(),
    urlDepositoProveedor: String(item.URL_DEPOSITO_PROVEEDOR || "").trim(),
    nombreDepositoProveedor: String(item.NOMBRE_DEPOSITO_PROVEEDOR || "").trim(),
    mimeDepositoProveedor: String(item.MIME_DEPOSITO_PROVEEDOR || "").trim(),
    estadoDepositoProveedor:
      normalizarEstadoAdjuntoVentaPaso29O_(
        item.ESTADO_DEPOSITO_PROVEEDOR ||
        obtenerEstadoAdjuntoVentaPaso29O_(
          item.ID_ARCHIVO_DEPOSITO_PROVEEDOR,
          item.URL_DEPOSITO_PROVEEDOR
        )
      ),

    idArchivoBoletaVentaCliente: String(item.ID_ARCHIVO_BOLETA_VENTA_CLIENTE || "").trim(),
    urlBoletaVentaCliente: String(item.URL_BOLETA_VENTA_CLIENTE || "").trim(),
    nombreBoletaVentaCliente: String(item.NOMBRE_BOLETA_VENTA_CLIENTE || "").trim(),
    mimeBoletaVentaCliente: String(item.MIME_BOLETA_VENTA_CLIENTE || "").trim(),
    estadoBoletaVentaCliente:
      normalizarEstadoAdjuntoVentaPaso29O_(
        item.ESTADO_BOLETA_VENTA_CLIENTE ||
        obtenerEstadoAdjuntoVentaPaso29O_(
          item.ID_ARCHIVO_BOLETA_VENTA_CLIENTE,
          item.URL_BOLETA_VENTA_CLIENTE
        )
      ),

    estadoAbono: normalizarTexto(item.ESTADO_ABONO || VENTAS_CONTADO_SGT360.ESTADOS_ABONO.PENDIENTE),
    idProveedorConfirmacionAbono: String(item.ID_PROVEEDOR_CONFIRMACION_ABONO || "").trim(),
    fechaConfirmacionAbono: normalizarFechaHoraVentasContado_(item.FECHA_CONFIRMACION_ABONO),
    idUsuarioConfirmacionAbono: String(item.ID_USUARIO_CONFIRMACION_ABONO || "").trim(),
    correoConfirmacionAbono: String(item.CORREO_CONFIRMACION_ABONO || "").trim(),
    observacionConfirmacionAbono: String(item.OBSERVACION_CONFIRMACION_ABONO || "").trim(),
    estado: normalizarTexto(item.ESTADO || VENTAS_CONTADO_SGT360.ESTADOS.REGISTRADA),
    totalItems: Number(item.TOTAL_ITEMS || 0),
    totalVenta: Number(item.TOTAL_VENTA || item.TOTAL_VENTA_VIGENTE || 0),
    totalVentaOriginal: Number(item.TOTAL_VENTA_ORIGINAL || item.TOTAL_VENTA || 0),
    totalVentaVigente: Number(item.TOTAL_VENTA_VIGENTE || item.TOTAL_VENTA || 0),
    totalAnulado: Number(item.TOTAL_ANULADO || 0),
    importeAbonoAprobado: Number(item.IMPORTE_ABONO_APROBADO || 0),
    moneda: String(item.MONEDA || VENTAS_CONTADO_SGT360.MONEDA).trim()
  };
}

function mapearDetalleVentaContado_(item) {
  return {
    idDetalleVenta: String(item.ID_DETALLE_VENTA || "").trim(),
    idVenta: String(item.ID_VENTA || "").trim(),
    linea: Number(item.LINEA || 0),
    idTipoMaterial: String(item.ID_TIPO_MATERIAL || "").trim(),
    tipoMaterial: String(item.TIPO_MATERIAL || "").trim(),
    idMaterial: String(item.ID_MATERIAL || "").trim(),
    codigoMaterial: String(item.CODIGO_MATERIAL || "").trim(),
    codigoSap: String(item.CODIGO_SAP || "").trim(),
    descripcionMaterial: String(item.DESCRIPCION_MATERIAL || "").trim(),
    idProveedorPrecio: String(item.ID_PROVEEDOR_PRECIO || "").trim(),
    codigoSapProveedor: String(item.CODIGO_SAP_PROVEEDOR || "").trim(),
    nombreComercialProveedor: String(item.NOMBRE_COMERCIAL_PROVEEDOR || "").trim(),
    idListaPrecio: String(item.ID_LISTA_PRECIO || "").trim(),
    idDetallePrecio: String(item.ID_DETALLE_PRECIO || "").trim(),
    alcancePrecio: String(item.ALCANCE_PRECIO || "").trim(),
    idOficinaPrecio: String(item.ID_OFICINA_PRECIO || "").trim(),
    idGrupoPrecio: String(item.ID_GRUPO_PRECIO || "").trim(),
    precioUnitario: Number(item.PRECIO_UNITARIO || 0),
    moneda: String(item.MONEDA || VENTAS_CONTADO_SGT360.MONEDA).trim(),
    cantidad: Number(item.CANTIDAD || 0),
    totalLinea: Number(item.TOTAL_LINEA || 0),
    observacionLinea: String(item.OBSERVACION_LINEA || "").trim(),
    estadoItem: normalizarTexto(item.ESTADO_ITEM || CONFIG.ESTADOS.ACTIVO),
    motivoAnulacionItem: String(item.MOTIVO_ANULACION_ITEM || "").trim(),
    observacionAnulacionItem: String(item.OBSERVACION_ANULACION_ITEM || "").trim(),
    fechaAnulacionItem: normalizarFechaHoraVentasContado_(item.FECHA_ANULACION_ITEM),
    idUsuarioAnulacionItem: String(item.ID_USUARIO_ANULACION_ITEM || "").trim(),
    correoUsuarioAnulacionItem: String(item.CORREO_USUARIO_ANULACION_ITEM || "").trim(),
    estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO)
  };
}

function filtrarVentasContadoPorAlcance_(
  registros,
  usuario,
  recurso
) {
  const lista = Array.isArray(registros)
    ? registros
    : [];

  if (!usuario) return [];

  if (
    normalizarTexto(usuario.rol) ===
    CONFIG.ROLES.SUPERADMIN
  ) {
    return lista;
  }

  const codigoRecurso =
    String(recurso || "VER_LISTADO").trim();

  const alcancePermiso =
    normalizarTexto(
      obtenerAlcancePermisoVentasContado_(
        codigoRecurso,
        usuario
      )
    );

  // Paso 29M:
  // El alcance configurado en EL PERMISO gobierna la visibilidad.
  // Tener ID_PROVEEDOR en la ficha del usuario ya no sobreescribe un
  // permiso GLOBAL de otra bandeja.
  if (alcancePermiso === "GLOBAL") {
    return lista;
  }

  if (alcancePermiso === "PROVEEDOR") {
    const idProveedor = String(
      usuario.idProveedor || ""
    ).trim();

    if (!idProveedor) return [];

    const usaIndice =
      lista.some(function(item) {
        return Array.isArray(
          item &&
          item._proveedoresVenta29Y
        );
      });

    if (usaIndice) {
      return lista.filter(function(item) {
        return (
          Array.isArray(
            item._proveedoresVenta29Y
          ) &&
          item._proveedoresVenta29Y
            .indexOf(idProveedor) !== -1
        );
      });
    }

    const idsVentasProveedor =
      obtenerIdsVentasProveedorVentasContado_(
        idProveedor
      );

    return lista.filter(function(item) {
      return (
        idsVentasProveedor[
          item.idVenta
        ] === true
      );
    });
  }

  if (alcancePermiso === "GRUPO") {
    const idGrupo =
      String(usuario.idGrupo || "").trim();

    if (!idGrupo) {
      return [];
    }

    return lista.filter(function(item) {
      return (
        String(item.idGrupo || "").trim() ===
        idGrupo
      );
    });
  }

  if (alcancePermiso === "ASIGNADOS") {
    const ids = {};

    obtenerIdsOficinasPermitidasVentasPaso29W_(
      usuario
    ).forEach(function(id) {
      ids[id] = true;
    });

    return lista.filter(function(item) {
      return item.idOficina && ids[item.idOficina];
    });
  }

  // PROPIO y cualquier alcance no reconocido se restringen al creador.
  return lista.filter(function(item) {
    return item.idUsuario === usuario.idUsuario;
  });
}

function obtenerIdsVentasProveedorVentasContado_(idProveedor) {
  const id = String(idProveedor || "").trim();
  const salida = {};
  if (!id) return salida;

  // Paso 29L:
  // No se reconstruye el proveedor contra todo el histórico de precios.
  // La relación proveedor-material elegida en el carrito queda persistida en:
  // VTA_VENTAS_CONTADO_DETALLE.ID_PROVEEDOR_PRECIO.
  //
  // Esto evita una lectura completa de PRE_LISTAS_PRECIOS y
  // PRE_LISTA_PRECIO_DETALLE en cada apertura de Ventas.
  leerDetallesVentasSnapshotPaso29P_()
    .filter(function(item) {
      return (
        normalizarTexto(
          item.ESTADO || CONFIG.ESTADOS.ACTIVO
        ) === CONFIG.ESTADOS.ACTIVO &&
        normalizarTexto(
          item.ESTADO_ITEM || CONFIG.ESTADOS.ACTIVO
        ) !== "ANULADO"
      );
    })
    .forEach(function(row) {
      if (
        String(row.ID_PROVEEDOR_PRECIO || "").trim() === id
      ) {
        const idVenta = String(row.ID_VENTA || "").trim();
        if (idVenta) salida[idVenta] = true;
      }
    });

  return salida;
}

function filtrarDetallesVentaContadoParaUsuario_(
  detalles,
  usuario,
  recurso
) {
  const lista = Array.isArray(detalles)
    ? detalles
    : [];

  if (
    !usuario ||
    normalizarTexto(usuario.rol) ===
      CONFIG.ROLES.SUPERADMIN
  ) {
    return lista;
  }

  const codigoRecurso =
    String(recurso || "VER_DETALLE").trim();

  const alcance =
    normalizarTexto(
      obtenerAlcancePermisoVentasContado_(
        codigoRecurso,
        usuario
      )
    );

  if (alcance !== "PROVEEDOR") {
    return lista;
  }

  const idProveedor = String(
    usuario.idProveedor || ""
  ).trim();

  if (!idProveedor) return [];

  return lista.filter(function(detalle) {
    return (
      esDetalleVentaActivoPaso29K_(detalle) &&
      String(
        detalle.idProveedorPrecio || ""
      ).trim() === idProveedor
    );
  });
}

function puedeConfirmarAbonoVentaContado_(venta, detalles, usuario) {
  if (!venta || !usuario) return false;
  if (esVentaPruebaArchivadaPaso29T_(venta)) return false;
  if (esVentaPruebaPaso29T_(venta) && !puedeGestionarPruebasVentasPaso29T_(usuario)) return false;
  if (!tienePermisoVentasContado_("CONFIRMAR_ABONO", usuario)) return false;
  if (venta.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA) return false;
  if (venta.estadoAbono === VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO) return false;
  const alcancePermiso = obtenerAlcancePermisoVentasContado_(
        "CONFIRMAR_ABONO",
        usuario
      );
  if (normalizarTexto(usuario.rol) === CONFIG.ROLES.SUPERADMIN || alcancePermiso === "GLOBAL") return true;
  return filtrarVentasContadoPorAlcance_([venta], usuario, "CONFIRMAR_ABONO").length > 0;
}

function puedeObservarAbonoVentaContado_(venta, detalles, usuario) {
  if (!venta || !usuario) return false;
  if (venta.estado === VENTAS_CONTADO_SGT360.ESTADOS.ANULADA) return false;
  if (venta.estadoAbono === VENTAS_CONTADO_SGT360.ESTADOS_ABONO.CONFIRMADO) return false;
  return puedeConfirmarAbonoVentaContado_(venta, detalles, usuario);
}


function aplicarFiltrosVentasContado_(registros, filtros) {
  filtros = filtros || {};
  let lista = Array.isArray(registros) ? registros : [];
  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  const estadoAbono = normalizarTexto(filtros.estadoAbono || "TODOS");
  const idOficina = String(filtros.idOficina || "").trim();
  const idGrupo = String(filtros.idGrupo || "").trim();
  const desde = convertirFechaMotor_(filtros.fechaDesde);
  const hasta = convertirFechaMotor_(filtros.fechaHasta);
  if (desde) {
    const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
    lista = lista.filter(function(item) { return item.fechaOrden >= d; });
  }
  if (hasta) {
    const h = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23, 59, 59, 999).getTime();
    lista = lista.filter(function(item) { return item.fechaOrden <= h; });
  }
  if (estado && estado !== "TODOS") lista = lista.filter(function(item) { return item.estado === estado; });
  if (estadoAbono && estadoAbono !== "TODOS") lista = lista.filter(function(item) { return item.estadoAbono === estadoAbono; });
  if (idOficina) lista = lista.filter(function(item) { return item.idOficina === idOficina; });
  if (idGrupo) lista = lista.filter(function(item) { return item.idGrupo === idGrupo; });
  if (texto) {
    lista = lista.filter(function(item) {
      return [item.codigoVenta, item.nombreCliente, item.dni, item.cuentaContrato, item.telefono, item.nombreUsuario, item.nombreOficina, item.nombreGrupo, item.tipoVenta, item.estadoAbono].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  return lista;
}

function enriquecerDetalleVentaConPrecio_(detalle) {
  detalle = detalle || {};
  detalle.detalleCombo = detalle.detalleCombo || "";
  if (detalle.idDetallePrecio) {
    try {
      const precio = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", detalle.idDetallePrecio);
      if (precio) {
        detalle.tieneCombo = convertirBooleanoMotor_(precio.TIENE_COMBO || precio.ES_COMBO) ? "SI" : "NO";
        detalle.detalleCombo = String(precio.DETALLE_COMBO || precio.COMPONENTES_INCLUIDOS || detalle.observacionLinea || "").trim();
      }
    } catch (error) {}
  }
  if (!detalle.detalleCombo && detalle.observacionLinea) detalle.detalleCombo = String(detalle.observacionLinea || "").trim();
  return detalle;
}

function normalizarFechaHoraVentasContado_(valor) {
  const fecha = convertirFechaMotor_(valor);
  if (!fecha) return "";
  return Utilities.formatDate(fecha, MOTOR_SGT360.ZONA_HORARIA, "yyyy-MM-dd HH:mm:ss");
}

function construirHtmlExcelVentasContado_(cabeceras, filas, titulo) {
  const escape = function(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  };
  const thead = "<tr>" + cabeceras.map(function(c) { return "<th>" + escape(c) + "</th>"; }).join("") + "</tr>";
  const tbody = filas.map(function(fila) {
    return "<tr>" + fila.map(function(celda) { return "<td>" + escape(celda) + "</td>"; }).join("") + "</tr>";
  }).join("");
  return "\uFEFF<html><head><meta charset=\"UTF-8\"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:4px}th{font-weight:bold;background:#f2f2f2}</style></head><body><h2>" + escape(titulo || "Ventas al contado") + "</h2><table>" + thead + tbody + "</table></body></html>";
}
