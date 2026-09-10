# Seguimiento 360 — Cálidda Gas Natural (Plataforma Web + Supabase)

Sistema integral de gestión de operaciones, ventas al contado, control de contratistas, listas de precios, gasodomésticos y trazabilidad de entregas 360°.

Esta versión ha sido completamente desacoplada de Google Apps Script y optimizada para ejecutarse en la web moderna con **Supabase (PostgreSQL)** como backend y despliegue directo en **Vercel** o **GitHub Pages**.

---

## 📁 Estructura del Proyecto

```plaintext
Seguimiento 360/
├── index.html                   # Aplicación web completa y modular (HTML5)
├── vercel.json                  # Configuración de despliegue y seguridad en Vercel
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD automatizado para GitHub Pages
├── css/
│   ├── app-styles.css           # Tema visual corporativo Cálidda, layout y modales
│   └── prov-styles.css          # Estilos de gestión y visualización de contratistas
├── js/
│   ├── config.js                # Variables de entorno y llaves de Supabase
│   ├── supabase-client.js       # Inicializador y utilidades de Supabase JS SDK
│   ├── api-adapter.js           # Adaptador RPC que conecta con Supabase o Modo Demo
│   ├── app-core.js              # Núcleo de la app, sesiones, eventos y navegación
│   └── modules/
│       ├── admin.js             # Módulo de administración (usuarios, roles, auditoría)
│       ├── providers.js         # Directorio de proveedores y sedes
│       ├── materials-prices.js  # Catálogo de materiales, marcas y listas de precios
│       ├── sales.js             # Ventas al contado, abonos y seguimiento 360
│       └── dynamic.js           # Motor de módulos y formularios configurables
└── supabase/
    ├── schema.sql               # Esquema relacional PostgreSQL (21 tablas, RLS, triggers)
    └── seed.sql                 # Datos semilla iniciales (roles, usuarios, catálogos)
```

---

## 🚀 Guía de Instalación y Puesta en Marcha

### Paso 1: Configurar la Base de Datos en Supabase

1. Ingresa a [https://supabase.com](https://supabase.com) y crea un nuevo proyecto (ej. `calidda-seguimiento-360`).
2. En el panel lateral, dirígete a **SQL Editor**.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql), copia todo su contenido, pégalo en el editor SQL y haz clic en **Run**.
   - Esto creará las 21 tablas relacionales, índices, disparadores y políticas de seguridad (RLS).
4. Luego, abre el archivo [`supabase/seed.sql`](supabase/seed.sql), copia su contenido, pégalo en el editor SQL y haz clic en **Run**.
   - Esto insertará los roles de sistema (`SUPERADMIN`, `ADMIN`, `VENDEDOR`, etc.), parámetros base, catálogos de gasodomésticos y el usuario administrador inicial.
5. Ve a la sección **Storage** y confirma que se crearon los siguientes buckets públicos:
   - `evidencias`: Para fotos, boletas de entrega y actas firmadas en campo.
   - `recursos`: Para logos e imágenes del sistema.

---

### Paso 2: Vincular las Credenciales de Supabase

Tienes dos formas muy sencillas de conectar la app con Supabase:

#### Opción A (Desde la propia interfaz web):
1. Abre la aplicación en tu navegador.
2. En la esquina inferior derecha verás un botón flotante: **"Modo Demo (Configurar Supabase)"**.
3. Haz clic en él y pega tu **Project URL** y tu **Anon Public Key** (obtenidos en *Project Settings > API* en Supabase).
4. Haz clic en **Guardar y Conectar**. ¡Listo! Las credenciales se guardan de forma segura en tu navegador.

#### Opción B (En el archivo de configuración):
Abre [`js/config.js`](js/config.js) y coloca tus claves directamente:
```javascript
window.APP_CONFIG = {
  SUPABASE_URL: "https://xyzcompany.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  // ...
};
```

> **Nota:** Si no se ingresan credenciales, el sistema activa automáticamente el **Modo Demo Interactivo**, permitiéndote navegar por todos los módulos, probar formularios, registrar ventas y confirmar pedidos con datos de demostración precargados.

---

### Paso 3: Despliegue en Vercel

1. Sube esta carpeta a tu repositorio en GitHub (ej. `seguimiento-360`).
2. Ingresa a [https://vercel.com](https://vercel.com) y haz clic en **Add New Project**.
3. Selecciona tu repositorio.
4. En la configuración de build:
   - **Framework Preset**: *Other*
   - **Root Directory**: `./` (o la carpeta raíz donde se encuentra `index.html`)
5. Haz clic en **Deploy**. Gracias a [`vercel.json`](vercel.json), el despliegue es inmediato y sin errores.

---

### Paso 4: Despliegue en GitHub Pages

1. Sube el código a tu repositorio de GitHub.
2. Ve a la pestaña **Settings** del repositorio.
3. En el menú lateral izquierdo, haz clic en **Pages**.
4. En **Build and deployment > Source**, selecciona: **GitHub Actions**.
5. Al hacer push a la rama `main` o `master`, el workflow configurado en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publicará la aplicación automáticamente.

---

### Paso 5: Prueba Local (Opcional)

Si deseas probar la aplicación localmente en tu computadora:

Con Python (incluido en Windows):
```powershell
python -m http.server 8080
```
Luego abre tu navegador en: `http://localhost:8080`

---

## 🛡️ Usuarios de Demostración Iniciales

| Correo | Rol | Descripción |
| :--- | :--- | :--- |
| `admin@calidda.com.pe` | **SUPERADMIN** | Acceso total a todos los módulos y configuración |
| `usuario.demo@calidda.com.pe` | **VENDEDOR** | Asesor comercial para registro de ventas |
| `gestor.entrega@calidda.com.pe` | **GESTOR_ENTREGA** | Programación y confirmación de entregas en campo |
