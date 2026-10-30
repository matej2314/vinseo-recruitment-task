import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { WorkerEnv } from '../../config/env.schema.js';
import type {
  LlmClientPort,
  SummarizeMeetingInput,
} from './llm-client.port.js';

@Injectable()
export class MockLlmAdapter implements LlmClientPort {
  constructor(private readonly config: ConfigService<WorkerEnv, true>) {}

  async summarizeMeeting(input: SummarizeMeetingInput): Promise<unknown> {
    const mode = this.config.get('LLM_MOCK_MODE', { infer: true });

    if (mode === 'invalid' && !input.repairPass) {
      return { shortSummary: 123, decisions: 'nope' };
    }

    if (mode === 'invalid' && input.repairPass) {
      // drugi pass nadal zły → fail-closed po jednym retry
      return { broken: true };
    }

    return {
      shortSummary:
        'Ustalono budżet 50k PLN na kampanię Brand Lift w listopadzie.',
      decisions: ['Budget 50k PLN na Brand Lift w listopadzie'],
      actionItems: [
        {
          assignee: 'Anna Kowalska',
          description: 'Przygotować brief kampanii',
          dueDate: '2026-10-18',
        },
      ],
    };
  }
}
