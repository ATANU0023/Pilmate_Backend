import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  /**
   * Sales report for a date range.
   */
  async getSalesReport(
    storeId: string,
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    await this.storesService.verifyMembership(storeId, userId);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        storeId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            batch: { select: { purchasePrice: true } },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;
    const paymentBreakdown: Record<string, { count: number; amount: number }> = {};

    for (const inv of invoices) {
      totalRevenue += Number(inv.totalAmount);

      const method = inv.paymentMethod || 'Other';
      if (!paymentBreakdown[method]) {
        paymentBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentBreakdown[method].count++;
      paymentBreakdown[method].amount += Number(inv.totalAmount);

      for (const item of inv.items) {
        totalItemsSold += item.quantity;
        totalCost += Number(item.batch.purchasePrice) * item.quantity;
      }
    }

    return {
      period: { startDate, endDate },
      totalOrders: invoices.length,
      totalItemsSold,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      profitMargin: totalRevenue > 0
        ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100
        : 0,
      paymentBreakdown,
    };
  }

  /**
   * Inventory summary report.
   */
  async getInventoryReport(storeId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const medicines = await this.prisma.medicine.findMany({
      where: { storeId },
      include: {
        category: true,
        batches: {
          where: { status: 'active' },
          select: { quantity: true, sellingPrice: true, purchasePrice: true, expiryDate: true },
        },
      },
    });

    let totalProducts = medicines.length;
    let totalStockValue = 0;
    let totalCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    let expiringCount = 0;

    const items = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      const stockValue = med.batches.reduce(
        (sum, b) => sum + b.quantity * Number(b.sellingPrice), 0,
      );
      const costValue = med.batches.reduce(
        (sum, b) => sum + b.quantity * Number(b.purchasePrice), 0,
      );

      totalStockValue += stockValue;
      totalCostValue += costValue;

      if (totalStock === 0) outOfStockCount++;
      else if (totalStock <= med.reorderLevel) lowStockCount++;

      const expiringBatches = med.batches.filter(
        (b) => new Date(b.expiryDate) <= thirtyDaysFromNow && b.quantity > 0,
      );
      if (expiringBatches.length > 0) expiringCount++;

      return {
        id: med.id,
        name: med.name,
        category: med.category?.name,
        totalStock,
        reorderLevel: med.reorderLevel,
        stockValue: Math.round(stockValue * 100) / 100,
        status: totalStock === 0 ? 'OUT_OF_STOCK' :
          totalStock <= med.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK',
      };
    });

    return {
      summary: {
        totalProducts,
        inStock: totalProducts - outOfStockCount - lowStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        expiringSoon: expiringCount,
        totalStockValue: Math.round(totalStockValue * 100) / 100,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        potentialProfit: Math.round((totalStockValue - totalCostValue) * 100) / 100,
      },
      items: items.sort((a, b) => {
        // Sort: out of stock first, then low stock, then in stock
        const order = { OUT_OF_STOCK: 0, LOW_STOCK: 1, IN_STOCK: 2 };
        return order[a.status] - order[b.status];
      }),
    };
  }

  /**
   * Top selling medicines in a date range.
   */
  async getTopSellingMedicines(
    storeId: string,
    userId: string,
    startDate: string,
    endDate: string,
    topN: number = 10,
  ) {
    await this.storesService.verifyMembership(storeId, userId);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          storeId,
          createdAt: { gte: start, lte: end },
        },
      },
      include: {
        batch: {
          include: {
            medicine: { select: { id: true, name: true, genericName: true } },
          },
        },
      },
    });

    // Aggregate by medicine
    const medicineMap = new Map<string, {
      id: string;
      name: string;
      genericName: string | null;
      totalQuantity: number;
      totalRevenue: number;
    }>();

    for (const item of invoiceItems) {
      const med = item.batch.medicine;
      const existing = medicineMap.get(med.id) || {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        totalQuantity: 0,
        totalRevenue: 0,
      };

      existing.totalQuantity += item.quantity;
      existing.totalRevenue += Number(item.subtotal);
      medicineMap.set(med.id, existing);
    }

    const sorted = Array.from(medicineMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, topN);

    return {
      period: { startDate, endDate },
      topSelling: sorted.map((item, index) => ({
        rank: index + 1,
        ...item,
        totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      })),
    };
  }

  /**
   * Dashboard overview — combined summary.
   */
  async getDashboard(storeId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's sales
    const [todayInvoices, monthInvoices, totalMedicines, lowStockMedicines, expiringBatches, recentActivities] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { storeId, createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      this.prisma.invoice.findMany({
        where: { storeId, createdAt: { gte: startOfMonth, lte: endOfDay } },
      }),
      this.prisma.medicine.count({ where: { storeId } }),
      this.prisma.medicine.findMany({
        where: { storeId },
        include: { batches: { where: { status: 'active' }, select: { quantity: true } } },
      }),
      this.prisma.inventoryBatch.count({
        where: {
          storeId,
          status: 'active',
          quantity: { gt: 0 },
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.activityLog.findMany({
        where: { storeId },
        include: { user: { select: { fullName: true } } },
        orderBy: { performedAt: 'desc' },
        take: 10,
      }),
    ]);

    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const monthRevenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const lowStockCount = lowStockMedicines.filter((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      return totalStock <= med.reorderLevel && totalStock > 0;
    }).length;

    const outOfStockCount = lowStockMedicines.filter((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      return totalStock === 0;
    }).length;

    return {
      today: {
        revenue: Math.round(todayRevenue * 100) / 100,
        orders: todayInvoices.length,
      },
      thisMonth: {
        revenue: Math.round(monthRevenue * 100) / 100,
        orders: monthInvoices.length,
      },
      inventory: {
        totalMedicines,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        expiringSoon: expiringBatches,
      },
      recentActivity: recentActivities.map((a) => ({
        action: a.action,
        performedBy: a.user?.fullName || 'System',
        performedAt: a.performedAt,
        details: a.details,
      })),
    };
  }
}
