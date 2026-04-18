import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  expiryDate: string; // ISO date string

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;

  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class UpdateBatchDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  status?: string; // 'active', 'expired', 'recalled'
}
