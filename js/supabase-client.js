/**
 * CÁLIDDA 360 / SEGUIMIENTO 360 — CLIENTE SUPABASE
 * Inicializa y administra la conexión con Supabase (PostgreSQL + Auth + Storage)
 */

(function(window) {
  "use strict";

  const config = window.APP_CONFIG || {};
  let supabaseInstance = null;

  function initSupabase() {
    const url = config.SUPABASE_URL || window.localStorage.getItem("S360_SUPABASE_URL");
    const key = config.SUPABASE_ANON_KEY || window.localStorage.getItem("S360_SUPABASE_ANON_KEY");

    if (url && key && window.supabase) {
      try {
        supabaseInstance = window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.info("[SGT360] Conectado exitosamente a Supabase:", url);
      } catch (err) {
        console.error("[SGT360] Error al inicializar cliente Supabase:", err);
      }
    } else {
      console.warn("[SGT360] Sin credenciales activas de Supabase. Operando en Modo Autónomo / Demo.");
    }
  }

  // Inicializar al cargar
  initSupabase();

  window.supabaseClient = {
    getClient: function() {
      if (!supabaseInstance) initSupabase();
      return supabaseInstance;
    },
    isConfigured: function() {
      return !!supabaseInstance;
    },
    reconfigure: function(url, key) {
      window.localStorage.setItem("S360_SUPABASE_URL", url);
      window.localStorage.setItem("S360_SUPABASE_ANON_KEY", key);
      config.SUPABASE_URL = url;
      config.SUPABASE_ANON_KEY = key;
      initSupabase();
      return !!supabaseInstance;
    },
    clearConfig: function() {
      window.localStorage.removeItem("S360_SUPABASE_URL");
      window.localStorage.removeItem("S360_SUPABASE_ANON_KEY");
      config.SUPABASE_URL = "";
      config.SUPABASE_ANON_KEY = "";
      supabaseInstance = null;
    },

    // Subida de archivos (Evidencias de entrega, fotos, adjuntos)
    subirArchivoEvidencia: async function(archivo, nombreRuta) {
      if (!supabaseInstance) {
        // Simulación en modo demo
        return {
          correcto: true,
          urlPublica: URL.createObjectURL(archivo),
          idArchivo: "DEMO-FILE-" + Date.now()
        };
      }

      const bucket = config.STORAGE_BUCKETS.EVIDENCIAS || "evidencias";
      const path = nombreRuta || `entrega_${Date.now()}_${archivo.name}`;

      const { data, error } = await supabaseInstance.storage
        .from(bucket)
        .upload(path, archivo, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) {
        throw new Error("Error al subir archivo a Supabase Storage: " + error.message);
      }

      const { data: publicUrlData } = supabaseInstance.storage
        .from(bucket)
        .getPublicUrl(path);

      return {
        correcto: true,
        urlPublica: publicUrlData.publicUrl,
        idArchivo: data.path
      };
    }
  };
})(window);
