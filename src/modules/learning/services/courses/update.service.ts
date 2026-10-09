import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { EditCourse } from '../../dtos/courses/edit-course.dto';
import { Course } from '../../schemas/course.schema';
import { GetCourseByIdService } from './get-by-id.service';
import { updatePhoto } from '../../../../utils/files/update-photo';
import { PATH_COURSES_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { CategoryRepository } from '../../repositories/category.repository';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class UpdateCourseService {
  public constructor(
    private getCourseByIdService: GetCourseByIdService,
    private categoryRepository: CategoryRepository,
    private courseRepository: CourseRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async update(
    id: string,
    user: IAccessUser,
    editCourseDto: EditCourse,
    file: Express.Multer.File,
  ): Promise<Course> {
    const course: Course = await this.getCourseByIdService.byId(id);

    this.courseAccessService.assertCanManage(user, course);

    const data: Partial<Course> = { updated_at: new Date() };

    if (editCourseDto.crs_title !== undefined) {
      data.crs_title = editCourseDto.crs_title.trim();

      if (data.crs_title !== course.crs_title) {
        data.crs_slug = await this.courseRepository.uniqueSlug(
          data.crs_title,
          course._id,
        );
      }
    }

    if (editCourseDto.crs_description !== undefined) {
      data.crs_description = editCourseDto.crs_description;
    }

    if (editCourseDto.crs_price !== undefined) {
      data.crs_price = editCourseDto.crs_price;
    }

    if (editCourseDto.level_id !== undefined) {
      data.level_id = editCourseDto.level_id;
    }

    if (editCourseDto.category_id !== undefined) {
      const category = await this.categoryRepository.findById(
        new Types.ObjectId(editCourseDto.category_id),
      );
      data.category = category;
    }

    if (file !== undefined) {
      data.crs_photo = await updatePhoto({
        photoPath: course.crs_photo,
        uploadPath: PATH_COURSES_CLOUDINARY,
        fileInput: file.buffer,
        photoUploadStrategy: new CloudinaryUploadStrategy(),
      });
    }

    if (course.crs_status === CourseStatusEnum.REJECTED) {
      data.crs_status = CourseStatusEnum.PENDING;
    }

    return this.courseRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }
}
