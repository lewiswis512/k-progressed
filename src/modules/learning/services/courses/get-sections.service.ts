import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Section } from '../../schemas/section.schema';
import { SectionRepository } from '../../repositories/section.repository';
import { User } from '../../../../modules/users/schemas/user.schema';

@Injectable()
export class CourseSectionsService {
  public constructor(private sectionRepository: SectionRepository) {}

  public async get(id: Types.ObjectId, author: User): Promise<Section[]> {
    return await this.sectionRepository.find({
      course: {
        _id: id,
        author,
      },
    });
  }
}
