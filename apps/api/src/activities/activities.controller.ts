import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/token.service';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

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

  @Patch(':id')
  @Roles(Role.SuperAdmin, Role.Responsable)
  update(
    @Param('id') id: string,
    @Body() payload: UpdateActivityDto,
    @Req() request: RequestWithUser,
  ) {
    return this.activitiesService.update(id, payload, request.user);
  }
}
