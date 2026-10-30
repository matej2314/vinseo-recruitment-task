import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import type { ApiEnv } from './config/env.schema.js';
import { createApiValidationPipe } from './http/create-api-validation-pipe.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(createApiValidationPipe());

  const config = app.get(ConfigService<ApiEnv, true>);
  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
}

await bootstrap();
