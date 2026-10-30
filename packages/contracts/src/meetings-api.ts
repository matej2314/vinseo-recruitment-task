import type { ClientLinkStatus } from './client-link-status.js';
import type { ProcessingStatus } from './processing-status.js';

export interface MeetingListItemDto {
  readonly id: string;
  readonly title: string | null;
  readonly startedAt: string | null;
  readonly durationSeconds: number | null;
  readonly organizerId: string | null;
  readonly clientId: string | null;
  readonly clientLinkStatus: ClientLinkStatus;
  readonly confidential: boolean;
  readonly processingStatus: ProcessingStatus;
}

export interface MeetingListResponseDto {
  readonly items: readonly MeetingListItemDto[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface MeetingDetailDto extends MeetingListItemDto {
  readonly summary: unknown | null;
  readonly externalParticipants: unknown | null;
  readonly failureReason: string | null;
}

export interface MeetingStatusEventDto {
  readonly meetingId: string;
  readonly processingStatus: ProcessingStatus;
  readonly title?: string | null;
  readonly summary?: unknown | null;
}

export interface DemoRunMeetingResponseDto {
  readonly meetingId: string;
  readonly jobId: string;
  readonly status: 'pending';
}

export const MEETING_LIST_LIMITS = [10, 25, 50, 100] as const;
export type MeetingListLimit = (typeof MEETING_LIST_LIMITS)[number];
