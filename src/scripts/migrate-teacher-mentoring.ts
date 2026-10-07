import 'dotenv/config';
import mongoose from 'mongoose';

const DEFAULT_HOURLY_RATE = 50;

const migrate = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGO_URI);
  const teachers = mongoose.connection.collection('teachers');

  const mentors = await teachers.updateMany(
    { tchr_is_mentor: { $exists: false } },
    { $set: { tchr_is_mentor: true } },
  );

  const rates = await teachers.updateMany(
    { tchr_hourly_rate: { $exists: false } },
    { $set: { tchr_hourly_rate: DEFAULT_HOURLY_RATE } },
  );

  console.log(`Teachers set as mentors: ${mentors.modifiedCount}`);
  console.log(
    `Hourly rates set to ${DEFAULT_HOURLY_RATE}: ${rates.modifiedCount}`,
  );

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
