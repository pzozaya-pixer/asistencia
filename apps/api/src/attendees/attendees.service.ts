import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type AttendeeRow = {
  id: string;
  actividadId: string | null;
  dniNie: string;
  telefono: string | null;
  nombre: string;
  apellidos: string;
  actividad: string | null;
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
          act.id as "actividadId",
          a.dni_nie as "dniNie",
          a.telefono,
          a.nombre,
          a.apellidos,
          act.nombre as actividad
        from asistentes a
        left join actividad_asistentes aa on aa.asistente_id = a.id
        left join actividades act on act.id = aa.actividad_id
        where a.deleted_at is null
          and (
            $1::text is null
            or concat_ws(' ', a.dni_nie, coalesce(a.telefono, ''), a.nombre, a.apellidos)
              ilike '%' || $1 || '%'
          )
        order by a.apellidos asc, a.nombre asc
        limit 20
      `,
      [normalizedQuery ?? null],
    );

    return result.rows;
  }
}
