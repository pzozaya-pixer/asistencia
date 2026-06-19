"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchDashboardSummary, type DashboardSummary } from "@/lib/auth";

import { ActionCard } from "@/components/action-card";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const nextSummary = await fetchDashboardSummary();

        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

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
          <StatusBadge tone={summary?.activeActivity ? "success" : "warning"}>
            {summary?.activeActivity ? "Evento activo" : "Sin evento activo"}
          </StatusBadge>
        </div>

        {summary?.activeActivity ? (
          <div className="rounded-[28px] border border-cyan-200 bg-cyan-50/80 px-5 py-4 text-sm text-cyan-950">
            <p className="font-semibold">{summary.activeActivity.nombre}</p>
            <p className="mt-1">
              {summary.activeActivity.codigo}
              {summary.activeActivity.ubicacion
                ? ` · ${summary.activeActivity.ubicacion}`
                : ""}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && !summary
            ? Array.from({ length: 4 }).map((_, index) => (
                <article
                  key={index}
                  className="rounded-[30px] border border-slate-200/70 bg-white/80 p-5 shadow-sm"
                >
                  <div className="mb-4 h-5 w-32 rounded-full bg-slate-100" />
                  <div className="h-10 w-20 rounded-full bg-slate-100" />
                  <div className="mt-3 h-4 w-40 rounded-full bg-slate-100" />
                </article>
              ))
            : summary?.metrics.map((metric) => (
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
              description="Consulta por DNI o teléfono y continúa con QR o validación manual."
              accent="signal"
            />
            <ActionCard
              href="/validacion"
              title="Validar acceso"
              description="Registra validaciones manuales reales contra el backend operativo."
              accent="coral"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Alertas"
          description="Incidencias y tareas de seguimiento para el equipo responsable."
        >
          <div className="space-y-3">
            {summary?.alerts.map((alert) => (
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
            {!isLoading && summary?.alerts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                No hay alertas activas en este momento.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Últimos accesos"
          description="Registros recientes capturados en el entorno actual."
        >
          <div className="space-y-3">
            {summary?.recentAccess.map((entry) => (
              <div
                key={entry.id}
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
            {!isLoading && summary?.recentAccess.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                Aún no hay accesos registrados en la base actual.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Cola de validación"
          description="Asistentes pendientes de revisión manual en la actividad activa."
        >
          <div className="space-y-3">
            {summary?.validationQueue.map((entry) => (
              <div
                key={`${entry.activityId}-${entry.id}`}
                className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{entry.name}</p>
                  <p className="text-sm text-slate-500">{entry.reason}</p>
                </div>
                <Link
                  href={`/validacion?asistenteId=${entry.id}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
                >
                  Revisar
                </Link>
              </div>
            ))}
            {!isLoading && summary?.validationQueue.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                No quedan asistentes pendientes en la cola actual.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
