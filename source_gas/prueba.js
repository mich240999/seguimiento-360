/**
 * SGT360 — Diagnóstico puntual de usuarios y roles (Paso 20A)
 *
 * Uso:
 * 1. Crear un archivo temporal .gs en Apps Script.
 * 2. Copiar este contenido completo.
 * 3. Ejecutar diagnosticarUsuariosRolesPaso20A().
 * 4. Abrir "Registro de ejecución" y copiar la línea que empieza con DIAGNOSTICO_USUARIOS_ROLES.
 *
 * Esta función no elimina datos. La reparación invocada es idempotente.
 */
function diagnosticarUsuariosRolesPaso20A() {
  const resultado = {
    fecha: new Date().toISOString(),
    entorno: null,
    baseSeguridad: null,
    hojas: {},
    reparacion: null,
    roles: null,
    usuarios: null,
    errores: []
  };

  try {
    const diagnostico = obtenerDiagnosticoEntornoMotor();
    resultado.entorno = {
      correcto: diagnostico.correcto === true,
      urlWebApp: String(diagnostico.urlWebApp || ""),
      configuracion: diagnostico.configuracion || {}
    };
  } catch (errorEntorno) {
    resultado.errores.push({
      paso: "obtenerDiagnosticoEntornoMotor",
      mensaje: errorEntorno && errorEntorno.message ? errorEntorno.message : String(errorEntorno)
    });
  }

  try {
    const libro = obtenerLibroMotor_(MOTOR_SGT360.BASES.SECURITY);
    const id = String(libro.getId() || "");
    resultado.baseSeguridad = {
      nombre: libro.getName(),
      idParcial: id ? "..." + id.slice(-8) : ""
    };

    [
      CONFIG.HOJAS.USUARIOS,
      CONFIG.HOJAS.ROLES_SEGURIDAD,
      CONFIG.HOJAS.PERMISOS_RECURSOS
    ].forEach(function(nombreHoja) {
      const hoja = libro.getSheetByName(nombreHoja);
      resultado.hojas[nombreHoja] = hoja ? {
        existe: true,
        filas: hoja.getLastRow(),
        columnas: hoja.getLastColumn(),
        cabeceras: hoja.getLastColumn() > 0
          ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0]
          : []
      } : {
        existe: false,
        filas: 0,
        columnas: 0,
        cabeceras: []
      };
    });
  } catch (errorBase) {
    resultado.errores.push({
      paso: "baseSeguridad",
      mensaje: errorBase && errorBase.message ? errorBase.message : String(errorBase)
    });
  }

  try {
    resultado.reparacion = corregirRolesPermisosPaso20ARevision1();
  } catch (errorReparacion) {
    resultado.errores.push({
      paso: "corregirRolesPermisosPaso20ARevision1",
      mensaje: errorReparacion && errorReparacion.message ? errorReparacion.message : String(errorReparacion)
    });
  }

  try {
    const roles = listarRolesAdminMotor();
    resultado.roles = {
      cantidad: roles.length,
      registros: roles.map(function(rol) {
        return {
          idRol: rol.idRol || "",
          codigo: rol.codigo || "",
          nombre: rol.nombre || "",
          estado: rol.estado || "",
          sistema: rol.sistema === true,
          usuariosActivos: Number(rol.usuariosActivos || 0)
        };
      })
    };
  } catch (errorRoles) {
    resultado.errores.push({
      paso: "listarRolesAdminMotor",
      mensaje: errorRoles && errorRoles.message ? errorRoles.message : String(errorRoles)
    });
  }

  try {
    const usuarios = listarUsuariosAdminMotor({
      pagina: 1,
      tamano: 200
    });

    resultado.usuarios = {
      cantidadPagina: Array.isArray(usuarios.registros) ? usuarios.registros.length : 0,
      total: usuarios.paginacion ? Number(usuarios.paginacion.total || 0) : 0,
      registros: Array.isArray(usuarios.registros) ? usuarios.registros.map(function(usuario) {
        return {
          idUsuario: usuario.idUsuario || "",
          correo: usuario.correo || "",
          nombre: usuario.nombre || "",
          rol: usuario.rol || usuario.codigoRol || "",
          nombreRol: usuario.nombreRol || "",
          estado: usuario.estado || "",
          idProveedor: usuario.idProveedor || ""
        };
      }) : []
    };
  } catch (errorUsuarios) {
    resultado.errores.push({
      paso: "listarUsuariosAdminMotor",
      mensaje: errorUsuarios && errorUsuarios.message ? errorUsuarios.message : String(errorUsuarios)
    });
  }

  const texto = JSON.stringify(resultado, null, 2);
  console.log("DIAGNOSTICO_USUARIOS_ROLES\n" + texto);
  Logger.log("DIAGNOSTICO_USUARIOS_ROLES\n" + texto);
  return resultado;
}
