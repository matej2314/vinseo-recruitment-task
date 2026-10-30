import type { SourceSegment } from '@vinseo/contracts';

import { redactText } from './redact-text.js';

export function redactSegments(
  segments: readonly SourceSegment[],
): SourceSegment[] {
  return segments.map((segment) => ({
    speaker: segment.speaker,
    startMs: segment.startMs,
    text: redactText(segment.text),
  }));
}
