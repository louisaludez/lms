import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthReq = ExpressRequest & { user: { id: number } };

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /** POST /api/v1/reservations/book/:bookId */
  @Post('book/:bookId')
  reserve(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Request() req: AuthReq,
  ) {
    return this.reservationsService.reserve(req.user.id, bookId);
  }

  /** GET /api/v1/reservations/my */
  @Get('my')
  getMyReservations(@Request() req: AuthReq) {
    return this.reservationsService.getUserReservations(req.user.id);
  }

  /** DELETE /api/v1/reservations/:id */
  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req: AuthReq) {
    return this.reservationsService.cancelReservation(id, req.user.id);
  }
}
