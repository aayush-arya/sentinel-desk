import { DateTime } from 'luxon';

export interface BusinessHoursSlotInput {
  /** 0 = Sunday .. 6 = Saturday (JS Date.getDay() convention) */
  dayOfWeek: number;
  /** Minutes since local midnight, e.g. 9:00am = 540 */
  startMinute: number;
  endMinute: number;
}

export interface BusinessHoursConfig {
  timezone: string;
  slots: BusinessHoursSlotInput[];
  /** Calendar dates ('yyyy-MM-dd', in `timezone`) that are entirely non-business */
  holidayDates: string[];
}

const MAX_DAYS_SCANNED = 3660; // ~10 years — a sane upper bound, not a real limit

/**
 * Adds `minutesToAdd` *business* minutes to `start`, walking forward through the
 * schedule's slots and skipping weekends/holidays/off-hours entirely. This is how
 * SLA due dates are computed — a 2-hour response target opened Friday at 4pm with a
 * Mon–Fri 9–5 schedule is due Monday morning, not Friday evening.
 *
 * Falls back to plain wall-clock addition if the schedule has no slots configured
 * at all (better to compute something reasonable than throw on a default/empty org).
 */
export function addBusinessMinutes(
  start: Date,
  minutesToAdd: number,
  config: BusinessHoursConfig,
): Date {
  if (config.slots.length === 0) {
    return new Date(start.getTime() + minutesToAdd * 60_000);
  }

  const holidaySet = new Set(config.holidayDates);
  let remaining = minutesToAdd;
  let cursor = DateTime.fromJSDate(start, { zone: config.timezone });
  let daysScanned = 0;

  while (remaining > 0) {
    if (daysScanned++ > MAX_DAYS_SCANNED) {
      throw new Error(
        'addBusinessMinutes: exceeded max scan window — check business hours configuration',
      );
    }

    const dayKey = cursor.toFormat('yyyy-MM-dd');
    // Luxon weekday is 1 (Mon) .. 7 (Sun); % 7 maps Sun -> 0, matching our 0..6 convention.
    const todaysWeekday = cursor.weekday % 7;
    const daySlots = holidaySet.has(dayKey)
      ? []
      : config.slots
          .filter((s) => s.dayOfWeek === todaysWeekday)
          .sort((a, b) => a.startMinute - b.startMinute);

    const minuteOfDay = cursor.hour * 60 + cursor.minute + cursor.second / 60;

    for (const slot of daySlots) {
      const slotStart = Math.max(slot.startMinute, minuteOfDay);
      if (slotStart >= slot.endMinute) continue; // this slot is already fully behind the cursor

      const availableInSlot = slot.endMinute - slotStart;
      if (remaining <= availableInSlot) {
        cursor = cursor.startOf('day').plus({ minutes: slotStart + remaining });
        remaining = 0;
        break;
      }
      remaining -= availableInSlot;
    }

    // Reaching here with time still owed means today's slots (if any) are exhausted.
    if (remaining > 0) {
      cursor = cursor.plus({ days: 1 }).startOf('day');
    }
  }

  return cursor.toJSDate();
}
