import { Injectable } from '@nestjs/common';
import { Course } from '../../schemas/course.schema';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CommentRepository } from '../../../comments/repository/comment.repository';
import { Comment } from '../../../comments/schemas/comment.schema';
import { PurchaseRepository } from '../../../purchases/repository/purchase.repository';

@Injectable()
export class GetCourseWithRatingService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly purchaseRepository: PurchaseRepository,
  ) {}

  async get(course: Course): Promise<ICourseWithAverageRating> {
    const courseId = course._id.toString();

    const comments: Comment[] = await this.commentRepository.find({
      course: course,
    });

    const totalComments = comments.length;
    const sumRatings = comments.reduce(
      (sum, comment) => sum + Number(comment.comm_rating),
      0,
    );
    const averageRating =
      totalComments > 0 ? Number((sumRatings / totalComments).toFixed(1)) : 0;

    const purchases = await this.purchaseRepository.find({
      purch_is_paid: true,
      'purchaseItems.id': courseId,
    });

    const participants = new Set<string>();
    purchases.forEach((purchase) => {
      const userId = purchase.user.id;
      const hasCourse = purchase.purchaseItems.some(
        (item) => item.id === courseId,
      );
      if (hasCourse) {
        participants.add(userId);
      }
    });

    return {
      course,
      averageRating,
      totalCommentByCourse: totalComments,
      countParticipants: participants.size,
    };
  }
}
