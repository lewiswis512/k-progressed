import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import { Teacher, TeacherSchema } from '../schemas/teachers/teacher.schema';
import { TeachersController } from '../controllers/teachers.controller';
import { TeachersService } from '../services/teachers.service';
import { TeacherRepository } from '../repositories/teacher.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
    MongooseModule.forFeature([
      { name: Teacher.name, schema: TeacherSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TeachersController],
  providers: [TeachersService, TeacherRepository, UserRepository],
  exports: [TeacherRepository],
})
export class TeachersModule {}
