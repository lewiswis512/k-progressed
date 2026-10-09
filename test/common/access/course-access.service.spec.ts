import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PurchaseRepository } from '../../../src/modules/purchases/repository/purchase.repository';
import { RoleEnum } from '../../../src/utils/enums/role.enum';
import { CourseAccessService } from '../../../src/common/access/course-access.service';

describe('CourseAccessService', () => {
  const authorId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const courseId = new Types.ObjectId();
  const course = { _id: courseId, author: new Types.ObjectId(authorId) };

  let purchases: { findOneOrNull: jest.Mock; find: jest.Mock };
  let service: CourseAccessService;

  beforeEach(() => {
    purchases = {
      findOneOrNull: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    service = new CourseAccessService(
      purchases as unknown as PurchaseRepository,
    );
  });

  describe('canManage', () => {
    it('should allow the author with an ObjectId, a populated or a string author', () => {
      const user = { id: authorId, role: RoleEnum.ADMIN };

      expect(service.canManage(user, course)).toBe(true);
      expect(
        service.canManage(user, {
          author: { _id: new Types.ObjectId(authorId) },
        }),
      ).toBe(true);
      expect(service.canManage(user, { author: authorId })).toBe(true);
    });

    it('should allow a super admin on any course', () => {
      expect(
        service.canManage({ id: studentId, role: RoleEnum.SUPERADMIN }, course),
      ).toBe(true);
    });

    it('should refuse another admin, a student, an anonymous user and a course without author', () => {
      expect(
        service.canManage({ id: studentId, role: RoleEnum.ADMIN }, course),
      ).toBe(false);
      expect(
        service.canManage({ id: studentId, role: RoleEnum.USER }, course),
      ).toBe(false);
      expect(service.canManage(undefined, course)).toBe(false);
      expect(
        service.canManage({ id: studentId, role: RoleEnum.USER }, {}),
      ).toBe(false);
    });

    it('should throw a ForbiddenException when the user cannot manage the course', () => {
      expect(() =>
        service.assertCanManage({ id: studentId, role: RoleEnum.USER }, course),
      ).toThrow(
        new ForbiddenException(
          "You can't manage a course that doesn't belong to you",
        ),
      );
      expect(() =>
        service.assertCanManage({ id: authorId, role: RoleEnum.ADMIN }, course),
      ).not.toThrow();
    });
  });

  describe('hasPurchased', () => {
    it('should look for a paid purchase of the user containing the course', async () => {
      purchases.findOneOrNull.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(
        service.hasPurchased(studentId, String(courseId)),
      ).resolves.toBe(true);
      expect(purchases.findOneOrNull).toHaveBeenCalledWith({
        'user.id': studentId,
        purch_is_paid: true,
        'purchaseItems.id': String(courseId),
      });
    });

    it('should return false without a paid purchase', async () => {
      await expect(
        service.hasPurchased(studentId, String(courseId)),
      ).resolves.toBe(false);
    });
  });

  describe('purchasedCourseIds', () => {
    it('should return the unique course ids of the paid purchases', async () => {
      purchases.find.mockResolvedValue([
        { purchaseItems: [{ id: 'a' }, { id: 'b' }] },
        { purchaseItems: [{ id: 'b' }, { id: 'c' }] },
        {},
      ]);

      await expect(service.purchasedCourseIds(studentId)).resolves.toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(purchases.find).toHaveBeenCalledWith(
        { 'user.id': studentId, purch_is_paid: true },
        { select: 'purchaseItems.id' },
      );
    });
  });

  describe('hasAccess / assertAccess', () => {
    it('should give access to the manager without querying the purchases', async () => {
      await expect(
        service.hasAccess({ id: authorId, role: RoleEnum.ADMIN }, course),
      ).resolves.toBe(true);
      await expect(
        service.hasAccess({ id: studentId, role: RoleEnum.SUPERADMIN }, course),
      ).resolves.toBe(true);
      expect(purchases.findOneOrNull).not.toHaveBeenCalled();
    });

    it('should give access to a buyer', async () => {
      purchases.findOneOrNull.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(
        service.hasAccess({ id: studentId, role: RoleEnum.USER }, course),
      ).resolves.toBe(true);
    });

    it('should refuse an anonymous user and a student who did not buy', async () => {
      await expect(service.hasAccess(undefined, course)).resolves.toBe(false);
      await expect(
        service.assertAccess({ id: studentId, role: RoleEnum.USER }, course),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
