import { IsString, MinLength } from 'class-validator';

export class ResolveQrSessionDto {
  @IsString()
  @MinLength(20)
  token!: string;
}
