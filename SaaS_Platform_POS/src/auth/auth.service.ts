import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  /**
   * Login with username and password
   */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByUsername(loginDto.username);
    
    if (!user || !(user as any).isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, (user as any).password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get tenant information with businessType
    const tenant = (user as any).tenant;

    // Generate JWT token
    const payload = {
      sub: (user as any).id,
      username: (user as any).username,
      email: (user as any).email,
      role: (user as any).role,
      tenantId: (user as any).tenantId,
      businessType: tenant?.businessType,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      data: {
        accessToken,
        user: {
          id: (user as any).id,
          username: (user as any).username,
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role,
          tenantId: (user as any).tenantId,
        },
        tenant: {
          id: tenant?.id,
          name: tenant?.name,
          businessType: tenant?.businessType,
          settings: (tenant?.settings || {}) as any,
          createdAt: tenant?.createdAt,
        },
      },
      message: 'Login successful',
    };
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user || !(user as any).isActive) {
      return null;
    }

    const tenant = (user as any).tenant;

    return {
      id: (user as any).id,
      username: (user as any).username,
      email: (user as any).email,
      name: (user as any).name,
      role: (user as any).role,
      tenantId: (user as any).tenantId,
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        businessType: tenant?.businessType,
        settings: tenant?.settings,
        createdAt: tenant?.createdAt,
      },
    };
  }

  /**
   * Register new tenant and owner user
   */
  async register(registerDto: RegisterDto) {
    try {
      // Check if username already exists
      const existingUser = await this.usersService.findByUsername(registerDto.username);
      
      if (existingUser) {
        throw new BadRequestException('Username already taken');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // 1. Create tenant
      const tenant = await this.tenantsService.create({
        name: registerDto.businessName,
        businessType: registerDto.businessType,
        address: registerDto.address,
        phone: registerDto.phone,
        email: registerDto.email,
        gstNumber: registerDto.gstNumber,
      });

      this.logger.log(`Created tenant: ${tenant.id} for business: ${registerDto.businessName}`);

      // 2. Create owner user
      const user = await this.usersService.create({
        tenantId: tenant.id,
        username: registerDto.username,
        password: hashedPassword,
        email: registerDto.email,
        name: registerDto.name,
        phone: registerDto.phone,
        role: UserRole.OWNER,
      });

      this.logger.log(`Created owner user: ${user.id} for tenant: ${tenant.id}`);

      // Generate token for the new user
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            businessType: tenant.businessType,
            createdAt: tenant.createdAt,
          },
        },
        message: 'Registration successful',
      };
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw error;
    }
  }
}
