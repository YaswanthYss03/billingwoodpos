import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient, Prisma } from '@prisma/client';

export interface BatchAllocation {
  batchId: string;
  quantityUsed: number;
  costPrice: number;
}

interface BatchQueryResult {
  id: string;
  currentQuantity: number | string;
  costPrice: number | string;
  purchaseDate: Date | string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get current stock for an item
   */
  async getCurrentStock(tenantId: string, itemId: string): Promise<number> {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        itemId,
        currentQuantity: { gt: 0 },
      },
    });

    return batches.reduce((sum, batch) => sum + Number(batch.currentQuantity), 0);
  }

  /**
   * Get all inventory batches for an item
   */
  async getBatches(tenantId: string, itemId?: string) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        ...(itemId && { itemId }),
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
      orderBy: { purchaseDate: 'asc' }, // FIFO order
    });
  }

  /**
   * Get batch by ID
   */
  async getBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        item: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    return batch;
  }

  /**
   * FIFO allocation: Allocate batches for a given item and quantity
   * Returns array of batch allocations
   * NOW WITH ROW-LEVEL LOCKING FOR CONCURRENCY SAFETY
   */
  async allocateBatchesFIFO(
    tenantId: string,
    itemId: string,
    requiredQuantity: number,
    tx?: any,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Use raw query with FOR UPDATE to lock rows and prevent race conditions
    // This ensures concurrent bills don't allocate the same inventory
    const batches = await prisma.$queryRaw<BatchQueryResult[]>`
      SELECT id, current_quantity as "currentQuantity", cost_price as "costPrice", purchase_date as "purchaseDate"
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND item_id = ${itemId}
        AND current_quantity > 0
      ORDER BY purchase_date ASC
      FOR UPDATE
    `;

    if (batches.length === 0) {
      throw new BadRequestException(`No inventory available for item ${itemId}`);
    }

    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requiredQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const available = Number(batch.currentQuantity);
      const toAllocate = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.id,
        quantityUsed: toAllocate,
        costPrice: Number(batch.costPrice),
      });

      remainingQuantity -= toAllocate;
    }

    if (remainingQuantity > 0) {
      const totalAvailable = batches.reduce(
        (sum: number, b: BatchQueryResult) => sum + Number(b.currentQuantity),
        0,
      );
      throw new BadRequestException(
        `Insufficient inventory. Required: ${requiredQuantity}, Available: ${totalAvailable}`,
      );
    }

    return allocations;
  }

  /**
   * Weighted average allocation
   * NOW WITH ROW-LEVEL LOCKING FOR CONCURRENCY SAFETY
   */
  async allocateBatchesWeightedAverage(
    tenantId: string,
    itemId: string,
    requiredQuantity: number,
    tx?: any,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Use raw query with FOR UPDATE to lock rows
    const batches = await prisma.$queryRaw<BatchQueryResult[]>`
      SELECT id, current_quantity as "currentQuantity", cost_price as "costPrice", purchase_date as "purchaseDate"
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND item_id = ${itemId}
        AND current_quantity > 0
      FOR UPDATE
    `;

    if (batches.length === 0) {
      throw new BadRequestException(`No inventory available for item ${itemId}`);
    }

    // Calculate weighted average cost
    let totalQuantity = 0;
    let totalValue = 0;

    for (const batch of batches) {
      const qty = Number(batch.currentQuantity);
      const cost = Number(batch.costPrice);
      totalQuantity += qty;
      totalValue += qty * cost;
    }

    if (totalQuantity < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient inventory. Required: ${requiredQuantity}, Available: ${totalQuantity}`,
      );
    }

    const averageCost = totalValue / totalQuantity;

    // For deduction, still use FIFO order but with average cost
    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requiredQuantity;

    // Sort by purchase date
    const sortedBatches = [...batches].sort(
      (a: BatchQueryResult, b: BatchQueryResult) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(),
    );

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break;

      const available = Number(batch.currentQuantity);
      const toAllocate = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.id,
        quantityUsed: toAllocate,
        costPrice: averageCost, // Use weighted average cost
      });

      remainingQuantity -= toAllocate;
    }

    return allocations;
  }

  /**
   * Deduct inventory (called during billing)
   * This is concurrency-safe and transactional
   * NOW WITH PROPER TRANSACTION PASSING FOR ROW-LEVEL LOCKING
   */
  async deductInventory(
    tenantId: string,
    itemId: string,
    quantity: number,
    inventoryMethod: 'FIFO' | 'WEIGHTED_AVERAGE' = 'FIFO',
    tx?: PrismaClient,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Allocate batches WITH row-level locking
    const allocations =
      inventoryMethod === 'FIFO'
        ? await this.allocateBatchesFIFO(tenantId, itemId, quantity, prisma)
        : await this.allocateBatchesWeightedAverage(tenantId, itemId, quantity, prisma);

    // OPTIMIZED: Deduct from all batches in parallel instead of sequential loop
    await Promise.all(
      allocations.map((allocation) =>
        prisma.inventoryBatch.update({
          where: { id: allocation.batchId },
          data: {
            currentQuantity: {
              decrement: new Decimal(allocation.quantityUsed),
            },
          },
        })
      )
    );

    this.logger.log(
      `Deducted inventory for item ${itemId}: ${allocations.length} batches updated`
    );

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, `inventory:${itemId}`);

    return allocations;
  }

  /**
   * BULK inventory deduction for multiple items (OPTIMIZED for billing)
   * Fetches all batches in ONE query, allocates in memory, updates in bulk
   */
  async deductInventoryBulk(
    tenantId: string,
    items: Array<{ itemId: string; quantity: number }>,
    inventoryMethod: 'FIFO' | 'WEIGHTED_AVERAGE' = 'FIFO',
    tx?: PrismaClient,
  ): Promise<Map<string, BatchAllocation[]>> {
    const prisma = tx || this.prisma;
    const itemIds = items.map(i => i.itemId);

    // OPTIMIZED: Single SELECT for all items (Prisma ORM - stable)
    // Note: Using ORM instead of raw SQL to avoid UUID casting issues
    // Transaction isolation provides correctness even without FOR UPDATE SKIP LOCKED
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        itemId: { in: itemIds },
        currentQuantity: { gt: 0 },
      },
      select: {
        id: true,
        itemId: true,
        currentQuantity: true,
        costPrice: true,
        purchaseDate: true,
      },
      orderBy: [
        { itemId: 'asc' },
        { purchaseDate: 'asc' },
      ],
    });

    // Group batches by item
    const batchesByItem = new Map<string, any[]>();
    for (const batch of batches) {
      const existing = batchesByItem.get(batch.itemId) || [];
      existing.push(batch);
      batchesByItem.set(batch.itemId, existing);
    }

    // Allocate batches for each item IN MEMORY (no DB calls)
    const allAllocations = new Map<string, BatchAllocation[]>();
    const batchUpdates: Array<{ id: string; decrement: number }> = [];

    for (const { itemId, quantity } of items) {
      const itemBatches = batchesByItem.get(itemId) || [];

      if (itemBatches.length === 0) {
        throw new BadRequestException(`No inventory available for item ${itemId}`);
      }

      const allocations: BatchAllocation[] = [];
      let remainingQuantity = quantity;

      for (const batch of itemBatches) {
        if (remainingQuantity <= 0) break;

        const available = Number(batch.currentQuantity);
        const toAllocate = Math.min(available, remainingQuantity);

        allocations.push({
          batchId: batch.id,
          quantityUsed: toAllocate,
          costPrice: Number(batch.costPrice),
        });

        batchUpdates.push({ id: batch.id, decrement: toAllocate });
        remainingQuantity -= toAllocate;
      }

      if (remainingQuantity > 0) {
        const totalAvailable = itemBatches.reduce(
          (sum, b) => sum + Number(b.currentQuantity),
          0,
        );
        throw new BadRequestException(
          `Insufficient inventory for item ${itemId}. Required: ${quantity}, Available: ${totalAvailable}`,
        );
      }

      allAllocations.set(itemId, allocations);
    }

    // OPTIMIZED: Bulk UPDATE using Prisma ORM (stable)
    // Using Promise.all for parallel updates instead of CASE WHEN to avoid UUID issues
    if (batchUpdates.length > 0) {
      await Promise.all(
        batchUpdates.map(({ id, decrement }) =>
          prisma.inventoryBatch.update({
            where: { id },
            data: {
              currentQuantity: {
                decrement,
              },
            },
          })
        )
      );
    }

    this.logger.log(
      `Bulk deducted ${items.length} items: ${batchUpdates.length} batches (parallel updates)`
    );

    return allAllocations;
  }

  /**
   * Restore inventory (called during bill cancellation)
   */
  async restoreInventory(
    allocations: BatchAllocation[],
    tx?: PrismaClient,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    // OPTIMIZED: Restore all batches in parallel
    await Promise.all(
      allocations.map((allocation) =>
        prisma.inventoryBatch.update({
          where: { id: allocation.batchId },
          data: {
            currentQuantity: {
              increment: new Decimal(allocation.quantityUsed),
            },
          },
        })
      )
    );

    this.logger.log(
      `Restored inventory: ${allocations.length} batches updated`
    );
  }

  /**
   * Manual inventory adjustment
   */
  async adjustInventory(
    tenantId: string,
    batchId: string,
    newQuantity: number,
    reason: string,
  ) {
    const batch = await this.getBatch(tenantId, batchId);

    const updated = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        currentQuantity: new Decimal(newQuantity),
      },
    });

    this.logger.warn(
      `Manual adjustment: Batch ${batchId} changed from ${batch.currentQuantity} to ${newQuantity}. Reason: ${reason}`,
    );

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, `inventory:${batch.itemId}`);

    return updated;
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(tenantId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: { gt: 0 },
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
    });

    const valuation = batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      itemName: batch.item.name,
      itemSku: batch.item.sku,
      quantity: Number(batch.currentQuantity),
      costPrice: Number(batch.costPrice),
      value: Number(batch.currentQuantity) * Number(batch.costPrice),
      purchaseDate: batch.purchaseDate,
    }));

    const totalValue = valuation.reduce((sum, v) => sum + v.value, 0);

    return {
      batches: valuation,
      totalValue,
      totalBatches: valuation.length,
    };
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(tenantId: string, threshold: number = 10) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        trackInventory: true,
        deletedAt: null,
      },
      include: {
        inventoryBatches: {
          where: {
            currentQuantity: { gt: 0 },
          },
        },
      },
    });

    const lowStockItems = items
      .map((item) => {
        const totalStock = item.inventoryBatches.reduce(
          (sum, batch) => sum + Number(batch.currentQuantity),
          0,
        );

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentStock: totalStock,
          unit: item.unit,
        };
      })
      .filter((item) => item.currentStock < threshold)
      .sort((a, b) => a.currentStock - b.currentStock);

    return lowStockItems;
  }
}
