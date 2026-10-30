import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AccessDecision = 'allow' | 'deny';

@Injectable()
export class MeetingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Centralna decyzja ACL v1: admin ∨ organizer ∨ internal participant.
   * ProjectMembership NIE daje allow.
   */
  async canReadMeeting(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<AccessDecision> {
    if (user.role === 'admin') {
      return 'allow';
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        organizerId: true,
        participants: {
          where: { userId: user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!meeting) {
      return 'deny';
    }

    if (meeting.organizerId === user.id) {
      return 'allow';
    }

    if (meeting.participants.length > 0) {
      return 'allow';
    }

    return 'deny';
  }

  /** Filtr listy: admin → bez ograniczenia usera; inaczej organizer ∨ participant */
  listWhereFor(user: AuthenticatedUser):
    | Record<string, never>
    | {
        OR: Array<
          | { organizerId: string }
          | { participants: { some: { userId: string } } }
        >;
      } {
    if (user.role === 'admin') {
      return {};
    }
    return {
      OR: [
        { organizerId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    };
  }
}
