import { Types } from 'mongoose';
import request from 'supertest';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';

describe('Comments (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let teacher: ITestUser & { teacherId: string };
  let buyer: ITestUser;
  let otherBuyer: ITestUser;
  let student: ITestUser;
  let superAdmin: ITestUser;
  let courseId: string;
  let paidLessonId: string;
  let freeLessonId: string;
  let reviewId: string;
  let lessonCommentId: string;
  let replyId: string;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    teacher = await fixtures.createTeacher('comm_teacher');
    buyer = await fixtures.createUser('comm_buyer');
    otherBuyer = await fixtures.createUser('comm_other');
    student = await fixtures.createUser('comm_student');
    superAdmin = await fixtures.createSuperAdmin('comm_super');
    courseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
    });
    const sectionId = await fixtures.createSection(courseId);
    paidLessonId = await fixtures.createLesson(sectionId);
    freeLessonId = await fixtures.createLesson(sectionId, { isFree: true });
    await fixtures.createPurchase(buyer, [courseId]);
    await fixtures.createPurchase(otherBuyer, [courseId]);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const review = (user: ITestUser, body: Record<string, unknown>) =>
    request(testApp.http)
      .post('/api/comments/course')
      .set(bearer(user))
      .send({ course_id: courseId, ...body });

  describe('review a course', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/comments/course')
        .send({ course_id: courseId, comm_content: 'x', comm_rating: 5 })
        .expect(401);
    });

    it('should return 403 for a student who did not buy the course', async () => {
      await review(student, { comm_content: 'Not bought', comm_rating: 5 }).expect(403);
    });

    it('should return 403 when the teacher reviews their own course', async () => {
      await review(teacher, { comm_content: 'My course is great', comm_rating: 5 }).expect(403);
    });

    it('should return 400 when the rating is missing or out of range', async () => {
      await review(buyer, { comm_content: 'No rating' }).expect(400);
      await review(buyer, { comm_content: 'Too high', comm_rating: 9 }).expect(400);
    });

    it('should return 400 when content is missing', async () => {
      await review(buyer, { comm_rating: 4 }).expect(400);
    });

    it('should create the review of a buyer and ignore a forged author', async () => {
      const res = await review(buyer, {
        comm_content: 'Great course',
        comm_rating: 4,
        author: otherBuyer.id,
        comm_count_like: 100,
      }).expect(201);

      reviewId = res.body._id;
      expect(res.body.comm_rating).toBe(4);
      expect(res.body.author._id).toBe(buyer.id);
      expect(res.body.comm_count_like).toBe(0);
    });

    it('should return 409 for a second review of the same course', async () => {
      await review(buyer, { comm_content: 'Again', comm_rating: 5 }).expect(409);
    });
  });

  describe('reply to a review', () => {
    it('should return 403 for a student who did not buy the course', async () => {
      await review(student, { comm_content: 'Reply', comment_id: reviewId }).expect(403);
    });

    it('should let the teacher reply without a rating', async () => {
      const res = await review(teacher, {
        comm_content: 'Thank you',
        comm_rating: 5,
        comment_id: reviewId,
      }).expect(201);

      replyId = res.body._id;
      expect(res.body.comm_rating).toBeNull();
      expect(res.body.parent_comment).toBe(reviewId);
    });

    it('should return 400 when replying to a reply', async () => {
      await review(otherBuyer, { comm_content: 'Nested', comment_id: replyId }).expect(400);
    });
  });

  describe('comment a lesson', () => {
    const commentLesson = (user: ITestUser, lessonId: string) =>
      request(testApp.http)
        .post('/api/comments/lesson')
        .set(bearer(user))
        .send({ lesson_id: lessonId, comm_content: 'Nice lesson' });

    it('should return 403 on a paid lesson for a student who did not buy', async () => {
      await commentLesson(student, paidLessonId).expect(403);
      await commentLesson(student, freeLessonId).expect(403);
    });

    it('should create a comment for a buyer', async () => {
      const res = await commentLesson(buyer, paidLessonId).expect(201);

      lessonCommentId = res.body._id;
      expect(res.body.lesson._id).toBe(paidLessonId);
    });

    it('should return 400 when content is missing', async () => {
      await request(testApp.http)
        .post('/api/comments/lesson')
        .set(bearer(buyer))
        .send({ lesson_id: paidLessonId })
        .expect(400);
    });
  });

  describe('read comments', () => {
    it('should return the reviews of the course with their replies', async () => {
      const res = await request(testApp.http)
        .get(`/api/comments/by/course/${courseId}`)
        .expect(200);

      expect(res.body.totalComments).toBe(2);
      expect(res.body.comments).toHaveLength(1);
      expect(res.body.comments[0].replies[0]._id).toBe(replyId);
      expect(res.body.comments[0].author).not.toHaveProperty('usr_email');
    });

    it('should return the comments of the lesson', async () => {
      const res = await request(testApp.http)
        .get(`/api/comments/by/lesson/${paidLessonId}`)
        .expect(200);

      expect(res.body.totalComments).toBe(1);
    });

    it('should return 404 for an unknown comment', async () => {
      await request(testApp.http).get(`/api/comments/${new Types.ObjectId()}`).expect(404);
    });

    it('should return the moderation list only to the super admin', async () => {
      await request(testApp.http)
        .get('/api/comments/admin')
        .set(bearer(teacher))
        .expect(403);

      const res = await request(testApp.http)
        .get('/api/comments/admin')
        .set(bearer(superAdmin))
        .expect(200);
      expect(res.body.total).toBe(3);
    });
  });

  describe('edit comments', () => {
    it("should return 403 when editing someone else's review", async () => {
      await request(testApp.http)
        .patch(`/api/comments/course/${reviewId}`)
        .set(bearer(otherBuyer))
        .send({ comm_content: 'Hijacked', comm_rating: 1 })
        .expect(403);
    });

    it('should return 403 when the super admin edits a review', async () => {
      await request(testApp.http)
        .patch(`/api/comments/course/${reviewId}`)
        .set(bearer(superAdmin))
        .send({ comm_content: 'Moderated', comm_rating: 1 })
        .expect(403);
    });

    it('should update the content and rating of an own review', async () => {
      const res = await request(testApp.http)
        .patch(`/api/comments/course/${reviewId}`)
        .set(bearer(buyer))
        .send({ comm_content: 'Updated review', comm_rating: 5 })
        .expect(200);

      expect(res.body.comm_content).toBe('Updated review');
      expect(res.body.comm_rating).toBe(5);
    });

    it('should not add a rating to a reply', async () => {
      const res = await request(testApp.http)
        .patch(`/api/comments/course/${replyId}`)
        .set(bearer(teacher))
        .send({ comm_content: 'Thanks again', comm_rating: 1 })
        .expect(200);

      expect(res.body.comm_rating).toBeNull();
    });

    it('should update an own lesson comment and refuse others', async () => {
      await request(testApp.http)
        .patch(`/api/comments/lesson/${lessonCommentId}`)
        .set(bearer(otherBuyer))
        .send({ comm_content: 'Hijacked' })
        .expect(403);

      const res = await request(testApp.http)
        .patch(`/api/comments/lesson/${lessonCommentId}`)
        .set(bearer(buyer))
        .send({ comm_content: 'Updated lesson comment' })
        .expect(200);
      expect(res.body.comm_content).toBe('Updated lesson comment');
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch(`/api/comments/course/${reviewId}`)
        .send({ comm_content: 'x' })
        .expect(401);
    });
  });

  describe('react to a comment', () => {
    it('should increment the like count', async () => {
      const res = await request(testApp.http)
        .patch(`/api/comments/like/${reviewId}`)
        .set(bearer(otherBuyer))
        .expect(200);

      expect(res.body.comm_count_like).toBe(1);
    });

    it('should remove the like when called again', async () => {
      const res = await request(testApp.http)
        .patch(`/api/comments/like/${reviewId}`)
        .set(bearer(otherBuyer))
        .expect(200);

      expect(res.body.comm_count_like).toBe(0);
    });

    it('should switch a like to a dislike', async () => {
      await request(testApp.http)
        .patch(`/api/comments/like/${reviewId}`)
        .set(bearer(otherBuyer))
        .expect(200);
      const res = await request(testApp.http)
        .patch(`/api/comments/dislike/${reviewId}`)
        .set(bearer(otherBuyer))
        .expect(200);

      expect(res.body.comm_count_like).toBe(0);
      expect(res.body.comm_count_dislike).toBe(1);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http).patch(`/api/comments/like/${reviewId}`).expect(401);
    });
  });

  describe('delete a comment', () => {
    it("should return 403 when deleting someone else's comment", async () => {
      await request(testApp.http)
        .delete(`/api/comments/${lessonCommentId}`)
        .set(bearer(otherBuyer))
        .expect(403);
      await request(testApp.http)
        .delete(`/api/comments/${reviewId}`)
        .set(bearer(teacher))
        .expect(403);
    });

    it('should delete an own comment', async () => {
      await request(testApp.http)
        .delete(`/api/comments/${lessonCommentId}`)
        .set(bearer(buyer))
        .expect(204);
    });

    it('should let the super admin delete a review with its replies', async () => {
      await request(testApp.http)
        .delete(`/api/comments/${reviewId}`)
        .set(bearer(superAdmin))
        .expect(204);

      await request(testApp.http).get(`/api/comments/${replyId}`).expect(404);
    });

    it('should let the buyer review again after the review was removed', async () => {
      await review(buyer, { comm_content: 'Second chance', comm_rating: 3 }).expect(201);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http).delete(`/api/comments/${reviewId}`).expect(401);
    });
  });
});
