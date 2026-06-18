import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListAttendanceQueryDto {
  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsString()
  attendeeId?: string;

  @IsOptional()
  @IsIn(['present', 'late', 'absent'])
  status?: 'present' | 'late' | 'absent';
}
