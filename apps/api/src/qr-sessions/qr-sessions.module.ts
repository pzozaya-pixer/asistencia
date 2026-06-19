import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { QrSessionsController } from './qr-sessions.controller';
import { QrSessionsService } from './qr-sessions.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [QrSessionsController],
  providers: [QrSessionsService],
})
export class QrSessionsModule {}
