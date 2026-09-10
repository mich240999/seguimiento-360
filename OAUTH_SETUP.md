# Acceso con Google y Microsoft

La aplicacion conserva el acceso por correo y contrasena, y agrega inicio de
sesion con Google y Microsoft mediante Supabase Auth.

Para GitHub Pages, en **Supabase > Authentication > URL Configuration** usa:

- Site URL: `https://mich240999.github.io/seguimiento-360/`
- Redirect URLs: `https://mich240999.github.io/seguimiento-360/`

En Google Cloud registra `https://mich240999.github.io` como origen JavaScript
autorizado y `https://acmfxabypytwcxhuxjti.supabase.co/auth/v1/callback` como
URI de redireccionamiento. En Microsoft Entra registra el mismo URI de callback
como redirect URI de tipo Web.

Finalmente, habilita los proveedores Google y Azure en Supabase y registra cada
correo autorizado en `seg_usuarios` con estado `ACTIVO`. Los secretos de OAuth
solo se guardan en Google/Microsoft y Supabase, nunca en este repositorio.
