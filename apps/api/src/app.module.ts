import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivitiesModule } from "./activities/activities.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AttendeesModule } from "./attendees/attendees.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    ActivitiesModule,
    AttendeesModule,
    AttendanceModule
  ]
})
export class AppModule {}

