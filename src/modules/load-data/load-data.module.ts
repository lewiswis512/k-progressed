import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../learning/modules/category.module';
import { CoursesModule } from '../learning/modules/courses.module';
import { LessonsModule } from '../learning/modules/lessons.module';
import { SectionsModule } from '../learning/modules/sections.module';
import { TeachersModule } from '../learning/modules/teachers.module';
import { UsersModule } from '../users/users.module';
import { FaqModule } from '../faq/faq.module';
import { LoadDataController } from './load-data.controller';
import { LoadDataService } from './load-data.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CategoriesModule,
    TeachersModule,
    CoursesModule,
    SectionsModule,
    LessonsModule,
    FaqModule,
  ],
  controllers: [LoadDataController],
  providers: [LoadDataService],
})
export class LoadDataModule {}
