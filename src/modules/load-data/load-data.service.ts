import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { UserRepository } from '../users/repository/user.repository';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';
import { RoleEnum } from '../../utils/enums/role.enum';
import { User } from '../users/schemas/user.schema';
import { hashPassword } from '../../utils/auths/hashPassword';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class LoadDataService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
  ) {}

  loadData() {
    this.loadUsers();
  }

  async loadUsers() {
    await this.userRepository.deleteMany({});

    const users: Partial<User>[] = [];

    for (let i = 0; i < 20; i++) {
      const firstname = faker.person.firstName().toLowerCase();
      const lastname = faker.person.lastName().toLowerCase();
      const domain = faker.internet.domainName();
      //const randomSuffix = faker.number.int({ min: 1, max: 9 });
      //const username = `${lastname}${randomSuffix}`;

      users.push({
        usr_username: firstname,
        usr_firstname: firstname,
        usr_lastname: lastname,
        usr_email: `${firstname}.${lastname}@${domain}`,
        usr_password: await hashPassword('password'),
        usr_type: UserTypeEnum.STUDENT,
        usr_role: RoleEnum.USER,
        usr_photo: faker.image.avatar(),
        usr_registered_date: new Date(),
      });
    }

    users.push({
      usr_username: 'Lewis',
      usr_firstname: 'Lewis',
      usr_lastname: 'Rabarison',
      usr_email: 'rabarilewis@gmail.com',
      usr_password: await hashPassword('password'),
      usr_type: UserTypeEnum.TEACHER,
      usr_role: RoleEnum.SUPERADMIN,
      usr_photo:
        'https://res.cloudinary.com/k-progressed/image/upload/v1748543572/Lewis_jqta9k.png',
      usr_registered_date: new Date(),
    });

    const usersCreated = await this.userRepository.insertMany(users);

    await Promise.all(
      usersCreated.map(async (user) => {
        await this.authService.attachCustomerIdToUser(user);
      }),
    );
  }
}
