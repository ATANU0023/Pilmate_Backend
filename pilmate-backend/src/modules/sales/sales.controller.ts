import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CreateSaleDto, QuerySalesDto } from './dto/sale.dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('stores/:storeId/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(storeId, req.user.userId, dto);
  }

  @Get()
  async findAll(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query() query: QuerySalesDto,
  ) {
    return this.salesService.findAll(storeId, req.user.userId, query);
  }

  @Get(':invoiceId')
  async findOne(
    @Param('storeId') storeId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req,
  ) {
    return this.salesService.findOne(storeId, invoiceId, req.user.userId);
  }
}
