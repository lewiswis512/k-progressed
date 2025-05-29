import { User } from '../../modules/users/schemas/user.schema';
import { ISaveCourse } from './ISaveCourse';

export interface IAddCourse extends ISaveCourse {
  author: User;
}
