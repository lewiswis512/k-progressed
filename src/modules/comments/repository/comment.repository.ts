import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Comment } from '../schemas/comment.schema';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

export class CommentRepository extends AbstractRepository<Comment> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Comment.name) private commentModel: Model<Comment>) {
    super(commentModel);
  }

  async paginate(
    filterQuery: FilterQuery<Comment>,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.commentModel
        .find(filterQuery)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'usr_username usr_email usr_photo')
        .populate('course', 'crs_title crs_slug')
        .populate('lesson', 'lssn_title')
        .lean(),
      this.commentModel.countDocuments(filterQuery),
    ]);

    return { page, limit, total, totalPages: Math.ceil(total / limit), data };
  }
}
