import { bffStubResponse } from "@/lib/bff-stub";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

/**
 * Placeholder SSE. Żywy proxy `text/event-stream` — Faza 3
 * (Context7: streaming Response; tu bez strumienia).
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffStubResponse({
    method: "GET",
    bffPath: `/api/meetings/${id}/events`,
    apiPath: `/meetings/${id}/events`,
  });
}
