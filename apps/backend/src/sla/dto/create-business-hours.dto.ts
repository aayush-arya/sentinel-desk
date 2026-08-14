import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessHoursSlotDto } from './business-hours-slot.dto';
import { HolidayDto } from './holiday.dto';

export class CreateBusinessHoursDto {
  @ApiProperty({ example: 'Standard business hours' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: [BusinessHoursSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursSlotDto)
  slots!: BusinessHoursSlotDto[];

  @ApiPropertyOptional({ type: [HolidayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];
}
