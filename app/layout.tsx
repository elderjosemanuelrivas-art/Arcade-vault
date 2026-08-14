import type { Metadata } from "next";
import { pressStart2P, courierPrime, jetBrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Arcade Vault",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${courierPrime.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
