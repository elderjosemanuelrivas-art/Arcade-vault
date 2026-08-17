import type { Metadata } from "next";
import { AuthForm } from "../components/auth-form";

export const metadata: Metadata = {
  title: "Arcade Vault · Acceso",
  description: "Inicia sesión o crea una cuenta en Arcade Vault.",
};

export default function Page() {
  return <AuthForm />;
}
