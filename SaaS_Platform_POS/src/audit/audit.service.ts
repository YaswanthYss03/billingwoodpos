import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(
    tenantId: string,
    userId: string,
    action: AuditAction,
    entity: string,
    entityId: string,
    beforeData?: any,
    afterData?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          entity,
          entityId,
          beforeData: beforeData || null,
          afterData: afterData || null,
          ipAddress,
          userAgent,
        },
      });

      this.logger.log(
        `Audit: ${action} ${entity} ${entityId} by user ${userId} in tenant ${tenantId}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break business logic
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(tenantId: string, entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all audit logs for a tenant
   */
  async getTenantLogs(
    tenantId: string,
    limit: number = 100,
    offset: number = 0,
    entity?: string,
    action?: AuditAction,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(entity && { entity }),
        ...(action && { action }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get logs by user
   */
  async getUserLogs(tenantId: string, userId: string, limit: number = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Convenience methods for common actions
   */
  async logCreate(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    data: any,
  ) {
    return this.log(tenantId, userId, 'CREATE', entity, entityId, null, data);
  }

  async logUpdate(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    beforeData: any,
    afterData: any,
  ) {
    return this.log(tenantId, userId, 'UPDATE', entity, entityId, beforeData, afterData);
  }

  async logDelete(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    data: any,
  ) {
    return this.log(tenantId, userId, 'DELETE', entity, entityId, data, null);
  }

  async logCancel(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    data: any,
  ) {
    return this.log(tenantId, userId, 'CANCEL', entity, entityId, data, null);
  }
}
