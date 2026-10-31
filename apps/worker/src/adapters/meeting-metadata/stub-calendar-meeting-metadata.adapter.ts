import { Injectable, NotImplementedException } from '@nestjs/common';
import type { MeetingMetadataPayload } from '@vinseo/contracts';

import type {
  FetchMeetingMetadataInput,
  MeetingMetadataPort,
} from './meeting-metadata.port.js';

/**
 * Zaślepka v0 portu metadanych (Calendar).
 * Happy-path pipeline **nie** woła tego adaptera.
 * Etap 1+: podmiana na prawdziwy klient Calendar API (ten sam port).
 */
@Injectable()
export class StubCalendarMeetingMetadataAdapter implements MeetingMetadataPort {
  async fetch(
    _input: FetchMeetingMetadataInput,
  ): Promise<MeetingMetadataPayload> {
    throw new NotImplementedException(
      'Calendar meeting metadata adapter is a v0 stub; Google Calendar API lands in stage 1+',
    );
  }
}
