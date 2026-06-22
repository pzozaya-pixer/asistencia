import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async getReadiness() {
    const [database, storage] = await Promise.allSettled([
      this.databaseService.query('select 1'),
      this.storageService.checkConnection(),
    ]);

    const checks = {
      api: 'ok' as const,
      database: database.status === 'fulfilled' ? ('ok' as const) : ('error' as const),
      storage: storage.status === 'fulfilled' ? ('ok' as const) : ('error' as const),
    };

    const ready = checks.database === 'ok' && checks.storage === 'ok';

    return {
      status: ready ? ('ok' as const) : ('degraded' as const),
      service: 'asistencia-api',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
