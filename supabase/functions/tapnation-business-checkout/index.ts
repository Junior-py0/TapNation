import {
  assertAllowedOrigin,
  authenticatedUser,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  paystackRequest,
  requiredEnv,
} from "../_shared/runtime.ts";
import { businessPlan, recordInitializedPayment } from "../_shared/business.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    assertAllowedOrigin(req);
    const user = await authenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const plan = businessPlan(String(body?.interval || ""));
    const reference = `TN-BUS-${plan.interval === "annual" ? "A" : "M"}-${crypto.randomUUID()}`;
    const siteUrl = requiredEnv("SITE_URL").replace(/\/$/, "");
    const callbackUrl = `${siteUrl}/?payment=business&reference=${encodeURIComponent(reference)}`;

    const result = await paystackRequest("transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: String(plan.amountCents),
        currency: "ZAR",
        plan: plan.planCode,
        reference,
        callback_url: callbackUrl,
        metadata: JSON.stringify({
          product: "tapnation_business",
          user_id: user.id,
          interval: plan.interval,
          plan_code: plan.planCode,
        }),
      }),
    });

    await recordInitializedPayment({ userId: user.id, reference, plan });
    return jsonResponse(req, { authorizationUrl: result.data.authorization_url, reference }, 201);
  } catch (error) {
    return errorResponse(req, error);
  }
});
