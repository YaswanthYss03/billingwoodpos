import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CancelBillDto } from './dto/cancel-bill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, BillStatus } from '@prisma/client';
import { CurrentTenant, CurrentUserId } from '../common/decorators/user.decorator';

@ApiTags('billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new bill' })
  createBill(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() createBillDto: CreateBillDto,
  ) {
    return this.billingService.createBill(tenantId, userId, createBillDto);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel a bill (with inventory rollback)' })
  cancelBill(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() cancelBillDto: CancelBillDto,
  ) {
    return this.billingService.cancelBill(tenantId, userId, id, cancelBillDto.reason);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills' })
  @ApiQuery({ name: 'status', enum: BillStatus, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: BillStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.findAll(
      tenantId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.billingService.findOne(tenantId, id);
  }

  @Get('number/:billNumber')
  @ApiOperation({ summary: 'Get bill by number' })
  findByNumber(@CurrentTenant() tenantId: string, @Param('billNumber') billNumber: string) {
    return this.billingService.findByNumber(tenantId, billNumber);
  }
}
