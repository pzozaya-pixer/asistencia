import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ActivityStatus } from './create-activity.dto';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  aforo?: number;

  @IsOptional()
  @IsEnum(ActivityStatus)
  estado?: ActivityStatus;

  @IsOptional()
  @IsString()
  responsableUserId?: string;
}
