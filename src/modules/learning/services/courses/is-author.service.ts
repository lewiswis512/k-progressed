import { ForbiddenException, Injectable } from '@nestjs/common';

export class IsCourseAuthorService {
  static async check(courseAuthorId: string, authorId: string) {
    if (courseAuthorId !== authorId) {
      throw new ForbiddenException(
        "You can't update a course who don't belong to you",
      );
    }
  }
}
