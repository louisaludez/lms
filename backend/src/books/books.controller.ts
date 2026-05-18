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
} from '@nestjs/common';
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
  @Roles('librarian', 'admin')
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.booksService.findAll(
      search, 
      categoryId ? Number(categoryId) : undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  /** GET /api/v1/books/:id — public */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findById(id);
  }

  /** POST /api/v1/books — create */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'admin')
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  /** PATCH /api/v1/books/:id — update */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  /** DELETE /api/v1/books/:id — soft-delete */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
