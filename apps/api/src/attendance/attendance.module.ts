import { Module } from "@nestjs/common";
import { QrSessionsModule } from "../qr-sessions/qr-sessions.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [QrSessionsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService]
})
export class AttendanceModule {}
