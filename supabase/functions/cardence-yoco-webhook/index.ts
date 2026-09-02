import { adminRest, requiredEnv } from "../_shared/runtime.ts";

const encoder = new TextEncoder();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function hmacBase64(secret: ArrayBuffer, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function validSignature(request: Request, rawBody: string) {
  const id = request.headers.get("webhook-id") || "";
  const timestamp = request.headers.get("webhook-timestamp") || "";
  const signatures = request.headers.get("webhook-signature") || "";
  const seconds = Number(timestamp);
  if (!id || !timestamp || !signatures || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 180) return false;
  const secret = requiredEnv("YOCO_WEBHOOK_SECRET").replace(/^whsec_/, "");
  const expected = await hmacBase64(decodeBase64(secret), `${id}.${timestamp}.${rawBody}`);
  return signatures.split(/\s+/).some((signature) => {
    const [version, value] = signature.split(",", 2);
    return version === "v1" && Boolean(value) && constantTimeEqual(expected, value);
  });
}

async function restJson(path: string, init: RequestInit = {}) {
  const response = await adminRest(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || "Database request failed.");
  return payload;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const rawBody = await request.text();
    if (!(await validSignature(request, rawBody))) return json(401, { error: "Invalid Yoco signature." });
    const event = JSON.parse(rawBody || "{}");
    if (event?.type !== "payment.succeeded") return json(200, { ok: true, ignored: true });

    const payment = event?.payload || {};
    const orderId = String(payment?.metadata?.orderId || "");
    const checkoutId = String(payment?.metadata?.checkoutId || payment?.checkoutId || payment?.checkout_id || "");
    const paymentId = String(payment?.id || "");
    const amountCents = Number(payment?.amount);
    const currency = String(payment?.currency || "").toUpperCase();
    const mode = String(payment?.mode || "").toLowerCase();
    if (!paymentId || payment?.status !== "succeeded" || !Number.isInteger(amountCents) || amountCents < 1) {
      throw new Error("Yoco sent an incomplete successful payment event.");
    }

    const filter = orderId
      ? `id=eq.${encodeURIComponent(orderId)}`
      : `yoco_checkout_id=eq.${encodeURIComponent(checkoutId)}`;
    if (!orderId && !checkoutId) return json(200, { ok: true, unmatched: true });
    const rows = await restJson(`store_orders?select=*&${filter}&limit=1`);
    const order = rows?.[0];
    if (!order) return json(200, { ok: true, unmatched: true });

    const eventKey = `payment.succeeded:${String(event?.id || paymentId)}`;
    await restJson("store_payment_events?on_conflict=provider,event_key", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ provider: "yoco", event_key: eventKey, payload: event }),
    });

    const expectedMode = String(order.yoco_processing_mode || "").toLowerCase();
    const mismatch = currency !== "ZAR" || amountCents !== Number(order.total_cents) || (expectedMode && mode && expectedMode !== mode);
    const update = mismatch
      ? { payment_status: "review", yoco_payment_id: paymentId, payment_payload: { event }, updated_at: new Date().toISOString() }
      : { payment_status: "paid", yoco_payment_id: paymentId, paid_at: new Date().toISOString(), payment_payload: { event }, updated_at: new Date().toISOString() };
    await restJson(`store_orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(update),
    });
    return json(200, { ok: true, order: order.public_reference, paymentReview: mismatch });
  } catch (error) {
    console.error("cardence-yoco-webhook failed:", error);
    return json(500, { error: error instanceof Error ? error.message : "Webhook processing failed." });
  }
});
