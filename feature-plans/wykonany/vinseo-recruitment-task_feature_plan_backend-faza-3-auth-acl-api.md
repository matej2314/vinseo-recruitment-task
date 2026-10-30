# Vinseo Recruitment Task - feature plan (backend Faza 3: auth, ACL, API pod UI)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_backend-faza-3-auth-acl-api.md`  
**Kotwica major:** `vinseo-recruitment-task-backend_major-plan.md` - Faza 3 (pełna, kroki 3.1–3.4) → MILESTONE „API sesji i ACL gotowe pod front”.  
**Źródła:** `docs/dokumentacja_komunikacji.md`, `docs/architektura_katalogi_pliki.md`, `docs/frontend.md` (kontrakt API), `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA`, `SPEC-TESTY`, `SPEC-DANE`, `SPEC-ARCHITEKTURA`, `SPEC-OBSERVABILITY` (audit deny / katalog eventType).  
**Pass rozwojowy (sesja):** config JWT/cookie → auth → access → odczyt meetings → demo+SSE (+ `organizerId` w enqueue) → testy (+ opcjonalny audit deny).

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Auth cookie HttpOnly, ACL v1, lista/detail meetings, `POST /demo/run-meeting`, SSE `/meetings/:id/events`, testy T-6/T-10/T-11 (+ T-12 deny) |
| Major | Faza 3, kroki 3.1–3.4 |
| Poza zakresem | BFF / UI (`apps/web`); Faza 4 CI/Część A; pełne eventy audytu poza deny (reszta Faza 5); Passport (opcjonalny w SPEC - tu custom guard) |
| HOW (wywiad) | Cookie: `ma_access`, `ma_refresh`; refresh TTL 7 dni; `SameSite=Lax`, `Secure`←`COOKIE_SECURE`; SSE = poll DB ~1 s; audit deny w KROK 6 |
| Po implementacji (informacyjnie) | Major: Faza 3 → `WYKONANY`; MILESTONE „API sesji i ACL gotowe pod front” → `OSIĄGNIĘTY` - **edycja major poza tym skillem** |

---

## Założenia

- Stack Nest 12 w `apps/api`; Prisma w rootcie (modele `User`, `RefreshToken`, `Meeting`, `MeetingParticipant`, `AuditLog` już istnieją - **bez migracji schematu** w tym wycinku).
- Warstwy: cienkie controllery → use case / serwis → Prisma; ACL wyłącznie w `apps/api/src/access` (`SPEC-ARCHITEKTURA`, `SPEC-AUTH_I_ACL`).
- Access JWT TTL **15 min** (`signOptions.expiresIn: '15m'`); refresh opaque, hash w DB, rotacja + revoke rodziny przy reuse (`AU-5`…`AU-7`).
- Cookie: `ma_access` (JWT), `ma_refresh` (opaque); HttpOnly; Path `/`; SameSite `lax`; Secure z config.
- Biblioteki (Context7 `/nestjs/jwt`, `/websites/nestjs`): `JwtModule.registerAsync` + `JwtService.sign` / `verify`; SSE `@Sse()` → `Observable<MessageEvent>`; cookie przez `cookie-parser` + `res.cookie` / `req.cookies`.
- Typy odpowiedzi HTTP w `packages/contracts` (bez Zod). Walidacja DTO: `class-validator`.
- DX `POST /dev/meetings/enqueue` zostaje (bez sesji, nie-prod); produkcyjne demo = `POST /demo/run-meeting` z sesją.
- Enqueue z demo **ustawia `organizerId`** na zalogowanego użytkownika przy `create` (ACL allow dla runnera Test).

---

## FAZA 1 - Auth, ACL i kontrakty API pod UI

### KROK 1 - Config sesji + typy kontraktów HTTP

**Status:** `WYKONANY`

**Cel:** Fail-closed env pod JWT/cookie oraz współdzielone typy odpowiedzi - fundament pod auth/meetings (`SPEC-AUTH_I_ACL` AU-5, `SPEC-KOMUNIKACJA` K-3/K-8, `docs/deployment.md`).

**Artefakty:**

