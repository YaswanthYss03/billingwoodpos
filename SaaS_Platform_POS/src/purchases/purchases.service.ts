import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate purchase number
   */
  private async generatePurchaseNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const prefix = `PO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastPurchase = await this.prisma.purchase.findFirst({
      where: {
        tenantId,
        purchaseNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastPurchase) {
      const lastSequence = parseInt(lastPurchase.purchaseNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a new purchase order
   */
  async create(tenantId: string, createPurchaseDto: CreatePurchaseDto) {
    const purchaseNumber = await this.generatePurchaseNumber(tenantId);

    // Calculate total
    const totalAmount = createPurchaseDto.items.reduce((sum, item) => {
      return sum + item.quantity * item.costPrice;
    }, 0);

    return this.prisma.executeInTransaction(async (tx) => {
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          purchaseNumber,
          supplierName: createPurchaseDto.supplierName,
          invoiceNumber: createPurchaseDto.invoiceNumber,
          purchaseDate: createPurchaseDto.purchaseDate || new Date(),
          totalAmount: new Decimal(totalAmount),
          notes: createPurchaseDto.notes,
          status: 'DRAFT',
        },
      });

      // Create purchase items
      for (const item of createPurchaseDto.items) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            itemId: item.itemId,
            quantity: new Decimal(item.quantity),
            costPrice: new Decimal(item.costPrice),
            totalCost: new Decimal(item.quantity * item.costPrice),
          },
        });
      }

      // Return with items
      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          items: {
            include: {
              item: true,
            },
          },
        },
      });
    });
  }

  /**
   * Receive purchase and create inventory batches
   */
  async receivePurchase(
    tenantId: string,
    purchaseId: string,
    receivePurchaseDto: ReceivePurchaseDto,
  ) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
    }

    if (purchase.status !== 'DRAFT') {
      throw new BadRequestException('Purchase has already been received or cancelled');
    }

    return this.prisma.executeInTransaction(async (tx) => {
      // Update purchase status
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          receivedDate: receivePurchaseDto.receivedDate || new Date(),
        },
      });

      // Create inventory batches for each item
      for (const purchaseItem of purchase.items) {
        const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        await tx.inventoryBatch.create({
          data: {
            tenantId,
            itemId: purchaseItem.itemId,
            purchaseId: purchase.id,
            batchNumber,
            initialQuantity: purchaseItem.quantity,
            currentQuantity: purchaseItem.quantity,
            costPrice: purchaseItem.costPrice,
            purchaseDate: receivePurchaseDto.receivedDate || new Date(),
            expiryDate: null, // Can be enhanced later
          },
        });

        this.logger.log(
          `Created batch ${batchNumber} for item ${purchaseItem.itemId} with quantity ${purchaseItem.quantity}`,
        );
      }

      return tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          items: {
            include: {
              item: true,
            },
          },
          inventoryBatches: true,
        },
      });
    });
  }

  /**
   * Get all purchases
   */
  async findAll(tenantId: string, status?: PurchaseStatus) {
    return this.prisma.purchase.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get purchase by ID
   */
  async findOne(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        inventoryBatches: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Cancel purchase
   */
  async cancel(tenantId: string, id: string) {
    const purchase = await this.findOne(tenantId, id);

    if (purchase.status === 'RECEIVED') {
      throw new BadRequestException(
        'Cannot cancel a received purchase. Inventory has already been updated.',
      );
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Delete purchase
   */
  async remove(tenantId: string, id: string) {
    const purchase = await this.findOne(tenantId, id);

    if (purchase.status === 'RECEIVED') {
      throw new BadRequestException(
        'Cannot delete a received purchase. Cancel related bills first.',
      );
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
