import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // No poner este cliente en una variable de módulo/global: debe crearse en
  // cada request para no filtrar la sesión de un usuario a otro.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // No meter código entre createServerClient y getClaims(): un error aquí
  // puede dejar a los usuarios deslogueados de forma aleatoria e intermitente.
  //
  // Este spec no protege ninguna ruta: getClaims() solo dispara el refresco
  // del token, sin usar su resultado para redirigir a nadie.
  await supabase.auth.getClaims();

  // Devolver supabaseResponse tal cual: reconstruirlo desincroniza al
  // navegador y al servidor, y puede terminar la sesión antes de tiempo.
  return supabaseResponse;
}
