import {
  Injectable,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import type { MeetingStatusEventDto } from '@vinseo/contracts';
import {
  Observable,
  distinctUntilChanged,
  interval,
  map,
  startWith,
  switchMap,
  takeWhile,
} from 'rxjs';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import { AuditWriterService } from '../audit/audit-writer.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

const POLL_MS = 1000;

@Injectable()
export class MeetingEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
    private readonly audit: AuditWriterService,
  ) {}

  async stream(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<Observable<MessageEvent>> {
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

    const exists = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    return interval(POLL_MS).pipe(
      startWith(0),
      switchMap(async () => {
        const m = await this.prisma.meeting.findUniqueOrThrow({
          where: { id: meetingId },
        });
        const payload: MeetingStatusEventDto = {
          meetingId: m.id,
          processingStatus: m.processingStatus,
          ...(m.processingStatus === 'completed'
            ? { title: m.title, summary: m.summary }
            : {}),
          ...(m.processingStatus === 'failed'
            ? { failureReason: m.failureReason }
            : {}),
        };
        return payload;
      }),
      distinctUntilChanged(
        (a, b) => a.processingStatus === b.processingStatus,
      ),
      map((data) => ({ data }) as MessageEvent),
      takeWhile((ev) => {
        const status = (ev.data as MeetingStatusEventDto).processingStatus;
        return status !== 'completed' && status !== 'failed';
      }, true),
    );
  }
}
