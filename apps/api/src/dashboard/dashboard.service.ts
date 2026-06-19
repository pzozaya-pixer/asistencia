import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
  estadoInscripcion: string;
  attendanceStatus: string | null;
  metodoRegistro: string | null;
  fechaHora: string | null;
  observaciones: string | null;
};

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary() {
    const activeActivityResult = await this.database.query<ActiveActivityRow>(
      `
        select
          id,
          codigo,
          nombre,
          ubicacion
        from actividades
        where deleted_at is null
          and estado = 'activa'
        order by fecha_inicio asc
        limit 1
      `,
    );

    const activeActivity = activeActivityResult.rows[0] ?? null;

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
            where timezone('Europe/Madrid', ra.fecha_hora)::date = timezone('Europe/Madrid', now())::date
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
            where timezone('Europe/Madrid', ra.fecha_hora)::date = timezone('Europe/Madrid', now())::date
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
            ? `Actividad activa: ${activeActivity.nombre}`
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

  async exportActiveActivityExcel() {
    const report = await this.getActiveActivityExportReport();
    const content = this.buildExcelXml(report);

    return {
      filename: `${report.activity.codigo.toLowerCase()}-asistencia.xls`,
      contentType: 'application/vnd.ms-excel',
      buffer: Buffer.from(content, 'utf-8'),
    };
  }

  async exportActiveActivityPdf() {
    const report = await this.getActiveActivityExportReport();
    const lines = [
      'Exportacion de asistencia',
      `${report.activity.codigo} - ${report.activity.nombre}`,
      report.activity.ubicacion ? `Ubicacion: ${report.activity.ubicacion}` : 'Ubicacion: Sin definir',
      `Generado: ${new Date().toLocaleString('es-ES')}`,
      `Total asistentes: ${report.rows.length}`,
      '',
      ...report.rows.map((row, index) =>
        [
          `${index + 1}. ${row.nombre} ${row.apellidos}`,
          `DNI: ${row.dniNie} | Telefono: ${row.telefono ?? 's/d'}`,
          `Inscripcion: ${row.estadoInscripcion} | Asistencia: ${row.attendanceStatus ?? 'Pendiente'}`,
          `Metodo: ${row.metodoRegistro ?? 'Pendiente'} | Hora: ${row.fechaHora ? new Date(row.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 's/r'}`,
          `Observaciones: ${row.observaciones ?? '-'}`,
          '',
        ].join(' '),
      ),
    ];

    return {
      filename: `${report.activity.codigo.toLowerCase()}-asistencia.pdf`,
      contentType: 'application/pdf',
      buffer: this.buildSimplePdf(lines),
    };
  }

  private async getActiveActivityExportReport() {
    const activeActivityResult = await this.database.query<ActiveActivityRow>(
      `
        select
          id,
          codigo,
          nombre,
          ubicacion
        from actividades
        where deleted_at is null
          and estado = 'activa'
        order by fecha_inicio asc
        limit 1
      `,
    );

    const activity = activeActivityResult.rows[0];

    if (!activity) {
      throw new NotFoundException('No hay actividad activa para exportar.');
    }

    const result = await this.database.query<ExportReportRow>(
      `
        with latest_attendance as (
          select distinct on (ra.asistente_id)
            ra.asistente_id,
            ra.estado,
            ra.metodo_registro,
            ra.fecha_hora,
            ra.observaciones
          from registros_asistencia ra
          where ra.actividad_id = $1
          order by ra.asistente_id, ra.fecha_hora desc
        )
        select
          a.id as "attendeeId",
          a.dni_nie as "dniNie",
          a.nombre,
          a.apellidos,
          a.telefono,
          aa.estado as "estadoInscripcion",
          la.estado as "attendanceStatus",
          la.metodo_registro as "metodoRegistro",
          la.fecha_hora as "fechaHora",
          la.observaciones
        from actividad_asistentes aa
        join asistentes a on a.id = aa.asistente_id
        left join latest_attendance la on la.asistente_id = aa.asistente_id
        where aa.actividad_id = $1
        order by a.apellidos asc, a.nombre asc
      `,
      [activity.id],
    );

    return {
      activity,
      rows: result.rows,
    };
  }

  private buildExcelXml(report: {
    activity: ActiveActivityRow;
    rows: ExportReportRow[];
  }) {
    const worksheetRows = [
      ['Actividad', `${report.activity.codigo} - ${report.activity.nombre}`],
      ['Ubicacion', report.activity.ubicacion ?? 'Sin definir'],
      ['Generado', new Date().toLocaleString('es-ES')],
      [],
      ['DNI/NIE', 'Nombre', 'Apellidos', 'Telefono', 'Inscripcion', 'Asistencia', 'Metodo', 'Hora', 'Observaciones'],
      ...report.rows.map((row) => [
        row.dniNie,
        row.nombre,
        row.apellidos,
        row.telefono ?? '',
        row.estadoInscripcion,
        row.attendanceStatus ?? 'Pendiente',
        row.metodoRegistro ?? 'Pendiente',
        row.fechaHora
          ? new Date(row.fechaHora).toLocaleString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        row.observaciones ?? '',
      ]),
    ];

    const rowsXml = worksheetRows
      .map(
        (row) => `
          <Row>
            ${row
              .map(
                (cell) => `
                  <Cell><Data ss:Type="String">${this.escapeXml(String(cell ?? ''))}</Data></Cell>
                `,
              )
              .join('')}
          </Row>
        `,
      )
      .join('');

    return `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:html="http://www.w3.org/TR/REC-html40">
        <Worksheet ss:Name="Asistencia">
          <Table>
            ${rowsXml}
          </Table>
        </Worksheet>
      </Workbook>`;
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

  private escapeXml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  private escapePdfText(value: string) {
    return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  }
}
