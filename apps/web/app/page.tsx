import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-6 px-4 py-6 sm:px-6">
      <section className="overflow-hidden rounded-[40px] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,_rgba(82,174,204,0.22),_transparent_36%),linear-gradient(135deg,#f7fbff_0%,#eef8ff_42%,#fffaf2_100%)] p-6 shadow-panel sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">
              Plataforma asistencia
            </div>
            <div className="space-y-3">
              <h1 className="font-[family:var(--font-heading)] text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Elige cómo quieres entrar.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                El acceso de asistentes es público para generar el QR. El panel operativo sigue
                disponible para responsables y administración.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Link
              href="/asistente"
              className="rounded-[32px] border border-cyan-200 bg-white/88 p-6 shadow-panel transition hover:-translate-y-0.5 hover:border-cyan-300"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Acceso público
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                Asistente
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Introduce tu DNI, NIE o teléfono, selecciona tu actividad y genera el QR desde el
                móvil.
              </p>
            </Link>

            <Link
              href="/login"
              className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-panel transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Acceso privado
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold">
                Dashboard
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Entra con tu usuario para gestionar eventos, validar asistentes y operar el panel.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
