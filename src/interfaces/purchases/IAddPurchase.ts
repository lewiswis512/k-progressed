import {
  ICourse,
  IUserInfo,
} from '../../modules/purchases/schemas/purchase.schema';
import { PaymentMethodEnum } from '../../utils/enums/payment-method.enum';

export interface IAddPurchase {
  purch_reference: string;
  payment_method: PaymentMethodEnum;
  user: IUserInfo;
  purchaseItems: ICourse[];
}
