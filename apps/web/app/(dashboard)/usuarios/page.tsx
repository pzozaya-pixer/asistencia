"use client";

import { useEffect, useState } from "react";

import {
  createUser,
  fetchUsers,
  getStoredUser,
  updateUser,
  type ManagedUser,
  type SessionUser
} from "@/lib/auth";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

const roleLabels: Record<SessionUser["role"], string> = {
  super_admin: "Super admin",
  responsable: "Responsable",
  operador_lectura: "Operador lectura"
};

const initialForm = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  role: "operador_lectura" as SessionUser["role"],
  activo: true,
  password: ""
};

export default function UsersPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSessionUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (sessionUser?.role !== "super_admin") {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const nextUsers = await fetchUsers();

        if (cancelled) {
          return;
        }

        setUsers(nextUsers);
        setSelectedUserId((current) => current ?? nextUsers[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el mantenimiento de usuarios."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.role]);

  useEffect(() => {
    if (!selectedUserId) {
      setForm(initialForm);
      return;
    }

    const selectedUser = users.find((entry) => entry.id === selectedUserId);

    if (!selectedUser) {
      return;
    }

    setForm({
      nombre: selectedUser.firstName,
      apellidos: selectedUser.lastName,
      email: selectedUser.email,
      telefono: selectedUser.phone ?? "",
      role: selectedUser.role,
      activo: selectedUser.active,
      password: ""
    });
  }, [selectedUserId, users]);

  function resetForCreate() {
    setSelectedUserId(null);
    setForm(initialForm);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (selectedUserId) {
        const payload = {
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email,
          telefono: form.telefono,
          role: form.role,
          activo: form.activo,
          ...(form.password.trim() ? { password: form.password } : {})
        };
        const updatedUser = await updateUser(selectedUserId, payload);

        setUsers((current) =>
          current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry))
        );
        setNotice("Usuario actualizado.");
      } else {
        const createdUser = await createUser({
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email,
          telefono: form.telefono,
          role: form.role,
          activo: form.activo,
          password: form.password
        });

        setUsers((current) =>
          [createdUser, ...current].sort((left, right) =>
            `${left.lastName} ${left.firstName}`.localeCompare(
              `${right.lastName} ${right.firstName}`,
              "es"
            )
          )
        );
        setSelectedUserId(createdUser.id);
        setNotice("Usuario creado.");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (sessionUser && sessionUser.role !== "super_admin") {
    return (
      <main className="space-y-6">
        <PageHeader
          overline="Administración"
          title="Mantenimiento de usuarios"
          description="Este módulo está reservado a super administradores."
        />
        <SectionCard
          title="Acceso restringido"
          description="Tu sesión puede seguir operando en dashboard, asistentes y validación."
        >
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            No tienes permisos para administrar usuarios internos.
          </div>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        overline="Administración"
        title="Mantenimiento de usuarios"
        description="Alta, edición, rol y activación del equipo interno con acceso al panel."
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Equipo interno"
          description="Selecciona un usuario para editarlo o crea uno nuevo."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{users.length} usuarios cargados</p>
            <button
              type="button"
              onClick={resetForCreate}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
            >
              Nuevo usuario
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Cargando usuarios...
              </div>
            ) : null}

            {!isLoading &&
              users.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(entry.id);
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full rounded-[28px] border border-slate-200/70 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:shadow-panel"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{entry.fullName}</p>
                    <StatusBadge tone={entry.active ? "success" : "warning"}>
                      {entry.active ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">{entry.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {roleLabels[entry.role]}
                    {entry.phone ? ` · ${entry.phone}` : ""}
                  </p>
                </button>
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedUserId ? "Editar usuario" : "Alta de usuario"}
          description="La contraseña solo se cambia si introduces una nueva."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Nombre</span>
                <input
                  value={form.nombre}
                  onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Apellidos</span>
                <input
                  value={form.apellidos}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, apellidos: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Teléfono</span>
                <input
                  value={form.telefono}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, telefono: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Rol</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as SessionUser["role"]
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                >
                  <option value="super_admin">Super admin</option>
                  <option value="responsable">Responsable</option>
                  <option value="operador_lectura">Operador lectura</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                <span>Estado</span>
                <select
                  value={form.activo ? "activo" : "inactivo"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      activo: event.target.value === "activo"
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              <span>{selectedUserId ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-signal"
                required={!selectedUserId}
                minLength={8}
              />
            </label>

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

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Guardando..." : selectedUserId ? "Guardar cambios" : "Crear usuario"}
              </button>
              <button
                type="button"
                onClick={resetForCreate}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal"
              >
                Limpiar
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
    </main>
  );
}
