import { LOGO } from '../utils/constants/app';
import { dateTimeFormatted } from '../utils/dates/dateTimeFormatted';
import { combineDateAndTime } from '../utils/dates/combineDateAndTime';
import { IBookingInformation } from '../modules/learning/services/mentor-booking-notification.service';

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
                    <p><span class="greeting">Hello</span> ${bookingInformation.bookerFirstname} ${bookingInformation.bookerLastname},</p>
                    <p>Your call for mentoring with the teacher ${bookingInformation.teacherFirstname} ${bookingInformation.teacherLastname}  
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
