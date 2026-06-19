import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConsumeQrAttendanceDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
