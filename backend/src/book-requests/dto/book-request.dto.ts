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
  @IsOptional()
  @IsString()
  itemType?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  otherTitle?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsString()
  issn?: string;

  @IsOptional()
  @IsString()
  callNumber?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  publishYear?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  locationShelf?: string;

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
