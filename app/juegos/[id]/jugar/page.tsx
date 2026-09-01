import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games-data";
import { GamePlayer } from "@/app/components/game-player";

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  return {
    title: game ? `Arcade Vault · Jugando ${game.title}` : "Arcade Vault",
    description: game
      ? `Partida de demostración de ${game.title}.`
      : "Ficha de juego de Arcade Vault.",
  };
}

export default async function Page({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
