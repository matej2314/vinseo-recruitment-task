# Vinseo Recruitment Task - feature plan (backend etap 0, plik 1/2)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_backend-etap0-f1-f2_1.md`  
**Zestaw:** plik `_1` = **FAZA 1**; plik `_2` = **FAZA 2** (osobny plik).  
**Kotwica major:** `vinseo-recruitment-task-backend_major-plan.md` - Faza 1 (pełna) → ślad: MILESTONE „Fundament monorepo gotowy”.  
**Źródła:** `docs/` (`architektura_katalogi_pliki.md`, `architektura.md`, `deployment.md`, `plan_wdrozenia_etapy.md`), `spec/SPEC-ARCHITEKTURA.md`, `SPEC-DANE.md`, `SPEC-TESTY.md` (runner Jest).  
**Pass rozwojowy (sesja):** Vitest→Jest przy szkielecie `api` (nie dopiero przy smoke); brak przenosin między fazami major.

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek (ten plik) | Fundament monorepo: workspaces, Compose A (`db:*`) + Compose B (`dev:stack:*` / `docker-compose.dev.yml`), szkielety, Prisma (+ KROK 8 align ACL/client-link), smoke + README |
| Major | Faza 1, kroki 1.1–1.5 (+ 1.2.1 ścieżka A, 1.2.2 ścieżka B) + dopisek modelu pod ACL v1 |
| Poza zakresem tego pliku | Pipeline `meeting.process`, redakcja, LLM, enqueue demo (→ plik `_2` / major Faza 2); auth/ACL HTTP (major Faza 3); erase UI / HubSpot / real Workspace; pełne UI |
| Ustalenie DX enqueue | W Fazie 2 (plik `_2`): enqueue z `api` bez sesji cookie; `POST /demo/run-meeting` zostaje na Fazę 3 |
| Po implementacji (informacyjnie) | Major: Faza 1 → `WYKONANY`; MILESTONE „Fundament monorepo gotowy” → `OSIĄGNIĘTY` - **edycja major poza tym skillem** |

---

## Założenia (stack z projektu / SPEC)

- Monorepo **pnpm workspaces**; procesy `apps/api`, `apps/worker`, `apps/web`; typy w `packages/contracts` (**bez Zod** w `packages/`) - `SPEC-ARCHITEKTURA`.
- NestJS 12 (scaffold `apps/api`), Next.js 16 stub `apps/web`, TypeScript `strict`.
- PostgreSQL + **Prisma 7** w rootcie `prisma/` + `prisma.config.ts`; klient z **adapterem** `@prisma/adapter-pg` (Context7 / docs Prisma 7) - osobny `PrismaService` w `api` i `worker`, bez pakietu Zod/runtime w `packages/`.
- Walidacja env: `@nestjs/config` + **Zod** (`validate` / fail-closed) - `SPEC-ARCHITEKTURA` C-1…C-3.
- Testy: **Jest** + supertest (`SPEC-TESTY` T-1) - migracja ze Vitest w scaffoldzie.
- Nazwa paczki kontraktów: `@vinseo/contracts`.
- Typowanie: granice publiczne jawne; branded id tam, gdzie stringi domenowe byłyby wymienne (`typescript-practices`); zakaz `any` jako skrótu.
- Lokalny Postgres ścieżka A: `pnpm db:up` / `db:down` / `db:logs` (A-7).
- Stack DX ścieżka B (**obowiązkowa**): `docker-compose.dev.yml` + `docker/dev/Dockerfile` + `pnpm dev:stack:*` (A-8).

---

## FAZA 1 - Fundament monorepo i szkielet procesów

### KROK 1 - Root workspaces, drzewo procesów, `packages/contracts`

**Status:** `WYKONANY`

**Cel:** Jeden root monorepo zgodny z `docs/architektura_katalogi_pliki.md` i major 1.1: workspaces, miejsca `api` / `worker` / `web`, paczka typów bez walidacji runtime; usunięcie zagnieżdżonych workspace’ów scaffoldu.

**Artefakty:**

- Nowe: `pnpm-workspace.yaml`, `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/ids.ts`, `packages/contracts/src/processing-status.ts`, `packages/contracts/src/meeting-source.ts`, `packages/contracts/src/jobs.ts`
- Zmiana: root `package.json`, `.gitignore`
- Usunięcie: `apps/api/pnpm-workspace.yaml`, `apps/web/pnpm-workspace.yaml` (zagnieżdżone workspaces scaffoldu)
- Doprecyzowanie nazw: `apps/api` → `"name": "@vinseo/api"`; `apps/web` → `"name": "@vinseo/web"` (w `package.json` appów - fragment w tym kroku lub KROK 3)

