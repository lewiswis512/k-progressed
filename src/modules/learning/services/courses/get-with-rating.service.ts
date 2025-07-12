import { Injectable } from '@nestjs/common';
import { Course } from '../../schemas/course.schema';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CommentRepository } from '../../../../modules/comments/repository/comment.repository';
import { Comment } from '../../../../modules/comments/schemas/comment.schema';
import { PurchaseRepository } from '../../../../modules/purchases/repository/purchase.repository';

@Injectable()
export class GetCourseWithRatingService {
  public constructor(
    private commentRepository: CommentRepository,
    private purchaseRepository: PurchaseRepository,
  ) {}

  async get(course: Course) {
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
}
