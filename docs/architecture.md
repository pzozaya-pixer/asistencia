# Arquitectura de la demo

## Objetivo

Entregar una demo funcional de control de asistencia con dos superficies principales:

- panel administrativo y operación responsable
- PWA para asistentes con generación de QR temporal

## Stack base

- `apps/web`: Next.js + React + Tailwind + PWA
- `apps/api`: NestJS + validación estricta + RBAC
- `PostgreSQL`: esquema inicial compatible con Supabase
- `MinIO`: almacenamiento S3 privado para fotos, firmas y exportaciones
- `n8n`: automatizaciones no críticas

## Principios de diseño

- Separación clara entre datos transaccionales y archivos binarios
- Preparación para multiempresa mediante campos y módulos extensibles
- RBAC explícito y trazabilidad completa
- Infraestructura dockerizada desde la demo
- Integración progresiva con Supabase Auth y Prisma

## Bloques activos

### Bloque 1

- Monorepo
- Infraestructura local
- Esqueleto frontend/backend
- Migración SQL inicial

### Bloque 2

- autenticación
- refresh tokens
- guardas RBAC

### Bloque 3

- conexión real Prisma/Supabase
- políticas y validaciones de datos

## Decisiones asumidas

- TypeScript en frontend y backend
- Supabase como plataforma objetivo de base de datos y auth
- MinIO local para la demo
- n8n únicamente para procesos auxiliares

## Decisión pendiente del usuario

Definir si la autenticación final de la demo se apoyará en:

1. Supabase Auth como fuente principal de identidad.
2. JWT propio en NestJS con sincronización posterior hacia Supabase.

