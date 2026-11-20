import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { SearchBooksDto, CreateBookDto, UpdateBookDto, BulkUpdateBookDto, BatchUpdateBooksDto } from './dto/book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthReq = ExpressRequest & { user: { id: number; role: string } };

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  private getClientInfo(req: AuthReq) {
    return {
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  /** OPAC Search — public */
  @Get('search')
  search(@Query() dto: SearchBooksDto) {
    return this.booksService.search(dto);
  }

  /** GET /api/v1/books/categories — public */
  @Get('categories')
  getCategories() {
    return this.booksService.getCategories();
  }

  /** GET /api/v1/books/stats/overview — dashboard stats */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.booksService.getStats();
  }

  /** GET /api/v1/books/all — librarian: list all books incl. inactive */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.booksService.findAll(
      search,
      categoryId ? Number(categoryId) : undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      sortBy,
      sortOrder,
    );
  }

  /** GET /api/v1/books/copies/search — search book copies for circulation autocomplete */
  @Get('copies/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  searchCopies(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.booksService.searchCopies(search, limit ? Number(limit) : 5);
  }

  /** GET /api/v1/books/:id — public */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findById(id);
  }

  /** POST /api/v1/books — create */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  create(@Request() req: AuthReq, @Body() dto: CreateBookDto) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.create(dto, req.user.id, ipAddress, userAgent);
  }

  /** POST /api/v1/books/bulk-upload — bulk upload books via CSV */
  @Post('bulk-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthReq,
    @Body('itemType') itemType?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.bulkUpload(file, itemType);
  }

  /** PATCH /api/v1/books/bulk-update — bulk update books */
  @Patch('bulk-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  bulkUpdate(@Request() req: AuthReq, @Body() dto: BulkUpdateBookDto) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.bulkUpdate(dto);
  }

  /** PATCH /api/v1/books/batch-update — batch update individual items */
  @Patch('batch-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  batchUpdate(@Request() req: AuthReq, @Body() dto: BatchUpdateBooksDto) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.batchUpdate(dto);
  }

  /** PATCH /api/v1/books/:id — update */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  update(@Request() req: AuthReq, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.update(id, dto, req.user.id, ipAddress, userAgent);
  }

  /** DELETE /api/v1/books/:id — soft-delete */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: AuthReq, @Param('id', ParseIntPipe) id: number) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.booksService.remove(id, req.user.id, ipAddress, userAgent);
  }
}
