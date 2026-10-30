import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/logout",
    apiPath: "/auth/logout",
  });
}
