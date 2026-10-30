import { z } from 'zod';

export const sourceParticipantSchema = z.object({
  email: z.string().email().nullable(),
  displayName: z.string().min(1),
  internal: z.boolean(),
});

export const sourceSegmentSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
});

export const meetingSourcePayloadSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  startedAt: z.iso.datetime({ offset: true }),
  participants: z.array(sourceParticipantSchema).min(1),
  segments: z.array(sourceSegmentSchema).min(1),
});

export type MeetingSourcePayloadParsed = z.infer<
  typeof meetingSourcePayloadSchema
>;
