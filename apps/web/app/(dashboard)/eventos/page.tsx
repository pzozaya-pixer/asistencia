"use client";

import { useEffect, useState } from "react";

import {
  createActivity,
  createActivityAttendee,
  fetchActivities,
  fetchActivityAttendees,
  fetchResponsables,
  getStoredUser,
  importActivityAttendees,
  removeActivityAttendee,
  uploadAttendeePhoto,
  updateActivity,
  updateActivityAttendee,
  type ActivityAttendeeRecord,
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

const attendeeStateLabels: Record<ActivityAttendeeRecord["estado"], string> = {
  inscrito: "Inscrito",
  confirmado: "Confirmado",
  asistido: "Asistido",
  ausente: "Ausente",
  cancelado: "Cancelado",
  incidencia: "Incidencia"
};

const initialActivityForm = {
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

const initialAttendeeForm = {
  dniNie: "",
  nombre: "",
  apellidos: "",
  telefono: "",
  email: "",
  estado: "confirmado" as ActivityAttendeeRecord["estado"],
  observaciones: ""
};

export default function ActivitiesPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [responsables, setResponsables] = useState<ManagedUser[]>([]);
  const [attendees, setAttendees] = useState<ActivityAttendeeRecord[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState(initialActivityForm);
  const [attendeeForm, setAttendeeForm] = useState(initialAttendeeForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isSavingAttendee, setIsSavingAttendee] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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
      setActivityForm({
        ...initialActivityForm,
        responsableUserId:
          sessionUser?.role === "responsable" ? sessionUser.id : initialActivityForm.responsableUserId
      });
      setAttendees([]);
      return;
    }

    const activityId = selectedActivityId;
    const selectedActivity = activities.find((entry) => entry.id === selectedActivityId);

    if (selectedActivity) {
      setActivityForm({
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
    }

    let cancelled = false;

    async function loadAttendees() {
      setIsLoadingAttendees(true);

      try {
        const nextAttendees = await fetchActivityAttendees(activityId);

        if (!cancelled) {
          setAttendees(nextAttendees);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los asistentes del evento."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttendees(false);
        }
      }
    }

    void loadAttendees();

    return () => {
      cancelled = true;
    };
  }, [activities, selectedActivityId, sessionUser]);

  function resetForCreate() {
    setSelectedActivityId(null);
    setActivityForm({
      ...initialActivityForm,
      responsableUserId: sessionUser?.role === "responsable" ? sessionUser.id : ""
    });
    setAttendeeForm(initialAttendeeForm);
    setError(null);
    setNotice(null);
  }

  async function handleActivitySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingActivity(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        codigo: activityForm.codigo.trim(),
        nombre: activityForm.nombre.trim(),
        descripcion: activityForm.descripcion.trim() || undefined,
        fechaInicio: new Date(activityForm.fechaInicio).toISOString(),
        fechaFin: new Date(activityForm.fechaFin).toISOString(),
        ubicacion: activityForm.ubicacion.trim() || undefined,
        aforo: activityForm.aforo ? Number(activityForm.aforo) : undefined,
        estado: activityForm.estado,
        responsableUserId: activityForm.responsableUserId || undefined
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
      setIsSavingActivity(false);
    }
  }

  async function handleAttendeeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedActivityId) {
      setError("Primero selecciona o crea un evento.");
      return;
    }

    setIsSavingAttendee(true);
    setError(null);
    setNotice(null);

    try {
      const nextAttendee = await createActivityAttendee(selectedActivityId, {
        dniNie: attendeeForm.dniNie,
        nombre: attendeeForm.nombre,
        apellidos: attendeeForm.apellidos,
        telefono: attendeeForm.telefono || undefined,
        email: attendeeForm.email || undefined,
        estado: attendeeForm.estado,
        observaciones: attendeeForm.observaciones || undefined
      });

      setAttendees((current) =>
        [nextAttendee, ...current.filter((entry) => entry.attendeeId !== nextAttendee.attendeeId)].sort(
          (left, right) =>
            `${left.apellidos} ${left.nombre}`.localeCompare(
              `${right.apellidos} ${right.nombre}`,
              "es"
            )
        )
      );
      setAttendeeForm(initialAttendeeForm);
      setNotice("Asistente vinculado al evento.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el asistente."
      );
    } finally {
      setIsSavingAttendee(false);
    }
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedActivityId) {
      return;
    }

    setIsImporting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await importActivityAttendees(selectedActivityId, file);
      const nextAttendees = await fetchActivityAttendees(selectedActivityId);
      setAttendees(nextAttendees);

      const summary = [
        `${result.created} creados`,
        `${result.updated} actualizados`,
        `${result.linked} vinculados`
      ].join(" · ");

      setNotice(
        result.errors.length > 0
          ? `${summary}. Incidencias: ${result.errors.join(" | ")}`
          : `${summary}. Importación completada.`
      );
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "No se pudo importar el archivo."
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  async function handleAttendeeStateChange(
    attendeeId: string,
    estado: ActivityAttendeeRecord["estado"]
  ) {
    if (!selectedActivityId) {
      return;
    }

    try {
      const updated = await updateActivityAttendee(selectedActivityId, attendeeId, { estado });
      setAttendees((current) =>
        current.map((entry) => (entry.attendeeId === attendeeId ? updated : entry))
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el estado del asistente."
      );
    }
  }

  async function handleRemoveAttendee(attendeeId: string) {
    if (!selectedActivityId) {
      return;
    }

    try {
      await removeActivityAttendee(selectedActivityId, attendeeId);
      setAttendees((current) => current.filter((entry) => entry.attendeeId !== attendeeId));
      setNotice("Asistente retirado del evento.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo quitar el asistente del evento."
      );
    }
  }

  async function handlePhotoChange(
    attendeeId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await uploadAttendeePhoto(attendeeId, file);
      setAttendees((current) =>
        current.map((entry) =>
          entry.attendeeId === attendeeId ? { ...entry, hasPhoto: true } : entry
        )
      );
      setNotice("Fotografía subida a MinIO y vinculada al asistente.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la fotografía."
      );
    } finally {
      event.target.value = "";
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
        description="Gestiona el evento y sus asistentes, con carga manual o importación desde Excel."
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
          description="El responsable puede preparar el evento y después gestionar asistentes en el mismo panel."
        >
          <form className="space-y-4" onSubmit={handleActivitySubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Código"
                value={activityForm.codigo}
                onChange={(value) => setActivityForm((current) => ({ ...current, codigo: value }))}
                required
              />
              <Field
                label="Nombre"
                value={activityForm.nombre}
                onChange={(value) => setActivityForm((current) => ({ ...current, nombre: value }))}
                required
              />
              <Field
                label="Fecha inicio"
                type="datetime-local"
                value={activityForm.fechaInicio}
                onChange={(value) =>
                  setActivityForm((current) => ({ ...current, fechaInicio: value }))
                }
                required
              />
              <Field
                label="Fecha fin"
                type="datetime-local"
                value={activityForm.fechaFin}
                onChange={(value) =>
                  setActivityForm((current) => ({ ...current, fechaFin: value }))
                }
                required
              />
              <Field
                label="Ubicación"
                value={activityForm.ubicacion}
                onChange={(value) =>
                  setActivityForm((current) => ({ ...current, ubicacion: value }))
                }
              />
              <Field
                label="Aforo"
                type="number"
                value={activityForm.aforo}
                onChange={(value) => setActivityForm((current) => ({ ...current, aforo: value }))}
              />
              <SelectField
                label="Estado"
                value={activityForm.estado}
                onChange={(value) =>
                  setActivityForm((current) => ({
                    ...current,
                    estado: value as ActivityRecord["estado"]
                  }))
                }
                options={[
                  { value: "borrador", label: "Borrador" },
                  { value: "activa", label: "Activa" },
                  { value: "finalizada", label: "Finalizada" },
                  { value: "cancelada", label: "Cancelada" }
                ]}
              />
              <SelectField
                label="Responsable"
                value={activityForm.responsableUserId}
                onChange={(value) =>
                  setActivityForm((current) => ({ ...current, responsableUserId: value }))
                }
                disabled={sessionUser?.role === "responsable"}
                options={[
                  { value: "", label: "Sin asignar" },
                  ...responsables.map((entry) => ({ value: entry.id, label: entry.fullName }))
                ]}
              />
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              <span>Descripción</span>
              <textarea
                value={activityForm.descripcion}
                onChange={(event) =>
                  setActivityForm((current) => ({ ...current, descripcion: event.target.value }))
                }
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
                disabled={isSavingActivity}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingActivity
                  ? "Guardando..."
                  : selectedActivityId
                    ? "Guardar cambios"
                    : "Crear evento"}
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

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          title="Alta e importación de asistentes"
          description="Añade uno a uno o importa una hoja Excel con columnas DNI/NIE, nombre y apellidos."
        >
          <form className="space-y-4" onSubmit={handleAttendeeSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="DNI/NIE"
                value={attendeeForm.dniNie}
                onChange={(value) => setAttendeeForm((current) => ({ ...current, dniNie: value }))}
                required
              />
              <SelectField
                label="Estado"
                value={attendeeForm.estado}
                onChange={(value) =>
                  setAttendeeForm((current) => ({
                    ...current,
                    estado: value as ActivityAttendeeRecord["estado"]
                  }))
                }
                options={Object.entries(attendeeStateLabels).map(([value, label]) => ({
                  value,
                  label
                }))}
              />
              <Field
                label="Nombre"
                value={attendeeForm.nombre}
                onChange={(value) => setAttendeeForm((current) => ({ ...current, nombre: value }))}
                required
              />
              <Field
                label="Apellidos"
                value={attendeeForm.apellidos}
                onChange={(value) =>
                  setAttendeeForm((current) => ({ ...current, apellidos: value }))
                }
                required
              />
              <Field
                label="Teléfono"
                value={attendeeForm.telefono}
                onChange={(value) =>
                  setAttendeeForm((current) => ({ ...current, telefono: value }))
                }
              />
              <Field
                label="Email"
                type="email"
                value={attendeeForm.email}
                onChange={(value) => setAttendeeForm((current) => ({ ...current, email: value }))}
              />
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              <span>Observaciones</span>
              <textarea
                value={attendeeForm.observaciones}
                onChange={(event) =>
                  setAttendeeForm((current) => ({
                    ...current,
                    observaciones: event.target.value
                  }))
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSavingAttendee || !selectedActivityId}
                className="rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingAttendee ? "Guardando..." : "Añadir al evento"}
              </button>
              <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={isImporting || !selectedActivityId}
                  onChange={handleImportChange}
                />
                {isImporting ? "Importando Excel..." : "Importar XLSX"}
              </label>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Plantilla mínima recomendada:
              {" "}`DNI/NIE`, `Nombre`, `Apellidos`, `Teléfono`, `Email`, `Estado`, `Observaciones`.
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Asistentes del evento"
          description={
            selectedActivityId
              ? `${attendees.length} vinculados a la actividad seleccionada.`
              : "Selecciona o crea primero un evento."
          }
        >
          <div className="space-y-3">
            {selectedActivityId && isLoadingAttendees ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Cargando asistentes...
              </div>
            ) : null}

            {!selectedActivityId ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Guarda o selecciona un evento para empezar a gestionar sus asistentes.
              </div>
            ) : null}

            {selectedActivityId && !isLoadingAttendees && attendees.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Este evento todavía no tiene asistentes vinculados.
              </div>
            ) : null}

            {selectedActivityId &&
              attendees.map((entry) => (
                <article
                  key={entry.attendeeId}
                  className="rounded-[28px] border border-slate-200/70 bg-white/80 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">
                          {entry.nombre} {entry.apellidos}
                        </p>
                        <StatusBadge
                          tone={entry.estado === "incidencia" ? "warning" : "info"}
                        >
                          {attendeeStateLabels[entry.estado]}
                        </StatusBadge>
                        {entry.attendanceStatus ? (
                          <StatusBadge tone="success">{entry.attendanceStatus}</StatusBadge>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500">
                        {entry.dniNie}
                        {entry.telefono ? ` · ${entry.telefono}` : ""}
                        {entry.email ? ` · ${entry.email}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.metodoRegistro
                          ? `Último acceso: ${entry.metodoRegistro.toUpperCase()}`
                          : "Sin acceso registrado"}
                        {entry.fechaHora ? ` · ${formatDateTime(entry.fechaHora)}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.hasPhoto ? "Foto cargada en MinIO" : "Sin fotografía subida"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={entry.estado}
                        onChange={(event) =>
                          void handleAttendeeStateChange(
                            entry.attendeeId,
                            event.target.value as ActivityAttendeeRecord["estado"]
                          )
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink outline-none transition focus:border-signal"
                      >
                        {Object.entries(attendeeStateLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAttendee(entry.attendeeId)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        Quitar
                      </button>
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => void handlePhotoChange(entry.attendeeId, event)}
                        />
                        {entry.hasPhoto ? "Cambiar foto" : "Subir foto"}
                      </label>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal disabled:cursor-not-allowed disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
