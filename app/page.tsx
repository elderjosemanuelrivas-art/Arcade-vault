import type { Metadata } from "next";
import { getGames, getRecentScores, getSiteStats, getTopPlayers } from "@/lib/games-data";
import { Home } from "./components/home";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "El arcade clásico está de vuelta: juega los mejores clásicos gratis en tu navegador.",
};

export default async function Page() {
  const [games, recentScores, topPlayers, siteStats] = await Promise.all([
    getGames(),
    getRecentScores(),
    getTopPlayers(),
    getSiteStats(),
  ]);
  return (
    <Home games={games} recentScores={recentScores} topPlayers={topPlayers} siteStats={siteStats} />
  );
}
