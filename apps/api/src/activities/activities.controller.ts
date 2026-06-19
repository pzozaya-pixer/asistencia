import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/token.service';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import {
  UpdateActivityAttendeeDto,
  UpsertActivityAttendeeDto,
} from './dto/activity-attendee.dto';
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

  @Get(':id/attendees')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  findAttendees(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.activitiesService.findAttendees(id, request.user);
  }

  @Post(':id/attendees')
  @Roles(Role.SuperAdmin, Role.Responsable)
  addAttendee(
    @Param('id') id: string,
    @Body() payload: UpsertActivityAttendeeDto,
    @Req() request: RequestWithUser,
  ) {
    return this.activitiesService.addAttendee(id, payload, request.user);
  }

  @Patch(':id/attendees/:attendeeId')
  @Roles(Role.SuperAdmin, Role.Responsable)
  updateAttendee(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Body() payload: UpdateActivityAttendeeDto,
    @Req() request: RequestWithUser,
  ) {
    return this.activitiesService.updateAttendee(
      id,
      attendeeId,
      payload,
      request.user,
    );
  }

  @Delete(':id/attendees/:attendeeId')
  @Roles(Role.SuperAdmin, Role.Responsable)
  removeAttendee(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.activitiesService.removeAttendee(id, attendeeId, request.user);
  }

  @Post(':id/attendees/import')
  @Roles(Role.SuperAdmin, Role.Responsable)
  @UseInterceptors(FileInterceptor('file'))
  importAttendees(
    @Param('id') id: string,
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Req() request: RequestWithUser,
  ) {
    return this.activitiesService.importAttendeesFromWorkbook(
      id,
      file,
      request.user,
    );
  }
}
