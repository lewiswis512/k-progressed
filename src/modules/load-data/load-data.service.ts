import { Injectable } from '@nestjs/common';
import { superAdminUser } from '../../data/super-admin';
import { getStudentUsers } from '../../data/students';
import { getTeacherUsers } from '../../data/teachers';
import { AuthService } from '../auth/services/auth.service';
import { CategoryRepository } from '../learning/repositories/category.repository';
import { UserRepository } from '../users/repository/user.repository';
import { User } from '../users/schemas/user.schema';

const CATEGORIES_DESIGNATION = ['Finance', 'Marketing'];

@Injectable()
export class LoadDataService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private categoryRepository: CategoryRepository,
  ) {}

  async loadData() {
    await this.userRepository.deleteMany({});
    await this.categoryRepository.deleteMany({});

    this.loadUsers();
    this.loadCategories();
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
}
