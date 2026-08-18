# SPEC 03 — Envío real del formulario de contacto con Resend

> **Status:** Implementado
> **Depends on:** SPEC 02
> **Date:** 2026-08-18
> **Objective:** Conectar el formulario de /acerca a un endpoint propio que envíe el mensaje por correo con Resend, con validación compartida, protección anti-abuso y estados reales de envío y error.

## Por qué este spec existe

El SPEC 02 portó `/acerca` (misión, highlights, divisor y formulario de contacto) desde `referencias/templates/home-about/home-about/about.jsx`, pero dejó explícitamente fuera de alcance el backend: el `onSubmit` actual (`app/components/about-contact.tsx:22-30`) solo hace `setSent(form.name.trim())` y nunca sale del navegador. Este spec cierra ese hueco: es el primer endpoint del proyecto y la primera vez que el repo lee `process.env`.

## Scope

**In:**

- Dependencia `resend` añadida a `package.json`.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, con `.env.local` (no versionado) y `.env.example` (versionado, sin valores reales).
- Módulo de validación compartido `lib/contact.ts`, usado tanto por el cliente como por el endpoint.
- Route Handler `app/api/contacto/route.ts` (`POST`) que valida, aplica honeypot y rate limit, y envía el correo con Resend.
- `app/components/about-contact.tsx` pasa de envío síncrono simulado a `fetch` real, con estados `sending` y `error`.
- Dos reglas CSS nuevas en `app/globals.css` para el mensaje de error y el campo honeypot.

**Out of scope (for future specs):**

- Auto-respuesta o acuse de recibo al visitante que llena el formulario.
- Dominio propio verificado en Resend (se usa `onboarding@resend.dev`, que solo entrega al correo de la cuenta de Resend).
- Persistencia de los mensajes recibidos (base de datos, panel de administración).
- Rate limit compartido entre instancias (Redis/Upstash) — el de este spec es en memoria, por proceso.
- Captcha o verificación humana adicional al honeypot.
- Tests automatizados (el proyecto no tiene test runner configurado).
- Cualquier cambio de contenido o diseño del about más allá del estado de envío y la línea de error.

## Data model

```ts
// lib/contact.ts
export type ContactPayload = { name: string; email: string; msg: string; website?: string };
export type ContactError = "empty" | "invalid_email" | "too_long" | "rate_limited" | "server";
export type ValidationResult =
  | { ok: true; data: { name: string; email: string; msg: string } }
  | { ok: false; error: ContactError };

export function validateContact(input: unknown): ValidationResult;
```

Límites de `validateContact`: `name` entre 2 y 60 caracteres tras `trim()`; `email` hasta 120 caracteres y con formato válido; `msg` entre 10 y 2000 caracteres. `website` es el campo honeypot — si llega con contenido, la petición se descarta como spam antes de validar el resto.

Respuesta del endpoint `POST /api/contacto`:

- `200 { ok: true }` — correo enviado (o descartado en silencio por honeypot).
- `400 { ok: false, error: "empty" | "invalid_email" | "too_long" }` — validación fallida.
- `429 { ok: false, error: "rate_limited" }` — más de 3 envíos desde la misma IP en 10 minutos.
- `500 { ok: false, error: "server" }` — configuración ausente o fallo de Resend.

El endpoint **nunca** reenvía al cliente el mensaje de error crudo de Resend ni detalles internos.

Variables de entorno (`.env.local`, con `.env.example` como plantilla versionada):

```
RESEND_API_KEY=re_xxxxxxxx
CONTACT_FROM=Arcade Vault <onboarding@resend.dev>
CONTACT_TO=tu-correo-de-la-cuenta-resend@ejemplo.com
```

`.gitignore` ignora `.env*` en bloque; este spec añade la negación `!.env.example` para poder versionar la plantilla.

## Implementation plan

