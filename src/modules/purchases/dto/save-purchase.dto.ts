import { PaymentMethodEnum } from '../../../utils/enums/payment-method.enum';
import { ICourse, IUserInfo } from '../schemas/purchase.schema';

export class SavePurchase {
  payment_method: PaymentMethodEnum;
  user: IUserInfo;
  purchaseItems: ICourse[];
}
