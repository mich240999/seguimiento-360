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
          v.estadoAbono = "ABONO_CONFIRMADO";
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
        {
          v.estadoEntrega = entregaPayload.estadoEntrega || v.estadoEntrega;
          if (String(entregaPayload.estadoEntrega || "").toUpperCase() === "ENTREGADA") v.estadoGeneral = "ENTREGADA";
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
        const { error } = await client.from("vta_ventas_contado").upsert(row);
        if (error) throw error;

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
        const estadoGestion = String(entregaPayload.estadoEntrega || "PROGRAMADA").toUpperCase();
        const gestionExistente = await client.from("vta_gestion_entrega").select("id_gestion_entrega").eq("id_venta", idVentaGestion).maybeSingle();
        if (gestionExistente.error) throw gestionExistente.error;
        const idGestion = (gestionExistente.data && gestionExistente.data.id_gestion_entrega) || ("ENT-" + Date.now());
        const filaGestion = { id_gestion_entrega: idGestion, id_venta: idVentaGestion, id_proveedor: entregaPayload.idProveedor || null, estado_entrega: estadoGestion, detalle_observacion: entregaPayload.detalleObservacion || null, fecha_programada_entrega: entregaPayload.fechaProgramadaEntrega || null };
        if (estadoGestion === "ENTREGADA") filaGestion.fecha_real_entrega = new Date().toISOString();
        const { error: gestionError } = await client.from("vta_gestion_entrega").upsert(filaGestion, { onConflict: "id_gestion_entrega" });
        if (gestionError) throw gestionError;
        const actualizacionVentaGestion = { estado_entrega: estadoGestion };
        if (estadoGestion === "ENTREGADA") actualizacionVentaGestion.estado_general = "ENTREGADA";
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
      estado: r.estado
    };
  }

  function mapRol(r) {
    return { idRol: r.id_rol, codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, nivel: r.nivel, estado: r.estado, sistema: r.sistema };
  }

  function mapProveedor(r) {
    return { idProveedor: r.id_proveedor, razonSocial: r.razon_social, nombreComercial: r.nombre_comercial, codigoSap: r.codigo_sap, ruc: r.ruc, alcanceCatalogo: r.alcance_catalogo, estado: r.estado };
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
