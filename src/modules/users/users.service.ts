import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { IUserUpdateProfile } from '../../interfaces/users/IUserUpdateProfile';
import { hashPassword } from '../../utils/auths/hashPassword';
import { validatePassword } from '../../utils/auths/validatePassword';
import { RoleEnum } from '../../utils/enums/role.enum';
import { slugify } from '../../utils/slugify';
import { escapeRegex } from '../../utils/string/escape-regex';
import { UserResetRepository } from './repository/user-reset.repository';
import { UserRepository } from './repository/user.repository';
import { User } from './schemas/user.schema';
import { UpdateProfile } from './dto/update-profile.dto';
import { PhotoUploaderContext } from '../../utils/uploads/photo-uploader-context';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary-upload-strategy';
import { PATH_USERS_CLOUDINARY } from '../../utils/constants/uploads/path-upload';
import { MongoRepository } from '../../common/repository/mongo.repository';
import { ChangePassword } from '../auth/dto/change-password.dto';
import { ISession, SessionService } from '../auth/services/session.service';
import { CommentRepository } from '../comments/repository/comment.repository';
import { BookingRepository } from '../learning/repositories/booking.repository';
import { CourseRepository } from '../learning/repositories/course.repository';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { CertificateRepository } from '../progress/repositories/certificate.repository';
import { LessonProgressRepository } from '../progress/repositories/lesson-progress.repository';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';

