import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Staff only' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'Staff only. To reopen a resolved/closed ticket, use POST /tickets/:id/reopen instead.',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
