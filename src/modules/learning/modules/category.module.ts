import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../schemas/category.schema';
import { CategoryService } from '../services/category.service';
import { CategoriesController } from '../controllers/categories.controller';
import { CategoryRepository } from '../repositories/category.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
  ],
  controllers: [CategoriesController],
  providers: [CategoryService, CategoryRepository],
  exports: [MongooseModule],
})
export class CategoriesModule {}
