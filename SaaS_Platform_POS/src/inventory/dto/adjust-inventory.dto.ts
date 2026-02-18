import { IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustInventoryDto {
  @ApiProperty({ example: 'uuid-of-batch' })
  @IsUUID()
  batchId: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiProperty({ example: 'Wastage due to expiry' })
  @IsString()
  reason: string;
}
