import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private tenantContext: TenantContextService) {
    super({
      log: ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Middleware to enforce tenant isolation
    this.$use(async (params, next) => {
      const tenantId = this.tenantContext.getTenantId();

      // Skip tenant check for tenant table itself and public operations
      const excludedModels = ['Tenant'];
      
      if (!excludedModels.includes(params.model || '') && tenantId) {
        // Add tenant filtering for read operations
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.args.where = { ...params.args.where, tenantId };
        }
        
        if (params.action === 'findMany') {
          if (params.args.where) {
            if (params.args.where.tenantId === undefined) {
              params.args.where.tenantId = tenantId;
            }
          } else {
            params.args.where = { tenantId };
          }
        }
        
        // Add tenant for create operations
        if (params.action === 'create') {
          if (params.args.data.tenantId === undefined) {
            params.args.data.tenantId = tenantId;
          }
        }
        
        // Add tenant for update operations
        if (params.action === 'update' || params.action === 'updateMany') {
          params.args.where = { ...params.args.where, tenantId };
        }
        
        // Add tenant for delete operations
        if (params.action === 'delete' || params.action === 'deleteMany') {
          params.args.where = { ...params.args.where, tenantId };
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  // Soft delete helper
  async softDelete(model: string, where: any) {
    return (this as any)[model].update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  // Transaction helper with tenant context
  async executeInTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      return fn(tx as PrismaClient);
    }, {
      maxWait: 15000, // Maximum wait time to start a transaction (15s)
      timeout: 45000, // Maximum time a transaction can run (45s)
    });
  }
}
