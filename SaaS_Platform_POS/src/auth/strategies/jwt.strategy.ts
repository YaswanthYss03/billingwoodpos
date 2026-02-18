import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    this.logger.log('✅ JwtStrategy initialized successfully');
  }

  async validate(payload: any) {
    // JWT is already verified by passport, return user data with tenant info from token
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId,
      tenant: {
        businessType: payload.businessType,
      },
    };
  }
}
