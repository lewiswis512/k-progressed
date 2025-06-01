import { Injectable } from '@nestjs/common';
import { superAdminUser } from '../../data/users/super-admin';
import { getStudentUsers } from '../../data/users/students';
import { getTeacherUsers } from '../../data/users/teacher-users';
import { AuthService } from '../auth/services/auth.service';
import { CategoryRepository } from '../learning/repositories/category.repository';
import { UserRepository } from '../users/repository/user.repository';
import { User } from '../users/schemas/user.schema';
import { TeacherRepository } from '../teachers/repositories/teacher.repository';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';
import { RoleEnum } from '../../utils/enums/role.enum';
import { Teacher } from '../teachers/schemas/teacher.schema';
import { MARKETING } from '../../data/teachers/marketing';
import { FINANCE } from '../../data/teachers/finance';
import { DOMAIN } from '../../data/teachers/domain';
import { Category } from '../learning/schemas/category.schema';
import { Course } from '../learning/schemas/course.schema';
import { MARKETING_COURSE } from '../../data/courses/marketing-course';
import { Types } from 'mongoose';
import { CourseRepository } from '../learning/repositories/course.repository';

const CATEGORIES_DESIGNATION = ['Finance', 'Marketing'];

@Injectable()
export class LoadDataService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
  ) {}

  async loadData() {
    // await this.userRepository.deleteMany({});
    // await this.categoryRepository.deleteMany({});
    // await this.teacherRepository.deleteMany({});
    await this.courseRepository.deleteMany({});

    // this.loadUsers();
    // this.loadCategories();
    // this.loadTeachers();
    this.loadMarketingCourses();
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

  async loadCategories() {
    const categories = CATEGORIES_DESIGNATION.map((designation) => ({
      ctgr_name: designation,
    }));

    await this.categoryRepository.insertMany(categories);
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

  async loadTeachers() {
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

    await this.teacherRepository.insertMany(teachersInMarketing);
    await this.teacherRepository.insertMany(teachersInFinance);
  }

  async loadMarketingCourses(): Promise<Course[]> {
    const category: Category = await this.categoryRepository.findOne({
      ctgr_name: 'Marketing',
    });

    const teachers: Teacher[] = await this.teacherRepository.find();
    const teacherIds: Types.ObjectId[] = teachers.map((teacher) => teacher._id);
    let courses: Partial<Course>[] = [];

    for (let index = 0; index < MARKETING_COURSE.length; index++) {
      const course = MARKETING_COURSE[index];
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

    return await this.courseRepository.insertMany(courses);
  }
}
