import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../common/access/course-access.service';
import { CourseRepository } from '../learning/repositories/course.repository';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { SectionRepository } from '../learning/repositories/section.repository';
import { UserRepository } from '../users/repository/user.repository';
import { User } from '../users/schemas/user.schema';
import { CertificateRepository } from './repositories/certificate.repository';
import { LessonProgressRepository } from './repositories/lesson-progress.repository';

type CertificatePerson = Pick<
  User,
  'usr_firstname' | 'usr_lastname' | 'usr_username'
>;

export interface ICourseProgress {
  courseId: string;
  completedLessonIds: string[];
  completedLessons: number;
  totalLessons: number;
  percent: number;
  certificateNumber: string | null;
}

@Injectable()
export class ProgressService {
  constructor(
    private lessonProgressRepository: LessonProgressRepository,
    private certificateRepository: CertificateRepository,
    private courseRepository: CourseRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private userRepository: UserRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  private async findCourse(courseId: Types.ObjectId | string) {
    return this.courseRepository.findById(new Types.ObjectId(String(courseId)));
  }

  private async lessonIdsOfCourse(courseId: Types.ObjectId): Promise<string[]> {
    const sections = await this.sectionRepository.find(
      { course: courseId },
      { select: '_id' },
    );
    const lessons = await this.lessonRepository.find(
      { section: { $in: sections.map((section) => section._id) } },
      { select: '_id' },
    );

    return lessons.map((lesson) => String(lesson._id));
  }

  private async courseOfLesson(lessonId: string) {
    const lesson = await this.lessonRepository.findById(
      new Types.ObjectId(lessonId),
    );
    const section = lesson.section
      ? await this.sectionRepository.findOneOrNull({
          _id: lesson.section._id,
        })
      : null;

    if (!section?.course) {
      throw new NotFoundException('Lesson not found');
    }

    return this.findCourse(section.course._id);
  }

  async complete(
    lessonId: string,
    user: IAccessUser,
  ): Promise<ICourseProgress> {
    const course = await this.courseOfLesson(lessonId);

    await this.courseAccessService.assertAccess(user, course);

    await this.lessonProgressRepository.markCompleted(
      new Types.ObjectId(user.id),
      new Types.ObjectId(lessonId),
      course._id,
    );

    return this.forCourse(String(course._id), user);
  }

  async uncomplete(
    lessonId: string,
    user: IAccessUser,
  ): Promise<ICourseProgress> {
    const course = await this.courseOfLesson(lessonId);

    await this.lessonProgressRepository.findOneAndDelete({
      user: new Types.ObjectId(user.id),
      lesson: new Types.ObjectId(lessonId),
    });

    return this.forCourse(String(course._id), user);
  }

  async forCourse(
    courseId: string,
    user: IAccessUser,
  ): Promise<ICourseProgress> {
    const courseObjectId = new Types.ObjectId(courseId);
    const lessonIds = await this.lessonIdsOfCourse(courseObjectId);
    const progress = await this.lessonProgressRepository.find(
      { user: new Types.ObjectId(user.id), course: courseObjectId },
      { select: 'lesson' },
    );
    const existing = new Set(lessonIds);
    const completedLessonIds = progress
      .map((item) => String(item.lesson))
      .filter((id) => existing.has(id));
    const certificate = await this.certificateRepository.findOneOrNull({
      user: new Types.ObjectId(user.id),
      course: courseObjectId,
    });

    return {
      courseId,
      completedLessonIds,
      completedLessons: completedLessonIds.length,
      totalLessons: lessonIds.length,
      percent:
        lessonIds.length === 0
          ? 0
          : Math.round((completedLessonIds.length / lessonIds.length) * 100),
      certificateNumber: certificate?.cert_number ?? null,
    };
  }

  async learning(user: IAccessUser) {
    const courseIds = await this.courseAccessService.purchasedCourseIds(
      user.id,
    );
    const courses = await this.courseRepository.findSummaries(
      courseIds.map((id) => new Types.ObjectId(id)),
    );
    const authors = await this.userRepository.find(
      { _id: { $in: courses.map((course) => course.author._id) } },
      { select: 'usr_username usr_firstname usr_lastname' },
    );
    const authorsById = new Map(
      authors.map((author) => [String(author._id), author]),
    );

    return Promise.all(
      courses.map(async (course) => ({
        course: {
          ...course,
          author: authorsById.get(String(course.author)) ?? null,
        },
        progress: await this.forCourse(String(course._id), user),
      })),
    );
  }

  async issueCertificate(courseId: string, user: IAccessUser) {
    const course = await this.findCourse(new Types.ObjectId(courseId));

    await this.courseAccessService.assertAccess(user, course);

    const existing = await this.certificateRepository.findOneOrNull({
      user: new Types.ObjectId(user.id),
      course: course._id,
    });

    if (existing) {
      return existing;
    }

    const progress = await this.forCourse(courseId, user);

    if (progress.totalLessons === 0 || progress.percent < 100) {
      throw new BadRequestException(
        'Complete every lesson of the course to get your certificate',
      );
    }

    const student = await this.userRepository.findPublicById(
      new Types.ObjectId(user.id),
    );
    const teacher = await this.userRepository.findOneOrNull({
      _id: course.author._id,
    });
    const fullName = (person: CertificatePerson | null) =>
      [person?.usr_firstname, person?.usr_lastname].filter(Boolean).join(' ') ||
      person?.usr_username ||
      '';

    return this.certificateRepository.create({
      cert_number: `KP-${randomBytes(6).toString('hex').toUpperCase()}`,
      user: student,
      course,
      cert_student_name: fullName(student),
      cert_course_title: course.crs_title,
      cert_teacher_name: fullName(teacher),
      cert_issued_at: new Date(),
    });
  }

  async verifyCertificate(certNumber: string) {
    return this.certificateRepository.findOne(
      { cert_number: certNumber },
      {
        select:
          'cert_number cert_student_name cert_course_title cert_teacher_name cert_issued_at course',
      },
    );
  }
}
