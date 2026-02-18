import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class KotItemDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ example: 'No onions' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateKotDto {
  @ApiPropertyOptional({ example: '5' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional({ example: 'Priority order' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [KotItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KotItemDto)
  items: KotItemDto[];
}
