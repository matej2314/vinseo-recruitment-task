import { DevEnqueueController } from './dev-enqueue.controller.js';
import { MeetingsModule } from './meetings.module.js';

describe('MeetingsModule.register', () => {
  const previous = process.env.NODE_ENV;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  });

  it('registers DevEnqueueController outside production', () => {
    process.env.NODE_ENV = 'development';
    const dynamic = MeetingsModule.register();
    expect(dynamic.controllers).toContain(DevEnqueueController);
  });

  it('does not register DevEnqueueController in production', () => {
    process.env.NODE_ENV = 'production';
    const dynamic = MeetingsModule.register();
    expect(dynamic.controllers).toEqual([]);
  });
});
