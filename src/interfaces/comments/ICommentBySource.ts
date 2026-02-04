import { ICommentResponse } from './ICommentResponse';

export interface ICommentBySource {
  comments: ICommentResponse[];
  totalComments: number;
}
