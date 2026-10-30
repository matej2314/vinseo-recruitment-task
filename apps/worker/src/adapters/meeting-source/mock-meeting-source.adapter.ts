import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingSourcePayload } from '@vinseo/contracts';

import type {
  FetchMeetingSourceInput,
  MeetingSourcePort,
} from './meeting-source.port.js';
import { meetingSourcePayloadSchema } from './meeting-source.zod.js';

const FIXTURES: Record<string, string> = {
  'demo-client-budget-pl': 'demo-client-budget-pl.json',
};

async function readFixtureFile(fileName: string): Promise<string> {
  const candidates = [
    join(process.cwd(), 'dist/adapters/meeting-source/fixtures', fileName),
    join(process.cwd(), 'src/adapters/meeting-source/fixtures', fileName),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return await readFile(candidate, 'utf8');
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Meeting fixture file not found: ${fileName}`);
}

@Injectable()
export class MockMeetingSourceAdapter implements MeetingSourcePort {
  async fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload> {
    const key = input.fixtureKey ?? input.externalMeetingId;
    const fileName = FIXTURES[key];
    if (!fileName) {
      throw new NotFoundException(`Unknown meeting fixture: ${key}`);
    }

    const raw = JSON.parse(await readFixtureFile(fileName)) as Record<
      string,
      unknown
    >;

    // Anti-corruption: drop vendor summary before validation/persist path
    const { summary: _ignoredVendorSummary, ...rest } = raw;

    const parsed = meetingSourcePayloadSchema.safeParse(rest);
    if (!parsed.success) {
      throw new Error(
        `Invalid meeting source fixture ${key}: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }
}
