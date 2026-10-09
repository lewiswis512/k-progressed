import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ValidationError, useContainer } from 'class-validator';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { join } from 'path';

const siteName = 'K-Progressed';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const port = process.env.PORT || 4000;

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('/api');
  app.enableCors({ origin: [process.env.FRONTEND_URL] });
  app.useGlobalPipes(
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
    }),
  );

  app.use('/api/webhook', express.raw({ type: 'application/json' }));
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const config = new DocumentBuilder()
    .setTitle(siteName)
    .setDescription(`${siteName} API Description`)
    .setVersion('1.0')
    .addTag(`${siteName.toLowerCase()}.api`)
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.use('/assets', express.static(join(__dirname, '..', 'assets')));

  app.use(
    '/uploads/courses',
    express.static(path.resolve(__dirname, '../src/uploads/courses')),
  );
  app.use(
    '/uploads/lessons/photos',
    express.static(path.resolve(__dirname, '../src/uploads/lessons/photos')),
  );
  app.use(
    '/assets/img/elearn-light.png',
    express.static(
      path.resolve(__dirname, '../src/assets/img/elearn-light.png'),
    ),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/') {
      return res.redirect('/api');
    }
    next();
  });

  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on port ${port}`);
}

bootstrap();
