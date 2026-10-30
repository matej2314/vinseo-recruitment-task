import { bffProxyJson } from "@/lib/bff-proxy";

export async function POST(request: Request): Promise<Response> {
  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/refresh",
    request,
  });
}
