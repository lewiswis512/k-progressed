import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Booking } from '../../src/modules/learning/schemas/booking.schema';
import { BookingStatusEnum } from '../../src/utils/enums/booking-status.enum';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';
import { signedWebhook, stripeMock } from '../utils/stripe-mock';

const DAY = 24 * 60 * 60 * 1000;
const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

describe('Mentoring bookings (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let bookingModel: Model<Booking>;
  let mentor: ITestUser & { teacherId: string };
  let student: ITestUser;
  let otherStudent: ITestUser;
  let outsider: ITestUser;
  let teacherId: string;

  const DATE = isoDate(7);
  const TIMES = ['08:30', '09:00', '10:30', '13:30', '15:30', '17:00'];

  const insertBooking = (
    booking: Omit<Partial<Booking>, 'booker'> & { booker?: Types.ObjectId },
  ) =>
    bookingModel.create({
      _id: new Types.ObjectId(),
      bkng_date: DATE,
      teacher: new Types.ObjectId(teacherId),
      ...booking,
    });

  const bookedTimes = async (token = outsider.token) => {
    const res = await request(testApp.http)
      .get(`/api/mentoring/booked-slots/${teacherId}?date=${DATE}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return [...res.body].sort();
  };

  const book = (user: ITestUser, time: string, date = DATE) =>
    request(testApp.http)
      .post('/api/payment-intent/mentoring')
      .set(bearer(user))
      .send({ teacherId, date, time });

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    bookingModel = fixtures.model<Booking>(Booking.name);

    const mentorUser = await fixtures.createUser('ment_mentor');
    const mentorTeacherId = await fixtures.createTeacherProfile(mentorUser, {
      tchr_is_mentor: true,
      tchr_hourly_rate: 130,
      tchr_availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        day,
        times: TIMES,
      })),
    });
    mentor = { ...mentorUser, teacherId: mentorTeacherId };
    teacherId = mentorTeacherId;
    student = await fixtures.createUser('ment_student');
    otherStudent = await fixtures.createUser('ment_other');
    outsider = await fixtures.createUser('ment_outsider');

    const inFuture = new Date(Date.now() + 10 * 60 * 1000);
    const inPast = new Date(Date.now() - 60 * 1000);

    await insertBooking({
      bkng_time: '08:30',
      bkng_status: BookingStatusEnum.CONFIRMED,
      booker: new Types.ObjectId(otherStudent.id),
    });
    await insertBooking({
      bkng_time: '10:30',
      bkng_status: BookingStatusEnum.PENDING,
      bkng_expires_at: inFuture,
      booker: new Types.ObjectId(student.id),
    });
    await insertBooking({
      bkng_time: '13:30',
      bkng_status: BookingStatusEnum.PENDING,
      bkng_expires_at: inPast,
      booker: new Types.ObjectId(otherStudent.id),
    });
    await bookingModel.syncIndexes();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('booked and available slots', () => {
    it('should return the confirmed and held times, but not the expired ones', async () => {
      expect(await bookedTimes()).toEqual(['08:30', '10:30']);
    });

    it("should not count the viewer's own pending hold", async () => {
      expect(await bookedTimes(student.token)).toEqual(['08:30']);
    });

    it('should return the free times of the mentor availability', async () => {
      const res = await request(testApp.http)
        .get(`/api/mentoring/available-slots/${teacherId}?date=${DATE}`)
        .set(bearer(outsider))
        .expect(200);

      expect(res.body).toEqual(['09:00', '13:30', '15:30', '17:00']);
    });

    it('should return no available time outside of the booking window', async () => {
      const res = await request(testApp.http)
        .get(`/api/mentoring/available-slots/${teacherId}?date=${isoDate(120)}`)
        .set(bearer(outsider))
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return 400 for an invalid date', async () => {
      await request(testApp.http)
        .get(`/api/mentoring/booked-slots/${teacherId}?date=tomorrow`)
        .set(bearer(outsider))
        .expect(400);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .get(`/api/mentoring/booked-slots/${teacherId}?date=${DATE}`)
        .expect(401);
      await request(testApp.http)
        .get(`/api/mentoring/available-slots/${teacherId}?date=${DATE}`)
        .expect(401);
    });
  });

  describe('book a slot', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/payment-intent/mentoring')
        .send({ teacherId, date: DATE, time: '09:00' })
        .expect(401);
    });

    it('should return 400 when the mentor books themselves', async () => {
      await book(mentor, '09:00').expect(400);
    });

    it('should return 400 for a time outside of the availability', async () => {
      await book(student, '12:00').expect(400);
    });

    it('should return 400 for a past date or beyond the booking window', async () => {
      await book(student, '09:00', isoDate(-1)).expect(400);
      await book(student, '09:00', isoDate(120)).expect(400);
    });

    it('should return 400 for a malformed request', async () => {
      await request(testApp.http)
        .post('/api/payment-intent/mentoring')
        .set(bearer(student))
        .send({ teacherId: 'nope', date: DATE, time: '9h' })
        .expect(400);
    });

    it('should return 400 for a teacher who is not a mentor', async () => {
      const plain = await fixtures.createTeacher('ment_plain');

      await request(testApp.http)
        .post('/api/payment-intent/mentoring')
        .set(bearer(student))
        .send({ teacherId: plain.teacherId, date: DATE, time: '09:00' })
        .expect(400);
    });

    it('should return 409 on a confirmed slot', async () => {
      await book(student, '08:30').expect(409);
    });

    it('should return 409 on a slot held by another student', async () => {
      await book(otherStudent, '10:30').expect(409);
    });

    it('should hold a free slot with a server side price and replace the previous hold', async () => {
      stripeMock.paymentIntents.create.mockClear();

      const res = await book(student, '15:30').expect(201);

      expect(res.body.amount).toBe(130);
      expect(stripeMock.paymentIntents.create.mock.calls[0][0]).toMatchObject({
        amount: 13000,
        currency: 'eur',
      });
      expect(await bookedTimes()).toEqual(['08:30', '15:30']);

      const hold = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '15:30',
      });
      expect(hold.bkng_status).toBe(BookingStatusEnum.PENDING);
      expect(hold.bkng_payment_intent_id).toBe(
        res.body.client_secret.split('_secret')[0],
      );
    });

    it('should let a student book a slot whose hold has expired', async () => {
      await book(otherStudent, '13:30').expect(201);

      expect(await bookedTimes()).toEqual(['08:30', '13:30', '15:30']);
    });
  });

  describe('confirm a booking after payment', () => {
    it('should confirm the hold from a signed webhook and notify both parties', async () => {
      const hold = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '15:30',
      });
      const { payload, signature } = signedWebhook({
        id: `evt_test_booking_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: hold.bkng_payment_intent_id,
            object: 'payment_intent',
            amount_received: 13000,
            currency: 'eur',
            latest_charge: null,
            metadata: { bookingId: String(hold._id) },
          },
        },
      });

      await request(testApp.http)
        .post('/api/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      const confirmed = await bookingModel.findById(hold._id);
      expect(confirmed.bkng_status).toBe(BookingStatusEnum.CONFIRMED);
      expect(confirmed.bkng_expires_at).toBeUndefined();
      expect(confirmed.bkng_meeting_url).toMatch(/^https:\/\/meet\.jit\.si\//);
      const recipients = testApp.mailer.sendMail.mock.calls.map(
        ([mail]) => mail.to,
      );
      expect(recipients).toEqual(
        expect.arrayContaining([student.email, mentor.email]),
      );
    });

    it('should refuse a second confirmed booking on the same slot', async () => {
      await expect(
        insertBooking({
          bkng_time: '08:30',
          bkng_status: BookingStatusEnum.CONFIRMED,
          booker: new Types.ObjectId(student.id),
        }),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  describe('list bookings', () => {
    it('should list the calls of the booker without pending holds', async () => {
      const res = await request(testApp.http)
        .get('/api/mentoring/bookings')
        .set(bearer(student))
        .expect(200);

      expect(res.body.map((b: { bkng_time: string }) => b.bkng_time)).toEqual([
        '15:30',
      ]);
    });

    it('should list the calls of the mentor', async () => {
      const res = await request(testApp.http)
        .get('/api/mentoring/bookings/teaching')
        .set(bearer(mentor))
        .expect(200);

      expect(
        res.body.map((b: { bkng_time: string }) => b.bkng_time).sort(),
      ).toEqual(['08:30', '15:30']);
    });

    it('should return an empty list to a user without a teacher profile', async () => {
      const res = await request(testApp.http)
        .get('/api/mentoring/bookings/teaching')
        .set(bearer(outsider))
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('cancel a booking', () => {
    it('should return 403 for a user who is not part of the call', async () => {
      const booking = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '15:30',
      });

      await request(testApp.http)
        .post(`/api/mentoring/bookings/${booking._id}/cancel`)
        .set(bearer(outsider))
        .expect(403);
    });

    it('should return 400 for a pending hold', async () => {
      const hold = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '13:30',
      });

      await request(testApp.http)
        .post(`/api/mentoring/bookings/${hold._id}/cancel`)
        .set(bearer(otherStudent))
        .expect(400);
    });

    it('should return 400 when the booker cancels less than 24 hours before', async () => {
      const soon = await insertBooking({
        bkng_date: isoDate(1),
        bkng_time: '09:00',
        bkng_starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        bkng_status: BookingStatusEnum.CONFIRMED,
        booker: new Types.ObjectId(student.id),
      });

      await request(testApp.http)
        .post(`/api/mentoring/bookings/${soon._id}/cancel`)
        .set(bearer(student))
        .expect(400);

      await request(testApp.http)
        .post(`/api/mentoring/bookings/${soon._id}/cancel`)
        .set(bearer(mentor))
        .expect(201);
    });

    it('should cancel and refund the call for the booker', async () => {
      const booking = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '15:30',
      });
      stripeMock.refunds.create.mockClear();

      const res = await request(testApp.http)
        .post(`/api/mentoring/bookings/${booking._id}/cancel`)
        .set(bearer(student))
        .expect(201);

      expect(res.body.bkng_status).toBe(BookingStatusEnum.CANCELLED);
      expect(res.body.bkng_cancelled_by).toBe('booker');
      expect(res.body.bkng_refunded).toBe(true);
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: booking.bkng_payment_intent_id,
      });
    });

    it('should not cancel the same call twice', async () => {
      const booking = await bookingModel.findOne({
        teacher: teacherId,
        bkng_time: '15:30',
      });

      await request(testApp.http)
        .post(`/api/mentoring/bookings/${booking._id}/cancel`)
        .set(bearer(student))
        .expect(400);
    });
  });
});
