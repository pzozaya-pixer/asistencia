import { Controller, Get, Query } from "@nestjs/common";
import { SearchAttendeeDto } from "./dto/search-attendee.dto";
import { AttendeesService } from "./attendees.service";

@Controller("attendees")
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Get()
  findAll(@Query() query: SearchAttendeeDto) {
    return this.attendeesService.findAll(query.q);
  }
}

