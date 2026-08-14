import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class EscalateTicketDto {
  @ApiProperty({
    example: 'Customer is a key account and this is blocking their launch.',
  })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Reassign to this agent as part of the escalation',
  })
  @IsOptional()
  @IsUUID()
  newAssigneeId?: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.URGENT })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
