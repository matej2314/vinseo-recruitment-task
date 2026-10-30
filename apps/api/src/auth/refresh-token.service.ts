import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnv } from '../config/env.schema.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface IssuedRefresh {
  readonly rawToken: string;
  readonly familyId: string;
  readonly expiresAt: Date;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async issue(userId: string, familyId?: string): Promise<IssuedRefresh> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const resolvedFamily = familyId ?? randomUUID();
    const days = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: resolvedFamily,
        expiresAt,
      },
    });

    return { rawToken, familyId: resolvedFamily, expiresAt };
  }

  async rotate(rawToken: string): Promise<{
    userId: string;
    familyId: string;
    next: IssuedRefresh;
  }> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid refresh token',
        code: 'REFRESH_INVALID',
      });
    }

    if (
      existing.revokedAt ||
      existing.usedAt ||
      existing.expiresAt < new Date()
    ) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Refresh token reuse or expired',
        code: 'REFRESH_REUSE_OR_EXPIRED',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { usedAt: new Date() },
    });

    const next = await this.issue(existing.userId, existing.familyId);
    return { userId: existing.userId, familyId: existing.familyId, next };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
