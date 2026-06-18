import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/token.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

type RequestWithUser = {
  user: AuthenticatedUser;
};

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  findAll() {
    return this.attendanceService.findAll();
  }

  @Post()
  @Roles(Role.SuperAdmin, Role.Responsable)
  create(@Body() payload: CreateAttendanceDto, @Req() request: RequestWithUser) {
    return this.attendanceService.create(payload, request.user);
  }
}
