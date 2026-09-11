-- Recursos reales por módulo para la matriz de Roles y permisos.
-- Ejecutar en Supabase SQL Editor una sola vez si SEG_RECURSOS está vacío.
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
  ('RES-AUD-01','ADMIN_AUDITORIA','VISUALIZAR_MODULO','Acceder a auditoría','MODULO',10,'ACTIVO'),
  ('RES-AUD-02','ADMIN_AUDITORIA','VER_LISTADO','Ver registros de auditoría','ACCION',20,'ACTIVO'),
  ('RES-AUD-03','ADMIN_AUDITORIA','VER_SESIONES','Ver sesiones activas','ACCION',30,'ACTIVO'),
  ('RES-AUD-04','ADMIN_AUDITORIA','CERRAR_SESIONES','Forzar cierre de sesiones','ACCION',40,'ACTIVO'),
  ('RES-AUD-05','ADMIN_AUDITORIA','LIMPIAR_SESIONES_EXPIRADAS','Limpiar sesiones expiradas','ACCION',50,'ACTIVO'),
  ('RES-AUD-06','ADMIN_AUDITORIA','EXPORTAR','Exportar auditoría','ACCION',60,'ACTIVO'),
  ('RES-VTA-01','VENTAS_CONTADO','VISUALIZAR_MODULO','Visualizar módulo','MODULO',10,'ACTIVO'),
  ('RES-VTA-02','VENTAS_CONTADO','VER_LISTADO','Ver ventas','ACCION',20,'ACTIVO'),
  ('RES-VTA-03','VENTAS_CONTADO','VER_DETALLE','Ver detalle de venta','ACCION',30,'ACTIVO'),
  ('RES-VTA-04','VENTAS_CONTADO','REGISTRAR_VENTA','Registrar ventas','ACCION',40,'ACTIVO'),
  ('RES-VTA-05','VENTAS_CONTADO','EDITAR_VENTA','Modificar ventas','ACCION',50,'ACTIVO'),
  ('RES-VTA-06','VENTAS_CONTADO','CONFIRMAR_ABONO','Validar abonos','ACCION',60,'ACTIVO'),
  ('RES-VTA-07','VENTAS_CONTADO','PROGRAMAR_ENTREGA','Gestionar entregas','ACCION',70,'ACTIVO'),
  ('RES-VTA-08','VENTAS_CONTADO','CONFIRMAR_ENTREGA','Confirmar entregas','ACCION',80,'ACTIVO'),
  ('RES-VTA-09','VENTAS_CONTADO','ANULAR_VENTA','Anular ventas','ACCION',90,'ACTIVO'),
  ('RES-VTA-10','VENTAS_CONTADO','EXPORTAR','Exportar ventas','ACCION',100,'ACTIVO'),
  ('RES-MAT-01','MATERIALES_PRECIOS','VISUALIZAR_MODULO','Visualizar módulo','MODULO',10,'ACTIVO'),
  ('RES-MAT-02','MATERIALES_PRECIOS','VER_MATERIALES','Ver materiales','ACCION',20,'ACTIVO'),
  ('RES-MAT-03','MATERIALES_PRECIOS','CREAR_MATERIAL','Crear materiales','ACCION',30,'ACTIVO'),
  ('RES-MAT-04','MATERIALES_PRECIOS','EDITAR_MATERIAL','Editar materiales','ACCION',40,'ACTIVO'),
  ('RES-MAT-05','MATERIALES_PRECIOS','GESTIONAR_CATALOGO','Gestionar catálogos','ACCION',50,'ACTIVO'),
  ('RES-MAT-06','MATERIALES_PRECIOS','GESTIONAR_PRECIOS','Gestionar precios','ACCION',60,'ACTIVO'),
  ('RES-MAT-07','MATERIALES_PRECIOS','CREAR_PRECIO_INDIVIDUAL','Registrar precios individuales','ACCION',70,'ACTIVO'),
  ('RES-MAT-08','MATERIALES_PRECIOS','CREAR_LISTA_OFICIAL','Crear listas de precios','ACCION',80,'ACTIVO'),
  ('RES-MAT-09','MATERIALES_PRECIOS','EDITAR_LISTA_OFICIAL','Editar listas de precios','ACCION',90,'ACTIVO'),
  ('RES-MAT-10','MATERIALES_PRECIOS','IMPORTAR','Importar datos','ACCION',100,'ACTIVO'),
  ('RES-MAT-11','MATERIALES_PRECIOS','EXPORTAR','Exportar datos','ACCION',110,'ACTIVO')
  ,('RES-PROV-01','PROVEEDORES','VISUALIZAR_MODULO','Visualizar proveedores','MODULO',10,'ACTIVO')
  ,('RES-PROV-02','PROVEEDORES','VER_LISTADO','Ver proveedores','ACCION',20,'ACTIVO')
  ,('RES-PROV-03','PROVEEDORES','CREAR','Crear proveedores','ACCION',30,'ACTIVO')
  ,('RES-PROV-04','PROVEEDORES','EDITAR','Editar proveedores','ACCION',40,'ACTIVO')
  ,('RES-PROV-05','PROVEEDORES','CAMBIAR_ESTADO','Cambiar estado de proveedores','ACCION',50,'ACTIVO')
  ,('RES-PROV-06','PROVEEDORES','IMPORTAR','Importar proveedores','ACCION',60,'ACTIVO')
  ,('RES-PROV-07','PROVEEDORES','EXPORTAR','Exportar proveedores','ACCION',70,'ACTIVO')
  ,('RES-USR-01','ADMIN_USUARIOS','VISUALIZAR_MODULO','Acceder a usuarios','MODULO',10,'ACTIVO')
  ,('RES-USR-02','ADMIN_USUARIOS','VER_LISTADO','Ver usuarios','ACCION',20,'ACTIVO')
  ,('RES-USR-03','ADMIN_USUARIOS','VER_DETALLE','Ver detalle de usuario','ACCION',30,'ACTIVO')
  ,('RES-USR-04','ADMIN_USUARIOS','CREAR','Invitar usuarios','ACCION',40,'ACTIVO')
  ,('RES-USR-05','ADMIN_USUARIOS','EDITAR','Editar usuarios','ACCION',50,'ACTIVO')
  ,('RES-USR-06','ADMIN_USUARIOS','CAMBIAR_ESTADO','Activar o desactivar usuarios','ACCION',60,'ACTIVO')
  ,('RES-ROL-01','ADMIN_PERMISOS','VISUALIZAR_MODULO','Acceder a roles y permisos','MODULO',10,'ACTIVO')
  ,('RES-ROL-02','ADMIN_PERMISOS','VER_LISTADO','Ver roles','ACCION',20,'ACTIVO')
  ,('RES-ROL-03','ADMIN_PERMISOS','CREAR','Crear roles','ACCION',30,'ACTIVO')
  ,('RES-ROL-04','ADMIN_PERMISOS','EDITAR_ROLES','Editar roles','ACCION',40,'ACTIVO')
  ,('RES-ROL-05','ADMIN_PERMISOS','VER_PERMISOS','Ver matriz de permisos','ACCION',50,'ACTIVO')
  ,('RES-ROL-06','ADMIN_PERMISOS','EDITAR_PERMISOS','Editar matriz de permisos','ACCION',60,'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, orden = EXCLUDED.orden, estado = 'ACTIVO';
