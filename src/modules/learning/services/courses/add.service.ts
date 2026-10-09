import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateCourse } from '../../dtos/courses/create-course.dto';
import { Course } from '../../schemas/course.schema';
import { uploadPhoto } from '../../../../utils/files/upload-photo';
import { PATH_COURSES_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { CategoryRepository } from '../../repositories/category.repository';
import { TeacherRepository } from '../../repositories/teacher.repository';
import { CourseRepository } from '../../repositories/course.repository';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';

@Injectable()
export class AddCourseService {
  public constructor(
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
  ) {}

  async store(
    authorId: string,
    createCourseDto: CreateCourse,
    file: Express.Multer.File,
  ): Promise<Course> {
    const authorObjectId = new Types.ObjectId(authorId);
    const teacher = await this.teacherRepository.findOneOrNull({
      author: authorObjectId,
    });

    if (!teacher) {
      throw new BadRequestException(
        'Create your teacher profile before publishing a course',
      );
    }

    const category = await this.categoryRepository.findById(
      new Types.ObjectId(createCourseDto.category_id),
    );

    const photoLink: string = await uploadPhoto({
      fileInput: file.buffer,
      uploadPath: PATH_COURSES_CLOUDINARY,
      photoUploadStrategy: new CloudinaryUploadStrategy(),
    });

    return this.courseRepository.create({
      crs_title: createCourseDto.crs_title.trim(),
      crs_description: createCourseDto.crs_description,
      crs_price: createCourseDto.crs_price,
      level_id: createCourseDto.level_id,
      crs_slug: await this.courseRepository.uniqueSlug(
        createCourseDto.crs_title,
      ),
      crs_status: CourseStatusEnum.PENDING,
      crs_photo: photoLink ?? null,
      author: teacher.author,
      category,
      teacher,
    });
  }
}
