"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  consumeQrAttendance,
  createAttendanceRecord,
  fetchProtectedAsset,
  resolveQrSession,
  searchAttendees,
  type AttendeeLookupResult,
  type ResolvedQrSession
} from "@/lib/auth";
import { formatLookupValue } from "@/lib/utils";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SignaturePad } from "@/components/signature-pad";
import { StatusBadge } from "@/components/status-badge";

const checklistItems = [
  { id: "listado", label: "Coincidencia con listado de acceso." },
  { id: "documento", label: "Documento validado visualmente." },
  { id: "firma", label: "Firma cotejada por responsable." },
  { id: "incidencias", label: "Incidencias previas revisadas." }
] as const;

const activityStatusLabels: Record<string, string> = {
  activa: "Activa",
  inscrito: "Inscrito",
  confirmado: "Confirmado",
  asistido: "Asistido",
  ausente: "Ausente",
  cancelado: "Cancelado",
  incidencia: "Incidencia"
};

type ChecklistState = Record<(typeof checklistItems)[number]["id"], boolean>;

type SignatureValue = {
  dataUrl: string;
  width: number;
  height: number;
};

const initialChecklistState: ChecklistState = {
  listado: false,
  documento: false,
  firma: false,
  incidencias: false
};

const MIN_MANUAL_SEARCH_LENGTH = 5;

