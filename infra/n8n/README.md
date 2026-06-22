# Automatizaciones n8n

Este bloque deja `n8n` listo para consumir la API interna de asistencia como cliente de automatización auxiliar.

## Endpoints internos disponibles

Todos los endpoints requieren la cabecera:

`x-automation-secret: <AUTOMATION_SECRET>`

Base URL recomendada dentro de Docker:

`http://api:4000/api/v1`

Rutas:

- `GET /automation/daily-summary`
- `GET /automation/daily-summary?date=2026-06-22`
- `GET /automation/pending-validations`
- `GET /automation/export-bundle`

## Variables necesarias

- `AUTOMATION_SECRET`
- `AUTOMATION_API_BASE_URL`
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_USER_MANAGEMENT_JWT_SECRET`

## Workflows incluidos

- [daily-summary.json](/Users/pzozaya/Documents/asistencia/infra/n8n/workflows/daily-summary.json)
- [pending-validations-alert.json](/Users/pzozaya/Documents/asistencia/infra/n8n/workflows/pending-validations-alert.json)
- [active-activity-export-bundle.json](/Users/pzozaya/Documents/asistencia/infra/n8n/workflows/active-activity-export-bundle.json)
- [stack-health-alert.json](/Users/pzozaya/Documents/asistencia/infra/n8n/workflows/stack-health-alert.json)

## Importación en n8n

1. Entra en `n8n`.
2. `Workflows` -> `Import from file`.
3. Importa uno de los JSON del directorio `infra/n8n/workflows`.
4. Revisa el nodo `HTTP Request`.
5. Verifica que usa:
   - URL: `{{$env.AUTOMATION_API_BASE_URL}}/...`
   - Header `x-automation-secret: {{$env.AUTOMATION_SECRET}}`
6. Sustituye el último nodo de salida por tu canal real:
   - email SMTP
   - Slack
   - webhook
   - Telegram

## Contrato recomendado

- `daily-summary`: resumen operativo diario listo para correo o mensaje.
- `pending-validations`: alerta sólo si hay pendientes.
- `export-bundle`: genera y guarda `xlsx` y `pdf` en MinIO, devolviendo metadatos y `signedUrl` cuando `MINIO_PUBLIC_URL` está configurada.

## Nota de alcance

`n8n` queda reservado a procesos no críticos. La validación principal, el QR, la firma y el registro transaccional siguen viviendo en la API.
