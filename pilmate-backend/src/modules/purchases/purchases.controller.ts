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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseStatusDto,
  ReceivePurchaseOrderDto,
} from './dto/purchase.dto';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('purchases')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('stores/:storeId/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ResponseMessage('Purchase order created successfully')
  async create(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.create(storeId, req.user.userId, dto);
  }

  @Get()
  @ResponseMessage('Purchase orders fetched successfully')
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
  @ResponseMessage('Purchase order details fetched successfully')
  async findOne(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
  ) {
    return this.purchasesService.findOne(storeId, poId, req.user.userId);
  }

  @Patch(':poId/status')
  @ResponseMessage('Purchase order status updated successfully')
  async updateStatus(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
    @Body() dto: UpdatePurchaseStatusDto,
  ) {
    return this.purchasesService.updateStatus(storeId, poId, req.user.userId, dto);
  }

  @Post(':poId/receive')
  @ResponseMessage('Purchase order received successfully')
  async receive(
    @Param('storeId') storeId: string,
    @Param('poId') poId: string,
    @Request() req,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasesService.receive(storeId, poId, req.user.userId, dto);
  }
}
