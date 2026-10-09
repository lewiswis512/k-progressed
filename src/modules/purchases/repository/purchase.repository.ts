import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Purchase } from '../schemas/purchase.schema';
import {
  IRevenue,
  ISalesByDay,
  ITopCourse,
} from '../../../interfaces/statistic/IStatistic';

export class PurchaseRepository extends AbstractRepository<Purchase> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,
  ) {
    super(purchaseModel);
  }

  async paginate(
    filterQuery: FilterQuery<Purchase>,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.purchaseModel
        .find(filterQuery)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.purchaseModel.countDocuments(filterQuery),
    ]);

    return { page, limit, total, totalPages: Math.ceil(total / limit), data };
  }

  async revenueSince(since?: Date): Promise<IRevenue | undefined> {
    const match: FilterQuery<Purchase> = { purch_is_paid: true };

    if (since) {
      match.purch_paid_at = { $gte: since };
    }

    const [result] = await this.purchaseModel.aggregate<IRevenue>([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $ifNull: [
                '$purch_total',
                {
                  $sum: {
                    $map: {
                      input: '$purchaseItems',
                      as: 'item',
                      in: { $toDouble: '$$item.price' },
                    },
                  },
                },
              ],
            },
          },
          orders: { $sum: 1 },
        },
      },
    ]);

    return result;
  }

  async topCourses(limit: number): Promise<ITopCourse[]> {
    return this.purchaseModel.aggregate<ITopCourse>([
      { $match: { purch_is_paid: true } },
      { $unwind: '$purchaseItems' },
      {
        $group: {
          _id: '$purchaseItems.id',
          title: { $first: '$purchaseItems.title' },
          sales: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$purchaseItems.price' } },
        },
      },
      { $sort: { sales: -1, revenue: -1 } },
      { $limit: limit },
    ]);
  }

  async salesByDaySince(since: Date): Promise<ISalesByDay[]> {
    return this.purchaseModel.aggregate<ISalesByDay>([
      { $match: { purch_is_paid: true, purch_paid_at: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$purch_paid_at' },
          },
          revenue: { $sum: '$purch_total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}
