import { Injectable } from '@nestjs/common';
import { StripeCustomerRepository } from '../../modules/users/repository/stripe-customer.repository';
import { StripeService } from '../payment/service/stripe.service';
import { StripeCustomer } from '../payment/schemas/stripe-customer.schema';

@Injectable()
export class StripeCustomerService extends StripeService {
  constructor(private stripeCustomerRepository: StripeCustomerRepository) {
    super();
  }

  async createCustomer(name: string, email: string) {
    const customerStripe = await this.stripe.customers.create({
      name,
      email,
    });

    const data: Partial<StripeCustomer> = {
      customer_id: customerStripe.id,
      strp_cus_email: email,
      strp_cus_name: name,
      strp_cus_city: null,
      strp_cus_country: null,
      strp_cus_postal_code: null,
      strp_cus_postal_address_line1: null,
      strp_cus_postal_address_line2: null,
      strp_cus_phone: null,
    };

    return await this.stripeCustomerRepository.create(data);
  }
}
