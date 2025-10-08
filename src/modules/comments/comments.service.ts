import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ICommentResponse } from '../../interfaces/comments/ICommentResponse';
import { IAddCommentDto } from '../../interfaces/comments/IAddCommentDto';
import { ICommentBySource } from '../../interfaces/comments/ICommentBySource';
import { IReactionTypeAndReacter } from '../../interfaces/comments/IReactionTypeAndReacter';
import { CommentEnum } from '../../utils/enums/comment.enum';
import { CourseRepository } from '../learning/repositories/course.repository';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { Course } from '../learning/schemas/course.schema';
import { Lesson } from '../learning/schemas/lesson.schema';
import { UserRepository } from '../users/repository/user.repository';
import { User } from '../users/schemas/user.schema';
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
  ) {}

  async findById(id: string): Promise<Comment> {
    return await this.commentRepository.findById(new Types.ObjectId(id));
  }

  async findByCourse(courseId: string): Promise<ICommentBySource> {
    const { comments, totalComments } = await this.findByCommentSource(
      String(CommentEnum.COURSE),
      courseId,
    );

    return {
      comments,
      totalComment: totalComments,
    };
  }

  async findByLesson(lessonId: string): Promise<ICommentBySource> {
    const { comments, totalComments } = await this.findByCommentSource(
      String(CommentEnum.LESSON),
      lessonId,
    );

    return {
      comments,
      totalComment: totalComments,
    };
  }

  private getCriteriaBySource(source: string, id: string, criteria: any) {
    if (Number(source) === Number(CommentEnum.COURSE)) {
      criteria.course = id;
    } else if (Number(source) === Number(CommentEnum.LESSON)) {
      criteria.lesson = id;
    }

    return criteria;
  }

  async findByCommentSource(source: string, id: string) {
    let criteria: any = {
      parent_comment: null,
    };

    criteria = this.getCriteriaBySource(source, id, criteria);

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
    authorId: string,
    commentDto: IAddCommentDto,
    source: CommentEnum,
  ): Promise<ICommentResponse> {
    const commentId: Types.ObjectId = commentDto.comment_id;
    const parentComment: Comment = await this.getParentComment(commentId);
    const course: Course = await this.getCourse(source, commentDto.course_id);
    const lesson: Lesson = await this.getLesson(source, commentDto.lesson_id);

    const author: User = await this.userRepository.findById(
      new Types.ObjectId(authorId),
    );

    let data = {
      ...commentDto,
      author,
      comm_source: source,
      course: source == CommentEnum.COURSE ? course : null,
      lesson: source == CommentEnum.LESSON ? lesson : null,
      comm_count_like: 0,
      comm_liked_by: [],
      comm_count_dislike: 0,
      comm_disliked_by: [],
      replies: [],
      ...(parentComment
        ? { parent_comment: parentComment._id }
        : { parent_comment: null }),
    };

    let comment: Comment = await this.commentRepository.create(data);
    let commentToReturn = null;

    if (parentComment) {
      const childComment: Comment = await this.commentRepository.findById(
        comment._id,
      );

      parentComment.replies.push(childComment);

      await this.commentRepository.findByIdAndUpdate(parentComment._id, {
        replies: parentComment.replies,
      });

      commentToReturn = childComment;
    } else {
      commentToReturn = comment;
    }

    return this.mapperComment(commentToReturn);
  }

  private async getParentComment(commentId: Types.ObjectId): Promise<Comment> {
    let parentComment: Comment = null;

    if (null !== commentId) {
      parentComment = await this.findById(String(commentId));
    }

    return parentComment;
  }

  private async getCourse(
    source: CommentEnum,
    courseId: Types.ObjectId | null,
  ): Promise<Course> {
    let course: Course = null;

    if (source == CommentEnum.COURSE) {
      course = await this.courseRepository.findById(
        new Types.ObjectId(courseId),
      );
    }

    return course;
  }

  private async getLesson(
    source: CommentEnum,
    lessonId: Types.ObjectId | null,
  ): Promise<Lesson> {
    let lesson: Lesson = null;

    if (source == CommentEnum.LESSON) {
      lesson = await this.lessonRepository.findById(
        new Types.ObjectId(lessonId),
      );
    }

    return lesson;
  }

  private async mapperComment(comment: Comment): Promise<ICommentResponse> {
    let author = comment.author;
    let lesson = null;
    let course = null;

    if (comment.author instanceof Types.ObjectId) {
      author = await this.userRepository.findById(comment.author._id, {
        select: 'author _id usr_photo usr_username usr_firstname usr_lastname',
      });
    }

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

    let replies: Comment[] = comment.replies;

    if (comment.replies.length > 0) {
      replies = await Promise.all(
        replies.map(async (replyId) => {
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
    }

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
  ): Promise<Comment> {
    await this.findById(id);

    return await this.commentRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      editCommentDto,
    );
  }

  async delete(id: string, authorId: string): Promise<void> {
    let comment: Comment = await this.findById(id);

    if (String(comment.author._id) !== authorId) {
      throw new ForbiddenException(
        "You can't remove a comment who don't belong to you",
      );
    }

    if (comment.parent_comment) {
      const parentCommentId = comment.parent_comment;

      const parentComment = await this.findById(String(parentCommentId));
      const updatedReplies = parentComment.replies.filter(
        (replyComment) => String(replyComment._id) !== String(comment._id),
      );

      await this.commentRepository.findByIdAndUpdate(parentCommentId, {
        replies: updatedReplies,
      });

      return await this.commentRepository.findByIdAndDelete(comment._id);
    } else {
      await this.commentRepository.deleteMany({ parent_comment: comment._id });
      return this.commentRepository.findByIdAndDelete(new Types.ObjectId(id));
    }
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
    await this.userRepository.findById(new Types.ObjectId(userId));

    let comment: Comment = await this.findById(commentId);
    const parentCommentId: Types.ObjectId = comment.parent_comment;

    if (parentCommentId !== null) {
      const parentComment = await this.findById(String(parentCommentId));

      const commentReplyIndex = parentComment.replies.findIndex(
        (commentReply) => String(commentReply._id) === commentId,
      );

      if (commentReplyIndex >= 0) {
        const replyComment = parentComment.replies[commentReplyIndex];

        const updateReactionAndReacter = this.updateReactionAndReacter(
          replyComment,
          userId,
          reactionType,
        );

        const commentReply = {
          _id: replyComment._id,
          comm_content: replyComment.comm_content,
          comm_source: replyComment.comm_source,
          author: replyComment.author,
          course: replyComment.course,
          lesson: replyComment.lesson,
          parent_comment: replyComment.parent_comment,
          replies: replyComment.replies,
          comm_count_like:
            updateReactionAndReacter.comm_count_like ??
            replyComment.comm_count_like,
          comm_liked_by:
            updateReactionAndReacter.comm_liked_by ??
            replyComment.comm_liked_by,
          comm_count_dislike:
            updateReactionAndReacter.comm_count_dislike ??
            replyComment.comm_count_dislike,
          comm_disliked_by:
            updateReactionAndReacter.comm_disliked_by ??
            replyComment.comm_disliked_by,
        };

        parentComment.replies[commentReplyIndex] = commentReply;

        await this.commentRepository.findByIdAndUpdate(
          new Types.ObjectId(String(parentCommentId)),
          { replies: parentComment.replies },
        );
      }

      return parentComment;
    }

    let updateReactionAndReacter = this.updateReactionAndReacter(
      comment,
      userId,
      reactionType,
    );

    let data: Comment = {
      _id: comment._id,
      comm_content: comment.comm_content,
      comm_source: comment.comm_source,
      author: comment.author,
      course: comment.course,
      lesson: comment.lesson,
      parent_comment: comment.parent_comment,
      replies: comment.replies,
      comm_count_like:
        updateReactionAndReacter.comm_count_like ?? comment.comm_count_like,
      comm_liked_by:
        updateReactionAndReacter.comm_liked_by ?? comment.comm_liked_by,
      comm_count_dislike:
        updateReactionAndReacter.comm_count_dislike ??
        comment.comm_count_dislike,
      comm_disliked_by:
        updateReactionAndReacter.comm_disliked_by ?? comment.comm_disliked_by,
    };

    return await this.commentRepository.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      data,
    );
  }

  updateReactionAndReacter = (
    comment: Comment,
    userId: string,
    reactionType: ReactionComment,
  ) => {
    const reactionTypeAndReacter: IReactionTypeAndReacter = {
      like: { count: 'comm_count_like', users: 'comm_liked_by' },
      dislike: { count: 'comm_count_dislike', users: 'comm_disliked_by' },
    };

    const currentReaction = reactionTypeAndReacter[reactionType];
    const hasReacted = comment[currentReaction.users].includes(userId);

    const updateReactionAndReacter: any = {
      [currentReaction.count]: hasReacted
        ? comment[currentReaction.count] - 1
        : comment[currentReaction.count] + 1,
    };

    if (hasReacted) {
      comment[currentReaction.users] = [
        ...comment[currentReaction.users],
      ].filter((reacter) => String(reacter) !== userId);
    } else {
      comment[currentReaction.users] = [
        ...comment[currentReaction.users],
        userId,
      ];
    }

    const oppositeReaction =
      reactionTypeAndReacter[reactionType === 'like' ? 'dislike' : 'like'];
    const hasOppositeReacted = comment[oppositeReaction.users].includes(userId);

    if (hasOppositeReacted) {
      updateReactionAndReacter[oppositeReaction.count] =
        comment[oppositeReaction.count] - 1;

      comment[oppositeReaction.users] = [
        ...comment[oppositeReaction.users],
      ].filter((reacter) => String(reacter) !== userId);
    }

    return updateReactionAndReacter;
  };
}
