/**
 * CÁLIDDA 360 — GS_140_AUTH_SecureRpc
 * Versión actualizada PASO 29M — permisos independientes por bandeja.
 * Archivo completo: reemplazar íntegramente el contenido del archivo homónimo.
 */

/**
 * SGT360 — Canal RPC protegido
 *
 * Responsabilidad:
 * Centraliza las operaciones permitidas desde el navegador y valida la sesión antes
 * de despacharlas.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Canal RPC seguro del motor. */
const RPC_MOTOR_SGT360 = Object.freeze({
  obtenerContextoAplicacion: Object.freeze({ handler: "obtenerContextoAplicacion" }),
  obtenerEstadoSincronizacionMotor: Object.freeze({ handler: "obtenerEstadoSincronizacionMotor" }),

  obtenerResumenAdministracionMotor: Object.freeze({
    handler: "obtenerResumenAdministracionMotor",
    modulo: "ADMIN_GENERAL",
    recurso: "VER_RESUMEN"
  }),

  listarUsuariosAdminMotor: Object.freeze({
    handler: "listarUsuariosAdminMotor",
    modulo: "ADMIN_USUARIOS",
    recurso: "VER_LISTADO"
  }),
  listarRolesAsignablesUsuariosMotor: Object.freeze({
    handler: "listarRolesAsignablesUsuariosMotor",
    modulo: "ADMIN_USUARIOS",
    recurso: "VER_DETALLE"
  }),
  guardarUsuarioAdminMotor: Object.freeze({
    handler: "guardarUsuarioAdminMotor",
    modulo: "ADMIN_USUARIOS",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idUsuario", crear: "CREAR", editar: "EDITAR" })
  }),
  obtenerEstructuraAsignacionesUsuariosMotor: Object.freeze({
    handler: "obtenerEstructuraAsignacionesUsuariosMotor",
    modulo: "ADMIN_USUARIOS",
    recurso: "VER_DETALLE"
  }),

  obtenerEstructuraAsignacionesAdminMotor: Object.freeze({
    handler: "obtenerEstructuraAsignacionesAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recurso: "VER_LISTADO"
  }),
  guardarProveedorAdminMotor: Object.freeze({
    handler: "guardarProveedorAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idProveedor", crear: "CREAR", editar: "EDITAR" })
  }),
  guardarOficinaAdminMotor: Object.freeze({
    handler: "guardarOficinaAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idOficina", crear: "CREAR", editar: "EDITAR" })
  }),
  guardarGrupoAdminMotor: Object.freeze({
    handler: "guardarGrupoAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idGrupo", crear: "CREAR", editar: "EDITAR" })
  }),
  importarMaestroAsignacionAdminMotor: Object.freeze({
    handler: "importarMaestroAsignacionAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recurso: "IMPORTAR"
  }),
  previsualizarImportacionAsignacionAdminMotor: Object.freeze({
    handler: "previsualizarImportacionAsignacionAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recurso: "IMPORTAR"
  }),
  aprobarImportacionAsignacionAdminMotor: Object.freeze({
    handler: "aprobarImportacionAsignacionAdminMotor",
    modulo: "ADMIN_ESTRUCTURA",
    recurso: "IMPORTAR"
  }),

  listarRolesAdminMotor: Object.freeze({
    handler: "listarRolesAdminMotor",
    modulo: "ADMIN_PERMISOS",
    recurso: "VER_ROLES"
  }),
  guardarRolAdminMotor: Object.freeze({
    handler: "guardarRolAdminMotor",
    modulo: "ADMIN_PERMISOS",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idRol", crear: "EDITAR_ROLES", editar: "EDITAR_ROLES" })
  }),
  obtenerMatrizPermisosAdminMotor: Object.freeze({
    handler: "obtenerMatrizPermisosAdminMotor",
    modulo: "ADMIN_PERMISOS",
    recurso: "VER_PERMISOS"
  }),
  obtenerVistaPreviaRolAdminMotor: Object.freeze({
    handler: "obtenerVistaPreviaRolAdminMotor",
    modulo: "ADMIN_PERMISOS",
    recurso: "VER_PERMISOS"
  }),
  guardarMatrizPermisosAdminMotor: Object.freeze({
    handler: "guardarMatrizPermisosAdminMotor",
    modulo: "ADMIN_PERMISOS",
    recurso: "EDITAR_PERMISOS"
  }),

  listarModulosAdminMotor: Object.freeze({
    handler: "listarModulosAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_MODULOS"
  }),
  guardarModuloAdminMotor: Object.freeze({
    handler: "guardarModuloAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_MODULOS"
  }),
  listarCamposModuloAdminMotor: Object.freeze({
    handler: "listarCamposModuloAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_MODULOS"
  }),
  guardarCampoModuloAdminMotor: Object.freeze({
    handler: "guardarCampoModuloAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_MODULOS"
  }),
  listarCatalogosAdminMotor: Object.freeze({
    handler: "listarCatalogosAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_CATALOGOS"
  }),
  guardarCatalogoAdminMotor: Object.freeze({
    handler: "guardarCatalogoAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_CATALOGOS"
  }),
  listarValoresCatalogoAdminMotor: Object.freeze({
    handler: "listarValoresCatalogoAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_CATALOGOS"
  }),
  guardarValorCatalogoAdminMotor: Object.freeze({
    handler: "guardarValorCatalogoAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_CATALOGOS"
  }),
  listarParametrosAdminMotor: Object.freeze({
    handler: "listarParametrosAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_PARAMETROS"
  }),
  guardarParametroAdminMotor: Object.freeze({
    handler: "guardarParametroAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_PARAMETROS"
  }),
  listarRecursosVisualesAdminMotor: Object.freeze({
    handler: "listarRecursosVisualesAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "VER_RECURSOS"
  }),
  guardarRecursoVisualAdminMotor: Object.freeze({
    handler: "guardarRecursoVisualAdminMotor",
    modulo: "ADMIN_CONFIG_APP",
    recurso: "EDITAR_RECURSOS"
  }),

  listarAuditoriaAdminMotor: Object.freeze({
    handler: "listarAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "VER_LISTADO"
  }),
  listarSesionesAuditoriaAdminMotor: Object.freeze({
    handler: "listarSesionesAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "VER_SESIONES"
  }),
  obtenerDetalleSesionAuditoriaAdminMotor: Object.freeze({
    handler: "obtenerDetalleSesionAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "VER_SESIONES"
  }),
  cerrarSesionAuditoriaAdminMotor: Object.freeze({
    handler: "cerrarSesionAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "CERRAR_SESIONES"
  }),
  cerrarSesionesUsuarioAuditoriaAdminMotor: Object.freeze({
    handler: "cerrarSesionesUsuarioAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "CERRAR_SESIONES"
  }),
  limpiarSesionesExpiradasAuditoriaAdminMotor: Object.freeze({
    handler: "limpiarSesionesExpiradasAuditoriaAdminMotor",
    modulo: "ADMIN_AUDITORIA",
    recurso: "LIMPIAR_SESIONES_EXPIRADAS"
  }),

  listarProveedoresModulo: Object.freeze({
    handler: "listarProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "VER_LISTADO"
  }),
  obtenerDetalleProveedorModulo: Object.freeze({
    handler: "obtenerDetalleProveedorModulo",
    modulo: "PROVEEDORES",
    recursoCualquiera: Object.freeze(["VER_DETALLE", "EDITAR"])
  }),
  obtenerOpcionesProveedorModulo: Object.freeze({
    handler: "obtenerOpcionesProveedorModulo",
    modulo: "PROVEEDORES",
    recursoCualquiera: Object.freeze(["VER_DETALLE", "CREAR", "EDITAR"])
  }),
  guardarProveedorModulo: Object.freeze({
    handler: "guardarProveedorModulo",
    modulo: "PROVEEDORES",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idProveedor", crear: "CREAR", editar: "EDITAR" })
  }),
  cambiarEstadoProveedorModulo: Object.freeze({
    handler: "cambiarEstadoProveedorModulo",
    modulo: "PROVEEDORES",
    recurso: "CAMBIAR_ESTADO"
  }),
  importarProveedoresModulo: Object.freeze({
    handler: "importarProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "IMPORTAR"
  }),
  previsualizarImportacionProveedoresModulo: Object.freeze({
    handler: "previsualizarImportacionProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "IMPORTAR"
  }),
  aprobarImportacionProveedoresModulo: Object.freeze({
    handler: "aprobarImportacionProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "IMPORTAR"
  }),
  exportarProveedoresModulo: Object.freeze({
    handler: "exportarProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "EXPORTAR"
  }),
  obtenerPlantillaProveedoresModulo: Object.freeze({
    handler: "obtenerPlantillaProveedoresModulo",
    modulo: "PROVEEDORES",
    recurso: "IMPORTAR"
  }),

  obtenerResumenMaterialesPreciosModulo: Object.freeze({
    handler: "obtenerResumenMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_RESUMEN"
  }),
  obtenerOpcionesMaterialesPreciosModulo: Object.freeze({
    handler: "obtenerOpcionesMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VISUALIZAR_MODULO"
  }),
  limpiarCacheMaterialesPreciosModulo: Object.freeze({
    handler: "limpiarCacheMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VISUALIZAR_MODULO"
  }),
  listarMaterialesPrecioModulo: Object.freeze({
    handler: "listarMaterialesPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_MATERIALES"
  }),
  listarMaterialesSelectPreciosModulo: Object.freeze({
    handler: "listarMaterialesSelectPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_MATERIALES"
  }),
  exportarMaterialesModulo: Object.freeze({
    handler: "exportarMaterialesModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_MATERIALES"
  }),
  guardarMaterialPrecioModulo: Object.freeze({
    handler: "guardarMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idMaterial", crear: "CREAR_MATERIAL", editar: "EDITAR_MATERIAL" })
  }),
  cambiarEstadoMaterialPrecioModulo: Object.freeze({
    handler: "cambiarEstadoMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CAMBIAR_ESTADO_MATERIAL"
  }),
  listarProveedoresMaterialPrecioModulo: Object.freeze({
    handler: "listarProveedoresMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_MATERIALES"
  }),
  asociarProveedorMaterialPrecioModulo: Object.freeze({
    handler: "asociarProveedorMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "EDITAR_MATERIAL"
  }),
  desasociarProveedorMaterialPrecioModulo: Object.freeze({
    handler: "desasociarProveedorMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "EDITAR_MATERIAL"
  }),
  reactivarProveedorMaterialPrecioModulo: Object.freeze({
    handler: "reactivarProveedorMaterialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "EDITAR_MATERIAL"
  }),
  guardarCatalogoMaterialesPreciosModulo: Object.freeze({
    handler: "guardarCatalogoMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "EDITAR_CATALOGOS"
  }),
  listarListasOficialesPreciosModulo: Object.freeze({
    handler: "listarListasOficialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "VER_LISTAS_OFICIALES"
  }),
  guardarListaOficialPrecioModulo: Object.freeze({
    handler: "guardarListaOficialPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoSegunArgumento: Object.freeze({ indice: 0, campoId: "idListaPrecio", crear: "CREAR_LISTA_OFICIAL", editar: "EDITAR_LISTA_OFICIAL" })
  }),
  guardarDetalleListaPrecioModulo: Object.freeze({
    handler: "guardarDetalleListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "EDITAR_LISTA_OFICIAL"
  }),
  guardarPrecioIndividualMaterialesPreciosModulo: Object.freeze({
    handler: "guardarPrecioIndividualMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_PRECIO_INDIVIDUAL"
  }),
  obtenerPlantillaPreciosIndividualesModulo: Object.freeze({
    handler: "obtenerPlantillaPreciosIndividualesModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoCualquiera: Object.freeze(["CREAR_PRECIO_INDIVIDUAL", "DESCARGAR_PLANTILLA_PRECIO"])
  }),
  cargarPreciosIndividualesMasivoModulo: Object.freeze({
    handler: "cargarPreciosIndividualesMasivoModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_PRECIO_INDIVIDUAL"
  }),
  resolverPrecioMaterialesPreciosModulo: Object.freeze({
    handler: "resolverPrecioMaterialesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoCualquiera: Object.freeze(["VER_PRECIOS", "VER_LISTAS_OFICIALES"])
  }),
  obtenerPlantillaListaPreciosModulo: Object.freeze({
    handler: "obtenerPlantillaListaPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "DESCARGAR_PLANTILLA_PRECIO"
  }),
  obtenerPlantillaMaterialesModulo: Object.freeze({
    handler: "obtenerPlantillaMaterialesModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_MATERIAL"
  }),
  cargarMaterialesMasivoModulo: Object.freeze({
    handler: "cargarMaterialesMasivoModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_MATERIAL"
  }),
  prevalidarMaterialesMasivoModulo: Object.freeze({
    handler: "prevalidarMaterialesMasivoModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_MATERIAL"
  }),

  confirmarCargaMaterialesMasivoModulo: Object.freeze({
    handler: "confirmarCargaMaterialesMasivoModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "CREAR_MATERIAL"
  }),
  crearSolicitudListaPrecioModulo: Object.freeze({
    handler: "crearSolicitudListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoCualquiera: Object.freeze(["CARGAR_LISTA_PRECIO", "CARGAR_LISTA_PRECIO_ADMIN"])
  }),
  listarSolicitudesListaPrecioModulo: Object.freeze({
    handler: "listarSolicitudesListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoCualquiera: Object.freeze(["VER_MIS_LISTAS_PRECIO", "VER_OBSERVACIONES_LISTA", "VER_SOLICITUDES_PRECIO"])
  }),
  obtenerDetalleSolicitudListaPrecioModulo: Object.freeze({
    handler: "obtenerDetalleSolicitudListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoCualquiera: Object.freeze(["VER_DETALLE_SOLICITUD_PRECIO", "VER_OBSERVACIONES_LISTA"])
  }),
  tomarRevisionSolicitudListaPrecioModulo: Object.freeze({
    handler: "tomarRevisionSolicitudListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "TOMAR_REVISION_PRECIO"
  }),
  resolverRevisionSolicitudListaPrecioModulo: Object.freeze({
    handler: "resolverRevisionSolicitudListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recursoSegunValorArgumento: Object.freeze({
      indice: 1,
      mapa: Object.freeze({ APROBAR: "APROBAR_LISTA_PRECIO", OBSERVAR: "OBSERVAR_LISTA_PRECIO", RECHAZAR: "RECHAZAR_LISTA_PRECIO" }),
      predeterminado: "VER_DETALLE_SOLICITUD_PRECIO"
    })
  }),
  publicarSolicitudListaPrecioModulo: Object.freeze({
    handler: "publicarSolicitudListaPrecioModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "PUBLICAR_LISTA_PRECIO"
  }),
  exportarConsolidadoPendientesPreciosModulo: Object.freeze({
    handler: "exportarConsolidadoPendientesPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "DESCARGAR_CONSOLIDADO_PENDIENTES"
  }),
  exportarDetalleSolicitudPreciosModulo: Object.freeze({
    handler: "exportarDetalleSolicitudPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "DESCARGAR_SOLICITUD_PRECIO"
  }),
  exportarListaOficialPreciosModulo: Object.freeze({
    handler: "exportarListaOficialPreciosModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "DESCARGAR_LISTA_OFICIAL"
  }),
  exportarPreciosOficialesModulo: Object.freeze({
    handler: "exportarPreciosOficialesModulo",
    modulo: "MATERIALES_PRECIOS",
    recurso: "DESCARGAR_LISTA_OFICIAL"
  }),

  obtenerContextoVentasContadoModulo: Object.freeze({
    handler: "obtenerContextoVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  obtenerOpcionesFormularioVentaContadoModulo: Object.freeze({
    handler: "obtenerOpcionesFormularioVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  listarProductosVentasContadoModulo: Object.freeze({
    handler: "listarProductosVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  listarSubtiposVentasContadoModulo: Object.freeze({
    handler: "listarSubtiposVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  listarTiposMaterialesVentasContadoModulo: Object.freeze({
    handler: "listarTiposMaterialesVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  listarMaterialesVentaContadoModulo: Object.freeze({
    handler: "listarMaterialesVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  resolverPrecioVentaContadoModulo: Object.freeze({
    handler: "resolverPrecioVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  resolverPrecioVentaContadoRapidoModulo: Object.freeze({
    handler: "resolverPrecioVentaContadoRapidoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  guardarVentaContadoModulo: Object.freeze({
    handler: "guardarVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "REGISTRAR_VENTA"
  }),
  modificarVentaContadoModulo: Object.freeze({
    handler: "modificarVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "EDITAR_VENTA"
  }),
  listarVentasContadoModulo: Object.freeze({
    handler: "listarVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  obtenerDetalleVentaContadoModulo: Object.freeze({
    handler: "obtenerDetalleVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  anularVentaContadoModulo: Object.freeze({
    handler: "anularVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "ANULAR"
  }),
  anularMaterialVentaContadoModulo: Object.freeze({
    handler: "anularMaterialVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "ANULAR"
  }),
  confirmarAbonoVentaContadoModulo: Object.freeze({
    handler: "confirmarAbonoVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "CONFIRMAR_ABONO"
  }),
  observarAbonoVentaContadoModulo: Object.freeze({
    handler: "observarAbonoVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "CONFIRMAR_ABONO"
  }),
  guardarGestionEntregaVentaContadoModulo: Object.freeze({
    handler: "guardarGestionEntregaVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "GESTIONAR_ENTREGA"
  }),
  exportarVentasContadoModulo: Object.freeze({
    handler: "exportarVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "EXPORTAR"
  }),
  obtenerArchivoVentaContadoModulo: Object.freeze({
    handler: "obtenerArchivoVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  refrescarIndiceVentasContadoModulo: Object.freeze({
    handler: "refrescarIndiceVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  precalentarDetallesVentasContadoModulo: Object.freeze({
    handler: "precalentarDetallesVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  precargarBandejasVentasContadoModulo: Object.freeze({
    handler: "precargarBandejasVentasContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  archivarVentaPruebaModulo: Object.freeze({
    handler: "archivarVentaPruebaModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),
  reclasificarVentaContadoModulo: Object.freeze({
    handler: "reclasificarVentaContadoModulo",
    modulo: "VENTAS_CONTADO",
    recurso: "VISUALIZAR_MODULO"
  }),

  listarRegistrosModuloDinamico: Object.freeze({
    handler: "listarRegistrosModuloDinamico",
    permisoDinamico: "VER_LISTADO"
  }),
  obtenerRegistroModuloDinamico: Object.freeze({
    handler: "obtenerRegistroModuloDinamico",
    permisoDinamico: "VER_DETALLE"
  }),
  listarValoresCatalogoModuloDinamico: Object.freeze({
    handler: "listarValoresCatalogoModuloDinamico",
    permisoDinamico: "VER_LISTADO"
  }),
  guardarRegistroModuloDinamico: Object.freeze({
    handler: "guardarRegistroModuloDinamico",
    permisoDinamicoSegunRegistro: true
  }),
  cambiarEstadoRegistroModuloDinamico: Object.freeze({
    handler: "cambiarEstadoRegistroModuloDinamico",
    permisoDinamico: "CAMBIAR_ESTADO"
  })
});

