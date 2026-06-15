import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer, ValidationError } from 'class-validator';
import { MailerService } from '@nestjs-modules/mailer';
import { AppModule } from '../../src/app.module';

export async function createApp(): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailerService)
    .useValue({ sendMail: jest.fn().mockResolvedValue(undefined) })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('/api');
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (validationErrors: ValidationError[] = []) =>
        new BadRequestException(
          validationErrors.map((error) => ({
            field: error.property,
            error: Object.values(error.constraints)[0],
          })),
        ),
      stopAtFirstError: true,
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  await app.init();

  return { app, moduleRef };
}
