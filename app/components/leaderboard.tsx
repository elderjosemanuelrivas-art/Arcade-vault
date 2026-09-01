import type { ScoreRow } from "@/lib/games-data";

export function Leaderboard({ rows }: { rows: ScoreRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="leaderboard">
        <h3>MEJORES PUNTUACIONES</h3>
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-faint)" }}>
          AÚN NADIE HA JUGADO
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
