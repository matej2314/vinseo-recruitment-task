import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    eventType: string;
    userId?: string;
    resourceId?: string;
    requestId?: string;
    resultCode?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        eventType: input.eventType,
        userId: input.userId,
        resourceId: input.resourceId,
        requestId: input.requestId,
        resultCode: input.resultCode,
      },
    });
  }
}
