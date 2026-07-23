import "./globals.css";
import "./overrides.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TAAK · CRM",
  description: "Centro operativo y financiero de TAAK",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
