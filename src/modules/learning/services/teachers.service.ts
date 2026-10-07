import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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

  async findMentors(): Promise<Teacher[]> {
    return this.teacherRepository.find(
      { tchr_is_mentor: true },
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
        author,
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
    if (addTeacher.tchr_is_mentor && !(addTeacher.tchr_hourly_rate > 0)) {
      throw new BadRequestException(
        'A mentor must have an hourly rate greater than 0',
      );
    }

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

  async update(
    id: string,
    teacher: SaveTeacher,
    user: { id: string; role: RoleEnum },
  ) {
    const current = await this.findById(id);

    if (
      current.author?._id.toString() !== user.id &&
      user.role !== RoleEnum.SUPERADMIN
    ) {
      throw new ForbiddenException(
        "You can't update a teacher profile who don't belong to you",
      );
    }

    const isMentor = teacher.tchr_is_mentor ?? current.tchr_is_mentor;
    const hourlyRate = teacher.tchr_hourly_rate ?? current.tchr_hourly_rate;

    if (isMentor && !(hourlyRate > 0)) {
      throw new BadRequestException(
        'A mentor must have an hourly rate greater than 0',
      );
    }

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
