"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchActivities,
  fetchActivityAttendees,
  fetchProtectedAsset,
  getStoredUser,
  type ActivityAttendeeRecord,
  type ActivityRecord,
  type SessionUser
} from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

type PhotoMap = Record<string, string | null>;

export default function ReportsPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [attendees, setAttendees] = useState<ActivityAttendeeRecord[]>([]);
  const [photoUrls, setPhotoUrls] = useState<PhotoMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionUser(getStoredUser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const nextActivities = await fetchActivities();

        if (!cancelled) {
          setActivities(nextActivities);
          setSelectedActivityId(nextActivities[0]?.id ?? "");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los informes."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedActivityId) {
      setAttendees([]);
      setPhotoUrls({});
      return;
    }

    let cancelled = false;

    async function loadAttendees() {
      setIsLoadingAttendees(true);
      setError(null);

      try {
        const nextAttendees = await fetchActivityAttendees(selectedActivityId);

        if (!cancelled) {
          setAttendees(nextAttendees);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los asistentes para el informe."
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
  }, [selectedActivityId]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadPhotos() {
      const nextPhotoUrls: PhotoMap = {};

      await Promise.all(
        attendees.map(async (attendee) => {
          if (!attendee.hasPhoto) {
            nextPhotoUrls[attendee.attendeeId] = null;
            return;
          }

          try {
            const blob = await fetchProtectedAsset(`/api/attendees/${attendee.attendeeId}/photo`);
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            nextPhotoUrls[attendee.attendeeId] = objectUrl;
          } catch {
            nextPhotoUrls[attendee.attendeeId] = null;
          }
        })
      );

      if (!cancelled) {
        setPhotoUrls(nextPhotoUrls);
      } else {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    }

    if (attendees.length > 0) {
      void loadPhotos();
    } else {
      setPhotoUrls({});
    }

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attendees]);

  const selectedActivity =
    activities.find((activity) => activity.id === selectedActivityId) ?? null;

  const sortedAttendees = useMemo(
    () =>
      [...attendees].sort((left, right) =>
        `${left.apellidos} ${left.nombre}`.localeCompare(
          `${right.apellidos} ${right.nombre}`,
          "es"
        )
      ),
    [attendees]
  );

  function handlePrint() {
    window.print();
  }

  return (
    <main className="space-y-6">
      <div className="report-controls no-print space-y-6">
        <PageHeader
          overline="Operativa"
          title="Informes de asistencia"
          description="Genera un acta imprimible por actividad con foto, datos de contacto, cuadro de firma y casilla de asistencia."
        />

        <SectionCard
          title="Configuración del informe"
          description="Selecciona la actividad y genera el PDF desde la impresión del navegador."
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Actividad</span>
                <select
                  value={selectedActivityId}
                  onChange={(event) => setSelectedActivityId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                >
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.codigo} · {activity.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedActivityId || isLoadingAttendees}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Imprimir / Guardar PDF
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <section className="report-sheet report-page rounded-[40px] border border-slate-200 bg-white p-8 shadow-float">
        <header className="report-header border-b border-slate-200 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Informe de asistencia
              </p>
              <h1 className="mt-2 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950">
                Hoja de firmas por actividad
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-600">
                Documento para control presencial de asistentes con validación manual de firma y
                verificación visual.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-950">Generado:</span> {new Date().toLocaleString("es-ES")}</p>
              <p className="mt-1"><span className="font-semibold text-slate-950">Operador:</span> {sessionUser?.fullName ?? "No identificado"}</p>
            </div>
          </div>

          <div className="report-meta-strip mt-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span><span className="font-semibold text-slate-950">Actividad:</span> {selectedActivity ? `${selectedActivity.codigo} · ${selectedActivity.nombre}` : "Sin seleccionar"}</span>
            <span><span className="font-semibold text-slate-950">Ubicación:</span> {selectedActivity?.ubicacion ?? "Sin definir"}</span>
            <span><span className="font-semibold text-slate-950">Fechas:</span> {selectedActivity ? `${formatDate(selectedActivity.fechaInicio)} - ${formatDate(selectedActivity.fechaFin)}` : "-"}</span>
            <span><span className="font-semibold text-slate-950">Total asistentes:</span> {isLoading ? "Cargando..." : isLoadingAttendees ? "Actualizando..." : String(sortedAttendees.length)}</span>
          </div>
        </header>

        <div className="mt-4">
          <div className="report-table-header hidden grid-cols-[72px_minmax(220px,1.5fr)_130px_132px_52px] gap-3 rounded-[18px] bg-slate-950 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white md:grid">
            <span>Foto</span>
            <span>Asistente</span>
            <span>Teléfono</span>
            <span>Firma</span>
            <span>Asiste</span>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading || isLoadingAttendees ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Preparando informe...
              </div>
            ) : null}

            {!isLoading && !isLoadingAttendees && sortedAttendees.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Esta actividad no tiene asistentes vinculados todavía.
              </div>
            ) : null}

            {sortedAttendees.map((attendee, index) => (
              <article
                key={attendee.attendeeId}
                className="report-row report-avoid-break rounded-[26px] border border-slate-200 bg-white px-4 py-4"
              >
                <div className="mb-2 flex items-center justify-between border-b border-dashed border-slate-200 pb-2 md:hidden">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                    Registro {index + 1}
                  </p>
                  <p className="text-xs text-slate-500">{attendee.dniNie}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-[72px_minmax(220px,1.5fr)_130px_132px_52px] md:items-center">
                  <div className="mx-auto flex h-[96px] w-[72px] items-center justify-center overflow-hidden rounded-[14px] border border-slate-300 bg-slate-100">
                    {photoUrls[attendee.attendeeId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrls[attendee.attendeeId] ?? ""}
                        alt={`Foto de ${attendee.nombre} ${attendee.apellidos}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">
                          {attendee.apellidos}, {attendee.nombre}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">{attendee.dniNie}</p>
                      </div>
                      <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 md:inline-flex">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Estado inscripción:</span> {attendee.estado}</p>
                      <p className="mt-0.5"><span className="font-semibold text-slate-900">Observaciones:</span> {attendee.observaciones || "Sin observaciones"}</p>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Teléfono
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {attendee.telefono || "Sin dato"}
                    </p>
                  </div>

                  <div className="rounded-[16px] border-2 border-slate-300 bg-white p-2.5">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Firma asistente
                    </p>
                    <div className="h-[72px] rounded-[10px] border border-dashed border-slate-300 bg-slate-50" />
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Asiste
                    </p>
                    <div className="h-7 w-7 rounded-[6px] border-2 border-slate-400 bg-white" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
