import { Body, Controller, Get, Post } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";

@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }

  @Post()
  create(@Body() payload: CreateAttendanceDto) {
    return this.attendanceService.create(payload);
  }
}

