import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrintJobStatus } from '@prisma/client';

export class UpdatePrintJobStatusDto {
  @ApiProperty({ enum: PrintJobStatus, example: 'COMPLETED' })
  @IsEnum(PrintJobStatus)
  status: PrintJobStatus;

  @ApiPropertyOptional({ example: 'Printer offline' })
  @IsOptional()
  @IsString()
  error?: string;
}
