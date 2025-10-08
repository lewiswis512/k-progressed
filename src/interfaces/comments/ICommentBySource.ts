import { ICommentResponse } from './ICommentResponse';

export interface ICommentBySource {
  comments: ICommentResponse[];
  totalComment: number;
}