/**
 * Ejecuta operacion segura motor.
 */

/**
 * Sesión validada para la operación RPC en curso.
 * Permite que acciones administrativas eviten cerrar accidentalmente su propia sesión.
 * @private
 */
var RPC_SESION_EJECUCION_MOTOR_ = null;

/** @private */
function establecerSesionEjecucionRpcMotor_(sesion) {
  RPC_SESION_EJECUCION_MOTOR_ = sesion && typeof sesion === "object" ? Object.assign({}, sesion) : null;
}

/** @private */
function obtenerSesionEjecucionRpcMotor_() {
  return RPC_SESION_EJECUCION_MOTOR_ ? Object.assign({}, RPC_SESION_EJECUCION_MOTOR_) : null;
}

/** @private */
function limpiarSesionEjecucionRpcMotor_() {
  RPC_SESION_EJECUCION_MOTOR_ = null;
}

/**
 * Normaliza el contexto opcional usado por "Visualizar como".
 * @private
 */
function normalizarSimulacionRpcMotor_(simulacion) {
  simulacion = simulacion && typeof simulacion === "object" ? simulacion : {};
  const activa = simulacion.activa === true;
  if (!activa) return null;
  return {
    activa: true,
    rol: normalizarTexto(simulacion.rol || ""),
    idUsuarioReferencia: String(simulacion.idUsuarioReferencia || "").trim()
  };
}

