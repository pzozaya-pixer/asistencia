"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  consumeQrAttendance,
  createAttendanceRecord,
  resolveQrSession,
  searchAttendees,
  type AttendeeLookupResult,
  type ResolvedQrSession
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
  const [isResolvingQr, setIsResolvingQr] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [qrTokenInput, setQrTokenInput] = useState("");
  const [resolvedQrSession, setResolvedQrSession] = useState<ResolvedQrSession | null>(null);
  const scannerRef = useRef<{
    isScanning: boolean;
    start: (
      cameraConfig: { facingMode?: string } | string,
      configuration: {
        fps?: number;
        qrbox?:
          | number
          | {
              width: number;
              height: number;
            };
        aspectRatio?: number;
      },
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ) => Promise<null>;
    stop: () => Promise<void>;
    clear: () => Promise<void>;
  } | null>(null);

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
      setResolvedQrSession(null);
      setValidationMessage(null);
    }
  }, [attendeeId]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (!scanner?.isScanning) {
        return;
      }

      void scanner.stop().finally(() => {
        void scanner.clear();
      });
    };
  }, []);

  const selectedAttendee = useMemo(
    () =>
      attendees.find((attendee) => attendee.id === selectedAttendeeId) ?? attendees[0] ?? null,
    [attendees, selectedAttendeeId]
  );

  const attendeeName = selectedAttendee
    ? `${selectedAttendee.nombre} ${selectedAttendee.apellidos}`
    : "Sin asistente seleccionado";
  const attendeeInitials = selectedAttendee
    ? `${selectedAttendee.nombre.charAt(0)}${selectedAttendee.apellidos.charAt(0)}`
    : "SA";

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (!scanner?.isScanning) {
      setIsScannerActive(false);
      return;
    }

    await scanner.stop();
    await scanner.clear();
    setIsScannerActive(false);
  }

  async function applyResolvedQrToken(tokenValue: string) {
    const normalizedToken = tokenValue.trim();

    if (!normalizedToken) {
      setScannerError("Pega o escanea un token QR válido.");
      return;
    }

    setIsResolvingQr(true);
    setError(null);
    setScannerError(null);
    setValidationMessage(null);

    try {
      const session = await resolveQrSession(normalizedToken);
      setResolvedQrSession(session);
      setSelectedAttendeeId(session.attendee.id);
      setQrTokenInput(normalizedToken);
    } catch (resolveError) {
      setResolvedQrSession(null);
      setScannerError(
        resolveError instanceof Error
          ? resolveError.message
          : "No se pudo validar el contenido del QR."
      );
    } finally {
      setIsResolvingQr(false);
    }
  }

  async function startScanner() {
    setScannerError(null);
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1
        },
        (decodedText) => {
          void stopScanner();
          void applyResolvedQrToken(decodedText);
        }
      );

      setIsScannerActive(true);
    } catch (scanError) {
      setIsScannerActive(false);
      setScannerError(
        scanError instanceof Error
          ? scanError.message
          : "No se pudo iniciar la cámara para escanear el QR."
      );
    }
  }

  async function handleValidate() {
    setIsSubmitting(true);
    setError(null);
    setValidationMessage(null);

    try {
      const record = resolvedQrSession
        ? await consumeQrAttendance({
            token: resolvedQrSession.token,
            observaciones: "Validación por escaneo QR desde panel responsable."
          })
        : await createAttendanceRecord({
            actividadId: selectedAttendee?.actividadId ?? "",
            asistenteId: selectedAttendee?.id ?? "",
            metodoRegistro: "manual",
            observaciones: "Validación manual desde panel responsable."
          });

      startTransition(() => {
        setValidationMessage(
          `${
            resolvedQrSession ? "QR validado" : "Validación registrada"
          } correctamente a las ${new Date(record.fechaHora).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          })}.`
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

  const canSubmitManual = Boolean(selectedAttendee?.actividadId && selectedAttendee?.id);
  const canSubmit = resolvedQrSession ? true : canSubmitManual;
  const displayActivity = resolvedQrSession
    ? `${resolvedQrSession.activity.codigo} · ${resolvedQrSession.activity.nombre}`
    : (selectedAttendee?.actividad ?? "sin asignar");

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Puesto responsable"
        title="Validación asistente"
        description="Escaneo QR o validación manual conectados a la API para registrar accesos reales del entorno."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Escáner QR"
          description="Prioriza el escaneo del QR temporal y usa el pegado manual como respaldo operativo."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isScannerActive) {
                    void stopScanner();
                    return;
                  }

                  void startScanner();
                }}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {isScannerActive ? "Detener cámara" : "Abrir cámara QR"}
              </button>
              <button
                type="button"
                onClick={() => void applyResolvedQrToken(qrTokenInput)}
                disabled={isResolvingQr || qrTokenInput.trim().length === 0}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResolvingQr ? "Verificando QR..." : "Validar token pegado"}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-4 text-white">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-semibold">Lector de cámara</p>
                  <StatusBadge tone={isScannerActive ? "success" : "warning"}>
                    {isScannerActive ? "Activo" : "En espera"}
                  </StatusBadge>
                </div>
                <div
                  id="qr-reader"
                  className="min-h-[260px] rounded-[24px] border border-dashed border-white/20 bg-white/5"
                />
              </div>

              <div className="space-y-3 rounded-[28px] border border-slate-200/70 bg-white/80 p-4">
                <p className="font-semibold text-ink">Respaldo manual</p>
                <p className="text-sm text-slate-500">
                  Si la cámara falla, pega aquí el contenido íntegro del QR temporal.
                </p>
                <textarea
                  value={qrTokenInput}
                  onChange={(event) => setQrTokenInput(event.target.value)}
                  rows={7}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-signal"
                />
                {scannerError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {scannerError}
                  </div>
                ) : null}
              </div>
            </div>

            {resolvedQrSession ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                QR válido para {resolvedQrSession.attendee.nombre}{" "}
                {resolvedQrSession.attendee.apellidos} en{" "}
                {resolvedQrSession.activity.codigo}. Caduca a las{" "}
                {new Date(resolvedQrSession.expiresAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })}.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Identidad a revisar"
          description="Selecciona un asistente real o deja que el QR posicione la ficha antes de autorizar el acceso."
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
                      setResolvedQrSession(null);
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
                      <StatusBadge tone={resolvedQrSession?.attendee.id === attendee.id ? "success" : "warning"}>
                        {resolvedQrSession?.attendee.id === attendee.id ? "QR listo" : "Revisión"}
                      </StatusBadge>
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
                      DNI {resolvedQrSession?.attendee.dniNie ?? selectedAttendee.dniNie} · Actividad{" "}
                      {displayActivity}
                    </p>
                  </div>
                  <StatusBadge tone={resolvedQrSession ? "success" : "warning"}>
                    {resolvedQrSession ? "Escaneo QR" : "Revisión manual"}
                  </StatusBadge>
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
      </div>

      <SectionCard
        title="Checklist"
        description="Secuencia de decisión operativa antes de registrar la validación manual o por QR."
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
            disabled={isSubmitting || isLoading || !canSubmit}
            className="w-full rounded-full bg-ink px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? "Registrando validación..."
              : resolvedQrSession
                ? "Confirmar acceso por QR"
                : "Confirmar validación manual"}
          </button>

          <div
            className={`rounded-[28px] border p-4 text-sm ${
              validationMessage
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {validationMessage ??
              (resolvedQrSession
                ? "QR validado y pendiente únicamente de confirmación final del responsable."
                : "Pendiente de validación manual por responsable. Al confirmar se registra en backend.")}
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
