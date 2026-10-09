import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  PUBLIC_USER_FIELDS,
  UserRepository,
} from '../../../modules/users/repository/user.repository';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { UserTypeEnum } from '../../../utils/enums/user-type.enum';
import { DEFAULT_MENTOR_AVAILABILITY } from '../constants/mentoring';
import { EditTeacher } from '../dtos/teachers/edit-teacher.dto';
import { SaveTeacher } from '../dtos/teachers/save-teacher.dto';
import { TeacherRepository } from '../repositories/teacher.repository';
import { CourseRepository } from '../repositories/course.repository';
import {
  IMentorAvailability,
  Teacher,
} from '../schemas/teachers/teacher.schema';

@Injectable()
export class TeachersService {
  constructor(
    private userRepository: UserRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
  ) {}

  async findAll(): Promise<Teacher[]> {
    return this.teacherRepository.find(
      {},
      { populate: { path: 'author', select: PUBLIC_USER_FIELDS } },
    );
  }

  async findMentors(): Promise<Teacher[]> {
    return this.teacherRepository.find(
      { tchr_is_mentor: true, tchr_hourly_rate: { $gt: 0 } },
      { populate: { path: 'author', select: PUBLIC_USER_FIELDS } },
    );
  }

  async findById(id: string): Promise<Teacher> {
    return await this.teacherRepository.findById(new Types.ObjectId(id), {
      populate: { path: 'author', select: PUBLIC_USER_FIELDS },
    });
  }

  async findByUserSlug(slug: string): Promise<Teacher> {
    const author = await this.userRepository.findOne({ usr_slug: slug });

    return await this.teacherRepository.findOne(
      { author: author._id },
      { populate: { path: 'author', select: PUBLIC_USER_FIELDS } },
    );
  }

  async findByUserId(userId: string) {
    return this.teacherRepository.findOneOrNull({
      author: new Types.ObjectId(userId),
    });
  }

  availabilityOf(teacher: Teacher): IMentorAvailability[] {
    return teacher.tchr_availability?.length
      ? teacher.tchr_availability
      : DEFAULT_MENTOR_AVAILABILITY;
  }

  private normalizeAvailability(
    availability?: IMentorAvailability[],
  ): IMentorAvailability[] | undefined {
    if (!availability) {
      return undefined;
    }

    const byDay = new Map<number, Set<string>>();

    availability.forEach(({ day, times }) => {
      const existing = byDay.get(day) ?? new Set<string>();
      times.forEach((time) => existing.add(time));
      byDay.set(day, existing);
    });

    return [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, times]) => ({ day, times: [...times].sort() }));
  }

  private assertMentorRate(isMentor?: boolean, hourlyRate?: number) {
    if (isMentor && !(hourlyRate > 0)) {
      throw new BadRequestException(
        'A mentor must have an hourly rate greater than 0',
      );
    }
  }

  async store(userId: string, addTeacher: SaveTeacher) {
    const authorId = new Types.ObjectId(userId);

    if (await this.teacherRepository.findOneOrNull({ author: authorId })) {
      throw new ConflictException('You already have a teacher profile');
    }

    this.assertMentorRate(
      addTeacher.tchr_is_mentor,
      addTeacher.tchr_hourly_rate,
    );

    const user = await this.userRepository.findById(authorId, {
      select: `${PUBLIC_USER_FIELDS} usr_role`,
    });
    const teacher = await this.teacherRepository.create({
      tchr_title: addTeacher.tchr_title,
      tchr_biography: addTeacher.tchr_biography,
      tchr_is_mentor: addTeacher.tchr_is_mentor ?? false,
      tchr_hourly_rate: addTeacher.tchr_hourly_rate ?? 0,
      tchr_availability: this.normalizeAvailability(
        addTeacher.tchr_availability,
      ),
      author: user,
    });

    await this.userRepository.findByIdAndUpdate(authorId, {
      usr_type: UserTypeEnum.TEACHER,
      usr_role:
        user.usr_role === RoleEnum.SUPERADMIN
          ? RoleEnum.SUPERADMIN
          : RoleEnum.ADMIN,
    });

    return teacher;
  }

  private assertOwner(
    teacher: Teacher,
    user: { id: string; role: RoleEnum },
    message: string,
  ) {
    const authorId = String(teacher.author?._id ?? teacher.author);

    if (authorId !== user.id && user.role !== RoleEnum.SUPERADMIN) {
      throw new ForbiddenException(message);
    }
  }

  async update(
    id: string,
    teacher: EditTeacher,
    user: { id: string; role: RoleEnum },
  ) {
    const current = await this.findById(id);

    this.assertOwner(
      current,
      user,
      "You can't update a teacher profile that doesn't belong to you",
    );

    const isMentor = teacher.tchr_is_mentor ?? current.tchr_is_mentor;
    const hourlyRate = teacher.tchr_hourly_rate ?? current.tchr_hourly_rate;

    this.assertMentorRate(isMentor, hourlyRate);

    const data: Partial<Teacher> = { updated_at: new Date() };

    if (teacher.tchr_title !== undefined) data.tchr_title = teacher.tchr_title;
    if (teacher.tchr_biography !== undefined)
      data.tchr_biography = teacher.tchr_biography;
    if (teacher.tchr_is_mentor !== undefined)
      data.tchr_is_mentor = teacher.tchr_is_mentor;
    if (teacher.tchr_hourly_rate !== undefined)
      data.tchr_hourly_rate = teacher.tchr_hourly_rate;
    if (teacher.tchr_availability !== undefined)
      data.tchr_availability = this.normalizeAvailability(
        teacher.tchr_availability,
      );

    return this.teacherRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }

  async delete(id: string, user: { id: string; role: RoleEnum }) {
    const teacher = await this.findById(id);

    this.assertOwner(
      teacher,
      user,
      "You can't delete a teacher profile that doesn't belong to you",
    );

    const courses = await this.courseRepository.countDocuments({
      teacher: teacher._id,
    });

    if (courses > 0) {
      throw new BadRequestException(
        'This teacher profile is linked to courses and cannot be deleted',
      );
    }

    return this.teacherRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}
