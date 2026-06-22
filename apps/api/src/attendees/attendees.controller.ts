import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '../auth/token.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SearchAttendeeDto } from './dto/search-attendee.dto';
import { UpsertAttendeeDto } from './dto/upsert-attendee.dto';
import { AttendeesService } from './attendees.service';

type RequestWithUser = {
  user: AuthenticatedUser;
};

@Controller('attendees')
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Public()
  @Get('public')
  findPublic(@Query() query: SearchAttendeeDto) {
    return this.attendeesService.findPublic(query.q);
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  findAll(@Query() query: SearchAttendeeDto) {
    return this.attendeesService.findAll(query.q);
  }

  @Post()
  @Roles(Role.SuperAdmin, Role.Responsable)
  create(@Body() payload: UpsertAttendeeDto) {
    return this.attendeesService.create(payload);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin, Role.Responsable)
  update(@Param('id') id: string, @Body() payload: UpsertAttendeeDto) {
    return this.attendeesService.update(id, payload);
  }

  @Public()
  @Post(':id/public-photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPublicPhoto(
    @Param('id') id: string,
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  ) {
    return this.attendeesService.uploadPublicPhoto(id, file);
  }

  @Post(':id/photo')
  @Roles(Role.SuperAdmin, Role.Responsable)
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Req() request: RequestWithUser,
  ) {
    return this.attendeesService.uploadPhoto(id, file, request.user);
  }

  @Get(':id/photo')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  async getPhoto(@Param('id') id: string, @Res() response: any) {
    const file = await this.attendeesService.getPhotoFile(id);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalName}"`,
    );

    return response.send(file.buffer);
  }

  @Get(':id/photo-url')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  getPhotoUrl(@Param('id') id: string) {
    return this.attendeesService.getPhotoUrl(id);
  }
}