#### Implementacja - nowe pliki (kompletne)

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`packages/contracts/package.json`:

```json
{
  "name": "@vinseo/contracts",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "declaration": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"]
}
```

`packages/contracts/src/ids.ts`:

```typescript
export type UserId = string & { readonly __brand: 'UserId' };
export type MeetingId = string & { readonly __brand: 'MeetingId' };
export type ClientId = string & { readonly __brand: 'ClientId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type ExternalMeetingId = string & {
  readonly __brand: 'ExternalMeetingId';
};
export type FixtureKey = string & { readonly __brand: 'FixtureKey' };
export type RequestId = string & { readonly __brand: 'RequestId' };
export type JobId = string & { readonly __brand: 'JobId' };

export function asUserId(value: string): UserId {
  return value as UserId;
}

export function asMeetingId(value: string): MeetingId {
  return value as MeetingId;
}

export function asExternalMeetingId(value: string): ExternalMeetingId {
  return value as ExternalMeetingId;
}

export function asFixtureKey(value: string): FixtureKey {
  return value as FixtureKey;
}

export function asRequestId(value: string): RequestId {
  return value as RequestId;
}

export function asJobId(value: string): JobId {
  return value as JobId;
}
```

`packages/contracts/src/processing-status.ts`:

```typescript
export const PROCESSING_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];
```

`packages/contracts/src/meeting-source.ts`:

```typescript
export type MeetingSourceKind = 'mock';

export interface SourceParticipant {
  readonly email: string | null;
  readonly displayName: string;
  readonly internal: boolean;
}

export interface SourceSegment {
  readonly speaker: string;
  readonly text: string;
  readonly startMs: number;
}

/** Port źródła (K-12) - bez pól summary vendora. */
export interface MeetingSourcePayload {
  readonly externalId: string;
  readonly title: string;
  readonly startedAt: string;
  readonly participants: readonly SourceParticipant[];
  readonly segments: readonly SourceSegment[];
}
```

`packages/contracts/src/jobs.ts`:

```typescript
import type { ExternalMeetingId, FixtureKey, RequestId } from './ids.js';
import type { MeetingSourceKind } from './meeting-source.js';

export const MEETING_PROCESS_JOB_NAME = 'meeting.process' as const;

export interface MeetingProcessJobPayload {
  readonly externalMeetingId: ExternalMeetingId | string;
  readonly source: MeetingSourceKind;
  readonly fixtureKey?: FixtureKey | string;
  readonly requestId?: RequestId | string;
}
```

`packages/contracts/src/index.ts`:

```typescript
export * from './ids.js';
export * from './processing-status.js';
export * from './meeting-source.js';
export * from './jobs.js';
```

#### Refaktor - root `package.json`

**Teraz:** skrypt `test` placeholder, brak workspaces, `"type": "commonjs"`.

**Zamień na** (cały plik):

```json
{
  "name": "vinseo-recruitment-task",
  "version": "1.0.0",
  "private": true,
  "description": "Firmowy asystent spotkań - monorepo (api / worker / web)",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev:api": "pnpm --filter @vinseo/api start:dev",
    "dev:worker": "pnpm --filter @vinseo/worker start:dev",
    "dev:web": "pnpm --filter @vinseo/web dev",
    "build": "pnpm -r run build",
    "test": "pnpm --filter @vinseo/api test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "typecheck:contracts": "pnpm --filter @vinseo/contracts typecheck"
  },
  "devDependencies": {
    "prisma": "^7.10.1",
    "typescript": "^5.9.0"
  },
  "dependencies": {
    "@prisma/client": "^7.10.1"
  }
}
```

*(Wersja `packageManager` dopasuj do lokalnie używanej pnpm ≥9; scaffold web ma pnpm 12 - jeśli zostajecie przy 12, wpisz tę samą w root.)*

#### Refaktor - `.gitignore`

**Teraz:** tylko `Workflow.md`, `ZADANIE_Mid_FullStack.md`, `DECISIONS.md`.

**Zamień na** (dopisz wpisy narzędziowe; **zachowaj** istniejące trzy linie jeśli mają zostać poza gitem):

```gitignore
Workflow.md
ZADANIE_Mid_FullStack.md
DECISIONS.md

node_modules/
dist/
.next/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
apps/*/pnpm-lock.yaml
```

*(Po `pnpm install` w rootcie lockfile ma być **jeden**: root `pnpm-lock.yaml`. Lokalne `apps/*/pnpm-lock.yaml` i `node_modules` scaffoldu usuń przy pierwszym install.)*

#### Usunięcia / porządki

