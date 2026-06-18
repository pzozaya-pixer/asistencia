import { IsOptional, IsString, MinLength } from "class-validator";

export class SearchAttendeeDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  q?: string;
}

