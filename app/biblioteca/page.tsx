import type { Metadata } from "next";
import { getCategories, getGames } from "@/lib/games-data";
import { Library } from "../components/library";

export const metadata: Metadata = {
  title: "Arcade Vault · Biblioteca",
  description: "Explora la biblioteca de juegos retro de Arcade Vault.",
};

export default async function Page() {
  const [games, cats] = await Promise.all([getGames(), getCategories()]);
  return <Library games={games} cats={cats} />;
}