1. Usuń `apps/api/pnpm-workspace.yaml` oraz `apps/web/pnpm-workspace.yaml`.
2. Usuń `apps/api/node_modules`, `apps/web/node_modules` oraz lokalne lockfile’e appów (zostaje root).
3. Upewnij się, że nie ma zagnieżdżonego `.git` pod `apps/*`.

#### Biblioteki / API

- pnpm workspaces - układ z `docs/architektura_katalogi_pliki.md`.
- Brak Zod w `packages/contracts` (`SPEC-ARCHITEKTURA`).

#### Testy

- `pnpm --filter @vinseo/contracts typecheck` przechodzi.

#### DoD (krok)

- Root ma `pnpm-workspace.yaml` obejmujący `apps/*` i `packages/*`.
- Istnieją katalogi procesów i `@vinseo/contracts` z typami joba / źródła / statusów / branded id.
- Brak zagnieżdżonych `pnpm-workspace.yaml` w appach.
- `pnpm install` z roota linkuje workspaces (weryfikacja w KROK 3 po dograniu `package.json` appów).

---

### KROK 2 - Lokalne Postgres (Compose) i env

**Status:** `WYKONANY`

**Cel:** Powtarzalna baza lokalna + baza testowa; kolejka pg-boss w tej samej instalacji Postgres (bez osobnego brokera) - major 1.2, `docs/deployment.md`, `SPEC-ARCHITEKTURA`.

**Artefakty:**

- Nowe: `docker-compose.yml` (nadpisanie pustego pliku), `.env.example`
- Zmiana: (opcjonalnie) krótka nota w README dopiero w KROK 5 - tu tylko pliki env/Compose

#### Implementacja - nowe pliki (kompletne)

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: vinseo-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: vinseo
      POSTGRES_PASSWORD: vinseo
      POSTGRES_DB: vinseo
    ports:
      - "5432:5432"
    volumes:
      - vinseo_pg_data:/var/lib/postgresql/data
      - ./docker/postgres/init-test-db.sql:/docker-entrypoint-initdb.d/01-init-test-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vinseo -d vinseo"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  vinseo_pg_data:
```

`docker/postgres/init-test-db.sql`:

```sql
SELECT 'CREATE DATABASE vinseo_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vinseo_test')\gexec
```

*(Jeśli `\gexec` w init sprawia problemy w Alpine - zamień na proste `CREATE DATABASE vinseo_test;` w skrypcie init; przy re-init volume’u baza powstanie raz.)*

Wariant prostszy (zalecany w planie, jeśli `\gexec` zawodny):

```sql
CREATE DATABASE vinseo_test;
```

`.env.example`:

```bash
# Wspólne
NODE_ENV=development
DATABASE_URL=postgresql://vinseo:vinseo@localhost:5432/vinseo?schema=public
DATABASE_URL_TEST=postgresql://vinseo:vinseo@localhost:5432/vinseo_test?schema=public

# api
API_PORT=3001
LOG_LEVEL=debug
# Placeholdery pod Fazę 3 (wymagane dopiero gdy auth startuje; w Fazie 1 waliduj tylko to, co proces faktycznie czyta - patrz envSchema w KROK 3)
JWT_SECRET=change-me-dev-jwt-secret-min-32-chars!!
COOKIE_SECURE=false

# worker
WORKER_LOG_LEVEL=debug
```

#### Biblioteki / API

- Oficjalny obraz `postgres:16-alpine`; jedna instancja pod dane domenowe i (później) pg-boss.

#### Testy

- `docker compose up -d` → `pg_isready` / połączenie klientem na `DATABASE_URL` i `DATABASE_URL_TEST`.

#### DoD (krok)

- Compose podnosi Postgres w sposób opisany później w README.
- Istnieje `.env.example` bez sekretów produkcyjnych.
- Brak drugiego magazynu „na start” (Redis itd.).

---

### KROK 3 - Szkielety Nest `api` + `worker`, stub `web`, Jest

**Status:** `WYKONANY`

**Cel:** Uruchamialne dwa procesy Nest + minimalny stub Next; zwalidowany config fail-closed; runner **Jest** zamiast Vitest - major 1.3 + przesunięcie migracji testów; `SPEC-ARCHITEKTURA` A-1, A-6, C-*.

**Artefakty:**

- Nowe (api): `apps/api/src/config/env.schema.ts`, `apps/api/src/config/config.module.ts`, `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.module.ts`, `apps/api/jest.config.cjs`, `apps/api/test/health.e2e-spec.ts`
- Nowe (worker): cały szkielet pod `apps/worker/` (patrz niżej)
- Zmiana: `apps/api/package.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/tsconfig.json`, `apps/web/package.json`, `apps/web/app/page.tsx`
- Usunięcie: `apps/api/vitest.config.ts`, `apps/api/vitest.config.e2e.ts`; brakujące w scaffoldzie `AppController`/`AppService` - **nie odtwarzać** (zastąpione health)

#### Kolejność w kroku

1. Env schema + ConfigModule w `api`.
2. Health module + bootstrap `main.ts`.
3. `package.json` api: nazwa, zależności config/Jest, skrypty; usunięcie Vitest.
4. Szkielet `worker` (ApplicationContext, bez publicznego HTTP).
5. Stub `web` (minimalna strona „stub etapu 0”) + nazwa `@vinseo/web` w workspace.
6. `pnpm install` z roota.

#### Nowy plik - `apps/api/src/config/env.schema.ts`

```typescript
import { z } from 'zod';

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

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(
  config: Record<string, unknown>,
): ApiEnv {
  const parsed = apiEnvSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid API environment: ${details}`);
  }
  return parsed.data;
}
```

#### Nowy plik - `apps/api/src/config/config.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateApiEnv } from './env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateApiEnv,
    }),
  ],
})
export class AppConfigModule {}
```

#### Nowy plik - `apps/api/src/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { readonly status: 'ok' } {
    return { status: 'ok' };
  }
}
```

#### Nowy plik - `apps/api/src/health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

