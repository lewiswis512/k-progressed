import { getModelToken } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Category } from '../../src/modules/learning/schemas/category.schema';
import { Course } from '../../src/modules/learning/schemas/course.schema';
import { Lesson } from '../../src/modules/learning/schemas/lesson.schema';
import { Section } from '../../src/modules/learning/schemas/section.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import {
  Purchase,
  PurchaseStatusEnum,
} from '../../src/modules/purchases/schemas/purchase.schema';
import { User } from '../../src/modules/users/schemas/user.schema';
import { CourseStatusEnum } from '../../src/utils/enums/course-status.enum';
import { LevelEnum } from '../../src/utils/enums/level.enum';
import { PaymentMethodEnum } from '../../src/utils/enums/payment-method.enum';
import { RoleEnum } from '../../src/utils/enums/role.enum';
import { ITestApp } from './create-app';

export const DEFAULT_PASSWORD = 'Password123';

export const FAKE_JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  Buffer.from('JFIF-fake-image-content'),
]);

export const FAKE_MP4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypmp42-fake-video-content'),
]);

export interface ITestUser {
  id: string;
  token: string;
  email: string;
  username: string;
  password: string;
}

export const uniqueName = (prefix: string): string =>
  `${prefix}_${randomBytes(4).toString('hex')}`;

export const tokenFromMail = (
  mailer: ITestApp['mailer'],
  email: string,
  pathSegment: 'verify-email' | 'forgot-password',
): string | undefined => {
  const pattern = new RegExp(`${pathSegment}/([a-f0-9]{64})`);
  const calls = mailer.sendMail.mock.calls.filter(
    ([mail]) => mail.to === email && pattern.test(mail.html),
  );

  if (calls.length === 0) {
    return undefined;
  }

  return calls[calls.length - 1][0].html.match(pattern)[1];
};

export class Fixtures {
  constructor(private testApp: ITestApp) {}

  model<T>(name: string): Model<T> {
    return this.testApp.moduleRef.get(getModelToken(name));
  }

  get users() {
    return this.model<User>(User.name);
  }

  async signup(prefix: string, password: string = DEFAULT_PASSWORD) {
    const username = uniqueName(prefix);
    const email = `${username}@test.local`;

    await request(this.testApp.http)
      .post('/api/signup')
      .send({
        usr_username: username,
        usr_email: email,
        usr_password: password,
        acceptTerms: true,
      })
      .expect(201);

    const user = await this.users.findOne({ usr_email: email });

    return { id: String(user._id), email, username, password };
  }

  async createUser(
    prefix: string,
    options: { role?: RoleEnum; password?: string } = {},
  ): Promise<ITestUser> {
    const created = await this.signup(prefix, options.password);
    const verificationToken = tokenFromMail(
      this.testApp.mailer,
      created.email,
      'verify-email',
    );
    const verified = await request(this.testApp.http)
      .post(`/api/verify-email/${verificationToken}`)
      .expect(200);

    if (options.role) {
      await this.setRole(created.id, options.role);
    }

    return { ...created, token: verified.body.accessToken };
  }

  async setRole(userId: string, role: RoleEnum) {
    await this.users.updateOne(
      { _id: new Types.ObjectId(userId) },
      { usr_role: role },
    );
  }

  async createSuperAdmin(prefix = 'super'): Promise<ITestUser> {
    return this.createUser(prefix, { role: RoleEnum.SUPERADMIN });
  }

  async createTeacherProfile(
    user: ITestUser,
    data: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(this.testApp.http)
      .post('/api/teachers')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        tchr_title: 'Trainer',
        tchr_biography: 'Biography of a test trainer',
        ...data,
      })
      .expect(201);

    return res.body._id;
  }

  async createTeacher(prefix = 'teacher') {
    const user = await this.createUser(prefix);
    const teacherId = await this.createTeacherProfile(user);

    return { ...user, teacherId };
  }

  async createCategory(name = uniqueName('Category')): Promise<string> {
    const category = await this.model<Category>(Category.name).create({
      _id: new Types.ObjectId(),
      ctgr_name: name,
    });

    return String(category._id);
  }

  async createCourse(options: {
    authorId: string;
    teacherId?: string;
    categoryId?: string;
    price?: number;
    status?: CourseStatusEnum;
    title?: string;
  }): Promise<string> {
    const title = options.title ?? uniqueName('Course');
    const course = await this.model<Course>(Course.name).create({
      _id: new Types.ObjectId(),
      crs_title: title,
      crs_slug: title.toLowerCase(),
      crs_description: 'Course created by the e2e fixtures',
      crs_price: options.price ?? 49.99,
      crs_status: options.status ?? CourseStatusEnum.VALIDATED,
      crs_photo: 'https://res.cloudinary.com/test-cloud/image/upload/v1/courses/photo.jpg',
      level_id: LevelEnum.BEGINNER,
      author: new Types.ObjectId(options.authorId),
      category: options.categoryId
        ? new Types.ObjectId(options.categoryId)
        : new Types.ObjectId(await this.createCategory()),
      teacher: options.teacherId ? new Types.ObjectId(options.teacherId) : undefined,
    });

    return String(course._id);
  }

  async createSection(courseId: string, title = 'Section'): Promise<string> {
    const section = await this.model<Section>(Section.name).create({
      _id: new Types.ObjectId(),
      sect_title: title,
      sect_order: 1,
      course: new Types.ObjectId(courseId),
    });

    return String(section._id);
  }

  async createLesson(
    sectionId: string,
    options: { isFree?: boolean; title?: string } = {},
  ): Promise<string> {
    const lesson = await this.model<Lesson>(Lesson.name).create({
      _id: new Types.ObjectId(),
      lssn_title: options.title ?? uniqueName('Lesson'),
      lssn_video_link: 'https://res.cloudinary.com/test-cloud/video/upload/v1/lessons/video.mp4',
      lssn_video_photo: 'https://res.cloudinary.com/test-cloud/video/upload/v1/lessons/video.jpg',
      lssn_is_free: options.isFree ?? false,
      lssn_duration: '00:02:05',
      section: new Types.ObjectId(sectionId),
    });

    return String(lesson._id);
  }

  async createPurchase(
    user: Pick<ITestUser, 'id' | 'email'>,
    courseIds: string[],
    options: { paid?: boolean; total?: number } = {},
  ): Promise<string> {
    const courses = await this.model<Course>(Course.name).find({
      _id: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
    });
    const total =
      options.total ??
      courses.reduce((sum, course) => sum + Number(course.crs_price), 0);
    const paid = options.paid ?? true;
    const purchase = await this.model<Purchase>(Purchase.name).create({
      _id: new Types.ObjectId(),
      purch_reference: uniqueName('KP-TEST'),
      payment_method: PaymentMethodEnum.STRIPE,
      user: {
        id: user.id,
        name: 'Test Buyer',
        email: user.email,
        address: { line1: '1 rue du Test', city: 'Paris', postal_code: '75001' },
      },
      purchaseItems: courses.map((course) => ({
        id: String(course._id),
        title: course.crs_title,
        slug: course.crs_slug,
        image: course.crs_photo,
        price: course.crs_price,
        qty: 1,
      })),
      purch_total: total,
      purch_currency: 'eur',
      purch_status: paid ? PurchaseStatusEnum.PAID : PurchaseStatusEnum.PENDING,
      purch_is_paid: paid,
      purch_paid_at: paid ? new Date() : undefined,
    });

    return String(purchase._id);
  }
}

export const bearer = (user: Pick<ITestUser, 'token'>) => ({
  Authorization: `Bearer ${user.token}`,
});

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
