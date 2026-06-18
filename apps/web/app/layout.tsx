import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistencia Demo",
  description: "Plataforma PWA de control de asistencia",
  applicationName: "Asistencia Demo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Asistencia Demo"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

