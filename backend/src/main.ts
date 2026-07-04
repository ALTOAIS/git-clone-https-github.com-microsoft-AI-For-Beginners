import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const uploadDir = resolve(config.get<string>('UPLOAD_DIR', './uploads'));
  mkdirSync(uploadDir, { recursive: true });

  app.use(helmet());
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Compliance Risk Hub API')
    .setDescription(
      'REST API for the Compliance Risk Hub compliance-risk-management platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<string>('PORT', '3000');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `Compliance Risk Hub API running on http://localhost:${port}/api (docs at /api/docs)`,
  );
}
bootstrap();
