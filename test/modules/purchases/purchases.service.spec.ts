import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseRepository } from '../../../src/modules/learning/repositories/course.repository';
import { CourseStatusEnum } from '../../../src/utils/enums/course-status.enum';
import { RoleEnum } from '../../../src/utils/enums/role.enum';
import {
  PurchasesService,
  toCents,
} from '../../../src/modules/purchases/purchases.service';
import {
  ICourse,
  PurchaseStatusEnum,
} from '../../../src/modules/purchases/schemas/purchase.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { PurchaseRepository } from '../../../src/modules/purchases/repository/purchase.repository';

describe('toCents', () => {
  it.each([
    [29.99, 2999],
    [0.1 + 0.2, 30],
    [19.995, 2000],
    [1.005, 100],
    [0, 0],
    [10000, 1000000],
  ])('should convert %p euros to %p cents', (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });
});

describe('PurchasesService', () => {
  const buyer = {
    id: new Types.ObjectId().toString(),
    username: 'buyer',
    email: 'buyer@test.local',
    type: 1,
    role: RoleEnum.USER,
  };
  const authorId = new Types.ObjectId();
  const billing = {
    name: '  Test Buyer ',
    address: {
      line1: ' 1 rue du Test ',
      city: ' Paris ',
      postal_code: ' 75001 ',
      country: 'fr',
    },
  };

  const course = (price: number, extra: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    crs_title: `Course ${price}`,
    crs_slug: `course-${price}`,
    crs_photo: 'https://img',
    crs_price: price,
    crs_status: CourseStatusEnum.VALIDATED,
    author: authorId,
    ...extra,
  });

  let coursesFind: jest.Mock;
  let repository: Record<string, jest.Mock>;
  let mailer: { sendMail: jest.Mock };
  let service: PurchasesService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    coursesFind = jest.fn().mockResolvedValue([]);
    const courseRepository = { find: coursesFind };
    repository = {
      create: jest.fn(async (data) => ({ _id: new Types.ObjectId(), ...data })),
      findById: jest.fn(),
      findOneOrNull: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    mailer = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new PurchasesService(
      repository as unknown as PurchaseRepository,
      mailer as unknown as MailerService,
      courseRepository as unknown as CourseRepository,
    );
  });

  describe('store', () => {
    it('should price the order from the database and ignore duplicates', async () => {
      const a = course(29.99);
      const b = course(10.1);
      coursesFind.mockResolvedValue([a, b]);

      const purchase = await service.store(
        { courseIds: [String(a._id), String(b._id), String(a._id)], billing },
        buyer,
      );

      const [filter] = coursesFind.mock.calls[0];
      expect(filter._id.$in).toHaveLength(2);
      expect(filter.crs_status).toBe(CourseStatusEnum.VALIDATED);
      expect(purchase.purch_total).toBe(40.09);
      expect(purchase.purchaseItems).toEqual([
        {
          id: String(a._id),
          title: a.crs_title,
          slug: a.crs_slug,
          image: 'https://img',
          price: 29.99,
          qty: 1,
        },
        {
          id: String(b._id),
          title: b.crs_title,
          slug: b.crs_slug,
          image: 'https://img',
          price: 10.1,
          qty: 1,
        },
      ]);
      expect(purchase.purch_is_paid).toBe(false);
      expect(purchase.purch_status).toBe(PurchaseStatusEnum.PENDING);
      expect(purchase.purch_currency).toBe('eur');
      expect(purchase.purch_reference).toMatch(/^KP-\d{8}-[0-9A-F]{6}$/);
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('should take the identity from the authenticated user and trim the billing', async () => {
      const a = course(15);
      coursesFind.mockResolvedValue([a]);

      const purchase = await service.store(
        { courseIds: [String(a._id)], billing },
        buyer,
      );

      expect(purchase.user).toEqual({
        id: buyer.id,
        name: 'Test Buyer',
        email: buyer.email,
        address: {
          line1: '1 rue du Test',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
      });
    });

    it('should avoid floating point errors in the total', async () => {
      const items = [course(0.1), course(0.2), course(19.99)];
      coursesFind.mockResolvedValue(items);

      const purchase = await service.store(
        { courseIds: items.map((c) => String(c._id)), billing },
        buyer,
      );

      expect(purchase.purch_total).toBe(20.29);
    });

    it('should reject a course that is unknown or not validated', async () => {
      coursesFind.mockResolvedValue([course(10)]);

      await expect(
        service.store(
          {
            courseIds: [
              new Types.ObjectId().toString(),
              new Types.ObjectId().toString(),
            ],
            billing,
          },
          buyer,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject the purchase of an own course', async () => {
      const own = course(10, { author: new Types.ObjectId(buyer.id) });
      coursesFind.mockResolvedValue([own]);

      await expect(
        service.store({ courseIds: [String(own._id)], billing }, buyer),
      ).rejects.toThrow(/own course/);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a course that is already owned', async () => {
      const a = course(10);
      coursesFind.mockResolvedValue([a]);
      repository.findOneOrNull.mockResolvedValue({
        purchaseItems: [{ id: String(a._id) }],
      });

      await expect(
        service.store({ courseIds: [String(a._id)], billing }, buyer),
      ).rejects.toThrow(/already own the course "Course 10"/);
      expect(repository.findOneOrNull).toHaveBeenCalledWith({
        'user.id': buyer.id,
        purch_is_paid: true,
        'purchaseItems.id': { $in: [String(a._id)] },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should mark a free order as paid and send the receipt', async () => {
      const free = course(0);
      coursesFind.mockResolvedValue([free]);

      const purchase = await service.store(
        { courseIds: [String(free._id)], billing },
        buyer,
      );

      expect(purchase.purch_total).toBe(0);
      expect(purchase.purch_is_paid).toBe(true);
      expect(purchase.purch_status).toBe(PurchaseStatusEnum.PAID);
      expect(purchase.purch_paid_at).toBeInstanceOf(Date);
      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: buyer.email }),
      );
    });

    it('should not fail the order when the receipt cannot be sent', async () => {
      const free = course(0);
      coursesFind.mockResolvedValue([free]);
      mailer.sendMail.mockRejectedValue(new Error('smtp down'));
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(
        service.store({ courseIds: [String(free._id)], billing }, buyer),
      ).resolves.toMatchObject({ purch_is_paid: true });
    });
  });

  describe('findOwned', () => {
    it('should return the purchase to its owner and to a super admin only', async () => {
      const purchase = { _id: new Types.ObjectId(), user: { id: buyer.id } };
      repository.findById.mockResolvedValue(purchase);

      await expect(
        service.findOwned(String(purchase._id), buyer),
      ).resolves.toBe(purchase);
      await expect(
        service.findOwned(String(purchase._id), {
          ...buyer,
          id: new Types.ObjectId().toString(),
          role: RoleEnum.SUPERADMIN,
        }),
      ).resolves.toBe(purchase);
      await expect(
        service.findOwned(String(purchase._id), {
          ...buyer,
          id: new Types.ObjectId().toString(),
          role: RoleEnum.ADMIN,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('markPaid', () => {
    const pending = () => ({
      _id: new Types.ObjectId(),
      purch_total: 40.09,
      purch_currency: 'eur',
      purch_is_paid: false,
      user: { email: buyer.email },
      purchaseItems: [] as ICourse[],
    });

    it('should mark the purchase as paid when amount and currency match', async () => {
      const purchase = pending();
      repository.findOneOrNull.mockResolvedValue(purchase);
      repository.findOneAndUpdate.mockResolvedValue({
        ...purchase,
        purch_is_paid: true,
      });

      await service.markPaid(String(purchase._id), 'pi_1', 4009, 'EUR');

      expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: purchase._id, purch_is_paid: false },
        expect.objectContaining({
          purch_is_paid: true,
          purch_payment_intent_id: 'pi_1',
        }),
      );
      expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a lower amount', 4008, 'eur'],
      ['another currency', 4009, 'usd'],
    ])('should ignore %s', async (_label, amount, currency) => {
      const purchase = pending();
      repository.findOneOrNull.mockResolvedValue(purchase);

      await service.markPaid(String(purchase._id), 'pi_1', amount, currency);

      expect(repository.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('should do nothing for an already paid purchase', async () => {
      repository.findOneOrNull.mockResolvedValue({
        ...pending(),
        purch_is_paid: true,
      });

      await service.markPaid(
        new Types.ObjectId().toString(),
        'pi_1',
        4009,
        'eur',
      );

      expect(repository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should not send a receipt when a concurrent update already paid it', async () => {
      repository.findOneOrNull.mockResolvedValue(pending());
      repository.findOneAndUpdate.mockResolvedValue(null);

      await service.markPaid(
        new Types.ObjectId().toString(),
        'pi_1',
        4009,
        'eur',
      );

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });
  });
});