1. `npm install resend`. Crear `.env.local` con las tres variables reales y `.env.example` con los mismos nombres sin valores; añadir `!.env.example` a `.gitignore`. Verificación: `npm run build` sigue pasando.
2. Crear `lib/contact.ts` con `ContactPayload`, `ContactError`, `validateContact()` y las constantes de límite (sin imports de React ni de Next, para que lo use tanto el cliente como el servidor). Verificación: `npx tsc --noEmit` sin errores.
3. Crear `app/api/contacto/route.ts` exportando `async function POST(request: Request)` (convención confirmada en `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`). Orden dentro del handler: parsear JSON (400 si falla) → honeypot (`website` no vacío ⇒ responder `{ ok: true }` sin enviar nada) → rate limit → `validateContact()` → `new Resend(process.env.RESEND_API_KEY)` y `resend.emails.send(...)`. Verificación: `curl -X POST localhost:3000/api/contacto` con un cuerpo válido devuelve `{"ok":true}` y el correo llega.
4. Implementar el rate limit en el mismo archivo: `Map<string, number[]>` en ámbito de módulo, clave = primer valor de la cabecera `x-forwarded-for` (o `"unknown"` si no viene ninguna — `NextRequest` no expone `.ip` en esta versión de Next, no aparece en los docs locales), ventana de 10 minutos, máximo 3 envíos, purgando marcas caducadas en cada llamada. Verificación: cuatro `curl` seguidos desde la misma sesión → el cuarto responde 429 con `{"ok":false,"error":"rate_limited"}`.
5. Definir el contenido del correo: asunto `[Arcade Vault] Mensaje de <nombre>`, cuerpo en texto plano con nombre, correo y mensaje, `from: process.env.CONTACT_FROM`, `to: process.env.CONTACT_TO`, `replyTo` con el correo del visitante para poder responderle directo desde el buzón. Verificación: el correo recibido muestra los tres campos y "Responder" apunta al visitante.
6. Actualizar `app/components/about-contact.tsx`: añadir estado `status: "idle" | "sending" | "error"`, convertir `onSubmit` en `async` con `fetch("/api/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })`. Validar primero en cliente con `validateContact()` (mantiene el shake actual sin viaje de red si algo falta). Mientras `status === "sending"`: botón `disabled` con texto `ENVIANDO…`. Si la petición falla o el endpoint responde `ok:false`: `status = "error"`, shake, y se conserva lo escrito en los campos. Solo con `{ ok: true }` se llama a `setSent(...)` y aparece la terminal fake, igual que hoy. Toda la lógica vive dentro del manejador del evento `submit`, no en un `useEffect`, para no chocar con la regla `react-hooks/set-state-in-effect` documentada en `CLAUDE.md`. Verificación: `npm run lint` sin errores.
7. Añadir el campo honeypot al formulario: un `<input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true">` dentro de un contenedor con clase `hp-field`, oculto por CSS (no `display: none`, que algunos bots detectan y evitan). Verificación: el campo no es visible ni recibe foco al navegar con Tab.
8. Añadir al final de `app/globals.css` dos reglas nuevas: `.contact-error` (`font-family: var(--pixel)`, `font-size: 9px`, `color: var(--magenta)`, `letter-spacing: 0.14em`, margen superior) y `.hp-field` (`position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden`). Verificación: el mensaje de error se ve bajo el botón con el estilo del resto del sitio.
9. Mostrar el mensaje de error correspondiente, en mayúsculas y con el mismo tono del sitio: `⚠ NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` para 400/500, `⚠ DEMASIADOS ENVÍOS. ESPERA UNOS MINUTOS.` para 429. Verificación: forzar cada caso desde la UI (campo vacío ya cubierto por el shake existente; error de red desconectando el server; rate limit con envíos repetidos).
10. `npm run lint` y `npm run build`. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo. Verificación: ambos comandos terminan sin errores ni warnings.

## Acceptance criteria

- [x] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [x] Enviar el formulario completo desde `/acerca` hace llegar un correo real al buzón de `CONTACT_TO` con nombre, correo y mensaje.
- [x] "Responder" en ese correo dirige al correo que escribió el visitante.
- [x] Mientras se envía, el botón queda deshabilitado y muestra `ENVIANDO…`; no se puede enviar dos veces con doble clic.
- [x] Tras `{ ok: true }` aparece la terminal `VAULT-OS` con el nombre en mayúsculas, igual que hoy.
- [x] Con algún campo vacío, el formulario sacude y **no** hace ninguna petición de red (verificable en la pestaña Network del navegador).
- [x] Con un correo mal formado (por ejemplo `abc@`), el formulario sacude y muestra la línea de error, sin enviar nada.
- [x] Si el endpoint responde 500, se ve `⚠ NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` y lo escrito sigue en los campos.
- [x] Al cuarto envío desde la misma IP dentro de 10 minutos, la respuesta es 429 y se ve `⚠ DEMASIADOS ENVÍOS. ESPERA UNOS MINUTOS.`.
- [x] Un POST con el campo `website` relleno responde 200 y **no** genera ningún correo.
- [x] `RESEND_API_KEY` no aparece en ningún bundle de cliente (`grep -r "re_" .next/static` no devuelve nada).
- [x] `.env.local` no está versionado; `.env.example` sí, con los tres nombres y sin valores reales.

