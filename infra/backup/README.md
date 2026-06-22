# Backups y restauracion

Este bloque cubre:

- backup diario comprimido de PostgreSQL
- mirror local de MinIO
- subida externa con `rclone`
- validacion basica de integridad
- restauracion operativa
- monitorizacion de disponibilidad via `health/ready`

## Archivos incluidos

- [backup.env.example](/Users/pzozaya/Documents/asistencia/infra/backup/backup.env.example)
- [backup-postgres.sh](/Users/pzozaya/Documents/asistencia/infra/backup/backup-postgres.sh)
- [backup-minio.sh](/Users/pzozaya/Documents/asistencia/infra/backup/backup-minio.sh)
- [push-remote-backups.sh](/Users/pzozaya/Documents/asistencia/infra/backup/push-remote-backups.sh)
- [verify-backups.sh](/Users/pzozaya/Documents/asistencia/infra/backup/verify-backups.sh)
- [restore-postgres.sh](/Users/pzozaya/Documents/asistencia/infra/backup/restore-postgres.sh)
- [restore-minio.sh](/Users/pzozaya/Documents/asistencia/infra/backup/restore-minio.sh)
- [run-backup-cycle.sh](/Users/pzozaya/Documents/asistencia/infra/backup/run-backup-cycle.sh)

## Preparacion

1. Copia `backup.env.example` a `backup.env`.
2. Ajusta credenciales y ruta remota.
3. Configura `rclone` en la VPS.
4. Asegura que Docker puede acceder a los contenedores `asistencia-postgres` y `asistencia-minio`.

## Ejecucion manual

```bash
./infra/backup/run-backup-cycle.sh
```

## Restauracion

PostgreSQL:

```bash
./infra/backup/restore-postgres.sh ./backups/postgres/latest.sql.gz
```

MinIO:

```bash
./infra/backup/restore-minio.sh ./backups/minio/latest
```

## Verificacion obligatoria

```bash
./infra/backup/verify-backups.sh
```

Ademas, la API expone:

- `GET /api/v1/health`
- `GET /api/v1/health/ready`

`health/ready` devuelve `200` cuando PostgreSQL y MinIO responden, y `503` si algun componente critico falla.

## Programacion recomendada

En la VPS puedes programar:

```cron
30 2 * * * cd /ruta/asistencia && ./infra/backup/run-backup-cycle.sh >> /var/log/asistencia-backup.log 2>&1
```

## Alcance

La restauracion queda preparada y documentada, pero debe probarse en entorno controlado antes de considerar estable la instalacion.
