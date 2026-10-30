/**
 * Konfiguracja procesu web. Wrażliwe sekrety vendorów / JWT secret — nie tu
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
