import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Only ACTIVE and SUSPENDED are settable here',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
