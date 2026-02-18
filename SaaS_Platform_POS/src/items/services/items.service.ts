import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { RedisService } from '../../common/services/redis.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(tenantId: string, createItemDto: CreateItemDto) {
    const item = await this.prisma.item.create({
      data: {
        tenantId,
        categoryId: createItemDto.categoryId,
        name: createItemDto.name,
        description: createItemDto.description,
        sku: createItemDto.sku,
        itemType: createItemDto.itemType || 'SIMPLE',
        price: createItemDto.price,
        gstRate: createItemDto.gstRate || 0,
        trackInventory: createItemDto.trackInventory ?? true,
        unit: createItemDto.unit || 'PCS',
      },
      include: {
        category: true,
      },
    });

    // Cache the new item immediately (5 min TTL)
    await this.redis.set(`item:${tenantId}:${item.id}`, {
      id: item.id,
      name: item.name,
      price: item.price,
      gstRate: item.gstRate,
      trackInventory: item.trackInventory,
      inventoryMode: (item as any).inventoryMode,
      isActive: item.isActive,
    }, 300);

    // Invalidate tenant items cache
    await this.redis.delTenantCache(tenantId, 'items');

    return item;
  }

  async findAll(tenantId: string, categoryId?: string) {
    const cacheKey = categoryId ? `items:category:${categoryId}` : 'items';
    
    // Try cache first
    const cached = await this.redis.getTenantCache(tenantId, cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    // Cache for 30 minutes
    await this.redis.setTenantCache(tenantId, cacheKey, items, 1800);

    return items;
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async findByCategory(tenantId: string, categoryId: string) {
    return this.findAll(tenantId, categoryId);
  }

  async update(tenantId: string, id: string, updateItemDto: UpdateItemDto) {
    await this.findOne(tenantId, id); // Ensure exists

    const item = await this.prisma.item.update({
      where: { id },
      data: updateItemDto,
      include: {
        category: true,
      },
    });

    // Update individual item cache
    await this.redis.set(`item:${tenantId}:${item.id}`, {
      id: item.id,
      name: item.name,
      price: item.price,
      gstRate: item.gstRate,
      trackInventory: item.trackInventory,
      inventoryMode: (item as any).inventoryMode,
      isActive: item.isActive,
    }, 300);

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return item;
  }

  async remove(tenantId: string, id: string) {
    const item = await this.findOne(tenantId, id); // Ensure exists

    const updated = await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Remove from cache
    await this.redis.del(`item:${tenantId}:${id}`);
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return updated;
  }

  async toggleStatus(tenantId: string, id: string) {
    const item = await this.findOne(tenantId, id);

    const updated = await this.prisma.item.update({
      where: { id },
      data: { isActive: !item.isActive },
    });

    // Update individual item cache
    await this.redis.set(`item:${tenantId}:${id}`, {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      gstRate: updated.gstRate,
      trackInventory: updated.trackInventory,
      inventoryMode: (updated as any).inventoryMode,
      isActive: updated.isActive,
    }, 300);

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return updated;
  }

  async getCurrentStock(tenantId: string, itemId: string): Promise<number> {
    const item = await this.findOne(tenantId, itemId);

    if (!item.trackInventory) {
      return Infinity; // Unlimited stock for non-tracked items
    }

    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        itemId,
        currentQuantity: { gt: 0 },
      },
    });

    const totalStock = batches.reduce((sum, batch) => {
      return sum + Number(batch.currentQuantity);
    }, 0);

    return totalStock;
  }

  /**
   * Pre-warm cache with active items for a tenant
   * Call this on app startup or when tenant logs in
   */
  async preWarmCache(tenantId: string): Promise<void> {
    try {
      const items = await this.prisma.item.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          gstRate: true,
          trackInventory: true,
          inventoryMode: true,
          isActive: true,
        },
      });

      // Cache each item individually (5 minutes TTL)
      await Promise.all(
        items.map(item =>
          this.redis.set(`item:${tenantId}:${item.id}`, item, 300)
        )
      );

      console.log(`Pre-warmed cache with ${items.length} items for tenant ${tenantId}`);
    } catch (error) {
      console.error('Failed to pre-warm cache:', error);
    }
  }
}
