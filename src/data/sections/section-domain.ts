import { FINANCE_SECTIONS } from './finance-sections';
import { MARKETING_SECTIONS } from './marketing-sections';

export type SECTION_DOMAIN =
  | typeof MARKETING_SECTIONS
  | typeof FINANCE_SECTIONS;
