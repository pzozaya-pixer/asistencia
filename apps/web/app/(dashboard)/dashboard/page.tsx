import Link from "next/link";

import {
  dashboardAlerts,
  dashboardMetrics,
  recentCheckIns,
  validationQueue
} from "@/lib/mock-data";

import { ActionCard } from "@/components/action-card";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-signal">
              Resumen operativo
            </p>
            <h1 className="font-[family:var(--font-heading)] text-3xl font-bold text-ink">
              Dashboard administrativo
            </h1>
          </div>
          <StatusBadge tone="success">Evento activo</StatusBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Acciones rápidas"
          description="Atajos para los flujos que se usan en acceso y validación."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard
              href="/asistente"
              title="Buscar asistente"
              description="Consulta por DNI o teléfono y emite un QR de demo protegido."
              accent="signal"
            />
            <ActionCard
              href="/validacion"
              title="Validar acceso"
              description="Revisa identidad, foto, firma y estado antes de confirmar entrada."
              accent="coral"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Alertas"
          description="Incidencias y tareas de seguimiento para el equipo responsable."
        >
          <div className="space-y-3">
            {dashboardAlerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{alert.title}</p>
                  <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
                </div>
                <p className="text-sm text-slate-600">{alert.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Últimos accesos"
          description="Muestra operativa de registros mock recientes."
        >
          <div className="space-y-3">
            {recentCheckIns.map((entry) => (
              <div
                key={`${entry.name}-${entry.time}`}
                className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{entry.name}</p>
                  <p className="text-sm text-slate-500">
                    {entry.time} · {entry.accessPoint}
                  </p>
                </div>
                <StatusBadge tone="info">{entry.mode}</StatusBadge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Cola de validación"
          description="Prioriza asistentes que requieren revisión manual."
        >
          <div className="space-y-3">
            {validationQueue.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{entry.name}</p>
                  <p className="text-sm text-slate-500">{entry.reason}</p>
                </div>
                <Link
                  href="/validacion"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
                >
                  Revisar
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