/**
 * Resuelve y valida al usuario que servirá como identidad de referencia.
 * @private
 */
function resolverUsuarioSimuladoRpcMotor_(simulacion, usuarioReal) {
  if (!simulacion || simulacion.activa !== true) return null;
  if (normalizarTexto(usuarioReal && usuarioReal.rol) !== CONFIG.ROLES.SUPERADMIN) {
    throw crearErrorRpcMotor_(
      "SIMULACION_NO_AUTORIZADA",
      "La simulación de roles está disponible únicamente para el superadministrador."
    );
  }
  if (!simulacion.rol || simulacion.rol === CONFIG.ROLES.SUPERADMIN) {
    throw crearErrorRpcMotor_("SIMULACION_INVALIDA", "El rol simulado no es válido.");
  }
  if (!simulacion.idUsuarioReferencia) {
    throw crearErrorRpcMotor_(
      "SIMULACION_SIN_USUARIO",
      "Selecciona un usuario de referencia para aplicar correctamente los alcances."
    );
  }

  const usuario = buscarUsuarioPorId(simulacion.idUsuarioReferencia);
  if (!usuario || normalizarTexto(usuario.estado) !== CONFIG.ESTADOS.ACTIVO) {
    throw crearErrorRpcMotor_(
      "SIMULACION_USUARIO_INVALIDO",
      "El usuario de referencia no existe o está inactivo."
    );
  }
  if (normalizarTexto(usuario.rol) !== simulacion.rol) {
    throw crearErrorRpcMotor_(
      "SIMULACION_ROL_INCONSISTENTE",
      "El usuario de referencia ya no pertenece al rol seleccionado."
    );
  }
  return usuario;
}

