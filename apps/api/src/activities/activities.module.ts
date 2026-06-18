import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MockAuthGuard } from "../common/mock-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService } from "./activities.service";

@Module({
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    { provide: APP_GUARD, useClass: MockAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class ActivitiesModule {}

