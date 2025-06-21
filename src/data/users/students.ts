import { faker } from '@faker-js/faker';
import { User } from 'src/modules/users/schemas/user.schema';
import { hashPassword } from 'src/utils/auths/hashPassword';
import { RoleEnum } from 'src/utils/enums/role.enum';
import { UserTypeEnum } from 'src/utils/enums/user-type.enum';

export const getStudentUsers = async () => {
  const users: Partial<User>[] = [];

  for (let i = 0; i < 10; i++) {
    const firstname = faker.person.firstName().toLowerCase();
    const lastname = faker.person.lastName().toLowerCase();

    users.push({
      usr_username: firstname,
      usr_firstname: firstname,
      usr_lastname: lastname,
      usr_slug: `${firstname}-${lastname}`,
      usr_email: `${firstname}.${lastname}@gmail.com`,
      usr_password: await hashPassword('password'),
      usr_type: UserTypeEnum.STUDENT,
      usr_role: RoleEnum.USER,
      usr_photo: faker.image.avatar(),
      usr_registered_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return users;
};
