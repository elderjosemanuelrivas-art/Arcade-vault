"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "./session-provider";

type Status = "idle" | "loading" | "error" | "needsConfirmation";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered")) return "⚠ ESE CORREO YA TIENE UNA CUENTA.";
  if (m.includes("invalid login credentials")) return "⚠ CORREO O CONTRASEÑA INCORRECTOS.";
  if (m.includes("email not confirmed")) return "⚠ CONFIRMA TU CORREO ANTES DE ENTRAR.";
  if (m.includes("password") && (m.includes("least") || m.includes("short")))
    return "⚠ LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.";
  return "⚠ NO SE PUDO COMPLETAR LA OPERACIÓN. INTÉNTALO DE NUEVO.";
}

export function AuthForm() {
  const router = useRouter();
  const { signUp, signIn } = useSession();
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const switchTab = (next: "in" | "up") => {
    setTab(next);
    setStatus("idle");
    setErrorMsg("");
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "loading") return;

    if (tab === "in") {
      setStatus("loading");
      setErrorMsg("");
      const { error } = await signIn(email, pass);
      if (error) {
        setStatus("error");
        setErrorMsg(friendlyAuthError(error));
        return;
      }
      router.push("/biblioteca");
      return;
    }

    const nickname = (username || "PLAYER1").toUpperCase().slice(0, 10);
    if (nickname.length < 3) {
      setStatus("error");
      setErrorMsg("⚠ EL NOMBRE DEBE TENER AL MENOS 3 CARACTERES.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();
    if (existing) {
      setStatus("error");
      setErrorMsg("⚠ ESE NOMBRE YA ESTÁ EN USO.");
      return;
    }

    const { error, needsConfirmation } = await signUp(email, pass, nickname);
    if (error) {
      setStatus("error");
      setErrorMsg(friendlyAuthError(error));
      return;
    }

    if (needsConfirmation) {
      setStatus("needsConfirmation");
      return;
    }

    router.push("/biblioteca");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            type="button"
            onClick={() => switchTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            type="button"
            onClick={() => switchTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>

        {status === "needsConfirmation" ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div className="mono" style={{ fontSize: 13, lineHeight: 1.6 }}>
              ✓ CUENTA CREADA. TE ENVIAMOS UN CORREO A <strong>{email}</strong> PARA CONFIRMAR TU
              CUENTA.
            </div>
            <button
              className="btn ghost"
              type="button"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => switchTab("in")}
            >
              VOLVER
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={submit}>
              {tab === "up" && (
                <div className="field slide-in">
                  <label htmlFor="nickname">Usuario</label>
                  <input
                    id="nickname"
                    name="nickname"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="px_kai"
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                />
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={tab === "up" ? "new-password" : "current-password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                className="btn lg"
                type="submit"
                style={{ width: "100%", marginTop: 8 }}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <span
                      className="spinner"
                      aria-hidden="true"
                      style={{ marginRight: 8, verticalAlign: "middle" }}
                    ></span>
                    {tab === "in" ? "ENTRANDO…" : "CREANDO…"}
                  </>
                ) : tab === "in" ? (
                  "ENTRAR AL VAULT"
                ) : (
                  "CREAR Y JUGAR"
                )}
              </button>
              {status === "error" && errorMsg && (
                <div className="contact-error pixel">{errorMsg}</div>
              )}
            </form>

            <Link
              href="/biblioteca"
              className="btn ghost"
              style={{ width: "100%", marginTop: 10, display: "block", textAlign: "center" }}
            >
              JUGAR COMO INVITADO
            </Link>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button className="btn ghost" type="button">
                ◆ GOOGLE
              </button>
              <button className="btn ghost" type="button">
                ▣ GITHUB
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
