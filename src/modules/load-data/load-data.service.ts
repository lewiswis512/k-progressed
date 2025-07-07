import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { FINANCE_LESSONS } from '../../data/lessons/finance-lesson';
import { COURSE_DOMAIN } from '../../data/courses/course-domain';
import { FINANCE_COURSE } from '../../data/courses/finance-course';
import { MARKETING_COURSE } from '../../data/courses/marketing-course';
import { LESSON_DOMAIN } from '../../data/lessons/lesson-domain';
import { MARKETING_LESSONS } from '../../data/lessons/marketing-lesson';
import { FINANCE_SECTIONS } from '../../data/sections/finance-sections';
import { MARKETING_SECTIONS } from '../../data/sections/marketing-sections';
import { SECTION_DOMAIN } from '../../data/sections/section-domain';
import { DOMAIN } from '../../data/teachers/domain';
import { FINANCE } from '../../data/teachers/finance';
import { MARKETING } from '../../data/teachers/marketing';
import { getStudentUsers } from '../../data/users/students';
import { superAdminUser } from '../../data/users/super-admin';
import { getTeacherUsers } from '../../data/users/teacher-users';
import { RoleEnum } from '../../utils/enums/role.enum';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';
import { AuthService } from '../auth/services/auth.service';
import { CategoryRepository } from '../learning/repositories/category.repository';
import { CourseRepository } from '../learning/repositories/course.repository';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { SectionRepository } from '../learning/repositories/section.repository';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { Category } from '../learning/schemas/category.schema';
import { Course } from '../learning/schemas/course.schema';
import { Section } from '../learning/schemas/section.schema';
import { Teacher } from '../learning/schemas/teachers/teacher.schema';
import { CoursesService } from '../learning/services/courses.service';
import { UserRepository } from '../users/repository/user.repository';
import { User } from '../users/schemas/user.schema';

const CATEGORIES_DESIGNATION = ['Finance', 'Marketing'];

