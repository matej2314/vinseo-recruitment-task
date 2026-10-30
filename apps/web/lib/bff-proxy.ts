import type { HttpErrorBody } from "@vinseo/contracts";

import { requireApiBaseUrl } from "@/lib/env";

export type BffProxyInit = {
  readonly method: "GET" | "POST";
  readonly apiPath: string;
  /** Ścieżka względna API zaczynająca się od `/` (np. `/auth/login`). */
  readonly request: Request;
  readonly body?: string | undefined;
  readonly contentType?: string | undefined;
  readonly searchParams?: URLSearchParams | undefined;
};

function joinApiUrl(
  apiBaseUrl: string,
  apiPath: string,
  search?: URLSearchParams,
): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = new URL(path, `${apiBaseUrl}/`);
  if (search) {
    search.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

/** Przekaż Cookie z przeglądarki → Nest (bez ACL w BFF). */
export function inboundCookieHeader(request: Request): string | undefined {
  const cookie = request.headers.get("cookie");
  return cookie && cookie.length > 0 ? cookie : undefined;
}

/**
 * Relay Set-Cookie z Nest → odpowiedź BFF.
 * Usuń Domain, żeby przeglądarka wiązała cookie z hostem web (nie api).
 * Context7 Next 16: wolno ustawiać `Set-Cookie` na `Response` / Headers.
 */
export function appendUpstreamSetCookies(
  target: Headers,
  upstream: Headers,
): void {
  const getSetCookie = (
    upstream as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const lines =
    typeof getSetCookie === "function"
      ? getSetCookie.call(upstream)
      : (() => {
          const single = upstream.get("set-cookie");
          return single ? [single] : [];
        })();

  for (const line of lines) {
    const rewritten = line
      .split(";")
      .map((part) => part.trim())
      .filter((part) => !/^domain=/i.test(part))
      .join("; ");
    target.append("Set-Cookie", rewritten);
  }
}

export function configErrorResponse(): Response {
  const body: HttpErrorBody = {
    statusCode: 503,
    message: "API_BASE_URL is not configured",
    code: "BFF_MISCONFIGURED",
  };
  return Response.json(body, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validationErrorResponse(message: string): Response {
  const body: HttpErrorBody = {
    statusCode: 400,
    message,
    code: "VALIDATION_ERROR",
  };
  return Response.json(body, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Proxy JSON (auth, meetings, demo). Nie egzekwuje ACL.
 */
export async function bffProxyJson(init: BffProxyInit): Promise<Response> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = requireApiBaseUrl();
  } catch {
    return configErrorResponse();
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (init.contentType) {
    headers.set("Content-Type", init.contentType);
  }
  const cookie = inboundCookieHeader(init.request);
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  const requestId = init.request.headers.get("x-request-id");
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  const upstream = await fetch(
    joinApiUrl(apiBaseUrl, init.apiPath, init.searchParams),
    {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
      // Cookie sesji Nest — nie śledź redirectów auth między hostami
      redirect: "manual",
    },
  );

  const outHeaders = new Headers();
  outHeaders.set("Cache-Control", "no-store");
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    outHeaders.set("Content-Type", contentType);
  }
  appendUpstreamSetCookies(outHeaders, upstream.headers);

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

/**
 * Proxy SSE: przekaż body stream bez buforowania całego strumienia.
 */
export async function bffProxySse(init: {
  readonly apiPath: string;
  readonly request: Request;
}): Promise<Response> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = requireApiBaseUrl();
  } catch {
    return configErrorResponse();
  }

  const headers = new Headers();
  headers.set("Accept", "text/event-stream");
  const cookie = inboundCookieHeader(init.request);
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const upstream = await fetch(joinApiUrl(apiBaseUrl, init.apiPath), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const outHeaders = new Headers();
    outHeaders.set("Cache-Control", "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      outHeaders.set("Content-Type", contentType);
    }
    appendUpstreamSetCookies(outHeaders, upstream.headers);
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  const outHeaders = new Headers();
  outHeaders.set("Content-Type", "text/event-stream");
  outHeaders.set("Cache-Control", "no-cache, no-transform");
  outHeaders.set("Connection", "keep-alive");
  appendUpstreamSetCookies(outHeaders, upstream.headers);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}
