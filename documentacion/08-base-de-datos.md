# 08 — Base de datos (Supabase / PostgreSQL)

## 1) Para qué sirve

La carpeta `supabase/` es la **única fuente de verdad de los datos** de Seguimiento 360. Todo lo que la aplicación muestra y guarda vive en PostgreSQL de Supabase:

- `schema.sql` → crea todas las tablas, índices, triggers y políticas RLS desde cero. Es el plano inicial.
- `seed.sql` → carga los datos mínimos para que el sistema arranque (roles, parámetros, módulos, oficinas, proveedor, usuarios, catálogo y una venta demo).
- `migrations/*.sql` → cambios aplicados **después** del esquema inicial, en orden de fecha. Cada archivo es idempotente (se puede correr más de una vez sin romper nada).
- `functions/invite-user/index.ts` → Edge Function que invita usuarios de forma segura (solo SUPERADMIN).

En resumen: `schema.sql` construye la casa, `seed.sql` la amuebla, `migrations/` hace las remodelaciones y `invite-user` controla quién recibe llave.

## 2) Mapa

Tabla o archivo | Qué guarda
---|---
`sys_parametros` | Llave-valor de configuración global (nombre app, moneda, expiración sesión, bono vendedor).
`app_modulos` | Módulos del menú (Ventas, Dashboard, Calendario, Materiales, Proveedores, Usuarios, Permisos, Config, Auditoría).
`app_campos` / `app_acciones` | Definición de campos y botones por módulo (motor dinámico de formularios).
`app_catalogos` / `app_catalogo_valores` | Listas desplegables genéricas del sistema (estados, tipos, etc.).
`adm_recursos_visuales` | Logos e imágenes configurables (clave + URL pública).
`mae_proveedores` | Contratistas / proveedores (razón social, RUC, SAP, alcance).
`mae_oficinas` | Sedes u oficinas de venta (Lima Norte, Sur, Centro, Callao).
`mae_grupos` | Grupos de vendedores dentro de cada oficina.
`rel_proveedor_oficinas` | Qué proveedor atiende qué oficina y qué grupos (`ids_grupo` separado por `\|`).
`seg_roles` | Roles del sistema (SUPERADMIN, ADMIN, VENDEDOR, etc.).
`seg_usuarios` | Perfil de cada persona (correo, nombre, rol, proveedor/oficina/grupo asignados).
`seg_recursos` | Acciones permitibles por módulo (VER_LISTADO, REGISTRAR_VENTA, etc.).
`seg_permisos` | Matriz quién-puede-qué: por ROL o USUARIO + módulo + recurso + alcance.
`seg_sesiones` | Sesiones activas/cerradas/expiradas (control de sesión única).
`seg_auditoria_accesos` | Quién entró/salió, logins fallidos, cierres forzados.
`seg_auditoria_eventos` | Qué operación se hizo (guardar venta, editar material, etc.).
`seg_auditoria_permisos` | Qué permiso cambió, valor anterior y nuevo.
`mae_negocios` | Negocios comerciales. Hoy solo existe `GSD` (migración 20260910).
`mae_productos_principales` | Contenedor técnico exigido por el modelo. Hoy solo `GSD`.
`mae_tipos_material` | Tipo comercial (Equipo, Terma, Cocina, Celulares, etc.).
`mae_subtipos_material` | Subtipo dentro del tipo (Tablets, Refrigeradoras, Motos, etc.).
`mae_marcas` | Marcas (Mabe, Indurama, Bosch, Sole…).
`mae_materiales` | Ficha de cada producto vendible + columnas GSD/HANA.
`rel_negocio_material` / `rel_proveedor_material` / `rel_material_componentes` | Relaciones negocio↔material, proveedor↔material y combos/componentes.
`pre_listas_precios` | Cabecera de lista de precios (por proveedor, vigencia mensual, `es_catalogo`).
`pre_lista_precio_detalle` | Cada precio: material + precio base + fee + responsable + cuotas.
`pre_solicitudes_lista_precio` (+`_detalle`, +`_historial`) | Flujo proveedor propone → Cálidda revisa/aprueba/rechaza/publica.
`vta_ventas_contado` | Cabecera de cada venta/pedido (cliente, abono, entrega, trazabilidad).
`vta_ventas_contado_detalle` | Líneas de la venta (material, cantidad, precio).
`vta_gestion_entrega` | Programación y ejecución de la entrega (fecha, receptor, estado).
`vta_evidencias_entrega` | Fotos/archivos de la entrega (URLs del bucket `evidencias`).
`supabase/migrations/*.sql` | 13 remodelaciones ordenadas por fecha (ver Detalle § migraciones).
`supabase/functions/invite-user/index.ts` | Invita usuarios y resetea contraseñas vía Auth API.
`storage.buckets` (`evidencias`, `recursos`, `importaciones`) | Buckets de archivos creados al final de `schema.sql`.

