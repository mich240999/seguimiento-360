/**
 * SGT360 — Entrada de la aplicación — Paso 30D
 *
 * Responsabilidad:
 * Atiende la URL web, procesa callbacks OAuth, construye el HtmlOutput y entrega el
 * contexto inicial al navegador.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Punto de entrada de la nueva aplicación. */
function doGet(evento) {
  const parametros = evento && evento.parameter ? evento.parameter : {};
  const esCallback = Boolean(String(parametros.code || "").trim() || String(parametros.error || "")
    .trim());
  if (esCallback) {
    const state = String(parametros.state || "").trim();
    const esMicrosoft = typeof AUTH_MICROSOFT_PASO_15A !== "undefined" && state.indexOf(
      AUTH_MICROSOFT_PASO_15A.PREFIJO_STATE) === 0;
    const resultado = esMicrosoft ? procesarCallbackOAuthMicrosoftPaso15A_(parametros) :
      procesarCallbackOAuthPaso13C_(parametros);
    const plantillaCallback = HtmlService.createTemplateFromFile("HTML_110_AUTH_Callback");
    plantillaCallback.authResultJson = serializarResultadoCallbackAuthPaso13C_(resultado);
    return aplicarConfiguracionSalidaMotor_(plantillaCallback.evaluate().setTitle(CONFIG.APP
      .NOMBRE + " | Acceso"));
  }
  const plantilla = HtmlService.createTemplateFromFile("HTML_000_APP_Index");
  plantilla.loaderConfigJson = serializarSeguroHtml_(
    obtenerConfiguracionCargaInicialMotor_()
  );
  return aplicarConfiguracionSalidaMotor_(plantilla.evaluate().setTitle(CONFIG.APP.NOMBRE));
}

/**
 * Aplica metadatos, viewport y favicon al HtmlOutput. Función interna del motor.
 */
function aplicarConfiguracionSalidaMotor_(salida) {
  salida.addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
  const favicon = obtenerFaviconUrlMotor_();
  if (favicon) try {
    salida.setFaviconUrl(favicon);
  } catch (error) {
    console.warn(error.message);
  }
  return salida;
}

/**
 * Incluye el contenido de un archivo HTML dentro de otra plantilla.
 */
function include(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

/**
 * Construye el contexto inicial con aplicación, usuario, seguridad, módulos e interfaz.
 */
function obtenerContextoAplicacion() {
  const usuario = obtenerUsuarioActual();
  const seguridad = construirContextoSeguridadMotor_(usuario);
  const modulos = listarModulosDisponiblesMotor_(usuario, seguridad);
  const rolUsuario = obtenerRolPorCodigoMotor_(usuario.rol, false);
  // La vista previa de roles es una herramienta exclusiva del SUPERADMIN.
  // Tener permisos administrativos delegados no habilita este control.
  const puedeVisualizarRoles = seguridad.esSuperadmin === true;
  const rolActual = normalizarTexto(usuario.rol);
  const rolesVistaPrevia = puedeVisualizarRoles ? obtenerRolesActivos().filter(function(rol) {
    return normalizarTexto(rol.codigo) !== rolActual;
  }).map(function(rol) {
    return {
      codigo: rol.codigo,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      nivel: rol.nivel
    };
  }) : [];

  return {
    aplicacion: {
      codigo: MOTOR_SGT360.CODIGO,
      nombre: CONFIG.APP.NOMBRE,
      version: CONFIG.APP.VERSION,
      versionMotor: MOTOR_SGT360.VERSION_MOTOR,
      entorno: obtenerPropiedadMotor_(PROPIEDADES_MOTOR_SGT360.ENVIRONMENT, "DESARROLLO")
    },
    usuario: {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      nombre: usuario.nombre,
      telefono: usuario.telefono || "",
      rol: usuario.rol,
      nombreRol: rolUsuario ? rolUsuario.nombre : usuario.rol,
      idProveedor: usuario.idProveedor || "",
      idOficina: usuario.idOficina || "",
      idGrupo: usuario.idGrupo || "",
      idsOficinasPermitidas: obtenerIdsOficinasPermitidasUsuarioMotor(usuario)
    },
    seguridad: seguridad,
    modulos: modulos,
    visualizacionRoles: {
      habilitada: puedeVisualizarRoles,
      roles: rolesVistaPrevia
    },
    sincronizacion: {
      revision: obtenerRevisionDatosMotor_(),
      fechaServidor: new Date().toISOString()
    },
    interfaz: {
      actualizacionAutomatica: convertirBooleanoMotor_(
        obtenerParametroMotor_("APP_REFRESH_ENABLED", "TRUE")
      ),
      actualizacionSegundos: Math.max(
        60,
        Number(obtenerParametroMotor_("APP_REFRESH_SECONDS", "60")) || 60
      ),
      pageSize: Number(obtenerParametroMotor_("APP_PAGE_SIZE", "50")) || 50,
      colorPrincipal: obtenerParametroMotor_("THEME_PRIMARY", "#00A1DE"),
      // Paso 30D:
      // Nunca se entrega una URL privada/directa de Drive al navegador.
      logoHeader:
        obtenerFuenteRecursoVisualMotor_(
          CONFIG.RECURSOS.CLAVES.LOGO_HEADER
        ),
      diccionarioRecursosVisuales: obtenerDiccionarioRecursosVisualesMotor_()
    }
  };
}

/**
 * Entrega un estado ligero para que el navegador detecte cambios sin recargar
 * todas las tablas cada 60 segundos. La sesión se valida previamente en el RPC.
 *
 * @return {Object} Revisión actual e intervalo de actualización.
 */
function obtenerEstadoSincronizacionMotor() {
  return {
    revision: obtenerRevisionDatosMotor_(),
    actualizacionAutomatica: convertirBooleanoMotor_(
      obtenerParametroMotor_("APP_REFRESH_ENABLED", "TRUE")
    ),
    actualizacionSegundos: Math.max(
      60,
      Number(obtenerParametroMotor_("APP_REFRESH_SECONDS", "60")) || 60
    ),
    fechaServidor: new Date().toISOString()
  };
}

