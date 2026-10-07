import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { Booking } from '../../src/modules/learning/schemas/booking.schema';
import { BookingStatusEnum } from '../../src/utils/enums/booking-status.enum';
import { BookingsService } from '../../src/modules/learning/services/bookings.service';
import { createApp } from './setup';

describe('Mentoring bookings (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let teacherModel: Model<Teacher>;
  let bookingModel: Model<Booking>;
  let mentorToken: string;
  let studentToken: string;
  let otherStudentToken: string;
  let studentId: string;
  let otherStudentId: string;
  let teacherId: string;
  const createdPaymentIntents: string[] = [];

  const DATE = '2031-03-14';
  const users = {
    mentor: { usr_username: 'mentoring_mentor_e2e', usr_email: 'mentoring_mentor_e2e@test.com', usr_password: 'Password123' },
    student: { usr_username: 'mentoring_student_e2e', usr_email: 'mentoring_student_e2e@test.com', usr_password: 'Password123' },
    other: { usr_username: 'mentoring_other_e2e', usr_email: 'mentoring_other_e2e@test.com', usr_password: 'Password123' },
  };
  const emails = Object.values(users).map((u) => u.usr_email);

  const signupAndLogin = async (user: (typeof users)['mentor']) => {
    const signup = await request(app.getHttpServer()).post('/api/signup').send(user);
    const login = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: user.usr_email, usr_password: user.usr_password });

    return { id: signup.body._id as string, token: login.body.accessToken as string };
  };

  const insertBooking = (booking: Partial<Record<string, any>>) =>
    bookingModel.create({
      bkng_date: DATE,
      teacher: new Types.ObjectId(teacherId),
      ...booking,
    });

  const bookedTimes = async (token?: string) => {
    const req = request(app.getHttpServer()).get(
      `/api/mentoring/booked-slots/${teacherId}?date=${DATE}`,
    );
    const res = await (token ? req.set('Authorization', `Bearer ${token}`) : req).expect(200);

    return [...res.body].sort();
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    teacherModel = moduleRef.get(getModelToken(Teacher.name));
    bookingModel = moduleRef.get(getModelToken(Booking.name));

    await userModel.deleteMany({ usr_email: { $in: emails } });

    const mentor = await signupAndLogin(users.mentor);
    const student = await signupAndLogin(users.student);
    const other = await signupAndLogin(users.other);
    mentorToken = mentor.token;
    studentToken = student.token;
    otherStudentToken = other.token;
    studentId = student.id;
    otherStudentId = other.id;

    const teacherRes = await request(app.getHttpServer())
      .post('/api/teachers')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        tchr_title: 'Mentoring E2E Coach',
        tchr_biography: 'Coach for mentoring e2e tests.',
        tchr_is_mentor: true,
        tchr_hourly_rate: 130,
        user_id: mentor.id,
      });
    teacherId = teacherRes.body._id;

    const inFuture = new Date(Date.now() + 10 * 60 * 1000);
    const inPast = new Date(Date.now() - 60 * 1000);

    await insertBooking({ bkng_time: '08:30', bkng_status: BookingStatusEnum.CONFIRMED, booker: new Types.ObjectId(otherStudentId) });
    await insertBooking({ bkng_time: '10:30', bkng_status: BookingStatusEnum.PENDING, bkng_expires_at: inFuture, booker: new Types.ObjectId(studentId) });
    await insertBooking({ bkng_time: '13:30', bkng_status: BookingStatusEnum.PENDING, bkng_expires_at: inPast, booker: new Types.ObjectId(otherStudentId) });
  });

  afterAll(async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await Promise.all(createdPaymentIntents.map((id) => stripe.paymentIntents.cancel(id).catch(() => null)));
    if (teacherId) {
      await bookingModel.deleteMany({ teacher: new Types.ObjectId(teacherId) });
      await teacherModel.findByIdAndDelete(teacherId);
    }
    await userModel.deleteMany({ usr_email: { $in: emails } });
    await app.close();
  });

  describe('booked slots', () => {
    it('should return the confirmed and held times, but not the expired ones', async () => {
      expect(await bookedTimes()).toEqual(['08:30', '10:30']);
    });

    it("should not count the viewer's own pending hold", async () => {
      expect(await bookedTimes(studentToken)).toEqual(['08:30']);
    });

    it('should return no time for another date', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mentoring/booked-slots/${teacherId}?date=2031-03-15`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return 400 for an invalid date', async () => {
      await request(app.getHttpServer())
        .get(`/api/mentoring/booked-slots/${teacherId}?date=tomorrow`)
        .expect(400);
    });
  });

  describe('book a slot', () => {
    const book = (token: string, time: string) =>
      request(app.getHttpServer())
        .post('/api/payment-intent/mentoring')
        .set('Authorization', `Bearer ${token}`)
        .send({ teacherId, date: DATE, time });

    it('should return 409 on a confirmed slot', async () => {
      await book(studentToken, '08:30').expect(409);
    });

    it('should return 409 on a slot held by another student', async () => {
      await book(otherStudentToken, '10:30').expect(409);
    });

    it('should hold a free slot for the student and replace the previous hold', async () => {
      const res = await book(studentToken, '15:30').expect(201);
      createdPaymentIntents.push(res.body.client_secret.split('_secret')[0]);

      expect(res.body.amount).toBe(130);
      expect(await bookedTimes()).toEqual(['08:30', '15:30']);

      const hold = await bookingModel.findOne({ teacher: teacherId, bkng_time: '15:30' });
      expect(hold.bkng_status).toBe(BookingStatusEnum.PENDING);
      expect(hold.bkng_payment_intent_id).toBe(createdPaymentIntents[0]);
    });

    it('should let a student book a slot whose hold has expired', async () => {
      const res = await book(otherStudentToken, '13:30').expect(201);
      createdPaymentIntents.push(res.body.client_secret.split('_secret')[0]);

      expect(await bookedTimes()).toEqual(['08:30', '13:30', '15:30']);
    });
  });

  describe('confirm a booking after payment', () => {
    it('should confirm the hold and keep the slot taken', async () => {
      const hold = await bookingModel.findOne({ teacher: teacherId, bkng_time: '15:30' });

      await moduleRef.get(BookingsService).confirm(hold._id.toString());

      const confirmed = await bookingModel.findById(hold._id);
      expect(confirmed.bkng_status).toBe(BookingStatusEnum.CONFIRMED);
      expect(confirmed.bkng_expires_at).toBeUndefined();
      expect(await bookedTimes(studentToken)).toContain('15:30');
    });

    it('should refuse a second confirmed booking on the same slot', async () => {
      await bookingModel.syncIndexes();

      await expect(
        insertBooking({
          bkng_time: '08:30',
          bkng_status: BookingStatusEnum.CONFIRMED,
          booker: new Types.ObjectId(studentId),
        }),
      ).rejects.toThrow(/duplicate key/);
    });
  });
});
