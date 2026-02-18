import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('batches')
  @ApiOperation({ summary: 'Get all inventory batches' })
  @ApiQuery({ name: 'itemId', required: false })
  getBatches(@CurrentTenant() tenantId: string, @Query('itemId') itemId?: string) {
    return this.inventoryService.getBatches(tenantId, itemId);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch by ID' })
  getBatch(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getBatch(tenantId, id);
  }

  @Get('stock/:itemId')
  @ApiOperation({ summary: 'Get current stock for an item' })
  getCurrentStock(@CurrentTenant() tenantId: string, @Param('itemId') itemId: string) {
    return this.inventoryService.getCurrentStock(tenantId, itemId);
  }

  @Get('valuation')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get inventory valuation' })
  getValuation(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getInventoryValuation(tenantId);
  }

  @Get('low-stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiQuery({ name: 'threshold', required: false })
  getLowStock(
    @CurrentTenant() tenantId: string,
    @Query('threshold') threshold?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold) : 10;
    return this.inventoryService.getLowStockItems(tenantId, thresholdNum);
  }

  @Post('adjust')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Manual inventory adjustment' })
  adjustInventory(
    @CurrentTenant() tenantId: string,
    @Body() adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(
      tenantId,
      adjustInventoryDto.batchId,
      adjustInventoryDto.newQuantity,
      adjustInventoryDto.reason,
    );
  }
}
