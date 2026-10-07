import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { Shell } from "./shell";

const titulo = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700"], variable: "--fonte-titulo" });
const corpo = Figtree({ subsets: ["latin"], variable: "--fonte-corpo" });

export const metadata: Metadata = {
  title: "Grifo",
  description: "Envie um PDF ou Excel e pergunte o que quiser saber.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${corpo.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
