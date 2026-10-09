import { ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '../../../../utils/enums/role.enum';

export class AuthorLessonService {
  static isAuthor(
    lessonAuthorId: string,
    user: { id: string; role?: RoleEnum },
  ) {
    if (lessonAuthorId !== user.id && user.role !== RoleEnum.SUPERADMIN) {
      throw new ForbiddenException(
        "You can't manage a lesson that doesn't belong to you",
      );
    }
  }
}
