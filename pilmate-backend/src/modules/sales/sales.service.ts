import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { CreateSaleDto, QuerySalesDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  /**
   * Create a sale/invoice. Deducts stock from inventory batches.
   * Each sale item references a specific batch (FIFO approach — frontend picks oldest batches).
   */
  async create(storeId: string, userId: string, dto: CreateSaleDto) {
    await this.storesService.verifyRole(storeId, userId, [
      'Owner', 'Manager', 'Pharmacist', 'Staff',
    ]);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Sale must have at least one item');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Validate all batches and calculate totals
      let totalAmount = 0;
      const invoiceItems: Array<{
        batchId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of dto.items) {
        const batch = await tx.inventoryBatch.findFirst({
          where: { id: item.batchId, storeId, status: 'active' },
        });

        if (!batch) {
          throw new BadRequestException(`Batch ${item.batchId} not found or not active`);
        }

        if (batch.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${item.quantity}`,
          );
        }

        const unitPrice = Number(batch.sellingPrice);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        invoiceItems.push({
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        });

        // Deduct stock from batch
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tx, storeId);

      // Create invoice with items
      const invoice = await tx.invoice.create({
        data: {
          storeId,
          userId,
          invoiceNumber,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          notes: dto.notes,
          items: {
            create: invoiceItems,
          },
        },
        include: {
          items: {
            include: {
              batch: {
                include: {
                  medicine: { select: { name: true, genericName: true } },
                },
              },
            },
          },
          user: { select: { fullName: true } },
        },
      });

      // Log the activity
      await tx.activityLog.create({
        data: {
          storeId,
          userId,
          action: 'SALE_COMPLETED',
          details: {
            invoiceNumber,
            totalAmount,
            itemCount: dto.items.length,
            paymentMethod: dto.paymentMethod,
          },
        },
      });

      return invoice;
    });

    return {
      message: 'Sale completed successfully',
      invoice: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount,
        paymentMethod: result.paymentMethod,
        customerName: result.customerName,
        createdAt: result.createdAt,
        soldBy: result.user?.fullName,
        items: result.items.map((item) => ({
          medicineName: item.batch.medicine.name,
          genericName: item.batch.medicine.genericName,
          batchNumber: item.batch.batchNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      },
    };
  }

  /**
   * List invoices/sales for a store with filters.
   */
  async findAll(storeId: string, userId: string, query: QuerySalesDto) {
    await this.storesService.verifyMembership(storeId, userId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          user: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single invoice with full details.
   */
  async findOne(storeId: string, invoiceId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, storeId },
      include: {
        items: {
          include: {
            batch: {
              include: {
                medicine: { select: { name: true, genericName: true, dosageForm: true } },
              },
            },
          },
        },
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /**
   * Generate a unique invoice number: INV-YYYYMMDD-XXXX
   */
  private async generateInvoiceNumber(tx: any, storeId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Count invoices created today for this store
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await tx.invoice.count({
      where: {
        storeId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${dateStr}-${sequence}`;
  }
}