- Zmiana: `apps/api/src/config/env.schema.ts`, `apps/api/src/main.ts`, `apps/api/package.json`, `packages/contracts/src/index.ts`
- Nowe:  
  `packages/contracts/src/auth-api.ts`  
  `packages/contracts/src/meetings-api.ts`  
  `packages/contracts/src/http-error.ts`  
  `apps/api/src/auth/auth-cookies.ts`

#### Refaktor - `env.schema.ts`

**teraz:**

```typescript
export const apiEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});
```

**zamień na:**

```typescript
export const apiEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
});
```

#### Refaktor - `main.ts` (cookie-parser + ValidationPipe bez zmian semantyki)

**teraz:**

```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService<ApiEnv, true>);
  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
}
```

**zamień na:**

```typescript
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService<ApiEnv, true>);
  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
}
```

#### Refaktor - zależności `apps/api/package.json`

Dodać do `dependencies`:

- `@nestjs/jwt` (wersja zgodna z Nest 12, np. `^11` / aktualna peer)
- `cookie-parser`

Dodać do `devDependencies`:

- `@types/bcrypt`
- `@types/cookie-parser`

(`bcrypt` już jest w dependencies.)

#### Nowy plik - nazwy cookie

`apps/api/src/auth/auth-cookies.ts`:

```typescript
export const ACCESS_COOKIE = 'ma_access' as const;
export const REFRESH_COOKIE = 'ma_refresh' as const;

export const ACCESS_TTL_SECONDS = 15 * 60;
```

#### Nowy plik - kontrakty auth

`packages/contracts/src/auth-api.ts`:

```typescript
export type UserRole = 'employee' | 'admin';

export interface AuthUserDto {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface AuthSessionResponse {
  readonly user: AuthUserDto;
}
```

#### Nowy plik - kontrakty meetings HTTP

`packages/contracts/src/meetings-api.ts`:

```typescript
import type { ClientLinkStatus } from './client-link-status.js';
import type { ProcessingStatus } from './processing-status.js';

export interface MeetingListItemDto {
  readonly id: string;
  readonly title: string | null;
  readonly startedAt: string | null;
  readonly durationSeconds: number | null;
  readonly organizerId: string | null;
  readonly clientId: string | null;
  readonly clientLinkStatus: ClientLinkStatus;
  readonly confidential: boolean;
  readonly processingStatus: ProcessingStatus;
}

export interface MeetingListResponseDto {
  readonly items: readonly MeetingListItemDto[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface MeetingDetailDto extends MeetingListItemDto {
  readonly summary: unknown | null;
  readonly externalParticipants: unknown | null;
  readonly failureReason: string | null;
}

export interface MeetingStatusEventDto {
  readonly meetingId: string;
  readonly processingStatus: ProcessingStatus;
  readonly title?: string | null;
  readonly summary?: unknown | null;
}

export interface DemoRunMeetingResponseDto {
  readonly meetingId: string;
  readonly jobId: string;
  readonly status: 'pending';
}

export const MEETING_LIST_LIMITS = [10, 25, 50, 100] as const;
export type MeetingListLimit = (typeof MEETING_LIST_LIMITS)[number];
```

#### Nowy plik - envelope błędu (typ)

`packages/contracts/src/http-error.ts`:

```typescript
export interface HttpErrorBody {
  readonly statusCode: number;
  readonly message: string;
  readonly code: string;
  readonly requestId?: string;
}
```

#### Refaktor - `packages/contracts/src/index.ts`

**teraz:**

```typescript
export * from './ids.js';
export * from './processing-status.js';
export * from './client-link-status.js';
export * from './meeting-source.js';
export * from './jobs.js';
```

**zamień na:**

```typescript
export * from './ids.js';
export * from './processing-status.js';
export * from './client-link-status.js';
export * from './meeting-source.js';
export * from './jobs.js';
export * from './auth-api.js';
export * from './meetings-api.js';
export * from './http-error.js';
```

#### Biblioteki / API

- Context7 `@nestjs/jwt`: `JwtModule.registerAsync({ useFactory, inject })`, `jwtService.sign(payload, { expiresIn })`.
- Context7 Nest cookies / SSE: `cookie-parser` w `main`; `@Sse` w KROK 5.

#### DoD (krok)

