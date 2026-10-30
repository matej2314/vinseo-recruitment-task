import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MeetingProcessJobPayload } from '@vinseo/contracts';

import {
  MEETING_SOURCE_PORT,
  type MeetingSourcePort,
} from '../adapters/meeting-source/meeting-source.port.js';
import { MeetingRepository } from './meeting-repository.js';
import { redactSegments } from './redaction/redact-segments.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

@Injectable()
export class MeetingProcessOrchestrator {
  private readonly logger = new Logger(MeetingProcessOrchestrator.name);

  constructor(
    @Inject(MEETING_SOURCE_PORT)
    private readonly source: MeetingSourcePort,
    private readonly meetings: MeetingRepository,
    private readonly summarize: SummarizeMeetingUseCase,
  ) {}

  async run(payload: MeetingProcessJobPayload): Promise<void> {
    const externalMeetingId = String(payload.externalMeetingId);
    await this.meetings.upsertPending(externalMeetingId);
    await this.meetings.markProcessing(externalMeetingId);

    const fetched = await this.source.fetch({
      externalMeetingId,
      fixtureKey:
        payload.fixtureKey !== undefined
          ? String(payload.fixtureKey)
          : undefined,
    });

    const redactedSegments = redactSegments(fetched.segments);

    const summarized = await this.summarize.execute(redactedSegments);
    if (!summarized.ok) {
      await this.meetings.markFailed(externalMeetingId, summarized.reason);
      this.logger.warn(
        `Meeting ${externalMeetingId} failed: ${summarized.reason}`,
      );
      return;
    }

    await this.meetings.persistSuccess({
      externalMeetingId,
      source: fetched,
      redactedSegments,
      summary: summarized.summary,
    });
  }
}
