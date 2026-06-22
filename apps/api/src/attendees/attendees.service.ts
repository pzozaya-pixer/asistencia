import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { UpsertAttendeeDto } from './dto/upsert-attendee.dto';

type AttendeeRow = {
  id: string;
  dniNie: string;
  telefono: string | null;
  email: string | null;
  nombre: string;
  apellidos: string;
  observaciones: string | null;
  activo: boolean;
  hasPhoto: boolean;
  photoBucket: string | null;
  photoPath: string | null;
  activities: Array<{
    id: string;
    codigo: string;
    nombre: string;
    estado: string;
    estadoInscripcion: string | null;
    fechaInicio: string;
    fechaFin: string;
  }>;
};

@Injectable()
export class AttendeesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query?: string) {
    const normalizedQuery = query?.trim();
    const result = await this.database.query<AttendeeRow>(
      `
        select
          a.id,
          a.dni_nie as "dniNie",
          a.telefono,
          a.email,
          a.nombre,
          a.apellidos,
          a.observaciones,
          a.activo,
          (a.foto_archivo_id is not null) as "hasPhoto",
          ar.bucket as "photoBucket",
          ar.ruta as "photoPath",
          coalesce(
            json_agg(
              distinct jsonb_build_object(
                'id', act.id,
                'codigo', act.codigo,
                'nombre', act.nombre,
                'estado', act.estado,
                'estadoInscripcion', aa.estado,
                'fechaInicio', act.fecha_inicio,
                'fechaFin', act.fecha_fin
              )
            ) filter (where act.id is not null),
            '[]'::json
          ) as activities
        from asistentes a
        left join archivos ar on ar.id = a.foto_archivo_id
        left join actividad_asistentes aa on aa.asistente_id = a.id
        left join actividades act on act.id = aa.actividad_id
        where a.deleted_at is null
          and (
            $1::text is null
            or concat_ws(' ', a.dni_nie, coalesce(a.telefono, ''), a.nombre, a.apellidos)
              ilike '%' || $1 || '%'
          )
        group by
          a.id,
          a.dni_nie,
          a.telefono,
          a.email,
          a.nombre,
          a.apellidos,
          a.observaciones,
          a.activo,
          a.foto_archivo_id,
          ar.bucket,
          ar.ruta
        order by a.apellidos asc, a.nombre asc
        limit 20
      `,
      [normalizedQuery ?? null],
    );

