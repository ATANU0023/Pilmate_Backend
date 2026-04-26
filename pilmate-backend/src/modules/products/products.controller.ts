import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateMedicineDto, UpdateMedicineDto, QueryMedicineDto } from './dto/medicine.dto';
import { CreateBatchDto, UpdateBatchDto } from './dto/batch.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('stores/:storeId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ---- Categories ----

  @Post('categories')
  @ResponseMessage('Category created successfully')
  async createCategory(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.productsService.createCategory(storeId, req.user.userId, dto);
  }

  @Get('categories')
  @ResponseMessage('Categories fetched successfully')
  async findAllCategories(@Param('storeId') storeId: string, @Request() req) {
    return this.productsService.findAllCategories(storeId, req.user.userId);
  }

  @Patch('categories/:categoryId')
  @ResponseMessage('Category updated successfully')
  async updateCategory(
    @Param('storeId') storeId: string,
    @Param('categoryId') categoryId: string,
    @Request() req,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productsService.updateCategory(storeId, categoryId, req.user.userId, dto);
  }

  @Delete('categories/:categoryId')
  @ResponseMessage('Category deleted successfully')
  async deleteCategory(
    @Param('storeId') storeId: string,
    @Param('categoryId') categoryId: string,
    @Request() req,
  ) {
    return this.productsService.deleteCategory(storeId, categoryId, req.user.userId);
  }

  // ---- Medicines ----

  @Post('medicines')
  @ResponseMessage('Medicine created successfully')
  async createMedicine(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreateMedicineDto,
  ) {
    return this.productsService.createMedicine(storeId, req.user.userId, dto);
  }

  @Get('medicines')
  @ResponseMessage('Medicines fetched successfully')
  async findAllMedicines(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query() query: QueryMedicineDto,
  ) {
    return this.productsService.findAllMedicines(storeId, req.user.userId, query);
  }

  @Get('medicines/:medicineId')
  @ResponseMessage('Medicine details fetched successfully')
  async findOneMedicine(
    @Param('storeId') storeId: string,
    @Param('medicineId') medicineId: string,
    @Request() req,
  ) {
    return this.productsService.findOneMedicine(storeId, medicineId, req.user.userId);
  }

  @Patch('medicines/:medicineId')
  @ResponseMessage('Medicine updated successfully')
  async updateMedicine(
    @Param('storeId') storeId: string,
    @Param('medicineId') medicineId: string,
    @Request() req,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.productsService.updateMedicine(storeId, medicineId, req.user.userId, dto);
  }

  @Delete('medicines/:medicineId')
  @ResponseMessage('Medicine deleted successfully')
  async deleteMedicine(
    @Param('storeId') storeId: string,
    @Param('medicineId') medicineId: string,
    @Request() req,
  ) {
    return this.productsService.deleteMedicine(storeId, medicineId, req.user.userId);
  }

  // ---- Batches ----

  @Post('medicines/:medicineId/batches')
  @ResponseMessage('Batch added successfully')
  async addBatch(
    @Param('storeId') storeId: string,
    @Param('medicineId') medicineId: string,
    @Request() req,
    @Body() dto: CreateBatchDto,
  ) {
    return this.productsService.addBatch(storeId, medicineId, req.user.userId, dto);
  }

  @Get('medicines/:medicineId/batches')
  @ResponseMessage('Batches fetched successfully')
  async findBatches(
    @Param('storeId') storeId: string,
    @Param('medicineId') medicineId: string,
    @Request() req,
  ) {
    return this.productsService.findBatches(storeId, medicineId, req.user.userId);
  }

  @Patch('batches/:batchId')
  @ResponseMessage('Batch updated successfully')
  async updateBatch(
    @Param('storeId') storeId: string,
    @Param('batchId') batchId: string,
    @Request() req,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.productsService.updateBatch(storeId, batchId, req.user.userId, dto);
  }

  // ---- Alerts ----

  @Get('low-stock')
  @ResponseMessage('Low stock alerts fetched successfully')
  async getLowStock(@Param('storeId') storeId: string, @Request() req) {
    return this.productsService.getLowStockMedicines(storeId, req.user.userId);
  }

  @Get('expiring')
  @ResponseMessage('Expiring product alerts fetched successfully')
  async getExpiring(
    @Param('storeId') storeId: string,
    @Request() req,
    @Query('days') days?: string,
  ) {
    return this.productsService.getExpiringBatches(
      storeId,
      req.user.userId,
      days ? parseInt(days) : 30,
    );
  }

  // ---- Suppliers ----

  @Post('suppliers')
  @ResponseMessage('Supplier created successfully')
  async createSupplier(
    @Param('storeId') storeId: string,
    @Request() req,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.productsService.createSupplier(storeId, req.user.userId, dto);
  }

  @Get('suppliers')
  @ResponseMessage('Suppliers fetched successfully')
  async findAllSuppliers(@Param('storeId') storeId: string, @Request() req) {
    return this.productsService.findAllSuppliers(storeId, req.user.userId);
  }

  @Get('suppliers/:supplierId')
  @ResponseMessage('Supplier details fetched successfully')
  async findOneSupplier(
    @Param('storeId') storeId: string,
    @Param('supplierId') supplierId: string,
    @Request() req,
  ) {
    return this.productsService.findOneSupplier(storeId, supplierId, req.user.userId);
  }

  @Patch('suppliers/:supplierId')
  @ResponseMessage('Supplier updated successfully')
  async updateSupplier(
    @Param('storeId') storeId: string,
    @Param('supplierId') supplierId: string,
    @Request() req,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.productsService.updateSupplier(storeId, supplierId, req.user.userId, dto);
  }

  @Delete('suppliers/:supplierId')
  @ResponseMessage('Supplier deleted successfully')
  async deleteSupplier(
    @Param('storeId') storeId: string,
    @Param('supplierId') supplierId: string,
    @Request() req,
  ) {
    return this.productsService.deleteSupplier(storeId, supplierId, req.user.userId);
  }
}

