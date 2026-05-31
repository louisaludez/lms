import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, Gender } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  @MaxLength(180)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @MaxLength(80)
  lastName: string;

  @IsString()
  @MaxLength(30)
  institutionalId: string;

  @IsIn([UserRole.STUDENT, UserRole.FACULTY, UserRole.LIBRARIAN])
  role: UserRole.STUDENT | UserRole.FACULTY | UserRole.LIBRARIAN;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departmentId?: number;
}