#### Refaktor - `apps/api/src/app.module.ts`

**Teraz:**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Zamień na:**

```typescript
import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [AppConfigModule, HealthModule],
})
export class AppModule {}
```

#### Refaktor - `apps/api/src/main.ts`

**Teraz:** `listen(process.env.PORT ?? 3000)` bez ValidationPipe / bez typowanego portu.

**Zamień na:**

```typescript
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { ApiEnv } from './config/env.schema.js';

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

await bootstrap();
```

#### Refaktor - `apps/api/package.json` (kluczowe fragmenty)

**Teraz:** `"name": "api"`, skrypty Vitest, brak `@nestjs/config`, brak `@vinseo/contracts`.

**Zamień na** (pełny plik docelowy):

```json
{
  "name": "@vinseo/api",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "lint": "oxlint --type-aware src/ test/",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:e2e": "NODE_OPTIONS=--experimental-vm-modules jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^12.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^12.0.1",
    "@nestjs/platform-express": "^12.0.1",
    "@prisma/adapter-pg": "^7.10.1",
    "@prisma/client": "^7.10.1",
    "@vinseo/contracts": "workspace:*",
    "bcrypt": "^6.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "pg": "^8.16.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@nestjs/cli": "^12.0.0",
    "@nestjs/schematics": "^12.0.0",
    "@nestjs/testing": "^12.0.1",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^24.0.0",
    "@types/pg": "^8.15.0",
    "@types/supertest": "^7.0.0",
    "jest": "^29.7.0",
    "oxlint": "^1.58.0",
    "oxlint-tsgolint": "^7.0.2001",
    "prettier": "^3.4.2",
    "supertest": "^7.0.0",
    "ts-jest": "^29.3.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.0"
  }
}
```

*(Usuń `@vitest/*`, `vitest`, `vite`, zbędne `@nestjs/mau` jeśli nieużywane. Dopnij wersje przy `pnpm install`.)*

#### Nowy plik - `apps/api/jest.config.cjs`

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
```

#### Nowy plik - `apps/api/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.ts$": [
      "ts-jest",
      {
        "useESM": true,
        "tsconfig": "<rootDir>/../tsconfig.json"
      }
    ]
  },
  "extensionsToTreatAsEsm": [".ts"],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
}
```

#### Nowy plik - `apps/api/test/health.e2e-spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://vinseo:vinseo@localhost:5432/vinseo?schema=public';
    process.env.API_PORT ??= '3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
```

#### Refaktor - `apps/api/test/app.e2e-spec.ts`

**Usuń** plik (Hello World / brak controllera) - zastąpiony `health.e2e-spec.ts`.

#### Refaktor - `apps/api/tsconfig.json`

W `compilerOptions.types` **zamień** `"vitest/globals"` na `"jest"` (oraz `"node"`).

---

#### Worker - nowe pliki

`apps/worker/package.json`:

```json
{
  "name": "@vinseo/worker",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest"
  },
  "dependencies": {
    "@nestjs/common": "^12.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^12.0.1",
    "@prisma/adapter-pg": "^7.10.1",
    "@prisma/client": "^7.10.1",
    "@vinseo/contracts": "workspace:*",
    "pg": "^8.16.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@nestjs/cli": "^12.0.0",
    "@nestjs/schematics": "^12.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^24.0.0",
    "@types/pg": "^8.15.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.3.0",
    "typescript": "^5.9.0"
  }
}
```

`apps/worker/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

