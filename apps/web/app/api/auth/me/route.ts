import { bffProxyJson } from "@/lib/bff-proxy";

export async function GET(request: Request): Promise<Response> {
  return bffProxyJson({
    method: "GET",
    apiPath: "/auth/me",
    request,
  });
}
