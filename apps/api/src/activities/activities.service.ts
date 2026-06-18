import { Injectable } from "@nestjs/common";
import { CreateActivityDto } from "./dto/create-activity.dto";

const activities = [
  {
    id: "act-1",
    codigo: "ACT-001",
    nombre: "Jornada de insercion laboral",
    fechaInicio: "2026-06-18T10:00:00.000Z",
    fechaFin: "2026-06-18T14:00:00.000Z",
    estado: "activa"
  }
];

@Injectable()
export class ActivitiesService {
  findAll() {
    return activities;
  }

  create(payload: CreateActivityDto) {
    const created = { id: `act-${activities.length + 1}`, ...payload, estado: "borrador" };
    activities.push(created);
    return created;
  }
}