export default function ValidationPage() {
  const searchParams = useSearchParams();
  const attendeeId = searchParams.get("asistenteId");

  const [attendees, setAttendees] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(attendeeId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingQr, setIsResolvingQr] = useState(false);
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualSearchError, setManualSearchError] = useState<string | null>(null);
  const [manualSearchMessage, setManualSearchMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [manualDniQuery, setManualDniQuery] = useState("");
  const [manualSearchResults, setManualSearchResults] = useState<AttendeeLookupResult[]>([]);
  const [qrTokenInput, setQrTokenInput] = useState("");
  const [resolvedQrSession, setResolvedQrSession] = useState<ResolvedQrSession | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>(initialChecklistState);
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
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
    if (!attendeeId) {
      return;
    }

    setSelectedAttendeeId(attendeeId);
    setResolvedQrSession(null);
    setValidationMessage(null);
    setChecklistState(initialChecklistState);
    setSignature(null);
    setSignaturePadKey((current) => current + 1);
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

  const allChecklistDone = checklistItems.every((item) => checklistState[item.id]);
  const canSubmitManual = Boolean(selectedAttendee?.actividadId && selectedAttendee?.id);
  const canSubmit = (resolvedQrSession ? true : canSubmitManual) && allChecklistDone && Boolean(signature);
  const displayActivity = resolvedQrSession
    ? `${resolvedQrSession.activity.codigo} · ${resolvedQrSession.activity.nombre}`
    : (selectedAttendee?.actividad ?? "sin asignar");
  const activityStatus = selectedAttendee?.estadoActividad
    ? activityStatusLabels[selectedAttendee.estadoActividad] ?? selectedAttendee.estadoActividad
    : "Pendiente";

  useEffect(() => {
    let cancelled = false;

    async function loadPhoto() {
      if (!selectedAttendee?.photoUrl) {
        setPhotoObjectUrl(null);
        return;
      }

      try {
        const blob = await fetchProtectedAsset(selectedAttendee.photoUrl);
        const objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPhotoObjectUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
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
      setPhotoObjectUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
    };
  }, [selectedAttendee?.id, selectedAttendee?.photoUrl]);

  function resetVisualValidation() {
    setChecklistState(initialChecklistState);
    setSignature(null);
    setSignaturePadKey((current) => current + 1);
  }

  function selectAttendeeForManual(attendee: AttendeeLookupResult) {
    setSelectedAttendeeId(attendee.id);
    setResolvedQrSession(null);
    setValidationMessage(null);
    setScannerError(null);
    setManualSearchMessage(
      `Documento localizado: ${attendee.nombre} ${attendee.apellidos}.`
    );
    resetVisualValidation();
  }

  function mergeAttendees(nextAttendees: AttendeeLookupResult[]) {
    setAttendees((current) => {
      const byId = new Map(current.map((attendee) => [attendee.id, attendee]));

      for (const attendee of nextAttendees) {
        byId.set(attendee.id, attendee);
      }

      return Array.from(byId.values()).sort((left, right) =>
        `${left.apellidos} ${left.nombre}`.localeCompare(`${right.apellidos} ${right.nombre}`, "es")
      );
    });
  }

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

  async function handleManualDniSearch() {
    const normalizedQuery = manualDniQuery.trim();

    if (normalizedQuery.length < MIN_MANUAL_SEARCH_LENGTH) {
      setManualSearchError("Introduce al menos 5 caracteres del DNI/NIE.");
      return;
    }

    setIsManualSearchLoading(true);
    setManualSearchError(null);
    setManualSearchMessage(null);
    setValidationMessage(null);

    try {
      const results = await searchAttendees(normalizedQuery);
      setManualSearchResults(results);
      mergeAttendees(results);

      if (results.length === 0) {
        setManualSearchError("No hay coincidencias para ese DNI/NIE.");
        return;
      }

      if (results.length === 1) {
        selectAttendeeForManual(results[0]);
        return;
      }

      setManualSearchMessage(`${results.length} coincidencias encontradas.`);
    } catch (searchError) {
      setManualSearchError(
        searchError instanceof Error
          ? searchError.message
          : "No se pudo buscar el documento."
      );
    } finally {
      setIsManualSearchLoading(false);
    }
  }

  async function handleValidate() {
    if (!signature) {
      setError("Debes capturar la firma antes de confirmar la asistencia.");
      return;
    }

    if (!allChecklistDone) {
      setError("Completa toda la validación visual antes de confirmar.");
      return;
    }

    if (!resolvedQrSession && (!selectedAttendee?.actividadId || !selectedAttendee.id)) {
      setError("Selecciona un asistente con actividad antes de registrar manualmente.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationMessage(null);

    try {
      const payload = {
        observaciones: resolvedQrSession
          ? "Validación por escaneo QR con firma capturada desde panel responsable."
          : `Registro manual por DNI/NIE ${selectedAttendee?.dniNie ?? ""} con firma capturada desde panel responsable.`,
        validacionVisual: true,
        firma: signature
      };

      const record = resolvedQrSession
        ? await consumeQrAttendance({
            token: resolvedQrSession.token,
            ...payload
          })
        : await createAttendanceRecord({
            actividadId: selectedAttendee?.actividadId ?? "",
            asistenteId: selectedAttendee?.id ?? "",
            metodoRegistro: "manual",
            ...payload
          });

      startTransition(() => {
        setValidationMessage(
          `${
            resolvedQrSession ? "Acceso QR confirmado" : "Validación registrada"
          } a las ${new Date(record.fechaHora).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          })} con firma asociada.`
        );
      });

      setChecklistState(initialChecklistState);
      setSignature(null);
      setSignaturePadKey((current) => current + 1);
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

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Puesto responsable"
        title="Validación asistente"
        description="Escaneo QR, búsqueda manual por DNI/NIE, validación visual y firma capturada sobre la API operativa del entorno."
      />

      <SectionCard
        title="Búsqueda manual DNI/NIE"
        description="Localiza al asistente por documento cuando el QR no está disponible."
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={manualDniQuery}
              onChange={(event) => setManualDniQuery(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleManualDniSearch();
                }
              }}
              placeholder="DNI/NIE, teléfono o nombre"
              className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-signal"
            />
            <button
              type="button"
              onClick={() => void handleManualDniSearch()}
              disabled={isManualSearchLoading || manualDniQuery.trim().length < MIN_MANUAL_SEARCH_LENGTH}
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isManualSearchLoading ? "Buscando..." : "Buscar documento"}
            </button>
          </div>

          {manualSearchError ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {manualSearchError}
            </div>
          ) : null}

          {manualSearchMessage ? (
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {manualSearchMessage}
            </div>
          ) : null}

          {manualSearchResults.length > 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {manualSearchResults.map((attendee) => (
                <button
                  key={attendee.id}
                  type="button"
                  onClick={() => selectAttendeeForManual(attendee)}
                  className="rounded-[24px] border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <p className="font-semibold text-ink">
                    {attendee.nombre} {attendee.apellidos}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    DNI {formatLookupValue(attendee.dniNie)} · {attendee.actividad ?? "Sin actividad"}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

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
                      selectAttendeeForManual(attendee);
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
                          {attendee.actividad ?? "Sin actividad asignada"} · Estado {activityStatusLabels[attendee.estadoActividad ?? ""] ?? "Pendiente"}
                        </p>
                      </div>
                      <StatusBadge
                        tone={resolvedQrSession?.attendee.id === attendee.id ? "success" : "warning"}
                      >
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
                <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {selectedAttendee.nombre} {selectedAttendee.apellidos}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        DNI {resolvedQrSession?.attendee.dniNie ?? selectedAttendee.dniNie}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Actividad {displayActivity}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={resolvedQrSession ? "success" : "warning"}>
                        {resolvedQrSession ? "Escaneo QR" : "Revisión manual"}
                      </StatusBadge>
                      <StatusBadge tone={selectedAttendee.hasPhoto ? "success" : "info"}>
                        {selectedAttendee.hasPhoto ? "Foto registrada" : "Sin foto cargada"}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                    Estado operativo del asistente: <span className="font-semibold text-ink">{activityStatus}</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-[30px] border border-cyan-200 bg-cyan-50/70 p-4">
                    <div className="mb-4">
                      <p className="font-semibold text-ink">Fotografía asistente</p>
                      <p className="text-sm text-slate-500">
                        Vista de apoyo para validación visual en punto de acceso
                      </p>
                    </div>
                    <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/75 text-center">
                      {photoObjectUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoObjectUrl}
                          alt={`Fotografía de ${selectedAttendee.nombre} ${selectedAttendee.apellidos}`}
                          className="h-full w-full rounded-[24px] object-cover"
                        />
                      ) : (
                        <div>
                          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-bold text-white">
                            {selectedAttendee.nombre.charAt(0)}
                            {selectedAttendee.apellidos.charAt(0)}
                          </div>
                          <p className="text-sm text-slate-500">
                            {selectedAttendee.hasPhoto
                              ? "No se pudo cargar la foto ahora mismo"
                              : "Pendiente de carga de fotografía"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-rose-200 bg-rose-50/70 p-4">
                    <div className="mb-4">
                      <p className="font-semibold text-ink">Firma capturada</p>
                      <p className="text-sm text-slate-500">
                        La firma se almacena junto al registro de asistencia validado.
                      </p>
                    </div>
                    <SignaturePad
                      key={signaturePadKey}
                      disabled={isSubmitting}
                      onChange={setSignature}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Checklist"
        description="Secuencia de decisión operativa antes de registrar la validación visual y la firma."
      >
        <div className="space-y-4">
          <div className="space-y-3">
            {checklistItems.map((item) => {
              const isChecked = checklistState[item.id];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setChecklistState((current) => ({
                      ...current,
                      [item.id]: !current[item.id]
                    }))
                  }
                  className={`flex w-full items-center gap-3 rounded-3xl border px-4 py-3 text-left text-sm transition ${
                    isChecked
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200/70 bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                      isChecked ? "bg-emerald-600 text-white" : "bg-signal/10 text-signal"
                    }`}
                  >
                    {isChecked ? "OK" : "?"}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div
              className={`rounded-[28px] border p-4 text-sm ${
                validationMessage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {validationMessage ??
                (resolvedQrSession
                  ? "QR listo. Completa checklist y firma para confirmar el acceso final."
                  : "La validación manual queda pendiente hasta completar checklist y firma.")}
            </div>

            <button
              type="button"
              onClick={handleValidate}
              disabled={isSubmitting || isLoading || !canSubmit}
              className="rounded-full bg-ink px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Registrando validación..."
                : resolvedQrSession
                  ? "Confirmar acceso por QR"
                  : "Confirmar validación manual"}
            </button>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
