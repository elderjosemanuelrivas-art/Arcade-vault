import type { Metadata } from "next";
import { HallOfFame } from "../components/hall-of-fame";

export const metadata: Metadata = {
  title: "Arcade Vault · Salón de la Fama",
  description: "Las mejores puntuaciones de Arcade Vault, juego por juego.",
};

export default function Page() {
  return <HallOfFame />;
}
