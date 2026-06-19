"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { searchAttendees, type AttendeeLookupResult } from "@/lib/auth";
import { formatLookupValue } from "@/lib/utils";

import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export default function AttendeePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const selectedAttendee =
    results.find((attendee) => attendee.id === selectedAttendeeId) ?? results[0];

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
                    Credencial demo
                  </p>
                  <h2 className="mt-2 font-[family:var(--font-heading)] text-2xl font-bold">
                    QR placeholder seguro
                  </h2>
                </div>
                <StatusBadge tone="success">Listo</StatusBadge>
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
                  <div className="mx-auto flex aspect-square max-w-[260px] items-center justify-center rounded-[32px] border border-dashed border-cyan-200/30 bg-white p-5 text-slate-900">
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 36 }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-7 w-7 rounded-sm ${
                            (index + (selectedAttendee.id.length % 3)) % 3 === 0
                              ? "bg-slate-900"
                              : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-cyan-200/15 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                    Placeholder visual conectado a un asistente real. El
                    siguiente paso es sustituirlo por un QR firmado y de vida
                    corta desde backend.
                  </div>
                  <Link
                    href={
                      selectedAttendee.actividadId
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
