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
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

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

  /** GET /api/v1/users/departments */
  @Get('departments')
  getDepartments() {
    return this.usersService.getDepartments();
  }

  /** GET /api/v1/users?search=&role= — Librarian/Admin: list all users */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  findAll(
    @Query('search') search?: string, 
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(
      search, 
      role,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  /** GET /api/v1/users/:id */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  /** POST /api/v1/users — Create new user */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /** PATCH /api/v1/users/:id — Update user */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /** DELETE /api/v1/users/:id — Soft-delete (deactivate) user */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
