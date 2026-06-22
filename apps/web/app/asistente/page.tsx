"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createPublicQrSession,
  searchPublicAttendees,
  type AttendeeLookupResult,
  type QrSessionResponse
} from "@/lib/auth";
import { formatLookupValue } from "@/lib/utils";

const steps = [
  "Localiza tu inscripción",
  "Elige la actividad",
  "Muestra tu QR al responsable"
] as const;

export default function PublicAttendeePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSession, setQrSession] = useState<QrSessionResponse | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      const trimmedQuery = deferredQuery.trim();

      if (!trimmedQuery) {
        setIsLoading(false);
        setError(null);
        setResults([]);
        setSelectedAttendeeId(null);
        return;
      }

      if (trimmedQuery.length < 5) {
        setIsLoading(false);
        setError(null);
        setResults([]);
        setSelectedAttendeeId(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextResults = await searchPublicAttendees(trimmedQuery);

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
            : "No se pudo consultar tu inscripción."
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
          width: 360,
          color: {
            dark: "#123044",
            light: "#ffffff"
          }
        });

        if (!cancelled) {
          setQrImageUrl(nextImageUrl);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo generar tu credencial QR.");
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

  useEffect(() => {
    let cancelled = false;

    async function loadPhoto() {
      if (!selectedAttendee?.photoUrl) {
        setPhotoObjectUrl(null);
        return;
      }

      try {
        if (!cancelled) {
          setPhotoObjectUrl(selectedAttendee.photoUrl);
        }
      } catch {
        if (!cancelled) {
          setPhotoObjectUrl(null);
        }
      }
    }

    void loadPhoto();

    return () => {
      cancelled = true;
      setPhotoObjectUrl(null);
    };
  }, [selectedAttendee?.id, selectedAttendee?.photoUrl]);

  async function handleGenerateQr() {
    if (!selectedAttendee || !selectedActivity) {
      setError("Selecciona tu actividad antes de generar el código.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setQrSession(null);
    setQrImageUrl(null);

    try {
      const nextQrSession = await createPublicQrSession({
        attendeeId: selectedAttendee.id,
        activityId: selectedActivity.id
      });

      setQrSession(nextQrSession);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar tu credencial temporal."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
      <section className="overflow-hidden rounded-[36px] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,_rgba(82,174,204,0.24),_transparent_38%),linear-gradient(135deg,#f7fbff_0%,#eef8ff_42%,#fffaf2_100%)] p-5 shadow-panel sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">
              PWA asistente
            </div>
            <div className="space-y-3">
              <h1 className="font-[family:var(--font-heading)] text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Tu credencial de acceso en el móvil.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                Busca tu inscripción, elige la actividad y muestra tu código QR al llegar.
                El responsable validará tu identidad y recogerá la firma de asistencia.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-[26px] border border-white/70 bg-white/72 p-4 backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    Paso {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  Acceso temporal
                </p>
                <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold">
                  Código QR activo
                </h2>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${secondsLeft > 0 ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-300/15 text-amber-100"}`}>
                {secondsLeft > 0 ? `${secondsLeft}s` : "Sin emitir"}
              </div>
            </div>

            <div className="mt-5 rounded-[28px] bg-white p-5 text-slate-950">
              <div className="mx-auto flex aspect-square max-w-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-4">
                {qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageUrl}
                    alt="Código QR temporal de acceso"
                    className="h-full w-full rounded-[20px] object-contain"
                  />
                ) : (
                  <div className="space-y-2 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      Tu QR aparecerá aquí
                    </p>
                    <p className="text-sm text-slate-500">
                      Genera la credencial cuando estés listo para acceder.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {qrSession && selectedActivity
                ? `Código emitido para ${selectedActivity.codigo} hasta las ${new Date(
                    qrSession.expiresAt
                  ).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}.`
                : "El QR es temporal, firmado y no muestra tus datos personales en pantalla."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[34px] border border-slate-200/80 bg-white/88 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                1. Busca tu inscripción
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                DNI, NIE o teléfono
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Introduce al menos 5 caracteres para encontrar tu ficha y continuar.
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Tu documento o teléfono</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. 12345678A o 600123456"
                className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>

            {error ? (
              <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!isLoading &&
            !error &&
            deferredQuery.trim().length > 0 &&
            deferredQuery.trim().length < 5 ? (
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Escribe al menos 5 caracteres para continuar.
              </div>
            ) : null}

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  Buscando inscripciones...
                </div>
              ) : null}

              {results.map((attendee) => (
                <button
                  key={attendee.id}
                  type="button"
                  onClick={() => setSelectedAttendeeId(attendee.id)}
                  className={`w-full rounded-[26px] border p-4 text-left transition ${
                    attendee.id === selectedAttendeeId
                      ? "border-cyan-300 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-cyan-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {attendee.nombre} {attendee.apellidos}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        DNI {formatLookupValue(attendee.dniNie)} · Tel.{" "}
                        {formatLookupValue(attendee.telefono ?? "s/d")}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      Elegir
                    </span>
                  </div>
                </button>
              ))}

              {!isLoading && deferredQuery.trim().length >= 5 && results.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No encontramos ninguna coincidencia con esos datos.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-slate-200/80 bg-white/88 p-5 shadow-panel backdrop-blur sm:p-6">
          {selectedAttendee ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                  2. Revisa tus datos
                </p>
                <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                  Confirma la actividad
                </h2>
              </div>

              <div className="flex items-center gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-slate-950 text-lg font-bold text-white">
                  {photoObjectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoObjectUrl}
                      alt={`Fotografía de ${selectedAttendee.nombre} ${selectedAttendee.apellidos}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      {selectedAttendee.nombre.charAt(0)}
                      {selectedAttendee.apellidos.charAt(0)}
                    </>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {selectedAttendee.nombre} {selectedAttendee.apellidos}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Documento {formatLookupValue(selectedAttendee.dniNie)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Tus actividades disponibles</p>
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
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      activity.id === selectedActivityId
                        ? "border-cyan-300 bg-cyan-50"
                        : "border-slate-200 bg-white hover:border-cyan-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {activity.codigo} · {activity.nombre}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Estado {activity.estado}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activity.id === selectedActivityId
                            ? "bg-cyan-700 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {activity.id === selectedActivityId ? "Seleccionada" : "Elegir"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedAttendee.activities.length === 0 ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No tienes actividades disponibles para generar credencial.
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleGenerateQr}
                disabled={isGenerating || !selectedActivity}
                className="w-full rounded-full bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? "Generando tu código..." : "Generar mi QR de acceso"}
              </button>

              <div className="rounded-[24px] border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-950">
                Muestra este QR al llegar. Después el responsable comprobará tu identidad y registrará la asistencia.
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Busca tu inscripción para continuar con la generación del código.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
