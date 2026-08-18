export type ContactPayload = { name: string; email: string; msg: string; website?: string };
export type ContactError = "empty" | "invalid_email" | "too_long" | "rate_limited" | "server";
export type ValidationResult =
  | { ok: true; data: { name: string; email: string; msg: string } }
  | { ok: false; error: ContactError };

const NAME_MIN = 2;
const NAME_MAX = 60;
const EMAIL_MAX = 120;
const MSG_MIN = 10;
const MSG_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) return { ok: false, error: "empty" };

  const { name, email, msg } = input as Record<string, unknown>;
  const nameTrim = typeof name === "string" ? name.trim() : "";
  const emailTrim = typeof email === "string" ? email.trim() : "";
  const msgTrim = typeof msg === "string" ? msg.trim() : "";

  if (!nameTrim || !emailTrim || !msgTrim) return { ok: false, error: "empty" };
  if (nameTrim.length < NAME_MIN || nameTrim.length > NAME_MAX) return { ok: false, error: "too_long" };
  if (msgTrim.length < MSG_MIN || msgTrim.length > MSG_MAX) return { ok: false, error: "too_long" };
  if (emailTrim.length > EMAIL_MAX || !EMAIL_RE.test(emailTrim)) return { ok: false, error: "invalid_email" };

  return { ok: true, data: { name: nameTrim, email: emailTrim, msg: msgTrim } };
}
