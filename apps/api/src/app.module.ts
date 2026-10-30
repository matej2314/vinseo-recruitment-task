import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    MeetingsModule.register(),
  ],
})
export class AppModule {}
