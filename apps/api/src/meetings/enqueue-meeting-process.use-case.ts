import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  MEETING_PROCESS_JOB_NAME,
  type MeetingProcessJobPayload,
} from '@vinseo/contracts';

import { PgBossService } from '../jobs/pg-boss.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface EnqueueMeetingProcessInput {
  readonly fixtureKey: string;
  /**
   * Tożsamość runu / spotkania.
   * DEMO: UUID nadane przez API.
   * DX (pominięte): externalMeetingId = fixtureKey.
   */
  readonly externalMeetingId?: string;
  readonly requestId?: string;
  /** Wymagane przy demo z sesją; DX może pominąć */
  readonly organizerId?: string;
}

export interface EnqueueMeetingProcessResult {
  readonly meetingId: string;
  readonly jobId: string;
  readonly processingStatus: 'pending';
  readonly externalMeetingId: string;
}

@Injectable()
export class EnqueueMeetingProcessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boss: PgBossService,
  ) {}

  async execute(
    input: EnqueueMeetingProcessInput,
  ): Promise<EnqueueMeetingProcessResult> {
    const externalMeetingId = input.externalMeetingId ?? input.fixtureKey;
    const requestId = input.requestId ?? randomUUID();

    const meeting = await this.prisma.meeting.upsert({
      where: { externalMeetingId },
      create: {
        externalMeetingId,
        processingStatus: 'pending',
        ...(input.organizerId ? { organizerId: input.organizerId } : {}),
      },
      update: {
        // ponowne enqueue: update in place - bez drugiego wiersza
        processingStatus: 'pending',
        failureReason: null,
        // nie nadpisuj organizatora przy ponownym enqueue (idempotencja)
      },
      select: { id: true, externalMeetingId: true, processingStatus: true },
    });

    const payload: MeetingProcessJobPayload = {
      externalMeetingId,
      source: 'mock',
      fixtureKey: input.fixtureKey,
      requestId,
    };

    const jobId = await this.boss.client.send(
      MEETING_PROCESS_JOB_NAME,
      payload,
    );

    if (!jobId) {
      throw new Error('Failed to enqueue meeting.process');
    }

    return {
      meetingId: meeting.id,
      jobId,
      processingStatus: 'pending',
      externalMeetingId: meeting.externalMeetingId,
    };
  }
}
