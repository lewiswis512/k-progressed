import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { LoadDataModule } from '../modules/load-data/load-data.module';
import { LoadDataService } from '../modules/load-data/load-data.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    LoadDataModule,
  ],
})
class SeedModule {}

const seed = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding is disabled when NODE_ENV is production');
  }

  if (!process.argv.includes('--yes')) {
    throw new Error(
      'Seeding deletes every user, course, section, lesson, teacher, category and FAQ. Run it again with --yes to confirm.',
    );
  }

  const app = await NestFactory.createApplicationContext(SeedModule);

  await app.get(LoadDataService).loadData();
  await app.close();

  console.info('Database seeded');
};

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
