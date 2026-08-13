import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSavedFilterDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ description: 'Arbitrary ticket filter state (status/priority/assignee/search/...)' })
  @IsObject()
  filters!: Record<string, unknown>;
}
