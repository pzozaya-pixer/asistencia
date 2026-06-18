import { activities, attendee, stats } from "@/lib/mock-data";
import { SectionCard } from "@/components/section-card";

function LoginCard() {
  return (
    <SectionCard title="Acceso responsable" subtitle="PWA operativa">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Email</p>
          <p className="mt-1 text-base font-medium text-ink">responsable@demo.local</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Estado</p>
          <p className="mt-1 text-base font-medium text-ink">Listo para validar QR y firma</p>
        </div>
        <button className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
          Entrar a la jornada
        </button>
      </div>
    </SectionCard>
  );
}

function AdminCard() {
  return (
    <SectionCard title="Panel administrativo" subtitle="Vista rápida">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl bg-sand p-4">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {activities.map((activity) => (
          <article key={activity.id} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink">{activity.name}</h3>
                <p className="text-sm text-slate-500">{activity.schedule}</p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-mint px-3 py-1 text-xs font-semibold text-ink">
                {activity.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>{activity.location}</span>
              <span>{activity.capacity}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function AssistantCard() {
  return (
    <SectionCard title="Flujo asistente" subtitle="QR temporal">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Búsqueda por DNI o teléfono</p>
            <p className="mt-1 font-medium text-ink">{attendee.dni} · {attendee.phone}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Actividad seleccionada</p>
            <p className="mt-1 font-medium text-ink">{attendee.activity}</p>
          </div>
          <button className="rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white">
            Generar QR seguro
          </button>
        </div>
        <div className="grid-shell rounded-4xl border border-tide/20 bg-white p-5">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-ink p-5 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Token temporal</p>
              <p className="mt-3 text-2xl font-semibold">{attendee.qrCode}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-6 text-center text-ink">
              <div className="mx-auto grid h-40 w-40 place-items-center rounded-3xl border-8 border-ink">
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-4 w-4 rounded-sm ${index % 3 === 0 ? "bg-ink" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Expira en 02:00 min</p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function ResponsibleCard() {
  return (
    <SectionCard title="Validación responsable" subtitle="Escáner y firma">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-4xl bg-ink p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-xl font-semibold">
              {attendee.photoInitials}
            </div>
            <div>
              <p className="text-lg font-semibold">{attendee.name}</p>
              <p className="text-sm text-white/70">{attendee.dni}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-3xl bg-white/10 p-3">Actividad: {attendee.activity}</div>
            <div className="rounded-3xl bg-white/10 p-3">Estado: pendiente de firma</div>
            <div className="rounded-3xl bg-white/10 p-3">Método: QR temporal</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-4xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm font-medium text-slate-500">Área de firma simple</p>
            <div className="mt-4 h-32 rounded-3xl bg-white" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
              Confirmar asistencia
            </button>
            <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink">
              Registrar incidencia
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
      <header className="rounded-[2rem] bg-ink px-6 py-8 text-white shadow-float">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Demo operativa</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              Plataforma PWA de control de asistencia lista para escalar.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/72">
              La demo cubre panel administrativo, PWA de asistente, validación responsable y flujo de firma,
              preparada para conectar con Supabase, MinIO y automatizaciones n8n.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/10 p-5">
            <p className="text-sm text-white/60">Siguiente bloque</p>
            <p className="mt-2 text-xl font-semibold">Autenticación real + RBAC</p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <LoginCard />
        <AdminCard />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <AssistantCard />
        <ResponsibleCard />
      </div>
    </main>
  );
}

