import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class SimulateSlaDto {
  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @ApiPropertyOptional({
    description: 'Hypothetical ticket creation time (ISO 8601); defaults to now',
  })
  @IsOptional()
  @IsDateString()
  from?: string;
}