## Decisions taken and discarded

- **Sí:** Route Handler `app/api/contacto/route.ts` en vez de server action. Es el primer endpoint del proyecto y se puede probar con `curl` sin pasar por la UI.
- **Sí:** validación manual compartida en `lib/contact.ts`. Tres campos no justifican añadir zod a un proyecto que hoy solo depende de `next`, `react` y `react-dom`.
- **No:** auto-respuesta al visitante. Convertiría el formulario en un vector para mandar correo a terceros, y además `onboarding@resend.dev` no permite enviar a direcciones fuera de la cuenta sin dominio verificado.
- **Sí:** `onboarding@resend.dev` como remitente, apuntando al correo de la cuenta de Resend como destinatario. Sin dominio propio verificado es la única opción funcional hoy; ambas direcciones quedan en variables de entorno, así que pasar a un dominio propio en el futuro es cambiar `.env.local`, no código.
- **Sí:** honeypot + rate limit en memoria como única protección anti-abuso. Proporcional a un proyecto sin infraestructura de backend.
- **No:** captcha o rate limit con almacén compartido (Redis/Upstash). Desproporcionado para el alcance actual; si el sitio se despliega en serverless con múltiples instancias y aparece abuso real, es material para otro spec.
- **Sí:** línea de error bajo el botón, conservando el shake existente. El template original nunca contempló un estado de error real (solo simulaba éxito), y dejar al usuario sin saber qué pasó tras un fallo de red sería peor que sumar una regla CSS.
- **Sí:** conservar lo escrito en los campos cuando el envío falla. Perder un mensaje largo por un error de red sería el peor desenlace posible de este flujo.
- **No:** guardar los mensajes recibidos en una base de datos o panel propio. El proyecto no tiene backend real ni persistencia (la sesión de usuario ya es fake en `localStorage`); el correo es la única entrega.

## Risks

| Risk | Mitigation |
| --- | --- |
| Sin dominio verificado, Resend solo entrega al correo de la cuenta: probar con otra dirección de destino "no llega" y puede parecer un bug | El spec lo declara explícitamente; `CONTACT_TO` es variable de entorno y el criterio de aceptación apunta al buzón de la cuenta |
| El rate limit en memoria se pierde al reiniciar el servidor y no se comparte entre instancias serverless | Documentado como límite conocido; es disuasión básica, no seguridad robusta. Migrar a un almacén compartido queda para otro spec |
| Filtrar `RESEND_API_KEY` al cliente si se llegara a leer fuera del route handler | Solo `app/api/contacto/route.ts` lee `process.env`; hay un criterio de aceptación específico con `grep` sobre `.next/static` |
| La cabecera `x-forwarded-for` puede faltar o ser falsificable en desarrollo local | Fallback a la clave `"unknown"` (todas las peticiones sin cabecera comparten cubo); aceptable porque el rate limit es disuasorio, no una defensa de seguridad |
| Falta `.env.local` y el endpoint devuelve 500 sin ninguna pista de por qué | El handler comprueba las tres variables de entorno al inicio de la petición, registra un `console.error` explícito en el servidor, y devuelve `error: "server"` al cliente sin exponer detalles |

## What is **not** in this spec

- Auto-respuesta o acuse de recibo al visitante que llena el formulario.
- Dominio propio verificado en Resend.
- Persistencia de mensajes, panel de administración, adjuntos.
- Rate limit distribuido, captcha, tests automatizados.
- Cualquier cambio de contenido o diseño del about más allá del estado de envío y la línea de error.

Cada uno de estos, si se implementa, va en su propio spec.
