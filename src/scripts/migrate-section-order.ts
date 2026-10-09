import 'dotenv/config';
import mongoose from 'mongoose';
import {
  Section,
  SectionSchema,
} from '../modules/learning/schemas/section.schema';

const migrate = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGO_URI);
  const sections = mongoose.model(Section.name, SectionSchema);

  const courseIds = await sections.distinct('course', {
    sect_order: { $exists: false },
  });

  let updated = 0;

  for (const courseId of courseIds) {
    const courseSections = await sections
      .find({ course: courseId })
      .sort({ sect_order: 1, created_at: -1, _id: 1 })
      .select('_id')
      .lean();

    const result = await sections.bulkWrite(
      courseSections.map((section, index) => ({
        updateOne: {
          filter: { _id: section._id },
          update: { $set: { sect_order: index + 1 } },
        },
      })),
    );

    updated += result.modifiedCount;
  }

  console.log(`Courses: ${courseIds.length}`);
  console.log(`Sections ordered: ${updated}`);

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
