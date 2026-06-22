import { Controller, Get, Query, Res } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('export/excel')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  async exportExcel(
    @Query('activityId') activityId: string | undefined,
    @Query('attendanceDate') attendanceDate: string | undefined,
    @Res() response: any,
  ) {
    const file = await this.dashboardService.exportActiveActivityExcel(
      activityId,
      attendanceDate,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.buffer);
  }

  @Get('export/pdf')
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  async exportPdf(
    @Query('activityId') activityId: string | undefined,
    @Query('attendanceDate') attendanceDate: string | undefined,
    @Res() response: any,
  ) {
    const file = await this.dashboardService.exportActiveActivityPdf(
      activityId,
      attendanceDate,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.buffer);
  }
}
