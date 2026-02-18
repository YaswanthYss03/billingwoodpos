import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    const tenant = await this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        businessType: createTenantDto.businessType,
        gstNumber: createTenantDto.gstNumber,
        address: createTenantDto.address,
        phone: createTenantDto.phone,
        email: createTenantDto.email,
        inventoryMethod: createTenantDto.inventoryMethod || 'FIFO',
        currency: createTenantDto.currency || 'INR',
        timezone: createTenantDto.timezone || 'Asia/Kolkata',
      },
    });

    // Cache tenant data
    await this.redis.set(`tenant:${tenant.id}`, tenant, 3600);

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    // Try cache first
    const cached = await this.redis.get(`tenant:${id}`);
    if (cached) {
      return cached as Tenant;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Cache for 1 hour
    await this.redis.set(`tenant:${id}`, tenant, 3600);

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id); // Ensure exists

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return tenant;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return tenant;
  }

  async toggleStatus(id: string) {
    const tenant = await this.findOne(id);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !(tenant as any).isActive },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return updated;
  }

  async updateSettings(id: string, settings: any) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { settings },
    });

    // Invalidate tenant cache
    await this.redis.del(`tenant:${id}`);
    
    // Invalidate all user caches for this tenant (they include tenant data)
    // Get all users for this tenant and clear their caches
    const users = await this.prisma.user.findMany({
      where: { tenantId: id },
      select: { id: true, username: true },
    });
    
    for (const user of users) {
      await this.redis.del(`user:${user.id}`);
      await this.redis.del(`user:username:${user.username}`);
    }

    return tenant;
  }
}
