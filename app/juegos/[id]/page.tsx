import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getGameScores } from "@/lib/games-data";
import { Leaderboard } from "@/app/components/leaderboard";
import { GAME_ENGINES } from "@/lib/games/registry";
import { TOUCH_CONTROLS } from "@/lib/games/touch-controls";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  return {
    title: game ? `Arcade Vault · ${game.title}` : "Arcade Vault",
    description: game?.short ?? "Ficha de juego de Arcade Vault.",
  };
}

export default async function Page({ params }: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores = await getGameScores(id, 10);
  // "TECLADO / TÁCTIL" es el rótulo por defecto para las 7 pantallas de
  // detalle que ya lo mostraban (4 juegos con motor real + táctil, 3 arenas
  // falsas) — se mantiene igual para no cambiarles nada. Solo un juego con
  // motor real y sin esquema en TOUCH_CONTROLS (hoy, `invasores`) muestra
  // "TECLADO" a secas, porque de verdad no tiene D-pad táctil.
  const controlsLabel =
    game.id in GAME_ENGINES && !TOUCH_CONTROLS[game.id] ? "TECLADO" : "TECLADO / TÁCTIL";

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>{controlsLabel}</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn xl pulse" href={`/juegos/${game.id}/jugar`}>
              ▶ JUGAR AHORA
            </Link>
            <Link className="btn ghost lg" href="/biblioteca">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard rows={scores} />
      </aside>
    </div>
  );
}
