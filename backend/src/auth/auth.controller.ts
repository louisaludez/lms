import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { IsEmail, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /** POST /api/v1/auth/login */
  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: ExpressRequest) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const user = await this.authService.validateUser(dto.email, dto.password, ipAddress, userAgent);
    return this.authService.login(user);
  }

  /** POST /api/v1/auth/logout */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: ExpressRequest & { user: { id: number; email: string; role: string } }) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const user = await this.usersService.findById(req.user.id);
    if (user) {
      await this.authService.logout(user, ipAddress, userAgent);
    }
    return { message: 'Logged out successfully' };
  }

  @Get('departments')
  getDepartments() {
    return this.usersService.getDepartments();
  }

  /** POST /api/v1/auth/register — self-service student account */
  @Post('register')
  @UseInterceptors(
    FileInterceptor('displayPicture', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async register(
    @Body() dto: RegisterDto,
    @Request() req: ExpressRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const profilePhotoUrl = file ? `/uploads/profiles/${file.filename}` : null;
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, profilePhotoUrl, ipAddress, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @Request()
    req: ExpressRequest & { user: { id: number; email: string; role: string } },
  ) {
    return this.authService.getProfile(req.user.id);
  }

  /** POST /api/v1/auth/forgot-password — request password reset email */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.usersService.requestPasswordReset(dto.email);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  /** POST /api/v1/auth/reset-password — reset password with token */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.usersService.resetPassword(dto.token, dto.email, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }
}
