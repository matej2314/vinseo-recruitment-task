import { MEETING_LIST_LIMITS } from "@vinseo/contracts";

import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

const allowed = new Set<number>(MEETING_LIST_LIMITS);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get("page") ?? "1";
  const limitRaw = url.searchParams.get("limit") ?? "10";
  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  if (!Number.isInteger(page) || page < 1) {
    return validationErrorResponse("page must be a positive integer");
  }
  if (!allowed.has(limit)) {
    return validationErrorResponse("limit must be one of 10, 25, 50, 100");
  }

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return bffProxyJson({
    method: "GET",
    apiPath: "/meetings",
    request,
    searchParams,
  });
}
