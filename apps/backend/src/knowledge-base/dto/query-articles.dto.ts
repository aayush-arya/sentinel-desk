import { ApiPropertyOptional } from '@nestjs/swagger';
import { KnowledgeArticleStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryArticlesDto {
  @ApiPropertyOptional({ description: 'Full-text search over title and body' })
  @IsOptional()
  @IsString()
  search?: string;

  // Staff-only escape hatch to filter to a specific status (e.g. their own drafts).
  // Customers can never see anything but PUBLISHED, regardless of this param —
  // enforced in the service, not trusted from the query string.
  @ApiPropertyOptional({ enum: KnowledgeArticleStatus })
  @IsOptional()
  @IsEnum(KnowledgeArticleStatus)
  status?: KnowledgeArticleStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}
