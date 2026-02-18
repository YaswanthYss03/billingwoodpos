import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelKotDto {
  @ApiProperty({ example: 'Customer changed order' })
  @IsString()
  reason: string;
}
