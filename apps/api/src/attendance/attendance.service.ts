import { Injectable } from "@nestjs/common";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";

const records: Array<Record<string, string>> = [];

@Injectable()
export class AttendanceService {
  create(payload: CreateAttendanceDto) {
    const created = {
      id: `reg-${records.length + 1}`,
      ...payload,
      estado: "validado",
      fechaHora: new Date().toISOString()
    };
    records.push(created);
    return created;
  }

  findAll() {
    return records;
  }
}

