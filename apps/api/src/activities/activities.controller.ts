import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { MockAuthGuard } from "../common/mock-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { ActivitiesService } from "./activities.service";
import { CreateActivityDto } from "./dto/create-activity.dto";

@Controller("activities")
@UseGuards(MockAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles("super_admin", "responsable", "operador_lectura")
  findAll() {
    return this.activitiesService.findAll();
  }

  @Post()
  @Roles("super_admin", "responsable")
  create(@Body() payload: CreateActivityDto) {
    return this.activitiesService.create(payload);
  }
}

