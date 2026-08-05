import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SlaPolicyRuleDto } from './sla-policy-rule.dto';

export class CreateSlaPolicyDto {
  @ApiProperty({ example: 'Standard SLA' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty()
  @IsUUID()
  businessHoursScheduleId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 80, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  autoEscalateAtPercent?: number;

  @ApiProperty({ type: [SlaPolicyRuleDto], description: 'One rule per priority level' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlaPolicyRuleDto)
  rules!: SlaPolicyRuleDto[];
}
