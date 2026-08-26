"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/data/games";
import type { ArcadeEngine } from "@/lib/games/types";
import { GAME_ENGINES } from "@/lib/games/registry";
import { useSession } from "./session-provider";

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();
  const hasEngine = game.id in GAME_ENGINES;

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);

  const name = nameOverride ?? (user ? user.nickname : "INVITADO");
  const level = hasEngine ? engineLevel : Math.floor(score / 2500) + 1;

  useEffect(() => {
    if (hasEngine || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [hasEngine, over, paused]);

  useEffect(() => {
    if (!hasEngine) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    GAME_ENGINES[game.id]().then(({ default: createEngine }) => {
      if (cancelled) return;
      engineRef.current = createEngine(canvas, {
        onScore: setScore,
        onLives: setLives,
        onLevel: setEngineLevel,
        onGameOver: (finalScore) => {
          setScore(finalScore);
          setOver(true);
        },
        onPause: setPaused,
      });
    });

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [game.id, hasEngine]);

  const togglePause = () => {
    if (engineRef.current) {
      if (paused) engineRef.current.resume();
      else engineRef.current.pause();
      return;
    }
    setPaused((p) => !p);
  };

  const endGame = () => {
    engineRef.current?.pause();
    setOver(true);
  };

  const restart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
    } else {
      setScore(0);
    }
    setPaused(false);
    setOver(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {hasEngine ? (
            <canvas ref={canvasRef} width={800} height={600} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {hasEngine && <p className="player-kb-note">REQUIERE TECLADO</p>}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            <div className="input-row">
              <input
                value={name}
                onChange={(e) => setNameOverride(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="TUS INICIALES"
              />
              <button className="btn yellow" type="button" disabled title="Disponible próximamente">
                PRÓXIMAMENTE
              </button>
            </div>
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/biblioteca")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
