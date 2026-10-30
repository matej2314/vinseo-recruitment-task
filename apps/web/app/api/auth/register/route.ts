import {
  bffProxyJson,
  validationErrorResponse,
} from "@/lib/bff-proxy";

type RegisterBffBody = {
  readonly email?: unknown;
  readonly password?: unknown;
  readonly passwordConfirm?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }

  const body = raw as RegisterBffBody;
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm =
    typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

  if (!email || !password || !passwordConfirm) {
    return validationErrorResponse(
      "email, password and passwordConfirm are required",
    );
  }

  if (password !== passwordConfirm) {
    return validationErrorResponse("passwordConfirm does not match password");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/register",
    request,
    contentType: "application/json",
    body: JSON.stringify({ email, password }),
  });
}
