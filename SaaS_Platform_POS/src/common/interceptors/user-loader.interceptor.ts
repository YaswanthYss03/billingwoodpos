import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '../../users/users.service';

@Injectable()
export class UserLoaderInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserLoaderInterceptor.name);

  constructor(private usersService: UsersService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is authenticated via JWT, load full user details
    if (user && user.supabaseId) {
      try {
        const fullUser = await this.usersService.findBySupabaseId(user.supabaseId);
        
        if (!fullUser) {
          this.logger.warn(`No user found for Supabase ID: ${user.supabaseId}`);
          throw new UnauthorizedException('User not found in system');
        }

        if (!(fullUser as any).isActive) {
          throw new UnauthorizedException('User account is inactive');
        }

        // Replace JWT user with full user details
        request.user = {
          id: (fullUser as any).id,
          tenantId: (fullUser as any).tenantId,
          email: (fullUser as any).email,
          name: (fullUser as any).name,
          role: (fullUser as any).role,
          supabaseUserId: (fullUser as any).supabaseUserId,
        };
      } catch (error) {
        this.logger.error(`Failed to load user: ${error.message}`);
        throw error;
      }
    }

    return next.handle();
  }
}
