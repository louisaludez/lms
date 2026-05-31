import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchBooksDto {
  @IsOptional()
  @IsString()
  q?: string; // search query

  @IsOptional()
  @IsString()
  searchBy?: string; // title, author, isbn, call_number, or 'all'

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  publishYearStart?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  publishYearEnd?: number;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  excludeReference?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 12;
}

export class CreateBookDto {
  @IsString()
  isbn: string;

  @IsString()
  callNumber: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  otherTitle?: string;

  @IsOptional()
  @IsString()
  authors?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsNumber()
  publishYear?: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCopies?: number;

  @IsOptional()
  @IsString()
  locationShelf?: string;

  @IsOptional()
  @IsBoolean()
  isReferenceOnly?: boolean;

  @IsOptional()
  @IsString()
  itemType?: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() otherTitle?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() callNumber?: string;
  @IsOptional() @IsString() edition?: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsNumber() publishYear?: number;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsString() locationShelf?: string;
  @IsOptional() @IsBoolean() isReferenceOnly?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() itemType?: string;
  @IsOptional() @IsString() authors?: string;
}
