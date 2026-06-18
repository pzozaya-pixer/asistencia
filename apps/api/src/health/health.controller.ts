import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getStatus() {
    return {
      status: 'ok',
      service: 'asistencia-api',
      timestamp: new Date().toISOString(),
    };
  }
}
