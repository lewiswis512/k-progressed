import { User } from '../../modules/users/schemas/user.schema';
import { hashPassword } from '../../utils/auths/hashPassword';
import { RoleEnum } from '../../utils/enums/role.enum';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';

export const superAdminUser = async () => {
  const users: Partial<User> = {
    usr_username: 'Lewis',
    usr_firstname: 'Lewis',
    usr_lastname: 'Rabarison',
    usr_slug: 'lewis-rabarison',
    usr_email: process.env.SEED_SUPERADMIN_EMAIL || 'rabarilewis@gmail.com',
    usr_password: await hashPassword(process.env.SEED_PASSWORD),
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
