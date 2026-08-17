import type { Metadata } from "next";
import { Library } from "./components/library";

export const metadata: Metadata = {
  title: "Arcade Vault · Biblioteca",
  description: "Explora la biblioteca de juegos retro de Arcade Vault.",
};

export default function Page() {
  return <Library />;
}
