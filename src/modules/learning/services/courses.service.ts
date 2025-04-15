import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import slugify from 'slugify';
import { IAddCourse } from '../../../interfaces/courses/IAddCourse';
import { ICourseContents } from '../../../interfaces/courses/ICourseContents';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { ICourseWithAverageRating } from '../../../interfaces/courses/ICourseWithAverageRating';
import { IEditCourse } from '../../../interfaces/courses/IEditCourse';
import { ILessonInSectionWithDuration } from '../../../interfaces/lessons/ILessonInSectionWithDuration';
import { CommentRepository } from '../../../modules/comments/repository/comment.repository';
import { Lesson } from '../../../modules/learning/schemas/lessons/lesson.schema';
import { Section } from '../../../modules/learning/schemas/sections/section.schema';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { User } from '../../../modules/users/schemas/user.schema';
import {
  PATH_COURSES_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../utils/constants/uploads/path-upload';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../utils/times/duration';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary';
import { UploaderContext } from '../../../utils/uploads/uploader-context';
import { Comment } from '../../comments/schemas/comment.schema';
import { CreateCourse } from '../dtos/courses/create-course.dto';
import { EditCourse } from '../dtos/courses/edit-course.dto';
import { CourseRepository } from '../repositories/course.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Course } from '../schemas/course.schema';

@Injectable()
export class CoursesService {
  constructor(
    private courseRepository: CourseRepository,
    private userRepository: UserRepository,
    private commentRepository: CommentRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
  ) {}

  async findAll(): Promise<ICourseWithAverageRating[]> {
    let courses: Course[] = await this.courseRepository.find();
    let courseWithAverageRating: ICourseWithAverageRating[] = [];

    for (const course of courses) {
      const comments: Comment[] = await this.commentRepository.find({
        course: course._id,
      });

      let averageRating: number = 0;
      let totalCommentByCourse: number = comments.length;

      if (totalCommentByCourse !== 0) {
        let totalRatingByCourse: number = comments.reduce(
          (accumulator: number, comment: Comment) =>
            accumulator + Number(comment.comm_rating),
          0,
        );
        averageRating =
          Number(totalRatingByCourse) / Number(totalCommentByCourse);
        averageRating = Number(averageRating.toFixed(1));
      }

      courseWithAverageRating = [
        ...courseWithAverageRating,
        {
          course,
          averageRating,
          totalCommentByCourse,
        },
      ];
    }

    return courseWithAverageRating;
  }

  async findById(id: string): Promise<Course> {
    return this.courseRepository.findById(new Types.ObjectId(id));
  }

  async findBySlug(slug: string): Promise<ICourseWithAverageRating> {
    const course: Course = await this.courseRepository.findOne({
      crs_slug: slug,
    });

    let courseWithAverageRating: ICourseWithAverageRating | {} = {};
    let averageRating: number = 0;

    const comments: Comment[] = await this.commentRepository.find({
      'course._id': course._id,
    });

    let totalCommentByCourse: number = comments.length;

    if (totalCommentByCourse !== 0) {
      let totalRatingByCourse: number = comments.reduce(
        (accumulator: number, comment: Comment) =>
          accumulator + Number(comment.comm_rating),
        0,
      );
      averageRating = totalRatingByCourse / totalCommentByCourse;
      averageRating = Number(averageRating.toFixed(1));
    }

    return {
      ...courseWithAverageRating,
      course,
      averageRating,
      totalCommentByCourse,
    };
  }

  async store(
    authorId: string,
    createCourseDto: CreateCourse,
    file: Express.Multer.File,
  ): Promise<any> {
    const author: User = await this.userRepository.findById(
      new Types.ObjectId(authorId),
    );

    let data: IAddCourse = {
      ...createCourseDto,
      author,
      crs_slug: slugify(createCourseDto.crs_title),
    };

    const cloudinaryContext = new UploaderContext(
      new CloudinaryUploadStrategy(),
    );

    let photoLink: string = await cloudinaryContext.upload(
      file.buffer,
      PATH_COURSES_CLOUDINARY,
    );

    if (photoLink) {
      data = { ...data, crs_photo: photoLink };
    } else {
      data = { ...data, crs_photo: null };
    }

    return this.courseRepository.create(data);
  }

  async update(
    id: string,
    editCourseDto: EditCourse,
    file: Express.Multer.File,
    authorId: string,
  ): Promise<Course> {
    const course: Course = await this.findById(id);
    if (String(course.author) !== authorId) {
      throw new ForbiddenException(
        "You can't update a course who don't belong to you",
      );
    }

    let photoLink: string;

    if (file === undefined) {
      photoLink = course.crs_photo;
    } else {
      if (course.crs_photo) {
        const publicId = this.cloudinaryUploadStrategy.getCloudinaryPublicId(
          course.crs_photo,
        );

        await this.cloudinaryUploadStrategy.delete(publicId);
      }

      const cloudinaryContext = new UploaderContext(
        new CloudinaryUploadStrategy(),
      );
      photoLink = await cloudinaryContext.upload(
        file.buffer,
        PATH_COURSES_CLOUDINARY,
      );
    }

    let data: IEditCourse = {
      ...editCourseDto,
      crs_photo: photoLink,
    };

    return this.courseRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }

  async delete(id: string, authorId: string): Promise<void> {
    const course: Course = await this.findById(id);

    if (String(course.author) !== authorId) {
      throw new ForbiddenException(
        "You can't delete a course who don't belong to you",
      );
    }

    if (course.crs_photo) {
      const publicId = this.cloudinaryUploadStrategy.getCloudinaryPublicId(
        course.crs_photo,
      );

      await this.cloudinaryUploadStrategy.delete(publicId);
    }

    this.courseRepository.findByIdAndDelete(new Types.ObjectId(id));
  }

  async getContent(
    courseId: string,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course = await this.findById(courseId);
    let courseContents: ICourseContents[] = [];

    const sections: Section[] = await this.sectionRepository.find({
      course: {
        _id: new Types.ObjectId(courseId),
        author: new Types.ObjectId(course.author._id),
      },
    });

    const totalSections: number = sections.length;
    let totalLessons: number = 0;
    let totalDuration: number = 0;

    for (const section of sections) {
      const sectionDoc: Section = await this.sectionRepository.findById(
        new Types.ObjectId(section._id),
      );

      let lessonsInSection: Lesson[] = await this.lessonRepository.find({
        'section._id': sectionDoc._id,
      });

      totalLessons += lessonsInSection.length;

      let totalDurationLessonBySection: number = 0;

      let lessonsInSectionWithDuration: ILessonInSectionWithDuration[] =
        await Promise.all(
          [...lessonsInSection].map(async (lesson) => {
            let duration: number = await getVideoDuration(lesson.lssn_video_link);

            totalDurationLessonBySection += Number(duration);

            return {
              _id: lesson._id,
              lssn_title: lesson.lssn_title,
              lssn_video_link: lesson.lssn_video_link,
              lssn_is_free: lesson.lssn_is_free,
              lssn_duration_in_min_sec:
                duration !== 0 && duration >= 60
                  ? getMinuteAndSecond(duration)
                  : getSecond(duration),
            };
          }),
        );

      totalDuration += totalDurationLessonBySection;

      courseContents = [
        ...courseContents,
        {
          section,
          lessons: lessonsInSectionWithDuration,
          countLesson: lessonsInSection.length,
          countDurationInMinute:
            totalDurationLessonBySection !== 0 &&
            totalDurationLessonBySection >= 60
              ? getMinuteAndSecond(totalDurationLessonBySection)
              : getSecond(totalDurationLessonBySection),
        },
      ];
    }

    return {
      courseContents,
      totalSections,
      totalLessons,
      totalDuration:
        totalDuration !== 0 && totalDuration >= 60
          ? getMinuteAndSecond(totalDuration)
          : getSecond(totalDuration),
    };
  }
}
