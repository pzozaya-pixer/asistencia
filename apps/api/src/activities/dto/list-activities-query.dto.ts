import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListActivitiesQueryDto {
  @IsOptional()
  @IsIn(['draft', 'published', 'completed'])
  status?: 'draft' | 'published' | 'completed';

  @IsOptional()
  @IsString()
  search?: string;
}
