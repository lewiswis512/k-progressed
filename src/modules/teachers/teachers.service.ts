import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import { RoleEnum } from '../../utils/enums/role.enum';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';
import { UserRepository } from '../users/repository/user.repository';
import { SaveTeacher } from './dto/save-teacher.dto';
import { TeacherRepository } from './repositories/teacher.repository';
import { Aggregation } from '../../common/repository/abstract.repository';

@Injectable()
export class TeachersService {
  constructor(
    private userRepository: UserRepository,
    private teacherRepository: TeacherRepository,
  ) {}

  async findAll() {
    const teacherAggregation: Aggregation[] = [
      { $project: { __v: 0 } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
                usr_email: 1,
                usr_photo: 1,
              },
            },
          ],
          as: 'author',
        },
      },
      { $unwind: '$author' },
    ];

    return this.teacherRepository.aggregate(teacherAggregation);
  }

  async findById(id: string) {
    const teacherAggregation = [
      { $match: { _id: new Types.ObjectId(id) } },
      { $project: { __v: 0 } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
                usr_email: 1,
                usr_photo: 1,
              },
            },
          ],
          as: 'author',
        },
      },
      { $unwind: '$author' },
    ];

    const teacher = await this.teacherRepository.aggregate(teacherAggregation);

    return teacher[0];
  }

  async findByUserSlug(slug: string) {
    const teacherAggregation = [
      { $project: { __v: 0 } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
                usr_email: 1,
                usr_photo: 1,
                usr_slug: 1
              },
            },
          ],
          as: 'author',
        },
      },
      { $unwind: '$author' },
      { $match: { 'author.usr_slug': slug } },
    ];

    const teacher = await this.teacherRepository.aggregate(teacherAggregation);

    return teacher[0];
  }

  async findByUserId(userId: string) {
    return this.teacherRepository.findOneOrNull({ author: userId });
  }

  async store(userId: string, addTeacher: SaveTeacher) {
    let data = {
      ...addTeacher,
      userId,
    };

    const teacher = await this.teacherRepository.create(data);

    if (teacher) {
      const user = await this.userRepository.findById(
        new Types.ObjectId(userId),
      );

      if (user) {
        await this.userRepository.findByIdAndUpdate(
          new Types.ObjectId(userId),
          {
            usr_type: UserTypeEnum.TEACHER,
            usr_role: RoleEnum.ADMIN,
          },
        );
      }
    }

    return teacher;
  }

  async update(id: string, teacher: SaveTeacher) {
    await this.findById(id);

    return this.teacherRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      teacher,
    );
  }

  async delete(id: string) {
    await this.findById(id);

    return this.teacherRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}
