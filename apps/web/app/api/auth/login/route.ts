import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/login",
    apiPath: "/auth/login",
  });
}
