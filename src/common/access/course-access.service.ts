import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PurchaseRepository } from '../../modules/purchases/repository/purchase.repository';
import { RoleEnum } from '../../utils/enums/role.enum';

export interface IAccessUser {
  id: string;
  role?: RoleEnum;
}

export interface IAccessCourse {
  _id?: Types.ObjectId | string;
  author?: Types.ObjectId | { _id: Types.ObjectId } | string;
}

@Injectable()
export class CourseAccessService {
  constructor(private purchaseRepository: PurchaseRepository) {}

  private authorIdOf(course: IAccessCourse | undefined): string | undefined {
    const author = course?.author;

    if (!author) {
      return undefined;
    }

    return typeof author === 'string' ? author : String(author._id);
  }

  canManage(
    user: IAccessUser | undefined,
    course: IAccessCourse | undefined,
  ): boolean {
    if (!user) {
      return false;
    }

    return (
      user.role === RoleEnum.SUPERADMIN || this.authorIdOf(course) === user.id
    );
  }

  assertCanManage(
    user: IAccessUser | undefined,
    course: IAccessCourse | undefined,
  ): void {
    if (!this.canManage(user, course)) {
      throw new ForbiddenException(
        "You can't manage a course that doesn't belong to you",
      );
    }
  }

  async hasPurchased(userId: string, courseId: string): Promise<boolean> {
    const purchase = await this.purchaseRepository.findOneOrNull({
      'user.id': userId,
      purch_is_paid: true,
      'purchaseItems.id': courseId,
    });

    return purchase !== null;
  }

  async purchasedCourseIds(userId: string): Promise<string[]> {
    const purchases = await this.purchaseRepository.find(
      { 'user.id': userId, purch_is_paid: true },
      { select: 'purchaseItems.id' },
    );

    return [
      ...new Set(
        purchases.flatMap((purchase) =>
          (purchase.purchaseItems ?? []).map((item) => String(item.id)),
        ),
      ),
    ];
  }

  async hasAccess(
    user: IAccessUser | undefined,
    course: IAccessCourse,
  ): Promise<boolean> {
    if (!user) {
      return false;
    }

    if (this.canManage(user, course)) {
      return true;
    }

    return this.hasPurchased(user.id, String(course._id));
  }

  async assertAccess(
    user: IAccessUser | undefined,
    course: IAccessCourse,
  ): Promise<void> {
    if (!(await this.hasAccess(user, course))) {
      throw new ForbiddenException('You need to purchase this course first');
    }
  }
}
