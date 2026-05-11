import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutDto {
  @IsString()
  userBarcode: string;

  @IsString()
  bookCopyBarcode: string; // barcode scanned from physical book

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnDto {
  @IsString()
  bookCopyBarcode: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RenewalDto {
  @IsInt()
  @Type(() => Number)
  transactionId: number;
}
