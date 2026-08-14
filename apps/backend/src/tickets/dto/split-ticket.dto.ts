import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SplitTicketDto {
  @ApiProperty({ example: 'Separate billing question' })
  @IsString()
  @MinLength(3)
  subject!: string;

  @ApiProperty({
    type: [String],
    description: 'Comment IDs to copy onto the new ticket, in order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  commentIds!: string[];
}
