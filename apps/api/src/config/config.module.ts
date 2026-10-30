import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateApiEnv } from './env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateApiEnv,
    }),
  ],
})
export class AppConfigModule {}
