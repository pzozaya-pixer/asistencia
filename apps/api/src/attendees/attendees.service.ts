import { Injectable } from "@nestjs/common";

const attendees = [
  {
    id: "ast-1",
    dniNie: "12345678A",
    telefono: "600123123",
    nombre: "Lucia",
    apellidos: "Moreno",
    actividad: "Jornada de insercion laboral"
  }
];

@Injectable()
export class AttendeesService {
  findAll(query?: string) {
    if (!query) {
      return attendees;
    }
    return attendees.filter((attendee) =>
      [attendee.dniNie, attendee.telefono, attendee.nombre, attendee.apellidos]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }
}

