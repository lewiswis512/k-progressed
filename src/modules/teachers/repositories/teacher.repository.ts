import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Teacher } from '../schemas/teacher.schema';

export class TeacherRepository extends AbstractRepository<Teacher> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Teacher.name) private teacherModel: Model<Teacher>) {
    super(teacherModel);
  }
}
