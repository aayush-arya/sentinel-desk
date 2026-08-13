import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeArticleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRichText } from '../common/utils/sanitize-html.util';
import { isStaff } from '../tickets/types/authenticated-request.type';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type { QueryArticlesDto } from './dto/query-articles.dto';

const ARTICLE_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} satisfies Prisma.KnowledgeArticleInclude;

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'article'
  );
}

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(organizationId: string, title: string, excludeId?: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 1;
    // Org-scoped, so collisions are rare in practice — a short linear probe is simpler
    // and plenty fast at this scale, unlike Ticket numbers which need a hot-path counter.
    while (
      await this.prisma.knowledgeArticle.findFirst({
        where: { organizationId, slug: candidate, id: excludeId ? { not: excludeId } : undefined },
        select: { id: true },
      })
    ) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async findAll(user: AuthenticatedUser, query: QueryArticlesDto) {
    const staff = isStaff(user);
    const where: Prisma.KnowledgeArticleWhereInput = { organizationId: user.organizationId };

    // Customers can never request anything but PUBLISHED, no matter what `status` says.
    if (!staff) where.status = KnowledgeArticleStatus.PUBLISHED;
    else if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [items, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where,
        include: ARTICLE_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id, organizationId: user.organizationId },
      include: ARTICLE_INCLUDE,
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== KnowledgeArticleStatus.PUBLISHED && !isStaff(user)) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async recordView(id: string): Promise<void> {
    await this.prisma.knowledgeArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {
      // Best-effort — a view count is a nice-to-have, not worth surfacing an error for.
    });
  }

  async create(user: AuthenticatedUser, dto: CreateArticleDto) {
    if (!isStaff(user)) throw new ForbiddenException('Only staff can create knowledge base articles');
    const slug = await this.uniqueSlug(user.organizationId, dto.title);
    return this.prisma.knowledgeArticle.create({
      data: {
        organizationId: user.organizationId,
        authorId: user.id,
        title: dto.title,
        body: sanitizeRichText(dto.body),
        status: dto.status ?? KnowledgeArticleStatus.DRAFT,
        slug,
      },
      include: ARTICLE_INCLUDE,
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateArticleDto) {
    if (!isStaff(user)) throw new ForbiddenException('Only staff can edit knowledge base articles');
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Article not found');

    const slug = dto.title && dto.title !== existing.title ? await this.uniqueSlug(user.organizationId, dto.title, id) : undefined;

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body !== undefined ? sanitizeRichText(dto.body) : undefined,
        status: dto.status,
        slug,
      },
      include: ARTICLE_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    if (!isStaff(user)) throw new ForbiddenException('Only staff can delete knowledge base articles');
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Article not found');
    await this.prisma.knowledgeArticle.delete({ where: { id } });
  }
}
