import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { CreateSavedFilterDto } from './dto/create-saved-filter.dto';

@Injectable()
export class SavedFiltersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.savedFilter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Saving under a name that already exists overwrites it - the natural behavior for
  // "update this saved view" without a separate rename/edit flow.
  create(user: AuthenticatedUser, dto: CreateSavedFilterDto) {
    const filters = dto.filters as Prisma.InputJsonValue;
    return this.prisma.savedFilter.upsert({
      where: { userId_name: { userId: user.id, name: dto.name } },
      update: { filters },
      create: { userId: user.id, name: dto.name, filters },
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.savedFilter.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new NotFoundException('Saved filter not found');
    await this.prisma.savedFilter.delete({ where: { id } });
  }
}
