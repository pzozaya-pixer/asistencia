"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createQrSession,
  searchAttendees,
  type AttendeeLookupResult,
  type QrSessionResponse
} from "@/lib/auth";
import { formatLookupValue } from "@/lib/utils";

import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export default function AttendeePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSession, setQrSession] = useState<QrSessionResponse | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      const trimmedQuery = deferredQuery.trim();

      if (trimmedQuery.length > 0 && trimmedQuery.length < 5) {
        setIsLoading(false);
        setError(null);
        setResults([]);
        setSelectedAttendeeId(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextResults = await searchAttendees(trimmedQuery);

        if (cancelled) {
          return;
        }

        setResults(nextResults);
        setSelectedAttendeeId((current) => {
          if (current && nextResults.some((attendee) => attendee.id === current)) {
            return current;
          }

          return nextResults[0]?.id ?? null;
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setResults([]);
        setSelectedAttendeeId(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la búsqueda."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  const selectedAttendee = useMemo(
    () => results.find((attendee) => attendee.id === selectedAttendeeId) ?? results[0] ?? null,
    [results, selectedAttendeeId]
  );

  useEffect(() => {
    const nextActivityId =
      selectedAttendee?.activities.find((activity) => activity.estado === "activa")?.id ??
      selectedAttendee?.activities[0]?.id ??
      null;

    setSelectedActivityId(nextActivityId);
    setQrSession(null);
    setQrImageUrl(null);
    setSecondsLeft(0);
  }, [selectedAttendee?.id]);

  useEffect(() => {
    if (!qrSession) {
      return;
    }

    const currentSession = qrSession;
    let cancelled = false;

    async function renderQr() {
      try {
        const nextImageUrl = await QRCode.toDataURL(currentSession.token, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: {
            dark: "#0f172a",
            light: "#ffffff"
          }
        });

        if (!cancelled) {
          setQrImageUrl(nextImageUrl);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo renderizar el QR temporal.");
          setQrImageUrl(null);
        }
      }
    }

    void renderQr();

    return () => {
      cancelled = true;
    };
  }, [qrSession]);

  useEffect(() => {
    if (!qrSession) {
      return;
    }

    const currentSession = qrSession;

    function syncCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(currentSession.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    }

    syncCountdown();
    const interval = window.setInterval(syncCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [qrSession]);

  const selectedActivity =
    selectedAttendee?.activities.find((activity) => activity.id === selectedActivityId) ?? null;

  async function handleGenerateQr() {
    if (!selectedAttendee || !selectedActivity) {
      setError("Selecciona un asistente y una actividad antes de generar el QR.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setQrSession(null);
    setQrImageUrl(null);

    try {
      const nextQrSession = await createQrSession({
        attendeeId: selectedAttendee.id,
        activityId: selectedActivity.id
      });

      setQrSession(nextQrSession);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar el QR temporal."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Flujo asistente"
        title="Búsqueda y emisión QR"
        description="Demo segura: la vista nunca expone un código real ni datos sensibles completos."
      />

      <SectionCard
        title="Buscar por DNI o teléfono"
        description="La búsqueda consulta asistentes reales del entorno y prepara el siguiente paso de QR temporal."
      >
        <div className="space-y-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Ej. 12345678A o 600123456"
          />
          {error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {!isLoading &&
          !error &&
          deferredQuery.trim().length > 0 &&
          deferredQuery.trim().length < 5 ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Escribe al menos 5 caracteres para buscar por DNI o teléfono.
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Cargando asistentes...
                </div>
              ) : null}
              {results.map((attendee) => (
                <button
                  key={attendee.id}
                  type="button"
                  onClick={() => setSelectedAttendeeId(attendee.id)}
                  className="w-full rounded-[28px] border border-slate-200/70 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">
                      {attendee.nombre} {attendee.apellidos}
                    </p>
                    <StatusBadge tone="success">Disponible</StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">
                    DNI {formatLookupValue(attendee.dniNie)} · Tel.{" "}
                    {formatLookupValue(attendee.telefono ?? "s/d")}
                  </p>
                </button>
              ))}
              {!isLoading && results.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  No hay coincidencias en la base actual.
                </div>
              ) : null}
            </div>

              <div className="rounded-[32px] border border-slate-200/70 bg-slate-950 p-5 text-white shadow-panel">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                    Credencial temporal
                  </p>
                  <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold">
                    QR firmado de acceso
                  </h2>
                </div>
                <StatusBadge tone={secondsLeft > 0 ? "success" : "warning"}>
                  {secondsLeft > 0 ? `${secondsLeft}s` : "Pendiente"}
                </StatusBadge>
              </div>

              {selectedAttendee ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-lg font-semibold">
                      {selectedAttendee.nombre} {selectedAttendee.apellidos}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {selectedAttendee.actividad
                        ? `Actividad actual: ${selectedAttendee.actividad}`
                        : "Sin actividad asociada en la demo actual"}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Actividad de acceso</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Selecciona la actividad sobre la que se emitirá el QR temporal.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {selectedAttendee.activities.map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => {
                            setSelectedActivityId(activity.id);
                            setQrSession(null);
                            setQrImageUrl(null);
                            setSecondsLeft(0);
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            activity.id === selectedActivityId
                              ? "border-cyan-200 bg-cyan-300/15 text-white"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-200/40"
                          }`}
                        >
                          <p className="font-semibold">
                            {activity.codigo} · {activity.nombre}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            Estado {activity.estado}
                          </p>
                        </button>
                      ))}
                    </div>
                    {selectedAttendee.activities.length === 0 ? (
                      <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                        Este asistente no tiene actividades asociadas para emitir QR.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    disabled={isGenerating || !selectedActivity}
                    className="flex w-full items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGenerating ? "Generando QR temporal..." : "Generar QR temporal"}
                  </button>

                  <div className="mx-auto flex aspect-square max-w-[320px] items-center justify-center rounded-[32px] border border-dashed border-cyan-200/30 bg-white p-5 text-slate-900">
                    {qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrImageUrl}
                        alt="QR temporal de acceso"
                        className="h-full w-full rounded-[24px] object-contain"
                      />
                    ) : (
                      <div className="space-y-2 text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          Aún no se ha emitido ningún QR
                        </p>
                        <p className="text-xs text-slate-500">
                          Genera una credencial temporal segura desde backend.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-cyan-200/15 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                    {qrSession && selectedActivity
                      ? `QR emitido para ${selectedActivity.codigo} con expiración a las ${new Date(
                          qrSession.expiresAt
                        ).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}. El token no expone datos personales visibles.`
                      : "El QR se emite como token firmado de vida corta y queda persistido en PostgreSQL para su consumo posterior."}
                  </div>
                  <Link
                    href={
                      selectedActivity
                        ? `/validacion?asistenteId=${selectedAttendee.id}`
                        : "/validacion"
                    }
                    className="flex w-full items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    Pasar a validación manual
                  </Link>
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/20 p-8 text-sm text-slate-300">
                  Selecciona un asistente para generar el placeholder.
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
