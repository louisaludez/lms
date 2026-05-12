import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BookRequest,
  BookRequestType,
  BookRequestStatus,
} from './entities/book-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import {
  CreateBorrowRequestDto,
  CreateAcquisitionRequestDto,
  UpdateRequestStatusDto,
} from './dto/book-request.dto';

@Injectable()
export class BookRequestsService {
  constructor(
    @InjectRepository(BookRequest)
    private readonly reqRepo: Repository<BookRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
  ) {}

  /** Faculty requests to borrow an existing book */
  async createBorrowRequest(
    userId: number,
    dto: CreateBorrowRequestDto,
  ): Promise<BookRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FACULTY)
      throw new ForbiddenException('Only faculty members can create book requests');

    const book = await this.bookRepo.findOne({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException('Book not found');

    // Check for existing pending borrow request
    const existing = await this.reqRepo.findOne({
      where: {
        user: { id: userId },
        book: { id: dto.bookId },
        requestType: BookRequestType.BORROW,
        status: BookRequestStatus.PENDING,
      },
    });
    if (existing)
      throw new BadRequestException(
        'You already have a pending borrow request for this book',
      );

    const request = this.reqRepo.create();
    Object.assign(request, {
      user,
      book,
      requestType: BookRequestType.BORROW,
      reason: dto.reason ?? null,
      status: BookRequestStatus.PENDING,
    });

    return this.reqRepo.save(request);
  }

  /** Faculty requests the library to acquire a new book */
  async createAcquisitionRequest(
    userId: number,
    dto: CreateAcquisitionRequestDto,
  ): Promise<BookRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FACULTY)
      throw new ForbiddenException('Only faculty members can create book requests');

    const request = this.reqRepo.create();
    Object.assign(request, {
      user,
      requestType: BookRequestType.ACQUISITION,
      title: dto.title,
      author: dto.author ?? null,
      isbn: dto.isbn ?? null,
      publisher: dto.publisher ?? null,
      reason: dto.reason,
      status: BookRequestStatus.PENDING,
    });

    return this.reqRepo.save(request);
  }

  /** Get all requests by a specific faculty user */
  async getMyRequests(userId: number): Promise<BookRequest[]> {
    return this.reqRepo.find({
      where: { user: { id: userId } },
      relations: ['book', 'book.category', 'librarian'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Librarian: get all book requests */
  async getAllRequests(): Promise<BookRequest[]> {
    return this.reqRepo.find({
      relations: ['user', 'user.department', 'book', 'book.category', 'librarian'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Librarian: get pending requests count */
  async getPendingCount(): Promise<number> {
    return this.reqRepo.count({
      where: { status: BookRequestStatus.PENDING },
    });
  }

  /** Librarian: update request status (approve/reject/fulfill) */
  async updateStatus(
    requestId: number,
    librarianId: number,
    dto: UpdateRequestStatusDto,
  ): Promise<BookRequest> {
    const request = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['user', 'book'],
    });
    if (!request) throw new NotFoundException('Book request not found');

    const librarian = await this.userRepo.findOne({
      where: { id: librarianId },
    });

    request.status = dto.status as BookRequestStatus;
    request.librarian = librarian ?? null;
    request.librarianNotes = dto.librarianNotes ?? null;
    request.processedAt = new Date();

    return this.reqRepo.save(request);
  }
}