## 3) Detalle

### 3.1 Tablas importantes y sus columnas clave

**`seg_usuarios` — quién es quién.**
- `id_usuario VARCHAR(50)` PK, ej. `USR-...`. La app lo genera como `USR-<uuid>`.
- `correo VARCHAR(200) UNIQUE` — llave real de login; se compara en minúsculas (`ilike`).
- `nombre VARCHAR(200)` — nombre visible.
- `telefono VARCHAR(50)` — contacto.
- `rol VARCHAR(50)` → referencia a `seg_roles(codigo)`. Ej. `SUPERADMIN`, `VENDEDOR`, `DESPACHADOR`.
- `id_proveedor / id_oficina / id_grupo VARCHAR(50)` — a qué contratista/sede/grupo pertenece. Define su alcance de datos.
- `estado VARCHAR(20)` — `ACTIVO` / `INACTIVO`. Si no es ACTIVO no puede entrar.
- `tipo_documento VARCHAR(20)` + `numero_documento VARCHAR(30)` — DNI por defecto.
- `fecha_creacion / fecha_actualizacion TIMESTAMPTZ` — auditoría automática por trigger.

**`seg_roles` — los 8 perfiles.**
- `id_rol VARCHAR(50)` PK (`ROL-SUPERADMIN`…), `codigo VARCHAR(50) UNIQUE` (el que usa el JS: `SUPERADMIN`, `ADMIN`, `COORDINADOR_VENTAS`, `GESTOR_ENTREGA`, `DESPACHADOR`, `PROVEEDOR`, `VENDEDOR`, `AUDITOR`).
- `nombre VARCHAR(150)`, `descripcion TEXT`, `nivel INT` (100 superadmin → 20 auditor; a mayor nivel, más poder).
- `sistema BOOLEAN` — si TRUE no se puede borrar desde la app.
- `estado VARCHAR(20)`.

**`seg_permisos` + `seg_recursos` — la matriz de permisos.**
- `seg_recursos`: `id_recurso`, `modulo` (ej. `VENTAS_CONTADO`), `codigo` (ej. `CONFIRMAR_ABONO`), `nombre`, `tipo` (`MODULO` o `ACCION`), `orden`.
- `seg_permisos`: `id_permiso VARCHAR(50)` PK, `tipo_sujeto VARCHAR(20)` (`ROL` o `USUARIO`), `id_sujeto VARCHAR(50)` (código de rol o id de usuario), `modulo`, `recurso`, `permitido BOOLEAN`, `alcance VARCHAR(50)` (`TOTAL`, `PROVEEDOR`, `OFICINA`, `GRUPO`, `PROPIO`), `estado`.
- Ejemplo: `ROL | DESPACHADOR | VENTAS_CONTADO | CONFIRMAR_ENTREGA | TRUE | PROPIO` = el despachador solo confirma entregas de su propio proveedor.

