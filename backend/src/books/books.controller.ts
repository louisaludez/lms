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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { SearchBooksDto, CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

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
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  /** POST /api/v1/books/bulk-upload — bulk upload books via CSV */
  @Post('bulk-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.booksService.bulkUpload(file);
  }

  /** PATCH /api/v1/books/:id — update */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  /** DELETE /api/v1/books/:id — soft-delete */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
