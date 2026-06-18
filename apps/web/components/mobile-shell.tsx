"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/asistente", label: "Asistente" },
  { href: "/validacion", label: "Validación" }
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 rounded-[36px] border border-white/60 bg-white/65 p-4 shadow-panel backdrop-blur sm:p-5 lg:p-6">
        <header className="grid gap-4 rounded-[32px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Asistencia Demo
            </p>
            <p className="font-[family:var(--font-heading)] text-2xl font-bold sm:text-3xl">
              Operación rápida en acceso
            </p>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Shell base responsive para responsables. Pensado para uso en
              tablet vertical y móvil durante acreditación.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-[28px] bg-white/5 p-2">
            {navItems.map((item) => (
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
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
