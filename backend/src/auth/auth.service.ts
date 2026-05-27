import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  AccountApprovalStatus,
} from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  institutionalId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (![UserRole.STUDENT, UserRole.FACULTY, UserRole.LIBRARIAN].includes(dto.role)) {
      throw new BadRequestException(
        'Only student, faculty, or librarian accounts can be created via sign-up',
      );
    }

    const user = await this.usersService.registerPublicPending({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      institutionalId: dto.institutionalId,
      role: dto.role,
      gender: dto.gender,
    });

    return {
      message:
        'Your account has been submitted. A librarian will review and approve it before you can sign in.',
      email: user.email,
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    if (user.accountApprovalStatus === AccountApprovalStatus.PENDING) {
      throw new UnauthorizedException(
        'Your account is pending librarian approval. You will be able to sign in once approved.',
      );
    }
    if (user.accountApprovalStatus === AccountApprovalStatus.REJECTED) {
      throw new UnauthorizedException(
        'Your registration was not approved. Please contact the library for assistance.',
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.usersService.updateLastLogin(user.id);
    return user;
  }

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      institutionalId: user.institutionalId,
      eligibilityStatus: user.eligibilityStatus,
      profilePhotoUrl: user.profilePhotoUrl,
      barcode: user.barcode,
      gender: user.gender,
    };
  }

  login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionalId: user.institutionalId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        institutionalId: user.institutionalId,
        eligibilityStatus: user.eligibilityStatus,
        profilePhotoUrl: user.profilePhotoUrl,
        barcode: user.barcode,
        gender: user.gender,
      },
    };
  }
}
