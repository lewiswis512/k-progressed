import { PartialType } from '@nestjs/swagger';
import { SaveFaq } from './save-faq.dto';

export class EditFaq extends PartialType(SaveFaq) {}
