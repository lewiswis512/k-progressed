import { LOGO } from '../main';
import { combineDateAndTime } from '../utils/dates/combineDateAndTime';
import { dateTimeFormatted } from '../utils/dates/dateTimeFormatted';
import { IBookingInformation } from '../modules/learning/services/mentor-booking-notification.service';

export const teacherBookingNotificationTemplate = (
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
                    <p><span class="greeting">Hello</span> ${bookingInformation.teacherFirstname} ${bookingInformation.teacherLastname},</p>
                    <p>Your call for mentoring with the teacher ${bookingInformation.bookerFirstname} ${bookingInformation.bookerLastname}  
                     at ${dateTimeFormatted(
                       combineDateAndTime(
                         bookingInformation.date,
                         bookingInformation.time,
                       ),
                       'en-GB',
                     )}
                      </p>
                </body>
            </html>
    `;
};
