"use client";

import { useEffect, useState } from "react";
import {
  createAttendee,
  getStoredUser,
  searchAttendees,
  updateAttendee,
  uploadAttendeePhoto,
  type AttendeeLookupResult,
  type SessionUser
} from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

const initialForm = {
  dniNie: "",
  nombre: "",
  apellidos: "",
  telefono: "",
  email: "",
  observaciones: "",
  activo: true
};

export default function AttendeesPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeLookupResult[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

    async function loadAttendees() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAttendees = await searchAttendees(query.trim());

        if (!cancelled) {
          setAttendees(nextAttendees);
          setSelectedAttendeeId((current) => current ?? nextAttendees[0]?.id ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el mantenimiento de asistentes."
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
  }, [query, sessionUser]);

  useEffect(() => {
    const selectedAttendee = attendees.find((entry) => entry.id === selectedAttendeeId);

    if (!selectedAttendee) {
      setForm(initialForm);
      return;
    }

    setForm({
      dniNie: selectedAttendee.dniNie,
      nombre: selectedAttendee.nombre,
      apellidos: selectedAttendee.apellidos,
      telefono: selectedAttendee.telefono ?? "",
      email: selectedAttendee.email ?? "",
      observaciones: selectedAttendee.observaciones ?? "",
      activo: selectedAttendee.activo ?? true
    });
  }, [attendees, selectedAttendeeId]);

  function resetForCreate() {
    setSelectedAttendeeId(null);
    setForm(initialForm);
    setError(null);
    setNotice(null);
  }

  async function refreshAttendees(nextQuery = query) {
    const nextAttendees = await searchAttendees(nextQuery.trim());
    setAttendees(nextAttendees);
    return nextAttendees;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        dniNie: form.dniNie.trim(),
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
        activo: form.activo
      };

      if (selectedAttendeeId) {
        const updated = await updateAttendee(selectedAttendeeId, payload);
        setAttendees((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry))
        );
        setNotice("Asistente actualizado.");
      } else {
        const created = await createAttendee(payload);
        const nextAttendees = await refreshAttendees(query);
        setSelectedAttendeeId(
          nextAttendees.find((entry) => entry.id === created.id)?.id ?? created.id
        );
        setNotice("Asistente creado.");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el asistente."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedAttendeeId) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await uploadAttendeePhoto(selectedAttendeeId, file);
      setAttendees((current) =>
        current.map((entry) =>
          entry.id === selectedAttendeeId ? { ...entry, hasPhoto: true } : entry
        )
      );
      setNotice("Fotografía actualizada.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "No se pudo subir la fotografía."
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
          title="Mantenimiento de asistentes"
          description="Este módulo está disponible para responsables y super administradores."
        />
        <SectionCard title="Acceso restringido" description="Tu sesión no puede editar asistentes.">
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            No tienes permisos para administrar asistentes.
          </div>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Operativa"
        title="Mantenimiento de asistentes"
        description="Centraliza la ficha única de cada asistente para reutilizarla en eventos y validaciones."
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Base de asistentes"
          description="Busca por DNI/NIE, teléfono o nombre y selecciona la ficha a mantener."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar asistente..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
            />
            <button
              type="button"
              onClick={resetForCreate}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
            >
              Nuevo
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Cargando asistentes...
              </div>
            ) : null}

            {!isLoading &&
              attendees.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedAttendeeId(entry.id);
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full rounded-[28px] border border-slate-200/70 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <p className="font-semibold text-ink">
                    {entry.nombre} {entry.apellidos}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.dniNie} · {entry.telefono ?? "Sin teléfono"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.email ?? "Sin email"} · {entry.hasPhoto ? "Con foto" : "Sin foto"}
                  </p>
                </button>
              ))}

            {!isLoading && attendees.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                No hay asistentes para esa búsqueda.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedAttendeeId ? "Editar asistente" : "Alta de asistente"}
          description="La ficha se reutiliza automáticamente cuando se inscribe al asistente en una actividad."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="DNI/NIE" value={form.dniNie} onChange={(value) => setForm((current) => ({ ...current, dniNie: value }))} required />
              <Field label="Teléfono" value={form.telefono} onChange={(value) => setForm((current) => ({ ...current, telefono: value }))} />
              <Field label="Nombre" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} required />
              <Field label="Apellidos" value={form.apellidos} onChange={(value) => setForm((current) => ({ ...current, apellidos: value }))} required />
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
                />
                Activo
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              <span>Observaciones</span>
              <textarea
                value={form.observaciones}
                onChange={(event) =>
                  setForm((current) => ({ ...current, observaciones: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
              />
            </label>

            {selectedAttendeeId ? (
              <label className="block rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <span className="mb-2 block font-medium text-ink">Fotografía</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
              </label>
            ) : null}

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

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Guardando..." : selectedAttendeeId ? "Guardar cambios" : "Crear asistente"}
            </button>
          </form>
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
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
      />
    </label>
  );
}
