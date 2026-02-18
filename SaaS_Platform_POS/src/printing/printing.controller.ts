import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  Patch,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrintingService } from './printing.service';
import { UpdatePrintJobStatusDto } from './dto/update-print-job-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrintJobStatus, PrintJobType } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('printing')
@Controller('printing')
@UseGuards(JwtAuthGuard)
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Get('pending')
  @Public()
  @ApiOperation({ summary: 'Get pending print jobs (for print agent)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  getPendingJobs(
    @Query('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.printingService.getPendingJobs(tenantId, limit ? parseInt(limit) : 10);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all print jobs' })
  @ApiQuery({ name: 'status', enum: PrintJobStatus, required: false })
  @ApiQuery({ name: 'jobType', enum: PrintJobType, required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: PrintJobStatus,
    @Query('jobType') jobType?: PrintJobType,
  ) {
    return this.printingService.findAll(tenantId, status, jobType);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get print job by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.printingService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @Public()
  @ApiOperation({ summary: 'Update print job status (for print agent)' })
  @ApiQuery({ name: 'tenantId', required: true })
  updateStatus(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePrintJobStatusDto,
  ) {
    return this.printingService.updateStatus(
      tenantId,
      id,
      updateStatusDto.status,
      updateStatusDto.error,
    );
  }

  @Patch(':id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed print job' })
  retryJob(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.printingService.retryJob(tenantId, id);
  }
}
