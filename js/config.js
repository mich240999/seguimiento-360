/**
 * CÁLIDDA 360 / SEGUIMIENTO 360 — CONFIGURACIÓN DE ENTORNO
 * Configuración de cliente para despliegue en Vercel, GitHub Pages o Local
 */

window.APP_CONFIG = {
  APP_NAME: "Seguimiento 360",
  VERSION: "2.5.0",
  ENTORNO: "PRODUCCION",
  SUPABASE_URL: window.localStorage.getItem("S360_SUPABASE_URL") || "https://acmfxabypytwcxhuxjti.supabase.co",
  SUPABASE_ANON_KEY: window.localStorage.getItem("S360_SUPABASE_ANON_KEY") || "sb_publishable_MkgovaxwDuXvhUFv91Ng7w_y-9JuvBi",
  ENABLE_AUTO_DEMO_FALLBACK: true,
  STORAGE_BUCKETS: {
    EVIDENCIAS: "evidencias",
    RECURSOS: "recursos",
    IMPORTACIONES: "importaciones"
  },
  SESSION_TIMEOUT_MINUTES: 480,
  MONEDA_DEFECTO: "PEN"
};

window.__C360_LOADER_CONFIG__ = {
  nombreAplicacion: window.APP_CONFIG.APP_NAME,
  version: window.APP_CONFIG.VERSION,
  faviconSource: "https://www.calidda.com.pe/favicon.ico"
};

