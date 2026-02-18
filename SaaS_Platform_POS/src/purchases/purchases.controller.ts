import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, PurchaseStatus } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';

@ApiTags('purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@ApiBearerAuth()
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  create(@CurrentTenant() tenantId: string, @Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(tenantId, createPurchaseDto);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive purchase and create inventory batches' })
  receivePurchase(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() receivePurchaseDto: ReceivePurchaseDto,
  ) {
    return this.purchasesService.receivePurchase(tenantId, id, receivePurchaseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all purchases' })
  @ApiQuery({ name: 'status', enum: PurchaseStatus, required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: PurchaseStatus,
  ) {
    return this.purchasesService.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasesService.findOne(tenantId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase' })
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasesService.cancel(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete purchase' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasesService.remove(tenantId, id);
  }
}
