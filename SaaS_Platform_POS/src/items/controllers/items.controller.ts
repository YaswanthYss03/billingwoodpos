import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ItemsService } from '../services/items.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/user.decorator';

@ApiTags('items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new item' })
  create(@CurrentTenant() tenantId: string, @Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(tenantId, createItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all items' })
  @ApiQuery({ name: 'categoryId', required: false })
  findAll(@CurrentTenant() tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.itemsService.findAll(tenantId, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Get current stock level for item' })
  getCurrentStock(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.getCurrentStock(tenantId, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update item' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(tenantId, id, updateItemDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete item' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.remove(tenantId, id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle item active status' })
  toggleStatus(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.toggleStatus(tenantId, id);
  }
}