(function injectFinalVisualFixes() {
  var style = document.createElement("style");
  style.id = "s360-final-visual-fixes";
  style.textContent = `
    @media (min-width: 1025px) {
      .app-shell.is-sidebar-collapsed .sidebar-brand {
        position: relative; width: var(--sidebar-collapsed-width); min-width: var(--sidebar-collapsed-width);
        height: var(--app-header-height); padding: 0 !important; margin: 0; display: block;
      }
      .app-shell.is-sidebar-collapsed .sidebar-logo-button {
        position: absolute; inset: 0; width: var(--sidebar-collapsed-width); height: var(--app-header-height);
        margin: 0 !important; padding: 0 !important; display: grid !important; place-items: center !important;
      }
      .app-shell.is-sidebar-collapsed .sidebar-logo-button .sidebar-logo,
      .app-shell.is-sidebar-collapsed .sidebar-logo-button .sidebar-logo-image {
        position: static !important; width: 34px !important; height: 34px !important;
        min-width: 34px; min-height: 34px; margin: 0 !important; padding: 0; transform: none !important;
      }
      .app-shell.is-sidebar-collapsed .sidebar-brand-copy,
      .app-shell.is-sidebar-collapsed #sidebarCloseButton { display: none !important; }
    }

    /* Loader: misma imagen de /img y mismo lenguaje visual del login. */
    .global-loader {
      background:
        linear-gradient(135deg, rgba(7,91,120,.74), rgba(0,161,222,.48)),
        url('../img/calidda-building.png') center center / cover no-repeat !important;
    }
    .global-loader::before {
      content: ""; position: absolute; inset: 0; z-index: 0;
      background-image: radial-gradient(rgba(255,255,255,.17) 1px, transparent 1px) !important;
      background-size: 26px 26px !important; opacity: .45; pointer-events: none;
    }
    .global-loader::after {
      content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(circle at 18% 22%, rgba(255,255,255,.16), transparent 32%), radial-gradient(circle at 82% 78%, rgba(0,0,0,.18), transparent 38%);
    }
    .global-loader .loader-panel {
      z-index: 2; color: var(--ink); background: rgba(255,255,255,.70) !important;
      border: 1px solid rgba(255,255,255,.78) !important;
      box-shadow: 0 30px 90px rgba(0,54,78,.34), 0 2px 0 rgba(255,255,255,.82) inset !important;
      backdrop-filter: blur(24px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(24px) saturate(120%) !important;
    }

    /* ================================================================
       VIDRIO ESMERILADO REAL PARA LOS MÓDULOS
       Conserva el blanco, pero lo convierte en una superficie de vidrio:
       translucidez blanca + desenfoque del fondo + borde luminoso + sombra.
       La clase se añade también por JS a superficies blancas creadas
       dinámicamente por cada módulo.
       ================================================================ */
    .app-main .s360-frosted-surface,
    .app-main .card,
    .app-main .panel,
    .app-main .module-card,
    .app-main .section-card,
    .app-main .content-card,
    .app-main .table-card,
    .app-main .data-card,
    .app-main .stats-card,
    .app-main .kpi-card,
    .app-main .form-card,
    .app-main .list-card,
    .app-main .empty-state,
    .app-main .dashboard-card,
    .app-main .surface,
    .app-main .surface-soft,
    .app-main .module-surface,
    .app-main .content-surface,
    .app-main .white-surface,
    .app-main .box,
    .app-main .section,
    .app-main .module,
    .app-main .widget,
    .app-main .tile,
    .app-main .toolbar,
    .app-main .table-container,
    .app-main .table-wrap,
    .app-main .modal-content,
    .app-main .dialog-content,
    .app-main .drawer-content,
    .app-main .dropdown-menu {
      background: rgba(255,255,255,.82) !important;
      background-color: rgba(255,255,255,.82) !important;
      border: 1px solid rgba(255,255,255,.88) !important;
      box-shadow: 0 18px 50px rgba(15,72,94,.10), 0 1px 0 rgba(255,255,255,.95) inset !important;
      backdrop-filter: blur(20px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(120%) !important;
    }

    /* Todos los paneles/contendedores habituales quedan blancos empavunados. */
    .app-main :is([class*="card"], [class*="panel"], [class*="surface"], [class*="container"], [class*="section"], [class*="content"], [class*="module"], [class*="table"], [class*="list"], [class*="widget"], [class*="box"]):not(.sidebar):not(.sidebar-nav):not(.nav):not(.navigation) {
      background: rgba(255,255,255,.82) !important;
      background-color: rgba(255,255,255,.82) !important;
      border-color: rgba(255,255,255,.88) !important;
      box-shadow: 0 18px 50px rgba(15,72,94,.10), 0 1px 0 rgba(255,255,255,.95) inset !important;
      backdrop-filter: blur(20px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(120%) !important;
    }

    /* Contenedores blancos creados sin una clase estándar: el JS les añade la clase. */
    .app-main .s360-frosted-surface {
      background: rgba(255,255,255,.82) !important;
      background-color: rgba(255,255,255,.82) !important;
      border: 1px solid rgba(255,255,255,.88) !important;
      box-shadow: 0 18px 50px rgba(15,72,94,.10), 0 1px 0 rgba(255,255,255,.95) inset !important;
      backdrop-filter: blur(20px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(120%) !important;
    }

    /* Los controles siguen siendo blancos y legibles, pero también tienen un leve vidrio. */
    .app-main input,
    .app-main select,
    .app-main textarea,
    .app-main .form-control,
    .app-main .input,
    .app-main .select {
      background: rgba(255,255,255,.90) !important;
      border-color: rgba(190,215,225,.80) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    .app-main table thead,
    .app-main .table-header,
    .app-main .card-header,
    .app-main .panel-header {
      background: rgba(255,255,255,.76) !important;
      backdrop-filter: blur(16px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(120%) !important;
    }

    /* No tocar colores funcionales de botones, estados, alertas ni navegación. */
    .app-main button,
    .app-main .btn,
    .app-main .badge,
    .app-main .status,
    .app-main .chip,
    .app-main .alert,
    .app-main .toast,
    .app-main .progress,
    .app-main .sidebar,
    .app-main nav {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  `;
  document.head.appendChild(style);

  /*
   * Detecta superficies que realmente tienen fondo blanco aunque su módulo
   * no use ninguna de las clases anteriores. Esto permite que el efecto se
   * aplique también a módulos renderizados dinámicamente.
   */
  function applyFrostedGlass(root) {
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (el.classList.contains('s360-frosted-surface')) continue;
      if (el.matches('button, input, select, textarea, option, svg, img, .btn, .badge, .status, .chip, .alert, .toast, .progress, nav, .sidebar, [role="button"]')) continue;
      var cs = window.getComputedStyle(el);
      var bg = cs.backgroundColor;
      var isWhite = bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)';
      if (!isWhite) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 45) continue;
      el.classList.add('s360-frosted-surface');
    }
  }

  function observeModules() {
    var main = document.querySelector('.app-main');
    if (!main) return false;
    applyFrostedGlass(main);
    if (!window.__S360_GLASS_OBSERVER__) {
      window.__S360_GLASS_OBSERVER__ = new MutationObserver(function() {
        applyFrostedGlass(main);
      });
      window.__S360_GLASS_OBSERVER__.observe(main, { childList: true, subtree: true });
    }
    return true;
  }

  if (!observeModules()) {
    var bootTimer = setInterval(function() {
      if (observeModules()) clearInterval(bootTimer);
    }, 250);
    setTimeout(function() { clearInterval(bootTimer); }, 30000);
  }
})();
