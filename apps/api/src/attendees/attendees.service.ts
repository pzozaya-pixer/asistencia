import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type AttendeeRow = {
  id: string;
  dniNie: string;
  telefono: string | null;
  nombre: string;
  apellidos: string;
  activities: Array<{
    id: string;
    codigo: string;
    nombre: string;
    estado: string;
  }>;
};

@Injectable()
export class AttendeesService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(query?: string) {
    const normalizedQuery = query?.trim();
    const result = await this.database.query<AttendeeRow>(
      `
        select
          a.id,
          a.dni_nie as "dniNie",
          a.telefono,
          a.nombre,
          a.apellidos,
          coalesce(
            json_agg(
              distinct jsonb_build_object(
                'id', act.id,
                'codigo', act.codigo,
                'nombre', act.nombre,
                'estado', act.estado
              )
            ) filter (where act.id is not null),
            '[]'::json
          ) as activities
        from asistentes a
        left join actividad_asistentes aa on aa.asistente_id = a.id
        left join actividades act on act.id = aa.actividad_id
        where a.deleted_at is null
          and (
            $1::text is null
            or concat_ws(' ', a.dni_nie, coalesce(a.telefono, ''), a.nombre, a.apellidos)
              ilike '%' || $1 || '%'
          )
        group by a.id, a.dni_nie, a.telefono, a.nombre, a.apellidos
        order by a.apellidos asc, a.nombre asc
        limit 20
      `,
      [normalizedQuery ?? null],
    );

    return result.rows.map((row) => {
      const activities = row.activities ?? [];
      const preferredActivity =
        activities.find((activity) => activity.estado === 'activa') ??
        activities[0] ??
        null;

      return {
        ...row,
        activities,
        actividadId: preferredActivity?.id ?? null,
        actividad: preferredActivity?.nombre ?? null,
      };
    });
  }
}
