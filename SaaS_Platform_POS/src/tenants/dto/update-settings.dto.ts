import { IsBoolean, IsOptional, IsArray, ValidateNested, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class GstRateDto {
  @ApiProperty({ description: 'GST rate label', example: 'Standard Rate' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'GST rate percentage', example: 18 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Enable KOT system', required: false })
  @IsOptional()
  @IsBoolean()
  kotEnabled?: boolean;

  @ApiProperty({ description: 'Auto-generate KOT on order', required: false })
  @IsOptional()
  @IsBoolean()
  autoGenerateKOT?: boolean;

  @ApiProperty({ description: 'Require table number for orders', required: false })
  @IsOptional()
  @IsBoolean()
  requireTableNumber?: boolean;

  @ApiProperty({ description: 'Enable thermal printer', required: false })
  @IsOptional()
  @IsBoolean()
  enableThermalPrinter?: boolean;

  @ApiProperty({ 
    description: 'Custom GST/Tax rates for the business',
    required: false,
    type: [GstRateDto],
    example: [
      { label: 'Zero Rated', rate: 0 },
      { label: 'Standard Rate', rate: 18 },
      { label: 'Luxury Goods', rate: 28 }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GstRateDto)
  gstRates?: GstRateDto[];
}
