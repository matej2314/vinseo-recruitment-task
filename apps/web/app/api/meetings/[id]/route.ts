import { bffStubResponse } from "@/lib/bff-stub";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffStubResponse({
    method: "GET",
    bffPath: `/api/meetings/${id}`,
    apiPath: `/meetings/${id}`,
  });
}
