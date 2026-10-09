import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import { Teacher, TeacherSchema } from '../schemas/teachers/teacher.schema';
import { TeachersController } from '../controllers/teachers.controller';
import { TeachersService } from '../services/teachers.service';
import { TeacherRepository } from '../repositories/teacher.repository';
import { AuthModule } from '../../auth/auth.module';
import { Course, CourseSchema } from '../schemas/course.schema';
import { CourseRepository } from '../repositories/course.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Teacher.name, schema: TeacherSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [TeachersController],
  providers: [
    TeachersService,
    TeacherRepository,
    UserRepository,
    CourseRepository,
  ],
  exports: [TeacherRepository],
})
export class TeachersModule {}
