import type { BffMethod } from "@/lib/bff-surface";

export type BffStubBody = {
  readonly status: "BFF_STUB";
  readonly method: BffMethod;
  readonly bffPath: string;
  readonly apiPath: string;
  readonly message: string;
};

/**
 * Odpowiedź placeholdera BFF do Fazy 3.
 * Nie zawiera reguł ACL ani side-effectów kolejki.
 */
export function bffStubResponse(input: {
  readonly method: BffMethod;
  readonly bffPath: string;
  readonly apiPath: string;
}): Response {
  const body: BffStubBody = {
    status: "BFF_STUB",
    method: input.method,
    bffPath: input.bffPath,
    apiPath: input.apiPath,
    message:
      "Szkielet BFF — żywy proxy (cookie, SSE, demo) w Fazie 3 majoru frontu. Bez ACL w BFF.",
  };

  return Response.json(body, {
    status: 501,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
