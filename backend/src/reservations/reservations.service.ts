import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays } from 'date-fns';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsService {
  private readonly expiryDays: number;

  constructor(
    @InjectRepository(Reservation)
    private readonly resRepo: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly config: ConfigService,
  ) {
    this.expiryDays = this.config.get<number>('RESERVATION_EXPIRY_DAYS', 3);
  }

  async reserve(userId: number, bookId: number): Promise<Reservation> {
    const [user, book] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.bookRepo.findOne({ where: { id: bookId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!book) throw new NotFoundException('Book not found');

    const existing = await this.resRepo.findOne({
      where: {
        user: { id: userId },
        book: { id: bookId },
        status: ReservationStatus.PENDING,
      },
    });
    if (existing)
      throw new BadRequestException(
        'You already have a pending reservation for this book',
      );

    const res = this.resRepo.create({
      user,
      book,
      expiresAt: addDays(new Date(), this.expiryDays),
      status: ReservationStatus.PENDING,
    });

    return this.resRepo.save(res);
  }

  async cancelReservation(
    reservationId: number,
    userId: number,
  ): Promise<Reservation> {
    const res = await this.resRepo.findOne({
      where: { id: reservationId, user: { id: userId } },
    });
    if (!res) throw new NotFoundException('Reservation not found');
    if (res.status !== ReservationStatus.PENDING)
      throw new BadRequestException(
        'Only pending reservations can be cancelled',
      );
    res.status = ReservationStatus.CANCELLED;
    return this.resRepo.save(res);
  }

  async getUserReservations(userId: number): Promise<Reservation[]> {
    return this.resRepo.find({
      where: { user: { id: userId } },
      relations: ['book', 'book.category'],
      order: { reservedAt: 'DESC' },
    });
  }
}
