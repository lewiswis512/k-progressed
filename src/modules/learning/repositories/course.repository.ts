import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Course } from '../schemas/course.schema';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { CourseStatusEnum } from '../../../utils/enums/course-status.enum';
import { IAdminCourse } from '../interfaces/IAdminCoursePagination';

interface IFindForAdminParams {
  keyword?: string;
  status?: CourseStatusEnum;
  page: number;
  limit: number;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class CourseRepository extends AbstractRepository<Course> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Course.name) private courseModel: Model<Course>) {
    super(courseModel);
  }

  async findForAdmin({
    keyword,
    status,
    page,
    limit,
  }: IFindForAdminParams): Promise<{ data: IAdminCourse[]; total: number }> {
    const pipeline: PipelineStage[] = [];

    if (status) {
      pipeline.push({ $match: { crs_status: status } });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
                usr_email: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category',
          pipeline: [{ $project: { ctgr_name: 1 } }],
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    );

    if (keyword?.trim()) {
      const regex = new RegExp(escapeRegex(keyword.trim()), 'i');

      pipeline.push({
        $match: {
          $or: [
            { crs_title: regex },
            { 'author.usr_username': regex },
            { 'author.usr_firstname': regex },
            { 'author.usr_lastname': regex },
            { 'category.ctgr_name': regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { created_at: -1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                crs_title: 1,
                crs_slug: 1,
                crs_photo: 1,
                crs_price: 1,
                crs_isPaid: 1,
                crs_status: 1,
                level_id: 1,
                author: 1,
                category: 1,
                created_at: 1,
                updated_at: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await this.courseModel.aggregate(pipeline);

    return {
      data: result.data,
      total: result.total[0]?.count ?? 0,
    };
  }
}
