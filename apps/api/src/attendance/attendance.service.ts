import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/token.service';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
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
}
