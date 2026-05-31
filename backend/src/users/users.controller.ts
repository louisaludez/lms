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
import { diskStorage } from 'multer';
import { extname } from 'path';
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

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/v1/users/profile */
  @Get('profile')
  getProfile(@Request() req: AuthReq) {
    return this.usersService.getProfile(req.user.id);
  }

  /** PATCH /api/v1/users/me/profile */
  @Patch('me/profile')
  @UseInterceptors(
    FileInterceptor('displayPicture', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  updateProfile(
    @Request() req: AuthReq,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.profilePhotoUrl = `/uploads/profiles/${file.filename}`;
    }
    return this.usersService.updateProfile(req.user.id, dto);
  }

  /** PATCH /api/v1/users/me/password */
  @Patch('me/password')
  changePassword(@Request() req: AuthReq, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
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
  ) {
    return this.usersService.findAll(
      search,
      role,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      approvalStatus,
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
    FileInterceptor('displayPicture', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  create(@Body() dto: CreateUserDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      dto.profilePhotoUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/profiles/${file.filename}`;
    }
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @UseInterceptors(
    FileInterceptor('displayPicture', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  update(
    @Request() req: AuthReq,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      dto.profilePhotoUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/profiles/${file.filename}`;
    }
    return this.usersService.update(id, dto, req.user.role as UserRole);
  }

  /** DELETE /api/v1/users/:id — Soft-delete (deactivate) user */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
