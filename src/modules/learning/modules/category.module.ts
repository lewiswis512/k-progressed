import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from '../controllers/categories.controller';
import { CategoryRepository } from '../repositories/category.repository';
import { Category, CategorySchema } from '../schemas/category.schema';
import { CategoryService } from '../services/category.service';
import { AuthModule } from '../../auth/auth.module';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import { Course, CourseSchema } from '../schemas/course.schema';
import { CourseRepository } from '../repositories/course.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [
    CategoryService,
    CategoryRepository,
    UserRepository,
    CourseRepository,
  ],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
