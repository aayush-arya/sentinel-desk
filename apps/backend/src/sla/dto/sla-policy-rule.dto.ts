import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class SlaPolicyRuleDto {
  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @ApiProperty({
    example: 60,
    description: 'Minutes (business time) to first response',
  })
  @IsInt()
  @Min(1)
  responseTargetMinutes!: number;

  @ApiProperty({
    example: 480,
    description: 'Minutes (business time) to resolution',
  })
  @IsInt()
  @Min(1)
  resolutionTargetMinutes!: number;
}
