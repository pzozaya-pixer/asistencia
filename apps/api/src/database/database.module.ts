import { Global, Module } from '@nestjs/common';
import { DatabaseSeedService } from './database.seed.service';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService, DatabaseSeedService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
