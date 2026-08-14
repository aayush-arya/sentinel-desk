import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRichText } from '../common/utils/sanitize-html.util';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { CreateMacroDto } from './dto/create-macro.dto';
import type { UpdateMacroDto } from './dto/update-macro.dto';

@Injectable()
export class MacrosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.macro.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { title: 'asc' },
    });
  }

  create(user: AuthenticatedUser, dto: CreateMacroDto) {
    return this.prisma.macro.create({
      data: {
        organizationId: user.organizationId,
        authorId: user.id,
        title: dto.title,
        body: sanitizeRichText(dto.body),
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateMacroDto) {
    const existing = await this.prisma.macro.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Macro not found');
    return this.prisma.macro.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body !== undefined ? sanitizeRichText(dto.body) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.macro.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Macro not found');
    await this.prisma.macro.delete({ where: { id } });
  }
}
