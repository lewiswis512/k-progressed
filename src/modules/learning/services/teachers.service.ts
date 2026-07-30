import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { UserTypeEnum } from '../../../utils/enums/user-type.enum';
import { SaveTeacher } from '../dtos/teachers/save-teacher.dto';
import { TeacherRepository } from '../repositories/teacher.repository';
import { Teacher } from '../schemas/teachers/teacher.schema';

@Injectable()
export class TeachersService {
  constructor(
    private userRepository: UserRepository,
    private teacherRepository: TeacherRepository,
  ) {}

  async findAll(): Promise<Teacher[]> {
    return this.teacherRepository.find(
      {},
      {
        populate: {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname usr_email usr_photo',
        },
      },
    );
  }

  async findById(id: string): Promise<Teacher> {
    return await this.teacherRepository.findById(new Types.ObjectId(id), {
      populate: {
        path: 'author',
        select: 'usr_username usr_firstname usr_lastname usr_email usr_photo',
      },
    });
  }

  async findByUserSlug(slug: string): Promise<Teacher> {
    const author = await this.userRepository.findOne({ usr_slug: slug });

    return await this.teacherRepository.findOne(
      {
        author
      },
      {
        populate: {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname usr_email usr_photo',
        },
      },
    );
  }

  async findByUserId(userId: string) {
    return this.teacherRepository.findOneOrNull({ author: userId });
  }

  async store(userId: string, addTeacher: SaveTeacher) {
    const author = await this.userRepository.findById(
      new Types.ObjectId(userId),
    );
    let data = {
      ...addTeacher,
      author,
    };

    const teacher = await this.teacherRepository.create(data);
    this.updateTypeAndRole(teacher, userId);

    return teacher;
  }

  async updateTypeAndRole(teacher: Teacher, userId: string) {
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
