import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../common/access/course-access.service';
import { RoleEnum } from '../../utils/enums/role.enum';
import { escapeRegex } from '../../utils/string/escape-regex';
import { Types } from 'mongoose';
import { ICommentResponse } from '../../interfaces/comments/ICommentResponse';
import { IAddCommentDto } from '../../interfaces/comments/IAddCommentDto';
import { ICommentBySource } from '../../interfaces/comments/ICommentBySource';
import {
  IReactionCounts,
  IReactionTypeAndReacter,
} from '../../interfaces/comments/IReactionTypeAndReacter';
import { CommentEnum } from '../../utils/enums/comment.enum';
import { CourseRepository } from '../learning/repositories/course.repository';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { Course } from '../learning/schemas/course.schema';
import { Lesson } from '../learning/schemas/lesson.schema';
import { User } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';
import { EditCommentCourse } from './dto/edit-comment-course.dto';
import { EditCommentLesson } from './dto/edit-comment-lesson.dto';
import { CommentRepository } from './repository/comment.repository';
import { Comment } from './schemas/comment.schema';
import { ReactionComment } from './types/TReactionComment';

@Injectable()
export class CommentsService {
  constructor(
    private commentRepository: CommentRepository,
    private userRepository: UserRepository,
    private courseRepository: CourseRepository,
    private lessonRepository: LessonRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async findById(id: string): Promise<Comment> {
    return await this.commentRepository.findById(new Types.ObjectId(id));
  }

  async findByCourse(courseId: string): Promise<ICommentBySource> {
    return await this.findByCommentSource(String(CommentEnum.COURSE), courseId);
  }

  async findByLesson(lessonId: string): Promise<ICommentBySource> {
    return await this.findByCommentSource(String(CommentEnum.LESSON), lessonId);
  }

  private getCriteriaBySource(
    source: string,
    id: string,
    criteria: FilterQuery<Comment>,
  ): FilterQuery<Comment> {
    if (Number(source) === Number(CommentEnum.COURSE)) {
      criteria.course = id;
    } else if (Number(source) === Number(CommentEnum.LESSON)) {
      criteria.lesson = id;
    }

    return criteria;
  }

  async findByCommentSource(source: string, id: string) {
    const criteria = this.getCriteriaBySource(source, id, {
      parent_comment: null,
    });

    const parentComments: Comment[] =
      await this.commentRepository.find(criteria);

    const comments: ICommentResponse[] = await Promise.all(
      parentComments.map((comment) => this.mapperComment(comment)),
    );

    const criteriaCount = this.getCriteriaBySource(source, id, {});
    const totalComments =
      await this.commentRepository.countDocuments(criteriaCount);

    return {
      comments,
      totalComments,
    };
  }

  async store(
    user: IAccessUser,
    commentDto: IAddCommentDto,
    source: CommentEnum,
  ): Promise<ICommentResponse> {
    const parentComment: Comment | null = commentDto.comment_id
      ? await this.findById(commentDto.comment_id)
      : null;

    if (parentComment && parentComment.parent_comment) {
      throw new BadRequestException(
        'You can only reply to a top level comment',
      );
    }

    let course: Course = null;
    let lesson: Lesson = null;

    if (source === CommentEnum.COURSE) {
      course = await this.courseRepository.findById(
        new Types.ObjectId(commentDto.course_id),
      );

      if (
        parentComment &&
        String(parentComment.course) !== String(course._id)
      ) {
        throw new BadRequestException(
          'The parent comment belongs to another course',
        );
      }

      await this.assertCanReviewCourse(
        user,
        course,
        !!parentComment,
        commentDto,
      );
    } else {
      lesson = await this.lessonRepository.findById(
        new Types.ObjectId(commentDto.lesson_id),
        {
          populate: {
            path: 'section',
            select: 'course',
            populate: { path: 'course', select: '_id author' },
          },
        },
      );

      if (
        parentComment &&
        String(parentComment.lesson) !== String(lesson._id)
      ) {
        throw new BadRequestException(
          'The parent comment belongs to another lesson',
        );
      }

      await this.courseAccessService.assertAccess(user, lesson.section.course);
    }

    const comment: Comment = await this.commentRepository.create({
      comm_content: commentDto.comm_content.trim(),
      comm_rating:
        source === CommentEnum.COURSE && !parentComment
          ? commentDto.comm_rating
          : null,
      author: await this.userRepository.findPublicById(
        new Types.ObjectId(user.id),
      ),
      comm_source: source,
      course,
      lesson,
      comm_count_like: 0,
      comm_liked_by: [],
      comm_count_dislike: 0,
      comm_disliked_by: [],
      replies: [],
      parent_comment: parentComment,
    });

    if (parentComment) {
      await this.commentRepository.findByIdAndUpdate(parentComment._id, {
        $push: { replies: comment._id },
      });
    }

    return this.mapperComment(
      await this.commentRepository.findById(comment._id),
    );
  }

  private async assertCanReviewCourse(
    user: IAccessUser,
    course: Course,
    isReply: boolean,
    commentDto: IAddCommentDto,
  ): Promise<void> {
    const isManager = this.courseAccessService.canManage(user, course);

    if (isReply) {
      if (
        !isManager &&
        !(await this.courseAccessService.hasPurchased(
          user.id,
          String(course._id),
        ))
      ) {
        throw new ForbiddenException(
          'Only students and the teacher can reply to reviews',
        );
      }

      return;
    }

    if (String(course.author?._id ?? course.author) === user.id) {
      throw new ForbiddenException("You can't review your own course");
    }

    if (
      !(await this.courseAccessService.hasPurchased(
        user.id,
        String(course._id),
      ))
    ) {
      throw new ForbiddenException(
        'Only students who purchased this course can review it',
      );
    }

    if (!commentDto.comm_rating) {
      throw new BadRequestException([
        { field: 'comm_rating', error: 'Rating is required' },
      ]);
    }

    const existingReview = await this.commentRepository.findOneOrNull({
      course: course._id,
      author: new Types.ObjectId(user.id),
      parent_comment: null,
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this course');
    }
  }

  private async mapperComment(comment: Comment): Promise<ICommentResponse> {
    const author: User =
      comment.author instanceof Types.ObjectId
        ? await this.userRepository.findById(comment.author, {
            select:
              'author _id usr_photo usr_username usr_firstname usr_lastname',
          })
        : comment.author;
    let lesson: Lesson = null;
    let course: Course = null;

    if (comment.lesson) {
      lesson = await this.lessonRepository.findById(comment.lesson._id, {
        select: '_id lssn_title',
      });
    }

    if (comment.course) {
      course = await this.courseRepository.findById(comment.course._id, {
        select: '_id crs_title',
      });
    }

    const replies: Comment[] = await Promise.all(
      comment.replies.map(async (replyId) => {
        const reply = await this.commentRepository.findById(
          new Types.ObjectId(String(replyId)),
        );

        const author = await this.userRepository.findById(
          new Types.ObjectId(String(reply.author)),
          {
            select:
              'author _id usr_photo usr_username usr_firstname usr_lastname',
          },
        );

        reply.author = author;

        return reply;
      }),
    );

    return {
      _id: comment._id,
      comm_rating: comment.comm_rating,
      comm_content: comment.comm_content,
      comm_source: comment.comm_source,
      author,
      course,
      lesson,
      parent_comment: comment.parent_comment,
      comm_count_like: comment.comm_count_like,
      comm_liked_by: comment.comm_liked_by,
      comm_count_dislike: comment.comm_count_dislike,
      comm_disliked_by: comment.comm_disliked_by,
      replies: replies as ICommentResponse[],
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };
  }

  async update(
    id: string,
    editCommentDto: EditCommentCourse | EditCommentLesson,
    userId: string,
  ): Promise<Comment> {
    const comment = await this.findById(id);

    if (String(comment.author?._id ?? comment.author) !== userId) {
      throw new ForbiddenException(
        "You can't update a comment that doesn't belong to you",
      );
    }

    const data: Partial<Comment> = {
      comm_content: editCommentDto.comm_content.trim(),
      updated_at: new Date(),
    };
    const rating = (editCommentDto as EditCommentCourse).comm_rating;

    if (
      comment.comm_source === CommentEnum.COURSE &&
      !comment.parent_comment &&
      rating !== undefined
    ) {
      data.comm_rating = rating;
    }

    return await this.commentRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }

  async delete(id: string, user: IAccessUser): Promise<void> {
    const comment: Comment = await this.findById(id);

    if (
      String(comment.author?._id ?? comment.author) !== user.id &&
      user.role !== RoleEnum.SUPERADMIN
    ) {
      throw new ForbiddenException(
        "You can't remove a comment that doesn't belong to you",
      );
    }

    await this.commentRepository.deleteMany({ parent_comment: comment._id });

    if (comment.parent_comment) {
      await this.commentRepository.findByIdAndUpdate(
        comment.parent_comment._id,
        {
          $pull: { replies: comment._id },
        },
      );
    }

    await this.commentRepository.findByIdAndDelete(comment._id);
  }

  async listForModeration(
    keyword: string | undefined,
    page: number,
    limit: number,
  ) {
    const filter = keyword?.trim()
      ? { comm_content: new RegExp(escapeRegex(keyword.trim()), 'i') }
      : {};

    return this.commentRepository.paginate(filter, page, limit);
  }

  async like(id: string, likeByUserId: string): Promise<Comment> {
    return this.handleLikeDislike(id, likeByUserId, 'like');
  }

  async dislike(id: string, dislikeByUserId: string): Promise<Comment> {
    return this.handleLikeDislike(id, dislikeByUserId, 'dislike');
  }

  async handleLikeDislike(
    commentId: string,
    userId: string,
    reactionType: ReactionComment,
  ): Promise<Comment> {
    const user = await this.userRepository.findPublicById(
      new Types.ObjectId(userId),
    );

    let comment: Comment = await this.findById(commentId);
    const updateReactionAndReacter = this.updateReactionAndReacter(
      comment,
      user,
      reactionType,
    );

    const data = {
      comm_count_like:
        updateReactionAndReacter.comm_count_like ?? comment.comm_count_like,
      comm_liked_by: comment.comm_liked_by,
      comm_count_dislike:
        updateReactionAndReacter.comm_count_dislike ??
        comment.comm_count_dislike,
      comm_disliked_by: comment.comm_disliked_by,
    };

    return await this.commentRepository.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      data,
    );
  }

  updateReactionAndReacter = (
    comment: Comment,
    user: User,
    reactionType: ReactionComment,
  ): IReactionCounts => {
    const userId = String(user._id);
    const reactionTypeAndReacter: IReactionTypeAndReacter = {
      like: { count: 'comm_count_like', users: 'comm_liked_by' },
      dislike: { count: 'comm_count_dislike', users: 'comm_disliked_by' },
    };

    const currentReaction = reactionTypeAndReacter[reactionType];
    const hasReacted = comment[currentReaction.users].some(
      (reacter) => String(reacter._id) === userId,
    );

    const updateReactionAndReacter: IReactionCounts = {
      [currentReaction.count]: hasReacted
        ? comment[currentReaction.count] - 1
        : comment[currentReaction.count] + 1,
    };

    if (hasReacted) {
      comment[currentReaction.users] = [
        ...comment[currentReaction.users],
      ].filter((reacter) => String(reacter._id) !== userId);
    } else {
      comment[currentReaction.users] = [
        ...comment[currentReaction.users],
        user,
      ];
    }

    const oppositeReaction =
      reactionTypeAndReacter[reactionType === 'like' ? 'dislike' : 'like'];
    const hasOppositeReacted = comment[oppositeReaction.users].some(
      (reacter) => String(reacter._id) === userId,
    );

    if (hasOppositeReacted) {
      updateReactionAndReacter[oppositeReaction.count] =
        comment[oppositeReaction.count] - 1;

      comment[oppositeReaction.users] = [
        ...comment[oppositeReaction.users],
      ].filter((reacter) => String(reacter._id) !== userId);
    }

    return updateReactionAndReacter;
  };
}