/**
 * La simulación navegable es siempre de solo lectura.
 * @private
 */
function esOperacionLecturaSimulacionRpcMotor_(operacion) {
  const codigo = String(operacion || "");
  return /^(obtener|listar)/.test(codigo);
}

function ejecutarOperacionSeguraMotor(solicitud) {
  limpiarUsuarioEjecucionPaso15A_();
  let usuarioReal = null;
  let usuarioOperacion = null;
  let datos = null;

  try {
    datos = normalizarSolicitudRpcMotor_(solicitud);
    const definicion = RPC_MOTOR_SGT360[datos.operacion];
    if (!definicion) throw crearErrorRpcMotor_(
      "OPERACION_NO_PERMITIDA",
      "La operación no está habilitada."
    );

    const validacion = validarTokenOperacionMotor_(datos.token, datos.modulo || "SISTEMA");
    establecerSesionEjecucionRpcMotor_(validacion.sesion);
    usuarioReal = validacion.usuario;
    usuarioOperacion = usuarioReal;

    if (datos.simulacion) {
      if (!esOperacionLecturaSimulacionRpcMotor_(datos.operacion)) {
        throw crearErrorRpcMotor_(
          "VISTA_SIMULADA_SOLO_LECTURA",
          "La vista simulada es de solo lectura. Vuelve a tu vista para realizar cambios."
        );
      }
      usuarioOperacion = resolverUsuarioSimuladoRpcMotor_(datos.simulacion, usuarioReal);
    }

    establecerUsuarioEjecucionPaso15A_(usuarioOperacion);

    const usuarioContextoConfirmado = obtenerUsuarioActual();
    if (
      !usuarioContextoConfirmado ||
      String(usuarioContextoConfirmado.idUsuario || "") !==
        String(usuarioOperacion.idUsuario || "") ||
      normalizarTexto(usuarioContextoConfirmado.rol) !==
        normalizarTexto(usuarioOperacion.rol)
    ) {
      throw crearErrorRpcMotor_(
        "CONTEXTO_USUARIO_INCONSISTENTE",
        "La identidad efectiva de la operación no coincide con la sesión validada."
      );
    }
    usuarioOperacion = usuarioContextoConfirmado;

    if (definicion.modulo && definicion.recurso) {
      exigirPermisoMotor_(definicion.modulo, definicion.recurso, usuarioOperacion);
    }
    if (definicion.modulo && definicion.recursoCualquiera) {
      const recursos = Array.isArray(definicion.recursoCualquiera) ? definicion.recursoCualquiera : [];
      const autorizado = recursos.some(function(recurso) {
        return tienePermisoMotor_(definicion.modulo, recurso, usuarioOperacion);
      });
      if (!autorizado) {
        throw crearErrorRpcMotor_(
          "PERMISO_DENEGADO",
          "No tienes permiso para ejecutar esta operación."
        );
      }
    }
    if (definicion.modulo && definicion.recursoSegunArgumento) {
      const regla = definicion.recursoSegunArgumento;
      const argumento = datos.argumentos[Number(regla.indice) || 0] || {};
      const tieneId = Boolean(String(argumento[regla.campoId] || "").trim());
      exigirPermisoMotor_(
        definicion.modulo,
        tieneId ? regla.editar : regla.crear,
        usuarioOperacion
      );
    }
    if (definicion.modulo && definicion.recursoSegunValorArgumento) {
      const reglaValor = definicion.recursoSegunValorArgumento;
      const valor = normalizarTexto(datos.argumentos[Number(reglaValor.indice) || 0]);
      const mapa = reglaValor.mapa || {};
      const recurso = mapa[valor] || reglaValor.predeterminado;
      exigirPermisoMotor_(definicion.modulo, recurso, usuarioOperacion);
    }
    if (definicion.permisoDinamico) {
      exigirPermisoMotor_(
        String(datos.argumentos[0] || "").trim(),
        definicion.permisoDinamico,
        usuarioOperacion
      );
    }
    if (definicion.permisoDinamicoSegunRegistro) {
      const codigoModulo = String(datos.argumentos[0] || "").trim();
      const registro = datos.argumentos[1] || {};
      exigirPermisoMotor_(
        codigoModulo,
        registro.__ES_NUEVO ? "CREAR" : "EDITAR",
        usuarioOperacion
      );
    }

    const funcion = globalThis[definicion.handler];
    if (typeof funcion !== "function") {
      throw crearErrorRpcMotor_(
        "CONTROLADOR_AUSENTE",
        "No existe el controlador de la operación."
      );
    }

    const resultado = funcion.apply(null, datos.argumentos);

    if (datos.simulacion && usuarioReal) {
      establecerUsuarioEjecucionPaso15A_(usuarioReal);
    }
    registrarEventoMotor_({
      modulo: datos.modulo || "SISTEMA",
      accion: datos.operacion,
      resultado: "OK",
      detalle: datos.simulacion ? {
        modo: "SIMULACION_SOLO_LECTURA",
        rolSimulado: datos.simulacion.rol,
        idUsuarioReferencia: datos.simulacion.idUsuarioReferencia
      } : ""
    });

    return prepararResultadoRpcMotor_(resultado);
  } catch (error) {
    if (usuarioReal) {
      try {
        establecerUsuarioEjecucionPaso15A_(usuarioReal);
      } catch (errorContexto) {}
    }
    registrarEventoMotor_({
      modulo: datos && datos.modulo || solicitud && solicitud.modulo || "SISTEMA",
      accion: datos && datos.operacion || solicitud && solicitud.operacion || "RPC",
      resultado: "ERROR",
      detalle: error.message
    });
    throw error;
  } finally {
    limpiarSesionEjecucionRpcMotor_();
    limpiarUsuarioEjecucionPaso15A_();
  }
}

