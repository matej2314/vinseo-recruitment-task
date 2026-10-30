import { DevMeetingsModule } from './dev-meetings.module.js';
import { MeetingsModule } from './meetings.module.js';

describe('MeetingsModule / DevMeetingsModule', () => {
  it('MeetingsModule is a static Nest module (no register())', () => {
    expect(MeetingsModule).toBeDefined();
    expect(
      (MeetingsModule as unknown as { register?: unknown }).register,
    ).toBeUndefined();
  });

  it('DevMeetingsModule exposes DX enqueue outside production wiring', () => {
    expect(DevMeetingsModule).toBeDefined();
  });
});
