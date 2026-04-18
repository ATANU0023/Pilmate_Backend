import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateMedicineDto, UpdateMedicineDto, QueryMedicineDto } from './dto/medicine.dto';
import { CreateBatchDto, UpdateBatchDto } from './dto/batch.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // ============================================
  // CATEGORIES
  // ============================================

  async createCategory(storeId: string, userId: string, dto: CreateCategoryDto) {
    await this.storesService.verifyMembership(storeId, userId);

    const category = await this.prisma.category.create({
      data: { storeId, name: dto.name },
    });

    return { message: 'Category created', category };
  }

  async findAllCategories(storeId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    return this.prisma.category.findMany({
      where: { storeId },
      include: { _count: { select: { medicines: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(storeId: string, categoryId: string, userId: string, dto: UpdateCategoryDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId },
    });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { name: dto.name },
    });
  }

  async deleteCategory(storeId: string, categoryId: string, userId: string) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId },
    });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.category.delete({ where: { id: categoryId } });
    return { message: 'Category deleted' };
  }

  // ============================================
  // MEDICINES
  // ============================================

  async createMedicine(storeId: string, userId: string, dto: CreateMedicineDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager', 'Pharmacist']);
    await this.subscriptionsService.canAddMedicine(storeId);

    const medicine = await this.prisma.medicine.create({
      data: {
        storeId,
        name: dto.name,
        categoryId: dto.categoryId,
        genericName: dto.genericName,
        sku: dto.sku,
        description: dto.description,
        dosageForm: dto.dosageForm,
        reorderLevel: dto.reorderLevel ?? 10,
      },
      include: { category: true },
    });

    return { message: 'Medicine created', medicine };
  }

  async findAllMedicines(storeId: string, userId: string, query: QueryMedicineDto) {
    await this.storesService.verifyMembership(storeId, userId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { genericName: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.dosageForm) {
      where.dosageForm = query.dosageForm;
    }

    const [medicines, total] = await Promise.all([
      this.prisma.medicine.findMany({
        where,
        include: {
          category: true,
          batches: {
            where: { status: 'active' },
            select: { quantity: true, sellingPrice: true, expiryDate: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.medicine.count({ where }),
    ]);

    // Compute total stock for each medicine
    const data = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      const latestPrice = med.batches.length > 0
        ? Number(med.batches[0].sellingPrice)
        : null;

      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        sku: med.sku,
        description: med.description,
        dosageForm: med.dosageForm,
        reorderLevel: med.reorderLevel,
        category: med.category ? { id: med.category.id, name: med.category.name } : null,
        totalStock,
        currentPrice: latestPrice,
        isLowStock: totalStock <= med.reorderLevel,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneMedicine(storeId: string, medicineId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const medicine = await this.prisma.medicine.findFirst({
      where: { id: medicineId, storeId },
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: 'asc' },
          include: { supplier: { select: { supplierName: true } } },
        },
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!medicine) throw new NotFoundException('Medicine not found');

    const totalStock = medicine.batches
      .filter((b) => b.status === 'active')
      .reduce((sum, b) => sum + b.quantity, 0);

    return {
      ...medicine,
      totalStock,
      isLowStock: totalStock <= medicine.reorderLevel,
    };
  }

  async updateMedicine(storeId: string, medicineId: string, userId: string, dto: UpdateMedicineDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager', 'Pharmacist']);

    const medicine = await this.prisma.medicine.findFirst({
      where: { id: medicineId, storeId },
    });
    if (!medicine) throw new NotFoundException('Medicine not found');

    const updated = await this.prisma.medicine.update({
      where: { id: medicineId },
      data: dto,
      include: { category: true },
    });

    return { message: 'Medicine updated', medicine: updated };
  }

  async deleteMedicine(storeId: string, medicineId: string, userId: string) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const medicine = await this.prisma.medicine.findFirst({
      where: { id: medicineId, storeId },
    });
    if (!medicine) throw new NotFoundException('Medicine not found');

    await this.prisma.medicine.delete({ where: { id: medicineId } });
    return { message: 'Medicine deleted' };
  }

  // ============================================
  // INVENTORY BATCHES
  // ============================================

  async addBatch(storeId: string, medicineId: string, userId: string, dto: CreateBatchDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager', 'Pharmacist']);

    const medicine = await this.prisma.medicine.findFirst({
      where: { id: medicineId, storeId },
    });
    if (!medicine) throw new NotFoundException('Medicine not found');

    const batch = await this.prisma.inventoryBatch.create({
      data: {
        storeId,
        medicineId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        expiryDate: new Date(dto.expiryDate),
        purchasePrice: dto.purchasePrice,
        sellingPrice: dto.sellingPrice,
        supplierId: dto.supplierId,
        status: 'active',
      },
      include: { medicine: { select: { name: true } } },
    });

    return { message: 'Batch added to inventory', batch };
  }

  async findBatches(storeId: string, medicineId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    return this.prisma.inventoryBatch.findMany({
      where: { storeId, medicineId },
      include: { supplier: { select: { supplierName: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async updateBatch(storeId: string, batchId: string, userId: string, dto: UpdateBatchDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager', 'Pharmacist']);

    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id: batchId, storeId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    // Track price changes
    if (dto.sellingPrice !== undefined && dto.sellingPrice !== Number(batch.sellingPrice)) {
      await this.prisma.priceHistory.create({
        data: {
          storeId,
          medicineId: batch.medicineId,
          oldSellingPrice: batch.sellingPrice,
          newSellingPrice: dto.sellingPrice,
          changedByUserId: userId,
          reason: 'Batch price update',
        },
      });
    }

    const updated = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        quantity: dto.quantity,
        sellingPrice: dto.sellingPrice,
        status: dto.status,
      },
    });

    return { message: 'Batch updated', batch: updated };
  }

  // ============================================
  // ALERTS
  // ============================================

  async getLowStockMedicines(storeId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const medicines = await this.prisma.medicine.findMany({
      where: { storeId },
      include: {
        batches: {
          where: { status: 'active' },
          select: { quantity: true },
        },
        category: true,
      },
    });

    return medicines
      .map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          id: med.id,
          name: med.name,
          genericName: med.genericName,
          category: med.category?.name,
          totalStock,
          reorderLevel: med.reorderLevel,
          deficit: med.reorderLevel - totalStock,
        };
      })
      .filter((med) => med.totalStock <= med.reorderLevel)
      .sort((a, b) => a.deficit - b.deficit); // Most urgent first (highest deficit)
  }

  async getExpiringBatches(storeId: string, userId: string, days: number = 30) {
    await this.storesService.verifyMembership(storeId, userId);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        storeId,
        status: 'active',
        expiryDate: { lte: futureDate },
        quantity: { gt: 0 },
      },
      include: {
        medicine: { select: { name: true, genericName: true } },
        supplier: { select: { supplierName: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => ({
      ...b,
      isExpired: new Date(b.expiryDate) < new Date(),
      daysUntilExpiry: Math.ceil(
        (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  // ============================================
  // SUPPLIERS
  // ============================================

  async createSupplier(storeId: string, userId: string, dto: CreateSupplierDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const supplier = await this.prisma.supplier.create({
      data: { storeId, ...dto },
    });

    return { message: 'Supplier created', supplier };
  }

  async findAllSuppliers(storeId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    return this.prisma.supplier.findMany({
      where: { storeId, isActive: true },
      orderBy: { supplierName: 'asc' },
    });
  }

  async findOneSupplier(storeId: string, supplierId: string, userId: string) {
    await this.storesService.verifyMembership(storeId, userId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, storeId },
      include: {
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        _count: { select: { batches: true, purchaseOrders: true } },
      },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(storeId: string, supplierId: string, userId: string, dto: UpdateSupplierDto) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, storeId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const updated = await this.prisma.supplier.update({
      where: { id: supplierId },
      data: dto,
    });

    return { message: 'Supplier updated', supplier: updated };
  }

  async deleteSupplier(storeId: string, supplierId: string, userId: string) {
    await this.storesService.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, storeId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Soft delete
    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    });

    return { message: 'Supplier deactivated' };
  }
}
