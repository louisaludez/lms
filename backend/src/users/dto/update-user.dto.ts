import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { UserRole, EligibilityStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  yearLevel?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsEnum(EligibilityStatus)
  eligibilityStatus?: EligibilityStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
