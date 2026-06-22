"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearSession, getStoredUser, type SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "responsable", "operador_lectura"] },
  { href: "/eventos", label: "Eventos", roles: ["super_admin", "responsable"] },
  { href: "/asistentes", label: "Asistentes", roles: ["super_admin", "responsable"] },
  { href: "/informes", label: "Informes", roles: ["super_admin", "responsable", "operador_lectura"] },
  { href: "/usuarios", label: "Usuarios", roles: ["super_admin"] },
  { href: "/asistente", label: "Asistente", roles: ["super_admin", "responsable", "operador_lectura"] },
  { href: "/validacion", label: "Validación", roles: ["super_admin", "responsable", "operador_lectura"] }
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const visibleNavItems = navItems.filter((item) => (user ? item.roles.includes(user.role) : false));

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    startTransition(() => router.replace("/login"));
  }

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 rounded-[36px] border border-white/60 bg-white/65 p-4 shadow-panel backdrop-blur sm:p-5 lg:p-6">
        <header className="grid gap-4 rounded-[32px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Asistencia
            </p>
            <p className="font-[family:var(--font-heading)] text-2xl font-bold sm:text-3xl">
              Operación rápida en acceso
            </p>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Shell base responsive para responsables. Pensado para uso en
              tablet vertical y móvil durante acreditación.
            </p>
            {user ? (
              <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-slate-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {user.fullName}
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                  {user.role}
                </span>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="grid gap-2 rounded-[28px] bg-white/5 p-2 sm:grid-cols-3">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[22px] px-3 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white",
                    pathname === item.href && "bg-white text-ink hover:bg-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-[22px] border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
