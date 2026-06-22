# Validacion final demo

Este directorio cierra el bloque 16 con una validacion rapida del recorrido minimo definido en el prompt maestro.

## Script automatico

[validate-demo.mjs](/Users/pzozaya/Documents/asistencia/infra/demo/validate-demo.mjs)

Comprueba:

- `health` y `health/ready`
- login responsable
- creacion de actividad
- alta y vinculacion de asistente al evento
- subida de fotografia a MinIO
- generacion y resolucion de QR
- registro de asistencia con firma
- resumen dashboard
- exportaciones `xlsx` y `pdf`
- endpoints de automatizacion si se facilita `AUTOMATION_SECRET`

## Ejecucion

```bash
pnpm demo:validate
```

Variables opcionales:

- `DEMO_API_BASE_URL`
- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `AUTOMATION_SECRET`

## Validacion de backups

Para validar la parte local de backups:

```bash
pnpm backup:validate-local
```

## Checklist manual restante

- importar un `xlsx` real desde la pantalla de eventos
- abrir la PWA en movil o tablet y validar firma tactil
- importar los workflows en `n8n` y conectar el nodo final a un canal real
- ejecutar restauracion de PostgreSQL y MinIO en entorno controlado