**`mae_proveedores / mae_oficinas / mae_grupos / rel_proveedor_oficinas` — estructura comercial.**
- `mae_proveedores`: `id_proveedor` PK, `razon_social`, `nombre_comercial`, `nombre`, `codigo_sap`, `ruc`, `alcance_catalogo` (`TOTAL` por defecto), `codigo_canales_venta TEXT` y `codigo_grupos_vendedores TEXT` (listas `id1|id2`), `estado`.
- `mae_oficinas`: `id_oficina` PK, `nombre`, `descripcion`, `estado`.
- `mae_grupos`: `id_grupo` PK, `id_oficina` FK (a qué sede pertenece), `nombre`, `descripcion`, `estado`.
- `rel_proveedor_oficinas`: `id_relacion` PK, `id_proveedor` FK, `id_oficina` FK, `ids_grupo TEXT` (`GRP-A|GRP-B`), `alcance_grupos` (`TODOS` o `SELECCIONADOS`), `estado`. Es la tabla que dice "este contratista vende en estas sedes".

**`vta_ventas_contado` — el corazón del negocio (cabecera del pedido).**
- IDs: `id_venta VARCHAR(50)` PK (`VTA-...`), `codigo_venta VARCHAR(50) UNIQUE` (visible, ej. `PED-360-1001`).
- Quién vendió (foto congelada): `id_usuario`, `correo_usuario`, `nombre_usuario`, `rol_usuario`, `id_proveedor` + `razon_social_proveedor`, `id_oficina` + `nombre_oficina`, `id_grupo` + `nombre_grupo`.
- Cliente/suministro: `numero_solicitud_sap`, `codigo_suministro`, `tipo/numero_documento_cliente`, `nombres/apellidos_cliente`, `telefono_contacto`, `correo_cliente`, `departamento/provincia/distrito`, `direccion_instalacion`, `referencia_direccion`.
- Dinero: `tipo_pago` (`DEPOSITO/TRANSFERENCIA`), `numero_operacion_bancaria`, `banco_abono`, `fecha_abono DATE`, `monto_abono NUMERIC(12,2)`, `monto_total_venta NUMERIC(12,2)`, `moneda` (`PEN`).
- Workflow: `estado_abono` (`PENDIENTE_CONFIRMACION`, `ABONO_CONFIRMADO`, `ABONO_OBSERVADO`, `NO_APLICA`), `estado_entrega` (`REGISTRADA`, `PROGRAMADA`, `EN_RUTA`, `ENTREGADA`, `RECHAZADA`, `OBSERVADA`, `ANULADA`, `POR_ENTREGAR`), `estado_general` (`EN_PROCESO`, `ANULADA`).
- Comprobante (migración 20260915): `url_comprobante TEXT`, `nombre_comprobante VARCHAR(200)`, `mime_comprobante VARCHAR(100)`, `estado_comprobante VARCHAR(30)`.
- Receptor autorizado (migración 20260915): `tipo_receptor` (`COMPRADOR` por defecto), `nombre_receptor`, `dni_receptor`, `telefono_receptor`, `parentesco_receptor`.
- Trazabilidad (migración 20260921): `abono_aprobado_id/nombre`, `programado_id/nombre`, `entregado_id/nombre` — quién hizo cada paso.
- Anulación (migración 20260915): `motivo_anulacion TEXT`, `fecha_anulacion TIMESTAMPTZ`.

**`vta_ventas_contado_detalle` — líneas del pedido.**
- `id_detalle_venta` PK, `id_venta` FK (borrado en cascada), `linea INT`.
- `id_material` FK a `mae_materiales`, `codigo_material`, `codigo_sap`, `descripcion_material TEXT`.
- `cantidad NUMERIC(10,2)`, `precio_unitario NUMERIC(12,2)`, `precio_total NUMERIC(12,2)`, `tiene_combo BOOLEAN`, `detalle_combo TEXT`.

**`vta_gestion_entrega` — qué pasa con el reparto.**
- `id_gestion_entrega` PK (`ENT-...`), `id_venta` FK, `id_proveedor`.
- `estado_entrega`, `motivo_observacion`, `detalle_observacion TEXT`.
- `fecha_programada_entrega DATE`, `fecha_real_entrega TIMESTAMPTZ`.
- Receptor real: `nombre_receptor`, `dni_receptor`, `parentesco_receptor`, `telefono_receptor`, `comentarios_transportista TEXT`, `usuario_registro`.