/**
 * Convierte recursivamente la respuesta del servidor a tipos admitidos por
 * google.script.run. Evita que Date, undefined o valores no serializables
 * conviertan una respuesta válida en null en el navegador.
 * @private
 */
function prepararResultadoRpcMotor_(valor, pila) {
  if (valor === null || valor === undefined) return valor === undefined ? null : valor;

  const tipo = typeof valor;
  if (tipo === "string" || tipo === "number" || tipo === "boolean") return valor;
  if (tipo === "function" || tipo === "symbol" || tipo === "bigint") return String(valor);

  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? "" : valor.toISOString();
  }

  const recorrido = Array.isArray(pila) ? pila : [];
  if (recorrido.indexOf(valor) !== -1) {
    throw crearErrorRpcMotor_("RESPUESTA_CIRCULAR",
      "La operación generó una respuesta circular que no puede enviarse al navegador.");
  }

  const siguientePila = recorrido.concat([valor]);

  if (Array.isArray(valor)) {
    return valor.map(function(item) {
      return prepararResultadoRpcMotor_(item, siguientePila);
    });
  }

  const salida = {};
  Object.keys(valor).forEach(function(clave) {
    const item = valor[clave];
    if (typeof item === "function") return;
    salida[clave] = prepararResultadoRpcMotor_(item, siguientePila);
  });
  return salida;
}

