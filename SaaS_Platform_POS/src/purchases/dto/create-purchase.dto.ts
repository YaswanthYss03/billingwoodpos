import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PurchaseItemDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 50.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;
}

export class CreatePurchaseDto {
  @ApiPropertyOptional({ example: 'ABC Suppliers' })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: '2024-02-14T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: Date;

  @ApiPropertyOptional({ example: 'Bulk order for inventory replenishment' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
