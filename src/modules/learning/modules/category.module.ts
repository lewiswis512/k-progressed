import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from '../controllers/categories.controller';
import { CategoryRepository } from '../repositories/category.repository';
import { Category, CategorySchema } from '../schemas/category.schema';
import { CategoryService } from '../services/category.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
