import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });
    if (existing) throw new ConflictException('A tag with this name already exists');

    return this.prisma.tag.create({
      data: { organizationId, name: dto.name, color: dto.color },
    });
  }
}
