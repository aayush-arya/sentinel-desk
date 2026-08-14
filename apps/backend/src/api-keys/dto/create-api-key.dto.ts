import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'A label to identify what this key is used for' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
