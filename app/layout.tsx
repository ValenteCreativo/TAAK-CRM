import "./globals.css";
import "./overrides.css";
import "./mobile.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TAAK Studio CRM",
  description: "Centro operativo y financiero de TAAK",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
