import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: string | undefined;
  private userId: string | undefined;

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  getTenantId(): string | undefined {
    return this.tenantId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  setContext(tenantId: string, userId: string): void {
    this.tenantId = tenantId;
    this.userId = userId;
  }

  clearContext(): void {
    this.tenantId = undefined;
    this.userId = undefined;
  }
}