`apps/worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "types": ["jest", "node"]
  },
  "include": ["src/**/*.ts"]
}
```

`apps/worker/src/config/env.schema.ts`:

```typescript
import { z } from 'zod';

export const workerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  WORKER_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(
  config: Record<string, unknown>,
): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid worker environment: ${details}`);
  }
  return parsed.data;
}
```

`apps/worker/src/config/config.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateWorkerEnv } from './env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateWorkerEnv,
    }),
  ],
})
export class AppConfigModule {}
```

`apps/worker/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module.js';

@Module({
  imports: [AppConfigModule],
})
export class AppModule {}
```

`apps/worker/src/main.ts`:

```typescript
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Worker');
  logger.log('Worker application context started (no public HTTP)');

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Shutting down on ${signal}`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

await bootstrap();
```

Katalogi placeholdery (puste `.gitkeep` lub README 1-linijkowe - bez logiki):

- `apps/worker/src/jobs/.gitkeep`
- `apps/worker/src/pipeline/.gitkeep`
- `apps/worker/src/adapters/.gitkeep`

---

#### Stub web

**Refaktor** `apps/web/package.json`: `"name": "@vinseo/web"` (reszta Next 16 może zostać).

**Refaktor** `apps/web/app/page.tsx` - minimalny stub (bez dashboardu):

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>Vinseo - web stub (etap 0)</h1>
      <p>
        Pełne UI / BFF według majoru frontendu. Ten proces tylko potwierdza
        miejsce <code>apps/web</code> w monorepo.
      </p>
    </main>
  );
}
```

#### Biblioteki / API

- Nest `ConfigModule.forRoot({ validate })` - fail-closed przy starcie (`SPEC-ARCHITEKTURA`).
- Worker: `NestFactory.createApplicationContext` - brak publicznego HTTP dla przeglądarki.
- Prisma adapter deps już w `package.json` (użycie w KROK 4).

#### Testy

- e2e `GET /health` (powyżej).
- Ręcznie: start `api` bez `DATABASE_URL` → proces **nie** bootstrapuje.

#### DoD (krok)

- `api` i `worker` startują lokalnie jako **dwa** procesy (przy poprawnym `.env`).
- Stub `web` startuje (`pnpm dev:web`).
- Vitest usunięty z `api`; Jest jest domyślnym runnerem.
- Brak importów źródłowych `apps/api` ↔ `apps/worker`.

---

### KROK 4 - Model danych startowy (Prisma)

**Status:** `WYKONANY`

**Cel:** Schemat i migracja forward pokrywająca byty `SPEC-DANE` D-7 (gotowość pod pipeline Fazy 2 i auth Fazy 3) - major 1.4.

**Artefakty:**

- Nowe: `prisma/schema.prisma`, `prisma.config.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`, analogicznie w workerze, migracja `prisma/migrations/...`
- Zmiana: `apps/api/src/app.module.ts`, `apps/worker/src/app.module.ts` (import PrismaModule)

#### Nowy plik - `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  employee
  admin
}

enum ProcessingStatus {
  pending
  processing
  completed
  failed
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String
  role         UserRole @default(employee)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships  ProjectMembership[]
  participants MeetingParticipant[]
  refreshTokens RefreshToken[]
  auditLogs    AuditLog[]
}

model Client {
  id        String    @id @default(uuid()) @db.Uuid
  name      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
  meetings  Meeting[]
}

model Project {
  id         String   @id @default(uuid()) @db.Uuid
  clientId   String   @db.Uuid
  name       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  client       Client              @relation(fields: [clientId], references: [id])
  memberships  ProjectMembership[]
  meetings     Meeting[]
}

model ProjectMembership {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  projectId String   @db.Uuid
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])

  @@unique([userId, projectId])
}

model Meeting {
  id                 String           @id @default(uuid()) @db.Uuid
  externalMeetingId  String           @unique
  title              String?
  clientId           String?          @db.Uuid
  projectId          String?          @db.Uuid
  processingStatus   ProcessingStatus @default(pending)
  startedAt          DateTime?
  /// Segmenty transcriptu (JSON) - zapis kanoniczny dopiero po akceptacji pipeline (Faza 2)
  transcriptSegments Json?
  /// Summary kanoniczne: shortSummary, decisions, actionItems (JSON)
  summary            Json?
  failureReason      String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  client       Client?              @relation(fields: [clientId], references: [id])
  project      Project?             @relation(fields: [projectId], references: [id])
  participants MeetingParticipant[]
}

