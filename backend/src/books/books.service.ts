import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookCopy } from './entities/book-copy.entity';
import { Category } from './entities/category.entity';
import { SearchBooksDto, CreateBookDto, UpdateBookDto } from './dto/book.dto';

export interface PaginatedBooks {
  data: Book[];
  total: number;
  page: number;
  lastPage: number;
}

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(BookCopy)
    private readonly copyRepo: Repository<BookCopy>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── OPAC SEARCH ─────────────────────────────────────────────────────────────
  async search(dto: SearchBooksDto): Promise<PaginatedBooks> {
    const {
      q,
      categoryId,
      language,
      publisher,
      availableOnly,
      excludeReference,
      page = 1,
      limit = 12,
    } = dto;

    const qb: SelectQueryBuilder<Book> = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .where('book.is_active = 1');

    if (q) {
      qb.andWhere(
        `(MATCH(book.title, book.description) AGAINST (:q IN BOOLEAN MODE) OR book.isbn LIKE :like OR book.call_number LIKE :like)`,
        { q: `${q}*`, like: `%${q}%` },
      );
    }

    if (categoryId)
      qb.andWhere('book.category_id = :categoryId', { categoryId });
    if (language) qb.andWhere('book.language = :language', { language });
    if (publisher)
      qb.andWhere('book.publisher LIKE :publisher', {
        publisher: `%${publisher}%`,
      });
    if (availableOnly) qb.andWhere('book.available_copies > 0');
    if (excludeReference) qb.andWhere('book.is_reference_only = 0');

    const [books, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (books.length > 0) {
      const bookIds = books.map((b) => b.id);
      const authorsData = await this.dataSource.query(
        `SELECT ba.book_id, a.full_name 
         FROM authors a
         JOIN book_authors ba ON ba.author_id = a.id
         WHERE ba.book_id IN (?)
         ORDER BY ba.role`,
        [bookIds],
      );
      
      const authorsMap = new Map<number, string[]>();
      authorsData.forEach((row: any) => {
        if (!authorsMap.has(row.book_id)) authorsMap.set(row.book_id, []);
        authorsMap.get(row.book_id)!.push(row.full_name);
      });

      books.forEach((book) => {
        book.authors = authorsMap.get(book.id) || [];
      });
    }

    return { data: books, total, page, lastPage: Math.ceil(total / limit) };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  async findById(id: number): Promise<Book> {
    const book = await this.bookRepo.findOne({
      where: { id },
      relations: ['category', 'copies'],
    });

    if (!book) throw new NotFoundException(`Book with id ${id} not found`);

    const authorsData = await this.dataSource.query(
      `SELECT a.full_name 
       FROM authors a
       JOIN book_authors ba ON ba.author_id = a.id
       WHERE ba.book_id = ?
       ORDER BY ba.role`,
      [id],
    );

    book.authors = authorsData.map((row: any) => row.full_name);
    return book;
  }

  // ─── GET CATEGORIES ──────────────────────────────────────────────────────────
  async getCategories(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  // ─── CREATE BOOK ─────────────────────────────────────────────────────────────
  async create(dto: CreateBookDto): Promise<Book> {
    const existingIsbn = await this.bookRepo.findOne({
      where: { isbn: dto.isbn },
    });
    if (existingIsbn)
      throw new BadRequestException(`ISBN ${dto.isbn} already exists`);

    let category: Category | undefined = undefined;
    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!cat)
        throw new NotFoundException(`Category ${dto.categoryId} not found`);
      category = cat;
    }

    const bookPartial: Partial<Book> = {
      isbn: dto.isbn,
      callNumber: dto.callNumber,
      title: dto.title,
      edition: dto.edition,
      publisher: dto.publisher,
      publishYear: dto.publishYear,
      category,
      language: dto.language ?? 'English',
      description: dto.description,
      coverImageUrl: dto.coverImageUrl,
      totalCopies: dto.totalCopies ?? 1,
      availableCopies: dto.totalCopies ?? 1,
      locationShelf: dto.locationShelf,
      isReferenceOnly: dto.isReferenceOnly ?? false,
    };

    const book = this.bookRepo.create(bookPartial as any);
    const saved = (await this.bookRepo.save(book as any)) as Book;

    // Create default copy barcodes
    const copies: Partial<BookCopy>[] = [];
    for (let i = 0; i < (dto.totalCopies ?? 1); i++) {
      copies.push({
        book: saved,
        barcode: `BC-${saved.id.toString().padStart(4, '0')}-${String.fromCharCode(65 + i)}`,
        condition: 'good' as any,
      });
    }
    await this.copyRepo.save(copies as any);

    return this.findById(saved.id);
  }

  // ─── FIND COPY BY BARCODE ─────────────────────────────────────────────────────
  async findCopyByBarcode(barcode: string): Promise<BookCopy> {
    const copy = await this.copyRepo.findOne({
      where: { barcode, isActive: true },
      relations: ['book'],
    });
    if (!copy)
      throw new NotFoundException(
        `Book copy with barcode "${barcode}" not found`,
      );
    return copy;
  }

  async decrementAvailable(bookId: number): Promise<void> {
    await this.bookRepo.decrement({ id: bookId }, 'availableCopies', 1);
  }

  async incrementAvailable(bookId: number): Promise<void> {
    await this.bookRepo.increment({ id: bookId }, 'availableCopies', 1);
  }

  async getStats() {
    const [totalBooks, totalCopies, availableCopiesRaw] = await Promise.all([
      this.bookRepo.count({ where: { isActive: true } }),
      this.copyRepo.count({ where: { isActive: true } }),
      this.bookRepo
        .createQueryBuilder('b')
        .select('SUM(b.available_copies)', 'sum')
        .getRawOne(),
    ]);
    return {
      totalBooks,
      totalCopies,
      availableCopies: Number(availableCopiesRaw?.sum ?? 0),
    };
  }

  // ── ADMIN: LIST ALL BOOKS (incl. inactive) ─────────────────────────────
  async findAll(search?: string, categoryId?: number, page: number = 1, limit: number = 10): Promise<PaginatedBooks> {
    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .orderBy('book.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(book.title LIKE :s OR book.isbn LIKE :s OR book.callNumber LIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (categoryId) qb.andWhere('book.category_id = :categoryId', { categoryId });

    const [books, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (books.length > 0) {
      const ids = books.map((b) => b.id);
      const authorsData = await this.dataSource.query(
        `SELECT ba.book_id, a.full_name FROM authors a
         JOIN book_authors ba ON ba.author_id = a.id
         WHERE ba.book_id IN (?) ORDER BY ba.role`,
        [ids],
      );
      const map = new Map<number, string[]>();
      authorsData.forEach((r: any) => {
        if (!map.has(r.book_id)) map.set(r.book_id, []);
        map.get(r.book_id)!.push(r.full_name);
      });
      books.forEach((b) => { b.authors = map.get(b.id) || []; });
    }
    return { data: books, total, page, lastPage: Math.ceil(total / limit) || 1 };
  }

  // ── UPDATE BOOK ──────────────────────────────────────────────────────
  async update(id: number, dto: UpdateBookDto): Promise<Book> {
    const book = await this.findById(id);

    if (dto.categoryId !== undefined) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (cat) book.category = cat;
    }

    if (dto.title !== undefined)         book.title          = dto.title;
    if (dto.isbn !== undefined)          book.isbn           = dto.isbn;
    if (dto.callNumber !== undefined)    book.callNumber     = dto.callNumber;
    if (dto.edition !== undefined)       book.edition        = dto.edition;
    if (dto.publisher !== undefined)     book.publisher      = dto.publisher;
    if (dto.publishYear !== undefined)   book.publishYear    = dto.publishYear;
    if (dto.language !== undefined)      book.language       = dto.language;
    if (dto.description !== undefined)   book.description    = dto.description;
    if (dto.coverImageUrl !== undefined) book.coverImageUrl  = dto.coverImageUrl;
    if (dto.locationShelf !== undefined) book.locationShelf  = dto.locationShelf;
    if (dto.isReferenceOnly !== undefined) book.isReferenceOnly = dto.isReferenceOnly;
    if (dto.isActive !== undefined)      book.isActive       = dto.isActive;

    await this.bookRepo.save(book as any);
    return this.findById(id);
  }

  // ── SOFT-DELETE BOOK ────────────────────────────────────────────────
  async remove(id: number): Promise<void> {
    const book = await this.findById(id);
    book.isActive = false;
    await this.bookRepo.save(book as any);
  }
}
