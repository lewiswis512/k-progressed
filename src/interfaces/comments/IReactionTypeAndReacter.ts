import { ReactionComment } from '../../modules/comments/types/TReactionComment';

export interface IReactionFields {
  count: 'comm_count_like' | 'comm_count_dislike';
  users: 'comm_liked_by' | 'comm_disliked_by';
}

export type IReactionTypeAndReacter = Record<ReactionComment, IReactionFields>;

export type IReactionCounts = Partial<Record<IReactionFields['count'], number>>;
