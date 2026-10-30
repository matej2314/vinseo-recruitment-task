import type { Response } from 'express';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnv } from '../config/env.schema.js';
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
} from './auth-cookies.js';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService<ApiEnv, true>) {}

  private baseOptions() {
    const secure = this.config.get('COOKIE_SECURE', { infer: true });
    return {
      httpOnly: true as const,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  setAccess(res: Response, token: string): void {
    res.cookie(ACCESS_COOKIE, token, {
      ...this.baseOptions(),
      maxAge: ACCESS_TTL_SECONDS * 1000,
    });
  }

  setRefresh(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.baseOptions(),
      expires: expiresAt,
    });
  }

  clearSession(res: Response): void {
    const opts = this.baseOptions();
    res.clearCookie(ACCESS_COOKIE, opts);
    res.clearCookie(REFRESH_COOKIE, opts);
  }
}
