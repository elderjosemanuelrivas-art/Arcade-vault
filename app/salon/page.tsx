import type { Metadata } from "next";
import { getGameScores, getGames, type ScoreRow } from "@/lib/games-data";
import { HallOfFame } from "../components/hall-of-fame";

export const metadata: Metadata = {
  title: "Arcade Vault · Salón de la Fama",
  description: "Las mejores puntuaciones de Arcade Vault, juego por juego.",
};

export default async function Page() {
  const games = await getGames();
  const scoresByGame: Record<string, ScoreRow[]> = Object.fromEntries(
    await Promise.all(games.map(async (g) => [g.id, await getGameScores(g.id, 12)] as const)),
  );
  return <HallOfFame games={games} scoresByGame={scoresByGame} />;
}
