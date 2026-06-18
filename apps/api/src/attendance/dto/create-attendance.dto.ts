import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateAttendanceDto {
  @IsString()
  actividadId!: string;

  @IsString()
  asistenteId!: string;

  @IsIn(["qr", "manual"])
  metodoRegistro!: "qr" | "manual";

  @IsOptional()
  @IsString()
  observaciones?: string;
}

