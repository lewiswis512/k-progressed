import { ICourseWithAverageRating } from '../../../interfaces/courses/ICourseWithAverageRating';

export interface ICoursePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ICourseWithAverageRating[];
}
