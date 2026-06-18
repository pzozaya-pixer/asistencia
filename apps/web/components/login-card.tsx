import Link from "next/link";

export function LoginCard() {
  return (
    <div className="glass-panel w-full max-w-md rounded-[36px] border border-white/70 p-6 shadow-panel sm:p-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-signal">
          Responsable
        </p>
        <h2 className="font-[family:var(--font-heading)] text-3xl font-bold text-ink">
          Iniciar sesión demo
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Acceso de demostración con datos mock. El login real podrá conectarse
          después con autenticación externa.
        </p>
      </div>

      <form className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Usuario
          </span>
          <input
            type="text"
            defaultValue="responsable.demo"
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            PIN
          </span>
          <input
            type="password"
            defaultValue="123456"
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
          />
        </label>

        <div className="rounded-[28px] border border-cyan-100 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900">
          Credenciales de demo precargadas para agilizar la revisión del flujo.
        </div>

        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          Entrar al panel
        </Link>
      </form>
    </div>
  );
}
