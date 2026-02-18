import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReceivePurchaseDto {
  @ApiPropertyOptional({ example: '2024-02-14T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  receivedDate?: Date;
}
