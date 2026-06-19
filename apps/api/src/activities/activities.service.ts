import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { AuthenticatedUser } from '../auth/token.service';
import { Role } from '../common/enums/role.enum';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import {
  ActivityAttendeeState,
  UpdateActivityAttendeeDto,
  UpsertActivityAttendeeDto,
} from './dto/activity-attendee.dto';
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

type ActivityAttendeeRow = {
  attendeeId: string;
  dniNie: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  estado: ActivityAttendeeState;
  observaciones: string | null;
  attendanceStatus: string | null;
  metodoRegistro: string | null;
  fechaHora: string | null;
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

  async findAttendees(activityId: string, user: AuthenticatedUser) {
    await this.assertActivityAccess(activityId, user, false);

    const result = await this.database.query<ActivityAttendeeRow>(
      `
        with latest_attendance as (
          select distinct on (ra.asistente_id)
            ra.asistente_id,
            ra.estado,
            ra.metodo_registro,
            ra.fecha_hora
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
          a.email,
          aa.estado,
          aa.observaciones,
          la.estado as "attendanceStatus",
          la.metodo_registro as "metodoRegistro",
          la.fecha_hora as "fechaHora"
        from actividad_asistentes aa
        join asistentes a on a.id = aa.asistente_id
        left join latest_attendance la on la.asistente_id = aa.asistente_id
        where aa.actividad_id = $1
          and a.deleted_at is null
        order by a.apellidos asc, a.nombre asc
      `,
      [activityId],
    );

    return result.rows;
  }

  async addAttendee(
    activityId: string,
    payload: UpsertActivityAttendeeDto,
    user: AuthenticatedUser,
  ) {
    await this.assertActivityAccess(activityId, user, true);

    return this.database.withTransaction(async (client) => {
      const attendeeResult = await client.query<{
        id: string;
      }>(
        `
          insert into asistentes (
            id, dni_nie, nombre, apellidos, telefono, email, activo
          )
          values ($1, $2, $3, $4, $5, $6, true)
          on conflict (dni_nie) do update set
            nombre = excluded.nombre,
            apellidos = excluded.apellidos,
            telefono = excluded.telefono,
            email = excluded.email,
            activo = true,
            deleted_at = null,
            updated_at = timezone('utc', now())
          returning id
        `,
        [
          randomUUID(),
          this.normalizeDni(payload.dniNie),
          payload.nombre.trim(),
          payload.apellidos.trim(),
          payload.telefono?.trim() || null,
          payload.email?.trim().toLowerCase() || null,
        ],
      );

      const attendeeId = attendeeResult.rows[0].id;

      await client.query(
        `
          insert into actividad_asistentes (
            id, actividad_id, asistente_id, estado, observaciones
          )
          values ($1, $2, $3, $4, $5)
          on conflict (actividad_id, asistente_id) do update set
            estado = excluded.estado,
            observaciones = excluded.observaciones
        `,
        [
          randomUUID(),
          activityId,
          attendeeId,
          payload.estado ?? 'confirmado',
          payload.observaciones?.trim() || null,
        ],
      );

      const rows = await this.findActivityAttendeesWithClient(client, activityId);
      return rows.find((row) => row.attendeeId === attendeeId);
    });
  }

  async updateAttendee(
    activityId: string,
    attendeeId: string,
    payload: UpdateActivityAttendeeDto,
    user: AuthenticatedUser,
  ) {
    await this.assertActivityAccess(activityId, user, true);

    const result = await this.database.query(
      `
        update actividad_asistentes
        set
          estado = coalesce($3, estado),
          observaciones = case
            when $4::text is null then observaciones
            else nullif($4, '')
          end
        where actividad_id = $1
          and asistente_id = $2
        returning asistente_id
      `,
      [activityId, attendeeId, payload.estado ?? null, payload.observaciones ?? null],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Asistente no vinculado a esta actividad.');
    }

    const rows = await this.findAttendees(activityId, user);
    return rows.find((row) => row.attendeeId === attendeeId);
  }

  async removeAttendee(
    activityId: string,
    attendeeId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertActivityAccess(activityId, user, true);

    const result = await this.database.query(
      `
        delete from actividad_asistentes
        where actividad_id = $1
          and asistente_id = $2
        returning asistente_id
      `,
      [activityId, attendeeId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Asistente no vinculado a esta actividad.');
    }

    return { success: true };
  }

  async importAttendeesFromWorkbook(
    activityId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    user: AuthenticatedUser,
  ) {
    await this.assertActivityAccess(activityId, user, true);

    if (!file?.buffer?.length) {
      throw new NotFoundException('No se ha recibido ningún archivo .xlsx.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new NotFoundException('El archivo no contiene hojas válidas.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (rows.length === 0) {
      return { created: 0, updated: 0, linked: 0, errors: [] };
    }

    let created = 0;
    let updated = 0;
    let linked = 0;
    const errors: string[] = [];

    await this.database.withTransaction(async (client) => {
      for (const [index, row] of rows.entries()) {
        const parsed = this.parseWorkbookAttendeeRow(row);

        if (!parsed.ok) {
          errors.push(`Fila ${index + 2}: ${parsed.error}`);
          continue;
        }

        const existingAttendee = await client.query<{ id: string }>(
          `
            select id
            from asistentes
            where dni_nie = $1
            limit 1
          `,
          [parsed.value.dniNie],
        );

        const attendeeResult = await client.query<{ id: string }>(
          `
            insert into asistentes (
              id, dni_nie, nombre, apellidos, telefono, email, activo
            )
            values ($1, $2, $3, $4, $5, $6, true)
            on conflict (dni_nie) do update set
              nombre = excluded.nombre,
              apellidos = excluded.apellidos,
              telefono = excluded.telefono,
              email = excluded.email,
              activo = true,
              deleted_at = null,
              updated_at = timezone('utc', now())
            returning id
          `,
          [
            randomUUID(),
            parsed.value.dniNie,
            parsed.value.nombre,
            parsed.value.apellidos,
            parsed.value.telefono,
            parsed.value.email,
          ],
        );

        if (existingAttendee.rows[0]) {
          updated += 1;
        } else {
          created += 1;
        }

        const attendeeId = attendeeResult.rows[0].id;
        const relationBefore = await client.query<{ id: string }>(
          `
            select id
            from actividad_asistentes
            where actividad_id = $1
              and asistente_id = $2
            limit 1
          `,
          [activityId, attendeeId],
        );

        await client.query(
          `
            insert into actividad_asistentes (
              id, actividad_id, asistente_id, estado, observaciones
            )
            values ($1, $2, $3, $4, $5)
            on conflict (actividad_id, asistente_id) do update set
              estado = excluded.estado,
              observaciones = excluded.observaciones
          `,
          [
            randomUUID(),
            activityId,
            attendeeId,
            parsed.value.estado,
            parsed.value.observaciones,
          ],
        );

        if (!relationBefore.rows[0]) {
          linked += 1;
        }
      }
    });

    return { created, updated, linked, errors };
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

  private async assertActivityAccess(
    activityId: string,
    user: AuthenticatedUser,
    requiresWrite: boolean,
  ) {
    const activity = await this.findById(activityId);

    if (!activity) {
      throw new NotFoundException('Evento no encontrado.');
    }

    if (user.role === Role.SuperAdmin) {
      return activity;
    }

    if (activity.responsableUserId !== user.id) {
      throw new NotFoundException(
        requiresWrite
          ? 'No puedes modificar asistentes de otro responsable.'
          : 'No puedes consultar asistentes de otro responsable.',
      );
    }

    return activity;
  }

  private async findActivityAttendeesWithClient(
    client: {
      query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
    },
    activityId: string,
  ) {
    const result = await client.query<ActivityAttendeeRow>(
      `
        with latest_attendance as (
          select distinct on (ra.asistente_id)
            ra.asistente_id,
            ra.estado,
            ra.metodo_registro,
            ra.fecha_hora
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
          a.email,
          aa.estado,
          aa.observaciones,
          la.estado as "attendanceStatus",
          la.metodo_registro as "metodoRegistro",
          la.fecha_hora as "fechaHora"
        from actividad_asistentes aa
        join asistentes a on a.id = aa.asistente_id
        left join latest_attendance la on la.asistente_id = aa.asistente_id
        where aa.actividad_id = $1
          and a.deleted_at is null
        order by a.apellidos asc, a.nombre asc
      `,
      [activityId],
    );

    return result.rows;
  }

  private parseWorkbookAttendeeRow(row: Record<string, unknown>) {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        this.normalizeHeader(key),
        typeof value === 'string' ? value.trim() : value,
      ]),
    );

    const dniNie = this.normalizeDni(this.readString(normalized, [
      'dni',
      'dnie',
      'dniňie',
      'dni/nie',
      'dni_nie',
      'doc',
      'documento',
    ]));
    const nombre = this.readString(normalized, ['nombre', 'name']);
    const apellidos = this.readString(normalized, ['apellidos', 'apellido', 'surname']);

    if (!dniNie) {
      return { ok: false as const, error: 'Falta DNI/NIE.' };
    }

    if (!nombre || !apellidos) {
      return { ok: false as const, error: 'Faltan nombre o apellidos.' };
    }

    return {
      ok: true as const,
      value: {
        dniNie,
        nombre,
        apellidos,
        telefono: this.readString(normalized, ['telefono', 'tel', 'movil', 'mobile']) || null,
        email:
          this.readString(normalized, ['email', 'correo', 'mail'])?.toLowerCase() ||
          null,
        estado:
          this.normalizeAttendeeState(
            this.readString(normalized, ['estado', 'inscripcion', 'estadoinscripcion']),
          ) ?? 'confirmado',
        observaciones:
          this.readString(normalized, ['observaciones', 'obs', 'notas']) || null,
      },
    };
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private readString(
    row: Record<string, unknown>,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = row[this.normalizeHeader(key)];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number') {
        return String(value);
      }
    }

    return '';
  }

  private normalizeDni(value: string) {
    return value.trim().toUpperCase();
  }

  private normalizeAttendeeState(value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return undefined;
    }

    const map: Record<string, ActivityAttendeeState> = {
      inscrito: 'inscrito',
      confirmado: 'confirmado',
      asistido: 'asistido',
      ausente: 'ausente',
      cancelado: 'cancelado',
      incidencia: 'incidencia',
    };

    return map[normalized];
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