    return result.rows.map((row) => this.mapAttendeeRow(row));
  }

  async create(payload: UpsertAttendeeDto) {
    try {
      const result = await this.database.query<AttendeeRow>(
        `
          insert into asistentes (
            id, dni_nie, nombre, apellidos, telefono, email, observaciones, activo
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning
            id,
            dni_nie as "dniNie",
            telefono,
            email,
            nombre,
            apellidos,
            observaciones,
            activo,
            (foto_archivo_id is not null) as "hasPhoto",
            null::text as "photoBucket",
            null::text as "photoPath",
            '[]'::json as activities
        `,
        [
          randomUUID(),
          this.normalizeDocument(payload.dniNie),
          payload.nombre.trim(),
          payload.apellidos.trim(),
          payload.telefono?.trim() || null,
          payload.email?.trim().toLowerCase() || null,
          payload.observaciones?.trim() || null,
          payload.activo ?? true,
        ],
      );

      return this.mapAttendeeRow(result.rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Ya existe un asistente con ese DNI/NIE.',
        );
      }

      throw error;
    }
  }

  async update(attendeeId: string, payload: UpsertAttendeeDto) {
    const existing = await this.database.query<{
      id: string;
      dniNie: string;
      nombre: string;
      apellidos: string;
      telefono: string | null;
      email: string | null;
      observaciones: string | null;
      activo: boolean;
    }>(
      `
        select
          id,
          dni_nie as "dniNie",
          nombre,
          apellidos,
          telefono,
          email,
          observaciones,
          activo
        from asistentes
        where id = $1
          and deleted_at is null
        limit 1
      `,
      [attendeeId],
    );

    const row = existing.rows[0];

    if (!row) {
      throw new NotFoundException('Asistente no encontrado.');
    }

    try {
      const result = await this.database.query<AttendeeRow>(
        `
          update asistentes
          set
            dni_nie = $2,
            nombre = $3,
            apellidos = $4,
            telefono = $5,
            email = $6,
            observaciones = $7,
            activo = $8,
            updated_at = timezone('utc', now())
          where id = $1
            and deleted_at is null
          returning
            id,
            dni_nie as "dniNie",
            telefono,
            email,
            nombre,
            apellidos,
            observaciones,
            activo,
            (foto_archivo_id is not null) as "hasPhoto",
            null::text as "photoBucket",
            null::text as "photoPath",
            '[]'::json as activities
        `,
        [
          attendeeId,
          this.normalizeDocument(payload.dniNie ?? row.dniNie),
          payload.nombre?.trim() ?? row.nombre,
          payload.apellidos?.trim() ?? row.apellidos,
          payload.telefono !== undefined
            ? payload.telefono.trim() || null
            : row.telefono,
          payload.email !== undefined
            ? payload.email.trim().toLowerCase() || null
            : row.email,
          payload.observaciones !== undefined
            ? payload.observaciones.trim() || null
            : row.observaciones,
          payload.activo ?? row.activo,
        ],
      );

      return this.mapAttendeeRow(result.rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Ya existe otro asistente con ese DNI/NIE.',
        );
      }

      throw error;
    }
  }

  private mapAttendeeRow(row: AttendeeRow) {
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
        estadoActividad: preferredActivity?.estadoInscripcion ?? null,
        photoUrl: row.photoPath ? `/api/attendees/${row.id}/photo` : null,
      };
  }

  private normalizeDocument(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '');
  }

  async findPublic(query?: string) {
    const rows = await this.findAll(query);

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        photoUrl:
          row.hasPhoto && row.id
            ? (await this.getPhotoUrl(row.id).catch(() => ({ photoUrl: null }))).photoUrl
            : null,
      })),
    );
  }

  async uploadPhoto(
    attendeeId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    user: AuthenticatedUser,
  ) {
    return this.persistPhotoUpload(attendeeId, file, user.id);
  }

  async uploadPublicPhoto(
    attendeeId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  ) {
    const attendeeWithPhoto = await this.database.query<{
      id: string;
      hasPhoto: boolean;
    }>(
      `
        select
          id,
          (foto_archivo_id is not null) as "hasPhoto"
        from asistentes
        where id = $1
          and deleted_at is null
        limit 1
      `,
      [attendeeId],
    );

    const attendee = attendeeWithPhoto.rows[0];

    if (!attendee) {
      throw new NotFoundException('Asistente no encontrado.');
    }

    if (attendee.hasPhoto) {
      throw new BadRequestException(
        'Este asistente ya tiene una fotografía cargada.',
      );
    }

    return this.persistPhotoUpload(attendeeId, file, null);
  }

  private async persistPhotoUpload(
    attendeeId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    uploadedBy: string | null,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes subir una imagen válida.');
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException(
        'La fotografía debe ser JPG, PNG o WEBP.',
      );
    }

    const attendee = await this.database.query<{
      id: string;
    }>(
      `
        select id
        from asistentes
        where id = $1
          and deleted_at is null
        limit 1
      `,
      [attendeeId],
    );

    if (!attendee.rows[0]) {
      throw new NotFoundException('Asistente no encontrado.');
    }

    const uploaded = await this.storageService.uploadObject({
      bucket: process.env.MINIO_BUCKET_ASSISTANTS ?? 'asistentes-fotos',
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      prefix: `attendees/${attendeeId}`,
    });

    const fileId = randomUUID();

    await this.database.withTransaction(async (client) => {
      await client.query(
        `
          insert into archivos (
            id, bucket, ruta, nombre_original, mime_type, tamano, checksum, privado, uploaded_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, true, $8)
        `,
        [
          fileId,
          uploaded.bucket,
          uploaded.objectName,
          file.originalname,
          file.mimetype,
          uploaded.size,
          uploaded.checksum,
          uploadedBy,
        ],
      );

      await client.query(
        `
          update asistentes
          set foto_archivo_id = $2,
              updated_at = timezone('utc', now())
          where id = $1
        `,
        [attendeeId, fileId],
      );
    });

    return {
      fileId,
      photoUrl: (await this.getPhotoUrl(attendeeId)).photoUrl,
    };
  }

  async getPhotoFile(attendeeId: string) {
    const file = await this.getPhotoMetadata(attendeeId);

    return {
      ...file,
      buffer: await this.storageService.getObject(file.bucket, file.path),
    };
  }

  async getPhotoUrl(attendeeId: string) {
    const file = await this.getPhotoMetadata(attendeeId);
    const signedUrl = await this.storageService.getSignedUrl(
      file.bucket,
      file.path,
    );

    return {
      photoUrl: signedUrl,
    };
  }

  private async getPhotoMetadata(attendeeId: string) {
    const result = await this.database.query<{
      bucket: string;
      path: string;
      mimeType: string;
      originalName: string;
    }>(
      `
        select
          ar.bucket,
          ar.ruta as path,
          ar.mime_type as "mimeType",
          ar.nombre_original as "originalName"
        from asistentes a
        join archivos ar on ar.id = a.foto_archivo_id
        where a.id = $1
          and a.deleted_at is null
        limit 1
      `,
      [attendeeId],
    );

    const file = result.rows[0];

    if (!file) {
      throw new NotFoundException('Este asistente no tiene fotografía subida.');
    }

    return file;
  }
}
