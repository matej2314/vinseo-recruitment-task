import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DemoModule } from './demo/demo.module.js';
import { HealthModule } from './health/health.module.js';
import { DevMeetingsModule } from './meetings/dev-meetings.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    MeetingsModule,
    DemoModule,
    ...(isProduction ? [] : [DevMeetingsModule]),
  ],
})
export class AppModule {}
