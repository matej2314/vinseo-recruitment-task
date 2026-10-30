import { Module } from '@nestjs/common';

import { LLM_CLIENT_PORT } from './llm-client.port.js';
import { MockLlmAdapter } from './mock-llm.adapter.js';

@Module({
  providers: [
    MockLlmAdapter,
    { provide: LLM_CLIENT_PORT, useExisting: MockLlmAdapter },
  ],
  exports: [LLM_CLIENT_PORT],
})
export class LlmModule {}
