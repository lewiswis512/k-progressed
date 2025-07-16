import { LOGO } from '../main';
import { IBookingInformation } from '../modules/learning/services/mentor-booking-notification.service';
import { dateTimeFormatted } from '../utils/dates/dateTimeFormatted';

export const studentBookingNotificationTemplate = (
  bookingInformation: IBookingInformation,
) => {
  return `
        <!DOCTYPE html>
            <html>
                <head>
                    <style> 
                      .greeting {
                        color: gray;
                        font-weight: bold;
                      }
                    </style>
                </head>
                <body>
                    <img src="${LOGO}" width="100" height="100" />
                    <p><span class="greeting">Hello</span> ${bookingInformation.bookerLastname} ${bookingInformation.bookerFirstname},</p>
                    <p>Your call for mentoring with the teacher ${bookingInformation.teacherLastname} ${bookingInformation.teacherFirstname} 
                      at ${dateTimeFormatted(
                        new Date(
                          `${bookingInformation.date} ${bookingInformation.time}`,
                        ),
                        'en-GB',
                      )}
                      </p>
                </body>
            </html>
    `;
};
