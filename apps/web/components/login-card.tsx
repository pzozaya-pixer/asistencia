"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearSession,
  fetchSessionUser,
  getStoredAccessToken,
  loginWithPassword,
  storeSession
} from "@/lib/auth";

export function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function recoverSession() {
      const token = getStoredAccessToken();

      if (!token) {
        return;
      }

      try {
        await fetchSessionUser(token);

        if (!cancelled) {
          startTransition(() => router.replace("/dashboard"));
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setError(null);
        }
      }
    }

    void recoverSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await loginWithPassword(email, password);
      storeSession(session);
      startTransition(() => router.replace("/dashboard"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar la sesión."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-[36px] border border-white/70 p-6 shadow-panel sm:p-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-signal">
          Responsable
        </p>
        <h2 className="font-[family:var(--font-heading)] text-3xl font-bold text-ink">
          Iniciar sesión operativa
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Este acceso ya valida contra la API y aplica roles reales del
          scaffolding actual.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
          />
        </label>
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Validando acceso..." : "Entrar al panel"}
        </button>
      </form>
    </div>
  );
}
