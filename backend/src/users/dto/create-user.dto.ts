import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, Gender } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  institutionalId: string;

  @IsString()
  barcode: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  yearLevel?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
