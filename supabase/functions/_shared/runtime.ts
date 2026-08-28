export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const siteUrl = Deno.env.get("SITE_URL")?.trim();
  if (siteUrl) origins.add(new URL(siteUrl).origin);
  for (const value of (Deno.env.get("CORS_ORIGINS") || "").split(",")) {
    const candidate = value.trim();
    if (candidate) origins.add(new URL(candidate).origin);
  }
  origins.add("http://localhost:5500");
  origins.add("http://127.0.0.1:5500");
  return origins;
}

export function assertAllowedOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "Origin not allowed.");
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && allowedOrigins().has(origin)
    ? origin
    : Deno.env.get("SITE_URL")?.trim() || "http://localhost:5500";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function optionsResponse(req: Request): Response {
  return new Response("ok", { headers: corsHeaders(req) });
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(req: Request, error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  if (status >= 500) console.error(error);
  return jsonResponse(req, { error: message }, status);
}

export async function authenticatedUser(req: Request): Promise<{ id: string; email: string }> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Sign in to continue.");

  const response = await fetch(`${requiredEnv("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: requiredEnv("SUPABASE_ANON_KEY"),
    },
  });
  if (!response.ok) throw new HttpError(401, "Your session has expired. Sign in again.");
  const user = await response.json();
  if (!user?.id || !user?.email) throw new HttpError(401, "A verified email is required.");
  return { id: String(user.id), email: String(user.email) };
}

export async function adminRest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`${requiredEnv("SUPABASE_URL")}/rest/v1/${path}`, { ...init, headers });
}

export async function paystackRequest(path: string, init: RequestInit = {}): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${requiredEnv("PAYSTACK_SECRET_KEY")}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`https://api.paystack.co/${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status !== true) {
    throw new HttpError(502, payload?.message || "Paystack could not process this request.");
  }
  return payload;
}

export async function sha512HmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
