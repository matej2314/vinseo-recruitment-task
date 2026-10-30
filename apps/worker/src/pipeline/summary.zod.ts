import { z } from 'zod';

export const actionItemSchema = z.object({
  assignee: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.iso.date().nullable(),
});

export const meetingSummarySchema = z.object({
  shortSummary: z.string().min(1),
  decisions: z.array(z.string()),
  actionItems: z.array(actionItemSchema),
});

export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
