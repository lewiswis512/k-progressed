import 'dotenv/config';
import mongoose from 'mongoose';
import { CourseStatusEnum } from '../utils/enums/course-status.enum';

const migrate = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGO_URI);
  const courses = mongoose.connection.collection('courses');

  const validated = await courses.updateMany(
    { crs_status: { $exists: false }, crs_isValid: true },
    { $set: { crs_status: CourseStatusEnum.VALIDATED } },
  );

  const pending = await courses.updateMany(
    { crs_status: { $exists: false } },
    { $set: { crs_status: CourseStatusEnum.PENDING } },
  );

  const cleaned = await courses.updateMany(
    {
      $or: [
        { crs_isValid: { $exists: true } },
        { crs_isApprouved: { $exists: true } },
      ],
    },
    { $unset: { crs_isValid: '', crs_isApprouved: '' } },
  );

  console.log(`Validated: ${validated.modifiedCount}`);
  console.log(`Pending: ${pending.modifiedCount}`);
  console.log(`Old fields removed: ${cleaned.modifiedCount}`);

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
