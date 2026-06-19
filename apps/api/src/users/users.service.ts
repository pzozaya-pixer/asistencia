import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Role } from '../common/enums/role.enum';
import { PasswordService } from '../crypto/password.service';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
  phone?: string | null;
  passwordHash?: string;
}

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  active: boolean;
  phone: string | null;
  passwordHash?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll() {
    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.email,
          u.nombre as "firstName",
          u.apellidos as "lastName",
          concat_ws(' ', u.nombre, u.apellidos) as "fullName",
          r.nombre as role,
          u.activo as active,
          u.telefono as phone
        from usuarios u
        join roles r on r.id = u.role_id
        where u.deleted_at is null
        order by u.activo desc, u.apellidos asc, u.nombre asc
      `,
    );

    return result.rows.map((row) => this.mapUser(row));
  }

  async findByEmail(email: string) {
    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.email,
          u.nombre as "firstName",
          u.apellidos as "lastName",
          concat_ws(' ', u.nombre, u.apellidos) as "fullName",
          r.nombre as role,
          u.activo as active,
          u.telefono as phone,
          u.password_hash as "passwordHash"
        from usuarios u
        join roles r on r.id = u.role_id
        where lower(u.email) = lower($1)
          and u.deleted_at is null
        limit 1
      `,
      [email],
    );

    return result.rows[0] ? this.mapUser(result.rows[0]) : undefined;
  }

  async findById(id: string) {
    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.email,
          u.nombre as "firstName",
          u.apellidos as "lastName",
          concat_ws(' ', u.nombre, u.apellidos) as "fullName",
          r.nombre as role,
          u.activo as active,
          u.telefono as phone
        from usuarios u
        join roles r on r.id = u.role_id
        where u.id = $1
          and u.deleted_at is null
        limit 1
      `,
      [id],
    );

    return result.rows[0] ? this.mapUser(result.rows[0]) : undefined;
  }

  async findResponsableIdByUserId(userId: string) {
    const result = await this.database.query<{ id: string }>(
      `
        select id
        from responsables
        where usuario_id = $1
        limit 1
      `,
      [userId],
    );

    return result.rows[0]?.id;
  }

  async findResponsables() {
    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.email,
          u.nombre as "firstName",
          u.apellidos as "lastName",
          concat_ws(' ', u.nombre, u.apellidos) as "fullName",
          r.nombre as role,
          u.activo as active,
          u.telefono as phone
        from usuarios u
        join roles r on r.id = u.role_id
        where r.nombre = $1
          and u.activo = true
          and u.deleted_at is null
        order by u.apellidos asc, u.nombre asc
      `,
      [Role.Responsable],
    );

    return result.rows.map((row) => this.mapUser(row));
  }

  async create(payload: CreateUserDto) {
    const active = payload.activo ?? true;
    const userId = randomUUID();
    const passwordHash = this.passwordService.hash(payload.password);

    try {
      return await this.database.withTransaction(async (client) => {
        const created = await client.query<UserRow>(
          `
            insert into usuarios (
              id, role_id, nombre, apellidos, email, telefono, password_hash, activo
            )
            values (
              $1,
              (select id from roles where nombre = $2),
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
            returning
              id,
              email,
              nombre as "firstName",
              apellidos as "lastName",
              concat_ws(' ', nombre, apellidos) as "fullName",
              $2::text as role,
              activo as active,
              telefono as phone
          `,
          [
            userId,
            payload.role,
            payload.nombre,
            payload.apellidos,
            payload.email,
            payload.telefono ?? null,
            passwordHash,
            active,
          ],
        );

        await this.syncResponsableRecord(client, {
          userId,
          role: payload.role,
          firstName: payload.nombre,
          lastName: payload.apellidos,
        });

        return this.mapUser(created.rows[0]);
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: string, payload: UpdateUserDto) {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const nextValues = {
      firstName: payload.nombre ?? existing.firstName,
      lastName: payload.apellidos ?? existing.lastName,
      email: payload.email ?? existing.email,
      phone:
        payload.telefono !== undefined
          ? payload.telefono || null
          : existing.phone ?? null,
      role: payload.role ?? existing.role,
      active: payload.activo ?? existing.active,
      passwordHash: payload.password
        ? this.passwordService.hash(payload.password)
        : existing.passwordHash,
    };

    try {
      return await this.database.withTransaction(async (client) => {
        const updated = await client.query<UserRow>(
          `
            update usuarios
            set
              role_id = (select id from roles where nombre = $2),
              nombre = $3,
              apellidos = $4,
              email = $5,
              telefono = $6,
              password_hash = coalesce($7, password_hash),
              activo = $8,
              updated_at = timezone('utc', now())
            where id = $1
              and deleted_at is null
            returning
              id,
              email,
              nombre as "firstName",
              apellidos as "lastName",
              concat_ws(' ', nombre, apellidos) as "fullName",
              $2::text as role,
              activo as active,
              telefono as phone
          `,
          [
            id,
            nextValues.role,
            nextValues.firstName,
            nextValues.lastName,
            nextValues.email,
            nextValues.phone,
            nextValues.passwordHash ?? null,
            nextValues.active,
          ],
        );

        if (!updated.rows[0]) {
          throw new NotFoundException('Usuario no encontrado.');
        }

        await this.syncResponsableRecord(client, {
          userId: id,
          role: nextValues.role,
          firstName: nextValues.firstName,
          lastName: nextValues.lastName,
        });

        return this.mapUser(updated.rows[0]);
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private mapUser(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: row.fullName,
      role: row.role,
      active: row.active,
      phone: row.phone,
      passwordHash: row.passwordHash,
    };
  }

  private async syncResponsableRecord(
    client: {
      query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
    },
    input: {
      userId: string;
      role: Role;
      firstName: string;
      lastName: string;
    },
  ) {
    if (input.role !== Role.Responsable) {
      return;
    }

    await client.query(
      `
        insert into responsables (id, usuario_id, documento, cargo, observaciones)
        values ($1, $2, null, 'Responsable de acceso', $3)
        on conflict (usuario_id) do update set
          cargo = excluded.cargo,
          observaciones = excluded.observaciones
      `,
      [
        randomUUID(),
        input.userId,
        `Sincronizado desde mantenimiento para ${input.firstName} ${input.lastName}.`,
      ],
    );
  }

  private rethrowConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    throw error;
  }
}
