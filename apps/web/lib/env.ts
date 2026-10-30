/**
 * Konfiguracja procesu web. Wrażliwe sekrety vendorów / JWT secret - nie tu
 * (SPEC-FRONTEND F-16). API URL tylko server-side (BFF), bez NEXT_PUBLIC_.
 */
export type WebServerEnv = {
  readonly apiBaseUrl: string | undefined;
};

export function readWebServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): WebServerEnv {
  const raw = env.API_BASE_URL?.trim();
  return {
    apiBaseUrl: raw && raw.length > 0 ? raw : undefined,
  };
}

/** BFF: brak API_BASE_URL → nie wołaj Nest (obserwowalny fail konfiguracji). */
export function requireApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const { apiBaseUrl } = readWebServerEnv(env);
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured");
  }
  return apiBaseUrl.replace(/\/$/, "");
}
