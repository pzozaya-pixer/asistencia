"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPwaCard() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(standalone);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setPromptEvent(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) {
      return;
    }

    setIsInstalling(true);

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      setIsInstalling(false);
    }
  }

  if (isStandalone) {
    return (
      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
        La app ya está instalada en este dispositivo.
      </div>
    );
  }

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4 text-sm leading-6 text-slate-700">
      <p className="font-semibold text-slate-950">Instala esta app en tu móvil</p>
      <p className="mt-2">
        Si tu navegador lo permite, usa el botón de instalación. Si no aparece, abre esta
        página en Chrome Android o en Safari iPhone y añádela a la pantalla de inicio.
      </p>
      {promptEvent ? (
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={isInstalling}
          className="mt-4 rounded-full bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isInstalling ? "Preparando instalación..." : "Instalar aplicación"}
        </button>
      ) : (
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-cyan-700">
          Si usas Android, espera unos segundos para que Chrome habilite la instalación.
        </p>
      )}
    </div>
  );
}
