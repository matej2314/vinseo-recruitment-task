import { bffProxyJson } from "@/lib/bff-proxy";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

/**
 * BFF recording — cienkie proxy (F-14 / K-5b).
 * ACL i 404 bez wycieku istnienia egzekwuje wyłącznie apps/api.
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffProxyJson({
    method: "GET",
    apiPath: `/meetings/${id}/recording`,
    request,
  });
}
