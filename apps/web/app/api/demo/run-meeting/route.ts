import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

type DemoBody = {
  readonly fixtureKey?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }
  const body = raw as DemoBody;
  const fixtureKey =
    typeof body.fixtureKey === "string" ? body.fixtureKey : "";
  if (!fixtureKey) {
    return validationErrorResponse("fixtureKey is required");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/demo/run-meeting",
    request,
    contentType: "application/json",
    body: JSON.stringify({ fixtureKey }),
  });
}
