import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateQrSessionDto {
  @IsUUID()
  attendeeId!: string;

  @IsUUID()
  activityId!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  ttlSeconds?: number;
}
