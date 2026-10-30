import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingAccessService } from './meeting-access.service.js';

@Module({
  imports: [PrismaModule],
  providers: [MeetingAccessService],
  exports: [MeetingAccessService],
})
export class AccessModule {}
