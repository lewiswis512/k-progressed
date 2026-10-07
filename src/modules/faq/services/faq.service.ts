import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { EditFaq } from '../dtos/edit-faq.dto';
import { SaveFaq } from '../dtos/save-faq.dto';
import { FaqRepository } from '../repositories/faq.repository';
import { Faq } from '../schemas/faq.schema';

@Injectable()
export class FaqService {
  constructor(private faqRepository: FaqRepository) {}

  async findPublished(): Promise<Faq[]> {
    return this.faqRepository.find({ faq_isPublished: true });
  }

  async findAll(): Promise<Faq[]> {
    return this.faqRepository.find();
  }

  async findById(id: string): Promise<Faq> {
    return await this.faqRepository.findById(new Types.ObjectId(id));
  }

  async store(saveFaq: SaveFaq): Promise<Faq> {
    return await this.faqRepository.create(saveFaq);
  }

  async update(id: string, editFaq: EditFaq): Promise<Faq> {
    await this.findById(id);

    return this.faqRepository.findByIdAndUpdate(new Types.ObjectId(id), {
      ...editFaq,
      updated_at: new Date(),
    });
  }

  async reorder(ids: string[]): Promise<Faq[]> {
    await this.faqRepository.reorder(ids);

    return this.findAll();
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.faqRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}
