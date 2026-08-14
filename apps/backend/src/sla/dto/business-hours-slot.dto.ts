import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class BusinessHoursSlotDto {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = Sunday .. 6 = Saturday',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 1440,
    description: 'Minutes since local midnight',
  })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @ApiProperty({ minimum: 0, maximum: 1440 })
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;
}
