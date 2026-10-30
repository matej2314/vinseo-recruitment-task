import type { DemoRunMeetingRequestDto } from "@vinseo/contracts";

import { bffProxyJson } from "@/lib/bff-proxy";

/**
 * BFF demo - cienkie proxy (F-14).
 * Nie wymaga fixtureKey: wybór mocka należy do API (K-5).
 * Puste body / brak JSON → proxy `{}`.
 * Jeśli klient prześle string `fixtureKey`, przekazujemy go dalej
 * (API może zignorować / nadpisać); nie egzekwujemy obecności pola.
 */
export async function POST(request: Request): Promise<Response> {
  let upstreamBody: DemoRunMeetingRequestDto = {};

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const raw: unknown = await request.json();
      if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        const record = raw as Record<string, unknown>;
        const fixtureKey = record.fixtureKey;
        if (typeof fixtureKey === "string" && fixtureKey.length > 0) {
          upstreamBody = { fixtureKey };
        }
      }
    } catch {
      // Puste / niepoprawne JSON przy deklarowanym JSON - traktuj jak {}
      upstreamBody = {};
    }
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/demo/run-meeting",
    request,
    contentType: "application/json",
    body: JSON.stringify(upstreamBody),
  });
}
