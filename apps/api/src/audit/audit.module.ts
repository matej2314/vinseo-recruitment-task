import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditWriterService } from './audit-writer.service.js';

@Module({
  imports: [PrismaModule],
  providers: [AuditWriterService],
  exports: [AuditWriterService],
})
export class AuditModule {}
