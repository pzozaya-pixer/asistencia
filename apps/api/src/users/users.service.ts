import { Injectable } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { DatabaseService } from '../database/database.service';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  phone?: string | null;
  passwordHash?: string;
}

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  phone: string | null;
  passwordHash?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.email,
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

  private mapUser(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      active: row.active,
      phone: row.phone,
      passwordHash: row.passwordHash,
    };
  }
}
