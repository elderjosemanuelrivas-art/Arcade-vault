import { Resend } from "resend";
import { validateContact, type ContactError } from "@/lib/contact";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const hits = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function errorResponse(status: number, error: ContactError) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "empty");
  }

  const website = typeof body === "object" && body !== null ? (body as Record<string, unknown>).website : undefined;
  if (typeof website === "string" && website.trim() !== "") {
    return Response.json({ ok: true });
  }

  if (isRateLimited(getClientIp(request))) {
    return errorResponse(429, "rate_limited");
  }

  const validation = validateContact(body);
  if (!validation.ok) {
    return errorResponse(400, validation.error);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO;
  if (!apiKey || !from || !to) {
    console.error("Falta configuración de Resend: revisa RESEND_API_KEY, CONTACT_FROM y CONTACT_TO en .env.local");
    return errorResponse(500, "server");
  }

  const { name, email, msg } = validation.data;
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
    });
    if (error) {
      console.error("Resend devolvió un error al enviar el correo de contacto:", error);
      return errorResponse(500, "server");
    }
  } catch (err) {
    console.error("Fallo inesperado enviando el correo de contacto:", err);
    return errorResponse(500, "server");
  }

  return Response.json({ ok: true });
}
