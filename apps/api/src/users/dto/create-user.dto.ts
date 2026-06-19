import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  apellidos!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