/**
 * Ejecuta operacion segura paso13 d2.
 */
function ejecutarOperacionSeguraPaso13D2(solicitud) {
  return ejecutarOperacionSeguraMotor(solicitud);
}

/**
 * Normaliza solicitud RPC motor. Función interna del motor.
 */
function normalizarSolicitudRpcMotor_(solicitud) {
  solicitud = solicitud || {};
  const operacion = String(solicitud.operacion || "").trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(operacion)) {
    throw crearErrorRpcMotor_("OPERACION_INVALIDA", "La operación solicitada no es válida.");
  }
  const argumentos = Array.isArray(solicitud.argumentos) ? solicitud.argumentos : [];
  if (argumentos.length > 12) {
    throw crearErrorRpcMotor_("ARGUMENTOS_INVALIDOS", "La operación contiene demasiados argumentos.");
  }
  return {
    token: String(solicitud.token || "").trim(),
    operacion: operacion,
    argumentos: argumentos,
    modulo: limpiarTextoMotor_(solicitud.modulo || "", 100),
    origen: limpiarTextoMotor_(solicitud.origen || "WEB_APP", 200),
    userAgent: limpiarTextoMotor_(solicitud.userAgent || "", 500),
    simulacion: normalizarSimulacionRpcMotor_(solicitud.simulacion)
  };
}

