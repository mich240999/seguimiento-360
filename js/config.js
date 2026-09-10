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