- `validateApiEnv` wymaga `JWT_SECRET` (≥32) i czyta `COOKIE_SECURE` / `REFRESH_TTL_DAYS`.
- `cookie-parser` w bootstrapie.
- Typy kontraktów budują się (`pnpm --filter @vinseo/contracts build`).
- `.env` / `.env.example` już mają `JWT_SECRET` i `COOKIE_SECURE` - bez sekretów w planie/repo.

---

### KROK 2 - Moduł auth (register / login / logout / me / refresh)

**Status:** `WYKONANY`

**Cel:** Sesja pracownika cookie HttpOnly + rotacja refresh - major 3.1, `SPEC-AUTH_I_ACL` AU-1…AU-8, `SPEC-KOMUNIKACJA` K-2 auth.

**Artefakty (nowe w `apps/api/src/auth/`):**

- `password.service.ts`
- `refresh-token.service.ts`
- `auth-cookie.service.ts`
- `auth.service.ts`
- `auth.controller.ts`
- `auth.module.ts`
- `dto/register.dto.ts`
- `dto/login.dto.ts`
- `guards/jwt-auth.guard.ts`
- `decorators/current-user.decorator.ts`
- `types/auth-user.ts`

Zmiana: `apps/api/src/app.module.ts` - import `AuthModule`.

#### Nowy plik - typ użytkownika w request

`apps/api/src/auth/types/auth-user.ts`:

```typescript
import type { UserRole } from '@vinseo/contracts';

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}
```

#### Nowy plik - DTO register

`apps/api/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

/** AU-3: ≥12 znaków, ≥1 wielka, ≥1 cyfra, ≥1 specjalny */
const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @Matches(PASSWORD_RULE, {
    message:
      'password must be ≥12 chars with upper, digit, and special character',
  })
  password!: string;
}
```

#### Nowy plik - DTO login

`apps/api/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
```

#### Nowy plik - bcrypt

`apps/api/src/auth/password.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

const ROUNDS = 12;

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  }

  compare(plain: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plain, passwordHash);
  }
}
```

#### Nowy plik - refresh store (hash + rodzina)

`apps/api/src/auth/refresh-token.service.ts`:

```typescript
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

    if (existing.revokedAt || existing.usedAt || existing.expiresAt < new Date()) {
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
```

#### Nowy plik - ustawianie / czyszczenie cookie

`apps/api/src/auth/auth-cookie.service.ts`:

```typescript
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
```

#### Nowy plik - AuthService

`apps/api/src/auth/auth.service.ts`:

```typescript
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
    if (!user || !(await this.passwords.compare(password, user.passwordHash))) {
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

  async refresh(rawRefresh: string | undefined, res: Response): Promise<AuthSessionResponse> {
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
```

#### Nowy plik - JwtAuthGuard (cookie `ma_access`)

`apps/api/src/auth/guards/jwt-auth.guard.ts`:

```typescript
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
```

#### Nowy plik - `@CurrentUser()`

`apps/api/src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../types/auth-user.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<
      Request & { user: AuthenticatedUser }
    >();
    return req.user;
  },
);
```

#### Nowy plik - AuthController

`apps/api/src/auth/auth.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { REFRESH_COOKIE } from './auth-cookies.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from './types/auth-user.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(body.email, body.password, res);
  }

  @Post('login')
  login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(body.email, body.password, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user, res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  @Post('refresh')
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.refresh(raw, res);
  }
}
```

#### Nowy plik - AuthModule

`apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { ApiEnv } from '../config/env.schema.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnv, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    RefreshTokenService,
    AuthCookieService,
    JwtAuthGuard,
  ],
  exports: [JwtModule, JwtAuthGuard, AuthService],
})
export class AuthModule {}
```

#### Refaktor - `app.module.ts`

**teraz:**

```typescript
imports: [
  AppConfigModule,
  PrismaModule,
  HealthModule,
  MeetingsModule.register(),
],
```

**zamień na:**

```typescript
imports: [
  AppConfigModule,
  PrismaModule,
  HealthModule,
  AuthModule,
  MeetingsModule.register(),
],
```

(+ import `AuthModule` z `./auth/auth.module.js`).

#### Testy (szkic - pełne w KROK 6)

Unit: `PasswordService` hash/compare; opcjonalnie walidacja `RegisterDto` (słabe hasło → 400).

#### DoD (krok)

