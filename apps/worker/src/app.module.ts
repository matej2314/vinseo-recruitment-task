import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [AppConfigModule, PrismaModule],
})
export class AppModule {}
