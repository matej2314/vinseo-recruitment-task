import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthSessionResponse, AuthUserDto } from '@vinseo/contracts';
import type { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type { AuthenticatedUser } from './types/auth-user.js';

interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: AuthUserDto['role'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly cookies: AuthCookieService,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    res: Response,
  ): Promise<AuthSessionResponse> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Email already registered',
        code: 'EMAIL_CONFLICT',
      });
    }

    const passwordHash = await this.passwords.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        role: 'employee',
      },
    });

    await this.establishSession(user, res);
    return { user: this.toDto(user) };
  }

  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<AuthSessionResponse> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (
      !user ||
      !(await this.passwords.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await this.establishSession(user, res);
    return { user: this.toDto(user) };
  }

  async logout(user: AuthenticatedUser, res: Response): Promise<void> {
    await this.refreshTokens.revokeAllForUser(user.id);
    this.cookies.clearSession(res);
  }

  async me(user: AuthenticatedUser): Promise<AuthSessionResponse> {
    return { user: { id: user.id, email: user.email, role: user.role } };
  }

  async refresh(
    rawRefresh: string | undefined,
    res: Response,
  ): Promise<AuthSessionResponse> {
    if (!rawRefresh) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Missing refresh token',
        code: 'REFRESH_MISSING',
      });
    }

    const rotated = await this.refreshTokens.rotate(rawRefresh);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: rotated.userId },
    });

    const access = await this.signAccess(user);
    this.cookies.setAccess(res, access);
    this.cookies.setRefresh(res, rotated.next.rawToken, rotated.next.expiresAt);
    return { user: this.toDto(user) };
  }

  private async establishSession(
    user: { id: string; email: string; role: AuthUserDto['role'] },
    res: Response,
  ): Promise<void> {
    const access = await this.signAccess(user);
    const refresh = await this.refreshTokens.issue(user.id);
    this.cookies.setAccess(res, access);
    this.cookies.setRefresh(res, refresh.rawToken, refresh.expiresAt);
  }

  private async signAccess(user: {
    id: string;
    email: string;
    role: AuthUserDto['role'];
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload);
  }

  private toDto(user: {
    id: string;
    email: string;
    role: AuthUserDto['role'];
  }): AuthUserDto {
    return { id: user.id, email: user.email, role: user.role };
  }
}
