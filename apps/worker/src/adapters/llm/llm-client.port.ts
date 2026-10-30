import type { SourceSegment } from '@vinseo/contracts';

export const LLM_CLIENT_PORT = Symbol('LLM_CLIENT_PORT');

export interface SummarizeMeetingInput {
  readonly segments: readonly SourceSegment[];
  readonly repairPass?: boolean;
}

export interface LlmClientPort {
  summarizeMeeting(input: SummarizeMeetingInput): Promise<unknown>;
}
