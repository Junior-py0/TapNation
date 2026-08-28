import {
  assertAllowedOrigin,
  authenticatedUser,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
} from "../_shared/runtime.ts";
import { finalizeSuccessfulTransaction, verifyTransaction } from "../_shared/business.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    assertAllowedOrigin(req);
    const user = await authenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || "");
    const transaction = await verifyTransaction(reference);
    if (String(transaction?.reference || "") !== reference) throw new HttpError(400, "Payment reference did not match.");
    const result = await finalizeSuccessfulTransaction(transaction);
    if (result.userId !== user.id) throw new HttpError(403, "This payment belongs to another account.");
    return jsonResponse(req, { ok: true, interval: result.interval });
  } catch (error) {
    return errorResponse(req, error);
  }
});
