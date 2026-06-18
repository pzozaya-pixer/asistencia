import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/token.service';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

type RequestWithUser = {
  user: AuthenticatedUser;
};

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  findAll() {
    return this.activitiesService.findAll();
  }

  @Post()
  @Roles(Role.SuperAdmin, Role.Responsable)
  create(@Body() payload: CreateActivityDto, @Req() request: RequestWithUser) {
    return this.activitiesService.create(payload, request.user);
  }
}
