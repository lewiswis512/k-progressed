import { CourseStatusEnum } from '../../utils/enums/course-status.enum';

export interface IRevenue {
  revenue: number;
  orders: number;
}

export interface ICourseStatusCount {
  _id: CourseStatusEnum;
  count: number;
}

export interface ITopCourse {
  _id: string;
  title: string;
  sales: number;
  revenue: number;
}

export interface ISalesByDay {
  _id: string;
  revenue: number;
  orders: number;
}
