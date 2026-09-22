/* See repository update: Supabase email/password authentication, legacy auth bridge, authorized-user context, password recovery, and removal of Google/Microsoft login UI. */
(function(window) {
  "use strict";
  const config = window.APP_CONFIG || {};
  let supabaseInstance = null;
  const LEGACY_TOKEN_KEY = "SGT360_AUTH_TOKEN_V1";
  const LEGACY_SESSION_KEY = "SGT360_AUTH_SESSION_V1";
  let passwordSetupCompleted = false;
  function isPasswordSetupFlow() {
    const callback = String(window.location.search || "") + "&" + String(window.location.hash || "");
    return /(?:^|[?&#])type=(?:invite|recovery)(?:&|$)/i.test(callback);
  }
  // El enlace de invitación no puede abrir módulos con su sesión temporal.
  window.__S360_PASSWORD_SETUP_REQUIRED__ = isPasswordSetupFlow();
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
    // La tabla técnica aplica la política de una sola sesión incluso aunque el
    // token de Supabase siga almacenado en otro navegador.
    try {
      const session = (await getClient().auth.getSession()).data.session;
      const technicalId = idSesionSupabase_(session, user);
      const technical = await getClient().from("seg_sesiones").select("estado,fecha_fin").eq("id_sesion", technicalId).maybeSingle();
      if (technical.error) throw technical.error;
      const expired = technical.data && technical.data.fecha_fin && new Date(technical.data.fecha_fin).getTime() <= Date.now();
      if (technical.data && (technical.data.estado !== "ACTIVA" || expired)) {
        if (expired && technical.data.estado === "ACTIVA") await getClient().from("seg_sesiones").update({ estado:"EXPIRADA" }).eq("id_sesion", technicalId);
        await getClient().auth.signOut();
        throw new Error(expired ? "SESION_EXPIRADA" : "SESION_REEMPLAZADA");
      }
    } catch (error) {
      const code = String(error && error.message || error);
      if (/SESION_(EXPIRADA|REEMPLAZADA)/.test(code)) throw error;
      console.warn("[SGT360] No se pudo validar la sesión técnica:", error);
    }
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
  function idSesionSupabase_(session, authUser) { try { const token=String(session && session.access_token || "").split(".")[1] || ""; const decoded=JSON.parse(atob(token.replace(/-/g,"+").replace(/_/g,"/"))); if(decoded.session_id)return "SES-"+decoded.session_id; } catch (_) {} return "SES-"+String(authUser && authUser.id || "ACTUAL"); }
  async function closeCurrentSession(reason) {
    const authorized=await getAuthorizedUser();
    const client=getClient(), session=(await client.auth.getSession()).data.session;
    const idSession=idSesionSupabase_(session,authorized.authUser), now=new Date().toISOString();
    const closed=await client.from("seg_sesiones").update({estado:"CERRADA",fecha_fin:now,ultima_actividad:now,modulo_actual:"CIERRE_VOLUNTARIO"}).eq("id_sesion",idSession).eq("estado","ACTIVA").select("id_sesion").maybeSingle();
    if(closed.error)throw closed.error;
    if(closed.data)await client.from("seg_auditoria_accesos").insert({id_usuario:authorized.usuario.id_usuario,correo:authorized.usuario.correo,rol:authorized.usuario.rol,modulo:"SISTEMA",accion:"CIERRE_SESION",resultado:"EXITOSO",origen:"SUPABASE_AUTH",id_sesion:idSession,motivo:String(reason||"Cierre voluntario desde la aplicación")});
    if(window.__S360_SESSION_EXPIRY_TIMER__)window.clearTimeout(window.__S360_SESSION_EXPIRY_TIMER__);
    await client.auth.signOut({scope:"local"});
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);window.localStorage.removeItem(LEGACY_SESSION_KEY);window.sessionStorage.removeItem("S360_AUDIT_LOGIN");
    return {correcto:true};
  }
  async function deactivateCurrentUser() {
    const authorized = await getAuthorizedUser();
    if (String(authorized.usuario.rol || "").toUpperCase() === "SUPERADMIN") {
      throw new Error("El superadministrador no puede darse de baja a sí mismo. Asigna otro superadministrador primero.");
    }
    const client = getClient();
    const now = new Date().toISOString();
    const session = (await client.auth.getSession()).data.session;
    const idSession = idSesionSupabase_(session, authorized.authUser);
    const updated = await client.from("seg_usuarios")
      .update({ estado: "INACTIVO", id_usuario_actualizacion: authorized.usuario.id_usuario })
      .eq("id_usuario", authorized.usuario.id_usuario)
      .eq("estado", "ACTIVO");
    if (updated.error) throw updated.error;
    const closed = await client.from("seg_sesiones")
      .update({ estado: "CERRADA", fecha_fin: now, ultima_actividad: now, modulo_actual: "BAJA_VOLUNTARIA" })
      .eq("id_sesion", idSession).eq("estado", "ACTIVA");
    if (closed.error) throw closed.error;
    const audit = await client.from("seg_auditoria_accesos").insert({
      id_usuario: authorized.usuario.id_usuario,
      correo: authorized.usuario.correo,
      rol: authorized.usuario.rol,
      modulo: "SISTEMA",
      accion: "BAJA_VOLUNTARIA",
      resultado: "EXITOSO",
      origen: "SUPABASE_AUTH",
      id_sesion: idSession,
      motivo: "El usuario solicitó la desactivación de su propio acceso."
    });
    if (audit.error) console.warn("[SGT360] No se pudo registrar la baja voluntaria:", audit.error);
    await client.auth.signOut({ scope: "local" });
    window.localStorage.removeItem(LEGACY_TOKEN_KEY); window.localStorage.removeItem(LEGACY_SESSION_KEY);
    window.sessionStorage.removeItem("S360_AUDIT_LOGIN");
    return { correcto: true };
  }
  function showMessage(message, isError) { const el = document.getElementById("authMessage"); if (!el) return; el.hidden = false; el.textContent = message || ""; el.classList.toggle("is-error", !!isError); el.classList.toggle("is-success", !isError); }
  function normalizeAuthError(error) {
    const message = String(error && (error.message || error.error_description) || error || "");
    if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed/i.test(message)) return "Debes confirmar tu correo antes de iniciar sesión.";
    if (/rate limit|too many requests/i.test(message)) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
    if (/redirect|redirect_to|not allowed/i.test(message)) return "Supabase rechazó la URL de recuperación. Registra la URL de esta aplicación en Authentication > URL Configuration > Redirect URLs.";
    if (/failed to fetch|network/i.test(message)) return "No se pudo conectar con Supabase. Verifica tu conexión.";
    return message || "No fue posible iniciar sesión.";
  }
  function authRedirectUrl() {
    const configured = String(config.AUTH_REDIRECT_URL || window.localStorage.getItem("S360_AUTH_REDIRECT_URL") || "").trim();
    return configured || (window.location.origin + window.location.pathname);
  }
  async function chooseActiveSession(authUser) {
    const response=await getClient().from("seg_sesiones").select("id_sesion,fecha_fin,modulo_actual").eq("id_usuario",authUser.usuario.id_usuario).eq("estado","ACTIVA");
    if(response.error)throw response.error;
    const active=(response.data||[]).filter(function(row){return !row.fecha_fin||new Date(row.fecha_fin).getTime()>Date.now();});
    if(!active.length)return true;
    return new Promise(function(resolve){
      const layer=document.createElement("div");layer.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.72);display:grid;place-items:center;padding:20px";
      layer.innerHTML='<section role="dialog" aria-modal="true" style="width:min(460px,100%);background:#fff;border-radius:18px;padding:28px;color:#132b3a;box-shadow:0 24px 64px rgba(0,0,0,.28)"><div style="display:flex;align-items:center;gap:10px;color:#007da9;font-weight:800;letter-spacing:.08em;font-size:12px">SESIÓN ACTIVA</div><h2 style="margin:12px 0 8px;font-size:24px">Tu cuenta ya está en uso</h2><p style="margin:0 0 22px;color:#52677a;line-height:1.5">Solo puedes mantener una sesión activa. Elige si deseas conservar la sesión existente o cerrarla para ingresar desde este equipo.</p><div style="display:grid;gap:10px"><button id="s360KeepActiveSession" type="button" style="padding:12px;border:1px solid #99dcef;background:#fff;color:#007da9;border-radius:9px;font-weight:700;cursor:pointer">Mantener sesión activa</button><button id="s360ReplaceActiveSession" type="button" style="padding:12px;border:0;background:#008fbe;color:#fff;border-radius:9px;font-weight:700;cursor:pointer">Cerrar sesión anterior e ingresar</button></div></section>';
      document.body.appendChild(layer);
      document.getElementById("s360KeepActiveSession").addEventListener("click",async function(){await getClient().auth.signOut({scope:"local"});layer.remove();resolve(false);});
      document.getElementById("s360ReplaceActiveSession").addEventListener("click",function(){window.sessionStorage.setItem("S360_SESSION_TAKEOVER","1");layer.remove();resolve(true);});
    });
  }
  function installLoginView() {
    const authActions = document.querySelector(".auth-actions"); if (!authActions) return;
    /* const style = document.createElement("style"); style.id = "supabase-auth-styles";
    style.textContent = ".supabase-auth-form{display:grid;gap:12px;margin-top:4px}.supabase-auth-label{display:grid;gap:6px;font-size:12px;font-weight:700;color:#475569;text-align:left}.supabase-auth-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;font:inherit;background:#fff;color:#0f172a;outline:none}.supabase-auth-input:focus{border-color:#00a1de;box-shadow:0 0 0 3px rgba(0,161,222,.12)}.supabase-auth-submit{width:100%;justify-content:center;border:0;cursor:pointer}.supabase-auth-submit[disabled]{opacity:.65;cursor:wait}.supabase-auth-forgot{border:0;background:none;color:#007da9;font:inherit;font-size:13px;font-weight:700;cursor:pointer;padding:4px}.supabase-auth-forgot:hover{text-decoration:underline}#authMessage.is-success{color:#16794b}#authMessage.is-error{color:#b42318}";
    document.head.appendChild(style);
    authActions.innerHTML = '<form id="supabaseEmailLogin" class="supabase-auth-form" novalidate><label class="supabase-auth-label">Correo electrónico<input id="authEmail" class="supabase-auth-input" type="email" autocomplete="username" inputmode="email" placeholder="nombre@empresa.com" required></label><label class="supabase-auth-label">Contraseña<input id="authPassword" class="supabase-auth-input" type="password" autocomplete="current-password" placeholder="Ingresa tu contraseña" required minlength="6"></label><button id="authEmailSubmit" class="provider-button supabase-auth-submit" type="submit"><span class="material-symbols-rounded" aria-hidden="true">login</span><span>Iniciar sesión</span></button><button id="authForgotPassword" class="supabase-auth-forgot" type="button">¿Olvidaste tu contraseña?</button></form>';
    authActions.insertAdjacentHTML("beforeend", '<button id="supabaseGoogleButton" class="provider-button supabase-auth-submit" type="button">Continuar con Google</button><button id="supabaseMicrosoftButton" class="provider-button supabase-auth-submit" type="button">Continuar con Microsoft</button>'); */
    const form = document.getElementById("supabaseEmailLogin"); const emailInput = document.getElementById("authEmail"); const passwordInput = document.getElementById("authPassword"); const submit = document.getElementById("authEmailSubmit"); const forgot = document.getElementById("authForgotPassword");
    if (!form || !emailInput || !passwordInput || !submit || !forgot) return;
    form.hidden = false;
    form.classList.add("is-open");
    try {
      var rememberedEmail = window.localStorage.getItem("S360_REMEMBER_EMAIL") || "";
      var rememberBox = document.getElementById("authRemember");
      if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        if (rememberBox) rememberBox.checked = true;
      }
    } catch (_) {}
    const emailButton = document.getElementById("supabaseEmailButton");
    let emailFormCloseTimer = null;
    if (emailButton) {
    emailButton.addEventListener("click", function() {
      const willOpen = form.hidden;
      if (willOpen) {
        if (emailFormCloseTimer) window.clearTimeout(emailFormCloseTimer);
        form.hidden = false;
        window.requestAnimationFrame(function() {
          form.classList.add("is-open");
          emailInput.focus();
        });
      } else {
        form.classList.remove("is-open");
        emailFormCloseTimer = window.setTimeout(function() { form.hidden = true; emailFormCloseTimer = null; }, 260);
      }
      emailButton.setAttribute("aria-expanded", String(willOpen));
    });
    }
    form.addEventListener("submit", async function(event) {
      event.preventDefault(); const email = String(emailInput.value || "").trim().toLowerCase(); const password = String(passwordInput.value || "");
      if (!email || !emailInput.checkValidity()) return showMessage("Ingresa un correo válido.", true); if (!password) return showMessage("Ingresa tu contraseña.", true);
      submit.disabled = true; showMessage("Validando acceso…", false);
      try { const { data, error } = await getClient().auth.signInWithPassword({ email, password }); if (error) throw error; if (!data || !data.session) throw new Error("No se recibió una sesión válida de Supabase."); try { var rememberNow = document.getElementById("authRemember"); if (rememberNow && rememberNow.checked) window.localStorage.setItem("S360_REMEMBER_EMAIL", email); else window.localStorage.removeItem("S360_REMEMBER_EMAIL"); } catch (_) {} const auth = await getAuthorizedUser(); const replace=await chooseActiveSession(auth); if(!replace){showMessage("Se mantiene la sesión ya activa. No se inició una nueva sesión en este equipo.",false);submit.disabled=false;return;} window.localStorage.setItem(LEGACY_TOKEN_KEY, data.session.access_token); window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ user: auth.authUser })); showMessage("Acceso autorizado. Cargando Seguimiento 360…", false); window.location.reload(); }
      catch (error) { try { await getClient().auth.signOut(); } catch (_) {} showMessage(normalizeAuthError(error), true); submit.disabled = false; passwordInput.focus(); }
    });
    forgot.addEventListener("click", async function() {
      const email = String(emailInput.value || "").trim().toLowerCase(); if (!email || !emailInput.checkValidity()) { showMessage("Ingresa primero tu correo para enviarte el enlace de recuperación.", true); emailInput.focus(); return; }
      const originalText = forgot.textContent; forgot.disabled = true; forgot.textContent = "Enviando enlace…";
      try { const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() }); if (error) throw error; showMessage("Enlace enviado. Revisa tu correo y spam; al abrirlo verás la pantalla para crear una nueva contraseña.", false); }
      catch (error) { showMessage(normalizeAuthError(error), true); }
      finally { forgot.disabled = false; forgot.textContent = originalText; }
    });
    [
      { id: "supabaseGoogleButton", provider: "google" },
      { id: "supabaseMicrosoftButton", provider: "azure" }
    ].forEach(function(item) {
      const oauthButton = document.getElementById(item.id);
      if (!oauthButton) return;
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
    // Para SUPERADMIN la consola ADMIN_CONFIG_APP concentra Usuarios, Roles,
    // Permisos y Estructura. Los módulos individuales continúan disponibles
    // para los demás roles, pero no se repiten en su menú.
    const integratedAdminModules = ["ADMIN_USUARIOS", "ADMIN_PERMISOS", "ADMIN_ESTRUCTURA"];
    const permitted = (modules || []).filter(function(module) { const auditAdministrator=(role === "SUPERADMIN" || role === "ADMIN") && module.codigo === "ADMIN_AUDITORIA"; return (allModules || auditAdministrator || (rolePermissions || []).some(function(permission) { return permission.modulo === module.codigo && permission.permitido === true; })) && !(role === "SUPERADMIN" && integratedAdminModules.indexOf(module.codigo) !== -1); }).map(function(module) { return { idModulo: module.id_modulo, codigo: module.codigo, nombre: module.nombre, descripcion: module.descripcion, icono: module.icono || "grid_view", grupoMenu: module.grupo_menu || "General", orden: module.orden, tipoVista: module.tipo_vista }; });
    context.modulos = permitted; context.modulosPermitidos = permitted;
    const superadminResources = ["VISUALIZAR_MODULO","ADMINISTRAR","CREAR","EDITAR","ELIMINAR","IMPORTAR","EXPORTAR","VER_LISTADO","VER_DETALLE","EDITAR_PERMISOS","VER_MATERIALES","CREAR_MATERIAL","EDITAR_MATERIAL","GESTIONAR_CATALOGO","GESTIONAR_PRECIOS","CREAR_PRECIO_INDIVIDUAL","CREAR_LISTA_OFICIAL","EDITAR_LISTA_OFICIAL","REGISTRAR_VENTA","EDITAR_VENTA","CONFIRMAR_ABONO","PROGRAMAR_ENTREGA","CONFIRMAR_ENTREGA","ANULAR_VENTA","VER_PRECIOS","VER_LISTAS_OFICIALES","VER_MIS_LISTAS_PRECIO","VER_SOLICITUDES_PRECIO","CARGAR_LISTA_PRECIO","CARGAR_LISTA_PRECIO_ADMIN","VER_AUDITORIA","CERRAR_SESIONES","LIMPIAR_SESIONES_EXPIRADAS"];
    (modules || []).filter(function(module) { return module.estado === "ACTIVO"; }).forEach(function(module) { context.permisos[module.codigo] = context.permisos[module.codigo] || {}; if (role === "SUPERADMIN") superadminResources.forEach(function(resource) { context.permisos[module.codigo][resource] = { permitido: true, alcance: "TOTAL" }; }); });
    (rolePermissions || []).forEach(function(permission) { context.permisos[permission.modulo] = context.permisos[permission.modulo] || {}; context.permisos[permission.modulo][permission.recurso] = { permitido: permission.permitido === true, alcance: permission.alcance || "PROPIO" }; });
    if (role === "ADMIN") { context.permisos.ADMIN_AUDITORIA = context.permisos.ADMIN_AUDITORIA || {}; ["VISUALIZAR_MODULO","VER_AUDITORIA","VER_LISTADO","VER_DETALLE","CERRAR_SESIONES","LIMPIAR_SESIONES_EXPIRADAS"].forEach(function(resource) { context.permisos.ADMIN_AUDITORIA[resource] = { permitido: true, alcance: "TOTAL" }; }); }
    context.seguridad = { permisos: context.permisos };
    // Mantiene una sesión técnica visible para la consola de Auditoría.
    // No impide el ingreso si la tabla aún no está disponible.
    try {
      const authSession=(await client.auth.getSession()).data.session;
      const sessionId=idSesionSupabase_(authSession,authorized.authUser);
      const existing=await client.from("seg_sesiones").select("estado,fecha_inicio,fecha_fin").eq("id_sesion",sessionId).maybeSingle();
      if(existing.error)throw existing.error;
      const now=new Date(), existingExpiry=existing.data&&existing.data.fecha_fin?new Date(existing.data.fecha_fin):null;
      if(existing.data && (existing.data.estado!=="ACTIVA" || (existingExpiry&&existingExpiry.getTime()<=now.getTime()))){
        if(existing.data.estado==="ACTIVA")await client.from("seg_sesiones").update({estado:"EXPIRADA"}).eq("id_sesion",sessionId);
        await client.auth.signOut();throw new Error("SESION_CERRADA_POR_ADMIN");
      }
      const setting=await client.from("sys_parametros").select("valor").eq("clave","EXPIRACION_SESION_MINUTOS").maybeSingle();
      const minutes=Math.max(5,Number(setting.data&&setting.data.valor||480));
      const started=existing.data&&existing.data.fecha_inicio||now.toISOString();
      const expires=existingExpiry&&existingExpiry.getTime()>now.getTime()?existingExpiry:new Date(new Date(started).getTime()+minutes*60000);
      const others=await client.from("seg_sesiones").select("id_sesion").eq("id_usuario",usuario.id_usuario).eq("estado","ACTIVA").neq("id_sesion",sessionId);
      if(others.error)throw others.error;
      if((others.data||[]).length)await client.from("seg_sesiones").update({estado:"CERRADA",fecha_fin:now.toISOString(),ultima_actividad:now.toISOString(),modulo_actual:"SESION_REEMPLAZADA"}).eq("id_usuario",usuario.id_usuario).eq("estado","ACTIVA").neq("id_sesion",sessionId);
      const tracked=await client.from("seg_sesiones").upsert({id_sesion:sessionId,id_usuario:usuario.id_usuario,correo:usuario.correo,rol:role,fecha_inicio:started,fecha_fin:expires.toISOString(),ultima_actividad:now.toISOString(),estado:"ACTIVA",modulo_actual:window.APP_STATE&&window.APP_STATE.module||"INICIO",origen:"SUPABASE_AUTH"});
      if(tracked.error)throw tracked.error;
      if(window.__S360_SESSION_EXPIRY_TIMER__)window.clearTimeout(window.__S360_SESSION_EXPIRY_TIMER__);
      window.__S360_SESSION_EXPIRY_TIMER__=window.setTimeout(async function(){await client.auth.signOut();window.location.reload();},Math.max(0,expires.getTime()-Date.now()));
      if(!window.sessionStorage.getItem("S360_AUDIT_LOGIN")){await client.from("seg_auditoria_accesos").insert({id_usuario:usuario.id_usuario,correo:usuario.correo,rol:role,modulo:"SISTEMA",accion:"INICIO_SESION",resultado:"AUTORIZADO",origen:"SUPABASE_AUTH",id_sesion:sessionId,detalle:{mensaje:"Sesión única autenticada en Seguimiento 360",fechaExpiracion:expires.toISOString()}});window.sessionStorage.setItem("S360_AUDIT_LOGIN","1");}
    } catch(error) { if(String(error&&error.message||error).indexOf("SESION_CERRADA_POR_ADMIN")!==-1)throw error; }
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
  const OPERACIONES_AUDITABLES = ["guardarUsuarioAdminMotor","guardarValorCatalogoAdminMotor","guardarMatrizPermisosAdminMotor","guardarProveedorModulo","guardarProveedorAdminMotor","guardarOficinaAdminMotor","guardarGrupoAdminMotor","guardarMaterialPrecioModulo","guardarPrecioIndividualMaterialesPreciosModulo","confirmarAbonoVentaContadoModulo","observarAbonoVentaContadoModulo","guardarGestionEntregaVentaContadoModulo","cerrarSesionAuditoriaAdminMotor","limpiarSesionesExpiradasAuditoriaAdminMotor"];
  async function registrarEventoSupabase_(client, user, operation, args, moduleCode) {
    if (OPERACIONES_AUDITABLES.indexOf(operation) === -1) return;
    const input = args && args[0] && typeof args[0] === "object" ? args[0] : {};
    const id = input.idUsuario || input.idSesion || input.idMaterial || input.idProveedor || input.idOficina || input.idGrupo || input.idVenta || input.idValor || "";
    const detalle = { operacion: operation, identificador: id || null, moduloSolicitado: moduleCode || null };
    try { await client.from("seg_auditoria_eventos").insert({id_usuario:user.id_usuario,correo:user.correo,rol:user.rol,modulo:moduleCode || "SISTEMA",accion:operation,entidad:operation.replace(/^guardar/, "").replace(/Modulo$|Motor$/g, "") || "SISTEMA",id_entidad:id || null,resultado:"EXITOSO",detalle:detalle}); } catch (error) { console.warn("[SGT360] No se pudo registrar auditoría:", error); }
  }
  function installAdapterBridge() {
    if (!window.apiAdapter || window.apiAdapter.__s360SupabaseBridge) return;
    const originalExecuteRpc = window.apiAdapter.executeRpc.bind(window.apiAdapter);
    window.apiAdapter.executeRpc = async function(operation, argumentsList, moduleCode) {
      const authorized = await getAuthorizedUser();
      if (operation === "obtenerContextoAplicacion") return loadContext();
      const client = getClient();
      const direct = await executeSupabaseOperation(client, operation, argumentsList || [], authorized.usuario);
      if (direct !== undefined) { await registrarEventoSupabase_(client, authorized.usuario, operation, argumentsList || [], moduleCode); return direct; }
      const result = await originalExecuteRpc(operation, argumentsList, moduleCode);
      return normalizeModuleResponse(operation, result);
    };
    window.apiAdapter.__s360SupabaseBridge = true;
  }
  function showPasswordSetup() {
    if (document.getElementById("supabasePasswordSetup")) return;
    const layer=document.createElement("div"); layer.id="supabasePasswordSetup"; layer.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.78);display:grid;place-items:center;padding:20px";
    layer.innerHTML='<form id="supabasePasswordSetupForm" style="width:min(420px,100%);background:#fff;border-radius:16px;padding:28px;display:grid;gap:14px;color:#0f172a"><h2 style="margin:0">Actualiza tu contraseña</h2><p style="margin:0;color:#475569">Antes de ingresar a Seguimiento 360, define tu contraseña personal. Después iniciarás sesión con tu correo y esta contraseña.</p><label>Nueva contraseña<input id="supabaseNewPassword" type="password" minlength="8" required autocomplete="new-password" style="width:100%;box-sizing:border-box;margin-top:5px;padding:11px"></label><label>Confirmar contraseña<input id="supabaseConfirmPassword" type="password" minlength="8" required autocomplete="new-password" style="width:100%;box-sizing:border-box;margin-top:5px;padding:11px"></label><p id="supabasePasswordSetupMessage" style="margin:0;color:#b42318"></p><button type="submit" style="padding:12px;background:#008fbe;color:#fff;border:0;border-radius:8px;font-weight:700">Guardar contraseña</button></form>';
    document.body.appendChild(layer); document.getElementById("supabasePasswordSetupForm").addEventListener("submit",async function(event){event.preventDefault();const password=document.getElementById("supabaseNewPassword").value,confirm=document.getElementById("supabaseConfirmPassword").value,message=document.getElementById("supabasePasswordSetupMessage");if(password!==confirm){message.textContent="Las contraseñas no coinciden.";return;}try{const result=await getClient().auth.updateUser({password:password});if(result.error)throw result.error;passwordSetupCompleted=true;window.__S360_PASSWORD_SETUP_REQUIRED__=false;message.style.color="#16794b";message.textContent="Contraseña guardada. Ahora inicia sesión con tu correo y contraseña.";await getClient().auth.signOut();window.localStorage.removeItem(LEGACY_TOKEN_KEY);window.localStorage.removeItem(LEGACY_SESSION_KEY);window.sessionStorage.removeItem("S360_AUDIT_LOGIN");window.setTimeout(function(){window.location.replace(window.location.origin+window.location.pathname);},850);}catch(error){message.textContent=normalizeAuthError(error);}});
  }
  function normalizeModuleResponse(operation, result) {
    result = result || {};
    if (operation === "listarProveedoresModulo") return result.registros ? result : { registros: result.proveedores || [], paginacion: { pagina: 1, totalPaginas: 1 }, resumen: { total: (result.proveedores || []).length, activos: (result.proveedores || []).filter(function(x) { return x.estado === "ACTIVO"; }).length } };
    if (operation === "listarMaterialesPrecioModulo") return result.registros ? result : { registros: result.materiales || [], paginacion: { pagina: 1, totalPaginas: 1 } };
    if (operation === "listarVentasContadoModulo") return result.registros ? result : { registros: result.ventas || [], paginacion: { pagina: 1, totalPaginas: 1 } };
    return result;
  }
  function extractSalesCancelReason_(text) { const lines = String(text || "").split("\n"); for (let i = lines.length - 1; i >= 0; i--) { const match = lines[i].match(/ANULACI[ÓO]N:\s*([\s\S]*)/i); if (match && match[1].trim()) return match[1].trim(); } return ""; }
  function base64ToSalesBlob_(base64, mimeType) { const binary = atob(String(base64 || "").replace(/\s/g, "")); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return new Blob([bytes], { type: mimeType || "application/octet-stream" }); }
  async function uploadSalesReceiptComprobante_(client, idVenta, codigoVenta, comprobante) {
    if (!comprobante || typeof comprobante !== "object") return null;
    const base64 = String(comprobante.base64 || "").replace(/\s/g, "");
    if (!base64) return null;
    const mime = String(comprobante.mimeType || comprobante.type || "application/octet-stream").toLowerCase();
    if (["application/pdf", "image/png", "image/jpeg", "image/webp"].indexOf(mime) === -1) throw new Error("El comprobante debe ser PDF, PNG, JPG o WEBP.");
    const ext = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" }[mime] || ".bin";
    const safe = String(comprobante.nombre || comprobante.name || "comprobante").replace(/[^A-Za-z0-9_.-]+/g, "_").slice(-60).replace(/\.[A-Za-z0-9]+$/, "");
    const path = "comprobantes/" + String(idVenta || "VENTA") + "/" + Date.now() + "_" + (safe || "comprobante") + ext;
    const uploaded = await client.storage.from("evidencias").upload(path, base64ToSalesBlob_(base64, mime), { contentType: mime, upsert: true });
    if (uploaded.error) throw new Error("No se pudo guardar el comprobante en Storage: " + uploaded.error.message);
    const publicUrl = client.storage.from("evidencias").getPublicUrl(path);
    return { url: publicUrl.data.publicUrl, nombre: comprobante.nombre || comprobante.name || "comprobante", mime: mime, id: path };
  }
  /* AGENTE C 2026-09-19: auto-creación en cadena proveedor -> oficina -> grupo -> relación -> lista base.
   * Uso exclusivo: guardarMaterialPrecioModulo (la carga masiva de materiales lo llama por fila).
   * Todo idempotente: busca por nombre exacto insensible a mayúsculas antes de crear.
   * Oficinas/grupos vacíos no fallan: solo generan advertencias para completar después. */
  var ensureProveedorChainSeq_ = 0;
  function ensureProveedorChainId_(prefix) {
    ensureProveedorChainSeq_ += 1;
    var rand = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    while (rand.length < 2) rand = "0" + rand;
    return String(prefix || "AUTO-") + Date.now().toString(36).toUpperCase() + ensureProveedorChainSeq_.toString(36).toUpperCase() + rand;
  }
  function ensureProveedorChainNorm_(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }
  function ensureProveedorChainFold_(value) {
    var text = String(value == null ? "" : value);
    try { text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (foldError) {}
    return text.trim().toLowerCase();
  }
  async function ensureProveedorChainFindByName_(client, table, nameColumn, name, extraFilter) {
    var wanted = ensureProveedorChainNorm_(name);
    if (!wanted) return null;
    var request = client.from(table).select("*").ilike(nameColumn, String(name).trim()).limit(25);
    if (extraFilter) request = request.eq(extraFilter.column, extraFilter.value);
    var found = await request;
    if (found.error) throw found.error;
    var rows = found.data || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      if (ensureProveedorChainNorm_(row[nameColumn]) !== wanted) continue;
      if (extraFilter && String(row[extraFilter.column] || "") !== String(extraFilter.value || "")) continue;
      return row;
    }
    return null;
  }
  /* Segunda oportunidad idempotente: ilike no pliega tildes, así que ante un
   * nombre no encontrado se compara plegando tildes y mayúsculas en cliente.
   * Solo se ejecuta cuando la búsqueda exacta no halló nada. */
  async function ensureProveedorChainFindFolded_(client, table, nameColumns, name, extraFilter) {
    var wanted = ensureProveedorChainFold_(name);
    if (!wanted) return null;
    var resp = await client.from(table).select("*").limit(2000);
    if (resp.error) throw resp.error;
    var rows = resp.data || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      if (extraFilter && String(row[extraFilter.column] || "") !== String(extraFilter.value || "")) continue;
      for (var c = 0; c < nameColumns.length; c++) {
        if (ensureProveedorChainFold_(row[nameColumns[c]]) === wanted) return row;
      }
    }
    return null;
  }
  async function ensureProveedorChain_(client, user, input) {
    input = input || {};
    var warnings = [];
    var byUser = (user && user.id_usuario) || null;
    var providerText = String(input.proveedor || input.nombreProveedor || input.razonSocial || "").trim();
    var officeText = String(input.oficina || input.nombreOficina || input.oficinaTexto || "").trim();
    var groupText = String(input.grupo || input.nombreGrupo || input.grupoTexto || "").trim();
    var providerRow = null;
    if (String(input.idProveedor || "").trim()) {
      var byProvId = await client.from("mae_proveedores").select("*").eq("id_proveedor", String(input.idProveedor).trim()).maybeSingle();
      if (byProvId.error) throw byProvId.error;
      if (byProvId.data) providerRow = byProvId.data;
    }
    if (!providerRow && providerText) {
      providerRow = await ensureProveedorChainFindByName_(client, "mae_proveedores", "razon_social", providerText, null);
      if (!providerRow) providerRow = await ensureProveedorChainFindByName_(client, "mae_proveedores", "nombre_comercial", providerText, null);
      if (!providerRow) providerRow = await ensureProveedorChainFindByName_(client, "mae_proveedores", "nombre", providerText, null);
      if (!providerRow) providerRow = await ensureProveedorChainFindFolded_(client, "mae_proveedores", ["razon_social", "nombre_comercial", "nombre"], providerText, null);
      if (!providerRow) {
        var newProvId = ensureProveedorChainId_("PRV-AUTO-");
        var createdProv = await client.from("mae_proveedores").insert({ id_proveedor: newProvId, razon_social: providerText, nombre_comercial: providerText, nombre: providerText, alcance_catalogo: "TOTAL", estado: "ACTIVO", id_usuario_actualizacion: byUser });
        if (createdProv.error) throw createdProv.error;
        var reProv = await client.from("mae_proveedores").select("*").eq("id_proveedor", newProvId).maybeSingle();
        if (reProv.error) throw reProv.error;
        providerRow = reProv.data;
        if (providerRow) warnings.push("Proveedor creado: " + providerText + ".");
      }
    }
    var officeRow = null;
    if (String(input.idOficina || "").trim()) {
      var byOfId = await client.from("mae_oficinas").select("*").eq("id_oficina", String(input.idOficina).trim()).maybeSingle();
      if (byOfId.error) throw byOfId.error;
      if (byOfId.data) officeRow = byOfId.data;
    }
    if (!officeRow && officeText) {
      officeRow = await ensureProveedorChainFindByName_(client, "mae_oficinas", "nombre", officeText, null);
      if (!officeRow) officeRow = await ensureProveedorChainFindFolded_(client, "mae_oficinas", ["nombre"], officeText, null);
      if (!officeRow) {
        var newOfId = ensureProveedorChainId_("OFI-AUTO-");
        var createdOf = await client.from("mae_oficinas").insert({ id_oficina: newOfId, nombre: officeText, estado: "ACTIVO", id_usuario_actualizacion: byUser });
        if (createdOf.error) throw createdOf.error;
        var reOf = await client.from("mae_oficinas").select("*").eq("id_oficina", newOfId).maybeSingle();
        if (reOf.error) throw reOf.error;
        officeRow = reOf.data;
        if (officeRow) warnings.push("Oficina creada: " + officeText + ".");
      }
    }
    var groupRow = null;
    if (String(input.idGrupo || "").trim()) {
      var byGrId = await client.from("mae_grupos").select("*").eq("id_grupo", String(input.idGrupo).trim()).maybeSingle();
      if (byGrId.error) throw byGrId.error;
      if (byGrId.data) groupRow = byGrId.data;
    }
    if (!groupRow && groupText) {
      if (officeRow && officeRow.id_oficina) {
        groupRow = await ensureProveedorChainFindByName_(client, "mae_grupos", "nombre", groupText, { column: "id_oficina", value: officeRow.id_oficina });
        if (!groupRow) groupRow = await ensureProveedorChainFindFolded_(client, "mae_grupos", ["nombre"], groupText, { column: "id_oficina", value: officeRow.id_oficina });
        if (!groupRow) {
          var newGrId = ensureProveedorChainId_("GRP-AUTO-");
          var createdGr = await client.from("mae_grupos").insert({ id_grupo: newGrId, id_oficina: officeRow.id_oficina, nombre: groupText, estado: "ACTIVO", id_usuario_actualizacion: byUser });
          if (createdGr.error) throw createdGr.error;
          var reGr = await client.from("mae_grupos").select("*").eq("id_grupo", newGrId).maybeSingle();
          if (reGr.error) throw reGr.error;
          groupRow = reGr.data;
          if (groupRow) warnings.push("Grupo creado: " + groupText + " (" + String(officeRow.nombre || officeRow.id_oficina) + ").");
        }
      } else {
        warnings.push("Grupo '" + groupText + "' pendiente: indica la oficina para crearlo.");
      }
    }
    if (providerRow && providerRow.id_proveedor && officeRow && officeRow.id_oficina) {
      var groupIds = (groupRow && groupRow.id_grupo) ? [groupRow.id_grupo] : [];
      var relFound = await client.from("rel_proveedor_oficinas").select("id_relacion,ids_grupo").eq("id_proveedor", providerRow.id_proveedor).eq("id_oficina", officeRow.id_oficina).maybeSingle();
      if (relFound.error) throw relFound.error;
      if (!relFound.data) {
        var relId = "RPO-" + String(providerRow.id_proveedor) + "-" + String(officeRow.id_oficina);
        if (relId.length > 50) relId = ensureProveedorChainId_("RPO-AUTO-");
        var newRel = await client.from("rel_proveedor_oficinas").insert({ id_relacion: relId, id_proveedor: providerRow.id_proveedor, id_oficina: officeRow.id_oficina, ids_grupo: groupIds.join("|"), alcance_grupos: groupIds.length ? "SELECCIONADOS" : "TODOS", estado: "ACTIVO", id_usuario_actualizacion: byUser });
        if (newRel.error) throw newRel.error;
        warnings.push("Canal asignado: " + String(officeRow.nombre || officeRow.id_oficina) + ".");
      } else if (groupIds.length) {
        var currentGroups = String((relFound.data && relFound.data.ids_grupo) || "").split("|").filter(Boolean);
        if (currentGroups.indexOf(groupIds[0]) === -1) {
          currentGroups.push(groupIds[0]);
          var updRel = await client.from("rel_proveedor_oficinas").update({ ids_grupo: currentGroups.join("|"), alcance_grupos: "SELECCIONADOS", id_usuario_actualizacion: byUser }).eq("id_relacion", relFound.data.id_relacion);
          if (updRel.error) throw updRel.error;
        }
      }
      var curCanales = String(providerRow.codigo_canales_venta || "").split("|").filter(Boolean);
      if (curCanales.indexOf(String(officeRow.id_oficina)) === -1) curCanales.push(String(officeRow.id_oficina));
      var curGrupos = String(providerRow.codigo_grupos_vendedores || "").split("|").filter(Boolean);
      if (groupRow && groupRow.id_grupo && curGrupos.indexOf(String(groupRow.id_grupo)) === -1) curGrupos.push(String(groupRow.id_grupo));
      var updProv = await client.from("mae_proveedores").update({ codigo_canales_venta: curCanales.join("|"), codigo_grupos_vendedores: curGrupos.join("|"), id_usuario_actualizacion: byUser }).eq("id_proveedor", providerRow.id_proveedor);
      if (updProv.error) throw updProv.error;
    } else if ((providerText || providerRow) && !officeRow) {
      warnings.push("Sin oficina: se completará después.");
    }
    if (providerRow && providerRow.id_proveedor) {
      // AGENTE A (2026-09-22): cada proveedor tiene UN catálogo (es_catalogo).
      var provNameCat = providerRow.nombre_comercial || providerRow.razon_social || providerRow.id_proveedor;
      var listsFound = await client.from("pre_listas_precios").select("*").eq("id_proveedor", providerRow.id_proveedor).order("fecha_inicio", { ascending: true });
      if (listsFound.error) throw listsFound.error;
      var provListsCat = (listsFound.data || []);
      if (!provListsCat.length) {
        var todayList = new Date().toISOString().slice(0, 10);
        var listId = ensureProveedorChainId_("LP-CAT-");
        var catPayload = { id_lista_precio: listId, codigo_lista: listId, nombre: "Catálogo " + String(provNameCat).slice(0, 120), id_proveedor: providerRow.id_proveedor, fecha_inicio: todayList, fecha_fin: null, moneda: "PEN", estado: "ACTIVA", id_usuario_actualizacion: byUser, es_catalogo: true };
        var newList = await client.from("pre_listas_precios").insert(catPayload);
        if (newList.error && String((newList.error && newList.error.message) || "").indexOf("es_catalogo") !== -1) {
          delete catPayload.es_catalogo;
          newList = await client.from("pre_listas_precios").insert(catPayload);
        }
        if (newList.error) throw newList.error;
        warnings.push("Catálogo creado para " + String(provNameCat) + ".");
      } else if (!provListsCat.some(function(l) { return l && l.es_catalogo === true; })) {
        var oldestCat = null;
        for (var liCat = 0; liCat < provListsCat.length; liCat += 1) {
          var nmCat = String((provListsCat[liCat] && provListsCat[liCat].nombre) || "");
          if (/^(lista base|cat[aá]logo) /i.test(nmCat)) { oldestCat = provListsCat[liCat]; break; }
        }
        if (!oldestCat) oldestCat = provListsCat[0];
        var markCat = await client.from("pre_listas_precios").update({ es_catalogo: true }).eq("id_lista_precio", oldestCat.id_lista_precio);
        if (markCat.error && String((markCat.error && markCat.error.message) || "").indexOf("es_catalogo") === -1) throw markCat.error;
      }
    }
    return { idProveedor: providerRow ? providerRow.id_proveedor : "", idOficina: officeRow ? officeRow.id_oficina : "", idGrupo: groupRow ? groupRow.id_grupo : "", advertencias: warnings };
  }
  function alcanceVentas29S_(scopeRows, user) {
    var rol = String((user && user.rol) || "").toUpperCase();
    if (rol === "SUPERADMIN") return { alcance: "GLOBAL", test: function() { return true; } };
    var rows = Array.isArray(scopeRows) ? scopeRows : [];
    var pick = function(rec) {
      var mine = rows.filter(function(r) { return String(r.recurso || "") === rec && r.permitido === true && String(r.id_sujeto || "") === String((user && user.id_usuario) || ""); });
      if (mine.length) return mine[0];
      var role = rows.filter(function(r) { return String(r.recurso || "") === rec && r.permitido === true && String(r.id_sujeto || "").toUpperCase() === rol; });
      return role[0] || null;
    };
    var found = pick("VER_LISTADO") || pick("VISUALIZAR_MODULO");
    var alcance = String((found && found.alcance) || "NINGUNO").toUpperCase();
    var me = String((user && user.id_usuario) || "");
    var mp = String((user && (user.id_proveedor || user.idProveedor)) || "");
    var mo = String((user && (user.id_oficina || user.idOficina)) || "");
    var mg = String((user && (user.id_grupo || user.idGrupo)) || "");
    var test = function(f) {
      f = f || {};
      if (alcance === "GLOBAL" || alcance === "TOTAL") return true;
      if (alcance === "PROPIO") return !!me && String(f.idUsuario || "") === me;
      if (alcance === "PROVEEDOR" || alcance === "ASIGNADOS") {
        // ASIGNADOS se trata como PROVEEDOR en el puente Supabase (en GAS legacy significa oficinas).
        if (!mp) return false;
        if (String(f.idProveedor || "") === mp) return true;
        var pds29T_ = f.proveedoresDetalle || [];
        return pds29T_.indexOf(mp) !== -1;
      }
      if (alcance === "OFICINA") {
        if (!mo) return false;
        return !!String(f.idOficina || "") && String(f.idOficina || "") === mo;
      }
      if (alcance === "GRUPO") {
        if (!mg) return false;
        return !!String(f.idGrupo || "") && String(f.idGrupo || "") === mg;
      }
      return false;
    };
    return { alcance: alcance, test: test };
  }
  // Helpers de autorización para escrituras de ventas (abono / entrega).
  // Regla de negocio: el abono lo aprueba y la entrega la gestiona una cuenta
  // DEL PROVEEDOR de esa venta (alcance PROVEEDOR). PROPIO = solo el creador;
  // ASIGNADOS se trata como PROVEEDOR en este puente (en GAS legacy = oficinas).
  function permisoVenta29S_(scopeRows, user, recursos) {
    var rol = String((user && user.rol) || "").toUpperCase();
    if (rol === "SUPERADMIN") return { permitido: true, alcance: "GLOBAL", recurso: recursos[0] };
    var rows = Array.isArray(scopeRows) ? scopeRows : [];
    for (var i = 0; i < recursos.length; i++) {
      var rec = recursos[i];
      var mine = rows.filter(function(r) { return String(r.recurso || "") === rec && r.permitido === true && String(r.id_sujeto || "") === String((user && user.id_usuario) || ""); });
      if (mine.length) return { permitido: true, alcance: String(mine[0].alcance || "PROPIO").toUpperCase(), recurso: rec };
      var role = rows.filter(function(r) { return String(r.recurso || "") === rec && r.permitido === true && String(r.id_sujeto || "").toUpperCase() === rol; });
      if (role.length) return { permitido: true, alcance: String(role[0].alcance || "PROPIO").toUpperCase(), recurso: rec };
    }
    return null;
  }
  async function proveedoresDetalleVenta29S_(client, idVenta) {
    var det = await client.from("vta_ventas_contado_detalle").select("id_material,precio_unitario").eq("id_venta", idVenta);
    if (det.error) throw det.error;
    var rows = det.data || [];
    if (!rows.length) return [];
    var mats = [], seenM = {}, i;
    for (i = 0; i < rows.length; i++) { var m0 = String(rows[i].id_material || ""); if (m0 && !seenM[m0]) { seenM[m0] = true; mats.push(m0); } }
    if (!mats.length) return [];
    var pd = await client.from("pre_lista_precio_detalle").select("id_material,precio_base,id_lista_precio").in("id_material", mats);
    if (pd.error) throw pd.error;
    var listIds = [], seenL = {};
    rows.forEach(function(d) {
      var hit = (pd.data || []).filter(function(p) { return String(p.id_material || "") === String(d.id_material || "") && Number(p.precio_base || 0) === Number(d.precio_unitario || 0); })[0] || null;
      var lid = hit && String(hit.id_lista_precio || "");
      if (lid && !seenL[lid]) { seenL[lid] = true; listIds.push(lid); }
    });
    if (!listIds.length) return [];
    var lp = await client.from("pre_listas_precios").select("id_lista_precio,id_proveedor").in("id_lista_precio", listIds);
    if (lp.error) throw lp.error;
    var out = [], seenP = {};
    (lp.data || []).forEach(function(l) { var p0 = String(l.id_proveedor || ""); if (p0 && !seenP[p0]) { seenP[p0] = true; out.push(p0); } });
    return out;
  }
  async function exigirAccesoVenta29S_(client, user, recursos, idVenta, accionNombre) {
    var scopeRows = [];
    var q = await client.from("seg_permisos").select("id_sujeto,recurso,permitido,alcance").eq("estado", "ACTIVO").eq("modulo", "VENTAS_CONTADO").in("id_sujeto", [user.id_usuario, String((user && user.rol) || "").toUpperCase()]);
    if (q.error) throw q.error;
    scopeRows = q.data || [];
    var perm = permisoVenta29S_(scopeRows, user, recursos);
    if (!perm) throw new Error("No tienes permiso para " + accionNombre + ".");
    var vq = await client.from("vta_ventas_contado").select("id_venta,id_usuario,id_proveedor,id_oficina,id_grupo,estado_abono,estado_entrega,estado_general").eq("id_venta", idVenta).maybeSingle();
    if (vq.error) throw vq.error;
    var venta = vq.data;
    if (!venta) throw new Error("No se encontró la venta.");
    var alcance = perm.alcance;
    var mp = String((user && (user.id_proveedor || user.idProveedor)) || "").trim();
    var ok = false;
    if (alcance === "GLOBAL" || alcance === "TOTAL") ok = true;
    else if (alcance === "PROPIO") ok = !!String(user.id_usuario || "") && String(venta.id_usuario || "") === String(user.id_usuario || "");
    else if (alcance === "PROVEEDOR" || alcance === "ASIGNADOS") {
      if (mp) {
        var provCab29G_ = String(venta.id_proveedor || "").trim();
        if (provCab29G_ && provCab29G_ === mp) ok = true;
        if (!ok) {
          var provsDet29G_ = await proveedoresDetalleVenta29S_(client, idVenta);
          if (provsDet29G_.indexOf(mp) !== -1) ok = true;
          else if (!provCab29G_ && !provsDet29G_.length) {
            try {
              var gq29G_ = await client.from("vta_gestion_entrega").select("id_proveedor").eq("id_venta", idVenta).maybeSingle();
              var provG29G_ = String((gq29G_.data && gq29G_.data.id_proveedor) || "").trim();
              ok = !!provG29G_ && provG29G_ === mp;
            } catch (_) {}
          }
        }
      }
    }
    else if (alcance === "OFICINA") { var mo29G_ = String((user && (user.id_oficina || user.idOficina)) || "").trim(); ok = !!mo29G_ && !!String(venta.id_oficina || "") && String(venta.id_oficina || "") === mo29G_; }
    else if (alcance === "GRUPO") { var mg29G_ = String((user && (user.id_grupo || user.idGrupo)) || "").trim(); ok = !!mg29G_ && !!String(venta.id_grupo || "") && String(venta.id_grupo || "") === mg29G_; }
    if (!ok) {
      if (alcance === "PROVEEDOR" || alcance === "ASIGNADOS") throw new Error("Solo una cuenta del proveedor de esta venta puede " + accionNombre + " (alcance " + alcance + ").");
      throw new Error("No tienes acceso a esta venta con tu alcance actual (" + alcance + ").");
    }
    return { venta: venta, alcance: alcance, proveedorUsuario: mp, recurso: perm.recurso };
  }
  async function executeSupabaseOperation(client, operation, args, user) {
    const query = async function(table, columns) { const response = await client.from(table).select(columns || "*"); if (response.error) throw response.error; return response.data || []; };
    const csv = function(headers, rows) { const cell = function(value) { const text = String(value == null ? "" : value); return '"' + text.replace(/"/g, '""') + '"'; }; return "\\ufeff" + [headers].concat(rows || []).map(function(row) { return row.map(cell).join(","); }).join("\\r\\n"); };
    const file = function(name, headers, rows) { return { nombre: name, nombreArchivo: name, contenido: csv(headers, rows), mimeType: "text/csv;charset=utf-8", cantidad: (rows || []).length }; };
    if (operation === "anularVentaContadoModulo") { const id=String(args[0]||"").trim(),reason=String(args[1]||"").trim();if(!id||!reason)throw new Error("Indica la venta y el motivo de anulación.");const current=await client.from("vta_ventas_contado").select("estado_entrega,estado_general,observaciones").eq("id_venta",id).maybeSingle();if(current.error)throw current.error;if(!current.data)throw new Error("No se encontró la venta.");if(["ENTREGADA","ANULADA"].indexOf(String(current.data.estado_entrega||"").toUpperCase())!==-1||String(current.data.estado_general||"").toUpperCase()==="ANULADA")throw new Error("Esta venta ya no puede anularse.");const note=[current.data.observaciones,"ANULACIÓN: "+reason].filter(Boolean).join("\n");const saved=await client.from("vta_ventas_contado").update({estado_general:"ANULADA",estado_entrega:"ANULADA",observaciones:note,motivo_anulacion:reason,fecha_anulacion:new Date().toISOString(),id_usuario_actualizacion:user.id_usuario}).eq("id_venta",id);if(saved.error)throw saved.error;const savedDelivery=await client.from("vta_gestion_entrega").update({estado_entrega:"ANULADA"}).eq("id_venta",id);if(savedDelivery.error)throw savedDelivery.error;return {correcto:true,mensaje:"Venta anulada; se conserva la trazabilidad."}; }
    if (operation === "guardarGestionEntregaVentaContadoModulo") { const g = args[0] || {}; const idG = String(g.idVenta || "").trim(); if (!idG) throw new Error("Indica la venta a gestionar."); const abonoG = await client.from("vta_ventas_contado").select("estado_abono").eq("id_venta", idG).maybeSingle(); if (abonoG.error) throw abonoG.error; if (!abonoG.data) throw new Error("No se encontró la venta."); if (String(abonoG.data.estado_abono || "").toUpperCase() !== "ABONO_CONFIRMADO") throw new Error("Confirma el abono de la venta antes de gestionar su entrega."); const gateGes29S_=await exigirAccesoVenta29S_(client,user,["GESTIONAR_ENTREGA","PROGRAMAR_ENTREGA","CONFIRMAR_ENTREGA"],idG,"gestionar la entrega"); if(["ENTREGADA","ANULADA"].indexOf(String(gateGes29S_.venta.estado_entrega||"").toUpperCase())!==-1||String(gateGes29S_.venta.estado_general||"").toUpperCase()==="ANULADA") throw new Error("La entrega ya está cerrada (ENTREGADA/ANULADA) y no puede modificarse."); var provEfGes29S_=String(g.idProveedor||"").trim(); if((gateGes29S_.alcance==="PROVEEDOR"||gateGes29S_.alcance==="ASIGNADOS")&&gateGes29S_.proveedorUsuario) provEfGes29S_=gateGes29S_.proveedorUsuario; const estadoG = String(g.estadoEntrega || "PROGRAMADA").toUpperCase(); const found = await client.from("vta_gestion_entrega").select("id_gestion_entrega").eq("id_venta", idG).maybeSingle(); if (found.error) throw found.error; const gid = (found.data && found.data.id_gestion_entrega) || ("ENT-" + Date.now()); const rowG = { id_gestion_entrega: gid, id_venta: idG, id_proveedor: provEfGes29S_ || null, estado_entrega: estadoG, detalle_observacion: g.detalleObservacion || null, fecha_programada_entrega: g.fechaProgramadaEntrega || null }; if (estadoG === "ENTREGADA") rowG.fecha_real_entrega = new Date().toISOString(); const savedG = await client.from("vta_gestion_entrega").upsert(rowG, { onConflict: "id_gestion_entrega" }); if (savedG.error) throw savedG.error; const files = Array.isArray(g.evidencias) ? g.evidencias : []; for (let fi = 0; fi < files.length; fi++) { const f = files[fi] || {}; const b64 = String(f.base64 || "").replace(/\s/g, ""); if (!b64) continue; const fmime = String(f.mimeType || f.type || "application/octet-stream").toLowerCase(); const safeF = String(f.nombre || f.name || "evidencia").replace(/[^A-Za-z0-9_.-]+/g, "_").slice(-60); const pathF = "entregas/" + idG + "/" + Date.now() + "_" + fi + "_" + (safeF || "evidencia"); const upF = await client.storage.from("evidencias").upload(pathF, base64ToSalesBlob_(b64, fmime), { contentType: fmime, upsert: true }); if (upF.error) throw new Error("No se pudo guardar la evidencia en Storage: " + upF.error.message); const urlF = client.storage.from("evidencias").getPublicUrl(pathF).data.publicUrl; const insF = await client.from("vta_evidencias_entrega").insert({ id_evidencia: gid + "-EV" + Date.now() + fi, id_gestion_entrega: gid, id_venta: idG, id_proveedor: provEfGes29S_ || null, tipo_evidencia: f.tipoEvidencia || "EVIDENCIA", id_archivo: pathF, url_archivo: urlF, nombre_archivo: f.nombre || f.name || "evidencia", mime_archivo: fmime, usuario_subida: (user && (user.nombre || user.correo)) || "" }); if (insF.error) throw insF.error; }   const savedV = await client.from("vta_ventas_contado").update(Object.assign({ estado_entrega: estadoG }, estadoG === "ENTREGADA" ? { estado_general: "ENTREGADA" } : {}, (estadoG === "PROGRAMADA" || estadoG === "EN_RUTA") ? { programado_id: user.id_usuario, programado_nombre: user.nombre || user.correo || "" } : {}, estadoG === "ENTREGADA" ? { entregado_id: user.id_usuario, entregado_nombre: user.nombre || user.correo || "" } : {})).eq("id_venta", idG); if (savedV.error) throw savedV.error; return { correcto: true, mensaje: "Gestión de entrega actualizada." }; }
    if (operation === "guardarVentaContadoModulo" || operation === "modificarVentaContadoModulo") { const x=args[0]||{},id=x.idVenta||"VTA-"+Date.now(),code=x.codigoVenta||"PED-360-"+String(Date.now()).slice(-6);const offers=await Promise.all((x.detalles||[]).map(function(d){return client.from("pre_lista_precio_detalle").select("id_detalle_precio,id_material,precio_base,moneda,detalle_combo").eq("id_detalle_precio",d.idDetallePrecio||d.idOferta).maybeSingle();}));const details=offers.map(function(r,i){if(r.error)throw r.error;const price=r.data||{};return {id_detalle_venta:id+"-DET-"+(i+1),id_venta:id,linea:i+1,id_material:price.id_material||x.detalles[i].idMaterial,cantidad:Number(x.detalles[i].cantidad||1),precio_unitario:Number(price.precio_base||0),precio_total:Number(price.precio_base||0)*Number(x.detalles[i].cantidad||1),detalle_combo:price.detalle_combo||null,estado_material:"ACTIVO"};});const total=details.reduce(function(n,d){return n+Number(d.precio_total||0);},0);const receipt=await uploadSalesReceiptComprobante_(client,id,code,x.comprobante);const sale={id_venta:id,codigo_venta:code,tipo_venta:x.tipoVenta||"CONTADO",id_usuario:user.id_usuario,correo_usuario:user.correo,nombre_usuario:user.nombre,rol_usuario:user.rol,id_oficina:x.idOficina||null,id_grupo:x.idGrupo||null,numero_solicitud_sap:x.cuentaContrato||null,codigo_suministro:x.cuentaContrato||null,tipo_documento_cliente:"DNI",numero_documento_cliente:x.dniCliente||x.dni||null,nombres_cliente:x.nombreCliente||null,telefono_contacto:x.telefonoCliente||x.telefono||null,direccion_instalacion:x.direccionEntrega||null,referencia_direccion:x.referencia||null,monto_total_venta:total,moneda:"PEN",estado_abono:"PENDIENTE_CONFIRMACION",estado_entrega:"REGISTRADA",estado_general:"EN_PROCESO",observaciones:x.observaciones||null,tipo_receptor:x.tipoReceptor||"COMPRADOR",nombre_receptor:x.nombreReceptor||null,dni_receptor:x.dniReceptor||null,telefono_receptor:x.telefonoReceptor||null,parentesco_receptor:x.relacionReceptor||null,id_usuario_actualizacion:user.id_usuario};if(receipt){sale.url_comprobante=receipt.url;sale.nombre_comprobante=receipt.nombre;sale.mime_comprobante=receipt.mime;sale.estado_comprobante="CARGADO";}const saved=await client.from("vta_ventas_contado").upsert(sale);if(saved.error)throw saved.error;if(details.length){const inserted=await client.from("vta_ventas_contado_detalle").upsert(details);if(inserted.error)throw inserted.error;}return {correcto:true,idVenta:id,codigoVenta:code,mensaje:"Venta registrada correctamente."}; }
    if (operation === "listarVentasContadoModulo" || operation === "obtenerDetalleVentaContadoModulo") {
      const wanted=operation==="obtenerDetalleVentaContadoModulo"?String(args[0]||""):"";
      let request=client.from("vta_ventas_contado").select("*").order("fecha_registro",{ascending:false});
      if(wanted)request=request.eq("id_venta",wanted);
      const response=await request;if(response.error)throw response.error;
      const sales=response.data||[],ids=sales.map(function(s){return s.id_venta;});
      const detailRows=ids.length?(await client.from("vta_ventas_contado_detalle").select("*").in("id_venta",ids)):{data:[],error:null};
      if(detailRows.error)throw detailRows.error;
      const gestionRows=ids.length?(await client.from("vta_gestion_entrega").select("*").in("id_venta",ids)):{data:[],error:null};
      if(gestionRows.error)throw gestionRows.error;
      const evidenciaRows=ids.length?(await client.from("vta_evidencias_entrega").select("*").in("id_venta",ids)):{data:[],error:null};
      if(evidenciaRows.error)throw evidenciaRows.error;
      var usersScope29S_=[];
      try { usersScope29S_=await query("seg_usuarios"); } catch (_) {}
      var sellerName29S_=function(id) {
        var found=(usersScope29S_||[]).filter(function(u){return String(u.id_usuario||"")===""+String(id||"");})[0]||{};
        return found.nombre||found.correo||"";
      };
      const related=await Promise.all([query("mae_materiales"),query("pre_lista_precio_detalle"),query("pre_listas_precios"),query("mae_proveedores")]);
      const map=function(s){
        const rows=(detailRows.data||[]).filter(function(d){return d.id_venta===s.id_venta;}).map(function(d){
          const material=related[0].find(function(x){return x.id_material===d.id_material;})||{};
          const price=related[1].find(function(x){return x.id_material===d.id_material&&Number(x.precio_base||0)===Number(d.precio_unitario||0);})||{};
          const list=related[2].find(function(x){return x.id_lista_precio===price.id_lista_precio;})||{};
          const provider=related[3].find(function(x){return x.id_proveedor===list.id_proveedor;})||{};
          return {idDetalleVenta:d.id_detalle_venta,idDetallePrecio:price.id_detalle_precio||"",idListaPrecio:list.id_lista_precio||"",idMaterial:d.id_material,codigoMaterial:d.codigo_material||material.codigo_material||"",descripcionMaterial:d.descripcion_material||material.nombre_material||material.descripcion_material||"Material",cantidad:d.cantidad,precioUnitario:d.precio_unitario,totalLinea:d.precio_total,moneda:s.moneda,detalleCombo:d.detalle_combo,estadoItem:d.estado_material,idProveedorPrecio:list.id_proveedor||"",nombreComercialProveedor:provider.nombre_comercial||provider.razon_social||"",codigoSapProveedor:provider.codigo_sap||""};
        });
        const editable=["ENTREGADA","ANULADA"].indexOf(String(s.estado_entrega||s.estado_general||"").toUpperCase())===-1&&String(s.estado_general||"").toUpperCase()!=="ANULADA";
        const gests=(gestionRows.data||[]).filter(function(g){return g.id_venta===s.id_venta;}).map(function(g){return {idGestionEntrega:g.id_gestion_entrega,idVenta:g.id_venta,idProveedor:g.id_proveedor,estadoEntrega:g.estado_entrega,fechaProgramadaEntrega:g.fecha_programada_entrega,fechaRealEntrega:g.fecha_real_entrega||"",detalleObservacion:g.detalle_observacion,evidencias:(evidenciaRows.data||[]).filter(function(e){return e.id_gestion_entrega===g.id_gestion_entrega;}).map(function(e){return {tipoEvidencia:e.tipo_evidencia,url:e.url_archivo,nombreArchivo:e.nombre_archivo,idArchivo:e.id_archivo||e.url_archivo};})};});
        const allEv=(evidenciaRows.data||[]).filter(function(e){return e.id_venta===s.id_venta;}).map(function(e){return {idArchivo:e.id_archivo||e.url_archivo,url:e.url_archivo,nombreArchivo:e.nombre_archivo,tipoEvidencia:e.tipo_evidencia};});
        return {idVenta:s.id_venta,codigoVenta:s.codigo_venta,nombreCliente:s.nombres_cliente,cuentaContrato:s.numero_solicitud_sap||s.codigo_suministro,dniCliente:s.numero_documento_cliente,telefonoCliente:s.telefono_contacto,direccionEntrega:s.direccion_instalacion,referencia:s.referencia_direccion,tipoVenta:s.tipo_venta,fechaRegistro:s.fecha_registro,totalVenta:s.monto_total_venta,importeVisible:s.monto_total_venta,moneda:s.moneda,estado:s.estado_general||s.estado_entrega,estadoAbono:s.estado_abono,estadoEntrega:s.estado_entrega,estadoGeneral:s.estado_general,montoTotalVenta:s.monto_total_venta,nombresCliente:s.nombres_cliente,apellidosCliente:s.apellidos_cliente,numeroDocumentoCliente:s.numero_documento_cliente,distrito:s.distrito,nombreOficina:s.nombre_oficina,idOficina:s.id_oficina,idUsuario:s.id_usuario,nombreUsuario:sellerName29S_(s.id_usuario),idProveedor:s.id_proveedor,idGrupo:s.id_grupo,abonoAprobadoId:s.abono_aprobado_id||"",abonoAprobadoPor:s.abono_aprobado_nombre||"",programadoId:s.programado_id||"",programadoPor:s.programado_nombre||"",entregadoId:s.entregado_id||"",entregadoPor:s.entregado_nombre||"",observacionEntrega:(gests[0]&&gests[0].detalleObservacion)||"",motivoAnulacion:s.motivo_anulacion||extractSalesCancelReason_(s.observaciones),fechaAnulacion:s.fecha_anulacion||"",idArchivoComprobante:s.url_comprobante||"",urlComprobante:s.url_comprobante||"",nombreArchivoComprobante:s.nombre_comprobante||"Comprobante de pago",nombreComprobante:s.nombre_comprobante||"",mimeComprobante:s.mime_comprobante||"",estadoComprobantePagoCliente:s.estado_comprobante||(s.url_comprobante?"CARGADO":"NO_CARGADO"),tipoReceptor:s.tipo_receptor||"",nombreReceptor:s.nombre_receptor||"",dniReceptor:s.dni_receptor||"",telefonoReceptor:s.telefono_receptor||"",relacionReceptor:s.parentesco_receptor||"",gestionesEntrega:gests,gestionEntrega:gests[0]||null,evidencias:allEv,puedeModificar:editable,puedeAnularObservada:editable,detalles:rows,proveedoresDetalle:(function(){var seen29P_={},out29P_=[],i29P_,r29P_;for(i29P_=0;i29P_<rows.length;i29P_++){r29P_=String((rows[i29P_]&&rows[i29P_].idProveedorPrecio)||"");if(r29P_&&!seen29P_[r29P_]){seen29P_[r29P_]=true;out29P_.push(r29P_);}}return out29P_;})()};
      };
      const mapped=sales.map(map);
      var scopeRows29S_=null;
      var scopeQ29S_=await client.from("seg_permisos").select("id_sujeto,recurso,permitido,alcance").eq("estado","ACTIVO").eq("modulo","VENTAS_CONTADO").in("id_sujeto",[user.id_usuario,String((user&&user.rol)||"").toUpperCase()]);
      if (scopeQ29S_.error) throw scopeQ29S_.error;
      scopeRows29S_=scopeQ29S_.data || [];
      var scope29S_=alcanceVentas29S_(scopeRows29S_, user);
      var visible29S_=mapped.filter(function(m) { try { return scope29S_.test(m); } catch (_) { return false; } });
      var bono29S_=0;
      try {
        var bonoQ29S_=await client.from("sys_parametros").select("valor").eq("clave","BONO_VENDEDOR_MONTO").maybeSingle();
        if (!bonoQ29S_.error && bonoQ29S_.data) bono29S_=Number(bonoQ29S_.data.valor || 0) || 0;
      } catch (_) {}
      visible29S_.forEach(function(m) { m.bonoVendedor = bono29S_; m.alcanceAplicado = scope29S_.alcance; });
      if (operation==="obtenerDetalleVentaContadoModulo" && mapped.length && !visible29S_.length) throw new Error("No tienes acceso a esta venta con tu alcance actual (" + scope29S_.alcance + ").");
      return operation==="obtenerDetalleVentaContadoModulo"?{venta:visible29S_[0]||mapped[0]||{},detalles:((visible29S_[0]||mapped[0])||{}).detalles||[],puedeModificar:!!((visible29S_[0]||mapped[0])||{}).puedeModificar,evidenciasEntrega:((visible29S_[0]||mapped[0])||{}).evidencias||[],gestionesEntrega:((visible29S_[0]||mapped[0])||{}).gestionesEntrega||[]}:{registros:visible29S_,paginacion:{pagina:1,totalPaginas:1,total:visible29S_.length}};
    }
    if (operation === "exportarVentasContadoModulo") {
      const base = await executeSupabaseOperation(client, "listarVentasContadoModulo", [], user);
      const rows = base.registros || [];
      var bonoExp = 0;
      try {
        var bq = await client.from("sys_parametros").select("valor").eq("clave", "BONO_VENDEDOR_MONTO").maybeSingle();
        if (!bq.error && bq.data) bonoExp = Number(bq.data.valor || 0) || 0;
      } catch (_) {}
      const provsExp = await query("mae_proveedores").catch(function() { return []; });
      const usersExp = await query("seg_usuarios").catch(function() { return []; });
      const userNameExp = function(id) {
        var found = usersExp.filter(function(u) { return String(u.id_usuario || "") === String(id || ""); })[0] || {};
        return found.nombre || found.correo || String(id || "");
      };
      const provNameExp = function(id) {
        var found = provsExp.filter(function(p) { return String(p.id_proveedor || "") === String(id || ""); })[0] || {};
        return found.nombre_comercial || found.razon_social || String(id || "");
      };
      const headExp = ["CODIGO", "FECHA", "CLIENTE", "DOCUMENTO", "PROVEEDOR", "OFICINA", "MONTO", "ABONO", "ENTREGA", "VENTA_EFECTUADA_POR", "ABONO_APROBADO_POR", "PROGRAMADO_POR", "ENTREGA_REALIZADA_POR", "OBSERVACION", "BONO_VENDEDOR"];
      const bodyExp = rows.map(function(v) {
        return [v.codigoVenta || "", String(v.fechaRegistro || "").split("T")[0], [v.nombresCliente, v.apellidosCliente].filter(Boolean).join(" ") || v.nombreCliente || "", v.numeroDocumentoCliente || v.dniCliente || "", provNameExp(v.idProveedor), v.nombreOficina || "", Number(v.montoTotalVenta || v.totalVenta || 0), String(v.estadoAbono || "").replace(/_/g, " "), String(v.estadoEntrega || "").replace(/_/g, " "), userNameExp(v.idUsuario), v.abonoAprobadoPor || "", v.programadoPor || "", v.entregadoPor || "", v.observacionEntrega || v.observacionConfirmacionAbono || "", bonoExp];
      });
      return file("ventas_360.csv", headExp, bodyExp);
    }
    if (operation === "listarDespachoModulo") { const full = await executeSupabaseOperation(client, "listarVentasContadoModulo", args, user); const mine = String((user && (user.id_proveedor || user.idProveedor)) || "").trim(); const only = (full.registros || []).filter(function(s) { const st = String((s.gestionEntrega && s.gestionEntrega.estadoEntrega) || s.estadoEntrega || s.estado || "").toUpperCase(); if (["PROGRAMADA", "EN_RUTA"].indexOf(st) === -1) return false; if (mine) { const prov = String((s.gestionEntrega && s.gestionEntrega.idProveedor) || ""); if (prov && prov !== mine) return false; if (!prov) { const vpv29D_ = String(s.idProveedor || ""); const pds29D_ = s.proveedoresDetalle || []; if (vpv29D_ !== mine && pds29D_.indexOf(mine) === -1) return false; } } return true; }); return { registros: only, paginacion: { pagina: 1, totalPaginas: 1, total: only.length } }; }
    /* AGENTE B (2026-09-18): eliminaciones con confirmacion en la UI (detalle de
       precio, lista oficial en cascada y material con chequeo de dependencias).
       Sin migraciones: tablas pre_lista_precio_detalle, pre_listas_precios,
       mae_materiales y vta_ventas_contado_detalle ya existentes. */
    if (operation === "eliminarDetalleListaPrecioModulo") { const delIdB=String((args[0] && args[0].idDetallePrecio) || args[0] || "").trim(); if(!delIdB) throw new Error("Indica el detalle de precio a eliminar."); const goneB=await client.from("pre_lista_precio_detalle").delete().eq("id_detalle_precio",delIdB).select("id_detalle_precio"); if(goneB.error) throw goneB.error; if(!goneB.data || !goneB.data.length) throw new Error("El detalle de precio ya no existe."); return {correcto:true,idDetallePrecio:delIdB,mensaje:"El precio fue eliminado."}; }
    if (operation === "eliminarListaOficialPrecioModulo") { const listIdB=String((args[0] && args[0].idListaPrecio) || args[0] || "").trim(); if(!listIdB) throw new Error("Indica la lista oficial a eliminar."); var catRowB=null; var catQ=await client.from("pre_listas_precios").select("id_lista_precio,es_catalogo").eq("id_lista_precio",listIdB).maybeSingle(); if(!catQ.error) { catRowB=catQ.data; } else if(String((catQ.error&&catQ.error.message)||"").indexOf("es_catalogo")===-1) { throw catQ.error; } if(catRowB && catRowB.es_catalogo===true) throw new Error("Es el catálogo del proveedor y no puede eliminarse. Inactívalo si ya no lo usas."); if(!catRowB) { var exB=await client.from("pre_listas_precios").select("id_lista_precio").eq("id_lista_precio",listIdB).maybeSingle(); if(exB.error) throw exB.error; if(!exB.data) throw new Error("La lista oficial ya no existe."); } const detB=await client.from("pre_lista_precio_detalle").delete().eq("id_lista_precio",listIdB).select("id_detalle_precio"); if(detB.error) throw detB.error; const headB=await client.from("pre_listas_precios").delete().eq("id_lista_precio",listIdB).select("id_lista_precio"); if(headB.error) throw headB.error; if(!headB.data || !headB.data.length) throw new Error("La lista oficial ya no existe."); return {correcto:true,idListaPrecio:listIdB,detallesEliminados:(detB.data||[]).length,mensaje:"La lista oficial y sus detalles fueron eliminados."}; }
    if (operation === "eliminarMaterialPrecioModulo") { const matIdB=String((args[0] && args[0].idMaterial) || args[0] || "").trim(); if(!matIdB) throw new Error("Indica el material a eliminar."); const usedPriceB=await client.from("pre_lista_precio_detalle").select("id_detalle_precio").eq("id_material",matIdB).limit(1); if(usedPriceB.error) throw usedPriceB.error; if(usedPriceB.data && usedPriceB.data.length) throw new Error("El material esta en uso en listas de precios y no puede eliminarse. Inactivalo en su lugar."); const usedSaleB=await client.from("vta_ventas_contado_detalle").select("id_detalle_venta").eq("id_material",matIdB).limit(1); if(usedSaleB.error) throw usedSaleB.error; if(usedSaleB.data && usedSaleB.data.length) throw new Error("El material esta en uso en ventas registradas y no puede eliminarse. Inactivalo en su lugar."); const goneMatB=await client.from("mae_materiales").delete().eq("id_material",matIdB).select("id_material"); if(goneMatB.error) throw goneMatB.error; if(!goneMatB.data || !goneMatB.data.length) throw new Error("El material ya no existe."); return {correcto:true,idMaterial:matIdB,mensaje:"El material fue eliminado."}; }
    if (operation === "listarModulosAdminMotor") { const rows = await query("app_modulos"); return rows.map(function(x) { return { idModulo:x.id_modulo,codigo:x.codigo,nombre:x.nombre,descripcion:x.descripcion,icono:x.icono,grupoMenu:x.grupo_menu,orden:x.orden,tipoVista:x.tipo_vista,estado:x.estado }; }); }
    if (operation === "listarParametrosAdminMotor") { const rows = await query("sys_parametros"); return rows.map(function(x) { return { clave:x.clave,valor:x.valor,descripcion:x.descripcion,tipo:x.tipo,editable:x.editable !== false,estado:x.estado }; }); }
    if (operation === "guardarParametroAdminMotor") { const s = args[0] || {}; const clave = String(s.clave || "").trim(); if (!clave) throw new Error("Indica la clave del parámetro."); let valor = s.valor; if (typeof valor === "boolean") valor = valor ? "TRUE" : "FALSE"; valor = String(valor === null || valor === undefined ? "" : valor).trim(); if (["EXPIRACION_SESION_MINUTOS", "APP_REFRESH_SECONDS"].indexOf(clave.toUpperCase()) !== -1) { const numero = Number(valor); const minimo = clave.toUpperCase() === "APP_REFRESH_SECONDS" ? 60 : 5; if (!numero || numero < minimo) throw new Error("El valor de " + clave + " debe ser un número mayor o igual a " + minimo + "."); valor = String(Math.floor(numero)); } const saved = await client.from("sys_parametros").upsert({ clave: clave, valor: valor, estado: "ACTIVO" }, { onConflict: "clave" }); if (saved.error) throw saved.error; return { correcto: true, clave: clave, valor: valor, mensaje: "Parámetro actualizado." }; }
    if (operation === "listarCatalogosAdminMotor") { const rows = await query("app_catalogos"); const commercial=[{codigo:"MP_NEGOCIOS",nombre:"Negocios comerciales",descripcion:"Negocios disponibles para registrar ventas."},{codigo:"MP_PRODUCTOS_PRINCIPALES",nombre:"Productos principales",descripcion:"Productos disponibles para clasificar materiales y ofertas."},{codigo:"MP_TIPOS_MATERIAL",nombre:"Tipos de material",descripcion:"Tipos usados para clasificar materiales y filtrar ofertas."},{codigo:"MP_SUBTIPOS_MATERIAL",nombre:"Subtipos de material",descripcion:"Subtipos usados para clasificar materiales y filtrar ofertas."},{codigo:"MP_MARCAS",nombre:"Marcas de materiales",descripcion:"Marcas disponibles en el maestro de materiales."}]; return rows.map(function(x) { return { idCatalogo:x.id_catalogo,codigo:x.codigo,nombre:x.nombre,descripcion:x.descripcion,estado:x.estado }; }).concat(commercial.filter(function(required){return !rows.some(function(x){return x.codigo===required.codigo;});}).map(function(required){return {idCatalogo:"SYSTEM-"+required.codigo,codigo:required.codigo,nombre:required.nombre,descripcion:required.descripcion,estado:"ACTIVO"};})); }
    if (operation === "listarRecursosVisualesAdminMotor") return [];
    if (operation === "listarRolesAdminMotor" || operation === "listarRolesAsignablesUsuariosMotor") { const all = await Promise.all([query("seg_roles"),query("seg_usuarios")]); return { roles: all[0].map(function(x) { const activeUsers=all[1].filter(function(person){return String(person.estado||"").toUpperCase()==="ACTIVO" && (String(person.rol||"")===String(x.codigo||"") || String(person.rol||"")===String(x.id_rol||""));}).length; return { idRol:x.id_rol,codigo:x.codigo,nombre:x.nombre,descripcion:x.descripcion,nivel:x.nivel,estado:x.estado,sistema:x.sistema,protegido:!!x.sistema,usuariosActivos:activeUsers }; }) }; }
    if (operation === "listarUsuariosAdminMotor") { const all=await Promise.all([query("seg_usuarios"),query("seg_roles"),query("mae_proveedores"),query("mae_oficinas"),query("mae_grupos")]); return { registros: all[0].map(function(x) { const role=all[1].find(function(item){return item.codigo===x.rol || item.id_rol===x.rol;})||{};const provider=all[2].find(function(item){return item.id_proveedor===x.id_proveedor;})||{};const office=all[3].find(function(item){return item.id_oficina===x.id_oficina;})||{};const group=all[4].find(function(item){return item.id_grupo===x.id_grupo;})||{};return { idUsuario:x.id_usuario, correo:x.correo, nombre:x.nombre, telefono:x.telefono, rol:role.codigo||x.rol, nombreRol:role.nombre||x.rol||"", idProveedor:x.id_proveedor, nombreComercialProveedor:provider.nombre_comercial||provider.razon_social||"", razonSocialProveedor:provider.razon_social||"", idOficina:x.id_oficina, nombreOficina:office.nombre||"", idGrupo:x.id_grupo, nombreGrupo:group.nombre||"", estado:x.estado, tipoDocumento:x.tipo_documento, numeroDocumento:x.numero_documento }; }), contextoAcceso: { idUsuario:user.id_usuario, rol:user.rol, alcance:"GLOBAL" } }; }
    if (operation === "listarSesionesAuditoriaAdminMotor") { const rows=await query("seg_sesiones");const users=await query("seg_usuarios");const filter=args[0]||{};const wanted=String(filter.estado||"ACTIVAS").toUpperCase();const records=rows.filter(function(x){return wanted==="TODOS" || (wanted==="ACTIVAS"?x.estado==="ACTIVA":x.estado===wanted);}).filter(function(x){const text=String(filter.texto||"").toLowerCase();return !text || [x.correo,x.rol,x.modulo_actual].join(" ").toLowerCase().indexOf(text)!==-1;}).map(function(x){const u=users.find(function(item){return item.id_usuario===x.id_usuario;})||{};const activity=x.ultima_actividad?new Date(x.ultima_actividad).getTime():Date.now();return {idSesion:x.id_sesion,nombre:u.nombre||"",correo:x.correo,nombreRol:x.rol||u.rol||"—",proveedorIdentidad:x.origen||"SUPABASE",fechaInicio:x.fecha_inicio,ultimaActividad:x.ultima_actividad,fechaExpiracion:x.fecha_fin||"—",estado:x.estado,estadoOperativo:x.estado==="ACTIVA"?"VIGENTE":x.estado,moduloActual:x.modulo_actual||"—",puedeCerrar:x.estado==="ACTIVA",minutosDesdeActividad:Math.max(0,Math.round((Date.now()-activity)/60000))};}).sort(function(a,b){return new Date(b.ultimaActividad||0)-new Date(a.ultimaActividad||0);});return {registros:records,total:records.length,resumen:{activas:records.filter(function(x){return x.estado==="ACTIVA";}).length}}; }
    if (operation === "obtenerDetalleSesionAuditoriaAdminMotor") { const id=String(args[0]||"").trim();if(!id)throw new Error("No se indicó la sesión.");const row=(await client.from("seg_sesiones").select("*").eq("id_sesion",id).maybeSingle());if(row.error)throw row.error;if(!row.data)throw new Error("La sesión no existe.");const userRow=(await client.from("seg_usuarios").select("nombre,rol").eq("id_usuario",row.data.id_usuario).maybeSingle());if(userRow.error)throw userRow.error;const access=(await client.from("seg_auditoria_accesos").select("fecha_hora,accion,resultado,origen,motivo").eq("id_sesion",id).order("fecha_hora",{ascending:false}).limit(50));if(access.error)throw access.error;const x=row.data;return {sesion:{idSesion:x.id_sesion,idSesionEnmascarado:x.id_sesion,nombre:(userRow.data||{}).nombre||"",correo:x.correo,nombreRol:x.rol||(userRow.data||{}).rol||"—",proveedorIdentidad:x.origen||"SUPABASE",fechaInicio:x.fecha_inicio,ultimaActividad:x.ultima_actividad,fechaExpiracion:x.fecha_fin||"—",fechaFin:x.fecha_fin||"—",estado:x.estado,estadoOperativo:x.estado==="ACTIVA"?"VIGENTE":x.estado,moduloActual:x.modulo_actual||"—",puedeCerrar:x.estado==="ACTIVA"},auditoria:(access.data||[]).map(function(item){return {fecha:item.fecha_hora,accion:item.accion,resultado:item.resultado,origen:item.origen,motivo:item.motivo};})}; }
    if (operation === "cerrarSesionAuditoriaAdminMotor") { const role=String(user.rol||"").toUpperCase();if(["SUPERADMIN","ADMIN"].indexOf(role)===-1)throw new Error("Solo un administrador puede cerrar sesiones.");const input=args[0]||{},id=String(input.idSesion||"").trim();if(!id)throw new Error("No se indicó la sesión a cerrar.");const closed=await client.from("seg_sesiones").update({estado:"CERRADA",fecha_fin:new Date().toISOString(),ultima_actividad:new Date().toISOString(),modulo_actual:"SESION_CERRADA_POR_ADMIN"}).eq("id_sesion",id).eq("estado","ACTIVA").select("id_sesion,correo,id_usuario").maybeSingle();if(closed.error)throw closed.error;if(!closed.data)throw new Error("La sesión ya estaba cerrada o no existe.");await client.from("seg_auditoria_accesos").insert({id_usuario:closed.data.id_usuario,correo:closed.data.correo,rol:"",modulo:"ADMIN_AUDITORIA",accion:"CIERRE_FORZADO_SESION",resultado:"EXITOSO",motivo:String(input.motivo||"Cierre forzado desde Auditoría"),origen:"ADMIN",id_sesion:id,detalle:{cerradoPor:user.id_usuario}});return {correcto:true,mensaje:"La sesión se marcó como cerrada y quedó registrada en Auditoría."}; }
    if (operation === "listarAuditoriaAdminMotor") { const all=await Promise.all([query("seg_auditoria_accesos"),query("seg_auditoria_eventos"),query("seg_auditoria_permisos")]);const filter=args[0]||{};const records=[].concat(all[0].map(function(x){return {fecha:x.fecha_hora,tipo:"ACCESOS",correo:x.correo,modulo:x.modulo,accion:x.accion,resultado:x.resultado,detalle:x.motivo||""};}),all[1].map(function(x){return {fecha:x.fecha_hora,tipo:"EVENTOS",correo:x.correo,modulo:x.modulo,accion:x.accion,resultado:x.resultado,detalle:x.entidad||x.id_entidad||""};}),all[2].map(function(x){return {fecha:x.fecha_hora,tipo:"PERMISOS",correo:x.correo,modulo:x.modulo,accion:x.recurso,resultado:"ACTUALIZADO",detalle:x.rol_objetivo||""};})).filter(function(x){const type=String(filter.tipo||"TODOS").toUpperCase(),text=String(filter.texto||"").toLowerCase();return (type==="TODOS"||x.tipo===type)&&(!text||Object.values(x).join(" ").toLowerCase().indexOf(text)!==-1);}).sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});return {registros:records,total:records.length}; }
    if (operation === "guardarUsuarioAdminMotor") { const x=args[0] || {}; if(!x.idUsuario){const invited=await client.functions.invoke("invite-user",{body:{usuario:x,redirectTo:window.location.origin+window.location.pathname}});if(invited.error){let detail="";try{detail=await invited.error.context.json();}catch(_){ }throw new Error(detail&&detail.error || "No se encontró la función segura de invitaciones en Supabase. Despliega invite-user desde Edge Functions antes de crear usuarios.");}if(!invited.data || invited.data.correcto===false)throw new Error(invited.data && invited.data.error || "No fue posible enviar la invitación.");return invited.data;} if(String(x.nuevaContrasena||"").trim()){const reset=await client.functions.invoke("invite-user",{body:{accion:"CAMBIAR_CONTRASENA",idUsuario:x.idUsuario,nuevaContrasena:x.nuevaContrasena}});if(reset.error||!reset.data||reset.data.correcto===false)throw new Error(reset.data&&reset.data.error||"No fue posible cambiar la contraseña.");} const saved=await client.from("seg_usuarios").update({correo:String(x.correo || "").trim().toLowerCase(),nombre:x.nombre,telefono:x.telefono || null,rol:x.rol,id_proveedor:x.idProveedor || null,id_oficina:x.idOficina || null,id_grupo:x.idGrupo || null,estado:x.estado || "ACTIVO",tipo_documento:x.tipoDocumento || null,numero_documento:x.numeroDocumento || null,id_usuario_actualizacion:user.id_usuario}).eq("id_usuario",x.idUsuario); if(saved.error) throw saved.error; return {correcto:true,idUsuario:x.idUsuario}; }
    if (operation === "listarValoresCatalogoAdminMotor") { const code=String(args[0]||"").toUpperCase(); if(code==="MP_NEGOCIOS"){const rows=await query("mae_negocios");return rows.map(function(x){return {idValor:x.id_negocio,codigo:x.codigo_negocio,nombre:x.nombre,descripcion:x.descripcion,orden:1,estado:x.estado};});} if(code==="MP_MARCAS"){const rows=await query("mae_marcas");return rows.map(function(x){return {idValor:x.id_marca,codigo:x.codigo_marca,nombre:x.nombre,descripcion:x.descripcion,orden:1,estado:x.estado};});} if(code==="MP_PRODUCTOS_PRINCIPALES"){const rows=await query("mae_productos_principales");return rows.map(function(x){return {idValor:x.id_producto,codigo:x.codigo_producto,nombre:x.nombre,descripcion:x.descripcion,orden:1,estado:x.estado};});} if(code==="MP_TIPOS_MATERIAL"){const all=await Promise.all([query("mae_tipos_material"),query("mae_subtipos_material"),query("mae_productos_principales")]);return all[0].map(function(x){const linked=all[1].find(function(s){return s.id_tipo_material===x.id_tipo_material;})||{};const product=all[2].find(function(p){return p.id_producto===linked.id_producto;})||{};return {idValor:x.id_tipo_material,codigo:x.codigo_tipo,nombre:x.nombre,descripcion:x.descripcion,valorPadre:product.codigo_producto||"",orden:1,estado:x.estado};});} if(code==="MP_SUBTIPOS_MATERIAL"){const all=await Promise.all([query("mae_subtipos_material"),query("mae_tipos_material"),query("mae_productos_principales")]);return all[0].map(function(x){const type=all[1].find(function(t){return t.id_tipo_material===x.id_tipo_material;})||{};const product=all[2].find(function(p){return p.id_producto===x.id_producto;})||{};return {idValor:x.id_subtipo_material,codigo:x.codigo_subtipo,nombre:x.nombre,descripcion:x.descripcion,valorPadre:type.codigo_tipo||"",metadata:{productoPrincipal:product.codigo_producto||"",tipoMaterial:type.codigo_tipo||""},orden:1,estado:x.estado};});} const rows=await client.from("app_catalogo_valores").select("*").eq("catalogo",code).order("orden");if(rows.error)throw rows.error;const __rol=String((user&&user.rol)||"").toUpperCase();const __admin=(__rol==="SUPERADMIN"||__rol==="ADMIN");const __prov=String((user&&(user.id_proveedor||user.idProveedor))||"").trim();return (rows.data||[]).filter(function(x){return __admin||!x.id_proveedor||String(x.id_proveedor)===__prov;}).map(function(x){return {idValor:x.id_valor,codigo:x.codigo,nombre:x.nombre,orden:x.orden,estado:x.estado,idProveedor:x.id_proveedor||""};}); }
    if (operation === "guardarValorCatalogoAdminMotor") { const code=String(args[0]||"").toUpperCase();const x=args[1]||{};if(code==="MP_NEGOCIOS"){const id=x.idValor||"NEG-"+Date.now();const saved=await client.from("mae_negocios").upsert({id_negocio:id,codigo_negocio:x.codigo,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idValor:id};}if(code==="MP_MARCAS"){const id=x.idValor||"MAR-"+Date.now();const saved=await client.from("mae_marcas").upsert({id_marca:id,codigo_marca:x.codigo,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idValor:id};}if(code==="MP_PRODUCTOS_PRINCIPALES"){const id=x.idValor||"PROD-"+Date.now();const saved=await client.from("mae_productos_principales").upsert({id_producto:id,codigo_producto:x.codigo,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idValor:id};}if(code==="MP_TIPOS_MATERIAL"){const id=x.idValor||"TIP-"+Date.now();const saved=await client.from("mae_tipos_material").upsert({id_tipo_material:id,codigo_tipo:x.codigo,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idValor:id};}if(code==="MP_SUBTIPOS_MATERIAL"){const types=await query("mae_tipos_material"),products=await query("mae_productos_principales");const type=types.find(function(t){return t.codigo_tipo===x.valorPadre || t.id_tipo_material===x.valorPadre;});const product=products.find(function(p){return p.codigo_producto===x.productoPrincipal || p.id_producto===x.productoPrincipal;});if(!type)throw new Error("Selecciona un tipo válido para el subtipo.");const id=x.idValor||"SUB-"+Date.now();const saved=await client.from("mae_subtipos_material").upsert({id_subtipo_material:id,id_producto:product&&product.id_producto||null,id_tipo_material:type.id_tipo_material,codigo_subtipo:x.codigo,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idValor:id};}const id=x.idValor||"CAT-"+Date.now();const saved=await client.from("app_catalogo_valores").upsert({id_valor:id,catalogo:code,codigo:x.codigo,nombre:x.nombre,orden:Number(x.orden||1),estado:x.estado||"ACTIVO",id_proveedor:x.idProveedor||null});if(saved.error)throw saved.error;return {correcto:true,idValor:id}; }
    if (operation === "obtenerEstructuraAsignacionesAdminMotor" || operation === "obtenerEstructuraAsignacionesUsuariosMotor") { const all = await Promise.all([query("mae_proveedores"),query("mae_oficinas"),query("mae_grupos"),query("rel_proveedor_oficinas"),query("seg_usuarios")]); const offices=all[1].map(function(x){return {idOficina:x.id_oficina,nombre:x.nombre,descripcion:x.descripcion,estado:x.estado};}); const groups=all[2].map(function(x){const office=offices.find(function(o){return o.idOficina===x.id_oficina;});return {idGrupo:x.id_grupo,idOficina:x.id_oficina,nombre:x.nombre,nombreOficina:office&&office.nombre,descripcion:x.descripcion,estado:x.estado};}); return { proveedores:all[0].map(function(x){const ids=String(x.codigo_canales_venta||"").split("|").filter(Boolean);return {idProveedor:x.id_proveedor,razonSocial:x.razon_social,nombreComercial:x.nombre_comercial,descripcion:x.descripcion,idsOficina:ids,oficinas:offices.filter(function(o){return ids.indexOf(o.idOficina)!==-1;}),alcanceCatalogo:x.alcance_catalogo,estado:x.estado};}), oficinas:offices, grupos:groups, relacionesProveedorOficina:all[3].map(function(x){return {idRelacion:x.id_relacion,idProveedor:x.id_proveedor,idOficina:x.id_oficina,idsGrupo:String(x.ids_grupo||"").split("|").filter(Boolean),estado:x.estado};}), tiposDocumento:Array.from(new Set(all[4].map(function(x){return x.tipo_documento;}).filter(Boolean))).map(function(code){return {codigo:code,nombre:code};}), reglas:{} }; }
    if (operation === "obtenerMatrizPermisosAdminMotor") { const role=String(args[0]||"");const all=await Promise.all([query("app_modulos"),query("seg_permisos"),query("seg_recursos")]);const fallback={ADMIN_AUDITORIA:[["VISUALIZAR_MODULO","Acceder a auditoría"],["VER_LISTADO","Ver registros de auditoría"],["VER_SESIONES","Ver sesiones activas"],["VER_DETALLE","Ver detalle de sesión"],["CERRAR_SESIONES","Forzar cierre de sesiones"],["LIMPIAR_SESIONES_EXPIRADAS","Limpiar sesiones expiradas"],["EXPORTAR","Exportar auditoría"]],DASHBOARD_VENTAS:[["VISUALIZAR_MODULO","Visualizar módulo"],["VER_RESUMEN","Ver indicadores y gráficos"],["EXPORTAR","Exportar dashboard"]],CALENDARIO_ENTREGAS:[["VISUALIZAR_MODULO","Visualizar módulo"],["VER_CALENDARIO","Ver calendario de entregas"],["EXPORTAR","Exportar calendario"]],VENTAS_CONTADO:[["VISUALIZAR_MODULO","Visualizar módulo"],["VER_LISTADO","Ver ventas"],["VER_DETALLE","Ver detalle de venta"],["REGISTRAR_VENTA","Registrar ventas"],["EDITAR_VENTA","Modificar ventas"],["CONFIRMAR_ABONO","Validar abonos"],["PROGRAMAR_ENTREGA","Gestionar entregas"],["CONFIRMAR_ENTREGA","Confirmar entregas"],["ANULAR_VENTA","Anular ventas"],["EXPORTAR","Exportar ventas"]],MATERIALES_PRECIOS:[["VISUALIZAR_MODULO","Visualizar módulo"],["VER_MATERIALES","Ver materiales"],["CREAR_MATERIAL","Crear materiales"],["EDITAR_MATERIAL","Editar materiales"],["GESTIONAR_CATALOGO","Gestionar catálogos"],["GESTIONAR_PRECIOS","Gestionar precios"],["CREAR_PRECIO_INDIVIDUAL","Registrar precios individuales"],["CREAR_LISTA_OFICIAL","Crear listas de precios"],["EDITAR_LISTA_OFICIAL","Editar listas de precios"],["IMPORTAR","Importar datos"],["EXPORTAR","Exportar datos"]],PROVEEDORES:[["VISUALIZAR_MODULO","Visualizar proveedores"],["VER_LISTADO","Ver proveedores"],["CREAR","Crear proveedores"],["EDITAR","Editar proveedores"],["CAMBIAR_ESTADO","Cambiar estado de proveedores"],["IMPORTAR","Importar proveedores"],["EXPORTAR","Exportar proveedores"]],ADMIN_USUARIOS:[["VISUALIZAR_MODULO","Acceder a usuarios"],["VER_LISTADO","Ver usuarios"],["VER_DETALLE","Ver detalle de usuario"],["CREAR","Invitar usuarios"],["EDITAR","Editar usuarios"],["CAMBIAR_ESTADO","Activar o desactivar usuarios"]],ADMIN_PERMISOS:[["VISUALIZAR_MODULO","Acceder a roles y permisos"],["VER_LISTADO","Ver roles"],["CREAR","Crear roles"],["EDITAR_ROLES","Editar roles"],["VER_PERMISOS","Ver matriz de permisos"],["EDITAR_PERMISOS","Editar matriz de permisos"]],ADMIN_CONFIG_APP:[["VISUALIZAR_MODULO","Acceder a configuración"],["VER_LISTADO","Ver configuración"],["CREAR","Crear catálogos"],["EDITAR","Editar configuración"],["IMPORTAR","Importar catálogos"],["EXPORTAR","Exportar configuración"]]};const common=[["VISUALIZAR_MODULO","Visualizar módulo"],["VER_LISTADO","Ver listado"],["VER_DETALLE","Ver detalle"],["CREAR","Crear"],["EDITAR","Editar"],["CAMBIAR_ESTADO","Cambiar estado"],["IMPORTAR","Importar"],["EXPORTAR","Exportar"]];return {alcancesDisponibles:["PROPIO","PROVEEDOR","GRUPO","ASIGNADOS","GLOBAL"],modulos:all[0].filter(function(x){return x.estado==="ACTIVO";}).map(function(module){const registered=all[2].filter(function(x){return x.modulo===module.codigo&&x.estado==="ACTIVO";}).sort(function(a,b){return Number(a.orden||0)-Number(b.orden||0);});const catalog=fallback[module.codigo];const resources=catalog?catalog.map(function(x,index){return [x[0],x[1],"ACCIÓN",index+1];}):(registered.length?registered.map(function(x){return [x.codigo,x.nombre,x.tipo,x.orden];}):common.map(function(x,index){return [x[0],x[1],"ACCIÓN",index+1];}));return {codigo:module.codigo,recursos:resources.map(function(item,index){const saved=all[1].find(function(x){return x.id_sujeto===role&&x.modulo===module.codigo&&x.recurso===item[0]&&x.estado==="ACTIVO";});return {codigo:item[0],nombre:item[1],tipo:item[2]||"ACCIÓN",orden:Number(item[3]||index),permitido:!!(saved&&saved.permitido),alcance:(saved&&saved.alcance)||"PROPIO"};})};})}; }
    if (operation === "guardarMatrizPermisosAdminMotor") { const payload=args[0] || {}; const changes=payload.permisos || []; const permissionId=function(value){let hash=5381,text=String(value||"");for(let j=0;j<text.length;j+=1)hash=((hash<<5)+hash)^text.charCodeAt(j);return "PERM-"+(hash>>>0).toString(36);}; for (let i=0;i<changes.length;i+=1) { const x=changes[i]; const row={id_permiso:permissionId([payload.rol,x.modulo,x.recurso].join("|")),tipo_sujeto:"ROL",id_sujeto:payload.rol,modulo:x.modulo,recurso:x.recurso,permitido:!!x.permitido,alcance:x.alcance || "PROPIO",estado:"ACTIVO"}; const saved=await client.from("seg_permisos").upsert(row); if(saved.error) throw saved.error; } return executeSupabaseOperation(client,"obtenerMatrizPermisosAdminMotor",[payload.rol],user); }
    if (operation === "obtenerOpcionesProveedorModulo") { const all=await Promise.all([query("mae_oficinas"),query("mae_grupos")]); return { oficinas:all[0].filter(function(x){return x.estado === "ACTIVO";}).map(function(x){return {idOficina:x.id_oficina,nombre:x.nombre,descripcion:x.descripcion};}), grupos:all[1].filter(function(x){return x.estado === "ACTIVO";}).map(function(x){return {idGrupo:x.id_grupo,idOficina:x.id_oficina,nombre:x.nombre};}) }; }
    if (operation === "obtenerPlantillaProveedoresModulo") return file("plantilla_proveedores.csv",["RAZON_SOCIAL","NOMBRE_COMERCIAL","CODIGO_SAP","RUC","DESCRIPCION","CODIGO_CANALES_VENTA","CODIGO_GRUPOS_VENDEDORES"],[]);
    if (operation === "cambiarEstadoProveedorModulo") { const id = String((args[0] || "")).trim(); const estado = String((args[1] || "")).toUpperCase() === "ACTIVO" ? "ACTIVO" : "INACTIVO"; if (!id) throw new Error("Indica el proveedor."); const saved = await client.from("mae_proveedores").update({ estado: estado, id_usuario_actualizacion: user.id_usuario }).eq("id_proveedor", id); if (saved.error) throw saved.error; return { correcto: true, idProveedor: id, estado: estado, mensaje: "Estado actualizado." }; }
    if (operation === "guardarProveedorModulo" || operation === "guardarProveedorAdminMotor") { const x=args[0] || {}; const id=x.idProveedor || "PRV-"+Date.now(); const idsOficina=Array.isArray(x.idsOficina)?x.idsOficina:[]; const idsGrupo=Array.isArray(x.idsGrupo)?x.idsGrupo:[]; const saved=await client.from("mae_proveedores").upsert({id_proveedor:id,razon_social:x.razonSocial || x.nombreComercial || "Proveedor",nombre_comercial:x.nombreComercial || x.razonSocial || "Proveedor",nombre:x.nombreComercial || x.razonSocial || "Proveedor",codigo_sap:x.codigoSap || null,ruc:x.ruc || null,descripcion:x.descripcion || null,alcance_catalogo:x.alcanceCatalogo || "TOTAL",codigo_canales_venta:idsOficina.join("|"),codigo_grupos_vendedores:idsGrupo.join("|"),estado:x.estado || "ACTIVO",id_usuario_actualizacion:user.id_usuario}); if(saved.error) throw saved.error; const old=await client.from("rel_proveedor_oficinas").delete().eq("id_proveedor",id); if(old.error) throw old.error; const allGroups=await query("mae_grupos"); for(let i=0;i<idsOficina.length;i+=1){const groups=idsGrupo.filter(function(groupId){return allGroups.some(function(group){return group.id_grupo===groupId && group.id_oficina===idsOficina[i];});});const relation=await client.from("rel_proveedor_oficinas").insert({id_relacion:"RPO-"+id+"-"+idsOficina[i],id_proveedor:id,id_oficina:idsOficina[i],ids_grupo:groups.join("|"),alcance_grupos:groups.length?"SELECCIONADOS":"TODOS",estado:"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(relation.error)throw relation.error;} return {correcto:true,idProveedor:id,nombreComercial:x.nombreComercial || x.razonSocial}; }
    if (operation === "guardarOficinaAdminMotor") { const x=args[0]||{}; if(!String(x.idOficina||"").trim()) throw new Error("El ID de oficina es obligatorio."); const saved=await client.from("mae_oficinas").upsert({id_oficina:x.idOficina,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idOficina:x.idOficina}; }
    if (operation === "guardarGrupoAdminMotor") { const x=args[0]||{}; if(!String(x.idGrupo||"").trim() || !String(x.idOficina||"").trim()) throw new Error("El ID del grupo y la oficina son obligatorios."); const saved=await client.from("mae_grupos").upsert({id_grupo:x.idGrupo,id_oficina:x.idOficina,nombre:x.nombre,descripcion:x.descripcion||null,estado:x.estado||"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(saved.error)throw saved.error;return {correcto:true,idGrupo:x.idGrupo}; }
    if (operation === "guardarMaterialPrecioModulo") { const x=args[0] || {}; const id=x.idMaterial || "MAT-"+Date.now(); var chainWarnProv364_ = []; try { var chain364_ = await ensureProveedorChain_(client, user, { proveedor: (x.proveedor || x.nombreProveedor || ""), oficina: (x.oficina || x.nombreOficina || x.oficinaTexto || ""), grupo: (x.grupo || x.nombreGrupo || x.grupoTexto || ""), idProveedor: (x.idProveedor || ""), idOficina: (x.idOficina || ""), idGrupo: (x.idGrupo || "") }); if (chain364_ && chain364_.advertencias) chainWarnProv364_ = chain364_.advertencias; } catch (chainError364_) { try { console.warn("[SGT360] Auto-creación proveedor (material):", chainError364_); } catch (_) {} chainWarnProv364_.push("No se pudo completar la cadena de proveedor: " + String((chainError364_ && chainError364_.message) || chainError364_)); } let brandId=String(x.idMarca || "").trim(); if(brandId){const brands=await query("mae_marcas");const found=brands.find(function(b){return b.id_marca===brandId || String(b.nombre).toLowerCase()===brandId.toLowerCase();});if(found)brandId=found.id_marca;else{brandId="MAR-"+Date.now();const brand=await client.from("mae_marcas").insert({id_marca:brandId,codigo_marca:brandId,nombre:String(x.idMarca).trim(),estado:"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(brand.error)throw brand.error;}} const saved=await client.from("mae_materiales").upsert({id_material:id,codigo_material:x.codigoMaterial || id,codigo_sap:x.codigoHana || x.codigoSap || null,codigo_hana:x.codigoHana || x.codigoSap || null,id_producto:x.idProducto || null,id_tipo_material:x.idTipoMaterial || null,id_subtipo_material:x.idSubtipoMaterial || null,id_marca:brandId || null,nombre_material:x.nombreMaterial || x.descripcionMaterial || "Material",descripcion_material:x.descripcionMaterial || null,proveedor:x.proveedor || null,incluye_conexion:x.incluyeConexion || x.incluye_conexion || null,producto_principal:x.productoPrincipal || x.producto_principal || null,combo:x.combo || null,comentarios:x.comentarios || null,unidad_medida:x.unidadMedida || "UND",es_gasodomestico:!!x.esGasodomestico,estado:x.estado || "ACTIVO",id_usuario_actualizacion:user.id_usuario}); if(saved.error) throw saved.error; return {correcto:true,idMaterial:id,mensaje:"Material guardado correctamente." + (chainWarnProv364_.length ? " " + chainWarnProv364_.join(" ") : ""),advertencias:chainWarnProv364_}; }
    if (operation === "listarProveedoresModulo") { const rows = await query("mae_proveedores"); const records = rows.map(function(x) { return { idProveedor:x.id_proveedor,razonSocial:x.razon_social,nombreComercial:x.nombre_comercial,codigoSap:x.codigo_sap,ruc:x.ruc,descripcion:x.descripcion,idsOficina:String(x.codigo_canales_venta||"").split("|").filter(Boolean),idsGrupo:String(x.codigo_grupos_vendedores||"").split("|").filter(Boolean),alcanceCatalogo:x.alcance_catalogo,estado:x.estado }; }); return normalizeModuleResponse(operation, { proveedores: records }); }
    if (operation === "obtenerResumenMaterialesPreciosModulo") { const all=await Promise.all([query("mae_materiales"),query("pre_listas_precios"),query("pre_solicitudes_lista_precio")]);const active=function(row){return String(row.estado||"").toUpperCase()==="ACTIVO";};const pending=["CARGADO","OBSERVADO_POR_SISTEMA","PENDIENTE_REVISION","EN_REVISION","OBSERVADO_POR_REVISOR","PENDIENTE"];return {correcto:true,generadoEn:new Date().toISOString(),materiales:all[0].length,materialesActivos:all[0].filter(active).length,listasOficiales:all[1].filter(function(row){return String(row.estado||"").toUpperCase()!=="INACTIVA";}).length,listasActivas:all[1].filter(active).length,preciosActivos:0,solicitudesPendientes:all[2].filter(function(row){return pending.indexOf(String(row.estado||"").toUpperCase())!==-1;}).length,moneda:"PEN"}; }
    if (operation === "listarMaterialesPrecioModulo" || operation === "listarMaterialesSelectPreciosModulo") { const all=await Promise.all([query("mae_materiales"),query("mae_marcas"),query("mae_productos_principales"),query("mae_tipos_material"),query("mae_subtipos_material")]); const search=String((args[0]||{}).texto||"").trim().toLowerCase();const scopeRolM29S_=String((user&&user.rol)||"").toUpperCase();const scopeAdminM29S_=(scopeRolM29S_==="SUPERADMIN"||scopeRolM29S_==="ADMIN");const scopeProvM29S_=String((user&&(user.id_proveedor||user.idProveedor))||"").trim();const scopeMatOK29S_=function(x){if(scopeAdminM29S_||!scopeProvM29S_)return true;if(x.id_proveedor&&String(x.id_proveedor).trim()!==scopeProvM29S_)return false;return true;}; const records = all[0].filter(function(x){return scopeMatOK29S_(x)&&(!search || [x.codigo_material,x.codigo_sap,x.nombre_material,x.descripcion_material].join(" ").toLowerCase().indexOf(search)!==-1);}).map(function(x) { const brand=all[1].find(function(b){return b.id_marca===x.id_marca;})||{};const product=all[2].find(function(p){return p.id_producto===x.id_producto;})||{};const type=all[3].find(function(t){return t.id_tipo_material===x.id_tipo_material;})||{};const subtype=all[4].find(function(s){return s.id_subtipo_material===x.id_subtipo_material;})||{}; const name=x.nombre_material||x.descripcion_material||x.codigo_material; return { id:x.id_material,codigo:x.codigo_material,codigoSap:x.codigo_sap,nombre:name,idMaterial:x.id_material,codigoMaterial:x.codigo_material,idProducto:x.id_producto,idTipoMaterial:x.id_tipo_material,idSubtipoMaterial:x.id_subtipo_material,idMarca:x.id_marca,marca:brand.nombre||"",producto:product.nombre||"",tipo:type.nombre||"",subtipo:subtype.nombre||"",nombreMaterial:x.nombre_material,descripcionMaterial:x.descripcion_material,unidadMedida:x.unidad_medida,estado:x.estado }; }); return operation === "listarMaterialesSelectPreciosModulo" ? { registros: records } : normalizeModuleResponse(operation, { materiales: records }); }
    if (operation === "obtenerOpcionesMaterialesPreciosModulo") { const all=await Promise.all([query("mae_proveedores"),query("mae_oficinas"),query("mae_grupos"),query("mae_materiales"),query("mae_marcas"),query("mae_negocios"),query("mae_productos_principales"),query("mae_tipos_material"),query("mae_subtipos_material"),query("sys_parametros")]);const norm=function(v){return String(v||"").trim().toUpperCase();};const visible=function(x){return norm(x.estado)!=="INACTIVO";};const configured=norm((all[9].find(function(x){return x.clave==="NEGOCIO_VENTAS_ACTIVO";})||{}).valor);const matches=all[5].filter(function(x){return visible(x)&&(!configured||norm(x.codigo_negocio)===configured||norm(x.nombre)===configured);});const businesses=matches.length?matches:all[5].filter(visible);const relatedProducts=all[6].filter(function(x){return visible(x)&&businesses.some(function(b){return b.id_negocio===x.id_negocio;});});const products=relatedProducts.length?relatedProducts:all[6].filter(visible);const types=all[7].filter(visible).map(function(type){return {id:type.id_tipo_material,nombre:type.nombre};}); return { negocios:businesses.map(function(x){return {id:x.id_negocio,nombre:x.nombre};}), productos:products.map(function(x){return {id:x.id_producto,idNegocio:x.id_negocio,nombre:x.nombre};}), tipos:types, subtipos:all[8].filter(visible).map(function(x){return {id:x.id_subtipo_material,idProducto:x.id_producto,idTipoMaterial:x.id_tipo_material,nombre:x.nombre};}), marcas:all[4].filter(visible).map(function(x){return {id:x.id_marca,nombre:x.nombre};}), unidades:[{id:"UND",nombre:"Unidad"}], proveedores:all[0].filter(visible).map(function(x){return {id:x.id_proveedor,idProveedor:x.id_proveedor,nombre:x.nombre_comercial || x.razon_social};}), oficinas:all[1].filter(visible).map(function(x){return {id:x.id_oficina,idOficina:x.id_oficina,nombre:x.nombre};}), grupos:all[2].filter(visible).map(function(x){return {id:x.id_grupo,idGrupo:x.id_grupo,idOficina:x.id_oficina,nombre:x.nombre};}), materiales:all[3].filter(visible).map(function(x){return {id:x.id_material,idMaterial:x.id_material,codigo:x.codigo_material,codigoMaterial:x.codigo_material,nombre:x.nombre_material,nombreMaterial:x.nombre_material};}) }; }
    if (operation === "obtenerPlantillaMaterialesModulo") return file("plantilla_materiales.csv",["PROVEEDOR","MARCA","TIPO","SUBTIPO","INCLUYE_CONEXION","CODIGO_HANA","PRODUCTO_PRINCIPAL","COMBO","CODIGO_SAP","NOMBRE_MATERIAL","DESCRIPCION_MATERIAL","UNIDAD_MEDIDA","ESTADO"],[]);
    if (operation === "obtenerPlantillaPreciosIndividualesModulo" || operation === "obtenerPlantillaListaPreciosModulo") return file("plantilla_precios.csv",["CODIGO_HANA","CODIGO_MATERIAL","PROVEEDOR","RESPONSABLE_VENTA","PRECIO_BASE","FEE","MONEDA","FECHA_INICIO","FECHA_FIN","DETALLE_COMBO"],[]);
    if (operation === "listarListasOficialesPreciosModulo") { const all=await Promise.all([query("pre_lista_precio_detalle"),query("pre_listas_precios"),query("mae_materiales"),query("mae_proveedores"),query("mae_negocios")]); const rows=all[0].map(function(d){const list=all[1].find(function(x){return x.id_lista_precio===d.id_lista_precio;})||{};const material=all[2].find(function(x){return x.id_material===d.id_material;})||{};const provider=all[3].find(function(x){return x.id_proveedor===list.id_proveedor;})||{};const business=all[4].find(function(x){return x.id_negocio===list.id_negocio;})||{};return {idDetallePrecio:d.id_detalle_precio,idListaPrecio:d.id_lista_precio,proveedor:provider.nombre_comercial||provider.razon_social||"—",negocio:business.nombre||"—",idProveedor:list.id_proveedor,idNegocio:list.id_negocio,idOficina:list.id_oficina,idGrupo:list.id_grupo,codigoSap:material.codigo_sap,codigoMaterial:material.codigo_material,idMaterial:material.id_material,nombreCortoMaterial:material.nombre_material,descripcionMaterial:material.descripcion_material,precioBase:d.precio_base,fee:(String(user && user.rol || "").toUpperCase()==="PROVEEDOR" ? null : d.fee),responsableVenta:d.responsable_venta || list.responsable_venta || "",moneda:d.moneda||list.moneda,fechaInicio:list.fecha_inicio,fechaFin:list.fecha_fin,detalleCombo:d.detalle_combo,estado:d.estado,es_catalogo:!!(list && list.es_catalogo)};}); return {registros:rows,paginacion:{pagina:1,totalPaginas:1,total:rows.length}}; }
    /* AGENTE B (2026-09-17): crear/listar listas oficiales (pre_listas_precios) y su
       carga de detalles (pre_lista_precio_detalle). Usados por la carga masiva XLSX
       de la pestaña Listas. Columnas existentes (nombre/fee/responsable_venta/
       moneda); sin migraciones. */
    if (operation === "guardarListaOficialPrecioModulo") { const L=args[0]||{}; const idProvL=String(L.idProveedor||"").trim(); if(!idProvL) throw new Error("Selecciona el proveedor. Todo precio debe pertenecer a un proveedor; General solo significa sin oficina ni grupo."); const provL=await client.from("mae_proveedores").select("id_proveedor,estado").eq("id_proveedor",idProvL).maybeSingle(); if(provL.error) throw provL.error; if(!provL.data) throw new Error("El proveedor seleccionado no existe o está inactivo."); const ofL=String(L.idOficina||"").trim(); let grL=String(L.idGrupo||"").trim(); if(grL && !ofL) throw new Error("Para usar grupo debes seleccionar una oficina de ventas."); if(!ofL) grL=""; if(grL){ const grRow=await client.from("mae_grupos").select("id_grupo,id_oficina,estado").eq("id_grupo",grL).maybeSingle(); if(grRow.error) throw grRow.error; if(!grRow.data) throw new Error("El grupo seleccionado no existe."); if(String(grRow.data.id_oficina||"").trim() && String(grRow.data.id_oficina).trim()!==ofL) throw new Error("El grupo no pertenece a la oficina indicada."); } const negL=String(L.idNegocio||"").trim(); if(negL){ const negRow=await client.from("mae_negocios").select("id_negocio").eq("id_negocio",negL).maybeSingle(); if(negRow.error) throw negRow.error; if(!negRow.data) throw new Error("El negocio indicado no existe."); } const nowL=new Date(); const defIniL=nowL.toISOString().slice(0,8)+"01"; const defFinL=new Date(nowL.getFullYear(),nowL.getMonth()+1,0).toISOString().slice(0,10); const iniL=String(L.fechaInicio||"").trim().slice(0,10)||defIniL; const finL=String(L.fechaFin||"").trim().slice(0,10)||defFinL; if(finL<iniL) throw new Error("La fecha fin no puede ser menor que la fecha inicio."); const codigoL=String(L.codigoLista||"").trim(); const nombreL=String(L.nombre||"").trim()||"Lista de precios"; const wantedL=String(L.idListaPrecio||"").trim(); let rowL=null; if(wantedL){ const prevL=await client.from("pre_listas_precios").select("*").eq("id_lista_precio",wantedL).maybeSingle(); if(prevL.error) throw prevL.error; rowL=prevL.data||null; } const idL=rowL?rowL.id_lista_precio:(wantedL||("LPR-"+Date.now()+"-"+Math.floor(Math.random()*1000))); const payloadL={id_lista_precio:idL,codigo_lista:codigoL||(rowL?rowL.codigo_lista:idL),nombre:nombreL,id_proveedor:idProvL,id_negocio:negL||null,id_oficina:ofL||null,id_grupo:grL||null,responsable_venta:String(L.responsableVenta||"").trim()||null,fecha_inicio:iniL,fecha_fin:finL||null,moneda:String(L.moneda||"PEN").trim()||"PEN",estado:String(L.estado||"ACTIVA").trim()||"ACTIVA",es_catalogo:(L.es_catalogo===true||L.esCatalogo===true)||((rowL&&rowL.es_catalogo)===true),id_usuario_actualizacion:user.id_usuario};var savedListL=await client.from("pre_listas_precios").upsert(payloadL,{onConflict:"id_lista_precio"});if(savedListL.error&&String((savedListL.error&&savedListL.error.message)||"").indexOf("es_catalogo")!==-1){delete payloadL.es_catalogo;savedListL=await client.from("pre_listas_precios").upsert(payloadL,{onConflict:"id_lista_precio"});} const savedL=savedListL; if(savedL.error) throw new Error("No se pudo guardar la lista: "+savedL.error.message); return {correcto:true,idListaPrecio:idL,creado:!rowL,mensaje:!rowL?"Lista oficial creada.":"Lista oficial actualizada."}; }
    if (operation === "guardarDetalleListaPrecioModulo") { const D=args[0]||{}; const idListaD=String(D.idListaPrecio||"").trim(); if(!idListaD) throw new Error("Indica la lista de precios del detalle."); const listaD=await client.from("pre_listas_precios").select("id_lista_precio").eq("id_lista_precio",idListaD).maybeSingle(); if(listaD.error) throw listaD.error; if(!listaD.data) throw new Error("La lista de precios no existe."); const idMatD=String(D.idMaterial||"").trim(); if(!idMatD) throw new Error("Indica el material del precio."); const matD=await client.from("mae_materiales").select("id_material,estado").eq("id_material",idMatD).maybeSingle(); if(matD.error) throw matD.error; if(!matD.data) throw new Error("El material no existe."); const precioD=Number(D.precioBase); if(!Number.isFinite(precioD)||precioD<0) throw new Error("Precio base inválido."); let feeD=null; if(D.fee!==null&&D.fee!==undefined&&String(D.fee).trim()!==""){ feeD=Number(D.fee); if(!Number.isFinite(feeD)||feeD<0||feeD>100) throw new Error("El fee debe ser un porcentaje entre 0 y 100."); } let idDetD=String(D.idDetallePrecio||"").trim(); let creadoD=true; if(!idDetD){ const prevD=await client.from("pre_lista_precio_detalle").select("id_detalle_precio").eq("id_lista_precio",idListaD).eq("id_material",idMatD).maybeSingle(); if(prevD.error) throw prevD.error; if(prevD.data){ idDetD=prevD.data.id_detalle_precio; creadoD=false; } } if(!idDetD) idDetD="DPR-"+Date.now()+"-"+Math.floor(Math.random()*10000); const payloadD={id_detalle_precio:idDetD,codigo_precio:idDetD,id_lista_precio:idListaD,id_material:idMatD,precio_base:precioD,moneda:String(D.moneda||"PEN").trim()||"PEN",fee:feeD,responsable_venta:String(D.responsableVenta||"").trim()||null,tiene_combo:false,detalle_combo:null,estado:String(D.estado||"ACTIVO").trim()||"ACTIVO",id_usuario_actualizacion:user.id_usuario}; const savedD=await client.from("pre_lista_precio_detalle").upsert(payloadD,{onConflict:"id_detalle_precio"}); if(savedD.error) throw new Error("No se pudo guardar el detalle: "+savedD.error.message); return {correcto:true,idDetallePrecio:idDetD,idListaPrecio:idListaD,creado:creadoD,mensaje:creadoD?"Detalle creado.":"Detalle actualizado."}; }
    if (operation === "guardarPrecioIndividualMaterialesPreciosModulo") { const x=args[0]||{}; var mpMonthNow=new Date(); var mpMonthFirst=mpMonthNow.toISOString().slice(0,8)+"01"; var mpMonthLast=new Date(mpMonthNow.getFullYear(),mpMonthNow.getMonth()+1,0).toISOString().slice(0,10); if(!x.fechaInicio)x.fechaInicio=mpMonthFirst; if(!x.fechaFin)x.fechaFin=mpMonthLast; let listId=x.idListaPrecio||"LPR-"+Date.now(); if(!x.idListaPrecio){const list=await client.from("pre_listas_precios").insert({id_lista_precio:listId,codigo_lista:listId,nombre:"Lista "+listId,id_proveedor:x.idProveedor,id_negocio:x.idNegocio||null,id_oficina:x.idOficina||null,id_grupo:x.idGrupo||null,responsable_venta:x.responsableVenta || x.responsable_venta || null,fecha_inicio:x.fechaInicio,fecha_fin:x.fechaFin||null,moneda:x.moneda||"PEN",estado:"ACTIVA",id_usuario_actualizacion:user.id_usuario});if(list.error)throw list.error;} const detailId=x.idDetallePrecio||"DPR-"+Date.now();const detail=await client.from("pre_lista_precio_detalle").upsert({id_detalle_precio:detailId,codigo_precio:detailId,id_lista_precio:listId,id_material:x.idMaterial,precio_base:Number(x.precioBase),moneda:x.moneda||"PEN",fee:(x.fee===null||x.fee===undefined||x.fee===""?null:Number(x.fee)),responsable_venta:x.responsableVenta || x.responsable_venta || null,tiene_combo:String(x.tieneCombo||"").toUpperCase()==="SI",detalle_combo:x.detalleCombo||null,descripcion_combo:x.detalleCombo||null,estado:"ACTIVO",id_usuario_actualizacion:user.id_usuario});if(detail.error)throw detail.error;return {correcto:true,mensaje:"El precio fue registrado.",precioVista:{idDetallePrecio:detailId,idListaPrecio:listId,idProveedor:x.idProveedor,idNegocio:x.idNegocio,idOficina:x.idOficina,idGrupo:x.idGrupo,idMaterial:x.idMaterial,precioBase:x.precioBase,fee:(x.fee===undefined?"":x.fee),responsableVenta:x.responsableVenta||x.responsable_venta||"",moneda:x.moneda||"PEN",fechaInicio:x.fechaInicio,fechaFin:x.fechaFin,detalleCombo:x.detalleCombo||"",proveedor:x._labelProveedor,negocio:x._labelNegocio}}; }
    if (operation === "exportarMaterialesModulo") { const rows=await query("mae_materiales"); return file("materiales.csv",["CODIGO_MATERIAL","CODIGO_SAP","NOMBRE","DESCRIPCION","UNIDAD","ESTADO"],rows.map(function(x){return [x.codigo_material,x.codigo_sap,x.nombre_material,x.descripcion_material,x.unidad_medida,x.estado];})); }
    if (operation === "exportarPreciosOficialesModulo") { const result=await executeSupabaseOperation(client,"listarListasOficialesPreciosModulo",args,user); var mpIsProv=String(user && user.rol || "").toUpperCase()==="PROVEEDOR"; var mpHeads=mpIsProv?["PROVEEDOR","RESPONSABLE_VENTA","NEGOCIO","CODIGO_MATERIAL","MATERIAL","PRECIO","MONEDA","INICIO","FIN"]:["PROVEEDOR","RESPONSABLE_VENTA","NEGOCIO","CODIGO_MATERIAL","MATERIAL","PRECIO","FEE","MONEDA","INICIO","FIN"]; return file("precios.csv",mpHeads,result.registros.map(function(x){var base=[x.proveedor,x.responsableVenta||"",x.negocio,x.codigoMaterial,x.nombreCortoMaterial,x.precioBase]; if(!mpIsProv)base.push(x.fee==null?"":x.fee); return base.concat([x.moneda,x.fechaInicio,x.fechaFin]);})); }
    if (operation === "exportarProveedoresModulo") { const rows=await query("mae_proveedores"); return file("proveedores.csv",["ID_PROVEEDOR","RAZON_SOCIAL","NOMBRE_COMERCIAL","CODIGO_SAP","RUC","CANALES","GRUPOS","ESTADO"],rows.map(function(x){return [x.id_proveedor,x.razon_social,x.nombre_comercial,x.codigo_sap,x.ruc,x.codigo_canales_venta,x.codigo_grupos_vendedores,x.estado];})); }
    if (operation === "confirmarAbonoVentaContadoModulo" || operation === "observarAbonoVentaContadoModulo") { const x=args[0]||{}; const id=String(x.idVenta||"").trim(); if(!id) throw new Error("No se indicó la venta a validar."); const approved=operation==="confirmarAbonoVentaContadoModulo"; if(!approved && !String(x.observacion||x.observacionConfirmacionAbono||"").trim()) throw new Error("La observación del abono es obligatoria."); const gateAbo29S_=await exigirAccesoVenta29S_(client,user,["CONFIRMAR_ABONO"],id,"validar el abono"); if(approved&&String(gateAbo29S_.venta.estado_abono||"").toUpperCase()==="ABONO_CONFIRMADO") throw new Error("El abono de esta venta ya fue confirmado."); if(String(gateAbo29S_.venta.estado_general||gateAbo29S_.venta.estado_entrega||"").toUpperCase()==="ANULADA") throw new Error("La venta está anulada y su abono ya no puede validarse."); const changes={estado_abono:approved?"ABONO_CONFIRMADO":"ABONO_OBSERVADO",estado_entrega:approved?"POR_ENTREGAR":"REGISTRADA",id_usuario_actualizacion:user.id_usuario};if(approved){changes.abono_aprobado_id=user.id_usuario;changes.abono_aprobado_nombre=user.nombre||user.correo||"";} if(x.observacion||x.observacionConfirmacionAbono) changes.observaciones=String(x.observacion||x.observacionConfirmacionAbono); const saved=await client.from("vta_ventas_contado").update(changes).eq("id_venta",id).select("estado_abono,estado_entrega").single(); if(saved.error) throw saved.error; return {correcto:true,estadoAbono:saved.data.estado_abono,estado:saved.data.estado_entrega,mensaje:approved?"Abono aprobado.":"Abono observado."}; }
    if (operation === "obtenerOpcionesFormularioVentaContadoModulo") { const filter=args[0]||{};const all=await Promise.all([query("pre_lista_precio_detalle"),query("pre_listas_precios"),query("mae_materiales"),query("mae_proveedores"),query("mae_productos_principales"),query("mae_tipos_material"),query("mae_subtipos_material"),query("mae_marcas")]);const active=function(x){return String(x.estado||"").toUpperCase()!=="INACTIVO";};const business=String(filter.idNegocio||"");const office=String(filter.idOficina||"");const group=String(filter.idGrupo||"");const today=new Date().toISOString().slice(0,10);const scopeRol29S_=String((user&&(user.rol||user.idRol))||"").toUpperCase();const scopeAdmin29S_=(scopeRol29S_==="SUPERADMIN"||scopeRol29S_==="ADMIN");const scopeProv29S_=String((user&&(user.id_proveedor||user.idProveedor))||"").trim();if(!scopeAdmin29S_&&!scopeProv29S_){try{console.warn("[SGT360] Alcance de catálogo: usuario sin proveedor asignado, no se restringe por proveedor (fail-open).");}catch(_){}}const offers=all[0].filter(active).map(function(detail){const list=all[1].find(function(x){return x.id_lista_precio===detail.id_lista_precio;})||{};const material=all[2].find(function(x){return x.id_material===detail.id_material;})||{};if(!active(list)||!material.id_material)return null;if(!scopeAdmin29S_&&scopeProv29S_&&String(list.id_proveedor||"").trim()!==scopeProv29S_)return null;if(business&&list.id_negocio&&String(list.id_negocio)!==business)return null;if(list.fecha_inicio&&String(list.fecha_inicio).slice(0,10)>today)return null;if(list.fecha_fin&&String(list.fecha_fin).slice(0,10)<today)return null;if(list.id_grupo&&String(list.id_grupo)!==group)return null;if(!list.id_grupo&&list.id_oficina&&String(list.id_oficina)!==office)return null;const product=all[4].find(function(x){return x.id_producto===material.id_producto;})||{};const type=all[5].find(function(x){return x.id_tipo_material===material.id_tipo_material;})||{};const subtype=all[6].find(function(x){return x.id_subtipo_material===material.id_subtipo_material;})||{};const provider=all[3].find(function(x){return x.id_proveedor===list.id_proveedor;})||{};const brand=all[7].find(function(x){return x.id_marca===material.id_marca;})||{};return {idOferta:detail.id_detalle_precio,idDetallePrecio:detail.id_detalle_precio,idMaterial:material.id_material,codigoMaterial:material.codigo_material,codigoSap:material.codigo_sap,nombreMaterial:material.nombre_material,descripcionMaterial:material.descripcion_material,idProducto:material.id_producto,producto:product.nombre||"",idTipoMaterial:material.id_tipo_material,tipo:type.nombre||"",idSubtipoMaterial:material.id_subtipo_material,subtipo:subtype.nombre||"",marca:brand.nombre||"",idProveedor:list.id_proveedor,proveedor:provider.nombre_comercial||provider.razon_social||"",precioBase:detail.precio_base,moneda:detail.moneda||list.moneda||"PEN",detalleCombo:detail.detalle_combo||""};}).filter(Boolean);const unique=function(rows,key){const seen={};return rows.filter(function(row){const id=row[key];if(!id||seen[id])return false;seen[id]=true;return true;}).map(function(row){return {id:row[key],nombre:row[key==="idProducto"?"producto":key==="idTipoMaterial"?"tipo":"subtipo"]};});};return {ofertas:offers,totalOfertas:offers.length,filtrosDisponibles:{productos:unique(offers,"idProducto"),tipos:unique(offers,"idTipoMaterial"),subtipos:unique(offers,"idSubtipoMaterial")}}; }
    if (operation === "resolverPrecioVentaContadoModulo" || operation === "resolverPrecioVentaContadoRapidoModulo" || operation === "resolverPrecioMaterialesPreciosModulo") { const input29S_=(args[0]&&typeof args[0]==="object"&&!Array.isArray(args[0]))?args[0]:{};const idMat29S_=String(input29S_.idMaterial||input29S_.id_material||(typeof args[0]==="string"?args[0]:"")||"").trim();const detId29S_=String(input29S_.idDetallePrecio||input29S_.idOferta||"").trim();const rol29S_=String((user&&user.rol)||"").toUpperCase();const admin29S_=(rol29S_==="SUPERADMIN"||rol29S_==="ADMIN");const provU29S_=String((user&&(user.id_proveedor||user.idProveedor))||"").trim();const biz29S_=String(input29S_.idNegocio||input29S_.tipoVenta||"");const off29S_=String(input29S_.idOficina||(user&&(user.id_oficina||user.idOficina))||"");const grp29S_=String(input29S_.idGrupo||(user&&(user.id_grupo||user.idGrupo))||"");const provSel29S_=String(input29S_.idProveedor||input29S_.id_proveedor||"");const today29S_=new Date().toISOString().slice(0,10);const all29S_=await Promise.all([query("pre_lista_precio_detalle"),query("pre_listas_precios")]);const active29S_=function(x){return String(x.estado||"").toUpperCase()!=="INACTIVO";};const listas29S_={};all29S_[1].filter(active29S_).forEach(function(l){const idL=String(l.id_lista_precio||"").trim();if(!idL)return;if(!admin29S_&&provU29S_&&String(l.id_proveedor||"").trim()!==provU29S_)return;if(biz29S_&&l.id_negocio&&String(l.id_negocio)!==biz29S_)return;if(l.fecha_inicio&&String(l.fecha_inicio).slice(0,10)>today29S_)return;if(l.fecha_fin&&String(l.fecha_fin).slice(0,10)<today29S_)return;if(l.id_grupo&&grp29S_&&String(l.id_grupo)!==grp29S_)return;if(!l.id_grupo&&l.id_oficina&&off29S_&&String(l.id_oficina)!==off29S_)return;listas29S_[idL]=l;});if(detId29S_){const det29S_=all29S_[0].find(function(d){return String(d.id_detalle_precio||"")===detId29S_&&active29S_(d);})||null;const lst29S_=det29S_?listas29S_[String(det29S_.id_lista_precio||"")]:null;if(det29S_&&lst29S_&&(!idMat29S_||String(det29S_.id_material||"")===idMat29S_)&&(!provSel29S_||String(lst29S_.id_proveedor||"")===provSel29S_)){return {correcto:true,encontrado:true,precioEncontrado:true,idMaterial:String(det29S_.id_material||""),idDetallePrecio:String(det29S_.id_detalle_precio||""),idListaPrecio:String(lst29S_.id_lista_precio||""),idProveedor:String(lst29S_.id_proveedor||""),idOficina:String(lst29S_.id_oficina||""),idGrupo:String(lst29S_.id_grupo||""),alcancePrecio:lst29S_.id_grupo?"GRUPO":(lst29S_.id_oficina?"OFICINA":"GENERAL"),precio:Number(det29S_.precio_base||0),precioBase:Number(det29S_.precio_base||0),moneda:String(det29S_.moneda||lst29S_.moneda||"PEN"),detalleCombo:String(det29S_.detalle_combo||"")};}throw new Error("La oferta seleccionada ya no está vigente para tu alcance comercial.");}if(!idMat29S_)throw new Error("Selecciona el material.");const cand29S_=all29S_[0].filter(function(d){if(!active29S_(d)||String(d.id_material||"")!==idMat29S_)return false;const lx=listas29S_[String(d.id_lista_precio||"")];if(!lx)return false;if(provSel29S_&&String(lx.id_proveedor||"")!==provSel29S_)return false;return true;}).map(function(d){const lx=listas29S_[String(d.id_lista_precio||"")]||{};let pri=100;if(grp29S_&&String(lx.id_grupo||"")===grp29S_)pri=300;else if(off29S_&&String(lx.id_oficina||"")===off29S_&&!lx.id_grupo)pri=200;return {d:d,l:lx,pri:pri};}).sort(function(a,b){return b.pri-a.pri;});if(!cand29S_.length){if(!admin29S_&&!provU29S_){try{console.warn("[SGT360] Alcance de catálogo: sin datos de alcance de usuario y sin precio vigente (fail-open informativo).");}catch(_){}}return {correcto:false,encontrado:false,precioEncontrado:false,mensaje:"No existe una oferta vigente para este material y alcance."};}const best29S_=cand29S_[0];return {correcto:true,encontrado:true,precioEncontrado:true,requiereSeleccion:cand29S_.length>1&&!provSel29S_,totalCandidatos:cand29S_.length,idMaterial:idMat29S_,idDetallePrecio:String(best29S_.d.id_detalle_precio||""),idListaPrecio:String(best29S_.l.id_lista_precio||""),idProveedor:String(best29S_.l.id_proveedor||""),idOficina:String(best29S_.l.id_oficina||""),idGrupo:String(best29S_.l.id_grupo||""),alcancePrecio:best29S_.l.id_grupo?"GRUPO":(best29S_.l.id_oficina?"OFICINA":"GENERAL"),precio:Number(best29S_.d.precio_base||0),precioBase:Number(best29S_.d.precio_base||0),moneda:String(best29S_.d.moneda||best29S_.l.moneda||"PEN"),detalleCombo:String(best29S_.d.detalle_combo||"")}; }
    if (operation === "obtenerContextoVentasContadoModulo") { const context = await loadContext(); const p = context.permisos.VENTAS_CONTADO || {}; const all=await Promise.all([query("mae_negocios"),query("mae_oficinas"),query("mae_grupos"),query("sys_parametros")]);const relProvOfi29S_=await query("rel_proveedor_oficinas").catch(function(){try{console.warn("[SGT360] Alcance comercial: sin acceso a rel_proveedor_oficinas (fail-open).");}catch(_){}return [];});const provsCat29S_=await query("mae_proveedores").catch(function(){return [];});const norm=function(v){return String(v||"").trim().toUpperCase();},visible=function(x){return norm(x.estado)!=="INACTIVO";},businessCode=norm((all[3].find(function(x){return x.clave==="NEGOCIO_VENTAS_ACTIVO";})||{}).valor);const requested=all[0].filter(function(x){return visible(x)&&(!businessCode||norm(x.codigo_negocio)===businessCode||norm(x.nombre)===businessCode);});const businesses=requested.length?requested:all[0].filter(visible);const ctxRol29S_=String((user&&user.rol)||"").toUpperCase();const ctxAdmin29S_=(ctxRol29S_==="SUPERADMIN"||ctxRol29S_==="ADMIN");const ctxProv29S_=String((user&&(user.id_proveedor||user.idProveedor))||"").trim();var offices29S_=all[1].filter(visible);var groups29S_=all[2].filter(visible);if(!ctxAdmin29S_&&ctxProv29S_){const allow29S_={};(relProvOfi29S_||[]).filter(function(r){return String(r.id_proveedor||"")===ctxProv29S_&&String(r.estado||"ACTIVO").toUpperCase()!=="INACTIVO";}).forEach(function(r){const v=String(r.id_oficina||"").trim();if(v)allow29S_[v]=true;});const provRow29S_=(provsCat29S_||[]).find(function(q){return String(q.id_proveedor||"")===ctxProv29S_;})||{};String(provRow29S_.codigo_canales_venta||"").split("|").forEach(function(v){v=String(v||"").trim();if(v)allow29S_[v]=true;});const keys29S_=Object.keys(allow29S_);if(keys29S_.length){offices29S_=offices29S_.filter(function(x){return !!allow29S_[String(x.id_oficina||"")];});groups29S_=groups29S_.filter(function(x){return !!allow29S_[String(x.id_oficina||"")];});}else{try{console.warn("[SGT360] Alcance comercial: sin relación proveedor-oficinas para "+ctxProv29S_+", se muestran todas (fail-open).");}catch(_){}}const ug29S_=String((user&&(user.id_grupo||user.idGrupo))||"").trim();if(ug29S_){if(groups29S_.some(function(x){return String(x.id_grupo||"")===ug29S_;})){groups29S_=groups29S_.filter(function(x){return String(x.id_grupo||"")===ug29S_;});}else{try{console.warn("[SGT360] Alcance comercial: grupo del usuario fuera de su cadena, se ignora (fail-open).");}catch(_){}}}}else if(!ctxAdmin29S_&&!ctxProv29S_){try{console.warn("[SGT360] Alcance comercial: usuario sin proveedor, catálogo sin restricción (fail-open).");}catch(_){}}const offices=offices29S_.map(function(x){return {idOficina:x.id_oficina,nombre:x.nombre};});const groupsByOffice={};groups29S_.forEach(function(x){(groupsByOffice[x.id_oficina]=groupsByOffice[x.id_oficina]||[]).push({idGrupo:x.id_grupo,nombre:x.nombre});});const usrOf29S_=String((user&&(user.id_oficina||user.idOficina))||"").trim();const usrGr29S_=String((user&&(user.id_grupo||user.idGrupo))||"").trim();const predOf29S_=offices.some(function(o){return o.idOficina===usrOf29S_;})?usrOf29S_:(offices.length===1?offices[0].idOficina:"");const predGr29S_=(function(){const rows=predOf29S_?(groupsByOffice[predOf29S_]||[]):[];if(usrGr29S_&&rows.some(function(g){return g.idGrupo===usrGr29S_;}))return usrGr29S_;if(rows.length===1)return rows[0].idGrupo;return "";})(); return { permisos:{ puedeListar:!!(p.VISUALIZAR_MODULO && p.VISUALIZAR_MODULO.permitido), puedeRegistrar:!!(p.REGISTRAR_VENTA && p.REGISTRAR_VENTA.permitido), puedeEditar:!!(p.EDITAR_VENTA && p.EDITAR_VENTA.permitido), puedeValidarAbono:!!(p.CONFIRMAR_ABONO && p.CONFIRMAR_ABONO.permitido), puedeGestionarEntrega:!!(p.PROGRAMAR_ENTREGA && p.PROGRAMAR_ENTREGA.permitido), puedeExportar:!!(p.EXPORTAR && p.EXPORTAR.permitido) }, vistaInicial:"REGISTRADAS", estados:[{codigo:"REGISTRADA",nombre:"Registrada"},{codigo:"POR_ENTREGAR",nombre:"Por entregar"},{codigo:"PROGRAMADA",nombre:"Programada"},{codigo:"EN_RUTA",nombre:"En ruta"},{codigo:"ENTREGADA",nombre:"Entregada"},{codigo:"ANULADA",nombre:"Anulada"}], estadosAbono:[{codigo:"PENDIENTE_CONFIRMACION",nombre:"Pendiente"},{codigo:"ABONO_CONFIRMADO",nombre:"Aprobado"},{codigo:"ABONO_OBSERVADO",nombre:"Observado"}], negociosVenta:businesses.map(function(x){return {codigo:x.id_negocio,nombre:x.nombre};}), comercial:{oficinas:offices,gruposPorOficina:groupsByOffice,idOficinaPredeterminada:predOf29S_,idGrupoPredeterminado:predGr29S_} }; }
    return undefined;
  }
  function installAuthBridge() {
    installLoginView(); createGoogleScriptCompatibility(); installAdapterBridge(); syncLegacySessionSync(); syncLegacySession();
    if (!passwordSetupCompleted && isPasswordSetupFlow()) showPasswordSetup();
    const client = getClient(); client.auth.onAuthStateChange(function(event, session) { if (session && session.access_token) window.localStorage.setItem(LEGACY_TOKEN_KEY, session.access_token); else { window.localStorage.removeItem(LEGACY_TOKEN_KEY); window.localStorage.removeItem(LEGACY_SESSION_KEY); } if(!passwordSetupCompleted && (event==="PASSWORD_RECOVERY" || (session && isPasswordSetupFlow()))) showPasswordSetup(); });
  }
  window.supabaseClient = { getClient: getClient, isConfigured: function() { return !!supabaseInstance; }, getAuthUser: getAuthUser, getAuthorizedUser: getAuthorizedUser, closeCurrentSession: closeCurrentSession, deactivateCurrentUser: deactivateCurrentUser, reconfigure: function(url, key) { window.localStorage.setItem("S360_SUPABASE_URL", url); window.localStorage.setItem("S360_SUPABASE_ANON_KEY", key); config.SUPABASE_URL = url; config.SUPABASE_ANON_KEY = key; initSupabase(); return !!supabaseInstance; }, clearConfig: function() { window.localStorage.removeItem("S360_SUPABASE_URL"); window.localStorage.removeItem("S360_SUPABASE_ANON_KEY"); config.SUPABASE_URL = ""; config.SUPABASE_ANON_KEY = ""; supabaseInstance = null; }, subirArchivoEvidencia: async function(archivo, nombreRuta) { const client = getClient(); await getAuthorizedUser(); const bucket = config.STORAGE_BUCKETS && config.STORAGE_BUCKETS.EVIDENCIAS || "evidencias"; const path = nombreRuta || `entrega_${Date.now()}_${archivo.name}`; const { data, error } = await client.storage.from(bucket).upload(path, archivo, { cacheControl: "3600", upsert: true }); if (error) throw new Error("Error al subir archivo a Supabase Storage: " + error.message); const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(path); return { correcto: true, urlPublica: publicUrlData.publicUrl, idArchivo: data.path }; } };
  document.addEventListener("DOMContentLoaded", function() { try { installAuthBridge(); } catch (error) { console.error("[SGT360] No fue posible instalar el puente Supabase:", error); showMessage("No fue posible preparar la autenticación. Revisa la configuración de Supabase.", true); } }, { once: true });
})(window);
