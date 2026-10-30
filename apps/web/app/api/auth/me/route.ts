import { bffStubResponse } from "@/lib/bff-stub";

export function GET(): Response {
  return bffStubResponse({
    method: "GET",
    bffPath: "/api/auth/me",
    apiPath: "/auth/me",
  });
}
