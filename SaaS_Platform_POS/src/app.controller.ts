import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './common/services/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async health() {
    try {
      // Quick database ping to verify connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}
