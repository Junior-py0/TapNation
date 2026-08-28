import {
  constantTimeEqual,
  errorResponse,
  HttpError,
  jsonResponse,
  requiredEnv,
  sha512HmacHex,
} from "../_shared/runtime.ts";
import {
  businessPlan,
  finalizeSuccessfulTransaction,
  findProfileByCustomerCode,
  patchProfile,
  verifyTransaction,
} from "../_shared/business.ts";

function eventCustomerCode(data: any): string {
  return String(data?.customer?.customer_code || data?.customer_code || "");
}

function eventSubscriptionCode(data: any): string | null {
  return data?.subscription_code || data?.subscription?.subscription_code || null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const rawBody = await req.text();
    const suppliedSignature = req.headers.get("x-paystack-signature") || "";
    const expectedSignature = await sha512HmacHex(requiredEnv("PAYSTACK_SECRET_KEY"), rawBody);
    if (!constantTimeEqual(suppliedSignature, expectedSignature)) throw new HttpError(401, "Invalid webhook signature.");

    const event = JSON.parse(rawBody);
    const data = event?.data || {};

    if (event?.event === "charge.success") {
      const transaction = await verifyTransaction(String(data.reference || ""));
      const code = eventCustomerCode(transaction);
      let fallback;
      if (code) {
        const profile = await findProfileByCustomerCode(code);
        const transactionPlanCode = transaction?.plan_object?.plan_code || transaction?.plan?.plan_code ||
          (typeof transaction?.plan === "string" ? transaction.plan : null);
        const transactionSubscriptionCode = eventSubscriptionCode(transaction);
        const knownSubscription = transactionSubscriptionCode &&
          transactionSubscriptionCode === profile?.paystack_subscription_code;
        const knownPlan = profile?.business_interval && transactionPlanCode === businessPlan(profile.business_interval).planCode;
        if (profile?.id && profile?.business_interval && (knownSubscription || knownPlan)) {
          fallback = { userId: profile.id, interval: profile.business_interval };
        }
      }
      await finalizeSuccessfulTransaction(transaction, fallback);
    }

    if (event?.event === "subscription.create") {
      const code = eventCustomerCode(data);
      const profile = code ? await findProfileByCustomerCode(code) : null;
      const planCode = data?.plan?.plan_code || data?.plan_code;
      const interval = planCode === businessPlan("annual").planCode ? "annual" :
        planCode === businessPlan("monthly").planCode ? "monthly" : null;
      if (profile?.id && interval) {
        await patchProfile(profile.id, {
          plan: "business",
          business_status: "active",
          business_interval: interval,
          paystack_subscription_code: eventSubscriptionCode(data),
          business_access_until: data?.next_payment_date || null,
        });
      }
    }

    if (event?.event === "subscription.disable") {
      const code = eventCustomerCode(data);
      const profile = code ? await findProfileByCustomerCode(code) : null;
      if (profile?.id) {
        await patchProfile(profile.id, {
          plan: "starter",
          business_status: "cancelled",
          business_access_until: new Date().toISOString(),
        });
      }
    }

    if (event?.event === "invoice.payment_failed") {
      const code = eventCustomerCode(data);
      const profile = code ? await findProfileByCustomerCode(code) : null;
      if (profile?.id) await patchProfile(profile.id, { business_status: "past_due" });
    }

    return jsonResponse(req, { received: true });
  } catch (error) {
    return errorResponse(req, error);
  }
});
