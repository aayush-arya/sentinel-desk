import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessHoursConfig } from './business-hours.util';
import type { CreateBusinessHoursDto } from './dto/create-business-hours.dto';
import type { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';

const SCHEDULE_INCLUDE = { slots: true, holidays: true } as const;

@Injectable()
export class BusinessHoursService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.businessHoursSchedule.findMany({
      where: { organizationId },
      include: SCHEDULE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const schedule = await this.prisma.businessHoursSchedule.findUnique({
      where: { id },
      include: SCHEDULE_INCLUDE,
    });
    if (!schedule || schedule.organizationId !== organizationId) {
      throw new NotFoundException('Business hours schedule not found');
    }
    return schedule;
  }

  async create(organizationId: string, dto: CreateBusinessHoursDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.businessHoursSchedule.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.businessHoursSchedule.create({
        data: {
          organizationId,
          name: dto.name,
          timezone: dto.timezone,
          isDefault: dto.isDefault ?? false,
          slots: { create: dto.slots },
          holidays: dto.holidays?.length
            ? {
                create: dto.holidays.map((h) => ({
                  date: new Date(h.date),
                  name: h.name,
                })),
              }
            : undefined,
        },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateBusinessHoursDto,
  ) {
    await this.findOne(organizationId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.businessHoursSchedule.updateMany({
          where: { organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      if (dto.slots) {
        await tx.businessHoursSlot.deleteMany({ where: { scheduleId: id } });
      }
      if (dto.holidays) {
        await tx.holiday.deleteMany({ where: { scheduleId: id } });
      }

      return tx.businessHoursSchedule.update({
        where: { id },
        data: {
          name: dto.name,
          timezone: dto.timezone,
          isDefault: dto.isDefault,
          slots: dto.slots ? { create: dto.slots } : undefined,
          holidays: dto.holidays?.length
            ? {
                create: dto.holidays.map((h) => ({
                  date: new Date(h.date),
                  name: h.name,
                })),
              }
            : undefined,
        },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    try {
      await this.prisma.businessHoursSchedule.delete({ where: { id } });
    } catch {
      throw new ConflictException(
        'This schedule is still in use by one or more SLA policies',
      );
    }
  }

  /** Loads the {timezone, slots, holidayDates} shape addBusinessMinutes expects. */
  async getConfig(scheduleId: string): Promise<BusinessHoursConfig> {
    const schedule = await this.prisma.businessHoursSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: SCHEDULE_INCLUDE,
    });
    return {
      timezone: schedule.timezone,
      slots: schedule.slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
      })),
      holidayDates: schedule.holidays.map((h) =>
        h.date.toISOString().slice(0, 10),
      ),
    };
  }
}
