import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
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

  /** GET /api/v1/users/:id */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  /** POST /api/v1/users */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