/**
 * Valida token operacion motor. Función interna del motor.
 */
function validarTokenOperacionMotor_(token, modulo) {
  const tokenNormalizado = String(token || "").trim();
  if (!tokenNormalizado || tokenNormalizado.indexOf(AUTH_PASO_13D1.PREFIJO_TOKEN) !== 0 ||
    tokenNormalizado.length > AUTH_PASO_13D1.MAXIMO_TOKEN) throw crearErrorRpcMotor_(
    "TOKEN_INVALIDO", "La sesión del navegador no es válida.");
  const contexto = obtenerContextoSesionesPaso13D1_();
  const idSesion = obtenerIdSesionDesdeTokenPaso13D1_(tokenNormalizado);
  const numeroFila = buscarFilaSesionPaso13D1_(contexto, idSesion);
  if (!numeroFila) throw crearErrorRpcMotor_("SESION_NO_ENCONTRADA", "La sesión no existe.");
  const sesion = leerSesionPaso13D1_(contexto, numeroFila);
  if (sesion.estado !== AUTH_PASO_13D1.ESTADO_ABIERTO) throw crearErrorRpcMotor_(
    "SESION_NO_ABIERTA", "La sesión ya no está activa.");
  const configuracion = obtenerConfiguracionPrivadaOAuthPaso13C_();
  const fechaExpiracion = obtenerFechaExpiracionPaso13D1_(sesion.fechaInicio, configuracion
    .horasSesion);
  if (!fechaExpiracion || fechaExpiracion.getTime() <= Date.now()) {
    const ahoraExpiracion = new Date();
    actualizarEstadoSesionPaso13D1_(contexto, numeroFila, AUTH_PASO_13D1.ESTADO_EXPIRADO,
      ahoraExpiracion);
    if (typeof insertarAuditoriaOAuthSinBloqueoPaso13C_ === "function") {
      insertarAuditoriaOAuthSinBloqueoPaso13C_({
        usuario: {
          idUsuario: sesion.idUsuario,
          correo: sesion.correo,
          rol: sesion.rol
        },
        accion: "EXPIRAR_SESION_VALIDACION",
        resultado: AUTH_PASO_13C.RESULTADOS_AUDITORIA.AUTORIZADO,
        motivo: "Sesión expirada durante validación RPC.",
        origen: "RPC",
        idSesion: idSesion,
        detalle: {
          estadoAnterior: sesion.estado,
          estadoNuevo: AUTH_PASO_13D1.ESTADO_EXPIRADO,
          fechaInicio: sesion.fechaInicio ? sesion.fechaInicio.toISOString() : "",
          fechaExpiracion: fechaExpiracion ? fechaExpiracion.toISOString() : "",
          fechaCierre: ahoraExpiracion.toISOString()
        }
      });
    }
    SpreadsheetApp.flush();
    throw crearErrorRpcMotor_("SESION_EXPIRADA", "La sesión alcanzó su tiempo máximo de vigencia.");
  }
  const usuario = sesion.idUsuario ? buscarUsuarioPorId(sesion.idUsuario) : buscarUsuarioPorCorreo(
    sesion.correo);
  if (!usuario || normalizarTexto(usuario.estado) !== CONFIG.ESTADOS.ACTIVO)
  throw crearErrorRpcMotor_("USUARIO_NO_AUTORIZADO", "El usuario no está activo.");
  const ahoraActividad = new Date();
  const ultimaActividad = sesion.ultimaActividad;
  const requiereActualizarActividad = !ultimaActividad ||
    (ahoraActividad.getTime() - ultimaActividad.getTime()) >=
      AUTH_PASO_13D1.SEGUNDOS_HEARTBEAT * 1000 ||
    normalizarTexto(sesion.moduloActual || "") !== normalizarTexto(modulo || "SISTEMA");
  if (requiereActualizarActividad) {
    actualizarActividadPaso13D1_(contexto, numeroFila, usuario, {
      modulo: modulo || "SISTEMA",
      userAgent: "",
      origen: "RPC"
    }, ahoraActividad);
    SpreadsheetApp.flush();
  }
  return {
    usuario: usuario,
    sesion: sesion
  };
}

/**
 * Crea error RPC motor. Función interna del motor.
 */
function crearErrorRpcMotor_(codigo, mensaje) {
  const error = new Error("[SGT360:" + codigo + "] " + mensaje);
  error.codigoAuth = codigo;
  return error;
}
