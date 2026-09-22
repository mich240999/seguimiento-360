/**
 * CÁLIDDA 360 / SEGUIMIENTO 360 — ADAPTADOR RPC Y SUPABASE
 * Puente universal que sustituye a google.script.run
 * Permite ejecutar las llamadas directamente contra Supabase o en Modo Demo interactivo.
 */

(function(window) {
  "use strict";

  // Almacén reactivo local para modo Demo o caché
  const LOCAL_STORAGE_KEY = "S360_LOCAL_DATA_CACHE";

  function getInitialStore() {
    return {
      usuarios: [
        { idUsuario: "USR-MICH", correo: "mich240999@gmail.com", nombre: "Michael (Superadministrador)", rol: "SUPERADMIN", estado: "ACTIVO", telefono: "+51 999 999 999", idProveedor: "PRV-CALIDDA-DIRECTO", idOficina: "OFI-LIMA-CENTRO" },
        { idUsuario: "USR-SUPERADMIN", correo: "admin@calidda.com.pe", nombre: "Administrador Cálidda 360", rol: "SUPERADMIN", estado: "ACTIVO", telefono: "+51 999 888 777", idProveedor: "PRV-CALIDDA-DIRECTO", idOficina: "OFI-LIMA-CENTRO" },
        { idUsuario: "USR-DEMO", correo: "usuario.demo@calidda.com.pe", nombre: "Asesor Comercial Demo", rol: "VENDEDOR", estado: "ACTIVO", telefono: "+51 987 654 321", idProveedor: "PRV-CONTRATISTA-01", idOficina: "OFI-LIMA-NORTE" },
        { idUsuario: "USR-GESTOR", correo: "gestor.entrega@calidda.com.pe", nombre: "Gestor de Entregas Campo", rol: "GESTOR_ENTREGA", estado: "ACTIVO", telefono: "+51 912 345 678", idProveedor: "PRV-CONTRATISTA-01", idOficina: "OFI-LIMA-NORTE" }
      ],
      roles: [
        { idRol: "ROL-SUPERADMIN", codigo: "SUPERADMIN", nombre: "Superadministrador", nivel: 100, estado: "ACTIVO", sistema: true },
        { idRol: "ROL-ADMIN", codigo: "ADMIN", nombre: "Administrador General", nivel: 90, estado: "ACTIVO", sistema: true },
        { idRol: "ROL-COORD", codigo: "COORDINADOR_VENTAS", nombre: "Coordinador de Ventas", nivel: 70, estado: "ACTIVO", sistema: false },
        { idRol: "ROL-GESTOR", codigo: "GESTOR_ENTREGA", nombre: "Gestor de Entregas", nivel: 60, estado: "ACTIVO", sistema: false },
        { idRol: "ROL-PROV", codigo: "PROVEEDOR", nombre: "Contratista / Proveedor", nivel: 40, estado: "ACTIVO", sistema: false },
        { idRol: "ROL-VEND", codigo: "VENDEDOR", nombre: "Asesor Comercial / Vendedor", nivel: 30, estado: "ACTIVO", sistema: false }
      ],
      proveedores: [
        { idProveedor: "PRV-CALIDDA-DIRECTO", razonSocial: "CÁLIDDA OPERACIONES PROPIAS S.A.C.", nombreComercial: "Cálidda Directo", codigoSap: "SAP-10001", ruc: "20508565434", alcanceCatalogo: "TOTAL", estado: "ACTIVO" },
        { idProveedor: "PRV-CONTRATISTA-01", razonSocial: "SERVICIOS INTEGRALES DE GAS PERÚ S.A.", nombreComercial: "SIGAS PERÚ", codigoSap: "SAP-20045", ruc: "20601234567", alcanceCatalogo: "TOTAL", estado: "ACTIVO" }
      ],
      oficinas: [
        { idOficina: "OFI-LIMA-NORTE", nombre: "Oficina Lima Norte", estado: "ACTIVO" },
        { idOficina: "OFI-LIMA-SUR", nombre: "Oficina Lima Sur", estado: "ACTIVO" },
        { idOficina: "OFI-LIMA-CENTRO", nombre: "Oficina Lima Centro", estado: "ACTIVO" },
        { idOficina: "OFI-CALLAO", nombre: "Oficina Callao", estado: "ACTIVO" }
      ],
      grupos: [
        { idGrupo: "GRP-NORTE-01", idOficina: "OFI-LIMA-NORTE", nombre: "Grupo Ventas Hogar Norte A", estado: "ACTIVO" },
        { idGrupo: "GRP-SUR-01", idOficina: "OFI-LIMA-SUR", nombre: "Grupo Ventas Hogar Sur A", estado: "ACTIVO" },
        { idGrupo: "GRP-CENTRO-01", idOficina: "OFI-LIMA-CENTRO", nombre: "Grupo Ventas Centro", estado: "ACTIVO" }
      ],
      materiales: [
        { idMaterial: "MAT-COC-001", codigoMaterial: "MAB-COC-EM50", codigoSap: "SAP-101122", nombreMaterial: "Cocina Mabe 4 Hornillas Inox", descripcionMaterial: "Cocina de pie 4 quemadores encendido eléctrico inox", precioBase: 899.00, unidadMedida: "UND", esGasodomestico: true, estado: "ACTIVO", tipoMaterial: "Cocina 4 Hornillas" },
        { idMaterial: "MAT-TER-001", codigoMaterial: "BOS-TER-10LT", codigoSap: "SAP-102233", nombreMaterial: "Calentador Bosch Therm 4200 10L GN", descripcionMaterial: "Calentador a gas natural modulante tiro natural", precioBase: 1150.00, unidadMedida: "UND", esGasodomestico: true, estado: "ACTIVO", tipoMaterial: "Terma de Paso 10 Litros" },
        { idMaterial: "MAT-TER-002", codigoMaterial: "SOL-TER-06LT", codigoSap: "SAP-102244", nombreMaterial: "Calentador Sole 5.5L GN Tiro Natural", descripcionMaterial: "Calentador compacto alta eficiencia gas natural", precioBase: 680.00, unidadMedida: "UND", esGasodomestico: true, estado: "ACTIVO", tipoMaterial: "Terma de Paso 5.5 Litros" }
      ],
      ventas: [
        {
          idVenta: "VTA-2026-0001",
          codigoVenta: "PED-360-1001",
          fechaRegistro: new Date(Date.now() - 86400000 * 2).toISOString(),
          tipoVenta: "CONTADO",
          idUsuario: "USR-DEMO",
          correoUsuario: "usuario.demo@calidda.com.pe",
          nombreUsuario: "Asesor Comercial Demo",
          rolUsuario: "VENDEDOR",
          idProveedor: "PRV-CONTRATISTA-01",
          razonSocialProveedor: "SIGAS PERÚ",
          idOficina: "OFI-LIMA-NORTE",
          nombreOficina: "Oficina Lima Norte",
          numeroSolicitudSap: "SAP-908123",
          codigoSuministro: "SUM-7845129",
          tipoDocumentoCliente: "DNI",
          numeroDocumentoCliente: "45892147",
          nombresCliente: "Carlos Alberto",
          apellidosCliente: "Mendoza Quispe",
          telefonoContacto: "984512368",
          distrito: "Los Olivos",
          direccionInstalacion: "Av. Las Palmeras 3450 Mz. C Lote 12",
          tipoPago: "TRANSFERENCIA",
          numeroOperacionBancaria: "OP-BCP-9871234",
          bancoAbono: "BCP",
          montoAbono: 899.00,
          montoTotalVenta: 899.00,
          estadoAbono: "ABONO_CONFIRMADO",
          estadoEntrega: "PROGRAMADA",
          estadoGeneral: "EN_PROCESO",
          detalles: [
            { idDetalleVenta: "DET-VTA-001", linea: 1, idMaterial: "MAT-COC-001", codigoMaterial: "MAB-COC-EM50", codigoSap: "SAP-101122", descripcionMaterial: "Cocina Mabe 4 Hornillas Inox", cantidad: 1, precioUnitario: 899.00, precioTotal: 899.00 }
          ],
          gestionEntrega: {
            idGestionEntrega: "ENT-2026-0001",
            estadoEntrega: "PROGRAMADA",
            fechaProgramadaEntrega: new Date(Date.now() + 86400000).toISOString().split('T')[0]
          },
          gestionesEntrega: [
            {
              idGestionEntrega: "ENT-2026-0001",
              idProveedor: "PRV-CONTRATISTA-01",
              estadoEntrega: "PROGRAMADA",
              fechaProgramadaEntrega: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              detalleObservacion: "",
              evidencias: []
            }
          ],
          evidencias: []
        }
      ],
      auditoria: [
        { idAuditoriaAcceso: 1, fechaHora: new Date().toISOString(), correo: "admin@calidda.com.pe", rol: "SUPERADMIN", modulo: "APP_SHELL", accion: "INICIO_SESION", resultado: "EXITOSO", motivo: "Acceso validado" }
      ],
      parametros: [
        { clave: "NOMBRE_APLICACION", valor: "Seguimiento 360", descripcion: "Nombre comercial visible de la plataforma", tipo: "TEXTO", editable: true, estado: "ACTIVO" },
        { clave: "EXPIRACION_SESION_MINUTOS", valor: "480", descripcion: "Tiempo de expiración de sesión por inactividad (minutos)", tipo: "NUMERO", editable: true, estado: "ACTIVO" },
        { clave: "MONEDA_DEFECTO", valor: "PEN", descripcion: "Moneda predeterminada para precios y ventas (PEN/USD)", tipo: "TEXTO", editable: true, estado: "ACTIVO" },
        { clave: "APP_REFRESH_ENABLED", valor: "TRUE", descripcion: "Actualización automática de cambios de otros usuarios", tipo: "TEXTO", editable: true, estado: "ACTIVO" },
        { clave: "APP_REFRESH_SECONDS", valor: "300", descripcion: "Intervalo de actualización automática (segundos, mínimo 60)", tipo: "NUMERO", editable: true, estado: "ACTIVO" }
      ]
    };
  }

  let store = null;
  function loadStore() {
    if (store) return store;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      store = saved ? JSON.parse(saved) : getInitialStore();
    } catch(e) {
      store = getInitialStore();
    }
    return store;
  }

  function saveStore() {
    if (store) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
      } catch(e) {}
    }
  }

  // Despachador principal RPC
  const apiAdapter = {
    executeRpc: async function(operation, argumentsList, moduleCode) {
      const isClientConfigured = window.supabaseClient && window.supabaseClient.isConfigured();
      const client = isClientConfigured ? window.supabaseClient.getClient() : null;
      const s = loadStore();

      console.debug(`[RPC] Executing: ${operation}`, argumentsList);

      // Si Supabase está configurado intentamos resolver en tiempo real
      if (client) {
        try {
          const res = await dispatchSupabase(client, operation, argumentsList, moduleCode, s);
          if (res !== undefined) return res;
        } catch (err) {
          console.warn(`[Supabase] Fallback to local store for ${operation}:`, err.message);
        }
      }

      // Fallback local / Demo
      return dispatchLocal(s, operation, argumentsList, moduleCode);
    },

    directCall: function(functionName, args) {
      return this.executeRpc(functionName, args, null);
    }
  };

  // -------------------------------------------------------------
  // DESPACHO LOCAL / MOCK / DEMO INTERACTIVO
  // -------------------------------------------------------------
  function dispatchLocal(s, operation, args, moduleCode) {
    args = args || [];

    switch (operation) {
      case "obtenerContextoAplicacion": {
        const usuario = s.usuarios[0];
        return {
          correcto: true,
          sesion: {
            idUsuario: usuario.idUsuario,
            correo: usuario.correo,
            nombre: usuario.nombre,
            rol: usuario.rol,
            estado: usuario.estado,
            idProveedor: usuario.idProveedor,
            idOficina: usuario.idOficina,
            idGrupo: usuario.idGrupo
          },
          aplicacion: {
            nombre: window.APP_CONFIG.APP_NAME,
            version: window.APP_CONFIG.VERSION,
            entorno: window.APP_CONFIG.ENTORNO,
            fechaServidor: new Date().toISOString()
          },
          modulosPermitidos: [
            { idModulo: "MOD-DASH-VTA", codigo: "DASHBOARD_VENTAS", nombre: "Dashboard de Ventas", icono: "fas fa-chart-line", orden: 5 },
            { idModulo: "MOD-SALES", codigo: "VENTAS_CONTADO", nombre: "Ventas y Seguimiento 360", icono: "fas fa-truck-ramp-box", orden: 10 },
            { idModulo: "MOD-CAL-ENT", codigo: "CALENDARIO_ENTREGAS", nombre: "Calendario de Entregas", icono: "fas fa-calendar-days", orden: 15 },
            { idModulo: "MOD-MP", codigo: "MATERIALES_PRECIOS", nombre: "Materiales y Precios", icono: "fas fa-tags", orden: 20 },
            { idModulo: "MOD-PROV", codigo: "PROVEEDORES", nombre: "Proveedores y Sedes", icono: "fas fa-handshake", orden: 30 },
            { idModulo: "MOD-ADM-USR", codigo: "ADMIN_USUARIOS", nombre: "Usuarios y Seguridad", icono: "fas fa-users-gear", orden: 40 },
            { idModulo: "MOD-ADM-PERM", codigo: "ADMIN_PERMISOS", nombre: "Matriz de Permisos", icono: "fas fa-shield-halved", orden: 50 },
            { idModulo: "MOD-ADM-CAT", codigo: "ADMIN_CONFIG_APP", nombre: "Configuración y Catálogos", icono: "fas fa-sliders", orden: 60 },
            { idModulo: "MOD-ADM-AUD", codigo: "ADMIN_AUDITORIA", nombre: "Bitácora y Auditoría", icono: "fas fa-clock-rotate-left", orden: 70 }
          ],
          permisos: {
            DASHBOARD_VENTAS: { VISUALIZAR_MODULO: true, VER_RESUMEN: true, EXPORTAR: true },
            CALENDARIO_ENTREGAS: { VISUALIZAR_MODULO: true, VER_CALENDARIO: true, EXPORTAR: true },
            DESPACHO: { VISUALIZAR_MODULO: true, VER_DESPACHO: true, GESTIONAR_DESPACHO: true, EXPORTAR: true },
            VENTAS_CONTADO: { VISUALIZAR_MODULO: true, REGISTRAR_VENTA: true, EDITAR_VENTA: true, CONFIRMAR_ABONO: true, PROGRAMAR_ENTREGA: true, CONFIRMAR_ENTREGA: true, ANULAR_VENTA: true },
            MATERIALES_PRECIOS: { VISUALIZAR_MODULO: true, GESTIONAR_CATALOGO: true, GESTIONAR_PRECIOS: true, SOLICITAR_PRECIOS: true, APROBAR_PRECIOS: true },
            PROVEEDORES: { VISUALIZAR_MODULO: true, CREAR_PROVEEDOR: true, EDITAR_PROVEEDOR: true, IMPORTAR_PROVEEDORES: true },
            ADMIN_USUARIOS: { VISUALIZAR_MODULO: true, CREAR: true, EDITAR: true, VER_LISTADO: true },
            ADMIN_PERMISOS: { VISUALIZAR_MODULO: true, VER_ROLES: true, EDITAR_ROLES: true, VER_PERMISOS: true, EDITAR_PERMISOS: true },
            ADMIN_CONFIG_APP: { VISUALIZAR_MODULO: true, EDITAR_PARAMETROS: true, EDITAR_CATALOGOS: true },
            ADMIN_AUDITORIA: { VISUALIZAR_MODULO: true, VER_LISTADO: true, EXPORTAR: true }
          }
        };
      }

      case "obtenerEstadoSincronizacionMotor":
        return { correcto: true, sincronizado: true, timestamp: new Date().toISOString() };

      case "obtenerResumenAdministracionMotor":
        return {
          correcto: true,
          metricas: {
            totalUsuarios: s.usuarios.length,
            usuariosActivos: s.usuarios.filter(u => u.estado === "ACTIVO").length,
            totalRoles: s.roles.length,
            totalProveedores: s.proveedores.length,
            totalOficinas: s.oficinas.length,
            totalGrupos: s.grupos.length
          }
        };

      case "listarUsuariosAdminMotor":
        return { correcto: true, usuarios: s.usuarios };

      case "listarRolesAdminMotor":
      case "listarRolesAsignablesUsuariosMotor":
        return { correcto: true, roles: s.roles };

      case "guardarUsuarioAdminMotor": {
        const uData = args[0] || {};
        if (!uData.idUsuario) {
          uData.idUsuario = "USR-" + Date.now();
          s.usuarios.push(uData);
        } else {
          const idx = s.usuarios.findIndex(u => u.idUsuario === uData.idUsuario);
          if (idx >= 0) s.usuarios[idx] = Object.assign({}, s.usuarios[idx], uData);
          else s.usuarios.push(uData);
        }
        saveStore();
        return { correcto: true, idUsuario: uData.idUsuario, mensaje: "Usuario guardado exitosamente." };
      }

      case "obtenerEstructuraAsignacionesAdminMotor":
      case "obtenerEstructuraAsignacionesUsuariosMotor":
        return {
          correcto: true,
          proveedores: s.proveedores,
          oficinas: s.oficinas,
          grupos: s.grupos
        };

      case "listarProveedoresModulo":
        return { correcto: true, proveedores: s.proveedores };

      case "cambiarEstadoProveedorModulo": {
        const idProv = String(args[0] || "").trim();
        const estadoProv = String(args[1] || "").toUpperCase() === "ACTIVO" ? "ACTIVO" : "INACTIVO";
        const prov = s.proveedores.find(function(p) { return p.idProveedor === idProv; });
        if (!prov) return { correcto: false, mensaje: "Proveedor no encontrado." };
        prov.estado = estadoProv;
        saveStore();
        return { correcto: true, idProveedor: idProv, estado: estadoProv, mensaje: "Estado actualizado." };
      }

      case "asegurarTaxonomiaMaterialesModulo": {
        return { correcto: true, tiposCreados: [], subtiposCreados: [], advertencias: [], mensaje: "Demo: catálogo sin cambios." };
      }

      case "guardarProveedorModulo":
      case "guardarProveedorAdminMotor": {
        const pData = args[0] || {};
        if (!pData.idProveedor) {
          pData.idProveedor = "PRV-" + Date.now();
          s.proveedores.push(pData);
        } else {
          const idx = s.proveedores.findIndex(p => p.idProveedor === pData.idProveedor);
          if (idx >= 0) s.proveedores[idx] = Object.assign({}, s.proveedores[idx], pData);
          else s.proveedores.push(pData);
        }
        saveStore();
        return { correcto: true, idProveedor: pData.idProveedor, mensaje: "Proveedor guardado exitosamente." };
      }

      // Materiales y Precios
      case "obtenerResumenMaterialesPreciosModulo":
        return {
          correcto: true,
          resumen: {
            totalMateriales: s.materiales.length,
            totalPrecios: s.materiales.length,
            totalListas: 1,
            solicitudesPendientes: 0
          }
        };

      case "listarMaterialesPrecioModulo":
      case "listarMaterialesSelectPreciosModulo":
        return { correcto: true, materiales: s.materiales };

      case "resolverPrecioMaterialesPreciosModulo":
      case "resolverPrecioVentaContadoModulo":
      case "resolverPrecioVentaContadoRapidoModulo": {
        const rawScope = (args[0] && typeof args[0] === "object" && !Array.isArray(args[0])) ? args[0] : {};
        const idMat = (typeof args[0] === "string" ? args[0] : (rawScope.idMaterial || rawScope.id_material)) || (args[1] && args[1].idMaterial);
        const rolScope = String(rawScope.rol || (s.usuarios && s.usuarios[0] && s.usuarios[0].rol) || "").toUpperCase();
        const esAdminScope = (rolScope === "SUPERADMIN" || rolScope === "ADMIN");
        const provScope = String(rawScope.idProveedor || rawScope.id_proveedor || "").trim();
        const ofiScope = String(rawScope.idOficina || "").trim();
        const gruScope = String(rawScope.idGrupo || "").trim();
        const mat = s.materiales.find(m => m.idMaterial === idMat || m.codigoMaterial === idMat);
        if (mat && !esAdminScope && provScope && mat.idProveedor && String(mat.idProveedor) !== provScope) {
          return { correcto: false, precioEncontrado: false, encontrado: false, mensaje: "El material no pertenece a tu proveedor." };
        }
        if (mat && !esAdminScope && gruScope && mat.idGrupo && String(mat.idGrupo) !== gruScope) {
          return { correcto: false, precioEncontrado: false, encontrado: false, mensaje: "El material no pertenece a tu grupo." };
        }
        if (mat && !esAdminScope && !gruScope && ofiScope && mat.idOficina && String(mat.idOficina) !== ofiScope) {
          return { correcto: false, precioEncontrado: false, encontrado: false, mensaje: "El material no pertenece a tu oficina." };
        }
        if (!mat || (!mat.idProveedor && !mat.idOficina && !mat.idGrupo)) {
          try { console.warn("[SGT360] Alcance de catálogo (respaldo local): material sin alcance registrado, respuesta fail-open."); } catch (e) {}
        }
        return {
          correcto: true,
          precioEncontrado: !!mat,
          encontrado: !!mat,
          precio: mat ? mat.precioBase : 0,
          precioBase: mat ? mat.precioBase : 0,
          moneda: "PEN",
          idMaterial: mat ? mat.idMaterial : String(idMat || ""),
          idProveedor: mat ? (mat.idProveedor || provScope) : provScope,
          nombreMaterial: mat ? mat.nombreMaterial : ""
        };
      }

      // Ventas al Contado y Gestión 360
      case "obtenerContextoVentasContadoModulo":
        return {
          correcto: true,
          proveedores: s.proveedores,
          oficinas: s.oficinas,
          grupos: s.grupos,
          materiales: s.materiales,
          estadosAbono: [
            { codigo: "PENDIENTE_CONFIRMACION", nombre: "Pendiente" },
            { codigo: "ABONO_CONFIRMADO", nombre: "Aprobado" },
            { codigo: "ABONO_OBSERVADO", nombre: "Observado" }
          ],
          estados: [
            { codigo: "REGISTRADA", nombre: "Registrada" },
            { codigo: "POR_ENTREGAR", nombre: "Por entregar" },
            { codigo: "PROGRAMADA", nombre: "Programada" },
            { codigo: "EN_RUTA", nombre: "En ruta" },
            { codigo: "ENTREGADA", nombre: "Entregada" },
            { codigo: "ANULADA", nombre: "Anulada" }
          ],
          estadosEntrega: [
            { codigo: "REGISTRADA", nombre: "Registrada" },
            { codigo: "PROGRAMADA", nombre: "Programada" },
            { codigo: "EN_RUTA", nombre: "En ruta" },
            { codigo: "ENTREGADA", nombre: "Entregada" },
            { codigo: "OBSERVADA", nombre: "Observada" },
            { codigo: "ANULADA", nombre: "Anulada" }
          ]
        };

      case "listarVentasContadoModulo":
      case "precargarBandejasVentasContadoModulo":
        return { correcto: true, ventas: s.ventas };

      case "obtenerDetalleVentaContadoModulo": {
        const idVenta = args[0];
        const v = s.ventas.find(x => x.idVenta === idVenta || x.codigoVenta === idVenta);
        return { correcto: !!v, venta: v || null, detalles: (v && v.detalles) || [], evidenciasEntrega: (v && v.evidenciasEntrega) || [], gestionesEntrega: (v && v.gestionesEntrega) || [] };
      }

      case "guardarVentaContadoModulo": {
        const vPayload = args[0] || {};
        const idVenta = "VTA-" + Date.now();
        const codigoVenta = "PED-360-" + Math.floor(1000 + Math.random() * 9000);
        const nuevaVenta = Object.assign({
          idVenta: idVenta,
          codigoVenta: codigoVenta,
          fechaRegistro: new Date().toISOString(),
          estadoAbono: "PENDIENTE_CONFIRMACION",
          estadoEntrega: "REGISTRADA",
          estadoGeneral: "EN_PROCESO",
          detalles: vPayload.detalles || []
        }, vPayload);
        try { if (!nuevaVenta.idCanal) nuevaVenta.idCanal = vPayload.idCanal || vPayload.canal || null; } catch (_) {}
        try { if (!nuevaVenta.idEmpresaVendedora) nuevaVenta.idEmpresaVendedora = vPayload.idEmpresaVendedora || vPayload.idEmpresa || null; } catch (_) {}
        if (nuevaVenta.comprobante && nuevaVenta.comprobante.base64) {
          const mimeDemo = String(nuevaVenta.comprobante.mimeType || "application/octet-stream");
          nuevaVenta.urlComprobante = "data:" + mimeDemo + ";base64," + String(nuevaVenta.comprobante.base64).replace(/\s/g, "");
          nuevaVenta.idArchivoComprobante = nuevaVenta.urlComprobante;
          nuevaVenta.nombreArchivoComprobante = nuevaVenta.comprobante.nombre || "comprobante";
          nuevaVenta.nombreComprobante = nuevaVenta.comprobante.nombre || "comprobante";
          nuevaVenta.mimeComprobante = mimeDemo;
          nuevaVenta.estadoComprobantePagoCliente = "CARGADO";
          delete nuevaVenta.comprobante;
        }
        s.ventas.unshift(nuevaVenta);
        saveStore();
        return { correcto: true, idVenta: idVenta, codigoVenta: codigoVenta, mensaje: "Venta registrada con éxito." };
      }

      case "confirmarAbonoVentaContadoModulo": {
        const idVenta = args[0];
        const v = s.ventas.find(x => x.idVenta === idVenta);
        if (v) {
          var demoUsr29A_ = (s.usuarios && s.usuarios[0]) || {};
          var demoRol29A_ = String(demoUsr29A_.rol || demoUsr29A_.rolUsuario || "").toUpperCase();
          var demoProvU29A_ = String(demoUsr29A_.idProveedor || demoUsr29A_.id_proveedor || "").trim();
          var demoProvsV29A_ = [];
          [v.idProveedor, v.gestionEntrega && v.gestionEntrega.idProveedor].concat(((v.detalles || []).map(function(d) { return d && (d.idProveedorPrecio || d.id_proveedor); }) || [])).forEach(function(p) { var s0 = String(p || "").trim(); if (s0 && demoProvsV29A_.indexOf(s0) === -1) demoProvsV29A_.push(s0); });
          if (demoRol29A_ !== "SUPERADMIN" && demoProvU29A_ && demoProvsV29A_.length && demoProvsV29A_.indexOf(demoProvU29A_) === -1) return { correcto: false, mensaje: "Solo una cuenta del proveedor de esta venta puede validar el abono." };
          v.estadoAbono = "ABONO_CONFIRMADO";
          v.abonoAprobadoId = (s.usuarios[0] && s.usuarios[0].idUsuario) || "";
          v.abonoAprobadoNombre = (s.usuarios[0] && s.usuarios[0].nombre) || "";
          saveStore();
          return { correcto: true, mensaje: "Abono confirmado." };
        }
        return { correcto: false, mensaje: "Venta no encontrada." };
      }

      case "guardarGestionEntregaVentaContadoModulo": {
        const entregaPayload = args[0] || {};
        const v = s.ventas.find(x => x.idVenta === entregaPayload.idVenta);
        if (!v) return { correcto: false, mensaje: "Venta no encontrada." };
        if (String(v.estadoAbono || "").toUpperCase() !== "ABONO_CONFIRMADO") {
          return { correcto: false, mensaje: "Confirma el abono de la venta antes de gestionar su entrega." };
        }
        var demoUsr29G_ = (s.usuarios && s.usuarios[0]) || {};
        var demoRol29G_ = String(demoUsr29G_.rol || demoUsr29G_.rolUsuario || "").toUpperCase();
        var demoProvU29G_ = String(demoUsr29G_.idProveedor || demoUsr29G_.id_proveedor || "").trim();
        var demoProvsV29G_ = [];
        [v.idProveedor, v.gestionEntrega && v.gestionEntrega.idProveedor].concat(((v.detalles || []).map(function(d) { return d && (d.idProveedorPrecio || d.id_proveedor); }) || [])).forEach(function(p) { var s1 = String(p || "").trim(); if (s1 && demoProvsV29G_.indexOf(s1) === -1) demoProvsV29G_.push(s1); });
        if (demoRol29G_ !== "SUPERADMIN" && demoProvU29G_ && demoProvsV29G_.length && demoProvsV29G_.indexOf(demoProvU29G_) === -1) return { correcto: false, mensaje: "Solo una cuenta del proveedor de esta venta puede gestionar la entrega." };
        {
          v.estadoEntrega = entregaPayload.estadoEntrega || v.estadoEntrega;
          if (String(entregaPayload.estadoEntrega || "").toUpperCase() === "ENTREGADA") v.estadoGeneral = "ENTREGADA";
          const demoUser = s.usuarios[0] || {};
          if (String(entregaPayload.estadoEntrega || "").toUpperCase() === "PROGRAMADA" || String(entregaPayload.estadoEntrega || "").toUpperCase() === "EN_RUTA") {
            v.programadoId = demoUser.idUsuario || "";
            v.programadoNombre = demoUser.nombre || demoUser.correo || "";
          }
          if (String(entregaPayload.estadoEntrega || "").toUpperCase() === "ENTREGADA") {
            v.entregadoId = demoUser.idUsuario || "";
            v.entregadoNombre = demoUser.nombre || demoUser.correo || "";
          }
          v.gestionEntrega = Object.assign(v.gestionEntrega || {}, entregaPayload);
          v.gestionesEntrega = v.gestionesEntrega || [];
          const posicion = v.gestionesEntrega.findIndex(function(g) {
            return String(g.idProveedor || "") === String(entregaPayload.idProveedor || "") && String(entregaPayload.idProveedor || "") !== "";
          });
          const gestionDemo = {
            idGestionEntrega: (v.gestionEntrega && v.gestionEntrega.idGestionEntrega) || ("ENT-" + Date.now()),
            idProveedor: entregaPayload.idProveedor || "",
            estadoEntrega: entregaPayload.estadoEntrega || v.estadoEntrega,
            fechaProgramadaEntrega: entregaPayload.fechaProgramadaEntrega || "",
            fechaRealEntrega: String(entregaPayload.estadoEntrega || "").toUpperCase() === "ENTREGADA" ? new Date().toISOString() : "",
            detalleObservacion: entregaPayload.detalleObservacion || "",
            evidencias: entregaPayload.evidencias || []
          };
          if (posicion >= 0) v.gestionesEntrega[posicion] = Object.assign(v.gestionesEntrega[posicion], gestionDemo);
          else v.gestionesEntrega.push(gestionDemo);
          saveStore();
          return { correcto: true, mensaje: "Gestión de entrega actualizada." };
        }
        return { correcto: false, mensaje: "Venta no encontrada." };
      }

      case "anularVentaContadoModulo": {
        const idVenta = args[0];
        const motivo = args[1] || "";
        const v = s.ventas.find(x => x.idVenta === idVenta);
        if (v) {
          v.estado = "ANULADA";
          v.estadoEntrega = "ANULADA";
          v.estadoGeneral = "ANULADA";
          v.motivoAnulacion = motivo;
          v.fechaAnulacion = new Date().toISOString();
          if (v.gestionEntrega) v.gestionEntrega.estadoEntrega = "ANULADA";
          saveStore();
          return { correcto: true, mensaje: "Venta anulada correctamente." };
        }
        return { correcto: false, mensaje: "Venta no encontrada." };
      }

      case "listarAuditoriaAdminMotor":
        return { correcto: true, auditoria: s.auditoria };

      case "listarParametrosAdminMotor":
        return (s.parametros || []).map(function(p) {
          return { clave: p.clave, valor: p.valor, descripcion: p.descripcion, tipo: p.tipo, editable: p.editable !== false, estado: p.estado };
        });

      case "guardarParametroAdminMotor": {
        const parametroDemo = args[0] || {};
        const claveDemo = String(parametroDemo.clave || "").trim();
        if (!claveDemo) return { correcto: false, mensaje: "Indica la clave del parámetro." };
        let valorDemo = parametroDemo.valor;
        if (typeof valorDemo === "boolean") valorDemo = valorDemo ? "TRUE" : "FALSE";
        valorDemo = String(valorDemo === null || valorDemo === undefined ? "" : valorDemo).trim();
        s.parametros = s.parametros || [];
        const existente = s.parametros.find(function(p) { return p.clave === claveDemo; });
        if (existente) existente.valor = valorDemo;
        else s.parametros.push({ clave: claveDemo, valor: valorDemo, descripcion: parametroDemo.descripcion || "", tipo: parametroDemo.tipo || "TEXTO", editable: true, estado: "ACTIVO" });
        saveStore();
        return { correcto: true, clave: claveDemo, valor: valorDemo, mensaje: "Parámetro actualizado." };
      }

      case "listarSesionesAuditoriaAdminMotor":
        return { correcto: true, sesiones: [] };

      case "actualizarFeeMaterialPrecioModulo": {
        var feeDemo_ = args[0] || {};
        var idDetDemo_ = String(feeDemo_.idDetallePrecio || "").trim();
        if (!idDetDemo_) return { correcto: false, mensaje: "Indica el detalle de precio." };
        var feeNumDemo_ = Number(feeDemo_.fee);
        if (!Number.isFinite(feeNumDemo_) || feeNumDemo_ < 0 || feeNumDemo_ > 100) return { correcto: false, mensaje: "El fee debe ser un porcentaje entre 0 y 100." };
        var usrFeeDemo_ = (s.usuarios && s.usuarios[0]) || {};
        var rolFeeDemo_ = String(usrFeeDemo_.rol || "").toUpperCase();
        if (rolFeeDemo_ !== "SUPERADMIN") return { correcto: false, mensaje: "No tienes permiso para editar el fee (MATERIALES_PRECIOS/EDITAR_FEE). Modo demo sin matriz de permisos." };
        return { correcto: true, idDetallePrecio: idDetDemo_, fee: feeNumDemo_, mensaje: "Fee actualizado (demo). Sin detalle local que persistir." };
      }

      case "guardarMatrizPermisosUsuarioMotor": {
        var matDemo_ = args[0] || {};
        var usrOpDemo_ = (s.usuarios && s.usuarios[0]) || {};
        var rolOpDemo_ = String(usrOpDemo_.rol || "").toUpperCase();
        if (["SUPERADMIN", "ADMIN"].indexOf(rolOpDemo_) === -1) return { correcto: false, mensaje: "Solo un administrador puede asignar permisos a usuarios." };
        var idUsuDemo_ = String(matDemo_.idUsuario || "").trim();
        if (!idUsuDemo_) return { correcto: false, mensaje: "Indica el usuario." };
        try {
          s.permisosUsuario = s.permisosUsuario || [];
          var cambiosDemo_ = matDemo_.permisos || [];
          for (var iDemo_ = 0; iDemo_ < cambiosDemo_.length; iDemo_++) {
            var xDemo_ = cambiosDemo_[iDemo_] || {};
            if (!xDemo_.modulo || !xDemo_.recurso) continue;
            var existeDemo_ = null;
            for (var jDemo_ = 0; jDemo_ < s.permisosUsuario.length; jDemo_++) {
              var rDemo_ = s.permisosUsuario[jDemo_];
              if (String(rDemo_.idUsuario || "") === idUsuDemo_ && String(rDemo_.modulo || "") === String(xDemo_.modulo) && String(rDemo_.recurso || "") === String(xDemo_.recurso)) { existeDemo_ = rDemo_; break; }
            }
            if (existeDemo_) { existeDemo_.permitido = !!xDemo_.permitido; existeDemo_.alcance = xDemo_.alcance || "PROPIO"; }
            else s.permisosUsuario.push({ idUsuario: idUsuDemo_, modulo: xDemo_.modulo, recurso: xDemo_.recurso, permitido: !!xDemo_.permitido, alcance: xDemo_.alcance || "PROPIO" });
          }
          saveStore();
        } catch (_) {}
        return { correcto: true, idUsuario: idUsuDemo_, mensaje: "Permisos del usuario actualizados (demo, best-effort en tienda local)." };
      }

      case "obtenerMatrizPermisosUsuarioMotor": {
        var idUsuGetDemo_ = String((args[0] && args[0].idUsuario) || args[0] || "").trim();
        if (!idUsuGetDemo_) return { correcto: false, mensaje: "Indica el usuario.", permisos: [] };
        var permsGetDemo_ = ((s.permisosUsuario || []).filter(function(r) { return String(r.idUsuario || "") === idUsuGetDemo_; }) || []).map(function(r) { return { modulo: r.modulo, recurso: r.recurso, permitido: !!r.permitido, alcance: r.alcance || "PROPIO" }; });
        return { correcto: true, idUsuario: idUsuGetDemo_, permisos: permsGetDemo_ };
      }

      case "listarCanalesAdminMotor": {
        s.canales = s.canales || [
          { idCanal: "CANAL-IA", codigo: "IA", nombre: "Instaladores Aliados", descripcion: "Canal de instaladores aliados / gasodomésticos", estado: "ACTIVO" },
          { idCanal: "CANAL-ALO", codigo: "ALO", nombre: "Aló Cálidda", descripcion: "Canal de televentas Aló Cálidda", estado: "ACTIVO" }
        ];
        return { correcto: true, registros: s.canales, canales: s.canales };
      }

      case "guardarCanalAdminMotor": {
        var dCanalDemo_ = args[0] || {};
        var codCanalDemo_ = String(dCanalDemo_.codigo || "").trim().toUpperCase();
        if (!codCanalDemo_) return { correcto: false, mensaje: "Ingresa el código del canal." };
        s.canales = s.canales || [];
        var idCanalDemo_ = String(dCanalDemo_.idCanal || dCanalDemo_.id_canal || "").trim() || ("CANAL-" + codCanalDemo_);
        var idxCanalDemo_ = -1;
        for (var kCanalDemo_ = 0; kCanalDemo_ < s.canales.length; kCanalDemo_++) {
          if (String(s.canales[kCanalDemo_].idCanal || "") === idCanalDemo_ || String(s.canales[kCanalDemo_].codigo || "").toUpperCase() === codCanalDemo_) { idxCanalDemo_ = kCanalDemo_; break; }
        }
        var rowCanalDemo_ = { idCanal: idCanalDemo_, codigo: codCanalDemo_, nombre: String(dCanalDemo_.nombre || codCanalDemo_).trim() || codCanalDemo_, descripcion: String(dCanalDemo_.descripcion || ""), estado: String(dCanalDemo_.estado || "ACTIVO") };
        if (idxCanalDemo_ >= 0) s.canales[idxCanalDemo_] = Object.assign({}, s.canales[idxCanalDemo_], rowCanalDemo_);
        else s.canales.push(rowCanalDemo_);
        try { saveStore(); } catch (_) {}
        return { correcto: true, idCanal: rowCanalDemo_.idCanal, codigo: rowCanalDemo_.codigo, mensaje: "Canal guardado (demo, best-effort en tienda local)." };
      }

      case "listarEmpresasVendedorasAdminMotor": {
        s.empresas = s.empresas || [
          { idEmpresa: "EMP-IBR", nombre: "IBR LATAM", tipo: "ALO", idCanal: "CANAL-ALO", nombreCanal: "Aló Cálidda", idProveedor: "", nombreProveedor: "", estado: "ACTIVO" },
          { idEmpresa: "EMP-ABAI", nombre: "ABAI", tipo: "ALO", idCanal: "CANAL-ALO", nombreCanal: "Aló Cálidda", idProveedor: "", nombreProveedor: "", estado: "ACTIVO" },
          { idEmpresa: "EMP-ESTRATEK", nombre: "ESTRATEK", tipo: "ALO", idCanal: "CANAL-ALO", nombreCanal: "Aló Cálidda", idProveedor: "", nombreProveedor: "", estado: "ACTIVO" }
        ];
        return { correcto: true, registros: s.empresas, empresas: s.empresas };
      }

      case "guardarEmpresaVendedoraAdminMotor": {
        var dEmpDemo_ = args[0] || {};
        var nomEmpDemo_ = String(dEmpDemo_.nombre || "").trim();
        if (!nomEmpDemo_) return { correcto: false, mensaje: "Ingresa el nombre de la empresa." };
        var tipoEmpDemo_ = String(dEmpDemo_.tipo || "").trim().toUpperCase();
        if (tipoEmpDemo_ !== "ALO" && tipoEmpDemo_ !== "IA") return { correcto: false, mensaje: "El tipo debe ser ALO o IA." };
        var canalEmpDemo_ = String(dEmpDemo_.idCanal || dEmpDemo_.canal || "").trim().toUpperCase();
        if (canalEmpDemo_ === "IA") canalEmpDemo_ = "CANAL-IA";
        else if (canalEmpDemo_ === "ALO") canalEmpDemo_ = "CANAL-ALO";
        if (!canalEmpDemo_) return { correcto: false, mensaje: "Selecciona el canal de la empresa." };
        s.empresas = s.empresas || [];
        var idEmpDemo_ = String(dEmpDemo_.idEmpresa || "").trim() || ("EMP-" + Date.now().toString(36).toUpperCase());
        var idxEmpDemo_ = -1;
        for (var kEmpDemo_ = 0; kEmpDemo_ < s.empresas.length; kEmpDemo_++) { if (String(s.empresas[kEmpDemo_].idEmpresa || "") === idEmpDemo_) { idxEmpDemo_ = kEmpDemo_; break; } }
        var rowEmpDemo_ = { idEmpresa: idEmpDemo_, nombre: nomEmpDemo_, tipo: tipoEmpDemo_, idCanal: canalEmpDemo_, canal: canalEmpDemo_, nombreCanal: canalEmpDemo_, idProveedor: String(dEmpDemo_.idProveedor || ""), estado: String(dEmpDemo_.estado || "ACTIVO") };
        if (idxEmpDemo_ >= 0) s.empresas[idxEmpDemo_] = Object.assign({}, s.empresas[idxEmpDemo_], rowEmpDemo_);
        else s.empresas.push(rowEmpDemo_);
        try { saveStore(); } catch (_) {}
        return { correcto: true, idEmpresa: idEmpDemo_, mensaje: "Empresa guardada (demo, best-effort en tienda local)." };
      }

      case "listarListasOficialesPreciosModulo": {
        var rowsListDemo_ = (s.materiales || []).map(function(m, i) {
          return { idDetallePrecio: "DPR-DEMO-" + (i + 1), idListaPrecio: "LPR-DEMO-1", proveedor: "Demo", negocio: "", idProveedor: (m.idProveedor || ""), idNegocio: "", idOficina: "", idGrupo: "", idCanal: "", id_canal: "", canal: "", codigoSap: m.codigoSap || "", codigoMaterial: m.codigoMaterial || "", idMaterial: m.idMaterial || "", nombreCortoMaterial: m.nombreMaterial || "", descripcionMaterial: m.descripcionMaterial || "", precioBase: m.precioBase || 0, fee: null, responsableVenta: "", moneda: "PEN", fechaInicio: "", fechaFin: "", detalleCombo: "", estado: "ACTIVO", es_catalogo: false };
        });
        return { correcto: true, registros: rowsListDemo_, paginacion: { pagina: 1, totalPaginas: 1, total: rowsListDemo_.length } };
      }

      case "listarMaterialesFeePorListaProveedorModulo": {
        var fFeeDemo_ = args[0] || {};
        if (typeof fFeeDemo_ === "string") fFeeDemo_ = { idListaPrecio: fFeeDemo_ };
        var idListaFeeDemo_ = String(fFeeDemo_.idListaPrecio || fFeeDemo_.idLista || "").trim();
        if (!idListaFeeDemo_) return { correcto: false, mensaje: "Indica la lista de precios.", registros: [] };
        return { correcto: true, idListaPrecio: idListaFeeDemo_, registros: [], paginacion: { pagina: 1, totalPaginas: 1, total: 0 }, mensaje: "Demo sin listas persistidas: sin materiales para la lista indicada." };
      }

      case "guardarListaOficialPrecioModulo": {
        var lDemo_ = args[0] || {};
        var idProvLDemo_ = String(lDemo_.idProveedor || "").trim();
        if (!idProvLDemo_) return { correcto: false, mensaje: "Selecciona el proveedor.", idListaPrecio: "" };
        var canalLDemo_ = String(lDemo_.idCanal || lDemo_.canal || lDemo_.id_canal || "").trim().toUpperCase();
        if (canalLDemo_ === "IA") canalLDemo_ = "CANAL-IA";
        else if (canalLDemo_ === "ALO") canalLDemo_ = "CANAL-ALO";
        var idListaLDemo_ = String(lDemo_.idListaPrecio || "").trim() || ("LPR-" + Date.now());
        return { correcto: true, idListaPrecio: idListaLDemo_, creado: true, idCanal: canalLDemo_ || null, mensaje: "Lista oficial guardada (demo, sin persistencia de cabecera en tienda local)." };
      }

      default:
        console.warn(`[RPC] Operación ${operation} resuelta de manera genérica.`);
        return { correcto: true, datos: [] };
    }
  }

  // -------------------------------------------------------------
  // DESPACHO DIRECTO CON SUPABASE (POSTGRESQL)
  // -------------------------------------------------------------
  async function dispatchSupabase(client, operation, args, moduleCode, localCache) {
    switch(operation) {
      case "listarUsuariosAdminMotor": {
        const { data, error } = await client.from("seg_usuarios").select("*");
        if (error) throw error;
        return { correcto: true, usuarios: data.map(mapUsuario) };
      }
      case "listarRolesAdminMotor": {
        const { data, error } = await client.from("seg_roles").select("*");
        if (error) throw error;
        return { correcto: true, roles: data.map(mapRol) };
      }
      case "listarProveedoresModulo": {
        const { data, error } = await client.from("mae_proveedores").select("*");
        if (error) throw error;
        return { correcto: true, proveedores: data.map(mapProveedor) };
      }
      case "listarMaterialesPrecioModulo": {
        const { data, error } = await client.from("mae_materiales").select("*");
        if (error) throw error;
        return { correcto: true, materiales: data.map(mapMaterial) };
      }
      case "listarVentasContadoModulo": {
        const { data, error } = await client
          .from("vta_ventas_contado")
          .select("*, vta_ventas_contado_detalle(*), vta_gestion_entrega(*)")
          .order("fecha_registro", { ascending: false });
        if (error) throw error;
        return { correcto: true, ventas: data.map(mapVenta) };
      }
      case "guardarVentaContadoModulo": {
        const payload = args[0] || {};
        const idVenta = payload.idVenta || "VTA-" + Date.now();
        const codigoVenta = payload.codigoVenta || ("PED-360-" + Math.floor(1000 + Math.random() * 9000));
        
        const row = {
          id_venta: idVenta,
          codigo_venta: codigoVenta,
          tipo_venta: payload.tipoVenta || "CONTADO",
          id_usuario: payload.idUsuario,
          correo_usuario: payload.correoUsuario,
          nombre_usuario: payload.nombreUsuario,
          rol_usuario: payload.rolUsuario,
          id_proveedor: payload.idProveedor,
          id_oficina: payload.idOficina,
          numero_solicitud_sap: payload.numeroSolicitudSap,
          codigo_suministro: payload.codigoSuministro,
          tipo_documento_cliente: payload.tipoDocumentoCliente || "DNI",
          numero_documento_cliente: payload.numeroDocumentoCliente,
          nombres_cliente: payload.nombresCliente,
          apellidos_cliente: payload.apellidosCliente,
          telefono_contacto: payload.telefonoContacto,
          distrito: payload.distrito,
          direccion_instalacion: payload.direccionInstalacion,
          monto_total_venta: payload.montoTotalVenta || 0,
          estado_abono: payload.estadoAbono || "PENDIENTE_CONFIRMACION",
          estado_entrega: payload.estadoEntrega || "REGISTRADA",
          tipo_receptor: payload.tipoReceptor || "COMPRADOR",
          nombre_receptor: payload.nombreReceptor || null,
          dni_receptor: payload.dniReceptor || null,
          telefono_receptor: payload.telefonoReceptor || null,
          parentesco_receptor: payload.relacionReceptor || null
        };
        try {
          var detSb0_ = (payload.detalles || [])[0] || {};
          var canalSb_ = String(payload.idCanal || payload.canal || "").trim();
          if (canalSb_.toUpperCase() === "IA") canalSb_ = "CANAL-IA";
          else if (canalSb_.toUpperCase() === "ALO") canalSb_ = "CANAL-ALO";
          var idDetSb_ = String(detSb0_.idDetallePrecio || detSb0_.idOferta || "").trim();
          var idListaSb_ = String(detSb0_.idListaPrecio || "").trim();
          if (idListaSb_) {
            try { var lqSb2_ = await client.from("pre_listas_precios").select("id_canal").eq("id_lista_precio", idListaSb_).maybeSingle(); if (!lqSb2_.error && lqSb2_.data && String(lqSb2_.data.id_canal || "").trim()) canalSb_ = String(lqSb2_.data.id_canal).trim(); } catch (_) {}
          } else if (idDetSb_) {
            try { var dqSb_ = await client.from("pre_lista_precio_detalle").select("id_lista_precio").eq("id_detalle_precio", idDetSb_).maybeSingle(); if (!dqSb_.error && dqSb_.data && dqSb_.data.id_lista_precio) { var lqSb_ = await client.from("pre_listas_precios").select("id_canal").eq("id_lista_precio", dqSb_.data.id_lista_precio).maybeSingle(); if (!lqSb_.error && lqSb_.data && String(lqSb_.data.id_canal || "").trim()) canalSb_ = String(lqSb_.data.id_canal).trim(); } } catch (_) {}
          }
          if (canalSb_) row.id_canal = canalSb_;
        } catch (_) {}
        try {
          var expEmpSb_ = String(payload.idEmpresaVendedora || payload.idEmpresa || payload.id_empresa_vendedora || "").trim();
          if (expEmpSb_) row.id_empresa_vendedora = expEmpSb_;
          else {
            var usrSb_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
            var idUsrSb_ = String(payload.idUsuario || usrSb_.idUsuario || "").trim();
            if (idUsrSb_) { var uqSb_ = await client.from("seg_usuarios").select("id_empresa").eq("id_usuario", idUsrSb_).maybeSingle(); if (!uqSb_.error && uqSb_.data && String(uqSb_.data.id_empresa || "").trim()) row.id_empresa_vendedora = String(uqSb_.data.id_empresa).trim(); }
          }
        } catch (_) {}
        const comprobante = payload.comprobante || null;
        if (comprobante && comprobante.base64) {
          const mimeRecibo = String(comprobante.mimeType || "application/octet-stream").toLowerCase();
          const binRecibo = atob(String(comprobante.base64).replace(/\s/g, ""));
          const bytesRecibo = new Uint8Array(binRecibo.length);
          for (let iRecibo = 0; iRecibo < binRecibo.length; iRecibo++) bytesRecibo[iRecibo] = binRecibo.charCodeAt(iRecibo);
          const nombreRecibo = String(comprobante.nombre || "comprobante").replace(/[^A-Za-z0-9_.-]+/g, "_").slice(-60);
          const rutaRecibo = "comprobantes/" + idVenta + "/" + Date.now() + "_" + nombreRecibo;
          const subida = await client.storage.from("evidencias").upload(rutaRecibo, new Blob([bytesRecibo], { type: mimeRecibo }), { contentType: mimeRecibo, upsert: true });
          if (subida.error) throw new Error("No se pudo guardar el comprobante en Storage: " + subida.error.message);
          row.url_comprobante = client.storage.from("evidencias").getPublicUrl(rutaRecibo).data.publicUrl;
          row.nombre_comprobante = comprobante.nombre || "comprobante";
          row.mime_comprobante = mimeRecibo;
          row.estado_comprobante = "CARGADO";
        }
        var upSb_ = await client.from("vta_ventas_contado").upsert(row);
        if (upSb_.error) {
          var msgSb_ = String((upSb_.error && upSb_.error.message) || "");
          if (msgSb_.indexOf("id_canal") !== -1 || msgSb_.indexOf("id_empresa_vendedora") !== -1) {
            try { delete row.id_canal; delete row.id_empresa_vendedora; } catch (_) {}
            upSb_ = await client.from("vta_ventas_contado").upsert(row);
          }
        }
        if (upSb_.error) throw upSb_.error;

        // Insertar detalles si vienen
        if (payload.detalles && payload.detalles.length > 0) {
          const detRows = payload.detalles.map((d, i) => ({
            id_detalle_venta: d.idDetalleVenta || `${idVenta}-DET-${i+1}`,
            id_venta: idVenta,
            linea: i + 1,
            id_material: d.idMaterial,
            codigo_material: d.codigoMaterial,
            descripcion_material: d.descripcionMaterial,
            cantidad: d.cantidad || 1,
            precio_unitario: d.precioUnitario || 0,
            precio_total: d.precioTotal || 0
          }));
          await client.from("vta_ventas_contado_detalle").upsert(detRows);
        }

        return { correcto: true, idVenta, codigoVenta, mensaje: "Venta guardada exitosamente en Supabase." };
      }
      case "anularVentaContadoModulo": {
        const idVentaAnular = args[0];
        const motivoAnular = args[1] || "";
        const { error: anularError } = await client.from("vta_ventas_contado").update({
          estado_general: "ANULADA",
          estado_entrega: "ANULADA",
          motivo_anulacion: motivoAnular,
          fecha_anulacion: new Date().toISOString()
        }).eq("id_venta", idVentaAnular);
        if (anularError) throw anularError;
        const { error: anularEntregaError } = await client.from("vta_gestion_entrega").update({
          estado_entrega: "ANULADA"
        }).eq("id_venta", idVentaAnular);
        if (anularEntregaError) throw anularEntregaError;
        return { correcto: true, mensaje: "Venta anulada correctamente en Supabase." };
      }
      case "guardarParametroAdminMotor": {
        const parametro = args[0] || {};
        const claveParam = String(parametro.clave || "").trim();
        if (!claveParam) throw new Error("Indica la clave del parámetro.");
        let valorParam = parametro.valor;
        if (typeof valorParam === "boolean") valorParam = valorParam ? "TRUE" : "FALSE";
        valorParam = String(valorParam === null || valorParam === undefined ? "" : valorParam).trim();
        const { error: paramError } = await client.from("sys_parametros").upsert({ clave: claveParam, valor: valorParam, estado: "ACTIVO" }, { onConflict: "clave" });
        if (paramError) throw paramError;
        return { correcto: true, clave: claveParam, valor: valorParam, mensaje: "Parámetro actualizado." };
      }
      case "guardarGestionEntregaVentaContadoModulo": {
        const entregaPayload = args[0] || {};
        const idVentaGestion = String(entregaPayload.idVenta || "").trim();
        if (!idVentaGestion) throw new Error("Indica la venta a gestionar.");
        const abonoVentaGestion = await client.from("vta_ventas_contado").select("estado_abono").eq("id_venta", idVentaGestion).maybeSingle();
        if (abonoVentaGestion.error) throw abonoVentaGestion.error;
        if (!abonoVentaGestion.data) throw new Error("No se encontró la venta.");
        if (String(abonoVentaGestion.data.estado_abono || "").toUpperCase() !== "ABONO_CONFIRMADO") throw new Error("Confirma el abono de la venta antes de gestionar su entrega.");
        var usuarioPuente29G_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
        var rolPuente29G_ = String(usuarioPuente29G_.rol || usuarioPuente29G_.rolUsuario || "").toUpperCase();
        if (rolPuente29G_ !== "SUPERADMIN") {
          var filasPuente29G_ = [];
          try {
            var qpPuente29G_ = await client.from("seg_permisos").select("id_sujeto,recurso,permitido,alcance").eq("estado", "ACTIVO").eq("modulo", "VENTAS_CONTADO").in("id_sujeto", [usuarioPuente29G_.idUsuario, rolPuente29G_]);
            if (!qpPuente29G_.error) filasPuente29G_ = qpPuente29G_.data || [];
          } catch (_) {}
          var recsPuente29G_ = ["GESTIONAR_ENTREGA", "PROGRAMAR_ENTREGA", "CONFIRMAR_ENTREGA"], hallPuente29G_ = null, r29G_;
          for (var i29G_ = 0; i29G_ < recsPuente29G_ && !hallPuente29G_; i29G_++) {
            r29G_ = recsPuente29G_[i29G_];
            var mu29G_ = filasPuente29G_.filter(function(x) { return String(x.recurso || "") === r29G_ && x.permitido === true && String(x.id_sujeto || "") === String(usuarioPuente29G_.idUsuario || ""); });
            if (mu29G_.length) hallPuente29G_ = { alcance: String(mu29G_[0].alcance || "PROPIO").toUpperCase() };
            else { var mr29G_ = filasPuente29G_.filter(function(x) { return String(x.recurso || "") === r29G_ && x.permitido === true && String(x.id_sujeto || "").toUpperCase() === rolPuente29G_; }); if (mr29G_.length) hallPuente29G_ = { alcance: String(mr29G_[0].alcance || "PROPIO").toUpperCase() }; }
          }
          if (!hallPuente29G_) throw new Error("No tienes permiso para gestionar la entrega.");
          var alcPuente29G_ = hallPuente29G_.alcance, okPuente29G_ = false;
          var vvPuente29G_ = await client.from("vta_ventas_contado").select("id_venta,id_usuario,id_proveedor,id_oficina,id_grupo").eq("id_venta", idVentaGestion).maybeSingle();
          if (vvPuente29G_.error) throw vvPuente29G_.error;
          if (!vvPuente29G_.data) throw new Error("No se encontró la venta.");
          var mpPuente29G_ = String(usuarioPuente29G_.idProveedor || usuarioPuente29G_.id_proveedor || "").trim();
          if (alcPuente29G_ === "GLOBAL" || alcPuente29G_ === "TOTAL") okPuente29G_ = true;
          else if (alcPuente29G_ === "PROPIO") okPuente29G_ = !!String(usuarioPuente29G_.idUsuario || "") && String(vvPuente29G_.data.id_usuario || "") === String(usuarioPuente29G_.idUsuario || "");
          else if (alcPuente29G_ === "PROVEEDOR" || alcPuente29G_ === "ASIGNADOS") {
            if (mpPuente29G_ && String(vvPuente29G_.data.id_proveedor || "") === mpPuente29G_) okPuente29G_ = true;
            else if (mpPuente29G_) {
              var ddPuente29G_ = await client.from("vta_ventas_contado_detalle").select("id_material,precio_unitario").eq("id_venta", idVentaGestion);
              if (ddPuente29G_.error) throw ddPuente29G_.error;
              var matsPuente29G_ = [], seenMP29G_ = {};
              (ddPuente29G_.data || []).forEach(function(d) { var mm = String(d.id_material || ""); if (mm && !seenMP29G_[mm]) { seenMP29G_[mm] = true; matsPuente29G_.push(mm); } });
              if (matsPuente29G_.length) {
                var pdPuente29G_ = await client.from("pre_lista_precio_detalle").select("id_material,precio_base,id_lista_precio").in("id_material", matsPuente29G_);
                if (pdPuente29G_.error) throw pdPuente29G_.error;
                var lidsPuente29G_ = [], seenLP29G_ = {};
                (ddPuente29G_.data || []).forEach(function(d) {
                  var hit = ((pdPuente29G_.data || []).filter(function(p) { return String(p.id_material || "") === String(d.id_material || "") && Number(p.precio_base || 0) === Number(d.precio_unitario || 0); })[0]) || null;
                  var lid = hit && String(hit.id_lista_precio || "");
                  if (lid && !seenLP29G_[lid]) { seenLP29G_[lid] = true; lidsPuente29G_.push(lid); }
                });
                if (lidsPuente29G_.length) {
                  var lpPuente29G_ = await client.from("pre_listas_precios").select("id_proveedor").in("id_lista_precio", lidsPuente29G_);
                  if (lpPuente29G_.error) throw lpPuente29G_.error;
                  okPuente29G_ = (lpPuente29G_.data || []).some(function(l) { return String(l.id_proveedor || "").trim() === mpPuente29G_; });
                }
              }
              if (!okPuente29G_ && !String(vvPuente29G_.data.id_proveedor || "").trim()) {
                var gqPuente29G_ = await client.from("vta_gestion_entrega").select("id_proveedor").eq("id_venta", idVentaGestion).maybeSingle();
                if (gqPuente29G_.error) throw gqPuente29G_.error;
                var provGPuente29G_ = String((gqPuente29G_.data && gqPuente29G_.data.id_proveedor) || "").trim();
                okPuente29G_ = !!provGPuente29G_ && provGPuente29G_ === mpPuente29G_;
              }
            }
          }
          else if (alcPuente29G_ === "OFICINA") { var moPuente29G_ = String(usuarioPuente29G_.idOficina || usuarioPuente29G_.id_oficina || "").trim(); okPuente29G_ = !!moPuente29G_ && !!String(vvPuente29G_.data.id_oficina || "") && String(vvPuente29G_.data.id_oficina || "") === moPuente29G_; }
          else if (alcPuente29G_ === "GRUPO") { var mgPuente29G_ = String(usuarioPuente29G_.idGrupo || usuarioPuente29G_.id_grupo || "").trim(); okPuente29G_ = !!mgPuente29G_ && !!String(vvPuente29G_.data.id_grupo || "") && String(vvPuente29G_.data.id_grupo || "") === mgPuente29G_; }
          if (!okPuente29G_) throw new Error("Solo una cuenta del proveedor de esta venta puede gestionar la entrega (alcance " + alcPuente29G_ + ").");
        }
        const estadoGestion = String(entregaPayload.estadoEntrega || "PROGRAMADA").toUpperCase();
        const gestionExistente = await client.from("vta_gestion_entrega").select("id_gestion_entrega").eq("id_venta", idVentaGestion).maybeSingle();
        if (gestionExistente.error) throw gestionExistente.error;
        const idGestion = (gestionExistente.data && gestionExistente.data.id_gestion_entrega) || ("ENT-" + Date.now());
        const filaGestion = { id_gestion_entrega: idGestion, id_venta: idVentaGestion, id_proveedor: entregaPayload.idProveedor || null, estado_entrega: estadoGestion, detalle_observacion: entregaPayload.detalleObservacion || null, fecha_programada_entrega: entregaPayload.fechaProgramadaEntrega || null };
        if (estadoGestion === "ENTREGADA") filaGestion.fecha_real_entrega = new Date().toISOString();
        const { error: gestionError } = await client.from("vta_gestion_entrega").upsert(filaGestion, { onConflict: "id_gestion_entrega" });
        if (gestionError) throw gestionError;
        const usuarioGestion = ((localCache && localCache.usuarios && localCache.usuarios[0]) || (typeof s !== "undefined" && s.usuarios && s.usuarios[0]) || {});
        const actualizacionVentaGestion = { estado_entrega: estadoGestion };
        if (estadoGestion === "ENTREGADA") actualizacionVentaGestion.estado_general = "ENTREGADA";
        if (estadoGestion === "PROGRAMADA" || estadoGestion === "EN_RUTA") { actualizacionVentaGestion.programado_id = usuarioGestion.idUsuario || null; actualizacionVentaGestion.programado_nombre = usuarioGestion.nombre || usuarioGestion.correo || ""; }
        if (estadoGestion === "ENTREGADA") { actualizacionVentaGestion.entregado_id = usuarioGestion.idUsuario || null; actualizacionVentaGestion.entregado_nombre = usuarioGestion.nombre || usuarioGestion.correo || ""; }
        const { error: ventaGestionError } = await client.from("vta_ventas_contado").update(actualizacionVentaGestion).eq("id_venta", idVentaGestion);
        if (ventaGestionError) throw ventaGestionError;
        return { correcto: true, mensaje: "Gestión de entrega actualizada." };
      }
      case "listarDespachoModulo": {
        const baseDespacho = await dispatchSupabase(client, "listarVentasContadoModulo", args, moduleCode, localCache);
        const todasDespacho = (baseDespacho && baseDespacho.ventas) || [];
        const soloDespacho = todasDespacho.filter(function(v) {
          return ["PROGRAMADA", "EN_RUTA"].indexOf(String(v.estadoEntrega || v.estado || "").toUpperCase()) !== -1;
        });
        return { correcto: true, registros: soloDespacho, ventas: soloDespacho };
      }
      case "cambiarEstadoProveedorModulo": {
        const idProvSb = String(args[0] || "").trim();
        const estadoProvSb = String(args[1] || "").toUpperCase() === "ACTIVO" ? "ACTIVO" : "INACTIVO";
        if (!idProvSb) throw new Error("Indica el proveedor.");
        const { error: estadoProvError } = await client.from("mae_proveedores").update({ estado: estadoProvSb }).eq("id_proveedor", idProvSb);
        if (estadoProvError) throw estadoProvError;
        return { correcto: true, idProveedor: idProvSb, estado: estadoProvSb, mensaje: "Estado actualizado." };
      }
      case "exportarVentasContadoModulo": {
        const cellExp = function(v) { var t = String(v === null || v === undefined ? "" : v); return '"' + t.replace(/"/g, '""') + '"'; };
        const headExp = ["CODIGO", "FECHA", "CLIENTE", "DOCUMENTO", "PROVEEDOR", "OFICINA", "MONTO", "ABONO", "ENTREGA", "VENTA_EFECTUADA_POR", "ABONO_APROBADO_POR", "PROGRAMADO_POR", "ENTREGA_REALIZADA_POR", "OBSERVACION", "BONO_VENDEDOR"];
        const provNameExp = function(id) {
          var found = (localCache.proveedores || []).filter(function(p) { return String(p.idProveedor || "") === String(id || ""); })[0] || {};
          return found.nombreComercial || found.razonSocial || String(id || "");
        };
        const userNameExp = function(id) {
          var found = (localCache.usuarios || []).filter(function(u) { return String(u.idUsuario || "") === String(id || ""); })[0] || {};
          return found.nombre || found.correo || String(id || "");
        };
        const cliExp = function(v) { return [v.nombresCliente, v.apellidosCliente].filter(Boolean).join(" ") || v.nombreCliente || ""; };
        const linesExp = [headExp.map(cellExp).join(",")].concat((localCache.ventas || []).map(function(v) {
          return [v.codigoVenta || "", String(v.fechaRegistro || "").split("T")[0], cliExp(v), v.numeroDocumentoCliente || "", provNameExp(v.idProveedor), v.nombreOficina || "", Number(v.montoTotalVenta || 0), String(v.estadoAbono || "").replace(/_/g, " "), String(v.estadoEntrega || "").replace(/_/g, " "), userNameExp(v.idUsuario) || cliExp(v), v.abonoAprobadoNombre || "", v.programadoNombre || "", v.entregadoNombre || "", v.observacionEntrega || "", 0].map(cellExp).join(",");
        }));
        return { nombre: "ventas_360.csv", nombreArchivo: "ventas_360.csv", contenido: "﻿" + linesExp.join("\r\n"), mimeType: "text/csv;charset=utf-8", cantidad: (localCache.ventas || []).length };
      }
      case "asegurarTaxonomiaMaterialesModulo": {
        var comboTxSb_ = args[0] || {};
        var itemsTxSb_ = Array.isArray(comboTxSb_.items) ? comboTxSb_.items : [];
        var usrTxSb_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
        var foldTxSb_ = function(s) { try { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); } catch (_) { return String(s || "").toLowerCase().trim(); } };
        var slugTxSb_ = function(s, fb) { try { var b = String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40); return b || fb; } catch (_) { return fb; } };
        var seenTxSb_ = {}, distintosTxSb_ = [];
        itemsTxSb_.forEach(function(r) {
          r = r || {};
          var tTxSb_ = String(r.tipo || "").trim(), sTxSb_ = String(r.subtipo || "").trim(), pTxSb_ = String(r.producto || r.productoPrincipal || "").trim();
          if (!tTxSb_ && !sTxSb_) return;
          var kTxSb_ = (pTxSb_ + "|" + tTxSb_ + "|" + sTxSb_).toUpperCase();
          if (!seenTxSb_[kTxSb_]) { seenTxSb_[kTxSb_] = true; distintosTxSb_.push({ producto: pTxSb_, tipo: tTxSb_, subtipo: sTxSb_ }); }
        });
        if (!distintosTxSb_.length) return { correcto: true, tiposCreados: [], subtiposCreados: [], advertencias: [] };
        var tiposQTxSb_ = await client.from("mae_tipos_material").select("id_tipo_material,codigo_tipo,nombre");
        if (tiposQTxSb_.error) throw tiposQTxSb_.error;
        var subtiposQTxSb_ = await client.from("mae_subtipos_material").select("id_subtipo_material,id_tipo_material,id_producto,codigo_subtipo,nombre");
        if (subtiposQTxSb_.error) throw subtiposQTxSb_.error;
        var prodsQTxSb_ = await client.from("mae_productos_principales").select("id_producto,nombre");
        if (prodsQTxSb_.error) throw prodsQTxSb_.error;
        var tiposTxSb_ = tiposQTxSb_.data || [], subtiposTxSb_ = subtiposQTxSb_.data || [], prodsTxSb_ = prodsQTxSb_.data || [];
        var creadosTTxSb_ = [], creadosSTxSb_ = [], avisosTxSb_ = [], seqTxSb_ = 0;
        for (var ciTxSb_ = 0; ciTxSb_ < distintosTxSb_.length; ciTxSb_++) {
          var comboTxSb2_ = distintosTxSb_[ciTxSb_];
          var tipoRowTxSb_ = null;
          if (comboTxSb2_.tipo) {
            tipoRowTxSb_ = tiposTxSb_.filter(function(t) { return foldTxSb_(t.nombre) === foldTxSb_(comboTxSb2_.tipo); })[0] || null;
            if (!tipoRowTxSb_) {
              var slugTTxSb_ = slugTxSb_(comboTxSb2_.tipo, "TIP-AUTO"), nTTxSb_ = 0;
              while (tiposTxSb_.some(function(t) { return String(t.codigo_tipo || "").toUpperCase() === slugTTxSb_ + (nTTxSb_ ? "-" + nTTxSb_ : ""); })) nTTxSb_++;
              if (nTTxSb_) slugTTxSb_ += "-" + nTTxSb_;
              var nuevoTTxSb_ = { id_tipo_material: "TIP-AUTO-" + Date.now() + "-" + (seqTxSb_++), codigo_tipo: slugTTxSb_, nombre: comboTxSb2_.tipo, descripcion: null, estado: "ACTIVO", id_usuario_actualizacion: usrTxSb_.idUsuario || null };
              var insTTxSb_ = await client.from("mae_tipos_material").insert(nuevoTTxSb_);
              if (insTTxSb_.error) { avisosTxSb_.push("No se pudo crear el tipo " + comboTxSb2_.tipo + ": " + insTTxSb_.error.message); continue; }
              tiposTxSb_.push(nuevoTTxSb_);
              tipoRowTxSb_ = nuevoTTxSb_;
              creadosTTxSb_.push(comboTxSb2_.tipo);
            }
          }
          var prodRowTxSb_ = comboTxSb2_.producto ? (prodsTxSb_.filter(function(p) { return foldTxSb_(p.nombre) === foldTxSb_(comboTxSb2_.producto); })[0] || null) : null;
          if (comboTxSb2_.subtipo) {
            if (!tipoRowTxSb_) { avisosTxSb_.push("Subtipo sin tipo (" + comboTxSb2_.subtipo + "): indica el tipo para crearlo."); continue; }
            var exSTxSb_ = subtiposTxSb_.filter(function(s) { return String(s.id_tipo_material || "") === String(tipoRowTxSb_.id_tipo_material || "") && foldTxSb_(s.nombre) === foldTxSb_(comboTxSb2_.subtipo); })[0] || null;
            if (!exSTxSb_) {
              var nuevoSTxSb_ = { id_subtipo_material: "SUB-AUTO-" + Date.now() + "-" + (seqTxSb_++), id_tipo_material: tipoRowTxSb_.id_tipo_material, id_producto: prodRowTxSb_ ? prodRowTxSb_.id_producto : null, codigo_subtipo: slugTxSb_(comboTxSb2_.subtipo, "SUB-AUTO"), nombre: comboTxSb2_.subtipo, descripcion: null, estado: "ACTIVO", id_usuario_actualizacion: usrTxSb_.idUsuario || null };
              var insSTxSb_ = await client.from("mae_subtipos_material").insert(nuevoSTxSb_);
              if (insSTxSb_.error) { avisosTxSb_.push("No se pudo crear el subtipo " + comboTxSb2_.subtipo + ": " + insSTxSb_.error.message); continue; }
              subtiposTxSb_.push(nuevoSTxSb_);
              creadosSTxSb_.push(comboTxSb2_.subtipo);
            }
          }
        }
        return { correcto: true, tiposCreados: creadosTTxSb_, subtiposCreados: creadosSTxSb_, advertencias: avisosTxSb_ };
      }
      case "actualizarFeeMaterialPrecioModulo": {
        var feeSb_ = args[0] || {};
        var idDetSbFee_ = String(feeSb_.idDetallePrecio || "").trim();
        if (!idDetSbFee_) throw new Error("Indica el detalle de precio.");
        var feeNumSb_ = Number(feeSb_.fee);
        if (!Number.isFinite(feeNumSb_) || feeNumSb_ < 0 || feeNumSb_ > 100) throw new Error("El fee debe ser un porcentaje entre 0 y 100.");
        var usrSbFee_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
        var rolSbFee_ = String(usrSbFee_.rol || "").toUpperCase();
        var idUsrSbFee_ = String(usrSbFee_.idUsuario || "");
        if (rolSbFee_ !== "SUPERADMIN") {
          var qFee_ = await client.from("seg_permisos").select("id_sujeto,recurso,permitido,alcance").eq("estado", "ACTIVO").eq("modulo", "MATERIALES_PRECIOS").eq("recurso", "EDITAR_FEE").in("id_sujeto", [idUsrSbFee_, rolSbFee_]);
          if (qFee_.error) throw qFee_.error;
          var rowsSbFee_ = (qFee_.data || []).filter(function(r) { return r.permitido === true; });
          var mineSbFee_ = rowsSbFee_.filter(function(r) { return String(r.id_sujeto || "") === String(idUsrSbFee_ || ""); })[0] || rowsSbFee_.filter(function(r) { return String(r.id_sujeto || "").toUpperCase() === rolSbFee_; })[0] || null;
          if (!mineSbFee_) throw new Error("No tienes permiso para editar el fee (MATERIALES_PRECIOS/EDITAR_FEE).");
          var alcSbFee_ = String(mineSbFee_.alcance || "").toUpperCase();
          if (alcSbFee_ === "GLOBAL" || alcSbFee_ === "TOTAL") {}
          else if (alcSbFee_ === "PROVEEDOR" || alcSbFee_ === "ASIGNADOS") {
            var provSbFee_ = String(usrSbFee_.idProveedor || usrSbFee_.id_proveedor || "").trim();
            if (!provSbFee_) throw new Error("No tienes proveedor asignado para editar el fee.");
            var detSbFee_ = await client.from("pre_lista_precio_detalle").select("id_detalle_precio,id_lista_precio").eq("id_detalle_precio", idDetSbFee_).maybeSingle();
            if (detSbFee_.error) throw detSbFee_.error;
            if (!detSbFee_.data) throw new Error("No se encontro el detalle de precio.");
            var listSbFee_ = await client.from("pre_listas_precios").select("id_proveedor").eq("id_lista_precio", detSbFee_.data.id_lista_precio).maybeSingle();
            if (listSbFee_.error) throw listSbFee_.error;
            if (!listSbFee_.data || String(listSbFee_.data.id_proveedor || "").trim() !== provSbFee_) throw new Error("Solo una cuenta del proveedor de esta lista puede editar el fee (alcance " + alcSbFee_ + ").");
          } else throw new Error("No tienes acceso para editar el fee con tu alcance actual (" + alcSbFee_ + ").");
        }
        var updSbFee_ = await client.from("pre_lista_precio_detalle").update({ fee: feeNumSb_ }).eq("id_detalle_precio", idDetSbFee_);
        if (updSbFee_.error) throw updSbFee_.error;
        return { correcto: true, idDetallePrecio: idDetSbFee_, fee: feeNumSb_, mensaje: "Fee actualizado correctamente." };
      }
      case "guardarMatrizPermisosUsuarioMotor": {
        var matSb_ = args[0] || {};
        var usrOpSb_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
        var rolOpSb_ = String(usrOpSb_.rol || "").toUpperCase();
        if (["SUPERADMIN", "ADMIN"].indexOf(rolOpSb_) === -1) throw new Error("Solo un administrador puede asignar permisos a usuarios.");
        var idUsuSb_ = String(matSb_.idUsuario || "").trim();
        if (!idUsuSb_) throw new Error("Indica el usuario.");
        var cambiosSb_ = matSb_.permisos || [];
        var pidSb_ = function(value) { var h = 5381, t = String(value || ""); for (var k = 0; k < t.length; k++) h = ((h << 5) + h) ^ t.charCodeAt(k); return "PERM-" + (h >>> 0).toString(36); };
        for (var iSb_ = 0; iSb_ < cambiosSb_.length; iSb_++) {
          var xSb_ = cambiosSb_[iSb_] || {};
          if (!xSb_.modulo || !xSb_.recurso) throw new Error("Cada permiso debe indicar modulo y recurso.");
          var rowSb_ = { id_permiso: pidSb_([idUsuSb_, xSb_.modulo, xSb_.recurso].join("|")), tipo_sujeto: "USUARIO", id_sujeto: idUsuSb_, modulo: xSb_.modulo, recurso: xSb_.recurso, permitido: !!xSb_.permitido, alcance: xSb_.alcance || "PROPIO", estado: "ACTIVO" };
          var svSb_ = await client.from("seg_permisos").upsert(rowSb_);
          if (svSb_.error) throw svSb_.error;
        }
        return { correcto: true, idUsuario: idUsuSb_, mensaje: "Permisos del usuario actualizados." };
      }
      case "obtenerMatrizPermisosUsuarioMotor": {
        var idUsuGetSb_ = String((args[0] && args[0].idUsuario) || args[0] || "").trim();
        if (!idUsuGetSb_) throw new Error("Indica el usuario.");
        try {
          var qGetSb_ = await client.from("seg_permisos").select("modulo,recurso,permitido,alcance").eq("tipo_sujeto", "USUARIO").eq("id_sujeto", idUsuGetSb_).eq("estado", "ACTIVO");
          if (qGetSb_.error) throw qGetSb_.error;
          var permsGetSb_ = (qGetSb_.data || []).map(function(r) { return { modulo: r.modulo, recurso: r.recurso, permitido: r.permitido === true, alcance: r.alcance || "PROPIO" }; });
          return { correcto: true, idUsuario: idUsuGetSb_, permisos: permsGetSb_ };
        } catch (e) { throw new Error("No se pudo leer la matriz del usuario: " + String((e && e.message) || e)); }
      }
      case "listarCanalesAdminMotor": {
        try {
          var qCanSb_ = await client.from("ven_canales").select("*").order("codigo", { ascending: true });
          if (qCanSb_.error) throw qCanSb_.error;
          var recCanSb_ = (qCanSb_.data || []).map(function(r) { return { idCanal: r.id_canal, codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, estado: r.estado, id_canal: r.id_canal }; });
          return { correcto: true, registros: recCanSb_, canales: recCanSb_ };
        } catch (e) { throw new Error("No se pudieron listar los canales (ven_canales): " + String((e && e.message) || e)); }
      }
      case "guardarCanalAdminMotor": {
        try {
          var dCanSb_ = args[0] || {};
          var codCanSb_ = String(dCanSb_.codigo || "").trim().toUpperCase();
          if (!codCanSb_) throw new Error("Ingresa el código del canal.");
          var idCanSb_ = String(dCanSb_.idCanal || dCanSb_.id_canal || "").trim();
          if (!idCanSb_) {
            var byCodCanSb_ = await client.from("ven_canales").select("id_canal").eq("codigo", codCanSb_).maybeSingle();
            if (!byCodCanSb_.error && byCodCanSb_.data && byCodCanSb_.data.id_canal) idCanSb_ = String(byCodCanSb_.data.id_canal).trim();
          }
          if (!idCanSb_) idCanSb_ = "CANAL-" + codCanSb_;
          var rowCanSb_ = { id_canal: idCanSb_, codigo: codCanSb_, nombre: String(dCanSb_.nombre || codCanSb_).trim() || codCanSb_, descripcion: String(dCanSb_.descripcion || "") || null, estado: String(dCanSb_.estado || "ACTIVO").trim() || "ACTIVO" };
          var svCanSb_ = await client.from("ven_canales").upsert(rowCanSb_, { onConflict: "id_canal" });
          if (svCanSb_.error) throw svCanSb_.error;
          return { correcto: true, idCanal: idCanSb_, codigo: codCanSb_, mensaje: "Canal guardado." };
        } catch (e) { throw new Error("No se pudo guardar el canal (ven_canales): " + String((e && e.message) || e)); }
      }
      case "listarEmpresasVendedorasAdminMotor": {
        try {
          var qEmpSb_ = await client.from("ven_empresas").select("*").order("nombre", { ascending: true });
          if (qEmpSb_.error) throw qEmpSb_.error;
          var qChSb_ = await client.from("ven_canales").select("id_canal,codigo,nombre");
          var mapChSb_ = {};
          if (!qChSb_.error) (qChSb_.data || []).forEach(function(c) { mapChSb_[String(c.id_canal || "")] = c; });
          var qPvSb_ = await client.from("mae_proveedores").select("id_proveedor,razon_social,nombre_comercial");
          var mapPvSb_ = {};
          if (!qPvSb_.error) (qPvSb_.data || []).forEach(function(p) { mapPvSb_[String(p.id_proveedor || "")] = p; });
          var recEmpSb_ = (qEmpSb_.data || []).map(function(r) {
            var ch = mapChSb_[String(r.id_canal || "")] || {};
            var pv = mapPvSb_[String(r.id_proveedor || "")] || {};
            return { idEmpresa: r.id_empresa, nombre: r.nombre, tipo: r.tipo, idCanal: r.id_canal, canal: r.id_canal, codigoCanal: ch.codigo || "", nombreCanal: ch.nombre || ch.codigo || r.id_canal || "", idProveedor: r.id_proveedor, nombreProveedor: pv.nombre_comercial || pv.razon_social || "", estado: r.estado, id_empresa: r.id_empresa, id_canal: r.id_canal };
          });
          return { correcto: true, registros: recEmpSb_, empresas: recEmpSb_ };
        } catch (e) { throw new Error("No se pudieron listar las empresas (ven_empresas): " + String((e && e.message) || e)); }
      }
      case "guardarEmpresaVendedoraAdminMotor": {
        try {
          var dEmpSb_ = args[0] || {};
          var nomEmpSb_ = String(dEmpSb_.nombre || "").trim();
          if (!nomEmpSb_) throw new Error("Ingresa el nombre de la empresa.");
          var tipoEmpSb_ = String(dEmpSb_.tipo || "").trim().toUpperCase();
          if (tipoEmpSb_ !== "ALO" && tipoEmpSb_ !== "IA") throw new Error("El tipo debe ser ALO o IA.");
          var canalInSb_ = String(dEmpSb_.idCanal || dEmpSb_.canal || dEmpSb_.id_canal || "").trim().toUpperCase();
          var idCanalEmpSb_ = canalInSb_;
          if (idCanalEmpSb_ === "IA") idCanalEmpSb_ = "CANAL-IA";
          else if (idCanalEmpSb_ === "ALO") idCanalEmpSb_ = "CANAL-ALO";
          if (idCanalEmpSb_ && idCanalEmpSb_.indexOf("CANAL-") !== 0) {
            var chEmpSb_ = await client.from("ven_canales").select("id_canal").or("codigo.eq." + idCanalEmpSb_ + ",id_canal.eq." + idCanalEmpSb_).maybeSingle();
            if (!chEmpSb_.error && chEmpSb_.data && chEmpSb_.data.id_canal) idCanalEmpSb_ = String(chEmpSb_.data.id_canal).trim();
          }
          if (!idCanalEmpSb_) throw new Error("Selecciona el canal de la empresa.");
          var vexEmpSb_ = await client.from("ven_canales").select("id_canal").eq("id_canal", idCanalEmpSb_).maybeSingle();
          if (vexEmpSb_.error) throw vexEmpSb_.error;
          if (!vexEmpSb_.data) throw new Error("El canal indicado no existe. Regístralo primero en la tarjeta Canales.");
          var idProvEmpSb_ = String(dEmpSb_.idProveedor || dEmpSb_.id_proveedor || "").trim() || null;
          if (idProvEmpSb_) {
            var pvEmpSb_ = await client.from("mae_proveedores").select("id_proveedor").eq("id_proveedor", idProvEmpSb_).maybeSingle();
            if (pvEmpSb_.error) throw pvEmpSb_.error;
            if (!pvEmpSb_.data) throw new Error("El proveedor vinculado no existe.");
          }
          var idEmpSb_ = String(dEmpSb_.idEmpresa || dEmpSb_.id_empresa || "").trim() || ("EMP-" + Date.now().toString(36).toUpperCase());
          var rowEmpSb_ = { id_empresa: idEmpSb_, nombre: nomEmpSb_, tipo: tipoEmpSb_, id_canal: idCanalEmpSb_, id_proveedor: idProvEmpSb_, estado: String(dEmpSb_.estado || "ACTIVO").trim() || "ACTIVO" };
          var svEmpSb_ = await client.from("ven_empresas").upsert(rowEmpSb_, { onConflict: "id_empresa" });
          if (svEmpSb_.error) throw svEmpSb_.error;
          return { correcto: true, idEmpresa: idEmpSb_, mensaje: "Empresa guardada." };
        } catch (e) { throw new Error("No se pudo guardar la empresa (ven_empresas): " + String((e && e.message) || e)); }
      }
      case "listarListasOficialesPreciosModulo": {
        try {
          var detLSb_ = await client.from("pre_lista_precio_detalle").select("*");
          if (detLSb_.error) throw detLSb_.error;
          var cabLSb_ = await client.from("pre_listas_precios").select("*");
          if (cabLSb_.error) throw cabLSb_.error;
          var matLSb_ = await client.from("mae_materiales").select("id_material,codigo_material,codigo_sap,nombre_material,descripcion_material");
          var mapMatLSb_ = {};
          if (!matLSb_.error) (matLSb_.data || []).forEach(function(m) { mapMatLSb_[String(m.id_material || "")] = m; });
          var provLSb_ = await client.from("mae_proveedores").select("id_proveedor,razon_social,nombre_comercial");
          var mapProvLSb_ = {};
          if (!provLSb_.error) (provLSb_.data || []).forEach(function(p) { mapProvLSb_[String(p.id_proveedor || "")] = p; });
          var negLSb_ = await client.from("mae_negocios").select("id_negocio,nombre");
          var mapNegLSb_ = {};
          if (!negLSb_.error) (negLSb_.data || []).forEach(function(n) { mapNegLSb_[String(n.id_negocio || "")] = n; });
          var usrListSb_ = ((localCache && localCache.usuarios && localCache.usuarios[0]) || {});
          var hideFeeSb_ = String(usrListSb_.rol || "").toUpperCase() === "PROVEEDOR";
          var recListSb_ = (detLSb_.data || []).map(function(d) {
            var list = (cabLSb_.data || []).filter(function(x) { return String(x.id_lista_precio || "") === String(d.id_lista_precio || ""); })[0] || {};
            var mat = mapMatLSb_[String(d.id_material || "")] || {};
            var prov = mapProvLSb_[String(list.id_proveedor || "")] || {};
            var neg = mapNegLSb_[String(list.id_negocio || "")] || {};
            return { idDetallePrecio: d.id_detalle_precio, idListaPrecio: d.id_lista_precio, proveedor: prov.nombre_comercial || prov.razon_social || "", negocio: neg.nombre || "", idProveedor: list.id_proveedor, idNegocio: list.id_negocio, idOficina: list.id_oficina, idGrupo: list.id_grupo, idCanal: list.id_canal, id_canal: list.id_canal, canal: list.id_canal, nombre: list.nombre, nombreLista: list.nombre, codigoLista: list.codigo_lista, codigoSap: mat.codigo_sap, codigoMaterial: mat.codigo_material, idMaterial: d.id_material, nombreCortoMaterial: mat.nombre_material, descripcionMaterial: mat.descripcion_material, precioBase: d.precio_base, fee: (hideFeeSb_ ? null : d.fee), responsableVenta: d.responsable_venta || list.responsable_venta || "", moneda: d.moneda || list.moneda, fechaInicio: list.fecha_inicio, fechaFin: list.fecha_fin, detalleCombo: d.detalle_combo, estado: d.estado, es_catalogo: !!(list && list.es_catalogo) };
          });
          return { correcto: true, registros: recListSb_, paginacion: { pagina: 1, totalPaginas: 1, total: recListSb_.length } };
        } catch (e) { throw e; }
      }
      case "listarMaterialesFeePorListaProveedorModulo": {
        var fFeeSb_ = args[0] || {};
        if (typeof fFeeSb_ === "string") fFeeSb_ = { idListaPrecio: fFeeSb_ };
        var idListaFeeSb_ = String(fFeeSb_.idListaPrecio || fFeeSb_.idLista || "").trim();
        if (!idListaFeeSb_) throw new Error("Indica la lista de precios.");
        var baseFeeSb_ = await dispatchSupabase(client, "listarListasOficialesPreciosModulo", [{}], moduleCode, localCache);
        var rowsFeeSb_ = (baseFeeSb_.registros || []).filter(function(r) {
          if (String(r.idListaPrecio || "") !== idListaFeeSb_) return false;
          var wantProvFeeSb_ = String(fFeeSb_.idProveedor || "").trim();
          if (wantProvFeeSb_ && String(r.idProveedor || "") !== wantProvFeeSb_) return false;
          return true;
        });
        return { correcto: true, idListaPrecio: idListaFeeSb_, registros: rowsFeeSb_, paginacion: { pagina: 1, totalPaginas: 1, total: rowsFeeSb_.length } };
      }
      case "guardarListaOficialPrecioModulo": {
        try {
          var lSb_ = args[0] || {};
          var idProvLSb_ = String(lSb_.idProveedor || "").trim();
          if (!idProvLSb_) throw new Error("Selecciona el proveedor.");
          var canalLSb_ = String(lSb_.idCanal || lSb_.canal || lSb_.id_canal || "").trim().toUpperCase();
          if (canalLSb_ === "IA") canalLSb_ = "CANAL-IA";
          else if (canalLSb_ === "ALO") canalLSb_ = "CANAL-ALO";
          var idListaLSb_ = String(lSb_.idListaPrecio || "").trim() || ("LPR-" + Date.now());
          var payloadLSb_ = { id_lista_precio: idListaLSb_, codigo_lista: String(lSb_.codigoLista || idListaLSb_).trim() || idListaLSb_, nombre: String(lSb_.nombre || "Lista de precios").trim() || "Lista de precios", id_proveedor: idProvLSb_, id_negocio: String(lSb_.idNegocio || "") || null, id_oficina: String(lSb_.idOficina || "") || null, id_grupo: String(lSb_.idGrupo || "") || null, fecha_inicio: String(lSb_.fechaInicio || "").slice(0, 10) || new Date().toISOString().slice(0, 8) + "01", fecha_fin: String(lSb_.fechaFin || "").slice(0, 10) || null, moneda: String(lSb_.moneda || "PEN"), estado: String(lSb_.estado || "ACTIVA") };
          try { if (canalLSb_) payloadLSb_.id_canal = canalLSb_; } catch (_) {}
          try { if (lSb_.es_catalogo === true || lSb_.esCatalogo === true) payloadLSb_.es_catalogo = true; } catch (_) {}
          var svListSb_ = await client.from("pre_listas_precios").upsert(payloadLSb_, { onConflict: "id_lista_precio" });
          if (svListSb_.error) {
            var msgListSb_ = String((svListSb_.error && svListSb_.error.message) || "");
            var retryLSb_ = false;
            if (msgListSb_.indexOf("es_catalogo") !== -1) { try { delete payloadLSb_.es_catalogo; } catch (_) {} retryLSb_ = true; }
            if (msgListSb_.indexOf("id_canal") !== -1) { try { delete payloadLSb_.id_canal; } catch (_) {} retryLSb_ = true; }
            if (retryLSb_) svListSb_ = await client.from("pre_listas_precios").upsert(payloadLSb_, { onConflict: "id_lista_precio" });
          }
          if (svListSb_.error) throw svListSb_.error;
          return { correcto: true, idListaPrecio: idListaLSb_, creado: true, mensaje: "Lista oficial guardada." };
        } catch (e) { throw new Error("No se pudo guardar la lista oficial: " + String((e && e.message) || e)); }
      }
      default:
        return undefined; // Despacho a local fallback
    }
  }

  // Mapeadores de Snake_case (Postgres) a CamelCase (Frontend)
  function mapUsuario(r) {
    return {
      idUsuario: r.id_usuario,
      correo: r.correo,
      nombre: r.nombre,
      telefono: r.telefono,
      rol: r.rol,
      idProveedor: r.id_proveedor,
      idOficina: r.id_oficina,
      idGrupo: r.id_grupo,
      idEmpresa: r.id_empresa || "",
      estado: r.estado
    };
  }

  function mapRol(r) {
    return { idRol: r.id_rol, codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, nivel: r.nivel, estado: r.estado, sistema: r.sistema };
  }

  function mapProveedor(r) {
    return { idProveedor: r.id_proveedor, razonSocial: r.razon_social, nombreComercial: r.nombre_comercial, codigoSap: r.codigo_sap, ruc: r.ruc, alcanceCatalogo: r.alcance_catalogo, idCanalOrigen: r.id_canal_origen || "", estado: r.estado };
  }

  function mapMaterial(r) {
    return { idMaterial: r.id_material, codigoMaterial: r.codigo_material, codigoSap: r.codigo_sap, nombreMaterial: r.nombre_material, descripcionMaterial: r.descripcion_material, unidadMedida: r.unidad_medida, esGasodomestico: r.es_gasodomestico, estado: r.estado };
  }

  function mapVenta(r) {
    return {
      idVenta: r.id_venta,
      codigoVenta: r.codigo_venta,
      fechaRegistro: r.fecha_registro,
      tipoVenta: r.tipo_venta,
      idUsuario: r.id_usuario,
      correoUsuario: r.correo_usuario,
      nombreUsuario: r.nombre_usuario,
      rolUsuario: r.rol_usuario,
      idProveedor: r.id_proveedor,
      razonSocialProveedor: r.razon_social_proveedor,
      idOficina: r.id_oficina,
      numeroSolicitudSap: r.numero_solicitud_sap,
      codigoSuministro: r.codigo_suministro,
      tipoDocumentoCliente: r.tipo_documento_cliente,
      numeroDocumentoCliente: r.numero_documento_cliente,
      nombresCliente: r.nombres_cliente,
      apellidosCliente: r.apellidos_cliente,
      telefonoContacto: r.telefono_contacto,
      distrito: r.distrito,
      direccionInstalacion: r.direccion_instalacion,
      montoAbono: r.monto_abono,
      montoTotalVenta: r.monto_total_venta,
      estadoAbono: r.estado_abono,
      estadoEntrega: r.estado_entrega,
      estadoGeneral: r.estado_general,
      motivoAnulacion: r.motivo_anulacion || "",
      fechaAnulacion: r.fecha_anulacion || "",
      abonoAprobadoId: r.abono_aprobado_id || "",
      abonoAprobadoPor: r.abono_aprobado_nombre || "",
      programadoId: r.programado_id || "",
      programadoPor: r.programado_nombre || "",
      entregadoId: r.entregado_id || "",
      entregadoPor: r.entregado_nombre || "",
      observacionEntrega: (r.vta_gestion_entrega && r.vta_gestion_entrega[0] && r.vta_gestion_entrega[0].detalle_observacion) || "",
      idArchivoComprobante: r.url_comprobante || "",
      urlComprobante: r.url_comprobante || "",
      nombreArchivoComprobante: r.nombre_comprobante || "Comprobante de pago",
      nombreComprobante: r.nombre_comprobante || "",
      mimeComprobante: r.mime_comprobante || "",
      estadoComprobantePagoCliente: r.estado_comprobante || (r.url_comprobante ? "CARGADO" : "NO_CARGADO"),
      tipoReceptor: r.tipo_receptor || "",
      nombreReceptor: r.nombre_receptor || "",
      dniReceptor: r.dni_receptor || "",
      telefonoReceptor: r.telefono_receptor || "",
      relacionReceptor: r.parentesco_receptor || "",
      detalles: (r.vta_ventas_contado_detalle || []).map(d => ({
        idDetalleVenta: d.id_detalle_venta,
        linea: d.linea,
        idMaterial: d.id_material,
        codigoMaterial: d.codigo_material,
        descripcionMaterial: d.descripcion_material,
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario,
        precioTotal: d.precio_total
      })),
      gestionEntrega: r.vta_gestion_entrega && r.vta_gestion_entrega[0] ? {
        idGestionEntrega: r.vta_gestion_entrega[0].id_gestion_entrega,
        estadoEntrega: r.vta_gestion_entrega[0].estado_entrega,
        fechaProgramadaEntrega: r.vta_gestion_entrega[0].fecha_programada_entrega
      } : null,
      gestionesEntrega: (r.vta_gestion_entrega || []).map(function(g) {
        return {
          idGestionEntrega: g.id_gestion_entrega,
          idProveedor: g.id_proveedor,
          estadoEntrega: g.estado_entrega,
          fechaProgramadaEntrega: g.fecha_programada_entrega,
          fechaRealEntrega: g.fecha_real_entrega || "",
          detalleObservacion: g.detalle_observacion || "",
          evidencias: []
        };
      })
    };
  }

  window.apiAdapter = apiAdapter;
})(window);
