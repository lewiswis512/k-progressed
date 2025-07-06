import { MARKETING_LESSONS } from './marketing-lesson';
import { FINANCE_LESSONS } from './finance-lesson';

export type LESSON_DOMAIN = typeof MARKETING_LESSONS | typeof FINANCE_LESSONS;
