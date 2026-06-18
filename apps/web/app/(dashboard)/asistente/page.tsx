"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { attendees } from "@/lib/mock-data";
import { formatLookupValue } from "@/lib/utils";

import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export default function AttendeePage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const normalized = deferredQuery.toLowerCase().replace(/\s+/g, "");

    if (!normalized) {
      return attendees.slice(0, 3);
    }

    return attendees.filter((attendee) => {
      return [attendee.dni, attendee.phone, attendee.name]
        .map((value) => value.toLowerCase().replace(/\s+/g, ""))
        .some((value) => value.includes(normalized));
    });
  }, [deferredQuery]);

  const selectedAttendee = results[0];

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Flujo asistente"
        title="Búsqueda y emisión QR"
        description="Demo segura: la vista nunca expone un código real ni datos sensibles completos."
      />

      <SectionCard
        title="Buscar por DNI o teléfono"
        description="Usa coincidencia parcial para simular una búsqueda rápida de acceso."
      >
        <div className="space-y-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Ej. 12345678A o 600123456"
          />
          <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {results.map((attendee) => (
                <button
                  key={attendee.id}
                  type="button"
                  onClick={() => setQuery(attendee.dni)}
                  className="w-full rounded-[28px] border border-slate-200/70 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{attendee.name}</p>
                    <StatusBadge tone={attendee.statusTone}>
                      {attendee.statusLabel}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">
                    DNI {formatLookupValue(attendee.dni)} · Tel.{" "}
                    {formatLookupValue(attendee.phone)}
                  </p>
                </button>
              ))}
              {results.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  No hay coincidencias en la demo actual.
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
                    <p className="text-lg font-semibold">{selectedAttendee.name}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Acceso autorizado para sala principal
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
                    Token visual de demostración. El backend real generará un QR
                    firmado y de vida corta.
                  </div>
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
