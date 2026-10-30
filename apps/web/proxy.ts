import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session-cookies";
import { uiRoutes } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname === uiRoutes.meetings ||
    pathname.startsWith(`${uiRoutes.meetings}/`) ||
    pathname === uiRoutes.search ||
    pathname.startsWith(`${uiRoutes.search}/`);

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const hasRefresh = request.cookies.has(REFRESH_COOKIE);
  if (!hasAccess && !hasRefresh) {
    const url = request.nextUrl.clone();
    url.pathname = uiRoutes.auth;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/meetings/:path*", "/search/:path*"],
};