**`vta_evidencias_entrega` — fotos y documentos.**
- `id_evidencia` PK, `id_gestion_entrega` FK, `id_venta` FK, `id_proveedor`.
- `tipo_evidencia` (`BOLETA_ENTREGA`, `EVIDENCIA_RECEPCION`, `FOTO_PREDIO`, `FOTO_PRODUCTO`, `GUIA_REMISION`).
- `id_archivo TEXT`, `url_archivo TEXT` (obligatoria, apunta a Storage), `nombre_archivo`, `mime_archivo`, `tamano_bytes BIGINT`, `usuario_subida`.

**`pre_listas_precios` + `pre_lista_precio_detalle` — precios.**
- Cabecera: `id_lista_precio` PK, `codigo_lista UNIQUE`, `nombre`, `id_proveedor` FK (todo precio pertenece a un proveedor), `id_negocio/oficina/grupo` (segmentación), `fecha_inicio DATE` + `fecha_fin DATE` (vigencia mensual: día 1 → último día del mes), `moneda`, `estado` (`ACTIVA`), `responsable_venta TEXT` (migración 20260918), `es_catalogo BOOLEAN` (migración 20260922: TRUE = catálogo permanente del proveedor, FALSE = carga mensual).
- Detalle: `id_detalle_precio` PK, `codigo_precio`, `id_lista_precio` FK, `id_material` FK, `precio_base NUMERIC(12,2)`, `moneda`, `fee NUMERIC(5,2)` (% que se lleva Cálidda, oculto al PROVEEDOR en la app), `responsable_venta TEXT`, `cuotas_json TEXT` (reserva JSON `{"6":123.45,…}` para cuotas 0/6/9/12/18/24/36/48/60; el parser actual la ignora), `tiene_combo`, `detalle_combo`, `descripcion_combo`, `estado`.

**`pre_solicitudes_lista_precio` (+ detalle + historial) — flujo de aprobación.**
- Cabecera: `id_solicitud` PK, `codigo_solicitud UNIQUE`, `id_proveedor/negocio/oficina/grupo`, `alcance`, `fecha_inicio/fin`, `moneda`, `estado` (`PENDIENTE`, `EN_REVISION`, `APROBADA`, `RECHAZADA`, `PUBLICADA`), `usuario_solicitante`, `usuario_revisor`, `motivo_rechazo TEXT`.
- Detalle: fila del Excel propuesto (`numero_fila INT`, `codigo_sap`, `codigo_material`, `producto_principal`, `tipo/subtipo/marca`, `nombre_material`, `precio_propuesto NUMERIC(12,2)`, `tiene_combo`, `observaciones`, `estado`).
- Historial: `id_historial BIGSERIAL`, quién (`id_usuario/correo/rol`), `accion`, `estado_anterior/nuevo`, `comentario`, `fecha_hora`.

**`app_modulos` — el menú.**
- `id_modulo` PK (`MOD-SALES`…), `codigo UNIQUE` (`VENTAS_CONTADO`, `DASHBOARD_VENTAS`, `CALENDARIO_ENTREGAS`, `DESPACHO`, `MATERIALES_PRECIOS`, `PROVEEDORES`, `ADMIN_USUARIOS`, `ADMIN_PERMISOS`, `ADMIN_CONFIG_APP`, `ADMIN_AUDITORIA`), `nombre`, `icono`, `grupo_menu` (`OPERACIONES`, `GESTION`, `ADMINISTRACION`), `orden INT` (posición en el menú), `tipo_vista`, `estado` (`ACTIVO`/`INACTIVO`; `DESPACHO` hoy está `INACTIVO` por decisión del dueño).

