import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BookRequest,
  BookRequestType,
  BookRequestStatus,
} from './entities/book-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { Category } from '../books/entities/category.entity';
import {
  CreateBorrowRequestDto,
  CreateAcquisitionRequestDto,
  UpdateRequestStatusDto,
} from './dto/book-request.dto';
import { ActivityLogService, ActivityAction, ActivityResource } from '../activity-log/activity-log.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class BookRequestsService {
  constructor(
    @InjectRepository(BookRequest)
    private readonly reqRepo: Repository<BookRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly activityLogService: ActivityLogService,
    private readonly booksService: BooksService,
  ) {}

  /** Faculty requests to borrow an existing book */
  async createBorrowRequest(
    userId: number,
    dto: CreateBorrowRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FACULTY)
      throw new ForbiddenException(
        'Only faculty members can create book requests',
      );

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

    const saved = await this.reqRepo.save(request);

    // Log activity
    await this.activityLogService.logBookRequest(
      userId,
      saved.id,
      { bookId: book.id, bookTitle: book.title, reason: dto.reason },
      ipAddress,
      userAgent,
    );

    return saved;
  }

  /** Faculty requests to hold an existing book (decreases available copies) */
  async createHoldRequest(
    userId: number,
    dto: CreateBorrowRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FACULTY)
      throw new ForbiddenException(
        'Only faculty members can create book requests',
      );

    const book = await this.bookRepo.findOne({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException('Book not found');

    // Check for existing pending hold request
    const existing = await this.reqRepo.findOne({
      where: {
        user: { id: userId },
        book: { id: dto.bookId },
        requestType: BookRequestType.HOLD,
        status: BookRequestStatus.PENDING,
      },
    });
    if (existing)
      throw new BadRequestException(
        'You already have a pending hold request for this book',
      );

    // Check if book is available for hold
    if (book.availableCopies <= 0)
      throw new BadRequestException(
        'No available copies to place a hold on',
      );

    // Check if book is reference only
    if (book.isReferenceOnly)
      throw new BadRequestException(
        'Cannot place hold on reference-only books',
      );

    const request = this.reqRepo.create();
    Object.assign(request, {
      user,
      book,
      requestType: BookRequestType.HOLD,
      reason: dto.reason ?? null,
      status: BookRequestStatus.PENDING,
    });

    const saved = await this.reqRepo.save(request);

    // Decrease available copies by 1
    await this.booksService.decrementAvailable(book.id);

    // Log activity
    await this.activityLogService.logBookRequest(
      userId,
      saved.id,
      { bookId: book.id, bookTitle: book.title, reason: dto.reason, type: 'hold' },
      ipAddress,
      userAgent,
    );

    return saved;
  }

  /** Faculty requests the library to acquire a new book */
  async createAcquisitionRequest(
    userId: number,
    dto: CreateAcquisitionRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FACULTY)
      throw new ForbiddenException(
        'Only faculty members can create book requests',
      );

    let category: Category | null = null;
    if (dto.categoryId) {
      category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
    }

    const request = this.reqRepo.create();
    Object.assign(request, {
      user,
      requestType: BookRequestType.ACQUISITION,
      itemType: dto.itemType || 'Books',
      title: dto.title,
      otherTitle: dto.otherTitle ?? null,
      author: dto.author ?? null,
      isbn: dto.isbn ?? null,
      issn: dto.issn ?? null,
      callNumber: dto.callNumber ?? null,
      edition: dto.edition ?? null,
      publishYear: dto.publishYear ?? null,
      category: category ?? null,
      publisher: dto.publisher ?? null,
      language: dto.language ?? 'English',
      description: dto.description ?? null,
      locationShelf: dto.locationShelf ?? null,
      reason: dto.reason,
      status: BookRequestStatus.PENDING,
    });

    const saved = await this.reqRepo.save(request);

    // Log activity
    await this.activityLogService.logBookRequest(
      userId,
      saved.id,
      { title: dto.title, author: dto.author, isbn: dto.isbn, itemType: dto.itemType, reason: dto.reason },
      ipAddress,
      userAgent,
    );

    return saved;
  }

  /** Get all requests by a specific faculty user */
  async getMyRequests(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{
    data: BookRequest[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const whereClause: any = { user: { id: userId } };
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await this.reqRepo.findAndCount({
      where: whereClause,
      relations: ['book', 'book.category', 'category', 'librarian'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  /** Librarian: get all book requests */
  async getAllRequests(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{
    data: BookRequest[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await this.reqRepo.findAndCount({
      where: whereClause,
      relations: [
        'user',
        'user.department',
        'book',
        'book.category',
        'category',
        'librarian',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
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
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookRequest> {
    const request = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['user', 'book'],
    });
    if (!request) throw new NotFoundException('Book request not found');

    const librarian = await this.userRepo.findOne({
      where: { id: librarianId },
    });

    const previousStatus = request.status;
    const isHoldRequest = request.requestType === BookRequestType.HOLD;
    const book = request.book;

    request.status = dto.status as BookRequestStatus;
    request.librarian = librarian ?? null;
    request.librarianNotes = dto.librarianNotes ?? null;
    request.processedAt = new Date();

    const saved = await this.reqRepo.save(request);

    // Handle available copies for hold requests
    if (isHoldRequest && book) {
      // If hold is rejected, increment available copies back (hold cancelled)
      if (dto.status === BookRequestStatus.REJECTED) {
        await this.booksService.incrementAvailable(book.id);
      }
      // If hold is fulfilled, available copies stays decremented (book is now checked out)
      // If hold is approved, available copies stays decremented (hold confirmed)
    }

    // Log activity based on status change
    if (previousStatus === BookRequestStatus.PENDING) {
      if (dto.status === BookRequestStatus.APPROVED) {
        await this.activityLogService.logApproveBookRequest(
          librarianId,
          requestId,
          { previousStatus, newStatus: dto.status, notes: dto.librarianNotes, bookTitle: request.book?.title },
          ipAddress,
          userAgent,
        );
      } else if (dto.status === BookRequestStatus.REJECTED) {
        await this.activityLogService.logRejectBookRequest(
          librarianId,
          requestId,
          { previousStatus, newStatus: dto.status, notes: dto.librarianNotes, bookTitle: request.book?.title },
          ipAddress,
          userAgent,
        );
      }
    }

    return saved;
  }
}
