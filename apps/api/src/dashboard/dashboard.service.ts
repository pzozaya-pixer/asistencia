import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';

type DashboardMetricRow = {
  checkInsHoy: string;
  pendientesValidacion: string;
  asistentesActividad: string;
  registrosManualesHoy: string;
};

type ActiveActivityRow = {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  fechaInicio: string;
  fechaFin: string;
  durationDays: number;
};

type RecentAccessRow = {
  id: string;
  nombre: string;
  apellidos: string;
  fechaHora: string;
  metodoRegistro: string;
  actividad: string | null;
};

type ValidationQueueRow = {
  id: string;
  actividadId: string;
  nombre: string;
  apellidos: string;
  estado: string;
};

type ExportReportRow = {
  attendeeId: string;
  dniNie: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  estadoInscripcion: string;
  attendanceStatus: string | null;
  metodoRegistro: string | null;
  fechaHora: string | null;
  attendanceDate: string | null;
  observaciones: string | null;
  attendanceDays: string[];
  attendanceDaysCount: number;
  hasSignature: boolean;
  signedAt: string | null;
  photoBucket: string | null;
  photoPath: string | null;
  signatureBucket: string | null;
  signaturePath: string | null;
};

type EnrichedExportReportRow = ExportReportRow & {
  photoUrl: string | null;
  signatureUrl: string | null;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async getSummary() {
    const activeActivity = await this.getActiveActivity();

    const metricsResult = await this.database.query<DashboardMetricRow>(
      `
        with actividad_actual as (
          select id
          from actividades
          where deleted_at is null
            and estado = 'activa'
          order by fecha_inicio asc
          limit 1
        )
        select
          (
            select count(*)::text
            from registros_asistencia ra
            where coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date) = timezone('Europe/Madrid', now())::date
              and ra.estado = 'validado'
          ) as "checkInsHoy",
          (
            select count(*)::text
            from actividad_asistentes aa
            join actividad_actual act on act.id = aa.actividad_id
            where aa.estado in ('inscrito', 'confirmado', 'incidencia')
              and not exists (
                select 1
                from registros_asistencia ra
                where ra.actividad_id = aa.actividad_id
                  and ra.asistente_id = aa.asistente_id
                  and ra.estado = 'validado'
                  and coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date) = timezone('Europe/Madrid', now())::date
              )
          ) as "pendientesValidacion",
          (
            select count(*)::text
            from actividad_asistentes aa
            join actividad_actual act on act.id = aa.actividad_id
          ) as "asistentesActividad",
          (
            select count(*)::text
            from registros_asistencia ra
            where coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date) = timezone('Europe/Madrid', now())::date
              and ra.metodo_registro = 'manual'
          ) as "registrosManualesHoy"
      `,
    );

    const metrics = metricsResult.rows[0] ?? {
      checkInsHoy: '0',
      pendientesValidacion: '0',
      asistentesActividad: '0',
      registrosManualesHoy: '0',
    };

    const recentAccessResult = await this.database.query<RecentAccessRow>(
      `
        select
          ra.id,
          a.nombre,
          a.apellidos,
          ra.fecha_hora as "fechaHora",
          ra.metodo_registro as "metodoRegistro",
          act.nombre as actividad
        from registros_asistencia ra
        join asistentes a on a.id = ra.asistente_id
        left join actividades act on act.id = ra.actividad_id
        order by ra.fecha_hora desc
        limit 5
      `,
    );

    const validationQueueResult = activeActivity
      ? await this.database.query<ValidationQueueRow>(
          `
            select
              a.id,
              aa.actividad_id as "actividadId",
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
                  and coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date) = timezone('Europe/Madrid', now())::date
              )
            order by a.apellidos asc, a.nombre asc
            limit 5
          `,
          [activeActivity.id],
        )
      : { rows: [] };

    const pendientes = Number(metrics.pendientesValidacion);
    const manualesHoy = Number(metrics.registrosManualesHoy);

    const alerts = [
      pendientes > 0
        ? {
            title: 'Validaciones pendientes en actividad activa',
            description: `${pendientes} asistentes siguen pendientes de revisión en el evento actual.`,
            tone: 'warning' as const,
            label: 'Seguimiento',
          }
        : {
            title: 'Actividad al día',
            description: 'No hay validaciones pendientes en la actividad activa.',
            tone: 'success' as const,
            label: 'Correcto',
          },
      manualesHoy > 0
        ? {
            title: 'Registros manuales detectados hoy',
            description: `${manualesHoy} accesos se han confirmado manualmente desde el panel responsable.`,
            tone: 'info' as const,
            label: 'Operativa',
          }
        : {
            title: 'Sin registros manuales hoy',
            description: 'Todavía no se han confirmado accesos manuales en la jornada actual.',
            tone: 'success' as const,
            label: 'Base limpia',
          },
    ];

    return {
      activeActivity,
      metrics: [
        {
          label: 'Check-ins hoy',
          value: metrics.checkInsHoy,
          hint: activeActivity
            ? `Actividad activa: ${activeActivity.nombre} · ${activeActivity.durationDays} día(s)`
            : 'Sin actividad activa en este momento',
          delta: `${metrics.checkInsHoy} validados`,
          tone: 'success' as const,
        },
        {
          label: 'Pendientes de validar',
          value: metrics.pendientesValidacion,
          hint: 'Asistentes aún no confirmados en la actividad activa',
          delta: `${metrics.pendientesValidacion} casos`,
          tone: pendientes > 0 ? ('warning' as const) : ('success' as const),
        },
        {
          label: 'Asistentes en actividad',
          value: metrics.asistentesActividad,
          hint: 'Inscritos asociados a la actividad operativa actual',
          delta: activeActivity ? activeActivity.codigo : 'Sin evento',
          tone: 'info' as const,
        },
        {
          label: 'Registros manuales hoy',
          value: metrics.registrosManualesHoy,
          hint: 'Confirmaciones manuales hechas por responsables',
          delta: manualesHoy > 0 ? 'Operativo' : 'Sin uso',
          tone: manualesHoy > 0 ? ('info' as const) : ('success' as const),
        },
      ],
      alerts,
      recentAccess: recentAccessResult.rows.map((entry) => ({
        id: entry.id,
        name: `${entry.nombre} ${entry.apellidos}`,
        time: new Date(entry.fechaHora).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        accessPoint: entry.actividad ?? 'Actividad sin nombre',
        mode: entry.metodoRegistro === 'manual' ? 'Manual' : 'QR',
      })),
      validationQueue: validationQueueResult.rows.map((entry) => ({
        id: entry.id,
        activityId: entry.actividadId,
        name: `${entry.nombre} ${entry.apellidos}`,
        reason:
          entry.estado === 'incidencia'
            ? 'Marcado con incidencia previa en la inscripción'
            : entry.estado === 'confirmado'
              ? 'Pendiente de registrar acceso definitivo'
              : 'Inscripción pendiente de validación manual',
      })),
    };
  }

  async exportActiveActivityExcel(activityId?: string, attendanceDate?: string) {
    const report = await this.getActivityExportReport(activityId, attendanceDate);
    const content = this.buildExcelWorkbook(report);

    return {
      filename: `${report.activity.codigo.toLowerCase()}-${report.attendanceDate}-asistencia.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: content,
    };
  }

  async exportActiveActivityPdf(activityId?: string, attendanceDate?: string) {
    const report = await this.getActivityExportReport(activityId, attendanceDate);
    const lines = [
      'Acta diaria de asistencia',
      `${report.activity.codigo} - ${report.activity.nombre}`,
      `Fecha de asistencia: ${report.attendanceDate}`,
      report.activity.ubicacion ? `Ubicacion: ${report.activity.ubicacion}` : 'Ubicacion: Sin definir',
      `Duracion evento: ${report.activity.durationDays} dia(s)`,
      `Generado: ${new Date().toLocaleString('es-ES')}`,
      `Total asistentes en evento: ${report.rows.length}`,
      '',
      ...report.rows.flatMap((row, index) => [
        `${index + 1}. ${row.nombre} ${row.apellidos}`,
        `DNI: ${row.dniNie} | Telefono: ${row.telefono ?? 's/d'} | Email: ${row.email ?? 's/d'}`,
        `Inscripcion: ${row.estadoInscripcion} | Estado dia: ${row.attendanceStatus ?? 'Pendiente'} | Metodo: ${row.metodoRegistro ?? 'Sin registro'}`,
        `Firmado: ${row.hasSignature ? 'Si' : 'No'} | Fecha firma: ${row.signedAt ? this.formatDateTime(row.signedAt) : 'Sin firma'}`,
        `Dias asistidos: ${row.attendanceDaysCount} | Fechas: ${row.attendanceDays.join(', ') || 'Sin asistencias'}`,
        `Foto URL: ${row.photoUrl ?? 'No disponible'} | Firma URL: ${row.signatureUrl ?? 'No disponible'}`,
        `Observaciones: ${row.observaciones ?? '-'}`,
        '',
      ]),
    ];

    return {
      filename: `${report.activity.codigo.toLowerCase()}-${report.attendanceDate}-asistencia.pdf`,
      contentType: 'application/pdf',
      buffer: this.buildSimplePdf(lines),
    };
  }

  private async getActivityExportReport(
    activityId?: string,
    attendanceDate?: string,
  ) {
    const activity = await this.resolveActivity(activityId);
    const selectedDate = this.resolveExportDate(activity, attendanceDate);

    const result = await this.database.query<ExportReportRow>(
      `
        with daily_attendance as (
          select distinct on (ra.asistente_id)
            ra.asistente_id,
            ra.estado,
            ra.metodo_registro,
            ra.fecha_hora,
            ra.fecha_asistencia,
            ra.observaciones,
            ra.firma_id
          from registros_asistencia ra
          where ra.actividad_id = $1
            and coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date) = $2::date
          order by ra.asistente_id, ra.fecha_hora desc
        ),
        attendance_days as (
          select
            ra.asistente_id,
            array_agg(
              distinct to_char(coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date), 'YYYY-MM-DD')
              order by to_char(coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date), 'YYYY-MM-DD')
            ) as dias,
            count(distinct coalesce(ra.fecha_asistencia, timezone('Europe/Madrid', ra.fecha_hora)::date))::int as total_dias
          from registros_asistencia ra
          where ra.actividad_id = $1
            and ra.estado = 'validado'
          group by ra.asistente_id
        )
        select
          a.id as "attendeeId",
          a.dni_nie as "dniNie",
          a.nombre,
          a.apellidos,
          a.telefono,
          a.email,
          aa.estado as "estadoInscripcion",
          da.estado as "attendanceStatus",
          da.metodo_registro as "metodoRegistro",
          da.fecha_hora as "fechaHora",
          da.fecha_asistencia::text as "attendanceDate",
          da.observaciones,
          coalesce(ad.dias, array[]::text[]) as "attendanceDays",
          coalesce(ad.total_dias, 0)::int as "attendanceDaysCount",
          (da.firma_id is not null) as "hasSignature",
          da.fecha_hora as "signedAt",
          photo.bucket as "photoBucket",
          photo.ruta as "photoPath",
          signature.bucket as "signatureBucket",
          signature.ruta as "signaturePath"
        from actividad_asistentes aa
        join asistentes a on a.id = aa.asistente_id
        left join daily_attendance da on da.asistente_id = aa.asistente_id
        left join attendance_days ad on ad.asistente_id = aa.asistente_id
        left join archivos photo on photo.id = a.foto_archivo_id
        left join firmas f on f.id = da.firma_id
        left join archivos signature on signature.id = f.archivo_id
        where aa.actividad_id = $1
        order by a.apellidos asc, a.nombre asc
      `,
      [activity.id, selectedDate],
    );

    const rows = await Promise.all(
      result.rows.map(async (row) => ({
        ...row,
        photoUrl:
          row.photoBucket && row.photoPath
            ? await this.storageService.getSignedUrl(row.photoBucket, row.photoPath)
            : null,
        signatureUrl:
          row.signatureBucket && row.signaturePath
            ? await this.storageService.getSignedUrl(
                row.signatureBucket,
                row.signaturePath,
              )
            : null,
      })),
    );

    return {
      activity,
      attendanceDate: selectedDate,
      rows,
    };
  }

  private async resolveActivity(activityId?: string) {
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
          and ($1::uuid is null and estado = 'activa' or id = $1::uuid)
        order by
          case when estado = 'activa' then 0 else 1 end,
          fecha_inicio asc
        limit 1
      `,
      [activityId ?? null],
    );

    const activity = result.rows[0];

    if (!activity) {
      throw new NotFoundException('No se encontró la actividad solicitada para exportar.');
    }

    return activity;
  }

  private resolveExportDate(activity: ActiveActivityRow, attendanceDate?: string) {
    const activityStart = this.toDateOnlyValue(activity.fechaInicio);
    const activityEnd = this.toDateOnlyValue(activity.fechaFin);
    const normalized =
      attendanceDate?.slice(0, 10) ??
      this.resolveDefaultActivityDate(activityStart, activityEnd);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException('attendanceDate debe usar formato YYYY-MM-DD.');
    }

    if (normalized < activityStart || normalized > activityEnd) {
      throw new BadRequestException(
        'La fecha exportada debe estar dentro del rango del evento.',
      );
    }

    return normalized;
  }

  private resolveDefaultActivityDate(start: string, end: string) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (today >= start.slice(0, 10) && today <= end.slice(0, 10)) {
      return today;
    }

    return start.slice(0, 10);
  }

  private toDateOnlyValue(value: string | Date) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
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

  private buildExcelWorkbook(report: {
    activity: ActiveActivityRow;
    attendanceDate: string;
    rows: EnrichedExportReportRow[];
  }) {
    const workbook = XLSX.utils.book_new();

    const registerRows = [
      ['Actividad', `${report.activity.codigo} - ${report.activity.nombre}`],
      ['Fecha de asistencia', report.attendanceDate],
      ['Ubicacion', report.activity.ubicacion ?? 'Sin definir'],
      ['Duracion (dias)', report.activity.durationDays],
      ['Generado', new Date().toLocaleString('es-ES')],
      [],
      [
        'DNI/NIE',
        'Nombre',
        'Apellidos',
        'Telefono',
        'Email',
        'Inscripcion',
        'Estado dia',
        'Firmado',
        'Fecha firma',
        'Metodo',
        'Observaciones',
      ],
      ...report.rows.map((row) => [
        row.dniNie,
        row.nombre,
        row.apellidos,
        row.telefono ?? '',
        row.email ?? '',
        row.estadoInscripcion,
        row.attendanceStatus ?? 'Pendiente',
        row.hasSignature ? 'Si' : 'No',
        row.signedAt ? this.formatDateTime(row.signedAt) : '',
        row.metodoRegistro ?? '',
        row.observaciones ?? '',
      ]),
    ];

    const fichaRows = [
      [
        'DNI/NIE',
        'Nombre',
        'Apellidos',
        'Dias asistidos',
        'Fechas asistencia',
        'Foto registrada',
        'Foto URL',
        'Firma registrada',
        'Firma URL',
      ],
      ...report.rows.map((row) => [
        row.dniNie,
        row.nombre,
        row.apellidos,
        row.attendanceDaysCount,
        row.attendanceDays.join(', '),
        row.photoUrl ? 'Si' : 'No',
        row.photoUrl ?? '',
        row.hasSignature ? 'Si' : 'No',
        row.signatureUrl ?? '',
      ]),
    ];

    const registerSheet = XLSX.utils.aoa_to_sheet(registerRows);
    registerSheet['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 22 },
      { wch: 12 },
      { wch: 28 },
    ];

    const fichaSheet = XLSX.utils.aoa_to_sheet(fichaRows);
    fichaSheet['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 26 },
      { wch: 12 },
      { wch: 48 },
      { wch: 14 },
      { wch: 48 },
    ];

    XLSX.utils.book_append_sheet(workbook, registerSheet, 'Registro diario');
    XLSX.utils.book_append_sheet(workbook, fichaSheet, 'Fichas');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private buildSimplePdf(lines: string[]) {
    const contentLines = lines.flatMap((line) => this.wrapPdfLine(line, 90));
    const contentStream = [
      'BT',
      '/F1 10 Tf',
      '50 790 Td',
      '14 TL',
      ...contentLines.map((line, index) =>
        `${index === 0 ? '' : 'T* ' }(${this.escapePdfText(line)}) Tj`.trim(),
      ),
      'ET',
    ].join('\n');

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf-8')} >> stream
${contentStream}
endstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${offsets
  .slice(1)
  .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n `)
  .join('\n')}
trailer << /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }

  private wrapPdfLine(line: string, maxChars: number) {
    if (line.length <= maxChars) {
      return [line];
    }

    const words = line.split(' ');
    const output: string[] = [];
    let current = '';

    for (const word of words) {
      const nextValue = current ? `${current} ${word}` : word;

      if (nextValue.length > maxChars) {
        if (current) {
          output.push(current);
        }
        current = word;
      } else {
        current = nextValue;
      }
    }

    if (current) {
      output.push(current);
    }

    return output;
  }

  private escapePdfText(value: string) {
    return value
      .replaceAll('\\', '\\\\')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)');
  }

  private formatDateTime(value: string) {
    return new Date(value).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
