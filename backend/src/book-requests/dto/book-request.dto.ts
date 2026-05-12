import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BookRequestType } from '../entities/book-request.entity';

/** Faculty creates a borrow request for an existing book */
export class CreateBorrowRequestDto {
  @IsInt()
  @Type(() => Number)
  bookId: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

/** Faculty creates an acquisition request for a new book */
export class CreateAcquisitionRequestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsString()
  reason: string;
}

/** Librarian updates request status */
export class UpdateRequestStatusDto {
  @IsEnum(['approved', 'rejected', 'fulfilled'])
  status: 'approved' | 'rejected' | 'fulfilled';

  @IsOptional()
  @IsString()
  librarianNotes?: string;
}
