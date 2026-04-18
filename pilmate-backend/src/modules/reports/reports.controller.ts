import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('stores/:storeId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesReport(storeId, req.user.userId, startDate, endDate);
  }

  @Get('inventory')
  async getInventoryReport(@Param('storeId') storeId: string, @Request() req) {
    return this.reportsService.getInventoryReport(storeId, req.user.userId);
  }

  @Get('top-selling')
  async getTopSelling(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopSellingMedicines(
      storeId,
      req.user.userId,
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('dashboard')
  async getDashboard(@Param('storeId') storeId: string, @Request() req) {
    return this.reportsService.getDashboard(storeId, req.user.userId);
  }
}
