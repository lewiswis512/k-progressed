import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { IsUniqueConstraint } from './common/pipes/unique-field/isUniqueConstraint';
import { MongoRepository } from './common/repository/mongo.repository';
import { CommentsModule } from './modules/comments/comments.module';
import { CategoriesModule } from './modules/learning/modules/category.module';
import { CoursesModule } from './modules/learning/modules/courses.module';
import { ProgressModule } from './modules/progress/progress.module';
import { StatisticModule } from './modules/statistic/statistic.module';
import { LessonsModule } from './modules/learning/modules/lessons.module';
import { MentoringModule } from './modules/learning/modules/mentoring.module';
import { SectionsModule } from './modules/learning/modules/sections.module';
import { TeachersModule } from './modules/learning/modules/teachers.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FaqModule } from './modules/faq/faq.module';
import { LoadDataModule } from './modules/load-data/load-data.module';
import { User, UserSchema } from './modules/users/schemas/user.schema';
import { UserRepository } from './modules/users/repository/user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    CoursesModule,
    SectionsModule,
    LessonsModule,
    CategoriesModule,
    CommentsModule,
    PurchasesModule,
    TeachersModule,
    PaymentModule,
    ProgressModule,
    StatisticModule,
    MentoringModule,
    FaqModule,
    LoadDataModule,
  ],
  controllers: [AppController],
  providers: [
    IsUniqueConstraint,
    MongoRepository,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    UserRepository,
  ],
})
export class AppModule {}
