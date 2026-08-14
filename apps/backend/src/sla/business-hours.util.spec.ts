import {
  addBusinessMinutes,
  type BusinessHoursConfig,
} from './business-hours.util';

const MON_FRI_9_5: BusinessHoursConfig = {
  timezone: 'America/New_York',
  slots: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
  })),
  holidayDates: [],
};

describe('addBusinessMinutes', () => {
  it('adds minutes within the same business day without crossing into off-hours', () => {
    const start = new Date('2026-08-11T13:00:00-04:00'); // Tuesday 1:00pm ET
    const result = addBusinessMinutes(start, 60, MON_FRI_9_5);
    expect(result.toISOString()).toBe(
      new Date('2026-08-11T14:00:00-04:00').toISOString(),
    );
  });

  it('rolls a Friday-afternoon deadline over the weekend to Monday morning', () => {
    const start = new Date('2026-08-14T16:00:00-04:00'); // Friday 4:00pm ET
    const result = addBusinessMinutes(start, 120, MON_FRI_9_5); // 2h target
    // 1h left in Friday's window (4-5pm) + 1h owed -> Monday 10:00am ET
    expect(result.toISOString()).toBe(
      new Date('2026-08-17T10:00:00-04:00').toISOString(),
    );
  });

  it('skips a holiday entirely, treating it like a non-business day', () => {
    const start = new Date('2026-08-13T16:30:00-04:00'); // Thursday 4:30pm ET
    const config: BusinessHoursConfig = {
      ...MON_FRI_9_5,
      holidayDates: ['2026-08-14'],
    }; // Friday off
    const result = addBusinessMinutes(start, 60, config); // 30m left Thu + 30m owed
    expect(result.toISOString()).toBe(
      new Date('2026-08-17T09:30:00-04:00').toISOString(),
    );
  });

  it('falls back to plain wall-clock addition when no slots are configured', () => {
    const start = new Date('2026-08-14T23:00:00-04:00');
    const result = addBusinessMinutes(start, 90, {
      timezone: 'UTC',
      slots: [],
      holidayDates: [],
    });
    expect(result.getTime()).toBe(start.getTime() + 90 * 60_000);
  });
});
