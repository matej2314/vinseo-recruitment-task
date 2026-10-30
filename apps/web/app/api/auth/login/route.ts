import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

type LoginBody = {
  readonly email?: unknown;
  readonly password?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }

  const body = raw as LoginBody;
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return validationErrorResponse("email and password are required");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/login",
    request,
    contentType: "application/json",
    body: JSON.stringify({ email, password }),
  });
}
