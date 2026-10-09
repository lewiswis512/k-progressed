import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as bodyParser from 'body-parser';
import { useContainer, ValidationError } from 'class-validator';
import * as express from 'express';
import helmet from 'helmet';
import { Server } from 'http';
import { Model } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/modules/users/schemas/user.schema';
import { assertNotDotenvMongoUri } from '../setup/dotenv-values';

export interface IMailerMock {
  sendMail: jest.Mock;
}

export interface ITestApp {
  app: INestApplication;
  moduleRef: TestingModule;
  mailer: IMailerMock;
  http: Server;
}

export const validationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (validationErrors: ValidationError[] = []) => {
      return new BadRequestException(
        validationErrors.map((error) => ({
          field: error.property,
          error: Object.values(error.constraints ?? {})[0],
        })),
      );
    },
    stopAtFirstError: true,
  });

export const configureApp = (app: INestApplication): void => {
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('/api');
  app.enableCors({ origin: [process.env.FRONTEND_URL] });
  app.useGlobalPipes(validationPipe());
  app.use('/api/webhook', express.raw({ type: 'application/json' }));
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
};

const unlimitedThrottlerStorage = {
  increment: async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
};

export async function createApp(
  options: { throttle?: boolean } = {},
): Promise<ITestApp> {
  const mailer: IMailerMock = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailerService)
    .useValue(mailer);

  if (!options.throttle) {
    builder = builder
      .overrideProvider(getStorageToken())
      .useValue(unlimitedThrottlerStorage);
  }

  const moduleRef = await builder.compile();
  const userModel: Model<User> = moduleRef.get(getModelToken(User.name));
  const database = userModel.db;

  assertNotDotenvMongoUri(process.env.MONGO_URI);

  if (database.host !== '127.0.0.1' || !database.name.startsWith('kp-e2e-')) {
    await moduleRef.close();
    throw new Error(
      `Refusing to run the e2e tests against ${database.host}/${database.name}`,
    );
  }

  const app = moduleRef.createNestApplication({ bodyParser: false });

  configureApp(app);
  await app.init();

  return { app, moduleRef, mailer, http: app.getHttpServer() };
}
