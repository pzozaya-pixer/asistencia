"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  downloadDashboardExport,
  fetchActivities,
  fetchDashboardSummary,
  getStoredUser,
  type ActivityRecord,
  type SessionUser,
  type DashboardSummary
} from "@/lib/auth";

import { ActionCard } from "@/components/action-card";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export function DashboardClient() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [exportActivityId, setExportActivityId] = useState("");
  const [exportAttendanceDate, setExportAttendanceDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<null | "excel" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const [nextSummary, nextActivities] = await Promise.all([
          fetchDashboardSummary(),
          fetchActivities()
        ]);

        if (!cancelled) {
          setSummary(nextSummary);
          setActivities(nextActivities);
          setExportActivityId(nextSummary.activeActivity?.id ?? nextActivities[0]?.id ?? "");
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

  const selectedExportActivity =
    activities.find((activity) => activity.id === exportActivityId) ?? null;
  const exportDateOptions = selectedExportActivity
    ? buildAttendanceDateOptions(
        selectedExportActivity.fechaInicio,
        selectedExportActivity.fechaFin
      )
    : [];

  useEffect(() => {
    if (exportDateOptions.length === 0) {
      setExportAttendanceDate("");
      return;
    }

    setExportAttendanceDate((current) =>
      current && exportDateOptions.includes(current)
        ? current
        : resolvePreferredExportDate(exportDateOptions)
    );
  }, [exportDateOptions.join("|")]);

  async function handleExport(format: "excel" | "pdf") {
    setIsExporting(format);
    setError(null);

    try {
      const blob = await downloadDashboardExport(format, {
        activityId: exportActivityId || undefined,
        attendanceDate: exportAttendanceDate || undefined
      });
      const extension = format === "excel" ? "xlsx" : "pdf";
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${selectedExportActivity?.codigo ?? "actividad"}-${exportAttendanceDate || "sin-fecha"}-asistencia.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo generar la exportación."
      );
    } finally {
      setIsExporting(null);
    }
  }

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={exportActivityId}
              onChange={(event) => setExportActivityId(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink outline-none transition hover:border-signal"
            >
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.codigo} · {activity.nombre}
                </option>
              ))}
            </select>
            <select
              value={exportAttendanceDate}
              onChange={(event) => setExportAttendanceDate(event.target.value)}
              disabled={exportDateOptions.length === 0}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink outline-none transition hover:border-signal disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exportDateOptions.map((date) => (
                <option key={date} value={date}>
                  {formatAttendanceDate(date)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleExport("excel")}
              disabled={!exportActivityId || !exportAttendanceDate || isExporting !== null}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting === "excel" ? "Generando Excel..." : "Exportar Excel"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={!exportActivityId || !exportAttendanceDate || isExporting !== null}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting === "pdf" ? "Generando PDF..." : "Exportar PDF"}
            </button>
            <StatusBadge tone={summary?.activeActivity ? "success" : "warning"}>
              {summary?.activeActivity ? "Evento activo" : "Sin evento activo"}
            </StatusBadge>
          </div>
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
          <div
            className={`grid gap-3 sm:grid-cols-2 ${
              currentUser?.role === "super_admin" ? "xl:grid-cols-6" : "xl:grid-cols-5"
            }`}
          >
            <ActionCard
              href="/eventos"
              title="Eventos"
              description="Gestiona altas, estados, fechas y responsables de las actividades."
              accent="signal"
            />
            {currentUser?.role === "super_admin" ? (
              <ActionCard
                href="/usuarios"
                title="Usuarios"
                description="Administra accesos internos, roles y activaciones del equipo."
                accent="coral"
              />
            ) : null}
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
            <button
              type="button"
              onClick={() => void handleExport("excel")}
              disabled={!exportActivityId || !exportAttendanceDate || isExporting !== null}
              className="rounded-[30px] border border-cyan-200 bg-cyan-50/80 p-5 text-left transition hover:-translate-y-1 hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-70"
            >
              <p className="mb-2 font-[family:var(--font-heading)] text-2xl font-bold text-ink">
                Excel
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Descarga el registro diario del evento y una hoja de fichas con evidencias.
              </p>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={!exportActivityId || !exportAttendanceDate || isExporting !== null}
              className="rounded-[30px] border border-rose-200 bg-rose-50/80 p-5 text-left transition hover:-translate-y-1 hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-70"
            >
              <p className="mb-2 font-[family:var(--font-heading)] text-2xl font-bold text-ink">
                PDF
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Genera el acta diaria imprimible del evento y la fecha seleccionados.
              </p>
            </button>
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

function buildAttendanceDateOptions(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const output: string[] = [];

  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    output.push(cursor.toISOString().slice(0, 10));
  }

  return output;
}

function resolvePreferredExportDate(options: string[]) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayValue = today.toISOString().slice(0, 10);
  return options.includes(todayValue) ? todayValue : options[0] ?? "";
}

function formatAttendanceDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}