- `POST /auth/register` tworzy usera, ustawia `ma_access` + `ma_refresh`, zwraca `{ user }` bez sekretów w JSON.
- Duplikat e-mail → 409; słabe hasło → 400.
- Login / logout / me / refresh zgodnie z AU-6; reuse refresh → 401 + revoke rodziny.
- Hasła tylko jako bcrypt w DB.

---

### KROK 3 - Moduł access (ACL v1)

**Status:** `WYKONANY`

**Cel:** Jedna decyzja „czy U może czytać M” - major 3.2 / AC-1…AC-2; bez `ProjectMembership`.

**Artefakty:**

- `apps/api/src/access/meeting-access.service.ts`
- `apps/api/src/access/meeting-access.service.spec.ts`
- `apps/api/src/access/access.module.ts`

#### Nowy plik - MeetingAccessService

`apps/api/src/access/meeting-access.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';

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
```

#### Nowy plik - AccessModule

`apps/api/src/access/access.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingAccessService } from './meeting-access.service.js';

@Module({
  imports: [PrismaModule],
  providers: [MeetingAccessService],
  exports: [MeetingAccessService],
})
export class AccessModule {}
```

#### Nowy plik - unit testy ACL (T-6)

`apps/api/src/access/meeting-access.service.spec.ts`:

```typescript
import { MeetingAccessService } from './meeting-access.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';

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
```

#### DoD (krok)

- Centralny `canReadMeeting` + `listWhereFor` bez membership.
- Unit table T-6 (organizator / uczestnik / obcy / admin / brak spotkania) zielona.

---

### KROK 4 - Odczyt spotkań (lista + detail, deny→404)

**Status:** `WYKONANY`

**Cel:** `GET /meetings`, `GET /meetings/:id` z ACL i paginacją - major 3.2, AC-3…AC-5, K-2/K-4.

**Artefakty:**

- `apps/api/src/meetings/dto/list-meetings-query.dto.ts`
- `apps/api/src/meetings/list-meetings.use-case.ts`
- `apps/api/src/meetings/get-meeting.use-case.ts`
- `apps/api/src/meetings/meetings.controller.ts`
- Refaktor: `meetings.module.ts`, `app.module` już ma Meetings - dopiąć AccessModule + AuthModule

#### Nowy plik - query DTO

`apps/api/src/meetings/dto/list-meetings-query.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';
import { MEETING_LIST_LIMITS } from '@vinseo/contracts';

export class ListMeetingsQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([...MEETING_LIST_LIMITS])
  limit!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;
}
```

#### Nowy plik - ListMeetingsUseCase

`apps/api/src/meetings/list-meetings.use-case.ts`:

```typescript
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
```

#### Nowy plik - GetMeetingUseCase

`apps/api/src/meetings/get-meeting.use-case.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingDetailDto } from '@vinseo/contracts';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GetMeetingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
  ) {}

  async execute(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<MeetingDetailDto> {
    const decision = await this.access.canReadMeeting(user, meetingId);
    if (decision === 'deny') {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    const m = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!m) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    return {
      id: m.id,
      title: m.title,
      startedAt: m.startedAt?.toISOString() ?? null,
      durationSeconds: m.durationSeconds,
      organizerId: m.organizerId,
      clientId: m.clientId,
      clientLinkStatus: m.clientLinkStatus,
      confidential: m.confidential,
      processingStatus: m.processingStatus,
      summary: m.summary,
      externalParticipants: m.externalParticipants,
      failureReason: m.failureReason,
    };
  }
}
```

#### Nowy plik - MeetingsController (odczyt + miejsce na SSE w KROK 5)

`apps/api/src/meetings/meetings.controller.ts`:

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { ListMeetingsQueryDto } from './dto/list-meetings-query.dto.js';
import { GetMeetingUseCase } from './get-meeting.use-case.js';
import { ListMeetingsUseCase } from './list-meetings.use-case.js';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetingsUseCase,
    private readonly getMeeting: GetMeetingUseCase,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMeetingsQueryDto,
  ) {
    return this.listMeetings.execute(user, query.page, query.limit);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.getMeeting.execute(user, id);
  }
}
```

#### Refaktor - `meetings.module.ts`

**teraz:** providers tylko `EnqueueMeetingProcessUseCase`; controllers tylko DevEnqueue (nie-prod).

**zamień na** (kształt):

```typescript
import { Module, type DynamicModule } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DevEnqueueController } from './dev-enqueue.controller.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';
import { GetMeetingUseCase } from './get-meeting.use-case.js';
import { ListMeetingsUseCase } from './list-meetings.use-case.js';
import { MeetingsController } from './meetings.controller.js';

