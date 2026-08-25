-- PostgREST expone por defecto toda función del esquema public como RPC.
-- handle_new_user() solo debe invocarse como trigger, nunca vía API pública.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
