import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseStatusDto,
  ReceivePurchaseOrderDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  /**
   * Create a purchase order with line items.
   */
  async create(storeId: string, userId: string, dto: CreatePurchaseOrderDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    // Calculate total amount
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0,
    );

    const po = await this.prisma.purchaseOrder.create({
      data: {
        storeId,
        userId,
        supplierId: dto.supplierId,
        notes: dto.notes,
        status: 'draft',
        totalAmount,
        items: {
          create: dto.items.map((item) => ({
            medicineId: item.medicineId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
        supplier: { select: { supplierName: true } },
        user: { select: { fullName: true } },
      },
    });

    return { message: 'Purchase order created', purchaseOrder: po };
  }

  /**
   * List purchase orders for a store.
   */
  async findAll(
    storeId: string,
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.storesService.verifyMembership(storeId, userId);

    const where: any = { storeId };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { supplierName: true } },
          user: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a purchase order with its items.
   */
  async findOne(storeId: string, poId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, storeId },
      include: {
        items: { include: { medicine: { select: { name: true, genericName: true } } } },
        supplier: true,
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  /**
   * Update purchase order status (draft → ordered → cancelled).
   */
  async updateStatus(storeId: string, poId: string, userId: string, dto: UpdatePurchaseStatusDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, storeId },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['ordered', 'cancelled'],
      ordered: ['cancelled'],
      received: [],
      cancelled: [],
    };

    if (!validTransitions[po.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from "${po.status}" to "${dto.status}"`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: dto.status },
    });

    return { message: `Purchase order status updated to "${dto.status}"`, purchaseOrder: updated };
  }

  /**
   * Receive a purchase order — creates inventory batches and updates stock.
   * Status changes from 'ordered' → 'received'.
   */
  async receive(storeId: string, poId: string, userId: string, dto: ReceivePurchaseOrderDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager', 'Pharmacist']);

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, storeId },
      include: { supplier: true },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    if (po.status !== 'ordered') {
      throw new BadRequestException(
        `Can only receive orders with status "ordered". Current status: "${po.status}"`,
      );
    }

    // Create batches and update PO in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create inventory batches for each received item
      const batches: any[] = [];
      for (const item of dto.items) {
        const batch = await tx.inventoryBatch.create({
          data: {
            storeId,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            quantity: item.quantityReceived,
            expiryDate: new Date(item.expiryDate),
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            supplierId: po.supplierId,
            status: 'active',
          },
        });
        batches.push(batch);
      }

      // Update PO status to received
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'received' },
      });

      // Log the activity
      await tx.activityLog.create({
        data: {
          storeId,
          userId,
          action: 'PURCHASE_ORDER_RECEIVED',
          details: {
            poId,
            itemCount: dto.items.length,
            totalBatches: batches.length,
          },
        },
      });

      return batches;
    });

    return {
      message: 'Purchase order received. Inventory updated.',
      batchesCreated: result.length,
    };
  }
}
