import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TokenService } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { CreateQrSessionDto } from './dto/create-qr-session.dto';

type ActivityLinkRow = {
  attendeeId: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  attendeeName: string;
};

type QrSessionLookupRow = {
  sessionId: string;
  attendeeId: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  attendeeName: string;
  attendeeLastName: string;
  attendeeDocument: string;
  used: boolean;
  expiresAt: string;
};

@Injectable()
export class QrSessionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async create(
    payload: CreateQrSessionDto,
    metadata: {
      ipAddress?: string | null;
      device?: string | null;
    },
  ) {
    const relation = await this.findAttendeeActivityRelation(
      payload.attendeeId,
      payload.activityId,
    );

    if (!relation) {
      throw new NotFoundException(
        'No se encontró la actividad seleccionada para el asistente.',
      );
    }

    const ttlSeconds = payload.ttlSeconds ?? 120;

    if (ttlSeconds < 30 || ttlSeconds > 300) {
      throw new BadRequestException(
        'La caducidad del QR debe estar entre 30 y 300 segundos.',
      );
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const token = this.tokenService.signQrToken({
      sessionId,
      attendeeId: relation.attendeeId,
      activityId: relation.activityId,
      expiresAt,
    });

    await this.database.query(
      `
        insert into sesiones_qr (
          id,
          asistente_id,
          actividad_id,
          token,
          expira_at,
          ip_generacion,
          dispositivo
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        sessionId,
        relation.attendeeId,
        relation.activityId,
        token,
        expiresAt.toISOString(),
        metadata.ipAddress ?? null,
        metadata.device ?? null,
      ],
    );

    return {
      id: sessionId,
      token,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds,
      attendeeId: relation.attendeeId,
      attendeeName: relation.attendeeName,
      activityId: relation.activityId,
      activityCode: relation.activityCode,
      activityName: relation.activityName,
    };
  }

  async resolve(token: string) {
    const payload = this.tokenService.verifyQrToken(token);
    const session = await this.findSession(payload.sid, token);

    if (!session) {
      throw new NotFoundException('La sesión QR indicada ya no existe.');
    }

    const isExpired = new Date(session.expiresAt).getTime() <= Date.now();

    if (isExpired) {
      throw new ConflictException('El QR temporal ha caducado.');
    }

    if (session.used) {
      throw new ConflictException('El QR temporal ya fue consumido.');
    }

    return {
      sessionId: session.sessionId,
      token,
      attendee: {
        id: session.attendeeId,
        nombre: session.attendeeName,
        apellidos: session.attendeeLastName,
        dniNie: session.attendeeDocument,
      },
      activity: {
        id: session.activityId,
        codigo: session.activityCode,
        nombre: session.activityName,
      },
      expiresAt: session.expiresAt,
      status: 'ready' as const,
    };
  }

  async consume(token: string) {
    const payload = this.tokenService.verifyQrToken(token);
    const session = await this.findSession(payload.sid, token);

    if (!session) {
      throw new NotFoundException('La sesión QR indicada ya no existe.');
    }

    const isExpired = new Date(session.expiresAt).getTime() <= Date.now();

    if (isExpired) {
      throw new ConflictException('El QR temporal ha caducado.');
    }

    if (session.used) {
      throw new ConflictException('El QR temporal ya fue consumido.');
    }

    return session;
  }

  private async findAttendeeActivityRelation(
    attendeeId: string,
    activityId: string,
  ) {
    const result = await this.database.query<ActivityLinkRow>(
      `
        select
          a.id as "attendeeId",
          act.id as "activityId",
          act.codigo as "activityCode",
          act.nombre as "activityName",
          concat_ws(' ', a.nombre, a.apellidos) as "attendeeName"
        from asistentes a
        inner join actividad_asistentes aa
          on aa.asistente_id = a.id
        inner join actividades act
          on act.id = aa.actividad_id
        where a.id = $1
          and act.id = $2
          and a.deleted_at is null
          and act.deleted_at is null
        limit 1
      `,
      [attendeeId, activityId],
    );

    return result.rows[0] ?? null;
  }

  private async findSession(sessionId: string, token: string) {
    const result = await this.database.query<QrSessionLookupRow>(
      `
        select
          sq.id as "sessionId",
          sq.asistente_id as "attendeeId",
          sq.actividad_id as "activityId",
          sq.usado as "used",
          sq.expira_at as "expiresAt",
          act.codigo as "activityCode",
          act.nombre as "activityName",
          a.nombre as "attendeeName",
          a.apellidos as "attendeeLastName",
          a.dni_nie as "attendeeDocument"
        from sesiones_qr sq
        inner join asistentes a on a.id = sq.asistente_id
        inner join actividades act on act.id = sq.actividad_id
        where sq.id = $1
          and sq.token = $2
        limit 1
      `,
      [sessionId, token],
    );

    return result.rows[0] ?? null;
  }
}
