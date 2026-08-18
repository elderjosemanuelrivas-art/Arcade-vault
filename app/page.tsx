import type { Metadata } from "next";
import { Home } from "./components/home";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "El arcade clásico está de vuelta: juega los mejores clásicos gratis en tu navegador.",
};

export default function Page() {
  return <Home />;
}
