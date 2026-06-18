"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  clearSession,
  fetchSessionUser,
  getStoredAccessToken,
  REFRESH_TOKEN_KEY,
  storeSession,
} from "@/lib/auth";

export function DashboardAuthGate({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const token = getStoredAccessToken();

      if (!token) {
        clearSession();
        startTransition(() => router.replace("/login"));
        return;
      }

      try {
        const sessionUser = await fetchSessionUser(token);

        if (cancelled) {
          return;
        }

        storeSession({
          accessToken: token,
          refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "",
          user: sessionUser
        });
        setIsReady(true);
      } catch {
        if (cancelled) {
          return;
        }

        clearSession();
        startTransition(() => router.replace("/login"));
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[32px] border border-white/60 bg-white/70 px-6 py-16 text-center shadow-panel">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-signal">
            Validando sesion
          </p>
          <p className="text-sm text-slate-600">
            Comprobando permisos de acceso para el panel operativo.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
