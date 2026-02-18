import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/user.decorator';

@ApiTags('items')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new category' })
  create(@CurrentTenant() tenantId: string, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(tenantId, createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update category' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(tenantId, id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete category' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.categoriesService.remove(tenantId, id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle category active status' })
  toggleStatus(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.categoriesService.toggleStatus(tenantId, id);
  }
}