model MeetingParticipant {
  id        String   @id @default(uuid()) @db.Uuid
  meetingId String   @db.Uuid
  userId    String   @db.Uuid
  createdAt DateTime @default(now())

  meeting Meeting @relation(fields: [meetingId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([meetingId, userId])
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  tokenHash String
  familyId  String    @db.Uuid
  expiresAt DateTime
  usedAt    DateTime?
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([familyId])
  @@index([tokenHash])
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  eventType  String
  resourceId String?
  userId     String?  @db.Uuid
  requestId  String?
  resultCode String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([eventType, createdAt])
}
```

#### Nowy plik - `prisma.config.ts` (root; Prisma 7)

```typescript
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```

Dopisz `dotenv` do root `devDependencies` jeśli jeszcze go nie ma.

#### Nowy plik - `apps/api/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import type { ApiEnv } from '../config/env.schema.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<ApiEnv, true>) {
    const connectionString = config.get('DATABASE_URL', { infer: true });
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

#### Nowy plik - `apps/api/src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Analogicznie `apps/worker/src/prisma/prisma.service.ts` + `prisma.module.ts` (ten sam wzorzec, `WorkerEnv` zamiast `ApiEnv`).

#### Refaktor - import PrismaModule

W `apps/api/src/app.module.ts` oraz `apps/worker/src/app.module.ts` dodaj `PrismaModule` do `imports`.

#### Migracja

```bash
cp .env.example .env
# uzupełnij DATABASE_URL
docker compose up -d
pnpm db:generate
pnpm exec prisma migrate dev --name init_etap0
```

#### Biblioteki / API

- Prisma 7: `prisma.config.ts` + `PrismaPg` adapter (Context7 `/websites/prisma_io`).
- UUID `@db.Uuid`, JSON dla segmentów/summary, unikalne `externalMeetingId` - `SPEC-DANE`.
- Zakaz treści transcriptu w `AuditLog` - tylko metadane.

#### Testy

- Migracja aplikuje się na czystą bazę `vinseo` (i opcjonalnie `vinseo_test` z `DATABASE_URL` testowym).

#### DoD (krok)

- `prisma/schema.prisma` pokrywa D-7; migracja forward istnieje.
- `PrismaService` w `api` i `worker` łączy się przez adapter (bez `new PrismaClient()` bez adaptera).
- Controllery nie importują Prisma Client bezpośrednio (health bez DB OK).

---

### KROK 5 - Smoke jakości i README po scaffoldzie

**Status:** `WYKONANY`

**Cel:** Bramka jakości + README pozwalające obcej osobie podnieść scaffold - major 1.5. Komendy bazy przez **`pnpm db:up`** (KROK 6 / major 1.2.1), nie wyłącznie surowy `docker compose`.

**Artefakty:**

- Zmiana: root `README.md` (sekcja Uruchomienie), ewentualnie `apps/api/src/health/health.controller.spec.ts` (unit smoke)
- Potwierdzenie: `pnpm --filter @vinseo/api test` oraz `test:e2e`
- Wymaga: skryptów z KROK 6 (lub równoważnego stanu root `package.json`)

#### Nowy plik (opcjonalny unit) - `apps/api/src/health/health.controller.spec.ts`

```typescript
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok status payload', () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
```

#### Refaktor - root `README.md` (sekcja „Uruchomienie”)

**Teraz:** TODO / TBD pnpm **albo** surowy `docker compose up -d` bez skryptów root.

**Zamień na** (fragment sekcji - zachowaj resztę README, zaktualizuj tylko uruchomienie):

```markdown
## Uruchomienie (scaffold - po Fazie 1)

Wymagania: Node ≥22, pnpm, Docker.

```bash
# 1. Zależności
pnpm install

# 2. Env
cp .env.example .env

# 3. Postgres (Compose via skrypty root - A-7)
pnpm db:up
# pnpm db:logs   # opcjonalnie
# pnpm db:down   # zatrzymanie

# 4. Prisma
pnpm db:generate
pnpm db:migrate:deploy
# (dev iteracyjny) pnpm db:migrate

# 5. Procesy (osobne terminale)
pnpm dev:api      # http://localhost:3001/health → {"status":"ok"}
pnpm dev:worker   # log: Worker application context started
pnpm dev:web      # stub Next na porcie domyślnym Next
```

Smoke testów API:

```bash
pnpm --filter @vinseo/api test
pnpm --filter @vinseo/api test:e2e
```
```

#### DoD (krok)

- Smoke / e2e health w `api` przechodzi na Jest.
- README opisuje `pnpm db:up` + migracje + trzy procesy (`dev:*`) bez domysłów spoza repo.
- Fundament wystarcza do startu Fazy 2 (pipeline) bez przebudowy układu repo.

#### Propozycja commit message

```text
feat(monorepo): scaffold api, worker, and web with Prisma and local Postgres

Establish pnpm workspaces, fail-closed Nest config, Jest smoke, and the etap-0
data model so pipeline work can start without reshaping the repository.
```

---

### KROK 6 - Root skrypty Compose (`db:up` / `db:down` / `db:logs`)

**Status:** `WYKONANY`

**Refaktor względem:** KROK 1 - root `package.json` (WYKONANY; skrypty `db:generate` / `db:migrate*` bez Compose) oraz KROK 2 - lokalne Postgres/Compose (WYKONANY; DoD i weryfikacja przez surowy `docker compose up -d`).  
**Cel:** kanoniczne wejście DX zgodne z majorem **1.2 / 1.2.1**, `docs/deployment.md`, `SPEC-ARCHITEKTURA` **A-7** i `SPEC-TESTY` T-3 - bez przepisywania historii KROK 1–2.

**Artefakty:**

- Zmiana: root `package.json` - dopisanie skryptów:
  - `"db:up": "docker compose up -d"`
  - `"db:down": "docker compose down"`
  - `"db:logs": "docker compose logs -f postgres"`
- Spójność docs/SPEC już poza tym plikiem (osobna aktualizacja); ten krok egzekwuje stan w `package.json` + użycie w KROK 5 (README).

#### Implementacja - fragment `scripts` w root `package.json`

```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:logs": "docker compose logs -f postgres",
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:migrate:deploy": "prisma migrate deploy"
```

*(Kolejność względem istniejących `dev:*` / `test` dowolna; nazwy `db:up` / `db:down` / `db:logs` obowiązkowe.)*

#### Testy / weryfikacja

- `pnpm db:up` → Postgres healthy (`pg_isready` / połączenie na `DATABASE_URL`).
- `pnpm db:down` zatrzymuje kontenery Compose z tego pliku.
- Surowy `docker compose up -d` nadal działa (skrypt to cienkie opakowanie).

#### DoD (krok)

- Root `package.json` zawiera `db:up`, `db:down`, `db:logs`.
- Lokalne podniesienie bazy da się wykonać bez znajomości flag Compose poza tym, co skrypt opakowuje.
- KROK 5 (README) odwołuje się do `pnpm db:up`, nie wyłącznie do surowego `docker compose`.

#### Propozycja commit message

```text
chore(repo): add pnpm db:up/down/logs wrappers for local Postgres Compose

Expose Compose through root scripts so scaffold and docs share one entry
point (SPEC-ARCHITEKTURA A-7) without changing the Compose file itself.
```

---

### KROK 7 - Compose dev stack (ścieżka B, obowiązkowa)

**Status:** `WYKONANY`

**Refaktor / rozszerzenie względem:** KROK 2 (Compose DB-only, WYKONANY), KROK 6 (`db:*`, NIE_ROZPOCZĘTY/wdrożony), major **1.2.2** / `SPEC-ARCHITEKTURA` **A-8**.  
**Cel:** obowiązkowy pełny stack developerski w kontenerach z bind mountem kodu - **bez** zmiany semantyki istniejących skryptów `db:*` / `dev:*`.

**Artefakty:**

- Nowe: `docker-compose.dev.yml`, `docker/dev/Dockerfile`, (opcjonalnie) `.dockerignore`
- Zmiana: root `package.json` - **dopisanie** (nie zamiana):
  - `"dev:stack:up": "docker compose -f docker-compose.dev.yml up -d --build"`
  - `"dev:stack:down": "docker compose -f docker-compose.dev.yml down"`
  - `"dev:stack:logs": "docker compose -f docker-compose.dev.yml logs -f"`
- Zmiana: root `README.md` / docs / SPEC - opis ścieżki B (osobno lub w tej samej sesji)

#### DoD (krok)

- `pnpm dev:stack:up` buduje/podnosi postgres + api + worker + web.
- Kod hosta widoczny w kontenerach (bind mount); `node_modules` w wolumenach Docker.
- Istniejące `db:up` / `dev:api` itd. **bez zmian** semantyki.
- Ostrzeżenie: nie uruchamiać A i B jednocześnie na tych samych portach.

#### Propozycja commit message

```text
feat(dev): add docker-compose.dev stack with bind-mounted apps

Provide mandatory local DX path B (postgres + api/worker/web) via
dev:stack:* scripts without altering host-oriented db:* / dev:* flows.
```

---

### KROK 8 - Align Prisma model with ACL v1 and client-link policy

**Status:** `WYKONANY`

**Refaktor względem:** KROK 4 - Model danych startowy (Prisma) (`WYKONANY` w planie; wdrożony w repo).  
**Cel:** Dopasować schemat do zaktualizowanych `docs/` / `SPEC-DANE` / `SPEC-AUTH_I_ACL` po odpowiedzi firmy: ACL v1 = **organizator ∨ uczestnik ∨ admin** (bez egzekucji `ProjectMembership`); powiązanie klienta po domenie e-mail zewnętrznego; unmatched bez blokady pipeline; flaga poufności; pola potrzebne do erase treści (fakt callu zostaje).

**Poza tym krokiem (kolejna faza / major Faza 3+):** HTTP erase admin, real Google Calendar / Directory, ekspansja grup Workspace, HubSpot, job retencji prod, UI przypisania klienta.

#### Zmiany modelu (forward migration)

| Element | Norma |
|---------|--------|
| `Meeting.organizerId` | FK → `User` (nullable tylko jeśli legacy/fixture bez organizatora - preferuj wymagane w nowych rekordach) |
| `Meeting.durationSeconds` (lub `endedAt`) | Czas trwania - pole zostaje przy erase treści |
| `Meeting.confidential` | `Boolean @default(false)` - flaga ręczna / z fixture |
| `Meeting.clientLinkStatus` | Enum: `internal` \| `matched` \| `unmatched` (brak zewnętrznych vs domena zmapowana vs nie) |
| `Client.emailDomain` | Unikalna domena do matchingu (bez integracji HubSpot) |
| Uczestnicy zewnętrzni | JSON metadanych na `Meeting` (np. `externalParticipants`) - e-mail/nazwa; **bez** konta `User` |
| `Project` / `ProjectMembership` | **Zostają w schemacie** pod przyszłą fazę; **zakaz** używania ich w serwisie `access` w etapie 0 |
| Treść przy erase (norma produktowa) | Kasowane/null: `transcriptSegments`, `summary`, `externalParticipants` (i ewentualne nagranie u vendora - poza DB); **zostają:** `startedAt`/`duration*`, `processingStatus`, `title`, `clientId` |

#### Artefakty

- Zmiana: `prisma/schema.prisma` + nowa migracja forward (`pnpm exec prisma migrate dev --name align_acl_v1_client_link`)
- Zmiana (gdy typy w contracts): opcjonalnie enumy / branded w `packages/contracts` spójne ze schematem
- Docs/SPEC źródłowe aktualizowane **poza** tym krokiem (osobna edycja docs/spec); ten krok egzekwuje stan w Prisma

#### Testy

- Migracja aplikuje się na bazę z migracją z KROK 4 (upgrade path).
- Smoke: regenerate client; `api`/`worker` startują z nowym schematem.

#### DoD (krok)

- Schemat zawiera organizatora, status linku klienta, domenę na `Client`, flagę `confidential`, czas trwania (lub równoważne).
- Brak zależności kodu ACL (gdy powstanie w Fazie 3) od `ProjectMembership` - tu: brak seeda/fixture zakładającego membership jako ACL.
- KROK 4 pozostaje historycznie `WYKONANY` (bez przepisywania treści kroku 4).

#### Propozycja commit message

```text
feat(db): align meeting schema with organizer ACL and client-link status

Add organizer, confidential, client domain matching fields and duration
so etap-0 ACL and future erase keep meeting facts without team membership.
```

---

## Weryfikacja wycinka (ten plik)

- [x] Pokrycie major Fazy 1 (1.1–1.5, w tym 1.2.1 i 1.2.2) i DoD fazy z majoru.
- [x] Zgodność z `SPEC-ARCHITEKTURA` (A-7 + A-8) / `SPEC-DANE` / `SPEC-TESTY` (T-3 bez wymogu B w CI).
- [x] Nagłówki wyłącznie `FAZA` / `KROK`; commit message EN na końcu fazy / kroków.
- [x] Pass rozwojowy: Jest; Prisma; `db:*`; **`dev:stack:*`**; smoke.
- [x] KROK 1–8 (`WYKONANY`); KROK 6/7 = jawne rozszerzenia DX; KROK 8 = align modelu pod ACL v1 / client-link.
- [x] Po implementacji (poza sesją): major Faza 1 → `WYKONANY`; milestone fundamentu → `OSIĄGNIĘTY`.

## Ślad do major (informacyjnie, po implementacji)

| Pozycja major | Oczekiwany status po wdrożeniu tego pliku |
|---------------|-------------------------------------------|
| Faza 1 | `WYKONANY` |
| Kroki 1.1–1.5 (w tym 1.2.1, 1.2.2) | `WYKONANY` |
| MILESTONE - Fundament monorepo gotowy | `OSIĄGNIĘTY` |
| Faza 2+ | bez zmian (plan w pliku `_2`) |
