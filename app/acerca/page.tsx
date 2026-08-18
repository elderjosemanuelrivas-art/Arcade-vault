import type { Metadata } from "next";
import { AboutContact } from "../components/about-contact";

export const metadata: Metadata = {
  title: "Arcade Vault · Acerca de",
  description: "Conoce la misión de Arcade Vault y contáctanos.",
};

export default function Page() {
  return <AboutContact />;
}
