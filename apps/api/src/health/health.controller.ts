import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getStatus() {
    return {
      status: "ok",
      service: "asistencia-api",
      timestamp: new Date().toISOString()
    };
  }
}

