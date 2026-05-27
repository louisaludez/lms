import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { TransactionsService } from './transactions.service';
import { CheckoutDto, ReturnDto, RenewalDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthReq = ExpressRequest & { user: { id: number; role: string } };

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  /** POST /api/v1/transactions/checkout */
  @Post('checkout')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  checkout(@Body() dto: CheckoutDto, @Request() req: AuthReq) {
    return this.txService.checkout(dto, req.user.id);
  }

  /** POST /api/v1/transactions/return */
  @Post('return')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  returnBook(@Body() dto: ReturnDto, @Request() req: AuthReq) {
    return this.txService.returnBook(dto, req.user.id);
  }

  /** POST /api/v1/transactions/renew */
  @Post('renew')
  renew(@Body() dto: RenewalDto, @Request() req: AuthReq) {
    return this.txService.renew(dto, req.user.id);
  }

  /** GET /api/v1/transactions/my */
  @Get('my')
  getMyTransactions(@Request() req: AuthReq) {
    return this.txService.findByUser(req.user.id);
  }

  /** GET /api/v1/transactions/my/active */
  @Get('my/active')
  getMyActive(@Request() req: AuthReq) {
    return this.txService.findActiveByUser(req.user.id);
  }

  /** GET /api/v1/transactions/history */
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getHistory() {
    return this.txService.findAllHistory();
  }

  /** GET /api/v1/transactions/stats */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getStats() {
    return this.txService.getStats();
  }

  /** GET /api/v1/transactions/user/:userId */
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getUserTransactions(@Param('userId', ParseIntPipe) userId: number) {
    return this.txService.findByUser(userId);
  }

  /** GET /api/v1/transactions/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.txService.findById(id);
  }
}
