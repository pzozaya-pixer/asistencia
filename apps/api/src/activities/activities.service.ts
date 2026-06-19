import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/token.service';
import { Role } from '../common/enums/role.enum';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import {
  ActivityStatus,
  CreateActivityDto,
} from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

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
  responsableUserId: string | null;
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
          concat_ws(' ', u.nombre, u.apellidos) as "responsableNombre",
          u.id as "responsableUserId"
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
    const responsableId = await this.resolveResponsableId(
      payload.responsableUserId,
      user,
    );

    try {
      const result = await this.database.query<ActivityRow>(
        `
          insert into actividades (
            id, codigo, nombre, descripcion, fecha_inicio, fecha_fin,
            ubicacion, aforo, estado, responsable_id, created_by
          )
          values (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
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
            null::text as "responsableNombre",
            null::text as "responsableUserId"
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
          payload.estado ?? ActivityStatus.Draft,
          responsableId ?? null,
          user.id,
        ],
      );

      return result.rows[0];
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: string, payload: UpdateActivityDto, user: AuthenticatedUser) {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundException('Evento no encontrado.');
    }

    const responsableId = await this.resolveResponsableId(
      payload.responsableUserId ?? existing.responsableUserId ?? undefined,
      user,
    );

    try {
      const result = await this.database.query<ActivityRow>(
        `
          update actividades
          set
            codigo = $2,
            nombre = $3,
            descripcion = $4,
            fecha_inicio = $5,
            fecha_fin = $6,
            ubicacion = $7,
            aforo = $8,
            estado = $9,
            responsable_id = $10,
            updated_at = timezone('utc', now())
          where id = $1
            and deleted_at is null
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
            null::text as "responsableNombre",
            null::text as "responsableUserId"
        `,
        [
          id,
          payload.codigo ?? existing.codigo,
          payload.nombre ?? existing.nombre,
          payload.descripcion !== undefined
            ? payload.descripcion || null
            : existing.descripcion,
          payload.fechaInicio ?? existing.fechaInicio,
          payload.fechaFin ?? existing.fechaFin,
          payload.ubicacion !== undefined
            ? payload.ubicacion || null
            : existing.ubicacion,
          payload.aforo !== undefined ? payload.aforo : existing.aforo,
          payload.estado ?? existing.estado,
          responsableId ?? null,
        ],
      );

      if (!result.rows[0]) {
        throw new NotFoundException('Evento no encontrado.');
      }

      return result.rows[0];
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async findById(id: string) {
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
          concat_ws(' ', u.nombre, u.apellidos) as "responsableNombre",
          u.id as "responsableUserId"
        from actividades a
        left join responsables r on r.id = a.responsable_id
        left join usuarios u on u.id = r.usuario_id
        where a.id = $1
          and a.deleted_at is null
        limit 1
      `,
      [id],
    );

    return result.rows[0];
  }

  private async resolveResponsableId(
    responsableUserId: string | undefined,
    user: AuthenticatedUser,
  ) {
    if (responsableUserId) {
      if (user.role !== Role.SuperAdmin && responsableUserId !== user.id) {
        throw new NotFoundException('No puedes asignar otro responsable.');
      }

      const responsableId =
        await this.usersService.findResponsableIdByUserId(responsableUserId);

      if (!responsableId) {
        throw new NotFoundException('El responsable seleccionado no existe.');
      }

      return responsableId;
    }

    return this.usersService.findResponsableIdByUserId(user.id);
  }

  private rethrowConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new ConflictException('Ya existe un evento con ese codigo.');
    }

    throw error;
  }
}
