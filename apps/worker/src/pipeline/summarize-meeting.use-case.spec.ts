import type { LlmClientPort } from '../adapters/llm/llm-client.port.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

const segments = [
  { speaker: 'A', text: 'hello', startMs: 0 },
] as const;

describe('SummarizeMeetingUseCase', () => {
  it('returns ok summary on first valid LLM payload', async () => {
    const llm: LlmClientPort = {
      summarizeMeeting: jest.fn().mockResolvedValue({
        shortSummary: 'ok',
        decisions: [],
        actionItems: [],
      }),
    };
    const useCase = new SummarizeMeetingUseCase(llm);
    const result = await useCase.execute(segments);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.shortSummary).toBe('ok');
    }
    expect(llm.summarizeMeeting).toHaveBeenCalledTimes(1);
  });

  it('retries once then fails closed', async () => {
    const llm: LlmClientPort = {
      summarizeMeeting: jest
        .fn()
        .mockResolvedValueOnce({ bad: true })
        .mockResolvedValueOnce({ still: 'bad' }),
    };
    const useCase = new SummarizeMeetingUseCase(llm);
    const result = await useCase.execute(segments);
    expect(result).toEqual({
      ok: false,
      reason: 'SUMMARY_VALIDATION_FAILED_AFTER_RETRY',
    });
    expect(llm.summarizeMeeting).toHaveBeenCalledTimes(2);
    expect(llm.summarizeMeeting).toHaveBeenNthCalledWith(2, {
      segments,
      repairPass: true,
    });
  });
});
