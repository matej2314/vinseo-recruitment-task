#!/usr/bin/env node
/**
 * Orchestrator integration (worker): podnosi efemeryczny Postgres
 * (`docker-compose.e2e.yml` — te same atomy / port co `pnpm test:e2e`),
 * migruje, odpala Jest integration, zawsze zdejmuje kontener (także przy failu).
 *
 * Connection stringi: E2E_DATABASE_URL / E2E_DATABASE_URL_TEST wygrywają;
 * inaczej składane z POSTGRES_* + E2E_POSTGRES_HOST/PORT (nie z DATABASE_URL
 * ścieżki A — ten wskazuje zwykle :5432).
 *
 * Nie uruchamiać równolegle z `pnpm test:e2e` (ten sam host port).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  requireEnv,
  resolvePostgresUrl,
} from '../../../scripts/pg-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workerRoot, '../..');
const composeFile = path.join(repoRoot, 'docker-compose.e2e.yml');

function e2eConnectionUrls() {
  const user = requireEnv('POSTGRES_USER');
  const password = requireEnv('POSTGRES_PASSWORD');
  const host = requireEnv('E2E_POSTGRES_HOST');
  const port = requireEnv('E2E_POSTGRES_PORT');
  const database = requireEnv('POSTGRES_DB');
  const databaseTest = requireEnv('POSTGRES_DB_TEST');

  const baseParts = { user, password, host, port };

  return {
    databaseUrl: resolvePostgresUrl({
      url: process.env.E2E_DATABASE_URL,
      parts: { ...baseParts, database },
    }),
    databaseUrlTest: resolvePostgresUrl({
      url: process.env.E2E_DATABASE_URL_TEST,
      parts: { ...baseParts, database: databaseTest },
    }),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

function compose(args, options = {}) {
  return run(
    'docker',
    ['compose', '-f', composeFile, ...args],
    { cwd: repoRoot, ...options },
  );
}

function migrate(databaseUrl) {
  return run(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'deploy'],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    },
  );
}

let exitCode = 1;

try {
  const { databaseUrl, databaseUrlTest } = e2eConnectionUrls();

  const up = compose(['up', '-d', '--wait']);
  if (up !== 0) {
    throw new Error(`docker compose up failed with exit ${up}`);
  }

  const migrateRuntime = migrate(databaseUrl);
  if (migrateRuntime !== 0) {
    throw new Error(
      `prisma migrate (runtime DB) failed with exit ${migrateRuntime}`,
    );
  }

  const migrateTest = migrate(databaseUrlTest);
  if (migrateTest !== 0) {
    throw new Error(
      `prisma migrate (test DB) failed with exit ${migrateTest}`,
    );
  }

  exitCode = run(
    'pnpm',
    [
      'exec',
      'jest',
      '--config',
      './jest.integration.config.cjs',
      '--runInBand',
      '--forceExit',
      ...process.argv.slice(2),
    ],
    {
      cwd: workerRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS,
          '--experimental-vm-modules',
        ]
          .filter(Boolean)
          .join(' '),
        // Suite ustawia DATABASE_URL z DATABASE_URL_TEST — obie wskazują izolowaną bazę testową.
        DATABASE_URL: databaseUrlTest,
        DATABASE_URL_TEST: databaseUrlTest,
        LLM_MOCK_MODE: process.env.LLM_MOCK_MODE ?? 'happy',
        VINSEO_INTEGRATION_DB_MANAGED: '1',
      },
    },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  const down = compose(['down', '-v', '--remove-orphans']);
  if (down !== 0) {
    console.error(`docker compose down failed with exit ${down}`);
    exitCode = exitCode === 0 ? down : exitCode;
  }
}

process.exit(exitCode);
