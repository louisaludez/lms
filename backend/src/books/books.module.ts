import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BookCopy } from './entities/book-copy.entity';
import { Category } from './entities/category.entity';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Book, BookCopy, Category]), ActivityLogModule],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
