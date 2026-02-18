import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { PrintingService } from '../printing/printing.service';
import { AuditService } from '../audit/audit.service';
import { CreateKotDto } from './dto/create-kot.dto';
import { UpdateKotDto } from './dto/update-kot.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { KOTStatus } from '@prisma/client';

@Injectable()
export class KotService {
  private readonly logger = new Logger(KotService.name);

  constructor(
    private prisma: PrismaService,
    private printingService: PrintingService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate KOT number
   */
  private async generateKotNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const prefix = `KOT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const lastKot = await this.prisma.kOT.findFirst({
      where: {
        tenantId,
        kotNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastKot) {
      const lastSequence = parseInt(lastKot.kotNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a new KOT (OPTIMIZED for speed)
   */
  async create(tenantId: string, userId: string, createKotDto: CreateKotDto) {
    const kotNumber = await this.generateKotNumber(tenantId);

    const result = await this.prisma.executeInTransaction(async (tx) => {
      // Create KOT
      const kot = await tx.kOT.create({
        data: {
          tenantId,
          userId,
          kotNumber,
          tableNumber: createKotDto.tableNumber,
          notes: createKotDto.notes,
          status: 'PENDING',
        },
      });

      // OPTIMIZED: Batch create all KOT items in one query
      await tx.kOTItem.createMany({
        data: createKotDto.items.map((item) => ({
          kotId: kot.id,
          itemId: item.itemId,
          quantity: new Decimal(item.quantity),
          notes: item.notes,
        })),
      });

      // Return with items
      return tx.kOT.findUnique({
        where: { id: kot.id },
        include: {
          items: {
            include: {
              item: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      });
    });

    // OPTIMIZED: Non-critical operations moved OUTSIDE transaction
    setImmediate(async () => {
      try {
        if (!result) {
          this.logger.error('KOT result is null, cannot complete post-operations');
          return;
        }
        await Promise.all([
          // Queue print job
          this.printingService.queueKotPrint(result.id),
          // Audit log
          this.auditService.logCreate(tenantId, userId, 'KOT', result.id, {
            kotNumber,
            tableNumber: createKotDto.tableNumber,
            itemCount: createKotDto.items.length,
          }),
        ]);
      } catch (error) {
        this.logger.error(`Non-critical post-KOT operations failed: ${error.message}`);
      }
    });

    return result;
  }

  /**
   * Get all KOTs
   */
  async findAll(tenantId: string, status?: KOTStatus) {
    return this.prisma.kOT.findMany({
      where: {
        tenantId,
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get KOT by ID
   */
  async findOne(tenantId: string, id: string) {
    const kot = await this.prisma.kOT.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            role: true,
          },
        },
        bills: true,
      },
    });

    if (!kot) {
      throw new NotFoundException(`KOT with ID ${id} not found`);
    }

    return kot;
  }

  /**
   * Update KOT status
   */
  async updateStatus(
    tenantId: string,
    userId: string,
    id: string,
    status: KOTStatus,
  ) {
    await this.findOne(tenantId, id); // Ensure exists

    const kot = await this.prisma.kOT.update({
      where: { id },
      data: { status },
    });

    // Audit log
    await this.auditService.logUpdate(tenantId, userId, 'KOT', id, { status: 'old' }, { status });

    return kot;
  }

  /**
   * Mark KOT as billed
   */
  async markAsBilled(tenantId: string, userId: string, id: string) {
    const kot = await this.findOne(tenantId, id);

    if (kot.status === 'BILLED') {
      throw new BadRequestException('KOT is already billed');
    }

    return this.prisma.kOT.update({
      where: { id },
      data: {
        status: 'BILLED',
        billedAt: new Date(),
      },
    });
  }

  /**
   * Cancel KOT
   */
  async cancel(tenantId: string, userId: string, id: string, reason: string) {
    const kot = await this.findOne(tenantId, id);

    if (kot.status === 'BILLED') {
      throw new BadRequestException('Cannot cancel a billed KOT');
    }

    const updated = await this.prisma.kOT.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Audit log
    await this.auditService.logCancel(tenantId, userId, 'KOT', id, {
      kotNumber: kot.kotNumber,
      reason,
    });

    return updated;
  }
}
