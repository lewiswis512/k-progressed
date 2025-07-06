import { ForbiddenException } from '@nestjs/common';

export class AuthorLessonService {
  static isAuthor(lessonAuthorId: string, authorId: string) {
    if (lessonAuthorId !== authorId) {
      throw new ForbiddenException(
        "You can't delete a lesson that doesn't belong to you",
      );
    }
  }
}