**`sys_parametros` — interruptores del dueño.**
- `clave VARCHAR(100)` PK, `valor TEXT`, `descripcion`, `tipo` (`TEXTO`, `NUMERO`, `BOOLEANO`), `editable BOOLEAN`, `estado`.
- Claves reales: `NOMBRE_APLICACION`, `VERSION_APLICACION`, `EMPRESA_TITULAR`, `MONEDA_DEFECTO`, `EXPIRACION_SESION_MINUTOS` (480), `BONO_VENDEDOR_MONTO` (hoy `0`), `PERMITIR_REGISTRO_MULTIPLE_ITEMS`, `ALERTA_ENTREGA_DIAS_LIMITE`, `NEGOCIO_VENTAS_ACTIVO` (`GSD`).

**Auditoría — la bitácora.**
- `seg_sesiones`: `id_sesion` PK, `id_usuario` FK, `correo`, `rol`, `fecha_inicio`, `ultima_actividad`, `fecha_fin`, `estado` (`ACTIVA`, `CERRADA`, `EXPIRADA`), `modulo_actual`, `origen`, `user_agent`.
- `seg_auditoria_accesos`: `id_auditoria_acceso BIGSERIAL`, `fecha_hora`, `id_usuario/correo/rol`, `modulo`, `accion` (`INICIO_SESION`, `CIERRE_SESION`, `CIERRE_FORZADO_SESION`), `resultado`, `motivo`, `id_sesion`, `detalle JSONB`.
- `seg_auditoria_eventos`: lo mismo + `entidad`, `id_entidad` (qué objeto se tocó).
- `seg_auditoria_permisos`: `rol_objetivo`, `modulo`, `recurso`, `valor_anterior`, `valor_nuevo`, `alcance`, `motivo`.

### 3.2 Migraciones en orden (cómo y por qué se aplican)

Se aplican **en orden de fecha del nombre de archivo**, una por una en el SQL Editor. Todas son idempotentes.

1. `20260910_gsd_taxonomy.sql` — **Taxonomía comercial real.** Crea el parámetro `NEGOCIO_VENTAS_ACTIVO=GSD`, el negocio `NEG-GSD`, el producto contenedor `PROD-GSD` y genera tipos/subtipos GSD (Equipo, Celulares, Motos, Tablets…) derivados del Excel real. Sin esto, ventas y materiales no tienen a qué colgarse.
2. `20260911_audit_sessions_access.sql` — **Abre RLS de auditoría y sesiones** (`seg_sesiones`, `seg_auditoria_*`) para el rol `authenticated`. Sin esto la pantalla Auditoría salía vacía.
3. `20260911_material_taxonomy_access.sql` — **Abre RLS de taxonomía** (`mae_negocios`, `mae_productos_principales`, `mae_tipos/subtipos_material`, `mae_marcas`) para `authenticated`. Permite registrar materiales.
4. `20260911_permission_resources.sql` — **Siembra recursos** (`seg_recursos`) de Auditoría, Ventas, Materiales, Proveedores, Usuarios y Roles/Permisos. Es lo que pinta la Matriz de Permisos.
5. `20260915_dashboard_ventas.sql` — **Módulo Dashboard + columnas de venta.** Registra `DASHBOARD_VENTAS` (orden 5), sus 3 recursos, hereda permisos desde `VENTAS_CONTADO` y agrega a `vta_ventas_contado`: `motivo_anulacion`, `fecha_anulacion`, `url/nombre/mime/estado_comprobante`, `tipo/nombre/dni/telefono/parentesco_receptor`.
6. `20260917_calendario_entregas.sql` — **Módulo Calendario** (`CALENDARIO_ENTREGAS`, orden 15) + 3 recursos + herencia de permisos desde Ventas. Solo lectura de entregas por día.
7. `20260918_despacho.sql` — **Rol DESPACHADOR + módulo Despacho** (`DESPACHO`, orden 18) con 4 recursos y permisos propios (`PROPIO`) + herencia para quienes ya gestionaban entregas en Ventas.
8. `20260918_hana_precios.sql` — **Columnas GSD/HANA.** A `mae_materiales`: `proveedor`, `incluye_conexion`, `producto_principal`, `combo`, `codigo_hana` (= `codigo_sap`), `comentarios` + índices. A precios: `fee`, `responsable_venta` (detalle y cabecera). El `fee` es el % de Cálidda.
9. `20260919_carga_excel.sql` — **Reserva `cuotas_json TEXT`** en `pre_lista_precio_detalle` para guardar a futuro las cuotas 0/6/9/12/18/24/36/48/60 como JSON. El parser actual las ignora y graba el precio base.
10. `20260919_despacho_en_ventas.sql` — **Decisión del dueño: Despacho deja de ser módulo aparte.** Pone `DESPACHO` en `INACTIVO` y le da al rol `DESPACHADOR` 6 permisos dentro de `VENTAS_CONTADO` (ver, detalle, programar, confirmar, exportar, alcance `PROPIO`). Opera como pestaña dentro de Ventas.
11. `20260920_catalogo_proveedor.sql` — **Catálogos por proveedor (fase 1).** Agrega `id_proveedor VARCHAR(50)` a `app_catalogo_valores` + índice. `NULL` = visible para todos; con valor = solo ese proveedor.
12. `20260921_trazabilidad_bono.sql` — **Trazabilidad + bono.** Agrega a `vta_ventas_contado`: `abono_aprobado_id/nombre`, `programado_id/nombre`, `entregado_id/nombre`. Crea el parámetro `BONO_VENDEDOR_MONTO` (`0` PEN por venta). Es la base para saber quién hizo cada paso y cuánto bono genera cada vendedor.
13. `20260922_catalogo_proveedor.sql` — **Catálogo único por proveedor (fase 2, vigente).** Agrega `es_catalogo BOOLEAN DEFAULT FALSE` a `pre_listas_precios` + índice `(id_proveedor, es_catalogo)` + backfill que marca la lista más antigua de cada proveedor como su catálogo. Regla: cada proveedor tiene UN catálogo permanente (`es_catalogo=TRUE`, no eliminable) y N cargas mensuales (`FALSE`).

