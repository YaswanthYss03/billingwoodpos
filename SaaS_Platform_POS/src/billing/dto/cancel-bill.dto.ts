import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelBillDto {
  @ApiProperty({ example: 'Customer requested cancellation' })
  @IsString()
  reason: string;
}