@Module({})
export class MeetingsModule {
  static register(): DynamicModule {
    return {
      module: MeetingsModule,
      imports: [JobsModule, PrismaModule, AccessModule, AuthModule],
      providers: [
        EnqueueMeetingProcessUseCase,
        ListMeetingsUseCase,
        GetMeetingUseCase,
      ],
      controllers: [
        MeetingsController,
        ...(process.env.NODE_ENV === 'production'
          ? []
          : [DevEnqueueController]),
      ],
      exports: [EnqueueMeetingProcessUseCase],
    };
  }
}
```

#### DoD (krok)

- Lista tylko ACL; `limit` spoza {10,25,50,100} → 400; `page` 1-based.
- Detail bez ACL / brak → **404** (identyczny komunikat).
- Bez Prisma w controllerze.

---

### KROK 5 - Demo enqueue z sesją + SSE statusów

**Status:** `WYKONANY`

**Cel:** `POST /demo/run-meeting` + `GET /meetings/:id/events` - major 3.3, K-5 / K-5a. Enqueue ustawia `organizerId`.

**Artefakty:**

- Refaktor: `enqueue-meeting-process.use-case.ts` (+ ewentualnie `dev-enqueue.controller.ts`)
- Nowe:  
  `apps/api/src/demo/dto/run-meeting.dto.ts`  
  `apps/api/src/demo/demo.controller.ts`  
  `apps/api/src/demo/demo.module.ts`  
  `apps/api/src/meetings/meeting-events.service.ts`  
- Rozszerzenie `MeetingsController` o `@Sse(':id/events')`

#### Refaktor - EnqueueMeetingProcessUseCase (`organizerId`)

**teraz (fragment create):**

```typescript
const meeting = await this.prisma.meeting.upsert({
  where: { externalMeetingId },
  create: {
    externalMeetingId,
    processingStatus: 'pending',
  },
  update: {
    processingStatus: 'pending',
    failureReason: null,
  },
  select: { id: true, externalMeetingId: true, processingStatus: true },
});
```

**zamień na:**

```typescript
export interface EnqueueMeetingProcessInput {
  readonly fixtureKey: string;
  readonly requestId?: string;
  /** Wymagane przy demo z sesją; DX może pominąć */
  readonly organizerId?: string;
}

// w execute:
const meeting = await this.prisma.meeting.upsert({
  where: { externalMeetingId },
  create: {
    externalMeetingId,
    processingStatus: 'pending',
    ...(input.organizerId ? { organizerId: input.organizerId } : {}),
  },
  update: {
    processingStatus: 'pending',
    failureReason: null,
    // nie nadpisuj organizatora przy ponownym enqueue (idempotencja)
  },
  select: { id: true, externalMeetingId: true, processingStatus: true },
});
```

DX `DevEnqueueController` bez zmian semantyki (bez `organizerId` OK).

#### Nowy plik - DTO demo

`apps/api/src/demo/dto/run-meeting.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class RunMeetingDto {
  @IsString()
  @MinLength(1)
  fixtureKey!: string;
}
```

#### Nowy plik - DemoController

`apps/api/src/demo/demo.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { DemoRunMeetingResponseDto } from '@vinseo/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { EnqueueMeetingProcessUseCase } from '../meetings/enqueue-meeting-process.use-case.js';
import { RunMeetingDto } from './dto/run-meeting.dto.js';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private readonly enqueue: EnqueueMeetingProcessUseCase) {}

  @Post('run-meeting')
  async runMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RunMeetingDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<DemoRunMeetingResponseDto> {
    // bez DEMO_ENABLED (K-5)
    const result = await this.enqueue.execute({
      fixtureKey: body.fixtureKey,
      requestId,
      organizerId: user.id,
    });
    return {
      meetingId: result.meetingId,
      jobId: result.jobId,
      status: 'pending',
    };
  }
}
```

#### Nowy plik - DemoModule

`apps/api/src/demo/demo.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { DemoController } from './demo.controller.js';

