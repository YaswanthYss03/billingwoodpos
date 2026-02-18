import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { TenantContextService } from './services/tenant-context.service';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';

@Global()
@Module({
  providers: [PrismaService, RedisService, TenantContextService, TenantContextInterceptor],
  exports: [PrismaService, RedisService, TenantContextService, TenantContextInterceptor],
})
export class CommonModule {}
