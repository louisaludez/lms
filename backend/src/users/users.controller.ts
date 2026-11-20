import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';

type AuthReq = ExpressRequest & { user: { id: number; role: string } };

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'lumina/profiles',
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  }),
});

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getClientInfo(req: AuthReq) {
    return {
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  /** GET /api/v1/users/profile */
  @Get('profile')
  getProfile(@Request() req: AuthReq) {
    return this.usersService.getProfile(req.user.id);
  }

  /** PATCH /api/v1/users/me/profile */
  @Patch('me/profile')
  @UseInterceptors(
    FileInterceptor('displayPicture', { storage: profileStorage }),
  )
  updateProfile(
    @Request() req: AuthReq,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.profilePhotoUrl = (file as any).path; // Cloudinary secure URL
    }
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.usersService.updateProfile(req.user.id, dto, ipAddress, userAgent);
  }

  /** PATCH /api/v1/users/me/password */
  @Patch('me/password')
  changePassword(@Request() req: AuthReq, @Body() dto: ChangePasswordDto) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.usersService.changePassword(req.user.id, dto, ipAddress, userAgent);
  }

  /** GET /api/v1/users/departments */
  @Get('departments')
  getDepartments() {
    return this.usersService.getDepartments();
  }

  /** GET /api/v1/users?search=&role= — Librarian/Admin: list all users */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.usersService.findAll(
      search,
      role,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      approvalStatus,
      isActive,
      sortBy,
      sortOrder,
    );
  }

  /** GET /api/v1/users/:id */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @UseInterceptors(
    FileInterceptor('displayPicture', { storage: profileStorage }),
  )
  create(
    @Request() req: AuthReq,
    @Body() dto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.profilePhotoUrl = (file as any).path;
    }
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.usersService.create(dto, ipAddress, userAgent);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @UseInterceptors(
    FileInterceptor('displayPicture', { storage: profileStorage }),
  )
  update(
    @Request() req: AuthReq,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.profilePhotoUrl = (file as any).path;
    }
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.usersService.update(id, dto, req.user.role as UserRole, req.user.id, ipAddress, userAgent);
  }

  /** DELETE /api/v1/users/:id — Soft-delete (deactivate) user */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: AuthReq, @Param('id', ParseIntPipe) id: number) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.usersService.remove(id, req.user.id, ipAddress, userAgent);
  }
}