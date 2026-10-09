export interface IAddCommentDto {
  comm_content: string;
  comm_rating?: number;
  comment_id?: string | null;
  course_id?: string;
  lesson_id?: string;
}
