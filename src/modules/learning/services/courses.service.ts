import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import slugify from 'slugify';
import { IAddCourse } from '../../../interfaces/courses/IAddCourse';
import { ICourseContents } from '../../../interfaces/courses/ICourseContents';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { ICourseWithAverageRating } from '../../../interfaces/courses/ICourseWithAverageRating';
import { ISaveCourse } from '../../../interfaces/courses/ISaveCourse';
import { ILessonInSectionWithDuration } from '../../../interfaces/lessons/ILessonInSectionWithDuration';
import { CommentRepository } from '../../../modules/comments/repository/comment.repository';
import { Lesson } from '../../../modules/learning/schemas/lessons/lesson.schema';
import { Section } from '../../../modules/learning/schemas/sections/section.schema';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { User } from '../../../modules/users/schemas/user.schema';
import { PATH_COURSES_CLOUDINARY } from '../../../utils/constants/uploads/path-upload';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../utils/times/duration';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary';
import { PhotoUploaderContext } from '../../../utils/uploads/photo-uploader-context';
import { Comment } from '../../comments/schemas/comment.schema';
import { CreateCourse } from '../dtos/courses/create-course.dto';
import { EditCourse } from '../dtos/courses/edit-course.dto';
import { CourseRepository } from '../repositories/course.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Course } from '../schemas/course.schema';
import { pagination } from '../../../utils/pagination';
import { ICoursePagination } from '../interfaces/ICoursePagination';
import { PurchaseRepository } from '../../../modules/purchases/repository/purchase.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { TeacherRepository } from '../../../modules/teachers/repositories/teacher.repository';

@Injectable()
export class CoursesService {
  constructor(
    private courseRepository: CourseRepository,
    private categoryRepository: CategoryRepository,
    private teacherRepository: TeacherRepository,
    private userRepository: UserRepository,
    private commentRepository: CommentRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private purchaseRepository: PurchaseRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
  ) {}

