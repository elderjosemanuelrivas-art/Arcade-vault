import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES } from "@/data/games";
import { GamePlayer } from "@/app/components/game-player";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  return {
    title: game ? `Arcade Vault · Jugando ${game.title}` : "Arcade Vault",
    description: game ? `Partida de demostración de ${game.title}.` : "Ficha de juego de Arcade Vault.",
  };
}

export default async function Page({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