### 3.3 Seed inicial (qué datos crea `seed.sql`)

- **8 roles**: SUPERADMIN (100), ADMIN (90), COORDINADOR_VENTAS (70), GESTOR_ENTREGA (60), DESPACHADOR (50), PROVEEDOR (40), VENDEDOR (30), AUDITOR (20).
- **8 parámetros**: nombre/versión app, empresa, moneda PEN, expiración 480 min, `BONO_VENDEDOR_MONTO=0`, múltiples ítems TRUE, alerta 3 días.
- **10 módulos** (DESPACHO nace INACTIVO aquí; la migración 20260918 lo activó y la 20260919 lo volvió a desactivar).
- **4 oficinas** (Lima Norte/Sur/Centro, Callao) + **3 grupos** + **2 proveedores** (Cálidda Directo, SIGAS Perú).
- **3 usuarios**: superadmin Michael, admin Cálidda, vendedor demo.
- **Catálogo base**: 2 negocios, 3 productos, 4 marcas, 3 tipos, 3 materiales (cocina Mabe S/899, terma Bosch S/1150, terma Sole S/680) + lista oficial `LP-2026-OFICIAL` con sus 3 precios.
- **1 venta demo** (`PED-360-1001`, cocina Mabe, abono confirmado, entrega programada) con su detalle y gestión.

### 3.4 Edge Function `invite-user` (qué hace y por qué existe)

Archivo: `supabase/functions/invite-user/index.ts`. Es la **única vía segura para crear usuarios**:

1. Verifica que quien llama tenga sesión válida (`auth.getUser()`).
2. Lee `seg_usuarios` con la llave de servicio y exige `rol = SUPERADMIN` y `estado = ACTIVO`. Si no, responde 403.
3. Acción `CAMBIAR_CONTRASENA`: pide `idUsuario` + `nuevaContrasena` (mínimo 8 caracteres), busca el correo, ubica su cuenta en Auth y le actualiza la clave.
4. Acción invitar (por defecto): pide `correo + nombre + rol`, rechaza duplicados (409), llama a `auth.admin.inviteUserByEmail` (envía el correo de invitación), inserta el perfil en `seg_usuarios` con `USR-<uuid>`. Si el insert falla, **borra la cuenta de Auth** para no dejar huérfanos.
5. Todo responde JSON `{ correcto, mensaje, idUsuario }` con CORS abierto.

