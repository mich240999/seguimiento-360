/**
 * CÁLIDDA 360 / SEGUIMIENTO 360 — CONFIGURACIÓN DE ENTORNO
 * Configuración de cliente para despliegue en Vercel, GitHub Pages o Local
 */

window.APP_CONFIG = {
  // Nombre y metadatos de la aplicación
  APP_NAME: "Seguimiento 360",
  VERSION: "2.5.0",
  ENTORNO: "PRODUCCION", // PRODUCCION, DESARROLLO, DEMO
  
  // Configuración de Supabase (Se puede configurar aquí o mediante LocalStorage en la interfaz)
  // Reemplaza con los valores de tu proyecto en https://supabase.com
  SUPABASE_URL: window.localStorage.getItem("S360_SUPABASE_URL") || "https://acmfxabypytwcxhuxjti.supabase.co",
  SUPABASE_ANON_KEY: window.localStorage.getItem("S360_SUPABASE_ANON_KEY") || "sb_publishable_MkgovaxwDuXvhUFv91Ng7w_y-9JuvBi",

  // Modo Autónomo: Si no hay credenciales de Supabase, el sistema opera en modo Demo Interactivo
  // permitiendo probar todos los módulos y bandejas de inmediato.
  ENABLE_AUTO_DEMO_FALLBACK: true,

  // Configuración de almacenamiento (Buckets)
  STORAGE_BUCKETS: {
    EVIDENCIAS: "evidencias",
    RECURSOS: "recursos",
    IMPORTACIONES: "importaciones"
  },

  // Ajustes de interfaz
  SESSION_TIMEOUT_MINUTES: 480, // 8 horas
  MONEDA_DEFECTO: "PEN"
};

// Configuración cargada para el loader del sistema
window.__C360_LOADER_CONFIG__ = {
  nombreAplicacion: window.APP_CONFIG.APP_NAME,
  version: window.APP_CONFIG.VERSION,
  faviconSource: "https://www.calidda.com.pe/favicon.ico"
};

// Correcciones visuales finales. Se inyectan desde un archivo que ya carga el index,
// evitando modificar el flujo principal de autenticación.
(function injectFinalVisualFixes() {
  var style = document.createElement("style");
  style.id = "s360-final-visual-fixes";
  style.textContent = `
    @media (min-width: 1025px) {
      .app-shell.is-sidebar-collapsed .sidebar-brand {
        position: relative;
        width: var(--sidebar-collapsed-width);
        min-width: var(--sidebar-collapsed-width);
        height: var(--app-header-height);
        padding: 0 !important;
        margin: 0;
        display: block;
      }
      .app-shell.is-sidebar-collapsed .sidebar-logo-button {
        position: absolute;
        inset: 0;
        width: var(--sidebar-collapsed-width);
        height: var(--app-header-height);
        margin: 0 !important;
        padding: 0 !important;
        display: grid !important;
        place-items: center !important;
        justify-content: center !important;
        align-items: center !important;
      }
      .app-shell.is-sidebar-collapsed .sidebar-logo-button .sidebar-logo,
      .app-shell.is-sidebar-collapsed .sidebar-logo-button .sidebar-logo-image {
        position: static !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px;
        min-height: 34px;
        margin: 0 !important;
        padding: 0;
        transform: none !important;
      }
      .app-shell.is-sidebar-collapsed .sidebar-brand-copy,
      .app-shell.is-sidebar-collapsed #sidebarCloseButton {
        display: none !important;
      }
    }

    /* Loader idéntico al lenguaje visual del login: mismo fondo, trama y contraste. */
    .global-loader {
      background: linear-gradient(145deg, var(--primary-800), var(--primary-500)) !important;
    }
    .global-loader::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      background-image: radial-gradient(rgba(255,255,255,.17) 1px, transparent 1px) !important;
      background-size: 26px 26px !important;
      opacity: .55;
      pointer-events: none;
    }
    .global-loader::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      background:
        radial-gradient(circle at 18% 22%, rgba(255,255,255,.12), transparent 32%),
        radial-gradient(circle at 82% 78%, rgba(0,0,0,.10), transparent 38%);
      pointer-events: none;
    }
    .global-loader .loader-panel {
      z-index: 2;
      color: var(--ink);
      background: rgba(255,255,255,.95) !important;
      border: 1px solid rgba(255,255,255,.68) !important;
      box-shadow: 0 30px 90px rgba(0,54,78,.27) !important;
      backdrop-filter: blur(14px) !important;
      -webkit-backdrop-filter: blur(14px) !important;
    }
  `;
  document.head.appendChild(style);
})();
