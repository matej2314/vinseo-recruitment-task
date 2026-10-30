import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireApiBaseUrl } from "@/lib/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session-cookies";
import { uiRoutes } from "@/lib/routes";

/**
 * RSC: brak cookie sesji → `/` (F-2).
 * Walidacja JWT + refresh: klient (POST /api/auth/refresh, GET /api/auth/me).
 */
export async function requireSessionCookies(): Promise<void> {
  const jar = await cookies();
  if (!jar.has(ACCESS_COOKIE) && !jar.has(REFRESH_COOKIE)) {
    redirect(uiRoutes.auth);
  }
  try {
    requireApiBaseUrl();
  } catch {
    redirect(uiRoutes.auth);
  }
}
