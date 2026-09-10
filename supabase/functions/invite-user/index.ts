import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anonKey || !serviceKey) return response({ error: "La función no tiene la configuración de Supabase requerida." }, 500);

  const authorization = request.headers.get("Authorization") || "";
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return response({ error: "Sesión no válida." }, 401);

  const admin = createClient(url, serviceKey);
  const callerEmail = String(authData.user.email || "").trim().toLowerCase();
  const { data: caller, error: callerError } = await admin
    .from("seg_usuarios")
    .select("id_usuario, rol, estado")
    .ilike("correo", callerEmail)
    .maybeSingle();
  if (callerError || !caller || caller.estado !== "ACTIVO" || String(caller.rol).toUpperCase() !== "SUPERADMIN") {
    return response({ error: "Solo un superadministrador puede invitar usuarios." }, 403);
  }

  const payload = await request.json().catch(() => null);
  if (payload && payload.accion === "CAMBIAR_CONTRASENA") {
    const idUsuario = String(payload.idUsuario || "").trim();
    const password = String(payload.nuevaContrasena || "");
    if (!idUsuario || password.length < 8) return response({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, 400);
    const { data: target, error: targetError } = await admin.from("seg_usuarios").select("correo").eq("id_usuario", idUsuario).maybeSingle();
    if (targetError || !target) return response({ error: "No se encontró el usuario a modificar." }, 404);
    const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) return response({ error: authUsersError.message }, 400);
    const authUser = authUsers.users.find((item) => String(item.email || "").toLowerCase() === String(target.correo || "").toLowerCase());
    if (!authUser) return response({ error: "El usuario todavía no ha aceptado su invitación de Supabase." }, 409);
    const { error: passwordError } = await admin.auth.admin.updateUserById(authUser.id, { password });
    if (passwordError) return response({ error: passwordError.message }, 400);
    return response({ correcto: true, mensaje: "Contraseña actualizada." });
  }
  const input = payload && payload.usuario || {};
  const email = String(input.correo || "").trim().toLowerCase();
  const name = String(input.nombre || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || !input.rol) {
    return response({ error: "Correo, nombre y rol son obligatorios." }, 400);
  }

  const { data: existing, error: existingError } = await admin
    .from("seg_usuarios")
    .select("id_usuario")
    .ilike("correo", email)
    .maybeSingle();
  if (existingError) return response({ error: existingError.message }, 400);
  if (existing) return response({ error: "Ya existe un usuario de Seguimiento 360 con este correo." }, 409);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: String(payload.redirectTo || "").trim() || undefined,
    data: { nombre: name }
  });
  if (inviteError || !invited.user) return response({ error: inviteError?.message || "No fue posible enviar la invitación." }, 400);

  const id = "USR-" + crypto.randomUUID();
  const { error: profileError } = await admin.from("seg_usuarios").insert({
    id_usuario: id,
    correo: email,
    nombre: name,
    telefono: input.telefono || null,
    rol: input.rol,
    id_proveedor: input.idProveedor || null,
    id_oficina: input.idOficina || null,
    id_grupo: input.idGrupo || null,
    estado: input.estado || "ACTIVO",
    tipo_documento: input.tipoDocumento || null,
    numero_documento: input.numeroDocumento || null,
    id_usuario_actualizacion: caller.id_usuario
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return response({ error: profileError.message }, 400);
  }
  return response({ correcto: true, idUsuario: id, mensaje: "Invitación enviada al correo del usuario." });
});
