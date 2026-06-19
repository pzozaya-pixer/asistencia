import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const activityAttendeeStates = [
  'inscrito',
  'confirmado',
  'asistido',
  'ausente',
  'cancelado',
  'incidencia',
] as const;

export type ActivityAttendeeState = (typeof activityAttendeeStates)[number];

export class UpsertActivityAttendeeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  dniNie!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  apellidos!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(activityAttendeeStates)
  estado?: ActivityAttendeeState;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class UpdateActivityAttendeeDto {
  @IsOptional()
  @IsIn(activityAttendeeStates)
  estado?: ActivityAttendeeState;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
