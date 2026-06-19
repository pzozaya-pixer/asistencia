import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { QrSessionsService } from '../qr-sessions/qr-sessions.service';
import { UsersService } from '../users/users.service';
import { ConsumeQrAttendanceDto } from './dto/consume-qr-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

type AttendanceRow = {
  id: string;
  actividadId: string;
  asistenteId: string;
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
  ) {}

  async create(payload: CreateAttendanceDto, user: AuthenticatedUser) {
    const responsableId = await this.usersService.findResponsableIdByUserId(user.id);
    const hash = createHash('sha256')
      .update(
        [
          payload.actividadId,
          payload.asistenteId,
          payload.metodoRegistro,
          payload.observaciones ?? '',
          Date.now().toString(),
        ].join(':'),
      )
      .digest('hex');

    const result = await this.database.query<AttendanceRow>(
      `
        insert into registros_asistencia (
          id, actividad_id, asistente_id, responsable_id, metodo_registro,
          estado, observaciones, hash_validacion
        )
        values (
          $1, $2, $3, $4, $5,
          'validado', $6, $7
        )
        returning
          id,
          actividad_id as "actividadId",
          asistente_id as "asistenteId",
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
        payload.metodoRegistro,
        payload.observaciones ?? null,
        hash,
      ],
    );

    return result.rows[0];
  }

  async findAll() {
    const result = await this.database.query<AttendanceRow>(
      `
        select
          id,
          actividad_id as "actividadId",
          asistente_id as "asistenteId",
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
    const responsableId = await this.usersService.findResponsableIdByUserId(user.id);
    const session = await this.qrSessionsService.consume(payload.token);
    const hash = createHash('sha256')
      .update(
        [
          session.activityId,
          session.attendeeId,
          'qr',
          payload.observaciones ?? '',
          session.sessionId,
          Date.now().toString(),
        ].join(':'),
      )
      .digest('hex');

    await this.database.query('begin');

    try {
      const result = await this.database.query<AttendanceRow>(
        `
          insert into registros_asistencia (
            id, actividad_id, asistente_id, responsable_id, metodo_registro,
            estado, observaciones, hash_validacion, qr_session_id
          )
          values (
            $1, $2, $3, $4, 'qr',
            'validado', $5, $6, $7
          )
          returning
            id,
            actividad_id as "actividadId",
            asistente_id as "asistenteId",
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
          payload.observaciones ?? 'Validación por escaneo QR desde panel responsable.',
          hash,
          session.sessionId,
        ],
      );

      await this.database.query(
        `
          update sesiones_qr
          set usado = true,
              usado_at = timezone('utc', now())
          where id = $1
        `,
        [session.sessionId],
      );

      await this.database.query('commit');

      return result.rows[0];
    } catch (error) {
      await this.database.query('rollback');
      throw error;
    }
  }
}
