import { escapeHtml } from '../utils/string/escape-html';
import { formatEuro } from '../utils/string/format-euro';
import { emailButton, emailLayout } from './layout';

export interface IBookingEmail {
  recipientName: string;
  otherPartyName: string;
  when: string;
  meetingUrl?: string;
  bookingsLink: string;
  amount?: number;
  refunded?: boolean;
}

export const bookingConfirmedTemplate = (
  booking: IBookingEmail,
  role: 'student' | 'teacher',
) =>
  emailLayout(
    'Your mentoring call is confirmed',
    `
      <p>Hello ${escapeHtml(booking.recipientName)},</p>
      <p>${
        role === 'student'
          ? `Your one hour mentoring call with <strong>${escapeHtml(booking.otherPartyName)}</strong> is confirmed.`
          : `<strong>${escapeHtml(booking.otherPartyName)}</strong> booked a one hour mentoring call with you.`
      }</p>
      <p><strong>When:</strong> ${escapeHtml(booking.when)}</p>
      ${
        booking.meetingUrl
          ? `<p><strong>Video call link:</strong> <a href="${escapeHtml(booking.meetingUrl)}">${escapeHtml(booking.meetingUrl)}</a></p>`
          : ''
      }
      ${role === 'student' && booking.amount ? `<p><strong>Paid:</strong> ${formatEuro(booking.amount)}</p>` : ''}
      <p>You can cancel up to 24 hours before the call from your bookings page${role === 'student' ? ' and get a full refund' : ''}.</p>
      ${emailButton('See my bookings', booking.bookingsLink)}
    `,
  );

export const bookingCancelledTemplate = (booking: IBookingEmail) =>
  emailLayout(
    'Mentoring call cancelled',
    `
      <p>Hello ${escapeHtml(booking.recipientName)},</p>
      <p>The mentoring call with <strong>${escapeHtml(booking.otherPartyName)}</strong> planned on ${escapeHtml(booking.when)} has been cancelled.</p>
      ${booking.refunded ? '<p>The payment has been fully refunded. It can take 5 to 10 days to appear on the bank account.</p>' : ''}
      ${emailButton('See my bookings', booking.bookingsLink)}
    `,
  );
