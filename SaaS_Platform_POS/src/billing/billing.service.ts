import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { InventoryService, BatchAllocation } from '../inventory/inventory.service';
import { ItemsService } from '../items/services/items.service';
import { AuditService } from '../audit/audit.service';
import { PrintingService } from '../printing/printing.service';
import { TenantsService } from '../tenants/tenants.service';
import { KotService } from '../kot/kot.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { BillStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private inventoryService: InventoryService,
    private itemsService: ItemsService,
    private auditService: AuditService,
    private printingService: PrintingService,
    private tenantsService: TenantsService,
    private kotService: KotService,
  ) {}

  /**
   * Generate bill number using Redis counter (FAST) with DB fallback
   * Redis: ~5-10ms | DB: ~200-400ms
   */
  private async generateBillNumber(tenantId: string, tx?: any): Promise<string> {
    const today = new Date();
    const prefix = `BILL${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Try Redis-based counter first (FAST path - ~5ms)
    if (this.redis.isEnabled()) {
      try {
        const counterKey = `bill_counter:${tenantId}:${prefix}`;
        
        // Try to increment counter
        let sequence = await this.redis.increment(counterKey);
        
        // If this is first increment (sequence = 1), check if we need to sync with DB
        if (sequence === 1) {
          // Query DB to see if bills already exist for this month
          // Use main prisma (not tx) to avoid locking issues
          const lastBill = await this.prisma.bill.findFirst({
            where: {
              tenantId,
              billNumber: { startsWith: prefix },
            },
            orderBy: { billNumber: 'desc' },
            select: { billNumber: true },
          });

          if (lastBill) {
            // Bills exist, set counter to last sequence and re-increment
            const lastSequence = parseInt(lastBill.billNumber.slice(-6));
            await this.redis.setCounter(counterKey, lastSequence);
            sequence = await this.redis.increment(counterKey);
            this.logger.log(`Synced bill counter for ${prefix} from DB: ${lastSequence} -> ${sequence}`);
          }
        }
        
        // Set expiry to end of next month (only on first use)
        if (sequence === 1) {
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
          const ttl = Math.floor((nextMonth.getTime() - Date.now()) / 1000);
          await this.redis.client.expire(counterKey, ttl);
        }
        
        return `${prefix}${String(sequence).padStart(6, '0')}`;
      } catch (error) {
        this.logger.warn('Redis counter failed, falling back to DB-based generation', error);
      }
    }
    
    // Fallback: DB-based generation (SLOW path - ~200-400ms)
    // Also used if Redis is unavailable
    const prismaClient = tx || this.prisma;
    
    const lastBill = await prismaClient.bill.findFirst({
      where: {
        tenantId,
        billNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { billNumber: 'desc' },
    });

    let sequence = 1;
    if (lastBill) {
      const lastSequence = parseInt(lastBill.billNumber.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Create a new bill (FULLY TRANSACTIONAL with retry logic for bill number collision)
   */
  async createBill(tenantId: string, userId: string, createBillDto: CreateBillDto) {
    this.logger.log(`Creating bill for tenant ${tenantId} by user ${userId}`);

    // Retry up to 3 times in case of bill number collision
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const bill = await this.createBillInternal(tenantId, userId, createBillDto);
        
        // CRITICAL: Do NOT await - run in background
        setImmediate(() => this.clearDashboardCache(tenantId));
        
        return bill;
      } catch (error) {
        // Check if it's a unique constraint violation on bill number
        // Prisma returns 'bill_number' (snake_case) in error.meta.target
        if (error.code === 'P2002' && (error.meta?.target?.includes('billNumber') || error.meta?.target?.includes('bill_number'))) {
          retries++;
          this.logger.warn(
            `Bill number collision detected, retrying (${retries}/${maxRetries})...`,
          );
          
          if (retries >= maxRetries) {
            throw new BadRequestException(
              'Failed to generate unique bill number after multiple attempts. Please try again.',
            );
          }
          
          // Exponential backoff with jitter: 100ms, 200ms, 400ms (plus random 0-50ms)
          const baseDelay = 100 * Math.pow(2, retries - 1);
          const jitter = Math.floor(Math.random() * 50);
          await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
          continue;
        }
        
        // Re-throw other errors
        throw error;
      }
    }
  }

  /**
   * Internal method to create bill (used by createBill with retry logic)
   * ULTRA-OPTIMIZED: Single transaction, no pre/post fetches, <800ms target
   */
  private async createBillInternal(tenantId: string, userId: string, createBillDto: CreateBillDto) {
    const startTime = Date.now();
    this.logger.log('=== BILL CREATION STARTED (ULTRA-OPTIMIZED) ===');

    // CRITICAL: NO pre-billing data fetch - trust input snapshot
    // Frontend sends complete item snapshot: price, gstRate, trackInventory, inventoryMode
    // This eliminates 2-3 SELECT queries (items, tenants)
    
    // Map input items directly (no DB fetch)
    const itemsData = createBillDto.items.map((billItem) => ({
      itemId: billItem.itemId,
      quantity: billItem.quantity,
      price: billItem.price,
      gstRate: billItem.gstRate,
      gstAmount: billItem.gstAmount,
      totalAmount: billItem.totalAmount,
      item: {
        id: billItem.itemId,
        name: billItem.itemName,
        price: billItem.price,
        trackInventory: billItem.trackInventory,
        inventoryMode: billItem.inventoryMode,
      },
    }));

    // Calculate bill totals
    const subtotal = itemsData.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0,
    );
    const taxAmount = itemsData.reduce(
      (sum, item) => sum + item.gstAmount,
      0,
    );
    const discount = createBillDto.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;

    // CRITICAL: Use inventory method from input (no tenant fetch needed)
    const inventoryMethod = createBillDto.inventoryMethod;

    this.logger.log('Starting single transaction...');
    const txStart = Date.now();

    // CRITICAL: SINGLE transaction - only bill create, bill_items, inventory
    const result = await this.prisma.executeInTransaction(async (tx) => {
      // 1. Generate bill number (Redis atomic - fast)
      const billNumber = await this.generateBillNumber(tenantId, tx);
      
      // 2. Create bill
      const bill = await tx.bill.create({
        data: {
          tenantId,
          userId,
          kotId: createBillDto.kotId || null,
          billNumber,
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(taxAmount),
          discount: new Decimal(discount),
          totalAmount: new Decimal(totalAmount),
          paymentMethod: createBillDto.paymentMethod,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          orderType: createBillDto.orderType || null,
          customerName: createBillDto.customerName,
          customerPhone: createBillDto.customerPhone,
          notes: createBillDto.notes,
        },
      });

      // 3. Batch create all bill items (OPTIMIZED: single query)
      const billItemsToCreate = itemsData.map((itemData) => ({
        billId: bill.id,
        itemId: itemData.itemId,
        quantity: new Decimal(itemData.quantity),
        price: new Decimal(itemData.price),
        gstRate: new Decimal(itemData.gstRate),
        gstAmount: new Decimal(itemData.gstAmount),
        totalAmount: new Decimal(itemData.totalAmount),
      }));

      await tx.billItem.createMany({
        data: billItemsToCreate,
      });

      // NECESSARY: Fetch bill item IDs for foreign key constraint (minimal SELECT)
      // createMany doesn't return IDs, and bill_item_batches requires real IDs
      const createdBillItems = await tx.billItem.findMany({
        where: { billId: bill.id },
        select: {
          id: true,
          billId: true,
          itemId: true,
          quantity: true,
          price: true,
          gstRate: true,
          gstAmount: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // 4. OPTIMIZED BULK INVENTORY DEDUCTION (inside transaction)
      const itemsNeedingInventory = itemsData
        .filter(item => item.item.trackInventory && item.item.inventoryMode === 'AUTO')
        .map(item => ({ itemId: item.itemId, quantity: item.quantity }));

      if (itemsNeedingInventory.length > 0) {
        // Single SELECT with FOR UPDATE SKIP LOCKED, bulk UPDATE with CASE WHEN
        const bulkAllocations = await this.inventoryService.deductInventoryBulk(
          tenantId,
          itemsNeedingInventory,
          inventoryMethod,
          tx,
        );

        // Create bill item batch records (inventory audit trail)
        const allBatchRecords: any[] = [];
        
        itemsData.forEach((itemData, index) => {
          const billItem = createdBillItems[index];
          const allocations = bulkAllocations.get(itemData.itemId);
          
          if (allocations && allocations.length > 0) {
            const batchRecords = allocations.map(allocation => ({
              billItemId: billItem.id,
              batchId: allocation.batchId,
              quantityUsed: new Decimal(allocation.quantityUsed),
              costPrice: new Decimal(allocation.costPrice),
            }));
            allBatchRecords.push(...batchRecords);
          }
        });

        if (allBatchRecords.length > 0) {
          await tx.billItemBatch.createMany({
            data: allBatchRecords,
          });
        }
      }

      // CRITICAL: Construct response in-memory (NO post-transaction SELECTs)
      const billResponse = {
        id: bill.id,
        billNumber: bill.billNumber,
        tenantId: bill.tenantId,
        userId: bill.userId,
        subtotal: bill.subtotal,
        taxAmount: bill.taxAmount,
        discount: bill.discount,
        totalAmount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
        paymentStatus: bill.paymentStatus,
        status: bill.status,
        orderType: bill.orderType,
        kotId: bill.kotId,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        notes: bill.notes,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
        items: createdBillItems.map((billItem, index) => ({
          id: billItem.id,
          billId: billItem.billId,
          itemId: billItem.itemId,
          quantity: billItem.quantity,
          price: billItem.price,
          gstRate: billItem.gstRate,
          gstAmount: billItem.gstAmount,
          totalAmount: billItem.totalAmount,
          item: {
            id: itemsData[index].item.id,
            name: itemsData[index].item.name,
            price: itemsData[index].item.price,
          },
        })),
      };

      // Move KOT update to async (non-blocking)
      if (createBillDto.kotId) {
        setImmediate(async () => {
          try {
            await this.prisma.kOT.update({
              where: { id: createBillDto.kotId, tenantId },
              data: { status: 'BILLED' },
            });
            this.logger.log(`KOT ${createBillDto.kotId} marked as BILLED`);
          } catch (error) {
            this.logger.error(`KOT update failed: ${error.message}`);
          }
        });
      }

      return billResponse;
    });

    this.logger.log(`Transaction ${Date.now() - txStart}ms | Total ${Date.now() - startTime}ms`);
    this.logger.log(`=== BILL ${result.billNumber} CREATED (ULTRA-FAST) ===`);

    // CRITICAL: Build print payload from in-memory data (NO DB queries)
    const printPayload = {
      type: 'BILL',
      billNumber: result.billNumber,
      date: result.createdAt,
      items: result.items.map((item, index) => ({
        name: itemsData[index].item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        gstRate: Number(item.gstRate),
        gstAmount: Number(item.gstAmount),
        total: Number(item.totalAmount),
      })),
      subtotal: Number(result.subtotal),
      taxAmount: Number(result.taxAmount),
      discount: Number(result.discount),
      totalAmount: Number(result.totalAmount),
      paymentMethod: result.paymentMethod,
      customerName: result.customerName,
      customerPhone: result.customerPhone,
      notes: result.notes,
    };

    // ASYNC: Separate fire-and-forget operations (truly non-blocking)
    setImmediate(async () => {
      try {
        await this.printingService.queueBillPrintWithPayload(result.id, tenantId, printPayload);
      } catch (error) {
        this.logger.error(`Print job failed (non-critical): ${error.message}`);
      }
    });

    setImmediate(async () => {
      try {
        await this.auditService.logCreate(tenantId, userId, 'Bill', result.id, {
          billNumber: result.billNumber,
          totalAmount,
          itemCount: itemsData.length,
        });
      } catch (error) {
        this.logger.error(`Audit log failed (non-critical): ${error.message}`);
      }
    });

    return result;
  }

  /**
   * Clear dashboard cache for today's sales
   */
  private async clearDashboardCache(tenantId: string) {
    try {
      const today = new Date();
      const start = startOfDay(today);
      const cacheKey = `reports:daily-sales:${start.toISOString()}`;
      await this.redis.delTenantCache(tenantId, cacheKey);
      this.logger.log(`Cleared dashboard cache for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to clear dashboard cache: ${error.message}`);
      // Don't throw - cache clearing is not critical
    }
  }

  /**
   * Cancel a bill (with inventory rollback)
   */
  async cancelBill(tenantId: string, userId: string, billId: string, reason: string) {
    this.logger.warn(`Attempting to cancel bill ${billId} by user ${userId}`);

    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, tenantId },
      include: {
        items: {
          include: {
            batches: true,
            item: true,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${billId} not found`);
    }

    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Bill is already cancelled');
    }

    const result = await this.prisma.executeInTransaction(async (tx) => {
      // 1. Restore inventory
      for (const billItem of bill.items) {
        if (billItem.item.trackInventory && billItem.batches.length > 0) {
          const allocations: BatchAllocation[] = billItem.batches.map((b) => ({
            batchId: b.batchId,
            quantityUsed: Number(b.quantityUsed),
            costPrice: Number(b.costPrice),
          }));

          await this.inventoryService.restoreInventory(allocations, tx);

          this.logger.log(
            `Inventory restored for item ${billItem.item.name}: ${billItem.quantity} units`,
          );
        }
      }

      // 2. Update bill status
      const cancelledBill = await tx.bill.update({
        where: { id: billId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: bill.notes ? `${bill.notes}\n\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`,
        },
      });

      // 3. Create audit log
      await this.auditService.logCancel(tenantId, userId, 'Bill', billId, {
        billNumber: bill.billNumber,
        totalAmount: Number(bill.totalAmount),
        reason,
      });

      return cancelledBill;
    });

    // Clear dashboard cache after bill cancellation
    await this.clearDashboardCache(tenantId);

    return result;
  }

  /**
   * Get all bills
   */
  async findAll(
    tenantId: string,
    status?: BillStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.prisma.bill.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(startDate && endDate && {
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { billedAt: 'desc' },
    });
  }

  /**
   * Get bill by ID
   */
  async findOne(tenantId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            item: true,
            batches: {
              include: {
                batch: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        kot: true,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    return bill;
  }

  /**
   * Get bill by number
   */
  async findByNumber(tenantId: string, billNumber: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { billNumber, tenantId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with number ${billNumber} not found`);
    }

    return bill;
  }
}
