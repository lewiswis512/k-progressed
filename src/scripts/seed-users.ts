import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserSeeder } from '../database/seeds/user.seed';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(UserSeeder);

  const count = Number(process.argv[2]) || 20;
  await seeder.seed(count);

  await app.close();
}

bootstrap();
