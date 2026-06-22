import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SignaturePayloadDto {
  @IsString()
  @MinLength(32)
  dataUrl!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  width!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  height!: number;
}

export class ConsumeQrAttendanceDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsDateString()
  attendanceDate!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @Type(() => Boolean)
  @IsBoolean()
  validacionVisual!: boolean;

  @ValidateNested()
  @Type(() => SignaturePayloadDto)
  firma!: SignaturePayloadDto;
}
