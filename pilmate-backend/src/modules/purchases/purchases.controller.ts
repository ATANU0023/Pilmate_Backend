import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseStatusDto,
  ReceivePurchaseOrderDto,
} from './dto/purchase.dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('stores/:storeId/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.create(storeId, req.user.userId, dto);
  }

  @Get()
  async findAll(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasesService.findAll(
      storeId,
      req.user.userId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':poId')
  async findOne(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
  ) {
    return this.purchasesService.findOne(storeId, poId, req.user.userId);
  }

  @Patch(':poId/status')
  async updateStatus(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
    @Body() dto: UpdatePurchaseStatusDto,
  ) {
    return this.purchasesService.updateStatus(storeId, poId, req.user.userId, dto);
  }

  @Post(':poId/receive')
  async receive(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasesService.receive(storeId, poId, req.user.userId, dto);
  }
}