@Module({
  imports: [AuthModule, MeetingsModule.register()],
  controllers: [DemoController],
})
export class DemoModule {}
```

Uwaga implementacyjna: uniknąć podwójnej rejestracji `MeetingsModule` - preferowane: `MeetingsModule.register()` eksportuje `EnqueueMeetingProcessUseCase`, a `DemoModule` importuje ten sam dynamic module **albo** przenieść enqueue do wspólnego providera rejestrowanego raz w `AppModule`. W implementacji: w `AppModule` jeden `MeetingsModule.register()` + `DemoModule` importuje tylko token przez `forwardRef` / eksport z Meetings - **nie** wołać `register()` drugi raz. Poprawny kształt:

```typescript
// demo.module.ts - po eksporcie Enqueue z MeetingsModule
@Module({
  imports: [AuthModule, MeetingsModule], // jeśli Meetings staje się zwykłym @Module
  controllers: [DemoController],
})
export class DemoModule {}
```

**Ustalenie HOW w tym planie:** uprościć `MeetingsModule` do zwykłego `@Module` (bez `register()`), a DevEnqueue kontroler rejestrować warunkowo przez provider factory / osobny `DevMeetingsModule` importowany w `AppModule` tylko gdy `NODE_ENV !== 'production'`. Przy implementacji zachować zachowanie DX z Fazy 2.

Prostszy wariant w tym kroku (zalecany):

1. `MeetingsModule` = zwykły moduł z `MeetingsController` + use case’y + export enqueue.
2. `DevMeetingsModule` osobno (DevEnqueue) - import w `AppModule` gdy nie-prod.
3. `DemoModule` importuje `MeetingsModule` + `AuthModule`.

#### Nowy plik - MeetingEventsService (SSE poll)

`apps/api/src/meetings/meeting-events.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingStatusEventDto } from '@vinseo/contracts';
import {
  Observable,
  endWith,
  filter,
  interval,
  map,
  takeWhile,
  startWith,
  switchMap,
  distinctUntilChanged,
} from 'rxjs';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

const POLL_MS = 1000;

@Injectable()
export class MeetingEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
  ) {}

  async stream(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<Observable<MessageEvent>> {
    const decision = await this.access.canReadMeeting(user, meetingId);
    if (decision === 'deny') {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    const exists = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    return interval(POLL_MS).pipe(
      startWith(0),
      switchMap(async () => {
        const m = await this.prisma.meeting.findUniqueOrThrow({
          where: { id: meetingId },
        });
        const payload: MeetingStatusEventDto = {
          meetingId: m.id,
          processingStatus: m.processingStatus,
          ...(m.processingStatus === 'completed'
            ? { title: m.title, summary: m.summary }
            : {}),
        };
        return payload;
      }),
      distinctUntilChanged(
        (a, b) => a.processingStatus === b.processingStatus,
      ),
      map(
        (data) =>
          ({ data }) as MessageEvent,
      ),
      takeWhile(
        (ev) => {
          const status = (ev.data as MeetingStatusEventDto).processingStatus;
          return status !== 'completed' && status !== 'failed';
        },
        true,
      ),
    );
  }
}
```

Uwaga: przy pierwszym ticku wyemitować bieżący status nawet bez zmiany (`startWith` + brak filtra „tylko delta” na pierwszym evencie - `distinctUntilChanged` przepuszcza pierwszy). Po terminalu - ostatni event + domknięcie (`takeWhile(..., true)`).

#### Refaktor - dopisek SSE w `MeetingsController`

Dodać:

```typescript
import { Sse, MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { MeetingEventsService } from './meeting-events.service.js';

// w konstruktorze: private readonly events: MeetingEventsService

@Sse(':id/events')
async eventsStream(
  @CurrentUser() user: AuthenticatedUser,
  @Param('id') id: string,
): Promise<Observable<MessageEvent>> {
  return this.events.stream(user, id);
}
```

**Kolejność tras Nest:** zarejestrować `@Sse(':id/events')` **obok** `@Get(':id')` - obie parametryczne; ścieżka `events` jest sufiksem, Nest rozróżnia pełną ścieżkę. Unikać kolizji z `@Get(':id')` przez jawny segment `events`.

Dodać `MeetingEventsService` do providers `MeetingsModule`.  
`AppModule`: import `DemoModule` (+ ewentualny `DevMeetingsModule`).

#### Biblioteki / API

- Context7 Nest SSE: `@Sse()`, `Observable<MessageEvent>`, `data` serializowane do JSON.
- Polling ~1 s - założenie HOW (bez LISTEN/NOTIFY).

#### DoD (krok)

- Z sesją: demo enqueue’uje `meeting.process`, odpowiada `meetingId` / `jobId` / `status: pending`; **bez** `DEMO_ENABLED`.
- Spotkanie po demo ma `organizerId` = user → widać na liście / SSE.
- SSE: auth+ACL; deny/brak → 404; emisja statusów do terminalnego; zamknięcie po `completed`|`failed`.

---

### KROK 6 - Testy auth/ACL/demo/SSE + opcjonalny audit deny

**Status:** `WYKONANY`

**Cel:** Pokrycie T-6 (już w KROK 3), T-10, T-11; T-12 dla `meeting.access.denied` - major 3.4 / 3.4.1.

**Artefakty:**

- `apps/api/src/audit/audit-writer.service.ts`
- `apps/api/src/audit/audit.module.ts`
- Hook deny w `GetMeetingUseCase` / `MeetingEventsService` (wywołanie writera przed 404)
- Testy:  
  `apps/api/test/auth-acl.e2e-spec.ts` (lub współlokalizowane `*.spec.ts` z DB testową)  
  Rozszerzenie setupu: `JWT_SECRET`, `COOKIE_SECURE=false`, `DATABASE_URL` ← `DATABASE_URL_TEST`

#### Nowy plik - AuditWriter (minimalny)

`apps/api/src/audit/audit-writer.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    eventType: string;
    userId?: string;
    resourceId?: string;
    requestId?: string;
    resultCode?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        eventType: input.eventType,
        userId: input.userId,
        resourceId: input.resourceId,
        requestId: input.requestId,
        resultCode: input.resultCode,
      },
    });
  }
}
```

#### Nowy plik - AuditModule

`apps/api/src/audit/audit.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditWriterService } from './audit-writer.service.js';