Sin desplegar esta función, el botón "Invitar usuario" falla con el mensaje "Despliega invite-user desde Edge Functions".

### 3.5 Estado del RLS (por qué todo es `USING(true)`)

Al final de `schema.sql` **todas las tablas activan RLS pero con política abierta**:

```sql
CREATE POLICY xxx_policy_all ON xxx FOR ALL USING (true) WITH CHECK (true);
```

Las migraciones 20260911 repiten el patrón para `authenticated`. Esto significa: **Supabase no filtra nada por sí solo; cualquier llave (anon/authenticated) puede leer y escribir todo.**

**Por qué es así hoy:** la seguridad real vive en el código JS (`js/supabase-client.js`): login contra `seg_usuarios`, sesión única en `seg_sesiones`, matriz `seg_permisos` con alcances (TOTAL/PROVEEDOR/OFICINA/GRUPO/PROPIO) verificada antes de cada operación, y la Edge Function que reserva la creación de usuarios al SUPERADMIN. Poner RLS estricto ahora rompería la app porque el frontend usa la llave pública, no JWT con claims personalizados.

**Qué hacer a futuro (cuando haya tiempo):** 1) mover escrituras sensibles a Edge Functions con `service_role`, 2) crear políticas RLS por `auth.uid()` ligado a `seg_usuarios`, 3) cerrar Storage (`evidencias` hoy es lectura pública), 4) auditar `seg_auditoria_*` como solo-inserción.

### 3.6 Cómo correr una migración (SQL Editor de Supabase)

