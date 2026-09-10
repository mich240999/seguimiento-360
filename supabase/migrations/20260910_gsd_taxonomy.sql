-- Configuración comercial real: el único negocio de venta es GSD.
-- "GSD" como producto es el contenedor técnico exigido por MAE_SUBTIPOS_MATERIAL.
INSERT INTO sys_parametros (clave, valor, descripcion, tipo, editable, estado)
VALUES ('NEGOCIO_VENTAS_ACTIVO', 'GSD', 'Código del negocio habilitado para ventas.', 'TEXTO', TRUE, 'ACTIVO')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, descripcion = EXCLUDED.descripcion, estado = 'ACTIVO';

INSERT INTO mae_negocios (id_negocio, codigo_negocio, nombre, descripcion, estado)
VALUES ('NEG-GSD', 'GSD', 'GSD', 'Negocio comercial habilitado para ventas.', 'ACTIVO')
ON CONFLICT (id_negocio) DO UPDATE SET codigo_negocio = EXCLUDED.codigo_negocio, nombre = EXCLUDED.nombre, estado = 'ACTIVO';

INSERT INTO mae_productos_principales (id_producto, id_negocio, codigo_producto, nombre, descripcion, estado)
VALUES ('PROD-GSD', 'NEG-GSD', 'GSD', 'GSD', 'Contenedor de la clasificación comercial GSD.', 'ACTIVO')
ON CONFLICT (id_producto) DO UPDATE SET id_negocio = EXCLUDED.id_negocio, nombre = EXCLUDED.nombre, estado = 'ACTIVO';

WITH source(tipo, subtipo) AS (VALUES
 ('Equipo','TABLETS'),('EXTRACTORAS',NULL),('Equipo','Aspiradora'),('EQUIPO DE SONIDO',NULL),('VENTILADORES',NULL),('COMPUTO',NULL),('ESTUFAS',NULL),('TERMAS',NULL),('Equipo','REFRIGERADORAS'),('Equipo','MOTOS'),('MOTOS',NULL),('SANDWICHERAS',NULL),('Equipo','Purificador'),('PLANCHAS',NULL),('FRIGOBAR',NULL),('MONITORES',NULL),('Punto',NULL),('CELULARES REACONDICIONADOS',NULL),('Equipo','GAMER'),('Equipo','CONGELADORAS'),('REFRIGERADORAS',NULL),('Equipo','LAVADORAS'),('Lavadora',NULL),('SECADORAS',NULL),('TELEVISORES',NULL),('CAFETERAS',NULL),('VISICOOLERS',NULL),('WAFLERAS',NULL),('Equipo','TABLET'),('CELULARES',NULL),('MICROONDAS',NULL),('OLLAS ARROCERAS',NULL),('AUDIFONOS',NULL),('Cocina',NULL),('LAVADORAS',NULL),('LICUADORAS',NULL),('PARLANTES',NULL),('HERVIDORAS',NULL),('DUCTERIA',NULL),('INGRESO SEGURO',NULL),('Equipo','CELULARES'),('Equipo','Equipo de sonido'),('Equipo','Cama'),('Equipo','COLCHONES'),('Equipo','VENTILADORES'),('MATERIALES DE CONSTRUCCIÓN',NULL),('ACCESORIOS MOTOS',NULL),('SCOOTERS',NULL),('Equipo','Frigobar'),('Terma',NULL),('Equipo','LAPTOPS'),('Equipo','Consola de juegos'),('Centro de Lavado',NULL),('PARRILLAS',NULL),('Equipo','Audífonos'),('BATIDORAS',NULL),('Equipo','Scooter'),('Equipo','TELEVISORES'),('Equipo','Mini electro'),('GAMER',NULL),('Punto adicional',NULL),('LAPTOPS',NULL),('IMPRESORAS',NULL),('LAVASECAS',NULL),('AIRE ACONDICIONADO',NULL),('FREIDORAS DE AIRE',NULL),('CONGELADORAS',NULL),('JUEGO DE DORMITORIO',NULL),('Equipo','REFRIGERADOR'),('Equipo','Aire acondicionado'),('EXPRIMIDORES',NULL),('Equipo','Reloj'),('Secadora',NULL),('Equipo','IMPRESORAS'),('SEGURO',NULL),('TABLETS',NULL),('Equipo',NULL),('ACCESORIOS',NULL),('CARGADORES',NULL),('COCINAS',NULL),('Equipo','CAMPANAS'),('MOTOS ELECTRICAS',NULL),('COLCHONES',NULL),('Equipo','Casco'),('TOSTADORAS',NULL),('HORNO',NULL),('CAMPANAS',NULL),('RELOJES INTELIGENTES',NULL),('HORNOS',NULL),('ASPIRADORAS',NULL)
), tipos AS (SELECT DISTINCT trim(tipo) tipo FROM source)
INSERT INTO mae_tipos_material (id_tipo_material, codigo_tipo, nombre, estado)
SELECT 'TIP-GSD-' || substr(md5(upper(tipo)),1,16), 'GSD-' || substr(md5(upper(tipo)),1,16), tipo, 'ACTIVO' FROM tipos
ON CONFLICT (codigo_tipo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = 'ACTIVO';

WITH source(tipo, subtipo) AS (VALUES
 ('Equipo','TABLETS'),('Equipo','Aspiradora'),('Equipo','REFRIGERADORAS'),('Equipo','MOTOS'),('Equipo','Purificador'),('Equipo','GAMER'),('Equipo','CONGELADORAS'),('Equipo','LAVADORAS'),('Equipo','TABLET'),('Equipo','CELULARES'),('Equipo','Equipo de sonido'),('Equipo','Cama'),('Equipo','COLCHONES'),('Equipo','VENTILADORES'),('Equipo','Frigobar'),('Equipo','LAPTOPS'),('Equipo','Consola de juegos'),('Equipo','Audífonos'),('Equipo','Scooter'),('Equipo','TELEVISORES'),('Equipo','Mini electro'),('Equipo','REFRIGERADOR'),('Equipo','Aire acondicionado'),('Equipo','Reloj'),('Equipo','IMPRESORAS'),('Equipo','CAMPANAS'),('Equipo','Casco')
)
INSERT INTO mae_subtipos_material (id_subtipo_material, id_producto, id_tipo_material, codigo_subtipo, nombre, estado)
SELECT 'SUB-GSD-' || substr(md5(upper(tipo)||'|'||upper(subtipo)),1,16), 'PROD-GSD', 'TIP-GSD-' || substr(md5(upper(tipo)),1,16), 'GSD-' || substr(md5(upper(tipo)||'|'||upper(subtipo)),1,16), subtipo, 'ACTIVO' FROM source
ON CONFLICT (id_subtipo_material) DO UPDATE SET nombre = EXCLUDED.nombre, estado = 'ACTIVO';
