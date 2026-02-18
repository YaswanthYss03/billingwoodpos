import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { RedisService } from '../../common/services/redis.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        sortOrder: createCategoryDto.sortOrder || 0,
      },
    });

    // Invalidate tenant categories cache
    await this.redis.delTenantCache(tenantId, 'categories');

    return category;
  }

  async findAll(tenantId: string) {
    // Try cache first
    const cached = await this.redis.getTenantCache(tenantId, 'categories');
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    // Cache for 30 minutes
    await this.redis.setTenantCache(tenantId, 'categories', categories, 1800);

    return categories;
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(tenantId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(tenantId, id); // Ensure exists

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'categories');

    return category;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Ensure exists

    const category = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'categories');

    return category;
  }

  async toggleStatus(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'categories');

    return updated;
  }
}
