import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asistencia Demo",
    short_name: "Asistencia",
    description: "PWA de control de asistencia para asistentes y responsables",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf9",
    theme_color: "#102033",
    lang: "es-ES",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };
}

