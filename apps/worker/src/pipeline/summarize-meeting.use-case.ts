import { Inject, Injectable } from '@nestjs/common';
import type { SourceSegment } from '@vinseo/contracts';

import {
  LLM_CLIENT_PORT,
  type LlmClientPort,
} from '../adapters/llm/llm-client.port.js';
import {
  meetingSummarySchema,
  type MeetingSummary,
} from './summary.zod.js';

export type SummarizeResult =
  | { readonly ok: true; readonly summary: MeetingSummary }
  | { readonly ok: false; readonly reason: string };

@Injectable()
export class SummarizeMeetingUseCase {
  constructor(
    @Inject(LLM_CLIENT_PORT)
    private readonly llm: LlmClientPort,
  ) {}

  async execute(segments: readonly SourceSegment[]): Promise<SummarizeResult> {
    const first = await this.llm.summarizeMeeting({ segments });
    const parsedFirst = meetingSummarySchema.safeParse(first);
    if (parsedFirst.success) {
      return { ok: true, summary: parsedFirst.data };
    }

    const second = await this.llm.summarizeMeeting({
      segments,
      repairPass: true,
    });
    const parsedSecond = meetingSummarySchema.safeParse(second);
    if (parsedSecond.success) {
      return { ok: true, summary: parsedSecond.data };
    }

    return {
      ok: false,
      reason: 'SUMMARY_VALIDATION_FAILED_AFTER_RETRY',
    };
  }
}
