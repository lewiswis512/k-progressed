import { User } from 'src/modules/users/schemas/user.schema';
import { hashPassword } from 'src/utils/auths/hashPassword';
import { RoleEnum } from 'src/utils/enums/role.enum';
import { UserTypeEnum } from 'src/utils/enums/user-type.enum';

export const superAdminUser = async () => {
  const users: Partial<User> = {
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
    created_at: new Date(),
    updated_at: new Date(),
  };

  return users;
};
