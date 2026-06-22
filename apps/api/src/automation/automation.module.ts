import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AutomationController } from './automation.controller';
import { AutomationSecretGuard } from './automation-secret.guard';
import { AutomationService } from './automation.service';

@Module({
  imports: [DashboardModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationSecretGuard],
})
export class AutomationModule {}
