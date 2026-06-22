import {
  Controller,
  Get,
  HttpCode,
  Res,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getStatus() {
    return {
      status: 'ok',
      service: 'asistencia-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HttpCode(200)
  async getReadiness(@Res() response: any) {
    const readiness = await this.healthService.getReadiness();
    response.status(readiness.status === 'ok' ? 200 : 503).json(readiness);
  }
}
