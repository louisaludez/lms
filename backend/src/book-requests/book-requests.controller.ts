import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { BookRequestsService } from './book-requests.service';
import {
  CreateBorrowRequestDto,
  CreateAcquisitionRequestDto,
  UpdateRequestStatusDto,
} from './dto/book-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthReq = ExpressRequest & { user: { id: number; role: string } };

@Controller('book-requests')
@UseGuards(JwtAuthGuard)
export class BookRequestsController {
  constructor(private readonly service: BookRequestsService) {}

  /** POST /api/v1/book-requests/borrow — Faculty requests to borrow a book */
  @Post('borrow')
  @UseGuards(RolesGuard)
  @Roles('faculty')
  createBorrowRequest(@Body() dto: CreateBorrowRequestDto, @Request() req: AuthReq) {
    return this.service.createBorrowRequest(req.user.id, dto);
  }

  /** POST /api/v1/book-requests/acquisition — Faculty requests a new book acquisition */
  @Post('acquisition')
  @UseGuards(RolesGuard)
  @Roles('faculty')
  createAcquisitionRequest(
    @Body() dto: CreateAcquisitionRequestDto,
    @Request() req: AuthReq,
  ) {
    return this.service.createAcquisitionRequest(req.user.id, dto);
  }

  /** GET /api/v1/book-requests/my — Faculty gets their own requests */
  @Get('my')
  getMyRequests(@Request() req: AuthReq) {
    return this.service.getMyRequests(req.user.id);
  }

  /** GET /api/v1/book-requests — Librarian gets all requests */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  getAllRequests() {
    return this.service.getAllRequests();
  }

  /** GET /api/v1/book-requests/pending-count — Librarian gets pending count */
  @Get('pending-count')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  getPendingCount() {
    return this.service.getPendingCount();
  }

  /** PATCH /api/v1/book-requests/:id/status — Librarian updates request status */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'admin')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestStatusDto,
    @Request() req: AuthReq,
  ) {
    return this.service.updateStatus(id, req.user.id, dto);
  }
}
