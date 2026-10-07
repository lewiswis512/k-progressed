import { Faq } from '../../modules/faq/schemas/faq.schema';

export const FAQS: Pick<Faq, 'faq_question' | 'faq_answer' | 'faq_order'>[] = [
  {
    faq_question: 'How do I enroll in a course?',
    faq_answer:
      'Create an account, add the course to your cart and complete the checkout. Free courses can be started right away.',
    faq_order: 1,
  },
  {
    faq_question: 'How long do I have access to a course after purchase?',
    faq_answer:
      'Once purchased, a course is yours for life. You can come back to its lessons at any time from your learning space.',
    faq_order: 2,
  },
  {
    faq_question: 'Which payment methods are accepted?',
    faq_answer:
      'Payments are processed securely by Stripe. All major credit and debit cards are accepted.',
    faq_order: 3,
  },
  {
    faq_question: 'Can I book a call with a mentor?',
    faq_answer:
      'Yes. Browse the mentors page, pick a teacher and choose a date and time that suits you. You will receive a confirmation by email.',
    faq_order: 4,
  },
  {
    faq_question: 'How can I become a teacher on K-Progressed?',
    faq_answer:
      'Sign in and go to "Become a teacher". Once your profile is set up you can create courses, sections and lessons from the admin space.',
    faq_order: 5,
  },
];
