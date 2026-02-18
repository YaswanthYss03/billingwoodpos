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
import { KotService } from './kot.service';
import { CreateKotDto } from './dto/create-kot.dto';
import { UpdateKotStatusDto } from './dto/update-kot-status.dto';
import { CancelKotDto } from './dto/cancel-kot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, KOTStatus } from '@prisma/client';
import { CurrentTenant, CurrentUserId } from '../common/decorators/user.decorator';

@ApiTags('kot')
@Controller('kot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KotController {
  constructor(private readonly kotService: KotService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new KOT' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() createKotDto: CreateKotDto,
  ) {
    return this.kotService.create(tenantId, userId, createKotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all KOTs' })
  @ApiQuery({ name: 'status', enum: KOTStatus, required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: KOTStatus,
  ) {
    return this.kotService.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KOT by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.kotService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.KITCHEN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update KOT status' })
  updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateKotStatusDto: UpdateKotStatusDto,
  ) {
    return this.kotService.updateStatus(tenantId, userId, id, updateKotStatusDto.status);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel KOT' })
  cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() cancelKotDto: CancelKotDto,
  ) {
    return this.kotService.cancel(tenantId, userId, id, cancelKotDto.reason);
  }
}
