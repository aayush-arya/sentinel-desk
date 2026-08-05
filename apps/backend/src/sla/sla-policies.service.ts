import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import type { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';

const POLICY_INCLUDE = { rules: true, businessHours: true } as const;

@Injectable()
export class SlaPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.slaPolicy.findMany({
      where: { organizationId },
      include: POLICY_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const policy = await this.prisma.slaPolicy.findUnique({ where: { id }, include: POLICY_INCLUDE });
    if (!policy || policy.organizationId !== organizationId) {
      throw new NotFoundException('SLA policy not found');
    }
    return policy;
  }

  async getDefault(organizationId: string) {
    return this.prisma.slaPolicy.findFirst({
      where: { organizationId, isDefault: true },
      include: POLICY_INCLUDE,
    });
  }

  private async assertBusinessHoursBelongsToOrg(organizationId: string, scheduleId: string) {
    const schedule = await this.prisma.businessHoursSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || schedule.organizationId !== organizationId) {
      throw new BadRequestException('businessHoursScheduleId must belong to your organization');
    }
  }

  async create(organizationId: string, dto: CreateSlaPolicyDto) {
    await this.assertBusinessHoursBelongsToOrg(organizationId, dto.businessHoursScheduleId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.slaPolicy.updateMany({ where: { organizationId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.slaPolicy.create({
        data: {
          organizationId,
          name: dto.name,
          businessHoursScheduleId: dto.businessHoursScheduleId,
          isDefault: dto.isDefault ?? false,
          autoEscalateAtPercent: dto.autoEscalateAtPercent ?? 80,
          rules: { create: dto.rules },
        },
        include: POLICY_INCLUDE,
      });
    });
  }

  async update(organizationId: string, id: string, dto: UpdateSlaPolicyDto) {
    await this.findOne(organizationId, id);
    if (dto.businessHoursScheduleId) {
      await this.assertBusinessHoursBelongsToOrg(organizationId, dto.businessHoursScheduleId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.slaPolicy.updateMany({
          where: { organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      if (dto.rules) {
        await tx.slaPolicyRule.deleteMany({ where: { policyId: id } });
      }

      return tx.slaPolicy.update({
        where: { id },
        data: {
          name: dto.name,
          businessHoursScheduleId: dto.businessHoursScheduleId,
          isDefault: dto.isDefault,
          autoEscalateAtPercent: dto.autoEscalateAtPercent,
          rules: dto.rules ? { create: dto.rules } : undefined,
        },
        include: POLICY_INCLUDE,
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    try {
      await this.prisma.slaPolicy.delete({ where: { id } });
    } catch {
      throw new ConflictException('This policy is still assigned to one or more tickets');
    }
  }
}
