import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Course } from '../../schemas/course.schema';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class GetCourseByIdService {
  public constructor(private courseRepository: CourseRepository) {}

  async byId(id: string): Promise<Course> {
    return this.courseRepository.findById(new Types.ObjectId(id));
  }
}
