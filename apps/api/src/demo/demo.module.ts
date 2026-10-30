import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { DemoController } from './demo.controller.js';

@Module({
  imports: [AuthModule, MeetingsModule],
  controllers: [DemoController],
})
export class DemoModule {}
