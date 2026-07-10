import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { User, EligibilityStatus } from '../users/entities/user.entity';
import { BooksService } from '../books/books.service';
import { CheckoutDto, ReturnDto, RenewalDto } from './dto/transaction.dto';
import { addDays, differenceInDays, isAfter, parseISO } from 'date-fns';

const MAX_RENEWALS = 2;
const MAX_BORROWS = 3; // max concurrent books per user

@Injectable()
export class TransactionsService {
  private readonly borrowDays: number;
  private readonly finePerDay: number;

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly booksService: BooksService,
    private readonly config: ConfigService,
  ) {
    this.borrowDays = this.config.get<number>('BORROW_DAYS', 7);
    this.finePerDay = this.config.get<number>('FINE_PER_DAY', 5);
  }

  // ─── CHECKOUT ────────────────────────────────────────────────────────────────
  async checkout(dto: CheckoutDto, librarianId: number): Promise<Transaction> {
    const user = await this.userRepo.findOne({
      where: { barcode: dto.userBarcode },
    });
    if (!user)
      throw new NotFoundException(
        `User with barcode ${dto.userBarcode} not found`,
      );
    if (!user.isActive)
      throw new ForbiddenException('User account is inactive');
    if (user.eligibilityStatus === EligibilityStatus.SUSPENDED)
      throw new ForbiddenException(
        'User is suspended due to overdue books. Please settle fines first.',
      );
    if (user.eligibilityStatus === EligibilityStatus.EXPELLED)
      throw new ForbiddenException('User is not eligible to borrow books');

    // Dynamic check for overdue books
    const todayStr = new Date().toISOString().split('T')[0];
    const userTransactions = await this.txRepo.find({
      where: [
        { user: { id: user.id }, status: TransactionStatus.ACTIVE },
        { user: { id: user.id }, status: TransactionStatus.OVERDUE }
      ],
    });

    const hasOverdue = userTransactions.some(
      (tx) =>
        tx.status === TransactionStatus.OVERDUE ||
        (tx.status === TransactionStatus.ACTIVE && tx.dueDate < todayStr),
    );

    if (hasOverdue) {
      throw new ForbiddenException(
        'User has overdue books. Please return them and settle any fines first.',
      );
    }

    // Check concurrent borrow limit
    const activeBorrows = userTransactions.filter(
      (tx) => tx.status === TransactionStatus.ACTIVE
    ).length;
    if (activeBorrows >= MAX_BORROWS)
      throw new BadRequestException(
        `User has reached the maximum of ${MAX_BORROWS} concurrent borrows`,
      );

    const copy = await this.booksService.findCopyByBarcode(dto.bookCopyBarcode);
    if (!copy.isActive)
      throw new BadRequestException('This copy is not available');

    // Check if this specific copy is already borrowed
    const existingActive = await this.txRepo.findOne({
      where: { bookCopy: { id: copy.id }, status: TransactionStatus.ACTIVE },
    });
    if (existingActive)
      throw new BadRequestException('This copy is already checked out');

    if (copy.book.isReferenceOnly)
      throw new BadRequestException('Reference books cannot be borrowed');

    let dueDate = addDays(new Date(), this.borrowDays);
    if (dto.dueDate) {
      const parsed = parseISO(dto.dueDate);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      }
    }

    const tx = this.txRepo.create({
      user,
      bookCopy: copy,
      librarian: { id: librarianId } as User,
      transactionType: TransactionType.CHECKOUT,
      dueDate: dueDate.toISOString().split('T')[0],
      status: TransactionStatus.ACTIVE,
      notes: dto.notes,
    });

    const saved = await this.txRepo.save(tx);

    // Decrement available copies
    await this.booksService.decrementAvailable(copy.book.id);

    return this.findById(saved.id);
  }

  // ─── RETURN ──────────────────────────────────────────────────────────────────
  async returnBook(dto: ReturnDto, librarianId: number): Promise<Transaction> {
    const copy = await this.booksService.findCopyByBarcode(dto.bookCopyBarcode);

    const tx = await this.txRepo.findOne({
      where: { bookCopy: { id: copy.id }, status: TransactionStatus.ACTIVE },
      relations: ['user', 'bookCopy', 'bookCopy.book'],
    });
    if (!tx) {
      // Also check overdue status
      const overdueTx = await this.txRepo.findOne({
        where: { bookCopy: { id: copy.id }, status: TransactionStatus.OVERDUE },
        relations: ['user', 'bookCopy', 'bookCopy.book'],
      });
      if (!overdueTx)
        throw new NotFoundException(
          'No active or overdue transaction found for this copy',
        );
      return this._processReturn(overdueTx, librarianId, dto.notes);
    }

    return this._processReturn(tx, librarianId, dto.notes);
  }

  private async _processReturn(
    tx: Transaction,
    librarianId: number,
    notes?: string,
  ): Promise<Transaction> {
    const today = new Date();
    const due = parseISO(tx.dueDate);
    const overdueDays = Math.max(0, differenceInDays(today, due));
    const fine = overdueDays * this.finePerDay;

    tx.returnDate = today;
    tx.status = TransactionStatus.RETURNED;
    tx.transactionType = TransactionType.RETURN;
    tx.overdueDays = overdueDays;
    tx.fineAmount = fine;
    tx.librarian = { id: librarianId } as User;
    if (notes) tx.notes = notes;

    await this.txRepo.save(tx);

    // Increment available copies
    await this.booksService.incrementAvailable(tx.bookCopy.book.id);

    // If fine is zero, lift suspension (if this was the only overdue item)
    if (overdueDays === 0) {
      await this._checkAndLiftSuspension(tx.user.id);
    }

    return this.findById(tx.id);
  }

  // ─── RENEWAL ─────────────────────────────────────────────────────────────────
  async renew(dto: RenewalDto, requestingUser: { id: number; role: string }): Promise<Transaction> {
    if (!dto.transactionId && !dto.bookCopyBarcode) {
      throw new BadRequestException('Must provide either transactionId or bookCopyBarcode');
    }

    const whereClause: any = { status: TransactionStatus.ACTIVE };
    if (dto.transactionId) {
      whereClause.id = dto.transactionId;
    } else {
      whereClause.bookCopy = { barcode: dto.bookCopyBarcode };
    }

    const tx = await this.txRepo.findOne({
      where: whereClause,
      relations: ['user', 'bookCopy', 'bookCopy.book'],
    });

    if (!tx) throw new NotFoundException('Active transaction not found');

    if (requestingUser.role === 'student' && tx.user.id !== requestingUser.id) {
      throw new ForbiddenException('You can only renew your own books');
    }

    if (tx.renewalCount >= MAX_RENEWALS)
      throw new BadRequestException(
        `Maximum of ${MAX_RENEWALS} renewals reached`,
      );

    let newDue = addDays(parseISO(tx.dueDate), this.borrowDays);
    if (dto.dueDate) {
      const parsed = parseISO(dto.dueDate);
      if (!isNaN(parsed.getTime())) {
        newDue = parsed;
      }
    }

    tx.dueDate = newDue.toISOString().split('T')[0];
    tx.renewalCount += 1;
    tx.transactionType = TransactionType.RENEWAL;

    return this.txRepo.save(tx);
  }

  // ─── GET USER TRANSACTIONS ────────────────────────────────────────────────────
  async findByUser(userId: number): Promise<Transaction[]> {
    const txs = await this.txRepo.find({
      where: { user: { id: userId } },
      relations: ['bookCopy', 'bookCopy.book', 'bookCopy.book.category'],
      order: { createdAt: 'DESC' },
    });
    return txs.map((tx) => this._applyDynamicOverdue(tx));
  }

  async findActiveByUser(userId: number): Promise<Transaction[]> {
    const txs = await this.txRepo.find({
      where: [
        { user: { id: userId }, status: TransactionStatus.ACTIVE },
        { user: { id: userId }, status: TransactionStatus.OVERDUE },
      ],
      relations: ['bookCopy', 'bookCopy.book', 'bookCopy.book.category'],
      order: { dueDate: 'ASC' },
    });
    return txs.map((tx) => this._applyDynamicOverdue(tx));
  }

  // ─── FIND BY ID ───────────────────────────────────────────────────────────────
  async findById(id: number): Promise<Transaction> {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: [
        'user',
        'bookCopy',
        'bookCopy.book',
        'bookCopy.book.category',
        'librarian',
      ],
    });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return this._applyDynamicOverdue(tx);
  }

  // ─── GET ALL OVERDUES ────────────────────────────────────────────────────────
  async findAllOverdue(): Promise<Transaction[]> {
    const txs = await this.txRepo.find({
      where: [
        { status: TransactionStatus.ACTIVE },
        { status: TransactionStatus.OVERDUE },
      ],
      relations: ['user', 'bookCopy', 'bookCopy.book'],
    });
    return txs
      .map((tx) => this._applyDynamicOverdue(tx))
      .filter((tx) => tx.status === TransactionStatus.OVERDUE);
  }

  // ─── LIFT SUSPENSION if no more overdue items ─────────────────────────────────
  async _checkAndLiftSuspension(userId: number): Promise<void> {
    const overdueCount = await this.txRepo.count({
      where: { user: { id: userId }, status: TransactionStatus.OVERDUE },
    });
    if (overdueCount === 0) {
      await this.userRepo.update(userId, {
        eligibilityStatus: EligibilityStatus.ELIGIBLE,
      });
    }
  }

  // ─── GET ALL HISTORY ────────────────────────────────────────────────────────
  async findAllHistory(): Promise<Transaction[]> {
    const txs = await this.txRepo.find({
      relations: ['user', 'bookCopy', 'bookCopy.book', 'librarian'],
      order: { createdAt: 'DESC' },
    });
    return txs.map((tx) => this._applyDynamicOverdue(tx));
  }

  // ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
  async getStats() {
    const [active, overdue, returnedToday] = await Promise.all([
      this.txRepo.count({ where: { status: TransactionStatus.ACTIVE } }),
      this.txRepo.count({ where: { status: TransactionStatus.OVERDUE } }),
      this.txRepo
        .createQueryBuilder('tx')
        .where('DATE(tx.return_date) = CURDATE()')
        .andWhere('tx.status = :s', { s: TransactionStatus.RETURNED })
        .getCount(),
    ]);
    return { active, overdue, returnedToday };
  }

  private _applyDynamicOverdue(tx: Transaction): Transaction {
    if (tx.status === TransactionStatus.ACTIVE) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (tx.dueDate < todayStr) {
        const today = new Date();
        const due = parseISO(tx.dueDate);
        const overdueDays = Math.max(0, differenceInDays(today, due));
        tx.status = TransactionStatus.OVERDUE;
        tx.overdueDays = overdueDays;
        tx.fineAmount = overdueDays * this.finePerDay;
      }
    }
    return tx;
  }
}
