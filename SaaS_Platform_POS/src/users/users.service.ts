import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, Tenant, Prisma } from '@prisma/client';

type UserWithTenant = Prisma.UserGetPayload<{
  include: { tenant: true };
}>;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if username already exists
    const existing = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existing) {
      throw new ConflictException('User with this username already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId: createUserDto.tenantId,
        username: createUserDto.username,
        password: createUserDto.password,
        email: createUserDto.email,
        name: createUserDto.name,
        phone: createUserDto.phone,
        role: createUserDto.role,
      },
      include: {
        tenant: true,
      },
    });

    // Cache user data
    await this.redis.set(`user:${user.id}`, user, 3600);
    await this.redis.set(`user:username:${user.username}`, user, 3600);

    return user;
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<UserWithTenant | null> {
    // Try cache first
    const cached = await this.redis.get(`user:${id}`);
    if (cached) {
      return cached as UserWithTenant;
    }

    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Cache for 1 hour
    await this.redis.set(`user:${id}`, user, 3600);

    return user;
  }

  async findBySupabaseId(supabaseUserId: string) {
    // Method kept for backwards compatibility but will be removed
    return null;
  }

  async findByUsername(username: string): Promise<UserWithTenant | null> {   
    // Try cache first
    const cached = await this.redis.get(`user:username:${username}`);
    if (cached) {
      return cached as UserWithTenant;
    }

    const user = await this.prisma.user.findUnique({
      where: { username, deletedAt: null },
      include: {
        tenant: true,
      },
    });

    if (user) {
      // Cache for 1 hour
      await this.redis.set(`user:username:${username}`, user, 3600);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Ensure exists

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        tenant: true,
      },
    });

    // Invalidate cache
    await this.redis.del(`user:${id}`);
    await this.redis.del(`user:username:${user.username}`);

    return user;
  }

  async remove(id: string) {
    const user = await this.findOne(id); // Ensure exists

    const updated = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidate cache
    await this.redis.del(`user:${id}`);
    await this.redis.del(`user:supabase:${(user as any).supabaseUserId}`);

    return updated;
  }

  async toggleStatus(id: string) {
    const user = await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !(user as any).isActive },
    });

    // Invalidate cache
    await this.redis.del(`user:${id}`);
    await this.redis.del(`user:supabase:${(user as any).supabaseUserId}`);

    return updated;
  }
}
