import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ example: 79.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  travelFee?: number;

  @ApiProperty({ example: 10.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiProperty({ example: ['09:00 AM', '10:00 AM'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  homeServiceSlots?: string[];

  @ApiProperty({ example: ['2026-04-12'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  homeServiceDaysOff?: string[];
}
