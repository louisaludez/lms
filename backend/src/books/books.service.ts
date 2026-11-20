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
import { SearchBooksDto, CreateBookDto, UpdateBookDto, BulkUpdateBookDto, BatchUpdateBooksDto } from './dto/book.dto';
import { Readable } from 'stream';
import csv = require('csv-parser');
import { ActivityLogService, ActivityAction, ActivityResource } from '../activity-log/activity-log.service';

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
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ─── OPAC SEARCH ─────────────────────────────────────────────────────────────
  async search(dto: SearchBooksDto): Promise<PaginatedBooks> {
    const {
      q,
      searchBy,
      itemType,
      categoryId,
      language,
      publisher,
      availableOnly,
      excludeReference,
      publishYearStart,
      publishYearEnd,
      page = 1,
      limit = 12,
    } = dto;

    const qb: SelectQueryBuilder<Book> = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .where('book.is_active = 1');

    if (q) {
      if (searchBy === 'title') {
        qb.andWhere('book.title LIKE :like', { like: `%${q}%` });
      } else if (searchBy === 'author') {
        qb.andWhere(`EXISTS (
          SELECT 1 FROM book_authors ba
          JOIN authors a ON a.id = ba.author_id
          WHERE ba.book_id = book.id AND a.full_name LIKE :like
        )`, { like: `%${q}%` });
      } else if (searchBy === 'isbn') {
        qb.andWhere('book.isbn LIKE :like', { like: `%${q}%` });
      } else if (searchBy === 'callNumber') {
        qb.andWhere('book.call_number LIKE :like', { like: `%${q}%` });
      } else {
        qb.andWhere(
          `(MATCH(book.title, book.description) AGAINST (:q IN BOOLEAN MODE) 
            OR book.isbn LIKE :like 
            OR book.call_number LIKE :like
            OR EXISTS (
              SELECT 1 FROM book_authors ba
              JOIN authors a ON a.id = ba.author_id
              WHERE ba.book_id = book.id AND a.full_name LIKE :like
            ))`,
          { q: `${q}*`, like: `%${q}%` },
        );
      }
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
    
    if (publishYearStart !== undefined) qb.andWhere('book.publish_year >= :start', { start: publishYearStart });
    if (publishYearEnd !== undefined) qb.andWhere('book.publish_year <= :end', { end: publishYearEnd });
    if (itemType) qb.andWhere('book.item_type = :itemType', { itemType });

    qb.orderBy('book.itemType', 'ASC').addOrderBy('book.title', 'ASC');

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
  async create(dto: CreateBookDto, requesterId: number | null = null, ipAddress?: string, userAgent?: string): Promise<Book> {
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
      issn: dto.issn,
      callNumber: dto.callNumber,
      title: dto.title,
      edition: dto.edition,
      issue: dto.issue,
      volume: dto.volume,
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
      itemType: dto.itemType ?? 'Books',
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

    if (dto.authors !== undefined) {
      await this.syncAuthors(saved.id, dto.authors);
    }

    // Log activity
    await this.activityLogService.logCreate(
      requesterId,
      ActivityResource.BOOK,
      saved.id,
      { title: saved.title, isbn: saved.isbn, itemType: saved.itemType },
      ipAddress,
      userAgent,
    );

    return this.findById(saved.id);
  }

  // ─── HELPER: SYNC AUTHORS ───────────────────────────────────────────────────
  private async syncAuthors(bookId: number, authorsString: string): Promise<void> {
    const names = authorsString.split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    // Delete existing links for this book
    await this.dataSource.query('DELETE FROM book_authors WHERE book_id = ?', [bookId]);

    if (names.length === 0) return;

    for (const name of names) {
      // Find or create author
      let authorRows = await this.dataSource.query('SELECT id FROM authors WHERE full_name = ?', [name]);
      let authorId: number;

      if (authorRows && authorRows.length > 0) {
        authorId = authorRows[0].id;
      } else {
        const result = await this.dataSource.query('INSERT INTO authors (full_name) VALUES (?)', [name]);
        authorId = result.insertId;
      }

      // Link book to author
      await this.dataSource.query(
        'INSERT INTO book_authors (book_id, author_id, role) VALUES (?, ?, ?)',
        [bookId, authorId, 'primary']
      );
    }
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

  // ─── SEARCH BOOK COPIES FOR AUTOCOMPLETE ──────────────────────────────────────
  async searchCopies(search?: string, limit = 5): Promise<BookCopy[]> {
    if (!search || search.trim().length === 0) return [];
    const qb = this.copyRepo
      .createQueryBuilder('copy')
      .innerJoinAndSelect('copy.book', 'book')
      .where('copy.isActive = :isActive', { isActive: true });

    const query = `%${search.trim()}%`;
    qb.andWhere(
      '(copy.barcode LIKE :query OR book.title LIKE :query OR book.isbn LIKE :query OR book.callNumber LIKE :query)',
      { query },
    );

    qb.take(limit);
    return qb.getMany();
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
  async findAll(search?: string, categoryId?: number, page: number = 1, limit: number = 10, sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC'): Promise<PaginatedBooks> {
    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.copies', 'copies');

    if (sortBy === 'title') {
      qb.orderBy('book.title', sortOrder);
    } else if (sortBy === 'copies') {
      qb.orderBy('book.availableCopies', sortOrder);
    } else {
      qb.orderBy('book.createdAt', sortOrder);
    }

    if (search) {
      qb.andWhere(
        '(book.title LIKE :s OR book.otherTitle LIKE :s OR book.isbn LIKE :s OR book.callNumber LIKE :s OR EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON a.id = ba.author_id WHERE ba.book_id = book.id AND a.full_name LIKE :s) OR EXISTS (SELECT 1 FROM book_copies bc WHERE bc.book_id = book.id AND bc.barcode LIKE :s))',
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
  async update(id: number, dto: UpdateBookDto, requesterId: number | null = null, ipAddress?: string, userAgent?: string): Promise<Book> {
    const book = await this.findById(id);
    const previousData = {
      title: book.title,
      isbn: book.isbn,
      callNumber: book.callNumber,
      edition: book.edition,
      publisher: book.publisher,
      publishYear: book.publishYear,
      language: book.language,
      description: book.description,
      coverImageUrl: book.coverImageUrl,
      locationShelf: book.locationShelf,
      isReferenceOnly: book.isReferenceOnly,
      isActive: book.isActive,
      itemType: book.itemType,
      categoryId: book.category?.id,
    };

    if (dto.categoryId !== undefined) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (cat) book.category = cat;
    }

    if (dto.title !== undefined)         book.title          = dto.title;
    if (dto.isbn !== undefined)          book.isbn           = dto.isbn;
    if (dto.issn !== undefined)          book.issn           = dto.issn;
    if (dto.callNumber !== undefined)    book.callNumber     = dto.callNumber;
    if (dto.edition !== undefined)       book.edition        = dto.edition;
    if (dto.issue !== undefined)         book.issue          = dto.issue;
    if (dto.volume !== undefined)        book.volume         = dto.volume;
    if (dto.publisher !== undefined)     book.publisher      = dto.publisher;
    if (dto.publishYear !== undefined)   book.publishYear    = dto.publishYear;
    if (dto.language !== undefined)      book.language       = dto.language;
    if (dto.description !== undefined)   book.description    = dto.description;
    if (dto.coverImageUrl !== undefined) book.coverImageUrl  = dto.coverImageUrl;
    if (dto.locationShelf !== undefined) book.locationShelf  = dto.locationShelf;
    if (dto.isReferenceOnly !== undefined) book.isReferenceOnly = dto.isReferenceOnly;
    if (dto.isActive !== undefined)      book.isActive       = dto.isActive;
    if (dto.itemType !== undefined)      book.itemType       = dto.itemType;

    await this.bookRepo.save(book as any);

    if (dto.authors !== undefined) {
      await this.syncAuthors(id, dto.authors);
    }

    // Log activity
    const changes: Record<string, any> = {};
    Object.keys(previousData).forEach(key => {
      const newValue = (book as any)[key];
      if (previousData[key as keyof typeof previousData] !== newValue) {
        changes[key] = { from: previousData[key as keyof typeof previousData], to: newValue };
      }
    });

    if (Object.keys(changes).length > 0) {
      await this.activityLogService.logUpdate(
        requesterId,
        ActivityResource.BOOK,
        id,
        changes,
        ipAddress,
        userAgent,
      );
    }

    return this.findById(id);
  }

  // ── SOFT-DELETE BOOK ────────────────────────────────────────────────
  async remove(id: number, requesterId: number | null = null, ipAddress?: string, userAgent?: string): Promise<void> {
    const book = await this.findById(id);
    const bookTitle = book.title;
    book.isActive = false;
    await this.bookRepo.save(book as any);

    await this.activityLogService.logDelete(
      requesterId,
      ActivityResource.BOOK,
      id,
      { title: bookTitle },
      ipAddress,
      userAgent,
    );
  }

  // ── BULK UPDATE BOOKS ───────────────────────────────────────────────
  async bulkUpdate(dto: BulkUpdateBookDto): Promise<{ updatedCount: number }> {
    if (!dto.ids || dto.ids.length === 0) {
      throw new BadRequestException('No book IDs provided for bulk update');
    }

    let categoryObj: Category | undefined = undefined;
    if (dto.categoryId !== undefined) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException(`Category ${dto.categoryId} not found`);
      categoryObj = cat;
    }

    let count = 0;
    for (const id of dto.ids) {
      const book = await this.bookRepo.findOne({ where: { id } });
      if (!book) continue;

      if (categoryObj !== undefined)        book.category       = categoryObj;
      if (dto.edition !== undefined)       book.edition        = dto.edition;
      if (dto.publisher !== undefined)     book.publisher      = dto.publisher;
      if (dto.publishYear !== undefined)   book.publishYear    = dto.publishYear;
      if (dto.language !== undefined)      book.language       = dto.language;
      if (dto.locationShelf !== undefined) book.locationShelf  = dto.locationShelf;
      if (dto.isReferenceOnly !== undefined) book.isReferenceOnly = dto.isReferenceOnly;
      if (dto.isActive !== undefined)      book.isActive       = dto.isActive;
      if (dto.itemType !== undefined)      book.itemType       = dto.itemType;

      await this.bookRepo.save(book as any);
      count++;
    }

    return { updatedCount: count };
  }

  // ── BATCH UPDATE BOOKS (INDIVIDUAL ROW EDITS) ──────────────────────
  async batchUpdate(dto: BatchUpdateBooksDto): Promise<{ updatedCount: number }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('No items provided for batch update');
    }

    let count = 0;
    for (const item of dto.items) {
      const book = await this.bookRepo.findOne({ where: { id: item.id } });
      if (!book) continue;

      if (item.categoryId !== undefined) {
        const cat = await this.categoryRepo.findOne({ where: { id: item.categoryId } });
        if (cat) book.category = cat;
      }

      if (item.title !== undefined)           book.title          = item.title;
      if (item.edition !== undefined)         book.edition        = item.edition;
      if (item.publisher !== undefined)       book.publisher      = item.publisher;
      if (item.publishYear !== undefined)     book.publishYear    = item.publishYear;
      if (item.language !== undefined)        book.language       = item.language;
      if (item.locationShelf !== undefined)   book.locationShelf  = item.locationShelf;
      if (item.isReferenceOnly !== undefined) book.isReferenceOnly = item.isReferenceOnly;
      if (item.isActive !== undefined)        book.isActive       = item.isActive;
      if (item.itemType !== undefined)        book.itemType       = item.itemType;

      await this.bookRepo.save(book as any);
      count++;
    }

    return { updatedCount: count };
  }



  // ── BULK UPLOAD ────────────────────────────────────────────────────
  async bulkUpload(file: Express.Multer.File, selectedItemType?: string): Promise<{ success: number; failed: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const errors: string[] = [];

      const stream = Readable.from(file.buffer);

      stream
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', async () => {
          let success = 0;
          let failed = 0;

          // Get all categories to match by name
          const categories = await this.getCategories();

          // If user selected a specific item type in frontend, we can use it as default/validation
          const frontendItemType = selectedItemType?.trim();

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              // Map CSV columns to book data
              const title = row['Title'] || row['title'];
              const otherTitle = row['Other Title'] || row['otherTitle'] || row['other_title'] || undefined;
              const isbn = row['ISBN'] || row['isbn'];
              const issn = row['ISSN'] || row['issn'];
              const callNumber = row['Call Number'] || row['callNumber'] || row['call_number'];
              // Use item type from CSV row, or fallback to frontend selection, or default to Books
              const itemType = (row['Item Type'] || row['itemType'] || frontendItemType || 'Books').trim();

              // Conditional validation based on item type
              if (!title || !callNumber) {
                failed++;
                errors.push(`Row ${i + 1}: Missing required fields (Title, Call Number)`);
                continue;
              }

              // If frontend selected a specific type, enforce it matches CSV rows
              if (frontendItemType && itemType !== frontendItemType) {
                failed++;
                errors.push(`Row ${i + 1}: Item Type mismatch. Expected "${frontendItemType}", got "${itemType}"`);
                continue;
              }

              // For Journals, ISSN is required instead of ISBN
              // For Books, ISBN is required
              // For other types, at least one identifier is preferred
              if (itemType === 'Journals') {
                if (!issn) {
                  failed++;
                  errors.push(`Row ${i + 1}: Journals require ISSN`);
                  continue;
                }
              } else if (itemType === 'Books') {
                if (!isbn) {
                  failed++;
                  errors.push(`Row ${i + 1}: Books require ISBN`);
                  continue;
                }
              } else {
                // For other types, prefer at least one identifier
                if (!isbn && !issn) {
                  failed++;
                  errors.push(`Row ${i + 1}: ${itemType} requires at least ISBN or ISSN`);
                  continue;
                }
              }

              const categoryName = row['Category'] || row['category'];
              let categoryId: number | undefined = undefined;
              if (categoryName) {
                const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                if (cat) {
                  categoryId = cat.id;
                }
              }

              // Check for existing by ISBN (for books) or ISSN (for journals) or both
              let existingBook = null;
              if (isbn) {
                existingBook = await this.bookRepo.findOne({ where: { isbn } });
              }
              if (!existingBook && issn) {
                existingBook = await this.bookRepo.findOne({ where: { issn } });
              }

              // Parse issue and volume for Journals
              const issue = row['Issue'] || row['issue'] || undefined;
              const volume = row['Volume'] || row['volume'] || undefined;
              const edition = row['Edition'] || row['edition'] || undefined;

              const baseData = {
                title,
                otherTitle,
                callNumber,
                authors: row['Authors'] || row['authors'] || undefined,
                publisher: row['Publisher'] || row['publisher'] || undefined,
                publishYear: row['Publish Year'] || row['publishYear'] ? Number(row['Publish Year'] || row['publishYear']) : undefined,
                categoryId,
                language: row['Language'] || row['language'] || 'English',
                locationShelf: row['Location Shelf'] || row['locationShelf'] || undefined,
                itemType,
                isReferenceOnly: (row['Reference Only'] || row['isReferenceOnly'])?.toString().toLowerCase() === 'true',
                description: row['Description'] || row['description'] || undefined,
              };

              if (existingBook) {
                const updateDto: UpdateBookDto = {
                  ...baseData,
                  // Only include ISBN/ISSN if they exist (don't overwrite)
                  isbn: isbn || undefined,
                  issn: issn || undefined,
                  // For Journals, use issue/volume; for Books, use edition
                  ...(itemType === 'Journals' ? { issue, volume } : { edition }),
                };

                await this.update(existingBook.id, updateDto);
              } else {
                const createDto: CreateBookDto = {
                  ...baseData,
                  isbn: isbn || undefined,
                  issn: issn || undefined,
                  // For Journals, use issue/volume; for Books, use edition
                  ...(itemType === 'Journals' ? { issue, volume } : { edition }),
                  totalCopies: row['Total Copies'] || row['totalCopies'] ? Number(row['Total Copies'] || row['totalCopies']) : 1,
                };

                await this.create(createDto);
              }
              success++;
            } catch (e: any) {
              failed++;
              errors.push(`Row ${i + 1} (${row['Title'] || 'Unknown'}): ${e.message}`);
            }
          }

          resolve({ success, failed, errors });
        })
        .on('error', (error: any) => {
          reject(new BadRequestException(`Failed to parse CSV: ${error.message}`));
        });
    });
  }
}
