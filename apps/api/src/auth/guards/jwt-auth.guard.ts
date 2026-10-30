import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { ACCESS_COOKIE } from '../auth-cookies.js';
import type { AuthenticatedUser } from '../types/auth-user.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser }
    >();
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: AuthenticatedUser['role'];
      }>(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }
  }
}
