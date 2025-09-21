import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../learning/modules/category.module';
import { CoursesModule } from '../learning/modules/courses.module';
import { LessonsModule } from '../learning/modules/lessons.module';
import { SectionsModule } from '../learning/modules/sections.module';
import { TeachersModule } from '../learning/modules/teachers.module';
import { UsersModule } from '../users/users.module';
import { LoadDataController } from './load-data.controller';
import { LoadDataService } from './load-data.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    TeachersModule,
    CoursesModule,
    SectionsModule,
    LessonsModule,
  ],
  controllers: [LoadDataController],
  providers: [LoadDataService],
})
export class LoadDataModule {}
