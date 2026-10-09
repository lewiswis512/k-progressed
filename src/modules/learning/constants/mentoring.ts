export const MENTORING_CALL_MINUTES = 60;
export const MENTORING_TIMEZONE = 'Europe/Paris';
export const MENTORING_MIN_NOTICE_HOURS = 12;
export const MENTORING_CANCELLATION_NOTICE_HOURS = 24;
export const MENTORING_BOOKING_WINDOW_DAYS = 90;

export const DEFAULT_MENTOR_AVAILABILITY = [1, 2, 3, 4, 5].map((day) => ({
  day,
  times: ['09:00', '11:00', '14:00', '16:00'],
}));
