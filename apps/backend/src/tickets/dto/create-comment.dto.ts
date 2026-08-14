import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CommentVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example:
      'Thanks for reaching out — could you share a screenshot of the error?',
  })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({
    enum: CommentVisibility,
    default: CommentVisibility.PUBLIC,
    description:
      'Staff only — INTERNAL notes are never visible to the customer',
  })
  @IsOptional()
  @IsEnum(CommentVisibility)
  visibility?: CommentVisibility;
}
