import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { StripeEvent } from '../schemas/stripe-event.schema';

export class StripeEventRepository extends AbstractRepository<StripeEvent> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(StripeEvent.name) private stripeEventModel: Model<StripeEvent>,
  ) {
    super(stripeEventModel);
  }
}
