import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @IsInt()
  @Min(1)
  quantityOrdered: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class UpdatePurchaseStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string; // 'ordered', 'cancelled'
}

export class ReceiveBatchItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsInt()
  @Min(1)
  quantityReceived: number;

  @IsString()
  @IsNotEmpty()
  expiryDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveBatchItemDto)
  items: ReceiveBatchItemDto[];
}
