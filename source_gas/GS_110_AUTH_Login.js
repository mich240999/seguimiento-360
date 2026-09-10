/**
 * SGT360 — Configuración de la pantalla de acceso
 *
 * Responsabilidad:
 * Entrega al frontend la identidad visual y disponibilidad de Google y Microsoft.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * PASO 13C: datos públicos para la pantalla OAuth en vista previa.
 *
 * El botón inicia el flujo OAuth del Paso 13C.
 * La aplicación normal aún no exige sesión; eso se incorpora en el Paso 13D.
 */

/**
 * Devuelve la configuración visual de la pantalla de acceso.
 *
 * No expone el Client Secret.
 *
 * @return {Object}
 */
function obtenerConfiguracionPantallaLoginPaso13B() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const googleClientId =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .CLIENT_ID
      ) || ""
    ).trim();

  const googleRedirectUri =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .REDIRECT_URI
      ) || ""
    ).trim();

  const microsoftClientId =
    String(
      propiedades.getProperty(
        AUTH_MICROSOFT_PASO_15A
        .PROPIEDADES
        .CLIENT_ID
      ) || ""
    ).trim();

  const microsoftRedirectUri =
    String(
      propiedades.getProperty(
        AUTH_MICROSOFT_PASO_15A
        .PROPIEDADES
        .REDIRECT_URI
      ) || ""
    ).trim();

  const googleHabilitado =
    Boolean(
      googleClientId &&
      /\/exec$/i.test(
        googleRedirectUri
      )
    );

  const microsoftHabilitado =
    Boolean(
      microsoftClientId &&
      /\/exec$/i.test(
        microsoftRedirectUri
      ) &&
      estaConfiguradoMicrosoftPaso15A_()
    );

  const logo =
    obtenerImagenLoginPaso13B_();

  return {
    correcto: true,

    paso: "15A",

    modo: "OAUTH_MULTIPROVEEDOR",

    aplicacion: {
      nombre: CONFIG.APP.NOMBRE,

      version: CONFIG.APP.VERSION,

      subtitulo: "Seguimiento operativo y administración"
    },

    recursos: {
      logoLogin: logo.dataUrl,

      claveUtilizada: logo.clave,

      usaRespaldo: logo.usaRespaldo
    },

    proveedores: {
      google: {
        habilitado: googleHabilitado
      },

      microsoft: {
        habilitado: microsoftHabilitado
      }
    },

    oauth: {
      preparado: googleHabilitado ||
        microsoftHabilitado,

      inicioOAuthHabilitado: googleHabilitado ||
        microsoftHabilitado,

      googleHabilitado: googleHabilitado,

      microsoftHabilitado: microsoftHabilitado
    },

    mensaje: googleHabilitado ||
      microsoftHabilitado ?
      "La pantalla de acceso multiproveedor está preparada." :
      "No hay proveedores OAuth completamente configurados."
  };
}

/**
 * Diagnóstico visible del Paso 13B.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoPantallaLoginPaso13B() {
  const resultado =
    obtenerConfiguracionPantallaLoginPaso13B();

  const resumen = {
    correcto: resultado.correcto,

    paso: resultado.paso,

    modo: resultado.modo,

    aplicacion: resultado.aplicacion,

    recursos: {
      logoLoginConfigurado: Boolean(
        resultado.recursos &&
        resultado.recursos.logoLogin
      ),

      claveUtilizada: resultado.recursos ?
        resultado.recursos.claveUtilizada :
        "",

      usaRespaldo: resultado.recursos ?
        resultado.recursos.usaRespaldo :
        false
    },

    proveedores: resultado.proveedores,

    oauth: resultado.oauth,

    mensaje: resultado.mensaje
  };

  console.log(
    JSON.stringify(
      resumen,
      null,
      2
    )
  );

  return resumen;
}

/**
 * Busca LOGO_LOGIN y utiliza LOGO_HEADER como respaldo.
 *
 * @return {Object}
 * @private
 */
function obtenerImagenLoginPaso13B_() {
  const claves = [{
    clave: CONFIG.RECURSOS.CLAVES.LOGO_LOGIN,
    respaldo: false
  }, {
    clave: CONFIG.RECURSOS.CLAVES.LOGO_HEADER,
    respaldo: true
  }];

  for (
    let indice = 0; indice < claves.length; indice++
  ) {
    try {
      const dataUrl =
        obtenerRecursoComoDataUrl(
          claves[indice].clave
        );

      if (dataUrl) {
        return {
          dataUrl: dataUrl,
          clave: claves[indice].clave,
          usaRespaldo: claves[indice].respaldo
        };
      }
    } catch (error) {
      console.warn(
        "No se pudo cargar %s para la pantalla de acceso: %s",
        claves[indice].clave,
        error.message
      );
    }
  }

  return {
    dataUrl: "",
    clave: "",
    usaRespaldo: false
  };
}

/**
 * Alias de diagnóstico del Paso 13C.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoPantallaLoginPaso13C() {
  return ejecutarDiagnosticoPantallaLoginPaso13B();
}
