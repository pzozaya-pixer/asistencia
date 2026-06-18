# Plataforma de control de asistencia

Base de demo funcional para una plataforma PWA de control de asistencia con:

- `Next.js` para frontend y PWA
- `NestJS` para API modular
- `PostgreSQL` compatible con `Supabase`
- `MinIO` para almacenamiento privado
- `n8n` para automatizaciones no críticas

## Estado actual

Esta iteración deja preparado el Bloque 1 del documento maestro:

- estructura monorepo
- `docker-compose`
- configuración compartida
- migración SQL inicial
- arranque del frontend y backend en progreso

## Estructura

- [apps/web](/Users/pzozaya/Documents/asistencia/apps/web)
- [apps/api](/Users/pzozaya/Documents/asistencia/apps/api)
- [docs/architecture.md](/Users/pzozaya/Documents/asistencia/docs/architecture.md)
- [supabase/migrations/0001_initial_schema.sql](/Users/pzozaya/Documents/asistencia/supabase/migrations/0001_initial_schema.sql)

## Próxima decisión

Necesitamos cerrar si la identidad principal de la demo será `Supabase Auth` o `JWT propio en NestJS`.