1. Entra a tu proyecto en `supabase.com` → menú **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/XXXX_nombre.sql` de este repo, copia **todo** el contenido y pégalo en el editor.
3. Pulsa **Run** (o `Ctrl+Enter`). Espera el mensaje `Success. No rows returned`.
4. Repite en orden de fecha si son varias. Si una falla, lee el error, corrige y vuelve a correr: son idempotentes.
5. Verifica: por ejemplo `SELECT * FROM sys_parametros WHERE clave='BONO_VENDEDOR_MONTO';` o `SELECT codigo, estado FROM app_modulos ORDER BY orden;`.

## 4) Conexiones (qué código JS lee/escribe cada tabla)

Puente único: `js/supabase-client.js` (`executeSupabaseOperation`, `query`) + `js/api-adapter.js` (modo offline→Supabase). Los módulos llaman al puente, nunca a Supabase directo.

- `seg_usuarios` → login y perfiles. Lo lee `supabase-client.js` (autenticación, `obtenerDetalleSesion`), lo escribe `guardarUsuarioAdminMotor` (vía `invite-user`) y el alta de ventas congela `correo/nombre/rol`.
- `seg_roles` → `api-adapter.js` (diagnóstico) y pantallas Usuarios/Permisos para listar roles.
- `seg_recursos` + `seg_permisos` → `supabase-client.js` (carga permisos del rol al entrar, `exigirAccesoVenta` filtra por alcance antes de anular/gestionar/confirmar). Matriz de Permisos hace `upsert` en `seg_permisos`.
- `seg_sesiones` + `seg_auditoria_accesos/eventos` → `supabase-client.js` (crea/cierra/expire sesiones, registra `INICIO_SESION`, `CIERRE_SESION`, `CIERRE_FORZADO_SESION`, y cada operación con `registrarAuditoria`). Auditoría los lista.
- `app_modulos` → `supabase-client.js` (construye el menú por permisos). Config los edita.
- `app_catalogos/valores` (+ `id_proveedor`) → Config/Catálogos (`listarValoresCatalogo`, `guardarValorCatalogo`); los códigos `MP_*` en realidad leen `mae_negocios/marcas/productos/tipos/subtipos`.
- `sys_parametros` → `supabase-client.js` (`EXPIRACION_SESION_MINUTOS`, `BONO_VENDEDOR_MONTO` para mostrar el bono), `api-adapter.js` (sincroniza parámetros), Config (`guardarParametroAdminMotor`).
- `mae_proveedores/oficinas/grupos` + `rel_proveedor_oficinas` → Proveedores (`guardarProveedorModulo`, `cambiarEstadoProveedor`), ventas (selectores y congelado de nombres) y `ensureProveedorChain_` que autocrea proveedor/oficina/grupo/relación al cargar Excel o materiales.
- `mae_negocios/productos/tipos/subtipos/marcas/materiales` → Materiales y Precios (`guardarMaterialPrecioModulo`, `eliminarMaterialPrecioModulo` con validación de uso en precios y ventas).
- `pre_listas_precios` + `pre_lista_precio_detalle` → Materiales y Precios (`guardarListaOficial`, `guardarDetalleLista`, `guardarPrecioIndividual`, `eliminarListaOficial` que bloquea borrar si `es_catalogo=TRUE`, carga masiva GSD con `fee/responsable/cuotas`).
- `pre_solicitudes_*` → flujo de solicitudes de lista (el proveedor propone, Cálidda aprueba y publica como lista).
- `vta_ventas_contado` + `detalle` + `gestion` + `evidencias` → Ventas (`guardarVentaContado`, `modificarVenta`, `anularVenta` con motivo, `confirmar/observarAbono`, `guardarGestionEntrega`, Dashboard/Calendario/Despacho que leen las tres tablas juntas). El comprobante sube al bucket `evidencias` y su URL queda en la venta.
- `functions/invite-user` → la invoca `guardarUsuarioAdminMotor` con `client.functions.invoke("invite-user", …)` tanto para invitar como para cambiar contraseña.

## 5) Si quieres cambiar X, toca Y

1. **Nuevo campo en ventas (ej. `canal_origen`).** Toca: ① nuevo `ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS canal_origen TEXT;` en un archivo nuevo `supabase/migrations/2026XXXX_campo_ventas.sql`, ② córrelo en SQL Editor, ③ agrega el input en el formulario de ventas (JS del módulo) y ④ incluye el campo en `guardarVentaContadoModulo` de `js/supabase-client.js`. No edites `schema.sql` viejo: las instalaciones existentes solo leen migraciones.
2. **Nuevo parámetro configurable (ej. `TOPE_DESCUENTO_PCT`).** Toca: ① `INSERT INTO sys_parametros (clave, valor, …) ON CONFLICT DO NOTHING` en una migración nueva, ② léelo en JS con `query("sys_parametros")` o `select valor where clave=…`, ③ exponlo en Config (`guardarParametroAdminMotor` ya lo guarda sin código extra si la clave es editable).
3. **Nuevo rol (ej. `SUPERVISOR_ZONA`).** Toca: ① `INSERT INTO seg_roles …` + `INSERT INTO seg_recursos` si necesita acciones nuevas, ② `INSERT INTO seg_permisos` con su `alcance` (ej. `OFICINA`), ③ verifica el menú: sin `VISUALIZAR_MODULO` el módulo no aparece. Todo en una migración nueva, no a mano en el dashboard.
4. **Nueva columna de precio (ej. `descuento_max`).** Toca: ① `ALTER TABLE pre_lista_precio_detalle ADD COLUMN …` en migración, ② `guardarDetalleListaPrecioModulo` / `guardarPrecioIndividualMaterialesPreciosModulo` en `js/supabase-client.js` para grabarla, ③ la tabla del módulo Materiales y Precios para mostrarla. Recuerda: el `fee` se oculta al PROVEEDOR; replica ese `if` si el dato es sensible.
5. **Endurecer seguridad (cerrar el RLS abierto).** Toca: ① no cambies JS primero; crea las políticas `FOR ALL TO authenticated USING (…)` por tabla en una migración de prueba, ② mueve altas de usuarios y cambios de clave a `invite-user` (ya lo están), ③ mueve operaciones críticas (anular, confirmar abono) a Edge Functions con `service_role`, ④ recién entonces reemplaza los `USING(true)`. Hacerlo al revés deja la app sin datos (listas vacías) o bloqueada.
