import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class ListAttendeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;
}
