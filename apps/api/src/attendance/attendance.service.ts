import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { AuthenticatedUser } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { QrSessionsService } from '../qr-sessions/qr-sessions.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { ConsumeQrAttendanceDto } from './dto/consume-qr-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

type AttendanceRow = {
  id: string;
  actividadId: string;
  asistenteId: string;
  firmaId: string | null;
  estado: string;
  metodoRegistro: string;
  attendanceDate: string;
  fechaHora: string;
  observaciones: string | null;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
    private readonly qrSessionsService: QrSessionsService,
    private readonly storageService: StorageService,
  ) {}

  async create(payload: CreateAttendanceDto, user: AuthenticatedUser) {
    this.ensureVisualValidation(payload.validacionVisual);
    const responsableId = await this.usersService.findResponsableIdByUserId(user.id);
    return this.database.withTransaction(async (client) => {
      const attendanceDate = await this.resolveAttendanceDate(
        client,
        payload.actividadId,
        payload.attendanceDate,
      );
      await this.ensureNoDailyDuplicate(
        client,
        payload.actividadId,
        payload.asistenteId,
        attendanceDate,
      );
      const firmaId = await this.createInlineSignature(client, payload.firma);
      const hash = createHash('sha256')
        .update(
          [
            payload.actividadId,
            payload.asistenteId,
            payload.metodoRegistro,
            attendanceDate,
            payload.observaciones ?? '',
            firmaId,
            Date.now().toString(),
          ].join(':'),
        )
        .digest('hex');

      const result = await client.query<AttendanceRow>(
        `
          insert into registros_asistencia (
            id, actividad_id, asistente_id, responsable_id, firma_id, metodo_registro,
            fecha_asistencia, estado, observaciones, hash_validacion
          )
          values (
            $1, $2, $3, $4, $5, $6,
            $7, 'validado', $8, $9
          )
          returning
            id,
            actividad_id as "actividadId",
            asistente_id as "asistenteId",
            firma_id as "firmaId",
            fecha_asistencia as "attendanceDate",
            estado,
            metodo_registro as "metodoRegistro",
            fecha_hora as "fechaHora",
            observaciones
        `,
        [
          randomUUID(),
          payload.actividadId,
          payload.asistenteId,
          responsableId ?? null,
          firmaId,
          payload.metodoRegistro,
          attendanceDate,
          payload.observaciones ?? 'Registro manual validado.',
          hash,
        ],
      );

      return result.rows[0];
    });
  }

  async findAll() {
    const result = await this.database.query<AttendanceRow>(
      `
        select
          id,
          actividad_id as "actividadId",
          asistente_id as "asistenteId",
          firma_id as "firmaId",
          fecha_asistencia as "attendanceDate",
          estado,
          metodo_registro as "metodoRegistro",
          fecha_hora as "fechaHora",
          observaciones
        from registros_asistencia
        order by fecha_hora desc
      `,
    );

    return result.rows;
  }

  async consumeQr(payload: ConsumeQrAttendanceDto, user: AuthenticatedUser) {
    this.ensureVisualValidation(payload.validacionVisual);
    const responsableId = await this.usersService.findResponsableIdByUserId(user.id);
    const session = await this.qrSessionsService.consume(payload.token);

    return this.database.withTransaction(async (client) => {
      const attendanceDate = await this.resolveAttendanceDate(
        client,
        session.activityId,
        payload.attendanceDate,
      );
      await this.ensureNoDailyDuplicate(
        client,
        session.activityId,
        session.attendeeId,
        attendanceDate,
      );
      const firmaId = await this.createInlineSignature(client, payload.firma);
      const hash = createHash('sha256')
        .update(
          [
            session.activityId,
            session.attendeeId,
            'qr',
            attendanceDate,
            payload.observaciones ?? '',
            session.sessionId,
            firmaId,
            Date.now().toString(),
          ].join(':'),
        )
        .digest('hex');

      const result = await client.query<AttendanceRow>(
        `
          insert into registros_asistencia (
            id, actividad_id, asistente_id, responsable_id, firma_id, metodo_registro,
            fecha_asistencia, estado, observaciones, hash_validacion, qr_session_id
          )
          values (
            $1, $2, $3, $4, $5, 'qr',
            $6, 'validado', $7, $8, $9
          )
          returning
            id,
            actividad_id as "actividadId",
            asistente_id as "asistenteId",
            firma_id as "firmaId",
            fecha_asistencia as "attendanceDate",
            estado,
            metodo_registro as "metodoRegistro",
            fecha_hora as "fechaHora",
            observaciones
        `,
        [
          randomUUID(),
          session.activityId,
          session.attendeeId,
          responsableId ?? null,
          firmaId,
          attendanceDate,
          payload.observaciones ??
            'Validación por escaneo QR desde panel responsable.',
          hash,
          session.sessionId,
        ],
      );

      await client.query(
        `
          update sesiones_qr
          set usado = true,
              usado_at = timezone('utc', now())
          where id = $1
        `,
        [session.sessionId],
      );

      return result.rows[0];
    });
  }

  private ensureVisualValidation(validacionVisual: boolean) {
    if (!validacionVisual) {
      throw new BadRequestException(
        'Debes completar la validación visual antes de confirmar la asistencia.',
      );
    }
  }

  private async resolveAttendanceDate(
    client: PoolClient,
    activityId: string,
    inputDate: string,
  ) {
    const normalizedDate = inputDate.slice(0, 10);
    const activityResult = await client.query<{
      exists: boolean;
    }>(
      `
        select exists(
          select 1
          from actividades
          where id = $1
            and deleted_at is null
            and $2::date between fecha_inicio::date and fecha_fin::date
        ) as exists
      `,
      [activityId, normalizedDate],
    );

    if (!activityResult.rows[0]?.exists) {
      throw new BadRequestException(
        'La fecha de firma debe estar dentro del rango del evento.',
      );
    }

    return normalizedDate;
  }

  private async ensureNoDailyDuplicate(
    client: PoolClient,
    activityId: string,
    attendeeId: string,
    attendanceDate: string,
  ) {
    const duplicateCheck = await client.query<{ exists: boolean }>(
      `
        select exists(
          select 1
          from registros_asistencia
          where actividad_id = $1
            and asistente_id = $2
            and estado = 'validado'
            and fecha_asistencia = $3::date
        ) as exists
      `,
      [activityId, attendeeId, attendanceDate],
    );

    if (duplicateCheck.rows[0]?.exists) {
      throw new ConflictException(
        'Este asistente ya firmó la asistencia para ese día.',
      );
    }
  }

  private async createInlineSignature(
    client: PoolClient,
    firma: {
      dataUrl: string;
      width: number;
      height: number;
    },
  ) {
    if (!firma.dataUrl.startsWith('data:image/png;base64,')) {
      throw new BadRequestException('La firma debe enviarse como PNG en base64.');
    }

    const signatureBuffer = Buffer.from(
      firma.dataUrl.replace('data:image/png;base64,', ''),
      'base64',
    );
    const hash = createHash('sha256').update(firma.dataUrl).digest('hex');
    const uploaded = await this.storageService.uploadObject({
      bucket: process.env.MINIO_BUCKET_SIGNATURES ?? 'firmas',
      originalName: `signature-${randomUUID()}.png`,
      mimeType: 'image/png',
      buffer: signatureBuffer,
      prefix: 'signatures',
    });
    const fileId = randomUUID();

    await client.query(
      `
        insert into archivos (
          id, bucket, ruta, nombre_original, mime_type, tamano, checksum, privado, uploaded_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, true, null)
      `,
      [
        fileId,
        uploaded.bucket,
        uploaded.objectName,
        'signature.png',
        'image/png',
        uploaded.size,
        uploaded.checksum,
      ],
    );

    const result = await client.query<{ id: string }>(
      `
        insert into firmas (
          id, archivo_id, formato, ancho, alto, hash_firma, data_url
        )
        values ($1, $2, 'image/png', $3, $4, $5, $6)
        returning id
      `,
      [randomUUID(), fileId, firma.width, firma.height, hash, firma.dataUrl],
    );

    return result.rows[0]?.id ?? null;
  }
}
