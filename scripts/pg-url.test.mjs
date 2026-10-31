import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPostgresUrl,
  requireEnv,
  resolvePostgresUrl,
} from './pg-url.mjs';

describe('buildPostgresUrl', () => {
  it('composes a postgresql URL with encoded credentials', () => {
    const url = buildPostgresUrl({
      user: 'u@me',
      password: 'p@ss:word',
      host: '127.0.0.1',
      port: 5433,
      database: 'vinseo_test',
    });
    assert.equal(
      url,
      'postgresql://u%40me:p%40ss%3Aword@127.0.0.1:5433/vinseo_test?schema=public',
    );
  });

  it('fails when a required part is missing', () => {
    assert.throws(
      () =>
        buildPostgresUrl({
          user: 'vinseo',
          password: '',
          host: '127.0.0.1',
          port: '5432',
          database: 'vinseo',
        }),
      /Missing Postgres URL part: password/,
    );
  });
});

describe('resolvePostgresUrl', () => {
  it('prefers a non-empty full URL over atoms', () => {
    const url = resolvePostgresUrl({
      url: 'postgresql://ready@localhost:5432/vinseo?schema=public',
      parts: {
        user: 'ignored',
        password: 'ignored',
        host: '127.0.0.1',
        port: '5433',
        database: 'other',
      },
    });
    assert.equal(url, 'postgresql://ready@localhost:5432/vinseo?schema=public');
  });

  it('builds from atoms when URL is empty', () => {
    const url = resolvePostgresUrl({
      url: '   ',
      parts: {
        user: 'vinseo',
        password: 'secret',
        host: '127.0.0.1',
        port: '5433',
        database: 'vinseo_test',
      },
    });
    assert.equal(
      url,
      'postgresql://vinseo:secret@127.0.0.1:5433/vinseo_test?schema=public',
    );
  });
});

describe('requireEnv', () => {
  it('returns trimmed value or throws', () => {
    assert.equal(requireEnv('X', { X: '  ok  ' }), 'ok');
    assert.throws(() => requireEnv('Y', {}), /Missing required env: Y/);
  });
});
