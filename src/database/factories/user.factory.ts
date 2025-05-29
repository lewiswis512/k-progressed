import { faker } from '@faker-js/faker';
import { RoleEnum } from '../../utils/enums/role.enum';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';

export class UserFactory {
  static create() {
    const firstname = faker.person.firstName().toLowerCase();
    const lastname = faker.person.lastName().toLowerCase();
    const domain = faker.internet.domainName();

    const randomSuffix = faker.number.int({ min: 1, max: 9 });
    const username = `${lastname}${randomSuffix}`;

    return {
      usr_username: username,
      usr_firstname: firstname,
      usr_lastname: lastname,
      usr_email: `${firstname}.${lastname}@${domain}`,
      usr_password: 'password',
      usr_type: faker.helpers.enumValue(UserTypeEnum),
      usr_role: faker.helpers.enumValue(RoleEnum),
      usr_photo: faker.image.avatar(),
      usr_registered_date: () => new Date().toISOString(),
    };
  }
}
