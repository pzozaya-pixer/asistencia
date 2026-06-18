import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString:
        this.configService.get<string>('DATABASE_URL') ??
        'postgresql://postgres:postgres@postgres:5432/asistencia',
    });
  }

  query<T extends QueryResultRow>(text: string, params: readonly unknown[] = []) {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
