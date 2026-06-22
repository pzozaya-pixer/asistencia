import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DashboardService } from '../dashboard/dashboard.service';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';

type ActiveActivityRow = {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  fechaInicio: string;
  fechaFin: string;
  durationDays: number;
};

type DailyMetricsRow = {
  validatedCount: string;
  pendingCount: string;
  manualCount: string;
  qrCount: string;
  duplicateCount: string;
};

type PendingAttendeeRow = {
  id: string;
  nombre: string;
  apellidos: string;
  estado: string;
};

@Injectable()
export class AutomationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly database: DatabaseService,
    private readonly dashboardService: DashboardService,
    private readonly storageService: StorageService,
  ) {}

  async getDailySummary(inputDate?: string) {
    const targetDate = this.resolveTargetDate(inputDate);
    const activeActivity = await this.getActiveActivity();
    const metrics = await this.getDailyMetrics(targetDate, activeActivity?.id);
    const pendingAttendees = activeActivity
      ? await this.getPendingAttendees(activeActivity.id, targetDate)
      : [];

    const pendingCount = Number(metrics.pendingCount);
    const validatedCount = Number(metrics.validatedCount);
    const manualCount = Number(metrics.manualCount);
    const duplicateCount = Number(metrics.duplicateCount);

    return {
      type: 'daily-summary',
      generatedAt: new Date().toISOString(),
      date: targetDate,
      activity: activeActivity,
      metrics: {
        validatedCount,
        pendingCount,
        manualCount,
        qrCount: Number(metrics.qrCount),
        duplicateCount,
      },
      shouldNotify: pendingCount > 0 || duplicateCount > 0,
      alerts: [
        pendingCount > 0
          ? `${pendingCount} asistentes pendientes de validar en la actividad activa.`
          : 'Sin pendientes de validacion para la jornada indicada.',
        manualCount > 0
          ? `${manualCount} registros se validaron manualmente.`
          : 'No se registraron validaciones manuales.',
        duplicateCount > 0
          ? `${duplicateCount} intentos duplicados detectados para la misma fecha.`
          : 'No se detectaron duplicados para la fecha consultada.',
      ],
      message: this.buildSummaryMessage({
        targetDate,
        activeActivity,
        validatedCount,
        pendingCount,
        manualCount,
        duplicateCount,
      }),
      pendingAttendees,
    };
  }

  async getPendingValidationsAlert(inputDate?: string) {
    const summary = await this.getDailySummary(inputDate);

    return {
      type: 'pending-validations-alert',
      generatedAt: summary.generatedAt,
      date: summary.date,
      shouldNotify: summary.metrics.pendingCount > 0,
      severity: summary.metrics.pendingCount > 0 ? 'warning' : 'success',
      activity: summary.activity,
      pendingCount: summary.metrics.pendingCount,
      pendingAttendees: summary.pendingAttendees,
      message:
        summary.metrics.pendingCount > 0
          ? `Hay ${summary.metrics.pendingCount} asistentes pendientes de validar para ${summary.activity?.nombre ?? 'la actividad activa'}.`
          : 'No hay asistentes pendientes de validar.',
    };
  }

  async createActiveActivityExportBundle() {
    const excelFile = await this.dashboardService.exportActiveActivityExcel();
    const pdfFile = await this.dashboardService.exportActiveActivityPdf();
    const exportKeyPrefix = `automation/${this.buildExportPrefix()}`;

    const excelUpload = await this.storageService.uploadObject({
      bucket:
        this.configService.get<string>('MINIO_BUCKET_EXCELS') ?? 'excels',
      originalName: excelFile.filename,
      mimeType: excelFile.contentType,
      buffer: excelFile.buffer,
      prefix: exportKeyPrefix,
    });

    const pdfUpload = await this.storageService.uploadObject({
      bucket: this.configService.get<string>('MINIO_BUCKET_PDFS') ?? 'pdfs',
      originalName: pdfFile.filename,
      mimeType: pdfFile.contentType,
      buffer: pdfFile.buffer,
      prefix: exportKeyPrefix,
    });

    const [excelUrl, pdfUrl] = await Promise.all([
      this.storageService.getSignedUrl(
        excelUpload.bucket,
        excelUpload.objectName,
      ),
      this.storageService.getSignedUrl(pdfUpload.bucket, pdfUpload.objectName),
    ]);

    return {
      type: 'active-activity-export-bundle',
      generatedAt: new Date().toISOString(),
      files: [
        {
          kind: 'excel',
          filename: excelFile.filename,
          contentType: excelFile.contentType,
          bucket: excelUpload.bucket,
          objectName: excelUpload.objectName,
          checksum: excelUpload.checksum,
          size: excelUpload.size,
          signedUrl: excelUrl,
        },
        {
          kind: 'pdf',
          filename: pdfFile.filename,
          contentType: pdfFile.contentType,
          bucket: pdfUpload.bucket,
          objectName: pdfUpload.objectName,
          checksum: pdfUpload.checksum,
          size: pdfUpload.size,
          signedUrl: pdfUrl,
        },
      ],
    };
  }

  private async getActiveActivity() {
    const result = await this.database.query<ActiveActivityRow>(
      `
        select
          id,
          codigo,
          nombre,
          ubicacion,
          fecha_inicio as "fechaInicio",
          fecha_fin as "fechaFin",
          ((fecha_fin::date - fecha_inicio::date) + 1)::int as "durationDays"
        from actividades
        where deleted_at is null
          and estado = 'activa'
        order by fecha_inicio asc
        limit 1
      `,
    );

    return result.rows[0] ?? null;
  }

  private async getDailyMetrics(targetDate: string, activityId: string | null) {
    const result = await this.database.query<DailyMetricsRow>(
      `
        select
          (
            select count(*)::text
            from registros_asistencia ra
            where timezone('Europe/Madrid', ra.fecha_hora)::date = $1::date
              and ra.estado = 'validado'
              and ($2::uuid is null or ra.actividad_id = $2::uuid)
          ) as "validatedCount",
          (
            select count(*)::text
            from actividad_asistentes aa
            where ($2::uuid is not null and aa.actividad_id = $2::uuid)
              and aa.estado in ('inscrito', 'confirmado', 'incidencia')
              and not exists (
                select 1
                from registros_asistencia ra
                where ra.actividad_id = aa.actividad_id
                  and ra.asistente_id = aa.asistente_id
                  and ra.estado = 'validado'
                  and timezone('Europe/Madrid', ra.fecha_hora)::date = $1::date
              )
          ) as "pendingCount",
          (
            select count(*)::text
            from registros_asistencia ra
            where timezone('Europe/Madrid', ra.fecha_hora)::date = $1::date
              and ra.metodo_registro = 'manual'
              and ($2::uuid is null or ra.actividad_id = $2::uuid)
          ) as "manualCount",
          (
            select count(*)::text
            from registros_asistencia ra
            where timezone('Europe/Madrid', ra.fecha_hora)::date = $1::date
              and ra.metodo_registro = 'qr'
              and ($2::uuid is null or ra.actividad_id = $2::uuid)
          ) as "qrCount",
          (
            select count(*)::text
            from registros_asistencia ra
            where timezone('Europe/Madrid', ra.fecha_hora)::date = $1::date
              and ra.estado = 'duplicado'
              and ($2::uuid is null or ra.actividad_id = $2::uuid)
          ) as "duplicateCount"
      `,
      [targetDate, activityId],
    );

    return (
      result.rows[0] ?? {
        validatedCount: '0',
        pendingCount: '0',
        manualCount: '0',
        qrCount: '0',
        duplicateCount: '0',
      }
    );
  }

  private async getPendingAttendees(activityId: string, targetDate: string) {
    const result = await this.database.query<PendingAttendeeRow>(
      `
        select
          a.id,
          a.nombre,
          a.apellidos,
          aa.estado
        from actividad_asistentes aa
        join asistentes a on a.id = aa.asistente_id
        where aa.actividad_id = $1
          and aa.estado in ('inscrito', 'confirmado', 'incidencia')
          and not exists (
            select 1
            from registros_asistencia ra
            where ra.actividad_id = aa.actividad_id
              and ra.asistente_id = aa.asistente_id
              and ra.estado = 'validado'
              and timezone('Europe/Madrid', ra.fecha_hora)::date = $2::date
          )
        order by a.apellidos asc, a.nombre asc
        limit 10
      `,
      [activityId, targetDate],
    );

    return result.rows.map((entry) => ({
      id: entry.id,
      name: `${entry.nombre} ${entry.apellidos}`,
      status: entry.estado,
    }));
  }

  private resolveTargetDate(inputDate?: string) {
    if (inputDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
        throw new BadRequestException(
          'date must use YYYY-MM-DD format.',
        );
      }

      return inputDate;
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(new Date());
  }

  private buildSummaryMessage(input: {
    targetDate: string;
    activeActivity: ActiveActivityRow | null;
    validatedCount: number;
    pendingCount: number;
    manualCount: number;
    duplicateCount: number;
  }) {
    const activityLabel = input.activeActivity
      ? `${input.activeActivity.codigo} - ${input.activeActivity.nombre}`
      : 'Sin actividad activa';

    return [
      `Resumen diario ${input.targetDate}`,
      `Actividad: ${activityLabel}`,
      `Validados: ${input.validatedCount}`,
      `Pendientes: ${input.pendingCount}`,
      `Manuales: ${input.manualCount}`,
      `Duplicados: ${input.duplicateCount}`,
    ].join(' | ');
  }

  private buildExportPrefix() {
    return new Date().toISOString().replaceAll(':', '-');
  }
}
