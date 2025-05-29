import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { IAddPurchase } from '../../interfaces/purchases/IAddPurchase';
import { PurchaseRepository } from './repository/purchase.repository';
import { Purchase } from './schemas/purchase.schema';
import { SavePurchase } from './dto/save-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private purchaseRepository: PurchaseRepository) {}

  async findAll() {
    return await this.purchaseRepository.find();
  }

  async findById(id: string): Promise<Purchase> {
    return await this.purchaseRepository.findById(new Types.ObjectId(id));
  }

  async store(purchase: SavePurchase) {
    const todayInTime = Date.now();
    const purchaseReference = `ref-${todayInTime}`;

    const data: IAddPurchase = {
      ...purchase,
      purch_reference: purchaseReference,
    };

    try {
      return await this.purchaseRepository.create(data);
    } catch (error) {
      console.error('Error saving purchase:', error);
      throw error;
    }
  }

  async validatePurchase(id: string): Promise<Purchase> {
    return await this.purchaseRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        purch_is_paid: true,
      },
    );
  }
}
