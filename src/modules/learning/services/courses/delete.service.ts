import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { RoleEnum } from '../../../../utils/enums/role.enum';
import { CommentRepository } from '../../../comments/repository/comment.repository';
import { PurchaseRepository } from '../../../purchases/repository/purchase.repository';
import { Course } from '../../schemas/course.schema';
import { GetCourseByIdService } from './get-by-id.service';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { CourseRepository } from '../../repositories/course.repository';
import { SectionRepository } from '../../repositories/section.repository';
import { SectionsService } from '../sections.service';

@Injectable()
export class DeleteCourseService {
  private readonly logger = new Logger(DeleteCourseService.name);

  public constructor(
    private getCourseByIdService: GetCourseByIdService,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private courseRepository: CourseRepository,
    private sectionRepository: SectionRepository,
    private sectionsService: SectionsService,
    private courseAccessService: CourseAccessService,
    private purchaseRepository: PurchaseRepository,
    private commentRepository: CommentRepository,
  ) {}

  async delete(id: string, user: IAccessUser): Promise<void> {
    const course: Course = await this.getCourseByIdService.byId(id);

    this.courseAccessService.assertCanManage(user, course);

    const purchased = await this.purchaseRepository.countDocuments({
      purch_is_paid: true,
      'purchaseItems.id': String(course._id),
    });

    if (purchased > 0 && user.role !== RoleEnum.SUPERADMIN) {
      throw new BadRequestException(
        'This course has already been purchased by students and cannot be deleted. Contact the support team.',
      );
    }

    if (course.crs_photo) {
      await this.cloudinaryUploadStrategy
        .delete(
          this.cloudinaryUploadStrategy.getPublicIdFromUrl(course.crs_photo),
        )
        .catch((error) =>
          this.logger.error('Failed to delete the course photo', error?.stack),
        );
    }

    const sections = await this.sectionRepository.find({ course: course._id });

    await this.sectionsService.deleteWithLessons(
      sections.map((section) => section._id),
    );

    await this.commentRepository.deleteMany({
      course: new Types.ObjectId(String(course._id)),
    });

    await this.courseRepository.findByIdAndDelete(course._id);
  }
}
