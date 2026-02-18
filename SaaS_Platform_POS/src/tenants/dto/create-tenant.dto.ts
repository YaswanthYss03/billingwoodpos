import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Grand Hotel' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'HOTEL', enum: ['HOTEL', 'RESTAURANT', 'RETAIL'] })
  @IsEnum(['HOTEL', 'RESTAURANT', 'RETAIL'])
  businessType: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional({ example: '123 Main Street, City' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@grandhotel.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'FIFO', enum: ['FIFO', 'WEIGHTED_AVERAGE'] })
  @IsOptional()
  @IsEnum(['FIFO', 'WEIGHTED_AVERAGE'])
  inventoryMethod?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
