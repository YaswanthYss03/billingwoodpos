import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, AuditAction } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs for tenant' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'action', enum: AuditAction, required: false })
  getTenantLogs(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
  ) {
    return this.auditService.getTenantLogs(
      tenantId,
      limit ? parseInt(limit) : 100,
      offset ? parseInt(offset) : 0,
      entity,
      action,
    );
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  getEntityLogs(
    @CurrentTenant() tenantId: string,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityLogs(tenantId, entity, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  @ApiQuery({ name: 'limit', required: false })
  getUserLogs(
    @CurrentTenant() tenantId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserLogs(tenantId, userId, limit ? parseInt(limit) : 100);
  }
}
