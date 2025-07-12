import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { EditCourse } from '../../dtos/courses/edit-course.dto';
import { Course } from '../../schemas/course.schema';
import { GetCourseByIdService } from './get-by-id.service';
import { IsCourseAuthorService } from './is-author.service';
import { updatePhoto } from '../../../../utils/files/update-photo';
import { PATH_COURSES_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { User } from '../../../../modules/users/schemas/user.schema';
import { UserRepository } from '../../../../modules/users/repository/user.repository';
import { CategoryRepository } from '../../repositories/category.repository';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class UpdateCourseService {
  public constructor(
    private getCourseByIdService: GetCourseByIdService,
    private userRepository: UserRepository,
    private categoryRepository: CategoryRepository,
    private courseRepository: CourseRepository,
  ) {}

  async update(
    id: string,
    authorId: string,
    editCourseDto: EditCourse,
    file: Express.Multer.File,
  ): Promise<Course> {
    const course: Course = await this.getCourseByIdService.byId(id);

    IsCourseAuthorService.check(course.author._id.toString(), authorId);

    let photoLink: string;

    if (file === undefined) {
      photoLink = course.crs_photo;
    } else {
      photoLink = await updatePhoto({
        photoPath: course.crs_photo,
        uploadPath: PATH_COURSES_CLOUDINARY,
        fileInput: file.buffer,
        photoUploadStrategy: new CloudinaryUploadStrategy(),
      });
    }

    const author: User = await this.userRepository.findById(
      new Types.ObjectId(authorId),
    );

    const categoryId: string =
      editCourseDto.category_id || course.category._id.toString();

    const category = await this.categoryRepository.findById(
      new Types.ObjectId(categoryId),
    );

    let data: any = {
      ...editCourseDto,
      crs_photo: photoLink,
      category,
    };

    return this.courseRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }
}
