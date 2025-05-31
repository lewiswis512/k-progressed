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

const CATEGORIES_DESIGNATION = ['Finance', 'Marketing'];

@Injectable()
export class LoadDataService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
  ) {}

  async loadData() {
    //await this.userRepository.deleteMany({});
    await this.categoryRepository.deleteMany({});
    await this.teacherRepository.deleteMany({});

    //this.loadUsers();
    this.loadCategories();
    this.loadTeachers();
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
  ) => {
    return users.slice(startIndex, endIndex).map((user, index) => ({
      tchr_title: domain['title'][index],
      tchr_biography: domain['biography'][index],
      user_id: user._id,
      created_at: new Date(),
      updated_at: new Date(),
    }));
  };

  async loadTeachers() {
    const users: User[] = await this.userRepository.find({
      usr_type: UserTypeEnum.TEACHER,
      usr_role: RoleEnum.ADMIN,
    });

    const teachersInMarketing: Omit<Teacher, '_id'>[] = this.createTeachers(
      0,
      5,
      MARKETING,
      users,
    );
    const teachersInFinance: Omit<Teacher, '_id'>[] = this.createTeachers(
      5,
      users.length,
      FINANCE,
      users,
    );

    await this.teacherRepository.insertMany(teachersInMarketing);
    await this.teacherRepository.insertMany(teachersInFinance);
  }
}
