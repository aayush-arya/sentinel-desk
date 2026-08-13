import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryAnalyticsDto {
  @ApiPropertyOptional({ default: 30, description: 'Size of the trailing window, in days' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number = 30;
}
