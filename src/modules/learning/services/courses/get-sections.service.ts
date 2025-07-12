import { Injectable } from '@nestjs/common';
import { Course } from '../../schemas/course.schema';
import { Section } from '../../schemas/section.schema';
import { SectionRepository } from '../../repositories/section.repository';

@Injectable()
export class CourseSectionsService {
  public constructor(private sectionRepository: SectionRepository) {}

  public async get(course: Course): Promise<Section[]> {
    return await this.sectionRepository.find({
      course: {
        _id: course._id,
        author: course.teacher.author,
      },
    });
  }
}
