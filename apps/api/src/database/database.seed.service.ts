import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PasswordService } from '../crypto/password.service';
import { DatabaseService } from './database.service';

const DEMO_USERS = [
  {
    id: '8b4cb016-e2d8-46dd-aea7-f4a171f08471',
    email: 'admin@demo.local',
    nombre: 'Demo',
    apellidos: 'Admin',
    telefono: '600000001',
    password: 'admin123',
    role: 'super_admin',
  },
  {
    id: '1737f8c3-f74d-4935-af6d-9d42059f92c4',
    email: 'responsable@demo.local',
    nombre: 'Responsable',
    apellidos: 'Demo',
    telefono: '600000002',
    password: 'responsable123',
    role: 'responsable',
    responsableId: 'b19f0f22-b104-4382-92a2-f8fd8425cc65',
  },
  {
    id: 'a1e4ffbe-0d86-4956-8f02-629ee3b49de9',
    email: 'operador@demo.local',
    nombre: 'Operador',
    apellidos: 'Lectura Demo',
    telefono: '600000003',
    password: 'operador123',
    role: 'operador_lectura',
  },
];

const DEMO_ATTENDEES = [
  {
    id: '43c81416-6916-4185-92c7-ca0af46c76cf',
    dniNie: '12345678A',
    nombre: 'Lucia',
    apellidos: 'Moreno',
    telefono: '600123123',
    email: 'lucia.moreno@example.com',
  },
  {
    id: '8ec7c614-7daa-48f8-ab0c-2b406dbff2ca',
    dniNie: '87654321B',
    nombre: 'Carlos',
    apellidos: 'Vega',
    telefono: '600987654',
    email: 'carlos.vega@example.com',
  },
  {
    id: 'fd6db0f8-6d74-408a-9457-640fe9695373',
    dniNie: '11223344C',
    nombre: 'Nadia',
    apellidos: 'Ruiz',
    telefono: '699555444',
    email: 'nadia.ruiz@example.com',
  },
];

const DEMO_ACTIVITY = {
  id: 'b494d833-ed1a-4907-96c3-2a904540f6ab',
  codigo: 'ACT-001',
  nombre: 'Jornada de insercion laboral',
  descripcion: 'Actividad operativa de demostracion para control de acceso.',
  fechaInicio: '2026-06-18T10:00:00.000Z',
  fechaFin: '2026-06-18T14:00:00.000Z',
  ubicacion: 'Centro Civico Norte',
  aforo: 100,
  estado: 'activa',
};

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async onModuleInit() {
    await this.applyRuntimeMigrations();
    await this.ensureDemoData();
  }

  private async applyRuntimeMigrations() {
    await this.database.query(`
      alter table if exists firmas
      alter column archivo_id drop not null
    `);

    await this.database.query(`
      alter table if exists firmas
      add column if not exists data_url text
    `);

    await this.database.query(`
      alter table if exists registros_asistencia
      add column if not exists fecha_asistencia date
    `);

    await this.database.query(`
      update registros_asistencia
      set fecha_asistencia = timezone('Europe/Madrid', fecha_hora)::date
      where fecha_asistencia is null
    `);

    await this.database.query(`
      create index if not exists idx_registros_asistencia_fecha_asistencia
      on registros_asistencia(fecha_asistencia desc)
    `);

    await this.database.query(`
      create unique index if not exists idx_registros_asistencia_unique_daily_validated
      on registros_asistencia(actividad_id, asistente_id, fecha_asistencia)
      where estado = 'validado'
    `);
  }

  private async ensureDemoData() {
    await this.database.query('select 1');

    for (const user of DEMO_USERS) {
      const passwordHash = this.passwordService.hash(user.password);

      await this.database.query(
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
            true
          )
          on conflict (email) do update set
            role_id = excluded.role_id,
            nombre = excluded.nombre,
            apellidos = excluded.apellidos,
            telefono = excluded.telefono,
            password_hash = excluded.password_hash,
            activo = true,
            deleted_at = null,
            updated_at = timezone('utc', now())
        `,
        [
          user.id,
          user.role,
          user.nombre,
          user.apellidos,
          user.email,
          user.telefono,
          passwordHash,
        ],
      );

      if (user.responsableId) {
        await this.database.query(
          `
            insert into responsables (id, usuario_id, documento, cargo, observaciones)
            values ($1, $2, $3, $4, $5)
            on conflict (usuario_id) do update set
              documento = excluded.documento,
              cargo = excluded.cargo,
              observaciones = excluded.observaciones
          `,
          [
            user.responsableId,
            user.id,
            '12345678A',
            'Responsable de acceso',
            'Registro demo sembrado automaticamente',
          ],
        );
      }
    }

    await this.database.query(
      `
        insert into actividades (
          id, codigo, nombre, descripcion, fecha_inicio, fecha_fin,
          ubicacion, aforo, estado, responsable_id, created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        on conflict (codigo) do update set
          nombre = excluded.nombre,
          descripcion = excluded.descripcion,
          fecha_inicio = excluded.fecha_inicio,
          fecha_fin = excluded.fecha_fin,
          ubicacion = excluded.ubicacion,
          aforo = excluded.aforo,
          estado = excluded.estado,
          responsable_id = excluded.responsable_id,
          updated_at = timezone('utc', now())
      `,
      [
        DEMO_ACTIVITY.id,
        DEMO_ACTIVITY.codigo,
        DEMO_ACTIVITY.nombre,
        DEMO_ACTIVITY.descripcion,
        DEMO_ACTIVITY.fechaInicio,
        DEMO_ACTIVITY.fechaFin,
        DEMO_ACTIVITY.ubicacion,
        DEMO_ACTIVITY.aforo,
        DEMO_ACTIVITY.estado,
        'b19f0f22-b104-4382-92a2-f8fd8425cc65',
        '1737f8c3-f74d-4935-af6d-9d42059f92c4',
      ],
    );

    for (const attendee of DEMO_ATTENDEES) {
      await this.database.query(
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
        `,
        [
          attendee.id,
          attendee.dniNie,
          attendee.nombre,
          attendee.apellidos,
          attendee.telefono,
          attendee.email,
        ],
      );

      await this.database.query(
        `
          insert into actividad_asistentes (
            actividad_id, asistente_id, estado, observaciones
          )
          values ($1, $2, 'confirmado', 'Relacion demo')
          on conflict (actividad_id, asistente_id) do update set
            estado = excluded.estado,
            observaciones = excluded.observaciones
        `,
        [DEMO_ACTIVITY.id, attendee.id],
      );
    }

    this.logger.log('Datos demo sincronizados en PostgreSQL.');
  }
}
