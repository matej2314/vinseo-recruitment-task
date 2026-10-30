import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingDetailDto } from '@vinseo/contracts';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import { AuditWriterService } from '../audit/audit-writer.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GetMeetingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
    private readonly audit: AuditWriterService,
  ) {}

  async execute(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<MeetingDetailDto> {
    const decision = await this.access.canReadMeeting(user, meetingId);
    if (decision === 'deny') {
      await this.audit.write({
        eventType: 'meeting.access.denied',
        userId: user.id,
        resourceId: meetingId,
        resultCode: 'DENY',
      });
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    const m = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!m) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    return {
      id: m.id,
      title: m.title,
      startedAt: m.startedAt?.toISOString() ?? null,
      durationSeconds: m.durationSeconds,
      organizerId: m.organizerId,
      clientId: m.clientId,
      clientLinkStatus: m.clientLinkStatus,
      confidential: m.confidential,
      processingStatus: m.processingStatus,
      summary: m.summary,
      externalParticipants: m.externalParticipants,
      failureReason: m.failureReason,
    };
  }
}
