import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, OrderType } from '@prisma/client';

class BillItemDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 100.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstRate: number;

  @ApiProperty({ example: 5.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstAmount: number;

  @ApiProperty({ example: 210.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  trackInventory: boolean;

  @ApiProperty({ example: 'AUTO' })
  @IsIn(['AUTO', 'MANUAL'])
  inventoryMode: string;

  @ApiProperty({ example: 'Biryani' })
  @IsString()
  itemName: string;
}

export class CreateBillDto {
  @ApiProperty({ type: [BillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @ApiProperty({ example: 'CASH', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'FIFO' })
  @IsIn(['FIFO', 'WEIGHTED_AVERAGE'])
  inventoryMethod: 'FIFO' | 'WEIGHTED_AVERAGE';

  @ApiPropertyOptional({ example: 'DINE_IN', enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional({ example: 'uuid-of-kot' })
  @IsOptional()
  @IsUUID()
  kotId?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 50, description: 'Discount amount in currency' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 'Table 5' })
  @IsOptional()
  @IsString()
  notes?: string;
}
