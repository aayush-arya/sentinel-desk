import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  findOne(user: AuthenticatedUser) {
    return this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  }

  update(user: AuthenticatedUser, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { name: dto.name, logoUrl: dto.logoUrl, primaryColor: dto.primaryColor },
    });
  }
}