export interface IUsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: User[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private userRepository: UserRepository,
    private userResetRepository: UserResetRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private MongoRepository: MongoRepository,
    private sessionService: SessionService,
    private courseRepository: CourseRepository,
    private teacherRepository: TeacherRepository,
    private commentRepository: CommentRepository,
    private purchaseRepository: PurchaseRepository,
    private bookingRepository: BookingRepository,
    private lessonProgressRepository: LessonProgressRepository,
    private certificateRepository: CertificateRepository,
  ) {}

  async findAll(
    keyword: string | undefined,
    page: number,
    limit: number,
  ): Promise<IUsersPagination> {
    const filter = keyword?.trim()
      ? {
          $or: [
            'usr_username',
            'usr_email',
            'usr_firstname',
            'usr_lastname',
          ].map((field) => ({
            [field]: new RegExp(escapeRegex(keyword.trim()), 'i'),
          })),
        }
      : {};
    const { data, total } = await this.userRepository.paginate(
      filter,
      page,
      limit,
    );

    return { page, limit, total, totalPages: Math.ceil(total / limit), data };
  }

  async updateRole(
    id: string,
    role: RoleEnum,
    currentUserId: string,
  ): Promise<User> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.userRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      { usr_role: role, updated_at: new Date() },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePassword,
  ): Promise<ISession> {
    const user = await this.userRepository.findByIdWithPassword(
      new Types.ObjectId(id),
    );

    if (
      !user ||
      !(await validatePassword(
        changePasswordDto.currentPassword,
        user.usr_password,
      ))
    ) {
      throw new ForbiddenException('Your current password is incorrect');
    }

    const updatedUser = await this.userRepository.findByIdAndUpdate(user._id, {
      usr_password: await hashPassword(changePasswordDto.password),
      usr_password_changed_at: new Date(),
      $inc: { usr_token_version: 1 },
    });

    await this.sessionService.revokeAll(user._id);

    return this.sessionService.create(updatedUser);
  }

  async uniqueSlug(base: string, userId: Types.ObjectId): Promise<string> {
    const root = slugify(base) || 'user';
    let candidate = root;
    let suffix = 2;

    while (
      await this.userRepository.findOneOrNull({
        usr_slug: candidate,
        _id: { $ne: userId },
      })
    ) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfile,
    file: Express.Multer.File,
  ): Promise<IUserUpdateProfile & { accessToken: string }> {
    const user: User = await this.userRepository.findById(
      new Types.ObjectId(id),
    );

    const usernameTaken = await this.userRepository.findOneOrNull({
      usr_username: new RegExp(
        `^${escapeRegex(updateProfileDto.usr_username.trim())}$`,
        'i',
      ),
      _id: { $ne: user._id },
    });

    if (usernameTaken) {
      throw new ConflictException('Username is already taken');
    }

    let photoLink: string | null = user.usr_photo ?? null;

    if (file !== undefined) {
      if (user.usr_photo) {
        await this.cloudinaryUploadStrategy
          .delete(
            this.cloudinaryUploadStrategy.getPublicIdFromUrl(user.usr_photo),
          )
          .catch((): null => null);
      }

      const cloudinaryContext = new PhotoUploaderContext(
        new CloudinaryUploadStrategy(),
      );
      photoLink = await cloudinaryContext.upload(
        file.buffer,
        PATH_USERS_CLOUDINARY,
      );
    }

    const firstname = updateProfileDto.usr_firstname?.trim() ?? '';
    const lastname = updateProfileDto.usr_lastname?.trim() ?? '';
    const slugBase =
      firstname || lastname
        ? `${firstname} ${lastname}`
        : updateProfileDto.usr_username;

    const userUpdated = await this.userRepository.findByIdAndUpdate(user._id, {
      usr_username: updateProfileDto.usr_username.trim(),
      usr_firstname: firstname,
      usr_lastname: lastname,
      usr_slug: await this.uniqueSlug(slugBase, user._id),
      usr_photo: photoLink,
      updated_at: new Date(),
    });

    return {
      _id: userUpdated._id,
      usr_username: userUpdated.usr_username,
      usr_email: userUpdated.usr_email,
      usr_registered_date: userUpdated.usr_registered_date,
      usr_type: userUpdated.usr_type,
      usr_firstname: userUpdated.usr_firstname,
      usr_lastname: userUpdated.usr_lastname,
      usr_slug: userUpdated.usr_slug,
      usr_photo: userUpdated.usr_photo ?? null,
      accessToken: await this.sessionService.createAccessToken(userUpdated),
    };
  }

  async exportData(id: string): Promise<Record<string, unknown>> {
    const userId = new Types.ObjectId(id);
    const user = await this.userRepository.findById(userId, {
      select: '-stripe_customer_id',
    });
    const [purchases, comments, bookings, progress, certificates] =
      await Promise.all([
        this.purchaseRepository.find({ 'user.id': id }),
        this.commentRepository.find(
          { author: userId },
          { select: 'comm_content comm_rating course lesson created_at' },
        ),
        this.bookingRepository.find({ booker: userId }),
        this.lessonProgressRepository.find({ user: userId }),
        this.certificateRepository.find({ user: userId }),
      ]);

    return {
      exportedAt: new Date(),
      profile: user,
      purchases,
      comments,
      bookings,
      progress,
      certificates,
    };
  }

  async deleteAccount(id: string, password: string): Promise<void> {
    const userId = new Types.ObjectId(id);
    const user = await this.userRepository.findByIdWithPassword(userId);

    if (!user || !(await validatePassword(password, user.usr_password))) {
      throw new ForbiddenException('Your password is incorrect');
    }

    if (user.usr_role === RoleEnum.SUPERADMIN) {
      throw new BadRequestException(
        'A super admin account cannot be deleted from the profile page',
      );
    }

    const authoredCourses = await this.courseRepository.countDocuments({
      author: userId,
    });

    if (authoredCourses > 0) {
      throw new BadRequestException(
        'Delete or transfer your courses before deleting your account',
      );
    }

    const upcomingBookings = await this.bookingRepository.countDocuments({
      booker: userId,
      bkng_status: 2,
      bkng_date: { $gte: new Date().toISOString().slice(0, 10) },
    });

    if (upcomingBookings > 0) {
      throw new BadRequestException(
        'Cancel your upcoming mentoring calls before deleting your account',
      );
    }

    if (user.usr_photo) {
      await this.cloudinaryUploadStrategy
        .delete(
          this.cloudinaryUploadStrategy.getPublicIdFromUrl(user.usr_photo),
        )
        .catch((error) =>
          this.logger.error('Failed to delete the profile photo', error?.stack),
        );
    }

    await Promise.all([
      this.commentRepository.deleteMany({ author: userId }),
      this.commentRepository.updateMany(
        {},
        { $pull: { comm_liked_by: userId, comm_disliked_by: userId } },
      ),
      this.teacherRepository.deleteMany({ author: userId }),
      this.bookingRepository.deleteMany({ booker: userId, bkng_status: 1 }),
      this.lessonProgressRepository.deleteMany({ user: userId }),
      this.certificateRepository.deleteMany({ user: userId }),
      this.userResetRepository.deleteMany({ usr_rest_email: user.usr_email }),
      this.sessionService.revokeAll(userId),
    ]);

    await this.userRepository.findByIdAndDelete(userId);
  }

  async isAlreadySaved(collectionName: string, field: string, value: string) {
    return await this.MongoRepository.exists(collectionName, field, value);
  }
}
