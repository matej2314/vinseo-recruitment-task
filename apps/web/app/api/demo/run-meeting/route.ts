import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
  });
}