@Injectable()
export class LoadDataService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private coursesService: CoursesService,
  ) {}

  async loadData() {
    await this.userRepository.deleteMany({});
    await this.categoryRepository.deleteMany({});
    await this.teacherRepository.deleteMany({});
    await this.courseRepository.deleteMany({});
    await this.sectionRepository.deleteMany({});
    await this.lessonRepository.deleteMany({});

    await this.loadUsers();
    await this.loadCategories();
    await this.loadTeachers();
    await this.loadMarketingCourses();
    await this.loadFinanceCourses();
    await this.loadMarketingSections();
    await this.loadFinanceSections();

    await this.loadMarketingLessons();
    await this.loadFinanceLessons();
  }

  async loadUsers() {
    let users: Partial<User>[] = [];

    const userSuperAdmin: Partial<User> = await superAdminUser();
    const studentUsers: Partial<User>[] = await getStudentUsers();
    const teacherUsers: Partial<User>[] = await getTeacherUsers();

    users = [...users, userSuperAdmin, ...studentUsers, ...teacherUsers];

    const usersCreated = await this.userRepository.insertMany(users);

    await Promise.all(
      usersCreated.map(async (user) => {
        await this.authService.attachCustomerIdToUser(user);
      }),
    );
  }

  async loadCategories(): Promise<Category[]> {
    const categories = CATEGORIES_DESIGNATION.map((designation) => ({
      ctgr_name: designation,
    }));

    return await this.categoryRepository.insertMany(categories);
  }

  createTeachers = (
    startIndex: number,
    endIndex: number,
    domain: DOMAIN,
    users: User[],
  ): Omit<Teacher, '_id'>[] => {
    return users.slice(startIndex, endIndex).map((user, index) => ({
      tchr_title: domain.title[index],
      tchr_biography: domain.biography[index],
      author: user,
      created_at: new Date(),
      updated_at: new Date(),
    }));
  };

  async loadTeachers(): Promise<Teacher[]> {
    const users: User[] = await this.userRepository.find({
      usr_type: UserTypeEnum.TEACHER,
      usr_role: RoleEnum.ADMIN,
    });

    const teachersInMarketing: Omit<Partial<Teacher>, '_id'>[] =
      this.createTeachers(0, 5, MARKETING, users);

    const teachersInFinance: Omit<Teacher, '_id'>[] = this.createTeachers(
      5,
      users.length,
      FINANCE,
      users,
    );

    const teachers: [Teacher[], Teacher[]] = await Promise.all([
      await this.teacherRepository.insertMany(teachersInMarketing),
      await this.teacherRepository.insertMany(teachersInFinance),
    ]);

    return teachers.flat();
  }

  async loadCourses(
    startIndex: number,
    endIndex: number,
    categoryName: string,
    domain: COURSE_DOMAIN,
  ): Promise<Partial<Course>[]> {
    const category: Category = await this.categoryRepository.findOne({
      ctgr_name: categoryName,
    });
    const teachers: Teacher[] = await this.teacherRepository.find();
    const teacherIds: Types.ObjectId[] = teachers
      .slice(startIndex, endIndex)
      .map((teacher) => teacher._id);
    let courses: Partial<Course>[] = [];

    for (let index = 0; index < domain.length; index++) {
      const course = domain[index];
      const teacherId: Types.ObjectId = teacherIds[index % teacherIds.length];
      const teacher: Teacher = await this.teacherRepository.findById(
        new Types.ObjectId(teacherId),
      );
      const author: User = teacher.author;
      const baseDate: Date = new Date();
      const createdAt: Date = new Date(baseDate);
      const updatedAt: Date = new Date(baseDate);
      createdAt.setDate(createdAt.getDate() + index);
      updatedAt.setDate(updatedAt.getDate() + index);

      let data: Partial<Course> = {
        crs_title: course.crs_title,
        crs_slug: course.crs_slug,
        crs_description: course.crs_description,
        crs_price: course.crs_price,
        crs_isPaid: course.crs_isPaid,
        crs_photo: course.crs_photo,
        level_id: course.level_id,
        crs_isApprouved: course.crs_isApprouved,
        category,
        teacher,
        author,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      courses.push(data);
    }

    return courses;
  }

  async loadMarketingCourses(): Promise<Course[]> {
    const courses = await this.loadCourses(0, 5, 'Marketing', MARKETING_COURSE);

    return await this.courseRepository.insertMany(courses);
  }

  async loadFinanceCourses(): Promise<Course[]> {
    const courses = await this.loadCourses(5, 9, 'Finance', FINANCE_COURSE);

    return await this.courseRepository.insertMany(courses);
  }

  async loadSections(
    ctgrName: string,
    sectionDomain: SECTION_DOMAIN,
  ): Promise<Section[]> {
    const category: Category = await this.categoryRepository.findOne({
      ctgr_name: ctgrName,
    });
    const courses: Course[] = await this.courseRepository.find({ category });
    const sections: Omit<Section, '_id'>[] = courses.flatMap((course) =>
      sectionDomain.map((sectionTitle) => ({
        sect_title: sectionTitle,
        course,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );

    return await this.sectionRepository.insertMany(sections);
  }

  async loadMarketingSections(): Promise<Section[]> {
    return await this.loadSections('Marketing', MARKETING_SECTIONS);
  }

  async loadFinanceSections(): Promise<Section[]> {
    return await this.loadSections('Finance', FINANCE_SECTIONS);
  }

  async loadLessons(categoryName: string, lessonDomain: LESSON_DOMAIN) {
    const courses: Course[] =
      await this.coursesService.findByCategory(categoryName);
    const data = [];

    await Promise.all(
      courses.map(async (course) => {
        const courseId = course._id;
        const sections: Section[] = await this.sectionRepository.find({
          course: courseId,
        });

        for (let i = 0; i < sections.length && i < lessonDomain.length; i++) {
          const section = sections[i];
          const lesson = lessonDomain[i];
          data.push({
            section,
            lssn_title: lesson.lssn_title,
            lssn_is_free: lesson.lssn_is_free,
            lssn_video_photo: lesson.lssn_video_photo,
            lssn_video_link: lesson.lssn_video_link,
          });
        }
      }),
    );

    return await this.lessonRepository.insertMany(data);
  }

  async loadMarketingLessons() {
    return await this.loadLessons('marketing', MARKETING_LESSONS);
  }

  async loadFinanceLessons() {
    return await this.loadLessons('finance', FINANCE_LESSONS);
  }
}
