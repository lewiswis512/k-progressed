import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateCourse } from '../../dtos/courses/create-course.dto';
import { Course } from '../../schemas/course.schema';
import { User } from '../../../../modules/users/schemas/user.schema';
import { slugify } from '../../../../utils/slugify';
import { uploadPhoto } from '../../../../utils/files/upload-photo';
import { PATH_COURSES_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { UserRepository } from '../../../../modules/users/repository/user.repository';
import { CategoryRepository } from '../../repositories/category.repository';
import { TeacherRepository } from '../../repositories/teacher.repository';
import { CourseRepository } from '../../repositories/course.repository';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';

@Injectable()
export class AddCourseService {
  public constructor(
    private userRepository: UserRepository,
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
  ) {}

  async store(
    authorId: string,
    createCourseDto: CreateCourse,
    file: Express.Multer.File,
  ): Promise<Course> {
    const author: User = await this.userRepository.findById(
      new Types.ObjectId(authorId),
    );

    const category = await this.categoryRepository.findById(
      new Types.ObjectId(createCourseDto.category_id),
    );

    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(createCourseDto.teacher_id),
    );

    let courseData: Partial<Course> = {
      ...createCourseDto,
      crs_slug: slugify(createCourseDto.crs_title),
      crs_status: CourseStatusEnum.PENDING,
      author,
      category,
      teacher,
    };

    let photoLink: string = await uploadPhoto({
      fileInput: file.buffer,
      uploadPath: PATH_COURSES_CLOUDINARY,
      photoUploadStrategy: new CloudinaryUploadStrategy(),
    });

    if (photoLink) {
      courseData = { ...courseData, crs_photo: photoLink };
    } else {
      courseData = { ...courseData, crs_photo: null };
    }

    return this.courseRepository.create(courseData);
  }
}
