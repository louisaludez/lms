import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookRequest } from './entities/book-request.entity';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { Category } from '../books/entities/category.entity';
import { BookRequestsService } from './book-requests.service';
import { BookRequestsController } from './book-requests.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [TypeOrmModule.forFeature([BookRequest, User, Book, Category]), ActivityLogModule, BooksModule],
  providers: [BookRequestsService],
  controllers: [BookRequestsController],
})
export class BookRequestsModule {}
