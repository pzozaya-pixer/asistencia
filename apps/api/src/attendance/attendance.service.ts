import { BadRequestException, Injectable } from '@nestjs/common';
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
      const firmaId = await this.createInlineSignature(client, payload.firma);
      const hash = createHash('sha256')
        .update(
          [
            payload.actividadId,
            payload.asistenteId,
            payload.metodoRegistro,
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
            estado, observaciones, hash_validacion
          )
          values (
            $1, $2, $3, $4, $5, $6,
            'validado', $7, $8
          )
          returning
            id,
            actividad_id as "actividadId",
            asistente_id as "asistenteId",
            firma_id as "firmaId",
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
          payload.observaciones ?? null,
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
      const firmaId = await this.createInlineSignature(client, payload.firma);
      const hash = createHash('sha256')
        .update(
          [
            session.activityId,
            session.attendeeId,
            'qr',
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
            estado, observaciones, hash_validacion, qr_session_id
          )
          values (
            $1, $2, $3, $4, $5, 'qr',
            'validado', $6, $7, $8
          )
          returning
            id,
            actividad_id as "actividadId",
            asistente_id as "asistenteId",
            firma_id as "firmaId",
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
          payload.observaciones ?? 'Validación por escaneo QR desde panel responsable.',
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
