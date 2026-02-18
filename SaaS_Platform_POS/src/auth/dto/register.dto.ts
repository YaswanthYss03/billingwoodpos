import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Grand Hotel' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'RESTAURANT', enum: ['HOTEL', 'RESTAURANT', 'RETAIL'] })
  @IsEnum(['HOTEL', 'RESTAURANT', 'RETAIL'])
  businessType: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street, City' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstNumber?: string;
}
