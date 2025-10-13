import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';

@Injectable()
export class CoursesByAuthorService {
  public constructor(private courseRepository: CourseRepository) {}

  async byAuthor(authorId: string): Promise<Course[]> {
    return await this.courseRepository.find(
      {
        author: new Types.ObjectId(authorId),
      },
      {
        populate: [
          {
            path: 'category',
            select: '_id ctgr_name',
          },
          {
            path: 'author',
            select: 'usr_username usr_firstname usr_lastname usr_email',
          },
          {
            path: 'teacher',
            select: '_id tchr_title tchr_biography author',
          },
        ],
      },
    );
  }
}
