import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { CreateActivityDto } from './dto/create-activity.dto';

type ActivityRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string | null;
  aforo: number | null;
  estado: string;
  responsableNombre: string | null;
};

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  async findAll() {
    const result = await this.database.query<ActivityRow>(
      `
        select
          a.id,
          a.codigo,
          a.nombre,
          a.descripcion,
          a.fecha_inicio as "fechaInicio",
          a.fecha_fin as "fechaFin",
          a.ubicacion,
          a.aforo,
          a.estado,
          concat_ws(' ', u.nombre, u.apellidos) as "responsableNombre"
        from actividades a
        left join responsables r on r.id = a.responsable_id
        left join usuarios u on u.id = r.usuario_id
        where a.deleted_at is null
        order by a.fecha_inicio asc
      `,
    );

    return result.rows;
  }

  async create(payload: CreateActivityDto, user: AuthenticatedUser) {
    const responsableId = await this.usersService.findResponsableIdByUserId(user.id);
    const result = await this.database.query<ActivityRow>(
      `
        insert into actividades (
          id, codigo, nombre, descripcion, fecha_inicio, fecha_fin,
          ubicacion, aforo, estado, responsable_id, created_by
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, 'borrador', $9, $10
        )
        returning
          id,
          codigo,
          nombre,
          descripcion,
          fecha_inicio as "fechaInicio",
          fecha_fin as "fechaFin",
          ubicacion,
          aforo,
          estado,
          null::text as "responsableNombre"
      `,
      [
        randomUUID(),
        payload.codigo,
        payload.nombre,
        payload.descripcion ?? null,
        payload.fechaInicio,
        payload.fechaFin,
        payload.ubicacion ?? null,
        payload.aforo ?? null,
        responsableId ?? null,
        user.id,
      ],
    );

    return result.rows[0];
  }
}
