import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeTicketDto {
  @ApiProperty({
    description: 'The surviving ticket this one will be merged into',
  })
  @IsUUID()
  intoTicketId!: string;
}
