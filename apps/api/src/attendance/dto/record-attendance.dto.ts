import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordAttendanceDto {
  @IsString()
  @MinLength(4)
  activityId!: string;

  @IsString()
  @MinLength(4)
  attendeeId!: string;

  @IsIn(['present', 'late', 'absent'])
  status!: 'present' | 'late' | 'absent';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
