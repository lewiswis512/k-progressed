import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../../auth/auth.module';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { LessonsController } from '../controllers/lessons.controller';
import { LessonRepository } from '../repositories/lesson.repository';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { AddLessonService } from '../services/lessons/add.service';
import { DeleteLessonService } from '../services/lessons/delete.service';
import { LessonService } from '../services/lessons/find-one-by-id.service';
import { FreeLessonService } from '../services/lessons/free.service';
import { LessonsService } from '../services/lessons/list.service';
import { UpdateLessonservice } from '../services/lessons/update.service';
import { SectionsModule } from './sections.module';
import { CourseAccessService } from '../../../common/access/course-access.service';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../purchases/schemas/purchase.schema';
import { PurchaseRepository } from '../../purchases/repository/purchase.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Lesson.name, schema: LessonSchema },
      { name: User.name, schema: UserSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
    SectionsModule,
  ],
  providers: [
    LessonRepository,
    CloudinaryUploadStrategy,
    LessonsService,
    LessonService,
    AddLessonService,
    UpdateLessonservice,
    DeleteLessonService,
    FreeLessonService,
    CourseAccessService,
    UserRepository,
    PurchaseRepository,
  ],
  controllers: [LessonsController],
  exports: [LessonRepository],
})
export class LessonsModule {}
