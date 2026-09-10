import os
import re

def read_src(filename):
    p = os.path.join("source_gas", filename)
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""

# Read HTML views
html_login = read_src("HTML_100_AUTH_Login.html")
html_shell = read_src("HTML_130_APP_Shell.html")
html_adm = read_src("HTML_300_ADM_Workspace.html")
html_prov = read_src("HTML_320_PROV_Workspace.html")
html_mp = read_src("HTML_340_MP_Workspace.html")
html_sales = read_src("HTML_360_SALES_Workspace.html")
html_ui = read_src("HTML_900_UI_Components.html")

# Remove any <?!= include(...) ?> or similar GAS template tags if present
cleaned_views = []
for val in [html_login, html_shell, html_adm, html_prov, html_mp, html_sales, html_ui]:
    val = re.sub(r'<\?!=.*?\?>', '', val)
    cleaned_views.append(val)

[html_login, html_shell, html_adm, html_prov, html_mp, html_sales, html_ui] = cleaned_views

supabase_modal = """
<!-- MODAL DE CONFIGURACIÓN SUPABASE -->
<div id="modalConfigSupabase" class="s360-modal-backdrop" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(8px); z-index:99999; align-items:center; justify-content:center;">
  <div style="background:#1E293B; border:1px solid #475569; border-radius:16px; width:90%; max-width:520px; padding:24px; box-shadow:0 20px 40px rgba(0,0,0,0.4); color:#F8FAFC; font-family:'Inter',sans-serif;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
      <h3 style="font-size:1.1rem; font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
        <i class="fas fa-database" style="color:#10B981;"></i> Configuración de Supabase
      </h3>
      <button onclick="document.getElementById('modalConfigSupabase').style.display='none'" style="background:none; border:none; color:#94A3B8; font-size:1.2rem; cursor:pointer;">&times;</button>
    </div>
    <p style="font-size:0.85rem; color:#94A3B8; margin-bottom:16px;">
      Ingresa las credenciales de tu proyecto en Supabase para sincronizar usuarios, catálogos, materiales y pedidos en tiempo real. Si se deja en blanco, la aplicación operará en <strong>Modo Demo Interactivo</strong>.
    </p>
    <div style="margin-bottom:12px;">
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94A3B8; margin-bottom:4px;">Project URL</label>
      <input id="inputSupabaseUrl" type="text" placeholder="https://tu-proyecto.supabase.co" style="width:100%; padding:10px 12px; background:#0F172A; border:1px solid #334155; border-radius:8px; color:#fff; font-size:0.85rem;" />
    </div>
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94A3B8; margin-bottom:4px;">Anon Public Key (anon key)</label>
      <input id="inputSupabaseKey" type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." style="width:100%; padding:10px 12px; background:#0F172A; border:1px solid #334155; border-radius:8px; color:#fff; font-size:0.85rem;" />
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px;">
      <button onclick="guardarCredencialesSupabase(true)" style="background:#334155; border:none; color:#F8FAFC; padding:8px 16px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer;">Modo Demo</button>
      <button onclick="guardarCredencialesSupabase(false)" style="background:#10B981; border:none; color:#fff; padding:8px 18px; border-radius:8px; font-weight:700; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:6px;">
        <i class="fas fa-plug"></i> Guardar y Conectar
      </button>
    </div>
  </div>
</div>

"""

template = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seguimiento 360 — Cálidda Gas Natural</title>
  
  <!-- FAVICON -->
  <link rel="icon" type="image/png" href="https://www.calidda.com.pe/favicon.ico">
  
  <!-- FUENTES GOOGLE -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  
  <!-- ICONOS Y ESTILOS EXTERNOS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap-grid.min.css">
  
  <!-- ESTILOS LOCALES DEL SISTEMA -->
  <link rel="stylesheet" href="css/app-styles.css">
  <link rel="stylesheet" href="css/prov-styles.css">
  
  <!-- LIBRERÍAS EXTERNAS JS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body class="is-loading">

  <!-- MÓDULO DE LOGIN / ACCESO -->
  <!-- LOGIN_PLACEHOLDER -->

  <!-- APP SHELL / CONTENEDOR PRINCIPAL -->
  <!-- SHELL_PLACEHOLDER -->

  <!-- ESPACIOS DE TRABAJO (WORKSPACES) -->
  <!-- ADM_PLACEHOLDER -->
  <!-- PROV_PLACEHOLDER -->
  <!-- MP_PLACEHOLDER -->
  <!-- SALES_PLACEHOLDER -->
  <!-- UI_PLACEHOLDER -->

  <!-- SUPABASE_MODAL_PLACEHOLDER -->

  <!-- CONFIGURACIÓN Y CLIENTE SUPABASE -->
  <script src="js/config.js"></script>
  <script src="js/supabase-client.js"></script>
  <script src="js/api-adapter.js"></script>

  <!-- SCRIPTS DEL NÚCLEO Y MÓDULOS -->
  <script src="js/app-core.js"></script>
  <script src="js/modules/admin.js"></script>
  <script src="js/modules/providers.js"></script>
  <script src="js/modules/materials-prices.js"></script>
  <script src="js/modules/sales.js"></script>
  <script src="js/modules/dynamic.js"></script>

  <!-- CONTROLADOR DEL MODAL DE CONFIGURACIÓN SUPABASE -->
  <script>
    function actualizarIndicadorSupabase() {
      var isConf = window.supabaseClient && window.supabaseClient.isConfigured();
      var dot = document.getElementById("dotSupabaseStatus");
      var txt = document.getElementById("textSupabaseStatus");
      var urlInput = document.getElementById("inputSupabaseUrl");
      var keyInput = document.getElementById("inputSupabaseKey");
      
      if (urlInput) urlInput.value = window.APP_CONFIG.SUPABASE_URL || "";
      if (keyInput) keyInput.value = window.APP_CONFIG.SUPABASE_ANON_KEY || "";

      if (isConf) {
        if (dot) dot.style.background = "#10B981";
        if (txt) txt.textContent = "Supabase Conectado";
      } else {
        if (dot) dot.style.background = "#F59E0B";
        if (txt) txt.textContent = "Modo Demo (Configurar Supabase)";
      }
    }

    function guardarCredencialesSupabase(limpiar) {
      if (limpiar) {
        window.supabaseClient.clearConfig();
        alert("Modo Demo Interactivo activado.");
      } else {
        var url = (document.getElementById("inputSupabaseUrl").value || "").trim();
        var key = (document.getElementById("inputSupabaseKey").value || "").trim();
        if (!url || !key) {
          alert("Por favor ingresa la URL y la Anon Key de Supabase.");
          return;
        }
        window.supabaseClient.reconfigure(url, key);
        alert("¡Credenciales guardadas! Conectado a Supabase.");
      }
      document.getElementById("modalConfigSupabase").style.display = "none";
      actualizarIndicadorSupabase();
      if (window.location.reload) window.location.reload();
    }

    document.addEventListener("DOMContentLoaded", function() {
      actualizarIndicadorSupabase();
      var badge = document.getElementById("badgeSupabaseStatus");
      if (badge) badge.addEventListener("click", function() {
        document.getElementById("modalConfigSupabase").style.display = "flex";
      });
    });
  </script>
</body>
</html>
"""

output = (
    template
    .replace("<!-- LOGIN_PLACEHOLDER -->", html_login)
    .replace("<!-- SHELL_PLACEHOLDER -->", html_shell)
    .replace("<!-- ADM_PLACEHOLDER -->", html_adm)
    .replace("<!-- PROV_PLACEHOLDER -->", html_prov)
    .replace("<!-- MP_PLACEHOLDER -->", html_mp)
    .replace("<!-- SALES_PLACEHOLDER -->", html_sales)
    .replace("<!-- UI_PLACEHOLDER -->", html_ui)
    .replace("<!-- SUPABASE_MODAL_PLACEHOLDER -->", supabase_modal)
)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(output)

print("Generated index.html successfully!")
