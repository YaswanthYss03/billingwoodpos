import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KOTStatus } from '@prisma/client';

export class UpdateKotStatusDto {
  @ApiProperty({ enum: KOTStatus, example: 'PREPARING' })
  @IsEnum(KOTStatus)
  status: KOTStatus;
}
