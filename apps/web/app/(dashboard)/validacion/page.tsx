"use client";

import { startTransition, useState } from "react";

import { attendees } from "@/lib/mock-data";

import { PageHeader } from "@/components/page-header";
import { PlaceholderMedia } from "@/components/placeholder-media";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

const initialAttendee = attendees[1];

export default function ValidationPage() {
  const [validated, setValidated] = useState(false);

  const handleValidate = () => {
    startTransition(() => setValidated(true));
  };

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Puesto responsable"
        title="Validación asistente"
        description="Comparación visual demo con espacios reservados para foto y firma capturada."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Identidad a revisar"
          description="Los datos están mockeados para enseñar la distribución de la interfaz."
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 rounded-[28px] border border-slate-200/70 bg-white/80 p-4">
              <div>
                <p className="font-semibold text-ink">{initialAttendee.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  DNI {initialAttendee.dni} · Mesa {initialAttendee.table}
                </p>
              </div>
              <StatusBadge tone="warning">Revisión manual</StatusBadge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PlaceholderMedia
                title="Foto registrada"
                subtitle="Reserva para imagen segura"
                tone="signal"
              />
              <PlaceholderMedia
                title="Firma registrada"
                subtitle="Reserva para firma digital"
                tone="coral"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Checklist"
          description="Secuencia de decisión que un responsable vería antes de autorizar."
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                "Coincidencia con listado de acceso.",
                "Documento validado visualmente.",
                "Firma comparada con el registro.",
                "Incidencias previas revisadas."
              ].map((item) => (
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
              className="w-full rounded-full bg-ink px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Confirmar validación demo
            </button>

            <div
              className={`rounded-[28px] border p-4 text-sm ${
                validated
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {validated
                ? "Asistente marcado como validado localmente. Este estado es solo demostrativo."
                : "Pendiente de validación manual por responsable."}
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
