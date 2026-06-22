# Plataforma de control de asistencia

Base de demo funcional para una plataforma PWA de control de asistencia con:

- `Next.js` para frontend y PWA
- `NestJS` para API modular
- `PostgreSQL` compatible con `Supabase`
- `MinIO` para almacenamiento privado
- `n8n` para automatizaciones no críticas

## Estado actual

Estado funcional actual del roadmap:

- Bloque 1: base técnica y despliegue
- Bloque 2: autenticación y roles
- Bloque 3: modelo de datos operativo sobre PostgreSQL
- Bloque 4: panel administrativo
- Bloque 5: MinIO y gestión privada de archivos
- Bloques 6-11: identificación, QR, validación, firma y asistencia multidía
- Bloque 12: exportaciones `xlsx` y `pdf`
- Bloque 13: automatizaciones internas para `n8n`
- Bloque 14: hardening y seguridad operativa
- Bloque 15: backups y monitorizacion
- Bloque 16: validacion final demo y runbook operativo

## Bloque 13

El proyecto ya incluye:

- endpoints internos de automatización en `GET /api/v1/automation/*`
- secreto compartido `AUTOMATION_SECRET`
- workflows versionados en [infra/n8n/workflows](/Users/pzozaya/Documents/asistencia/infra/n8n/workflows)
- guía de importación en [infra/n8n/README.md](/Users/pzozaya/Documents/asistencia/infra/n8n/README.md)

## Bloque 14

La API queda endurecida con:

- CORS por lista blanca mediante `CORS_ALLOWED_ORIGINS`
- `trust proxy` configurable para despliegues tras Dokploy o proxy inverso
- cabeceras seguras (`HSTS`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`)
- rate limiting básico para login, refresh y automatizaciones
- validación de secretos inseguros cuando `NODE_ENV=production`

## Bloque 15

El proyecto incorpora:

- scripts de backup y restore en [infra/backup](/Users/pzozaya/Documents/asistencia/infra/backup)
- `pg_dump` comprimido con retencion local configurable
- mirror local de MinIO con manifiesto `sha256`
- subida externa con `rclone`
- endpoint de readiness real en `GET /api/v1/health/ready`
- workflow de alerta de salud en `n8n`

## Bloque 16

El cierre de demo deja:

- validacion automatica del flujo base en [infra/demo/validate-demo.mjs](/Users/pzozaya/Documents/asistencia/infra/demo/validate-demo.mjs)
- validacion local de backups en `pnpm backup:validate-local`
- checklist operativo en [infra/demo/README.md](/Users/pzozaya/Documents/asistencia/infra/demo/README.md)
- arquitectura actualizada sin decisiones abiertas para la demo en [docs/architecture.md](/Users/pzozaya/Documents/asistencia/docs/architecture.md)

## Estructura

- [apps/web](/Users/pzozaya/Documents/asistencia/apps/web)
- [apps/api](/Users/pzozaya/Documents/asistencia/apps/api)
- [docs/architecture.md](/Users/pzozaya/Documents/asistencia/docs/architecture.md)
- [supabase/migrations/0001_initial_schema.sql](/Users/pzozaya/Documents/asistencia/supabase/migrations/0001_initial_schema.sql)
