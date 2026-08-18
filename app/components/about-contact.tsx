"use client";

import { useState, type FormEvent } from "react";
import { validateContact } from "@/lib/contact";
import { HighlightIcon, type HighlightIconKind } from "./pixel-icons";
import { useReveal } from "./use-reveal";

const HIGHLIGHTS: { icon: HighlightIconKind; text: string; color: string }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

type ContactForm = { name: string; email: string; msg: string };

export function AboutContact() {
  useReveal();

  const [form, setForm] = useState<ContactForm>({ name: "", email: "", msg: "" });
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    const validation = validateContact(form);
    if (!validation.ok) {
      if (validation.error === "empty") {
        setStatus("idle");
        setErrorMsg("");
      } else {
        setStatus("error");
        setErrorMsg("⚠ NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.");
      }
      triggerShake();
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        setStatus("error");
        setErrorMsg(
          data.error === "rate_limited"
            ? "⚠ DEMASIADOS ENVÍOS. ESPERA UNOS MINUTOS."
            : "⚠ NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO."
        );
        triggerShake();
        return;
      }

      setStatus("idle");
      setSent(form.name.trim());
    } catch {
      setStatus("error");
      setErrorMsg("⚠ NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.");
      triggerShake();
    }
  };

  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los
          arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.text} className={"highlight " + h.color} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m"></span>SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit} noValidate>
            {!sent ? (
              <>
                <div className="hp-field" aria-hidden="true">
                  <label htmlFor="website">Sitio web</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>NOMBRE</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="px_kai"
                  />
                </div>
                <div className="field">
                  <label>CORREO ELECTRÓNICO</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jugador@vault.gg"
                  />
                </div>
                <div className="field">
                  <label>MENSAJE</label>
                  <textarea
                    rows={5}
                    value={form.msg}
                    onChange={(e) => setForm({ ...form, msg: e.target.value })}
                    placeholder="Cuéntanos qué tienes en mente…"
                  ></textarea>
                </div>
                <button
                  className="btn xl press"
                  type="submit"
                  style={{ width: "100%" }}
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
                </button>
                {status === "error" && errorMsg && <div className="contact-error pixel">{errorMsg}</div>}
              </>
            ) : (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r"></span>
                  <span className="dot y"></span>
                  <span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line">
                    <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
                  </div>
                  <div className="line dim">[OK] Conectando con servidor…</div>
                  <div className="line dim">[OK] Validando contenido…</div>
                  <div className="line dim">[OK] Transmitiendo paquete…</div>
                  <div className="line success">
                    &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
                    <span className="caret">_</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setSent(null);
                        setForm({ name: "", email: "", msg: "" });
                      }}
                    >
                      ENVIAR OTRO MENSAJE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
