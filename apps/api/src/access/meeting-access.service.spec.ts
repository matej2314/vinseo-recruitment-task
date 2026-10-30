import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { MeetingAccessService } from './meeting-access.service.js';

function user(
  partial: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'id'>,
): AuthenticatedUser {
  return {
    email: `${partial.id}@example.com`,
    role: 'employee',
    ...partial,
  };
}

describe('MeetingAccessService (ACL v1)', () => {
  const meetingId = 'm1';

  function serviceWithPrisma(prisma: {
    meeting: { findUnique: jest.Mock };
  }): MeetingAccessService {
    return new MeetingAccessService(prisma as never);
  }

  it('allows organizer', async () => {
    const svc = serviceWithPrisma({
      meeting: {
        findUnique: jest.fn().mockResolvedValue({
          organizerId: 'u-org',
          participants: [],
        }),
      },
    });
    await expect(
      svc.canReadMeeting(user({ id: 'u-org' }), meetingId),
    ).resolves.toBe('allow');
  });

  it('allows internal participant', async () => {
    const svc = serviceWithPrisma({
      meeting: {
        findUnique: jest.fn().mockResolvedValue({
          organizerId: 'other',
          participants: [{ id: 'p1' }],
        }),
      },
    });
    await expect(
      svc.canReadMeeting(user({ id: 'u-part' }), meetingId),
    ).resolves.toBe('allow');
  });

  it('denies stranger (membership alone is not queried)', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      organizerId: 'other',
      participants: [],
    });
    const svc = serviceWithPrisma({ meeting: { findUnique } });
    await expect(
      svc.canReadMeeting(user({ id: 'stranger' }), meetingId),
    ).resolves.toBe('deny');
    // brak join ProjectMembership w select - tylko organizer + participants
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: meetingId },
      select: {
        organizerId: true,
        participants: {
          where: { userId: 'stranger' },
          select: { id: true },
          take: 1,
        },
      },
    });
  });

  it('allows admin for any meeting including confidential', async () => {
    const findUnique = jest.fn();
    const svc = serviceWithPrisma({ meeting: { findUnique } });
    await expect(
      svc.canReadMeeting(user({ id: 'admin1', role: 'admin' }), meetingId),
    ).resolves.toBe('allow');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('denies when meeting missing', async () => {
    const svc = serviceWithPrisma({
      meeting: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      svc.canReadMeeting(user({ id: 'u1' }), meetingId),
    ).resolves.toBe('deny');
  });
});