@Module({
  imports: [PrismaModule],
  providers: [AuditWriterService],
  exports: [AuditWriterService],
})
export class AuditModule {}
```

#### Refaktor - deny → audit (fragment `GetMeetingUseCase`)

**zamień na** (przy deny):

```typescript
if (decision === 'deny') {
  await this.audit.write({
    eventType: 'meeting.access.denied',
    userId: user.id,
    resourceId: meetingId,
    resultCode: 'DENY',
  });
  throw new NotFoundException({
    statusCode: 404,
    message: 'Meeting not found',
    code: 'MEETING_NOT_FOUND',
  });
}
```

Analogicznie w `MeetingEventsService.stream` przed 404. **Zakaz** treści transcriptu w audycie.

Jeśli czas nie pozwala na pełny katalog O-11 (login success/failure, `demo.run`, `job.enqueued`) - w DoD / README odroczyć do major Fazy 5; **deny ACL musi** być pokryty testem w tym kroku (T-12 częściowo).

#### Nowy plik - integracja API (szkic pełnego suite)

`apps/api/test/auth-acl.e2e-spec.ts`:

```typescript
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auth + ACL + demo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://vinseo:vinseo@localhost:5432/vinseo_test?schema=public';
    process.env.JWT_SECRET ??= 'test-jwt-secret-min-32-characters!!';
    process.env.COOKIE_SECURE ??= 'false';
    process.env.API_PORT ??= '3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.meetingParticipant.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register sets cookies; me works', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'Password1!abcd' })
      .expect(201)
      .expect((res) => {
        expect(res.body.user.email).toBe('a@example.com');
        const setCookie = res.headers['set-cookie'];
        expect(JSON.stringify(setCookie)).toContain('ma_access');
        expect(JSON.stringify(setCookie)).toContain('ma_refresh');
      });

    await agent.get('/auth/me').expect(200);
  });

  it('GET /meetings/:id without ACL → 404', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'owner@example.com', password: 'Password1!abcd' });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'owner@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'ext-1',
        organizerId: owner.id,
        processingStatus: 'completed',
      },
    });

    const stranger = request.agent(app.getHttpServer());
    await stranger
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'Password1!abcd' });

    await stranger.get(`/meetings/${meeting.id}`).expect(404);

    const denied = await prisma.auditLog.findFirst({
      where: { eventType: 'meeting.access.denied' },
    });
    expect(denied).toBeTruthy();
  });

  it('POST /demo/run-meeting enqueues with session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'demo@example.com', password: 'Password1!abcd' });

    const res = await agent
      .post('/demo/run-meeting')
      .send({ fixtureKey: 'demo-client-budget-pl' })
      .expect(201);

    expect(res.body.meetingId).toBeTruthy();
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('pending');

    const m = await prisma.meeting.findUniqueOrThrow({
      where: { id: res.body.meetingId },
    });
    expect(m.organizerId).toBeTruthy();
  });

  it('SSE without ACL → 404', async () => {
    const ownerAgent = request.agent(app.getHttpServer());
    await ownerAgent
      .post('/auth/register')
      .send({ email: 'sse-owner@example.com', password: 'Password1!abcd' });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'sse-owner@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'sse-ext',
        organizerId: owner.id,
        processingStatus: 'pending',
      },
    });

    const stranger = request.agent(app.getHttpServer());
    await stranger
      .post('/auth/register')
      .send({ email: 'sse-other@example.com', password: 'Password1!abcd' });

    await stranger.get(`/meetings/${meeting.id}/events`).expect(404);
  });
});
```

**Uwagi testowe:**

- Kod HTTP sukcesu Nest dla `@Post` bez `@HttpCode` = **201**. Jeśli wolisz 200 - ustaw `@HttpCode(200)` w controllerach; testy muszą być spójne.
- SSE happy-path (emisja statusu): gdy czas pozwala - test z `pending`→ update DB → oczekiwanie eventa; inaczej jawnie odnotować w DoD jako częściowe (major 3.4 „SSE wg dostępnego czasu”). Minimum: 404 bez ACL (powyżej).
- E2e podnosi pg-boss przez `AppModule` - wymaga Postgres testowego (`pnpm db:up`). Przy flakach izolować DemoModule mockiem `PgBossService` w osobnym suite.

#### DoD (krok)

- Unit ACL (KROK 3) + e2e: cookie/`me`, deny→404, demo enqueue, SSE deny→404 - zielone.
- `meeting.access.denied` w `audit_log` bez treści spotkania.
- Luki (pełne SSE happy / pełny katalog auth.* audit) **nazwane** do Fazy 5, jeśli nie domknięte.

---

#### Propozycja commit message

```text
feat(api): add cookie auth, meeting ACL, demo enqueue, and status SSE

