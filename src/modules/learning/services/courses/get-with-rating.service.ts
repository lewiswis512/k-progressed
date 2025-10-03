import { Injectable } from '@nestjs/common';
import { Course } from '../../schemas/course.schema';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CommentRepository } from '../../../../modules/comments/repository/comment.repository';
import { Comment } from '../../../../modules/comments/schemas/comment.schema';
import { PurchaseRepository } from '../../../../modules/purchases/repository/purchase.repository';

@Injectable()
export class GetCourseWithRatingService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly purchaseRepository: PurchaseRepository,
  ) {}

  async get(courses: Course[]): Promise<ICourseWithAverageRating[]> {
    const courseIds: string[] = courses.map((course) => course._id.toString());
    const comments: Comment[] = await this.commentRepository.find({
      'course._id': { $in: courseIds },
    });

    const commentsByCourse: Record<string, Comment[]> = comments.reduce<
      Record<string, Comment[]>
    >((acc, comment) => {
      const courseId = comment.course._id.toString();

      if (!acc[courseId]) {
        acc[courseId] = [];
      }

      acc[courseId].push(comment);

      return acc;
    }, {});

    const purchases = await this.purchaseRepository.find({
      purch_is_paid: true,
      'purchaseItems.id': { $in: courseIds },
    });

    const courseIdSet = new Set(courseIds);

    const participantsByCourse: Record<string, Set<string>> = purchases.reduce<
      Record<string, Set<string>>
    >((acc, purchase) => {
      const userId = purchase.user.id;

      purchase.purchaseItems
        .filter((item) => courseIdSet.has(item.id))
        .forEach((item) => {
          if (!acc[item.id]) {
            acc[item.id] = new Set();
          }
          acc[item.id].add(userId);
        });

      return acc;
    }, {});

    const ratingsByCourse: Record<string, { average: number; count: number }> =
      {};

    for (const courseId of Object.keys(commentsByCourse)) {
      const courseComments = commentsByCourse[courseId];
      const totalComments = courseComments.length;

      const sumRatings = courseComments.reduce(
        (sum, comment) => sum + Number(comment.comm_rating),
        0,
      );

      ratingsByCourse[courseId] = {
        average:
          totalComments > 0
            ? Number((sumRatings / totalComments).toFixed(1))
            : 0,
        count: totalComments,
      };
    }

    return courses.map((course) => {
      const courseId = course._id.toString();
      const ratings = ratingsByCourse[courseId] ?? { average: 0, count: 0 };
      const countParticipants = participantsByCourse[courseId]?.size ?? 0;

      return {
        course,
        averageRating: ratings.average,
        totalCommentByCourse: ratings.count,
        countParticipants,
      };
    });
  }
}
