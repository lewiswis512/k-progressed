import { Request } from 'express';

export interface IRequestUser {
  id: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  slug?: string;
  photo?: string;
  type: number;
  role: number;
  customerId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: IRequestUser;
}