Expose session-backed HTTP contracts for the web major while keeping ACL
decisions and refresh rotation inside the trusted Nest api process.
```

---

## Weryfikacja wycinka

- [ ] Major Faza 3 (3.1–3.4) pokryta; milestone „API sesji i ACL gotowe pod front” osiągalny po implementacji.
- [ ] Zgodność `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA` (K-2…K-5a, K-8), `SPEC-TESTY` T-6/T-10/T-11 (+ T-12 deny).
- [ ] Cookie `ma_access` / `ma_refresh`; brak sekretów w JSON / Web Storage (kontrakt API).
- [ ] ACL: organizer ∨ participant ∨ admin; membership nie allow; deny→404.
- [ ] Demo bez `DEMO_ENABLED`; tylko enqueue; `organizerId` ustawione.
- [ ] SSE poll + ACL; zamknięcie na statusie terminalnym.
- [ ] Nagłówki wyłącznie `FAZA` / `KROK`; commit message EN Conventional Commits; statusy z trójki; major nietknięty.
- [ ] Brak odwołań do planów pomocniczych w rootcie; brak sekretów w pliku.
- [ ] Pass rozwojowy: config → auth → access → meetings → demo/SSE → testy/audit.

## Ślad do major (informacyjnie, po implementacji)

| Pozycja major | Oczekiwany status |
|---------------|-------------------|
| Faza 3 | `WYKONANY` |
| Kroki 3.1–3.4 | `WYKONANY` |
| MILESTONE - API sesji i ACL gotowe pod front | `OSIĄGNIĘTY` |
| Faza 4+ | bez zmian w tej sesji |
| Audit poza deny / pełne SSE happy (jeśli odroczone) | jawna lista → Faza 5 |
