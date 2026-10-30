import { bffStubResponse } from "@/lib/bff-stub";

export function GET(): Response {
  return bffStubResponse({
    method: "GET",
    bffPath: "/api/meetings",
    apiPath: "/meetings",
  });
}
