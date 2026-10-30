import { Injectable } from '@nestjs/common';
import type {
  MeetingListItemDto,
  MeetingListResponseDto,
} from '@vinseo/contracts';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ListMeetingsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
  ) {}

  async execute(
    user: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<MeetingListResponseDto> {
    const where = this.access.listWhereFor(user);
    const [total, rows] = await Promise.all([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items: MeetingListItemDto[] = rows.map((m) => ({
      id: m.id,
      title: m.title,
      startedAt: m.startedAt?.toISOString() ?? null,
      durationSeconds: m.durationSeconds,
      organizerId: m.organizerId,
      clientId: m.clientId,
      clientLinkStatus: m.clientLinkStatus,
      confidential: m.confidential,
      processingStatus: m.processingStatus,
    }));

    return { items, page, limit, total };
  }
}
