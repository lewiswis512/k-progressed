import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IsUniqueConstraint } from './common/pipes/unique-field/isUniqueConstraint';
import { MongoRepository } from './common/repository/mongo.repository';
import { CommentsModule } from './modules/comments/comments.module';
import { CategoriesModule } from './modules/learning/modules/category.module';
import { CoursesModule } from './modules/learning/modules/courses.module';
import { LearningModule } from './modules/learning/modules/learning.module';
import { LessonsModule } from './modules/learning/modules/lessons.module';
import { MentoringModule } from './modules/learning/modules/mentoring.module';
import { SectionsModule } from './modules/learning/modules/sections.module';
import { TeachersModule } from './modules/learning/modules/teachers.module';
import { LoadDataModule } from './modules/load-data/load-data.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FaqModule } from './modules/faq/faq.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    CoursesModule,
    SectionsModule,
    LessonsModule,
    CategoriesModule,
    CommentsModule,
    PurchasesModule,
    TeachersModule,
    PaymentModule,
    LearningModule,
    LoadDataModule,
    MentoringModule,
    FaqModule,
  ],
  controllers: [AppController],
  providers: [AppService, IsUniqueConstraint, MongoRepository],
})
export class AppModule {}
