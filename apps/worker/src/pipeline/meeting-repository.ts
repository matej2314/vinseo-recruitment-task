import { Injectable } from '@nestjs/common';
import { Prisma, type ProcessingStatus } from '@prisma/client';
import type { MeetingSourcePayload, SourceSegment } from '@vinseo/contracts';

import { PrismaService } from '../prisma/prisma.service.js';
import { resolveClientLink } from './client-link.js';
import type { MeetingSummary } from './summary.zod.js';

@Injectable()
export class MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertPending(externalMeetingId: string): Promise<{ id: string }> {
    return this.prisma.meeting.upsert({
      where: { externalMeetingId },
      create: {
        externalMeetingId,
        processingStatus: 'pending',
        title: null,
      },
      update: {},
      select: { id: true },
    });
  }

  async markProcessing(externalMeetingId: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { externalMeetingId },
      data: { processingStatus: 'processing' },
    });
  }

  async persistSuccess(input: {
    readonly externalMeetingId: string;
    readonly source: MeetingSourcePayload;
    readonly redactedSegments: readonly SourceSegment[];
    readonly summary: MeetingSummary;
  }): Promise<void> {
    const link = await resolveClientLink(
      input.source.participants,
      async (emailDomain) =>
        this.prisma.client.findUnique({
          where: { emailDomain },
          select: { id: true },
        }),
    );

    await this.prisma.meeting.update({
      where: { externalMeetingId: input.externalMeetingId },
      data: {
        title: input.source.title,
        startedAt: new Date(input.source.startedAt),
        transcriptSegments:
          input.redactedSegments as unknown as Prisma.InputJsonValue,
        summary: input.summary as unknown as Prisma.InputJsonValue,
        processingStatus: 'completed',
        failureReason: null,
        clientLinkStatus: link.status,
        clientId: link.clientId,
        externalParticipants:
          link.externalParticipants === null
            ? Prisma.DbNull
            : (link.externalParticipants as unknown as Prisma.InputJsonValue),
      },
    });
  }

  async markFailed(externalMeetingId: string, reason: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { externalMeetingId },
      data: {
        processingStatus: 'failed' satisfies ProcessingStatus,
        failureReason: reason,
      },
    });
  }
}
