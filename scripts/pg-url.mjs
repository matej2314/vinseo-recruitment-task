/**
 * Składanie i rozwiązywanie Postgres connection stringów.
 * Pierwszeństwo: niepusty pełny URL → w przeciwnym razie atomy (user/password/…).
 */

/**
 * @param {{
 *   user: string;
 *   password: string;
 *   host: string;
 *   port: string | number;
 *   database: string;
 *   schema?: string;
 * }} parts
 * @returns {string}
 */
export function buildPostgresUrl(parts) {
  const required = ['user', 'password', 'host', 'port', 'database'];
  for (const key of required) {
    const value = parts[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Missing Postgres URL part: ${key}`);
    }
  }

  const schema = parts.schema?.trim() ? parts.schema.trim() : 'public';
  const user = encodeURIComponent(String(parts.user).trim());
  const password = encodeURIComponent(String(parts.password).trim());
  const host = String(parts.host).trim();
  const port = String(parts.port).trim();
  const database = encodeURIComponent(String(parts.database).trim());
  const schemaEnc = encodeURIComponent(schema);

  return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=${schemaEnc}`;
}

/**
 * @param {{
 *   url?: string | undefined;
 *   parts: Parameters<typeof buildPostgresUrl>[0];
 * }} options
 * @returns {string}
 */
export function resolvePostgresUrl({ url, parts }) {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (trimmed.length > 0) {
    return trimmed;
  }
  return buildPostgresUrl(parts);
}

/**
 * @param {string} name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}
