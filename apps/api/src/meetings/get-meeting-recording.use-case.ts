import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  asExternalMeetingId,
  type MeetingRecordingDto,
} from '@vinseo/contracts';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import {
  MEETING_RECORDING_PORT,
  type MeetingRecordingPort,
} from '../adapters/meeting-recording/meeting-recording.port.js';
import { AuditWriterService } from '../audit/audit-writer.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GetMeetingRecordingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
    private readonly audit: AuditWriterService,
    @Inject(MEETING_RECORDING_PORT)
    private readonly recording: MeetingRecordingPort,
  ) {}

  async execute(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<MeetingRecordingDto> {
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
      select: { id: true, externalMeetingId: true },
    });
    if (!m) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    // Świadomie: brak prisma.*.update / create z polem URL — D-7b.
    return this.recording.resolve({
      externalMeetingId: asExternalMeetingId(m.externalMeetingId),
    });
  }
}
