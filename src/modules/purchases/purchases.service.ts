import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { IRequestUser } from '../../common/auth/authenticated-request';
import {
  purchaseReceiptTemplate,
  purchaseRefundedTemplate,
} from '../../templates/purchase-receipt';
import {
  SUBJECT_PURCHASE_RECEIPT,
  SUBJECT_PURCHASE_REFUNDED,
} from '../../utils/constants/mailing/email';
import { CourseStatusEnum } from '../../utils/enums/course-status.enum';
import { PaymentMethodEnum } from '../../utils/enums/payment-method.enum';
import { RoleEnum } from '../../utils/enums/role.enum';
import { escapeRegex } from '../../utils/string/escape-regex';
import { CourseRepository } from '../learning/repositories/course.repository';
import { CreatePurchase } from './dto/create-purchase.dto';
import { PurchaseRepository } from './repository/purchase.repository';
import {
  ICourse,
  Purchase,
  PurchaseStatusEnum,
} from './schemas/purchase.schema';
import { errorStack } from '../../utils/errors';

export const toCents = (amount: number): number => Math.round(amount * 100);

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private purchaseRepository: PurchaseRepository,
    private mailerService: MailerService,
    private courseRepository: CourseRepository,
  ) {}

  async findMine(userId: string): Promise<Purchase[]> {
    return await this.purchaseRepository.find({ 'user.id': userId });
  }

  async findForAdmin(keyword: string | undefined, page: number, limit: number) {
    const filter = keyword?.trim()
      ? {
          $or: [
            { purch_reference: new RegExp(escapeRegex(keyword.trim()), 'i') },
            { 'user.email': new RegExp(escapeRegex(keyword.trim()), 'i') },
            { 'user.name': new RegExp(escapeRegex(keyword.trim()), 'i') },
          ],
        }
      : {};

    return this.purchaseRepository.paginate(filter, page, limit);
  }

  async findById(id: string): Promise<Purchase> {
    return await this.purchaseRepository.findById(new Types.ObjectId(id));
  }

  async findOwned(id: string, user: IRequestUser): Promise<Purchase> {
    const purchase = await this.findById(id);

    if (purchase.user?.id !== user.id && user.role !== RoleEnum.SUPERADMIN) {
      throw new ForbiddenException("You can't access this order");
    }

    return purchase;
  }

  private async buildItems(
    courseIds: string[],
    user: IRequestUser,
  ): Promise<ICourse[]> {
    const uniqueIds = [...new Set(courseIds)];
    const courses = await this.courseRepository.find({
      _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      crs_status: CourseStatusEnum.VALIDATED,
    });

    if (courses.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Some courses in your cart are no longer available. Remove them and try again.',
      );
    }

    const ownCourse = courses.find(
      (course) => String(course.author) === user.id,
    );

    if (ownCourse) {
      throw new BadRequestException(
        `You can't buy your own course "${ownCourse.crs_title}"`,
      );
    }

    const alreadyOwned = await this.purchaseRepository.findOneOrNull({
      'user.id': user.id,
      purch_is_paid: true,
      'purchaseItems.id': { $in: uniqueIds },
    });

    if (alreadyOwned) {
      const ownedIds = new Set(
        alreadyOwned.purchaseItems.map((item: ICourse) => String(item.id)),
      );
      const owned = courses.find((course) => ownedIds.has(String(course._id)));

      throw new BadRequestException(
        `You already own the course "${owned?.crs_title ?? ''}". Remove it from your cart.`,
      );
    }

    return courses.map((course) => ({
      id: String(course._id),
      title: course.crs_title,
      slug: course.crs_slug,
      image: course.crs_photo ?? '',
      price: Number(course.crs_price ?? 0),
      qty: 1,
    }));
  }

  private reference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return `KP-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async store(
    createPurchase: CreatePurchase,
    user: IRequestUser,
  ): Promise<Purchase> {
    const purchaseItems = await this.buildItems(createPurchase.courseIds, user);
    const total =
      purchaseItems.reduce((sum, item) => sum + toCents(item.price), 0) / 100;
    const isFree = total === 0;

    const purchase = await this.purchaseRepository.create({
      purch_reference: this.reference(),
      payment_method: PaymentMethodEnum.STRIPE,
      user: {
        id: user.id,
        name: createPurchase.billing.name.trim(),
        email: user.email,
        address: {
          line1: createPurchase.billing.address.line1.trim(),
          city: createPurchase.billing.address.city.trim(),
          postal_code: createPurchase.billing.address.postal_code.trim(),
          country: createPurchase.billing.address.country?.toUpperCase(),
        },
      },
      purchaseItems,
      purch_total: total,
      purch_currency: 'eur',
      purch_status: isFree
        ? PurchaseStatusEnum.PAID
        : PurchaseStatusEnum.PENDING,
      purch_is_paid: isFree,
      purch_paid_at: isFree ? new Date() : undefined,
    });

    if (isFree) {
      await this.sendReceipt(purchase);
    }

    return purchase;
  }

  async attachPaymentIntent(
    purchaseId: Types.ObjectId,
    paymentIntentId: string,
  ) {
    await this.purchaseRepository.findByIdAndUpdate(purchaseId, {
      purch_payment_intent_id: paymentIntentId,
    });
  }

  async markPaid(
    purchaseId: string,
    paymentIntentId: string,
    amountReceived: number,
    currency: string,
  ): Promise<void> {
    const purchase = await this.purchaseRepository.findOneOrNull({
      _id: new Types.ObjectId(purchaseId),
    });

    if (!purchase) {
      this.logger.error(`Paid purchase ${purchaseId} was not found`);
      return;
    }

    if (purchase.purch_is_paid) {
      return;
    }

    if (
      amountReceived !== toCents(purchase.purch_total) ||
      currency.toLowerCase() !== purchase.purch_currency
    ) {
      this.logger.error(
        `Amount mismatch for purchase ${purchaseId}: received ${amountReceived} ${currency}, expected ${toCents(purchase.purch_total)} ${purchase.purch_currency}`,
      );
      return;
    }

    const updated = await this.purchaseRepository.findOneAndUpdate(
      { _id: purchase._id, purch_is_paid: false },
      {
        purch_is_paid: true,
        purch_status: PurchaseStatusEnum.PAID,
        purch_paid_at: new Date(),
        purch_payment_intent_id: paymentIntentId,
        updated_at: new Date(),
      },
    );

    if (updated) {
      await this.sendReceipt(updated);
    }
  }

  async markRefunded(paymentIntentId: string): Promise<void> {
    const purchase = await this.purchaseRepository.findOneAndUpdate(
      {
        purch_payment_intent_id: paymentIntentId,
        purch_status: { $ne: PurchaseStatusEnum.REFUNDED },
      },
      {
        purch_is_paid: false,
        purch_status: PurchaseStatusEnum.REFUNDED,
        purch_refunded_at: new Date(),
        updated_at: new Date(),
      },
    );

    if (purchase) {
      await this.sendMail(
        purchase.user.email,
        SUBJECT_PURCHASE_REFUNDED,
        purchaseRefundedTemplate(purchase),
      );
    }
  }

  async markRefundedWithoutPayment(purchaseId: Types.ObjectId): Promise<void> {
    await this.purchaseRepository.findByIdAndUpdate(purchaseId, {
      purch_is_paid: false,
      purch_status: PurchaseStatusEnum.REFUNDED,
      purch_refunded_at: new Date(),
      updated_at: new Date(),
    });
  }

  private async sendReceipt(purchase: Purchase): Promise<void> {
    await this.sendMail(
      purchase.user.email,
      SUBJECT_PURCHASE_RECEIPT,
      purchaseReceiptTemplate(purchase, `${process.env.FRONTEND_URL}/orders`),
    );
  }

  private async sendMail(to: string, subject: string, html: string) {
    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error: unknown) {
      this.logger.error(`Failed to send "${subject}"`, errorStack(error));
    }
  }
}
