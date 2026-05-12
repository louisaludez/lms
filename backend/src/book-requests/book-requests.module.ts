import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookRequest } from './entities/book-request.entity';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { BookRequestsService } from './book-requests.service';
import { BookRequestsController } from './book-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BookRequest, User, Book])],
  providers: [BookRequestsService],
  controllers: [BookRequestsController],
})
export class BookRequestsModule {}
