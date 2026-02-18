import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiQuery({ name: 'refresh', required: false, description: 'Force refresh cache' })
  getDashboard(
    @CurrentTenant() tenantId: string,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true';
    return this.reportsService.getDashboardMetrics(tenantId, forceRefresh);
  }

  @Get('daily-sales')
  @ApiOperation({ summary: 'Get daily sales summary' })
  @ApiQuery({ name: 'date', required: false })
  getDailySales(@CurrentTenant() tenantId: string, @Query('date') date?: string) {
    return this.reportsService.getDailySalesSummary(
      tenantId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('sales-summary')
  @ApiOperation({ summary: 'Get sales summary for date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getSalesSummary(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('item-wise-sales')
  @ApiOperation({ summary: 'Get item-wise sales report' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getItemWiseSales(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getItemWiseSales(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('current-inventory')
  @ApiOperation({ summary: 'Get current inventory report' })
  getCurrentInventory(@CurrentTenant() tenantId: string) {
    return this.reportsService.getCurrentInventory(tenantId);
  }

  @Get('inventory-valuation')
  @ApiOperation({ summary: 'Get inventory valuation' })
  getInventoryValuation(@CurrentTenant() tenantId: string) {
    return this.reportsService.getInventoryValuation(tenantId);
  }

  @Get('top-selling')
  @ApiOperation({ summary: 'Get top selling items' })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTopSelling(
    @CurrentTenant() tenantId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopSellingItems(
      tenantId,
      days ? parseInt(days) : 30,
      limit ? parseInt(limit) : 10,
    );
  }
}
