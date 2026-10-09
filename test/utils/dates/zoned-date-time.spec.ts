import {
  dayOfWeek,
  formatZonedDateTime,
  zonedDateTimeToUtc,
} from '../../../src/utils/dates/zoned-date-time';

describe('zonedDateTimeToUtc', () => {
  const paris = 'Europe/Paris';

  it('should convert a winter Paris time (CET, UTC+1)', () => {
    expect(zonedDateTimeToUtc('2026-01-15', '09:00', paris).toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
  });

  it('should convert a summer Paris time (CEST, UTC+2)', () => {
    expect(zonedDateTimeToUtc('2026-07-15', '09:00', paris).toISOString()).toBe(
      '2026-07-15T07:00:00.000Z',
    );
  });

  it('should use CET on the day before the spring change and CEST after it', () => {
    expect(zonedDateTimeToUtc('2026-03-28', '10:00', paris).toISOString()).toBe(
      '2026-03-28T09:00:00.000Z',
    );
    expect(zonedDateTimeToUtc('2026-03-29', '10:00', paris).toISOString()).toBe(
      '2026-03-29T08:00:00.000Z',
    );
  });

  it('should use CEST before the autumn change and CET after it', () => {
    expect(zonedDateTimeToUtc('2026-10-25', '01:30', paris).toISOString()).toBe(
      '2026-10-24T23:30:00.000Z',
    );
    expect(zonedDateTimeToUtc('2026-10-25', '14:00', paris).toISOString()).toBe(
      '2026-10-25T13:00:00.000Z',
    );
  });

  it('should handle a time that crosses midnight in UTC', () => {
    expect(zonedDateTimeToUtc('2026-01-01', '00:30', paris).toISOString()).toBe(
      '2025-12-31T23:30:00.000Z',
    );
  });

  it('should keep UTC unchanged', () => {
    expect(zonedDateTimeToUtc('2026-07-15', '09:00', 'UTC').toISOString()).toBe(
      '2026-07-15T09:00:00.000Z',
    );
  });

  it('should not depend on the timezone of the server', () => {
    const before = process.env.TZ;
    process.env.TZ = 'America/New_York';

    try {
      expect(
        zonedDateTimeToUtc('2026-07-15', '09:00', paris).toISOString(),
      ).toBe('2026-07-15T07:00:00.000Z');
    } finally {
      process.env.TZ = before;
    }
  });
});

describe('dayOfWeek', () => {
  it.each([
    ['2026-10-04', 0],
    ['2026-10-05', 1],
    ['2026-10-09', 5],
    ['2026-10-10', 6],
    ['2024-02-29', 4],
  ])('should return the weekday of %s', (date, day) => {
    expect(dayOfWeek(date)).toBe(day);
  });
});

describe('formatZonedDateTime', () => {
  it('should format the instant in the given timezone', () => {
    const formatted = formatZonedDateTime(
      new Date('2026-07-15T07:00:00.000Z'),
      'Europe/Paris',
    );

    expect(formatted).toContain('09:00');
    expect(formatted).toContain('15 July 2026');
  });
});
