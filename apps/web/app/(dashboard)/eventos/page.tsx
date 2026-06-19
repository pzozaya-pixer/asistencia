"use client";

import { useEffect, useState } from "react";

import {
  createActivity,
  fetchActivities,
  fetchResponsables,
  getStoredUser,
  updateActivity,
  type ActivityRecord,
  type ManagedUser,
  type SessionUser
} from "@/lib/auth";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

const statusLabels: Record<ActivityRecord["estado"], string> = {
  borrador: "Borrador",
  activa: "Activa",
  finalizada: "Finalizada",
  cancelada: "Cancelada"
};

const initialForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  ubicacion: "",
  aforo: "",
  estado: "borrador" as ActivityRecord["estado"],
  responsableUserId: ""
};

export default function ActivitiesPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [responsables, setResponsables] = useState<ManagedUser[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSessionUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!sessionUser || sessionUser.role === "operador_lectura") {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [nextActivities, nextResponsables] = await Promise.all([
          fetchActivities(),
          fetchResponsables()
        ]);

        if (cancelled) {
          return;
        }

        setActivities(nextActivities);
        setResponsables(nextResponsables);
        setSelectedActivityId((current) => current ?? nextActivities[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el mantenimiento de eventos."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  useEffect(() => {
    if (!selectedActivityId) {
      setForm({
        ...initialForm,
        responsableUserId:
          sessionUser?.role === "responsable" ? sessionUser.id : initialForm.responsableUserId
      });
      return;
    }

    const selectedActivity = activities.find((entry) => entry.id === selectedActivityId);

    if (!selectedActivity) {
      return;
    }

    setForm({
      codigo: selectedActivity.codigo,
      nombre: selectedActivity.nombre,
      descripcion: selectedActivity.descripcion ?? "",
      fechaInicio: toDateTimeInputValue(selectedActivity.fechaInicio),
      fechaFin: toDateTimeInputValue(selectedActivity.fechaFin),
      ubicacion: selectedActivity.ubicacion ?? "",
      aforo: selectedActivity.aforo ? String(selectedActivity.aforo) : "",
      estado: selectedActivity.estado,
      responsableUserId:
        selectedActivity.responsableUserId ??
        (sessionUser?.role === "responsable" ? sessionUser.id : "")
    });
  }, [activities, selectedActivityId, sessionUser]);

  function resetForCreate() {
    setSelectedActivityId(null);
    setForm({
      ...initialForm,
      responsableUserId: sessionUser?.role === "responsable" ? sessionUser.id : ""
    });
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        ubicacion: form.ubicacion.trim() || undefined,
        aforo: form.aforo ? Number(form.aforo) : undefined,
        estado: form.estado,
        responsableUserId: form.responsableUserId || undefined
      };

      if (selectedActivityId) {
        const updatedActivity = await updateActivity(selectedActivityId, payload);
        const responsableNombre =
          responsables.find((entry) => entry.id === (payload.responsableUserId ?? ""))?.fullName ??
          activities.find((entry) => entry.id === selectedActivityId)?.responsableNombre ??
          null;

        setActivities((current) =>
          current.map((entry) =>
            entry.id === updatedActivity.id
              ? {
                  ...updatedActivity,
                  responsableNombre,
                  responsableUserId: payload.responsableUserId ?? null
                }
              : entry
          )
        );
        setNotice("Evento actualizado.");
      } else {
        const createdActivity = await createActivity(payload);
        const responsableNombre =
          responsables.find((entry) => entry.id === (payload.responsableUserId ?? ""))?.fullName ??
          (sessionUser?.role === "responsable" ? sessionUser.fullName : null);

        const nextActivity = {
          ...createdActivity,
          responsableNombre,
          responsableUserId: payload.responsableUserId ?? null
        };

        setActivities((current) =>
          [nextActivity, ...current].sort(
            (left, right) =>
              new Date(left.fechaInicio).getTime() - new Date(right.fechaInicio).getTime()
          )
        );
        setSelectedActivityId(nextActivity.id);
        setNotice("Evento creado.");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el evento."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (sessionUser && sessionUser.role === "operador_lectura") {
    return (
      <main className="space-y-6">
        <PageHeader
          overline="Operativa"
          title="Mantenimiento de eventos"
          description="Este módulo está disponible para responsables y super administradores."
        />
        <SectionCard
          title="Acceso restringido"
          description="Tu sesión puede consultar el dashboard y seguir validando accesos."
        >
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            No tienes permisos para administrar eventos.
          </div>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Operativa"
        title="Mantenimiento de eventos"
        description="Gestiona actividades, fechas, estado operativo y responsable asignado."
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Agenda de actividades"
          description="Selecciona un evento para editarlo o crea uno nuevo."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{activities.length} eventos cargados</p>
            <button
              type="button"
              onClick={resetForCreate}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
            >
              Nuevo evento
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Cargando eventos...
              </div>
            ) : null}

            {!isLoading &&
              activities.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedActivityId(entry.id);
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full rounded-[28px] border border-slate-200/70 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{entry.nombre}</p>
                    <StatusBadge tone={entry.estado === "activa" ? "success" : "info"}>
                      {statusLabels[entry.estado]}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">{entry.codigo}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateRange(entry.fechaInicio, entry.fechaFin)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.ubicacion ?? "Ubicación pendiente"}
                    {entry.responsableNombre ? ` · ${entry.responsableNombre}` : ""}
                  </p>
                </button>
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedActivityId ? "Editar evento" : "Alta de evento"}
          description="Una actividad nueva puede nacer en borrador o quedar activa directamente."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Código</span>
                <input
                  value={form.codigo}
                  onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Nombre</span>
                <input
                  value={form.nombre}
                  onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Fecha inicio</span>
                <input
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fechaInicio: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Fecha fin</span>
                <input
                  type="datetime-local"
                  value={form.fechaFin}
                  onChange={(event) => setForm((current) => ({ ...current, fechaFin: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Ubicación</span>
                <input
                  value={form.ubicacion}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ubicacion: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Aforo</span>
                <input
                  type="number"
                  min={1}
                  value={form.aforo}
                  onChange={(event) => setForm((current) => ({ ...current, aforo: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Estado</span>
                <select
                  value={form.estado}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estado: event.target.value as ActivityRecord["estado"]
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                >
                  <option value="borrador">Borrador</option>
                  <option value="activa">Activa</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Responsable</span>
                <select
                  value={form.responsableUserId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsableUserId: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  disabled={sessionUser?.role === "responsable"}
                >
                  <option value="">Sin asignar</option>
                  {responsables.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              <span>Descripción</span>
              <textarea
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
              />
            </label>

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-[24px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                {notice}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Guardando..." : selectedActivityId ? "Guardar cambios" : "Crear evento"}
              </button>
              <button
                type="button"
                onClick={resetForCreate}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
              >
                Limpiar
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
    </main>
  );
}

function toDateTimeInputValue(isoValue: string) {
  const date = new Date(isoValue);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}
