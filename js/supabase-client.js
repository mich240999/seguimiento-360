/* See repository update: Supabase email/password authentication, legacy auth bridge, authorized-user context, password recovery, and removal of Google/Microsoft login UI. */
(function(window) {
  "use strict";
  const config = window.APP_CONFIG || {};
  let supabaseInstance = null;
  const LEGACY_TOKEN_KEY = "SGT360_AUTH_TOKEN_V1";
  const LEGACY_SESSION_KEY = "SGT360_AUTH_SESSION_V1";
  function initSupabase() {
    const url = config.SUPABASE_URL || window.localStorage.getItem("S360_SUPABASE_URL");
    const key = config.SUPABASE_ANON_KEY || window.localStorage.getItem("S360_SUPABASE_ANON_KEY");
    if (url && key && window.supabase) {
      try {
        supabaseInstance = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        console.info("[SGT360] Supabase conectado:", url);
      } catch (err) { supabaseInstance = null; console.error("[SGT360] Error al inicializar Supabase:", err); }
    } else console.error("[SGT360] Supabase no está configurado.");
  }
  initSupabase();
  function getClient() { if (!supabaseInstance) initSupabase(); if (!supabaseInstance) throw new Error("No se pudo conectar con Supabase."); return supabaseInstance; }
  async function getAuthUser() { const { data, error } = await getClient().auth.getUser(); if (error) throw error; if (!data || !data.user) throw new Error("NO_AUTH_SESSION"); return data.user; }
  async function getAuthorizedUser() {
    const user = await getAuthUser();
    const email = String(user.email || "").trim().toLowerCase();
    if (!email) throw new Error("La cuenta de Supabase no tiene correo electrónico.");
    const { data, error } = await getClient().from("seg_usuarios").select("id_usuario, correo, nombre, telefono, rol, id_proveedor, id_oficina, id_grupo, estado, tipo_documento, numero_documento").ilike("correo", email).eq("estado", "ACTIVO").maybeSingle();
    if (error) throw error;
    if (!data) { await getClient().auth.signOut(); throw new Error("USUARIO_NO_AUTORIZADO: tu correo no está registrado como usuario activo en Seguimiento 360."); }
    return { authUser: user, usuario: data };
  }
  function syncLegacySessionSync() {
    try {
      if (String(window.localStorage.getItem(LEGACY_TOKEN_KEY) || "").trim()) return;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i) || "";
        if (!/^sb-.+-auth-token$/i.test(key)) continue;
        const raw = window.localStorage.getItem(key); if (!raw) continue;
        const parsed = JSON.parse(raw); const accessToken = parsed && (parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token));
        if (accessToken) { window.localStorage.setItem(LEGACY_TOKEN_KEY, accessToken); window.localStorage.setItem(LEGACY_SESSION_KEY, raw); return; }
      }
    } catch (_) { window.localStorage.removeItem(LEGACY_TOKEN_KEY); window.localStorage.removeItem(LEGACY_SESSION_KEY); }
  }
  async function syncLegacySession() { try { const { data } = await getClient().auth.getSession(); const session = data && data.session; if (session && session.access_token) { window.localStorage.setItem(LEGACY_TOKEN_KEY, session.access_token); window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ user: session.user, expires_at: session.expires_at || null })); } } catch (_) {} }
  function showMessage(message, isError) { const el = document.getElementById("authMessage"); if (!el) return; el.hidden = false; el.textContent = message || ""; el.classList.toggle("is-error", !!isError); el.classList.toggle("is-success", !isError); }
  function normalizeAuthError(error) {
    const message = String(error && (error.message || error.error_description) || error || "");
    if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed/i.test(message)) return "Debes confirmar tu correo antes de iniciar sesión.";
    if (/rate limit|too many requests/i.test(message)) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
    if (/failed to fetch|network/i.test(message)) return "No se pudo conectar con Supabase. Verifica tu conexión.";
    return message || "No fue posible iniciar sesión.";
  }
  function installLoginView() {
    const authActions = document.querySelector(".auth-actions"); if (!authActions) return;
    /* const style = document.createElement("style"); style.id = "supabase-auth-styles";
    style.textContent = ".supabase-auth-form{display:grid;gap:12px;margin-top:4px}.supabase-auth-label{display:grid;gap:6px;font-size:12px;font-weight:700;color:#475569;text-align:left}.supabase-auth-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;font:inherit;background:#fff;color:#0f172a;outline:none}.supabase-auth-input:focus{border-color:#00a1de;box-shadow:0 0 0 3px rgba(0,161,222,.12)}.supabase-auth-submit{width:100%;justify-content:center;border:0;cursor:pointer}.supabase-auth-submit[disabled]{opacity:.65;cursor:wait}.supabase-auth-forgot{border:0;background:none;color:#007da9;font:inherit;font-size:13px;font-weight:700;cursor:pointer;padding:4px}.supabase-auth-forgot:hover{text-decoration:underline}#authMessage.is-success{color:#16794b}#authMessage.is-error{color:#b42318}";
    document.head.appendChild(style);
    authActions.innerHTML = '<form id="supabaseEmailLogin" class="supabase-auth-form" novalidate><label class="supabase-auth-label">Correo electrónico<input id="authEmail" class="supabase-auth-input" type="email" autocomplete="username" inputmode="email" placeholder="nombre@empresa.com" required></label><label class="supabase-auth-label">Contraseña<input id="authPassword" class="supabase-auth-input" type="password" autocomplete="current-password" placeholder="Ingresa tu contraseña" required minlength="6"></label><button id="authEmailSubmit" class="provider-button supabase-auth-submit" type="submit"><span class="material-symbols-rounded" aria-hidden="true">login</span><span>Iniciar sesión</span></button><button id="authForgotPassword" class="supabase-auth-forgot" type="button">¿Olvidaste tu contraseña?</button></form>';
    authActions.insertAdjacentHTML("beforeend", '<button id="supabaseGoogleButton" class="provider-button supabase-auth-submit" type="button">Continuar con Google</button><button id="supabaseMicrosoftButton" class="provider-button supabase-auth-submit" type="button">Continuar con Microsoft</button>'); */
    const form = document.getElementById("supabaseEmailLogin"); const emailInput = document.getElementById("authEmail"); const passwordInput = document.getElementById("authPassword"); const submit = document.getElementById("authEmailSubmit"); const forgot = document.getElementById("authForgotPassword");
    form.hidden = true;
    const emailButton = document.getElementById("supabaseEmailButton");
    emailButton.addEventListener("click", function() {
      form.hidden = !form.hidden;
      emailButton.setAttribute("aria-expanded", String(!form.hidden));
      if (!form.hidden) emailInput.focus();
    });
    form.addEventListener("submit", async function(event) {
      event.preventDefault(); const email = String(emailInput.value || "").trim().toLowerCase(); const password = String(passwordInput.value || "");
      if (!email || !emailInput.checkValidity()) return showMessage("Ingresa un correo válido.", true); if (!password) return showMessage("Ingresa tu contraseña.", true);
      submit.disabled = true; showMessage("Validando acceso…", false);
      try { const { data, error } = await getClient().auth.signInWithPassword({ email, password }); if (error) throw error; if (!data || !data.session) throw new Error("No se recibió una sesión válida de Supabase."); const auth = await getAuthorizedUser(); window.localStorage.setItem(LEGACY_TOKEN_KEY, data.session.access_token); window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ user: auth.authUser })); showMessage("Acceso autorizado. Cargando Seguimiento 360…", false); window.location.reload(); }
      catch (error) { try { await getClient().auth.signOut(); } catch (_) {} showMessage(normalizeAuthError(error), true); submit.disabled = false; passwordInput.focus(); }
    });
    forgot.addEventListener("click", async function() {
      const email = String(emailInput.value || "").trim().toLowerCase(); if (!email || !emailInput.checkValidity()) { showMessage("Ingresa primero tu correo para enviarte el enlace de recuperación.", true); emailInput.focus(); return; }
      forgot.disabled = true; try { const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (error) throw error; showMessage("Si el correo está registrado, recibirás un enlace para restablecer la contraseña.", false); } catch (error) { showMessage(normalizeAuthError(error), true); } finally { forgot.disabled = false; }
    });
    [
      { id: "supabaseGoogleButton", provider: "google" },
      { id: "supabaseMicrosoftButton", provider: "azure" }
    ].forEach(function(item) {
      const oauthButton = document.getElementById(item.id);
      oauthButton.addEventListener("click", async function() {
        oauthButton.disabled = true;
        showMessage("Redirigiendo al proveedor de identidad...", false);
        try {
          const { error } = await getClient().auth.signInWithOAuth({
            provider: item.provider,
            options: {
              redirectTo: window.location.origin + window.location.pathname,
              scopes: item.provider === "azure" ? "email" : undefined
            }
          });
          if (error) throw error;
        } catch (error) {
          showMessage(normalizeAuthError(error), true);
          oauthButton.disabled = false;
        }
      });
    });
  }
  async function loadContext() {
    const authorized = await getAuthorizedUser(); const usuario = authorized.usuario; const role = String(usuario.rol || "USUARIO").toUpperCase(); const client = getClient();
    const context = { correcto: true, sesion: { idUsuario: usuario.id_usuario, correo: usuario.correo, nombre: usuario.nombre, rol: role, estado: usuario.estado, idProveedor: usuario.id_proveedor || "", idOficina: usuario.id_oficina || "", idGrupo: usuario.id_grupo || "" }, usuario: { idUsuario: usuario.id_usuario, correo: usuario.correo, nombre: usuario.nombre, rol: role, nombreRol: role, estado: usuario.estado, idProveedor: usuario.id_proveedor || "", idOficina: usuario.id_oficina || "", idGrupo: usuario.id_grupo || "" }, aplicacion: { nombre: config.APP_NAME || "Seguimiento 360", version: config.VERSION || "2.5.0", entorno: config.ENTORNO || "PRODUCCION", fechaServidor: new Date().toISOString() }, interfaz: { colorPrincipal: "#00A1DE", actualizacionAutomatica: true, actualizacionSegundos: 300 }, modulos: [], modulosPermitidos: [], permisos: {} };
    const { data: modules, error: modulesError } = await client.from("app_modulos").select("id_modulo,codigo,nombre,descripcion,icono,grupo_menu,orden,tipo_vista,estado").eq("estado", "ACTIVO").order("orden", { ascending: true }); if (modulesError) throw modulesError;
    const { data: rolePermissions, error: permissionError } = await client.from("seg_permisos").select("tipo_sujeto,id_sujeto,modulo,recurso,permitido,alcance,estado").eq("estado", "ACTIVO").in("id_sujeto", [role, usuario.id_usuario]); if (permissionError) throw permissionError;
    const allModules = role === "SUPERADMIN";
    const permitted = (modules || []).filter(function(module) { return allModules || (rolePermissions || []).some(function(permission) { return permission.modulo === module.codigo && permission.permitido === true; }); }).map(function(module) { return { idModulo: module.id_modulo, codigo: module.codigo, nombre: module.nombre, descripcion: module.descripcion, icono: module.icono || "grid_view", grupoMenu: module.grupo_menu || "General", orden: module.orden, tipoVista: module.tipo_vista }; });
    context.modulos = permitted; context.modulosPermitidos = permitted;
    (rolePermissions || []).forEach(function(permission) { context.permisos[permission.modulo] = context.permisos[permission.modulo] || {}; context.permisos[permission.modulo][permission.recurso] = permission.permitido === true; });
    return context;
  }
  function createGoogleScriptCompatibility() {
    const run = new Proxy({}, { get: function(_target, property) { if (property === "withSuccessHandler") return function(success) { let failure = null; const chain = new Proxy({}, { get: function(_chainTarget, method) { if (method === "withFailureHandler") return function(fail) { failure = fail; return chain; }; return function() { Promise.resolve(dispatchLegacyMethod(method)).then(function(result) { if (typeof success === "function") success(result); }).catch(function(error) { if (typeof failure === "function") failure(error); }); return chain; }; }}); return chain; }; return function() { return run; }; }});
    window.google = window.google || {}; window.google.script = window.google.script || {}; window.google.script.run = run;
  }
  async function dispatchLegacyMethod(method) {
    switch (String(method)) {
      case "validarSesionAplicacionPaso13D1": { const authorized = await getAuthorizedUser(); const session = (await getClient().auth.getSession()).data.session; return { correcto: true, autenticado: true, paso: "SUPABASE_AUTH", proveedorIdentidad: "SUPABASE_EMAIL", usuario: { idUsuario: authorized.usuario.id_usuario, correo: authorized.usuario.correo, nombre: authorized.usuario.nombre, rol: authorized.usuario.rol, idProveedor: authorized.usuario.id_proveedor || "" }, sesion: { fechaInicio: session && session.user && session.user.created_at ? session.user.created_at : "", ultimaActividad: new Date().toISOString(), fechaExpiracion: session && session.expires_at ? new Date(session.expires_at * 1000).toISOString() : "", estado: "ABIERTA", origen: "SUPABASE_EMAIL" }, configuracion: { segundosHeartbeat: 120, horasMaximas: 8 }, mensaje: "Sesión Supabase validada correctamente." }; }
      case "actualizarActividadSesionPaso13D1": await getAuthorizedUser(); return { correcto: true, autenticado: true, ultimaActividad: new Date().toISOString(), estado: "ABIERTA" };
      case "cerrarSesionAplicacionPaso13E1": await getClient().auth.signOut(); window.localStorage.removeItem(LEGACY_TOKEN_KEY); window.localStorage.removeItem(LEGACY_SESSION_KEY); return { correcto: true, mensaje: "Sesión cerrada." };
      case "obtenerConfiguracionPantallaLoginPaso13B": return { correcto: true, proveedores: { google: { habilitado: false }, microsoft: { habilitado: false } }, oauth: { preparado: false, inicioOAuthHabilitado: false } };
      default: throw new Error("Operación heredada no disponible con Supabase Auth: " + method);
    }
  }
  function installAdapterBridge() {
    if (!window.apiAdapter || window.apiAdapter.__s360SupabaseBridge) return;
    const originalExecuteRpc = window.apiAdapter.executeRpc.bind(window.apiAdapter);
    window.apiAdapter.executeRpc = async function(operation, argumentsList, moduleCode) { await getAuthorizedUser(); if (operation === "obtenerContextoAplicacion") return loadContext(); return originalExecuteRpc(operation, argumentsList, moduleCode); };
    window.apiAdapter.__s360SupabaseBridge = true;
    if (!Promise.prototype.ejecutarOperacionSeguraMotor) Object.defineProperty(Promise.prototype, "ejecutarOperacionSeguraMotor", { configurable: true, value: function() { return this; } });
  }
  function installAuthBridge() {
    installLoginView(); createGoogleScriptCompatibility(); installAdapterBridge(); syncLegacySessionSync(); syncLegacySession();
    const client = getClient(); client.auth.onAuthStateChange(function(_event, session) { if (session && session.access_token) window.localStorage.setItem(LEGACY_TOKEN_KEY, session.access_token); else { window.localStorage.removeItem(LEGACY_TOKEN_KEY); window.localStorage.removeItem(LEGACY_SESSION_KEY); } });
  }
  window.supabaseClient = { getClient: getClient, isConfigured: function() { return !!supabaseInstance; }, getAuthUser: getAuthUser, getAuthorizedUser: getAuthorizedUser, reconfigure: function(url, key) { window.localStorage.setItem("S360_SUPABASE_URL", url); window.localStorage.setItem("S360_SUPABASE_ANON_KEY", key); config.SUPABASE_URL = url; config.SUPABASE_ANON_KEY = key; initSupabase(); return !!supabaseInstance; }, clearConfig: function() { window.localStorage.removeItem("S360_SUPABASE_URL"); window.localStorage.removeItem("S360_SUPABASE_ANON_KEY"); config.SUPABASE_URL = ""; config.SUPABASE_ANON_KEY = ""; supabaseInstance = null; }, subirArchivoEvidencia: async function(archivo, nombreRuta) { const client = getClient(); await getAuthorizedUser(); const bucket = config.STORAGE_BUCKETS && config.STORAGE_BUCKETS.EVIDENCIAS || "evidencias"; const path = nombreRuta || `entrega_${Date.now()}_${archivo.name}`; const { data, error } = await client.storage.from(bucket).upload(path, archivo, { cacheControl: "3600", upsert: true }); if (error) throw new Error("Error al subir archivo a Supabase Storage: " + error.message); const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(path); return { correcto: true, urlPublica: publicUrlData.publicUrl, idArchivo: data.path }; } };
  document.addEventListener("DOMContentLoaded", function() { try { installAuthBridge(); } catch (error) { console.error("[SGT360] No fue posible instalar el puente Supabase:", error); showMessage("No fue posible preparar la autenticación. Revisa la configuración de Supabase.", true); } }, { once: true });
})(window);
