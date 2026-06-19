"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  createAttendanceRecord,
  searchAttendees,
  type AttendeeLookupResult
} from "@/lib/auth";
import { formatLookupValue } from "@/lib/utils";

import { PageHeader } from "@/components/page-header";
import { PlaceholderMedia } from "@/components/placeholder-media";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

const checklist = [
  "Coincidencia con listado de acceso.",
  "Documento validado visualmente.",
  "Firma comparada con el registro.",
  "Incidencias previas revisadas."
];

export default function ValidationPage() {
  const searchParams = useSearchParams();
  const attendeeId = searchParams.get("asistenteId");

  const [attendees, setAttendees] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(attendeeId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendees() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAttendees = await searchAttendees("");

        if (cancelled) {
          return;
        }

        setAttendees(nextAttendees);
        setSelectedAttendeeId((current) => {
          if (current && nextAttendees.some((attendee) => attendee.id === current)) {
            return current;
          }

          return nextAttendees[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la cola de validación."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAttendees();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (attendeeId) {
      setSelectedAttendeeId(attendeeId);
      setValidationMessage(null);
    }
  }, [attendeeId]);

  const selectedAttendee = useMemo(
    () =>
      attendees.find((attendee) => attendee.id === selectedAttendeeId) ?? attendees[0] ?? null,
    [attendees, selectedAttendeeId]
  );

  async function handleValidate() {
    if (!selectedAttendee?.actividadId) {
      setError("El asistente no tiene una actividad asociada para registrar acceso.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationMessage(null);

    try {
      const record = await createAttendanceRecord({
        actividadId: selectedAttendee.actividadId,
        asistenteId: selectedAttendee.id,
        metodoRegistro: "manual",
        observaciones: "Validación manual desde panel responsable."
      });

      startTransition(() => {
        setValidationMessage(
          `Validación registrada correctamente a las ${new Date(record.fechaHora).toLocaleTimeString(
            "es-ES",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )}.`
        );
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar la validación."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const attendeeName = selectedAttendee
    ? `${selectedAttendee.nombre} ${selectedAttendee.apellidos}`
    : "Sin asistente seleccionado";
  const attendeeInitials = selectedAttendee
    ? `${selectedAttendee.nombre.charAt(0)}${selectedAttendee.apellidos.charAt(0)}`
    : "SA";

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Puesto responsable"
        title="Validación asistente"
        description="Validación manual conectada a la API para registrar accesos reales del entorno."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Identidad a revisar"
          description="Selecciona un asistente real y contrasta su ficha operativa antes de autorizar el acceso."
        >
          <div className="space-y-4">
            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                Cargando asistentes para validación...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!isLoading && attendees.length > 0 ? (
              <div className="grid gap-3">
                {attendees.map((attendee) => (
                  <button
                    key={attendee.id}
                    type="button"
                    onClick={() => {
                      setSelectedAttendeeId(attendee.id);
                      setValidationMessage(null);
                    }}
                    className={`rounded-[28px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-panel ${
                      attendee.id === selectedAttendee?.id
                        ? "border-signal/50 bg-cyan-50/70"
                        : "border-slate-200/70 bg-white/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">
                          {attendee.nombre} {attendee.apellidos}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          DNI {formatLookupValue(attendee.dniNie)} · Tel.{" "}
                          {formatLookupValue(attendee.telefono ?? "s/d")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {attendee.actividad ?? "Sin actividad asignada"}
                        </p>
                      </div>
                      <StatusBadge tone="warning">Revisión manual</StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {!isLoading && attendees.length === 0 && !error ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                No hay asistentes disponibles en la base actual.
              </div>
            ) : null}

            {selectedAttendee ? (
              <>
                <div className="flex items-start justify-between gap-3 rounded-[28px] border border-slate-200/70 bg-white/80 p-4">
                  <div>
                    <p className="font-semibold text-ink">{attendeeName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      DNI {selectedAttendee.dniNie} · Actividad{" "}
                      {selectedAttendee.actividad ?? "sin asignar"}
                    </p>
                  </div>
                  <StatusBadge tone="warning">Revisión manual</StatusBadge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[30px] border border-cyan-200 bg-cyan-50/70 p-4">
                    <div className="mb-4">
                      <p className="font-semibold text-ink">Foto registrada</p>
                      <p className="text-sm text-slate-500">
                        Reserva segura conectada a la ficha del asistente
                      </p>
                    </div>
                    <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/75 text-center">
                      <div>
                        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-bold text-white">
                          {attendeeInitials}
                        </div>
                        <p className="text-sm text-slate-500">Placeholder seguro</p>
                      </div>
                    </div>
                  </div>
                  <PlaceholderMedia
                    title="Firma registrada"
                    subtitle="Reserva para firma digital"
                    tone="coral"
                  />
                </div>
              </>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Checklist"
          description="Secuencia de decisión operativa antes de registrar la validación manual."
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal/10 font-semibold text-signal">
                    OK
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleValidate}
              disabled={isSubmitting || isLoading || !selectedAttendee}
              className="w-full rounded-full bg-ink px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Registrando validación..." : "Confirmar validación manual"}
            </button>

            <div
              className={`rounded-[28px] border p-4 text-sm ${
                validationMessage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {validationMessage ??
                "Pendiente de validación manual por responsable. Al confirmar se registra en backend."}
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
