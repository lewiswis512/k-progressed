import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbstractDocument } from '../../common/document/abstract.document';
import { User } from '../users/schemas/user.schema';
import { Course } from '../learning/schemas/course.schema';

@Schema({ collection: 'certificates' })
export class Certificate extends AbstractDocument {
  @Prop({ type: String, required: true, unique: true })
  cert_number: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Course;

  @Prop({ type: String, required: true })
  cert_student_name: string;

  @Prop({ type: String, required: true })
  cert_course_title: string;

  @Prop({ type: String })
  cert_teacher_name: string;

  @Prop({ type: Date, default: () => new Date() })
  cert_issued_at: Date;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);

CertificateSchema.index({ user: 1, course: 1 }, { unique: true });
