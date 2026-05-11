import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { SearchBooksDto, CreateBookDto } from './dto/book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  /**
   * OPAC Search — public endpoint (no auth required)
   * GET /api/v1/books/search?q=...&categoryId=...&availableOnly=true&page=1&limit=12
   */
  @Get('search')
  search(@Query() dto: SearchBooksDto) {
    return this.booksService.search(dto);
  }

  /**
   * Get all categories for filter sidebar
   * GET /api/v1/books/categories
   */
  @Get('categories')
  getCategories() {
    return this.booksService.getCategories();
  }

  /**
   * Library stats for dashboard
   * GET /api/v1/books/stats/overview
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.booksService.getStats();
  }

  /**
   * Book detail view — public
   * GET /api/v1/books/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findById(id);
  }

  /**
   * Add new book — librarian/admin only
   * POST /api/v1/books
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'admin')
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }


}
