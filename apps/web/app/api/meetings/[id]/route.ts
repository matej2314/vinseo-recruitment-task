import { bffProxyJson } from "@/lib/bff-proxy";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffProxyJson({
    method: "GET",
    apiPath: `/meetings/${id}`,
    request,
  });
}
