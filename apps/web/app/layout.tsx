import type { Metadata } from "next";
import { PWAProvider } from "@/components/pwa-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistencia",
  description: "Plataforma PWA de control de asistencia",
  applicationName: "Asistencia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Asistencia"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
