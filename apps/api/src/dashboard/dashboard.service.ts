import { Injectable } from '@nestjs/common';
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
}
