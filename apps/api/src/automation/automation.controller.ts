import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { AutomationSecretGuard } from './automation-secret.guard';
import { AutomationService } from './automation.service';

@Public()
@RateLimit('automation', 30, 60)
@UseGuards(AutomationSecretGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('daily-summary')
  getDailySummary(@Query('date') date?: string) {
    return this.automationService.getDailySummary(date);
  }

  @Get('pending-validations')
  getPendingValidations(@Query('date') date?: string) {
    return this.automationService.getPendingValidationsAlert(date);
  }

  @Get('export-bundle')
  getExportBundle() {
    return this.automationService.createActiveActivityExportBundle();
  }
}
