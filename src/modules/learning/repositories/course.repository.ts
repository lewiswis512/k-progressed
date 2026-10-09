import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Course } from '../schemas/course.schema';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CourseStatusEnum } from '../../../utils/enums/course-status.enum';
import { IAdminCourse } from '../interfaces/IAdminCoursePagination';
import { escapeRegex } from '../../../utils/string/escape-regex';
import { slugify } from '../../../utils/slugify';
import { ICourseStatusCount } from '../../../interfaces/statistic/IStatistic';

interface IFindPublicParams {
  keyword?: string;
  category?: string;
  level?: number;
  price?: 'free' | 'paid';
  sort?: string;
  page: number;
  limit: number;
}

const PUBLIC_SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { created_at: -1, _id: -1 },
  price_asc: { crs_price: 1, _id: -1 },
  price_desc: { crs_price: -1, _id: -1 },
  title: { crs_title: 1, _id: -1 },
};

interface IFindForAdminParams {
  keyword?: string;
  status?: CourseStatusEnum;
  page: number;
  limit: number;
}

export class CourseRepository extends AbstractRepository<Course> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Course.name) private courseModel: Model<Course>) {
    super(courseModel);
  }

  async findPublic({
    keyword,
    category,
    level,
    price,
    sort,
    page,
    limit,
  }: IFindPublicParams): Promise<{ data: Course[]; total: number }> {
    const match: Record<string, unknown> = {
      crs_status: CourseStatusEnum.VALIDATED,
    };

    if (category) {
      match.category = new Types.ObjectId(category);
    }

    if (level) {
      match.level_id = level;
    }

    if (price === 'free') {
      match.crs_price = 0;
    } else if (price === 'paid') {
      match.crs_price = { $gt: 0 };
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
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
                usr_slug: 1,
                usr_photo: 1,
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
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacher',
          pipeline: [{ $project: { tchr_title: 1, tchr_biography: 1 } }],
        },
      },
      { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    ];

    if (keyword?.trim()) {
      const regex = new RegExp(escapeRegex(keyword.trim()), 'i');

      pipeline.push({
        $match: {
          $or: [
            { crs_title: regex },
            { crs_description: regex },
            { 'author.usr_username': regex },
            { 'author.usr_firstname': regex },
            { 'author.usr_lastname': regex },
            { 'teacher.tchr_title': regex },
            { 'category.ctgr_name': regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: PUBLIC_SORTS[sort ?? 'newest'] ?? PUBLIC_SORTS.newest },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
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

  async slugExists(slug: string, excludeId?: Types.ObjectId): Promise<boolean> {
    const filter: Record<string, unknown> = { crs_slug: slug };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return (await this.courseModel.exists(filter)) !== null;
  }

  async uniqueSlug(title: string, excludeId?: Types.ObjectId): Promise<string> {
    const root = slugify(title) || 'course';
    let candidate = root;
    let suffix = 2;

    while (await this.slugExists(candidate, excludeId)) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }

    return candidate;
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

  async countByStatus(): Promise<ICourseStatusCount[]> {
    return this.courseModel.aggregate<ICourseStatusCount>([
      { $group: { _id: '$crs_status', count: { $sum: 1 } } },
    ]);
  }

  async findSummaries(ids: Types.ObjectId[]): Promise<Course[]> {
    return this.courseModel
      .find({ _id: { $in: ids } })
      .select('crs_title crs_slug crs_photo crs_description level_id author')
      .lean<Course[]>();
  }
}
