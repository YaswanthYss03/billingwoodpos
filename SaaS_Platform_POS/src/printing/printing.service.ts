import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { PrintJobType, PrintJobStatus, PrismaClient } from '@prisma/client';

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Queue a bill print job with pre-built payload (NO DB queries)
   */
  async queueBillPrintWithPayload(billId: string, tenantId: string, payload: any) {
    // Create print job using provided payload (no DB fetch needed)
    const printJob = await this.prisma.printJob.create({
      data: {
        tenantId,
        billId,
        jobType: 'BILL',
        status: 'PENDING',
        payload,
        attempts: 0,
        maxAttempts: 3,
      },
    });

    this.logger.log(
      `Bill print job queued: ${printJob.id} for bill ${payload.billNumber} (in-memory payload)`,
    );

    return printJob;
  }

  /**
   * Queue a bill print job (legacy - fetches from DB)
   */
  async queueBillPrint(billId: string, tx?: PrismaClient) {
    const prisma = tx || this.prisma;

    // Get bill data
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        tenant: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${billId} not found`);
    }

    // Generate print payload
    const payload = {
      type: 'BILL',
      billNumber: bill.billNumber,
      date: bill.billedAt,
      tenant: {
        name: bill.tenant.name,
        address: bill.tenant.address,
        phone: bill.tenant.phone,
        gstNumber: bill.tenant.gstNumber,
      },
      customer: {
        name: bill.customerName,
        phone: bill.customerPhone,
      },
      items: bill.items.map((item) => ({
        name: item.item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        gstRate: Number(item.gstRate),
        gstAmount: Number(item.gstAmount),
        total: Number(item.totalAmount),
      })),
      subtotal: Number(bill.subtotal),
      taxAmount: Number(bill.taxAmount),
      totalAmount: Number(bill.totalAmount),
      paymentMethod: bill.paymentMethod,
      cashier: bill.user.name,
      notes: bill.notes,
    };

    // Create print job
    const printJob = await prisma.printJob.create({
      data: {
        tenantId: bill.tenantId,
        billId: bill.id,
        jobType: 'BILL',
        status: 'PENDING',
        payload,
      },
    });

    this.logger.log(`Bill print job queued: ${printJob.id} for bill ${bill.billNumber}`);

    return printJob;
  }

  /**
   * Queue a KOT print job
   */
  async queueKotPrint(kotId: string, tx?: PrismaClient) {
    const prisma = tx || this.prisma;

    // Get KOT data
    const kot = await prisma.kOT.findUnique({
      where: { id: kotId },
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

    if (!kot) {
      throw new NotFoundException(`KOT with ID ${kotId} not found`);
    }

    // Generate print payload
    const payload = {
      type: 'KOT',
      kotNumber: kot.kotNumber,
      tableNumber: kot.tableNumber,
      date: kot.createdAt,
      items: kot.items.map((item) => ({
        name: item.item.name,
        quantity: Number(item.quantity),
        notes: item.notes,
      })),
      notes: kot.notes,
      waiter: kot.user.name,
    };

    // Create print job
    const printJob = await prisma.printJob.create({
      data: {
        tenantId: kot.tenantId,
        kotId: kot.id,
        jobType: 'KOT',
        status: 'PENDING',
        payload,
      },
    });

    this.logger.log(`KOT print job queued: ${printJob.id} for KOT ${kot.kotNumber}`);

    return printJob;
  }

  /**
   * Get pending print jobs (for print agent to poll)
   */
  async getPendingJobs(tenantId: string, limit: number = 10) {
    return this.prisma.printJob.findMany({
      where: {
        tenantId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get all print jobs
   */
  async findAll(tenantId: string, status?: PrintJobStatus, jobType?: PrintJobType) {
    return this.prisma.printJob.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(jobType && { jobType }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get print job by ID
   */
  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.printJob.findFirst({
      where: { id, tenantId },
      include: {
        bill: true,
        kot: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Print job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Update print job status (called by print agent)
   */
  async updateStatus(tenantId: string, id: string, status: PrintJobStatus, error?: string) {
    await this.findOne(tenantId, id); // Ensure exists

    const updated = await this.prisma.printJob.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'FAILED' && { lastError: error }),
        ...(status === 'FAILED' && { attempts: { increment: 1 } }),
      },
    });

    this.logger.log(`Print job ${id} status updated to ${status}`);

    return updated;
  }

  /**
   * Retry failed print job
   */
  async retryJob(tenantId: string, id: string) {
    const job = await this.findOne(tenantId, id);

    if (job.status !== 'FAILED') {
      throw new NotFoundException('Only failed jobs can be retried');
    }

    if (job.attempts >= job.maxAttempts) {
      throw new NotFoundException('Maximum retry attempts exceeded');
    }

    return this.prisma.printJob.update({
      where: { id },
      data: {
        status: 'PENDING',
        lastError: null,
      },
    });
  }
}