  async findAll(
    keyword: string,
    page: number,
    limit: number,
  ): Promise<ICoursePagination> {
    const keywordToSearch = keyword ? new RegExp(keyword, 'i') : null;
    let courses: Course[];

    if (keywordToSearch) {
      courses = await this.courseRepository.aggregate([
        {
          $project: { __v: 0 },
        },
        {
          $lookup: {
            from: 'categories',
            foreignField: '_id',
            localField: 'category',
            pipeline: [{ $project: { _id: 0, ctgr_name: 1 } }],
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $lookup: {
            from: 'teachers',
            foreignField: '_id',
            localField: 'teacher',
            pipeline: [
              { $project: { _id: 0, tchr_title: 1, tchr_biography: 1 } },
            ],
            as: 'teacher',
          },
        },
        {
          $unwind: '$teacher',
        },
        {
          $lookup: {
            from: 'users',
            foreignField: '_id',
            localField: 'author',
            pipeline: [
              {
                $project: {
                  _id: 0,
                  usr_username: 1,
                  usr_firstname: 1,
                  usr_lastname: 1,
                },
              },
            ],
            as: 'author',
          },
        },
        {
          $match: {
            $or: [
              {
                crs_title: { $regex: keywordToSearch },
              },
              {
                'category.ctgr_name': { $regex: keywordToSearch },
              },
              {
                'author.usr_username': { $regex: keywordToSearch },
              },
              {
                'author.usr_firstname': { $regex: keywordToSearch },
              },
              {
                'author.usr_lastname': { $regex: keywordToSearch },
              },
              {
                'teacher.tchr_title': { $regex: keywordToSearch },
              },
            ],
          },
        },
      ]);
    } else {
      courses = await this.courseRepository.aggregate([
        {
          $project: { __v: 0 },
        },
        {
          $lookup: {
            from: 'categories',
            foreignField: '_id',
            localField: 'category',
            pipeline: [{ $project: { _id: 0, ctgr_name: 1 } }],
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $lookup: {
            from: 'teachers',
            foreignField: '_id',
            localField: 'teacher',
            pipeline: [
              { $project: { _id: 0, tchr_title: 1, tchr_biography: 1 } },
            ],
            as: 'teacher',
          },
        },
        {
          $unwind: '$teacher',
        },
        {
          $lookup: {
            from: 'users',
            foreignField: '_id',
            localField: 'author',
            pipeline: [
              {
                $project: {
                  _id: 0,
                  usr_username: 1,
                  usr_firstname: 1,
                  usr_lastname: 1,
                },
              },
            ],
            as: 'author',
          },
        },
      ]);
    }

    let coursesWithAverageRating: ICourseWithAverageRating[] = [];

    for (const course of courses) {
      const courseWithRating: ICourseWithAverageRating =
        await this.getCourseWithRating(course);
      coursesWithAverageRating = [
        ...coursesWithAverageRating,
        courseWithRating,
      ];
    }

    const paginatedData: ICourseWithAverageRating[] = pagination(
      coursesWithAverageRating,
      page,
      limit,
    );

    return {
      page,
      limit,
      total: coursesWithAverageRating.length,
      totalPages: Math.ceil(coursesWithAverageRating.length / limit),
      data: paginatedData,
    };
  }

  async findById(id: string): Promise<Course> {
    return this.courseRepository.findById(new Types.ObjectId(id));
  }

  async findByIdWithRating(id: string): Promise<ICourseWithAverageRating> {
    const course: Course = await this.courseRepository.findById(
      new Types.ObjectId(id),
    );

    return this.getCourseWithRating(course);
  }

  async findBySlug(slug: string): Promise<ICourseWithAverageRating> {
    const course: Course = await this.courseRepository.findOne({
      crs_slug: slug,
    });

    return this.getCourseWithRating(course);
  }

  async getCourseWithRating(course: Course) {
    let courseWithAverageRating: ICourseWithAverageRating | {} = {};
    let averageRating: number = 0;
    const courseId = course._id;

    const comments: Comment[] = await this.commentRepository.find({
      'course._id': courseId,
    });

    const getCountParticipants = await this.purchaseRepository.aggregate([
      { $match: { purch_is_paid: true } },
      { $unwind: '$purchaseItems' },
      { $match: { 'purchaseItems.id': courseId.toString() } },
      {
        $group: {
          _id: '$user.id',
        },
      },
      {
        $count: 'countParticipants',
      },
    ]);

    const countParticipants =
      getCountParticipants && getCountParticipants[0]
        ? getCountParticipants[0].countParticipants
        : 0;

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
      countParticipants,
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

    const category = await this.categoryRepository.findById(
      new Types.ObjectId(createCourseDto.category_id),
    );

    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(createCourseDto.teacher_id),
    );

    let data: IAddCourse = {
      ...createCourseDto,
      author,
      crs_slug: slugify(createCourseDto.crs_title),
      category,
      teacher,
    };

    const cloudinaryContext = new PhotoUploaderContext(
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

      const cloudinaryContext = new PhotoUploaderContext(
        new CloudinaryUploadStrategy(),
      );
      photoLink = await cloudinaryContext.upload(
        file.buffer,
        PATH_COURSES_CLOUDINARY,
      );
    }

    const category = await this.categoryRepository.findById(
      new Types.ObjectId(editCourseDto.category_id),
    );

    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(editCourseDto.teacher_id),
    );

    let data: ISaveCourse = {
      ...editCourseDto,
      crs_photo: photoLink,
      category,
      teacher,
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

    const sections: Section[] = await this.sectionRepository.find({
      'course._id': new Types.ObjectId(id),
    });

    for (const section of sections) {
      const lessons: Lesson[] = await this.lessonRepository.find({
        'section._id': new Types.ObjectId(section._id),
      });

      if (lessons.length > 0) {
        this.lessonRepository.deleteMany(lessons);
      }
    }

    this.sectionRepository.deleteMany({ 'course._id': id });

    this.courseRepository.findByIdAndDelete(new Types.ObjectId(id));
  }

  private async getCourseSections(course: Course): Promise<Section[]> {
    return await this.sectionRepository.find({
      course: {
        _id: course._id,
        author: course.author._id,
      },
    });
  }

  private async getLessonsSection(sectionDoc: Section) {
    return await this.lessonRepository.find({
      'section._id': sectionDoc._id,
    });
  }

  private async getLessonsInSectionWithDuration(
    totalDurationLessonBySection: number,
    lessonsInSection: Lesson[],
    isFree: boolean,
  ): Promise<ILessonInSectionWithDuration[]> {
    return await Promise.all(
      [...lessonsInSection].map(async (lesson) => {
        let duration = 0;

        if (lesson.lssn_video_link) {
          totalDurationLessonBySection = await getVideoDuration(
            lesson.lssn_video_link,
          );
        }

        totalDurationLessonBySection += duration;

        return {
          _id: lesson._id,
          lssn_title: lesson.lssn_title,
          lssn_is_free: lesson.lssn_is_free,
          lssn_video_link: isFree === false ? '' : lesson.lssn_video_link,
          lssn_duration_in_min_sec:
            totalDurationLessonBySection !== 0 &&
            totalDurationLessonBySection >= 60
              ? getMinuteAndSecond(totalDurationLessonBySection)
              : getSecond(totalDurationLessonBySection),
        };
      }),
    );
  }

  private async getCourseContentInfo(
    isFree: boolean,
    totalLessons: number,
    totalDuration: number,
    courseContents: ICourseContents[],
    section: Section,
  ): Promise<{
    totalLessons: number;
    totalDuration: number;
    courseContents: ICourseContents[];
  }> {
    let lessonsInSection: Lesson[] = await this.getLessonsSection(section);
    totalLessons += lessonsInSection.length;

    const lessonsInSectionWithDuration =
      await this.getLessonsInSectionWithDuration(0, lessonsInSection, isFree);

    const totalDurationLessonBySection = lessonsInSectionWithDuration.reduce(
      (acc, lesson) => {
        const timeStr = lesson.lssn_duration_in_min_sec.toString();
        const parts = timeStr.split(':').map(Number);
        const seconds =
          parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
        return acc + seconds;
      },
      0,
    );

    totalDuration += totalDurationLessonBySection;

    courseContents.push({
      section,
      lessons: lessonsInSectionWithDuration,
      countLesson: lessonsInSection.length,
      countDurationInMinute:
        totalDurationLessonBySection >= 60
          ? getMinuteAndSecond(totalDurationLessonBySection)
          : getSecond(totalDurationLessonBySection),
    });

    return {
      totalLessons,
      totalDuration,
      courseContents,
    };
  }

  async getContent(
    courseId: string,
    isFree: boolean,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course: Course = await this.findById(courseId);
    let courseContents: ICourseContents[] = [];
    const sections: Section[] = await this.getCourseSections(course);

    const totalSections: number = sections.length;
    let totalLessons: number = 0;
    let totalDuration: number = 0;

    for (const section of sections) {
      const sectionDoc: Section = await this.sectionRepository.findById(
        new Types.ObjectId(section._id),
      );

      const courseContentInfo = await this.getCourseContentInfo(
        isFree,
        totalLessons,
        totalDuration,
        courseContents,
        sectionDoc,
      );

      totalLessons = courseContentInfo.totalLessons;
      totalDuration = courseContentInfo.totalDuration;
      courseContents = courseContentInfo.courseContents;
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
