import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  durationMonths: number;

  @IsNumber()
  @Min(1)
  maxMedicines: number;

  @IsNumber()
  @Min(1)
  maxUsers: number;

  @IsOptional()
  features?: any;
}

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}
