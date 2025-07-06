import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  PATH_LESSON_PHOTOS_CLOUDINARY,
  PATH_LESSONS_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../utils/constants/uploads/path-upload';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../utils/times/duration';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { VideoUploaderContext } from '../../../utils/uploads/video-uploader-context';
import { AddLesson } from '../dtos/lessons/add-lesson.dto';
import { EditLesson } from '../dtos/lessons/edit-lesson.dto';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Lesson } from '../schemas/lesson.schema';
import { Section } from '../schemas/section.schema';
import { videoUploaderProvider } from '../../../utils/uploads/video-uploader-provider';
import { videoLink } from '../../../utils/uploads/video-link';

export interface IFreeLesson {
  _id: Types.ObjectId;
  lssn_title: string;
  lssn_video_link?: string;
  lssn_video_photo?: string;
  lssn_is_free: boolean;
  section: Section;
  duration: string | number | null;
}

@Injectable()
export class LessonsService {
  constructor(
    private lessonRepository: LessonRepository,
    private sectionRepository: SectionRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
  ) {}

  async findAll(): Promise<Lesson[]> {
    return this.lessonRepository.find();
  }

  async findById(id: string): Promise<Lesson> {
    const [lesson] = await this.lessonRepository.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'sections',
          localField: 'section',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'course',
              },
            },
            {
              $unwind: '$course',
            },
            {
              $project: {
                _id: 0,
                sect_title: 1,
                course: {
                  author: 1,
                },
              },
            },
          ],
          as: 'section',
        },
      },
      { $unwind: '$section' },
    ]);

    return lesson;
  }

  async getFree(courseId: string): Promise<IFreeLesson[]> {
    const sections: Section[] = await this.sectionRepository.find({
      'course._id': courseId,
    });
    let freeLessons: IFreeLesson[] = [];

    for (const section of sections) {
      const lessons = await this.lessonRepository.find({
        'section._id': section._id,
        lssn_is_free: true,
      });

      for (const lesson of lessons) {
        const durationInSeconds = await getVideoDuration(
          lesson.lssn_video_link,
        );

        const formattedDuration =
          durationInSeconds != 0 && durationInSeconds >= 60
            ? getMinuteAndSecond(durationInSeconds)
            : getSecond(durationInSeconds);

        freeLessons.push({
          _id: lesson._id,
          lssn_title: lesson.lssn_title,
          lssn_video_link: lesson.lssn_video_link,
          lssn_video_photo: lesson.lssn_video_photo,
          lssn_is_free: lesson.lssn_is_free,
          section: lesson.section,
          duration: formattedDuration,
        });
      }
    }

    return freeLessons;
  }

  async store(
    addLesson: AddLesson,
    file: Express.Multer.File,
  ): Promise<Lesson> {
    let { secure_url: videoPath } = await videoUploaderProvider.uploadVideo(
      file,
      PATH_UPLOAD_LESSON_VIDEOS,
    );
    const lessonPhotoFilename: string =
      await this.cloudinaryUploadStrategy.takeScreenshot(
        videoLink(videoPath),
        PATH_LESSON_PHOTOS_CLOUDINARY,
      );

    const section = await this.sectionRepository.findById(
      new Types.ObjectId(addLesson.section_id),
    );

    let data = {
      ...addLesson,
      section,
      lssn_video_link: videoPath,
      lssn_video_photo: lessonPhotoFilename,
    };

    return await this.lessonRepository.create(data);
  }

  async update(
    id: string,
    editLesson: EditLesson,
    file: Express.Multer.File,
    authorId: string,
  ): Promise<Lesson> {
    const lesson: Lesson = await this.findById(id);

    if (String(lesson.section.course.author._id) !== authorId) {
      throw new ForbiddenException(
        "You can't update a lesson who don't belong to you",
      );
    }

    let lessonPhotoFilename: string;
    let videoLink: string;

    if (file === undefined) {
      lessonPhotoFilename = lesson.lssn_video_photo;
      videoLink = lesson.lssn_video_link;
    } else {
      if (lesson.lssn_video_link) {
        const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
          lesson.lssn_video_link,
        );

        await this.cloudinaryUploadStrategy.delete(publicId);
      }

      if (lesson.lssn_video_photo) {
        const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
          lesson.lssn_video_photo,
        );

        await this.cloudinaryUploadStrategy.delete(publicId);
      }

      const videoCloudinaryContext = new VideoUploaderContext(
        new CloudinaryUploadStrategy(),
      );

      let { secure_url: videoLink } = await videoCloudinaryContext.uploadVideo(
        file.buffer,
        PATH_LESSONS_CLOUDINARY,
      );

      lessonPhotoFilename = await this.cloudinaryUploadStrategy.takeScreenshot(
        videoLink,
        PATH_LESSON_PHOTOS_CLOUDINARY,
      );
    }

    let data = {
      ...editLesson,
      lssn_video_photo: lessonPhotoFilename,
      lssn_video_link: videoLink,
    };

    return await this.lessonRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }
}
