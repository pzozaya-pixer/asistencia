create extension if not exists "pgcrypto";

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  permisos jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id),
  nombre text not null,
  apellidos text not null,
  email text not null unique,
  telefono text,
  password_hash text not null,
  activo boolean not null default true,
  ultimo_login timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists responsables (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references usuarios(id),
  documento text,
  cargo text,
  observaciones text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists configuracion (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor jsonb not null default '{}'::jsonb,
  descripcion text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  ubicacion text,
  aforo integer,
  estado text not null check (estado in ('borrador', 'activa', 'cerrada', 'archivada', 'cancelada')),
  responsable_id uuid references responsables(id),
  observaciones text,
  created_by uuid not null references usuarios(id),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists archivos (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  ruta text not null,
  nombre_original text not null,
  mime_type text not null,
  tamano bigint not null,
  checksum text,
  privado boolean not null default true,
  uploaded_by uuid references usuarios(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists asistentes (
  id uuid primary key default gen_random_uuid(),
  dni_nie text not null unique,
  nombre text not null,
  apellidos text not null,
  telefono text,
  email text,
  fecha_nacimiento date,
  foto_archivo_id uuid references archivos(id),
  observaciones text,
  activo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists actividad_asistentes (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id),
  asistente_id uuid not null references asistentes(id),
  estado text not null check (estado in ('inscrito', 'confirmado', 'asistido', 'ausente', 'cancelado', 'incidencia')),
  fecha_inscripcion timestamptz not null default timezone('utc', now()),
  observaciones text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (actividad_id, asistente_id)
);

create table if not exists incidencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  titulo text not null,
  descripcion text,
  gravedad text not null default 'media',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists firmas (
  id uuid primary key default gen_random_uuid(),
  archivo_id uuid not null references archivos(id),
  miniatura_archivo_id uuid references archivos(id),
  formato text not null,
  ancho integer not null,
  alto integer not null,
  hash_firma text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists sesiones_qr (
  id uuid primary key default gen_random_uuid(),
  asistente_id uuid not null references asistentes(id),
  actividad_id uuid not null references actividades(id),
  token text not null unique,
  expira_at timestamptz not null,
  usado boolean not null default false,
  usado_at timestamptz,
  ip_generacion inet,
  dispositivo text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists registros_asistencia (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id),
  asistente_id uuid not null references asistentes(id),
  responsable_id uuid references responsables(id),
  firma_id uuid references firmas(id),
  metodo_registro text not null check (metodo_registro in ('qr', 'manual')),
  fecha_hora timestamptz not null default timezone('utc', now()),
  ip inet,
  user_agent text,
  dispositivo text,
  qr_session_id uuid references sesiones_qr(id),
  estado text not null check (estado in ('validado', 'duplicado', 'rechazado', 'incidencia')),
  incidencia_id uuid references incidencias(id),
  observaciones text,
  hash_validacion text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalles jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_usuarios_role_id on usuarios(role_id);
create index if not exists idx_actividades_responsable_id on actividades(responsable_id);
create index if not exists idx_actividades_estado on actividades(estado);
create index if not exists idx_asistentes_dni_nie on asistentes(dni_nie);
create index if not exists idx_asistentes_telefono on asistentes(telefono);
create index if not exists idx_actividad_asistentes_actividad on actividad_asistentes(actividad_id);
create index if not exists idx_registros_asistencia_actividad on registros_asistencia(actividad_id);
create index if not exists idx_registros_asistencia_asistente on registros_asistencia(asistente_id);
create index if not exists idx_registros_asistencia_fecha_hora on registros_asistencia(fecha_hora desc);
create index if not exists idx_logs_auditoria_usuario on logs_auditoria(usuario_id);
create index if not exists idx_logs_auditoria_entidad on logs_auditoria(entidad, entidad_id);
create index if not exists idx_sesiones_qr_expira_at on sesiones_qr(expira_at);

insert into roles (nombre, descripcion, permisos)
values
  ('super_admin', 'Control total de la plataforma', '{"all": true}'::jsonb),
  ('responsable', 'Gestión operativa y validación de asistentes', '{"activities": ["read", "validate"], "attendees": ["read"]}'::jsonb),
  ('operador_lectura', 'Consulta sin permisos de edición', '{"activities": ["read"], "attendees": ["read"]}'::jsonb)
on conflict (nombre) do nothing;

