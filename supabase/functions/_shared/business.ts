import { adminRest, HttpError, paystackRequest, requiredEnv } from "./runtime.ts";

export type BillingInterval = "monthly" | "annual";

export type BusinessPlan = {
  interval: BillingInterval;
  amountCents: number;
  planCode: string;
};

export function businessPlan(interval: string): BusinessPlan {
  if (interval === "monthly") {
    return {
      interval,
      amountCents: 9_900,
      planCode: requiredEnv("PAYSTACK_BUSINESS_MONTHLY_PLAN"),
    };
  }
  if (interval === "annual") {
    return {
      interval,
      amountCents: 99_900,
      planCode: requiredEnv("PAYSTACK_BUSINESS_ANNUAL_PLAN"),
    };
  }
  throw new HttpError(400, "Choose the monthly or annual Business plan.");
}

function metadataObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function customerCode(transaction: any): string | null {
  return transaction?.customer?.customer_code || transaction?.customer_code || null;
}

function subscriptionCode(transaction: any): string | null {
  return transaction?.subscription?.subscription_code || transaction?.subscription_code || null;
}

async function upsertPayment(row: Record<string, unknown>): Promise<void> {
  const response = await adminRest("business_payments?on_conflict=provider_reference", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Could not record payment (${response.status}).`);
}

export async function recordInitializedPayment(input: {
  userId: string;
  reference: string;
  plan: BusinessPlan;
}): Promise<void> {
  await upsertPayment({
    user_id: input.userId,
    provider_reference: input.reference,
    billing_interval: input.plan.interval,
    amount_cents: input.plan.amountCents,
    currency: "ZAR",
    status: "initialized",
    updated_at: new Date().toISOString(),
  });
}

export async function findProfileByCustomerCode(code: string): Promise<any | null> {
  const response = await adminRest(
    `profiles?select=id,business_interval,paystack_customer_code,paystack_subscription_code&paystack_customer_code=eq.${encodeURIComponent(code)}&limit=1`,
  );
  if (!response.ok) throw new Error(`Could not find billing profile (${response.status}).`);
  const rows = await response.json();
  return rows?.[0] || null;
}

export async function patchProfile(userId: string, values: Record<string, unknown>): Promise<void> {
  const response = await adminRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...values, business_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Could not update Business access (${response.status}).`);
}

export async function verifyTransaction(reference: string): Promise<any> {
  if (!/^[A-Za-z0-9._-]{8,100}$/.test(reference)) throw new HttpError(400, "Invalid payment reference.");
  const payload = await paystackRequest(`transaction/verify/${encodeURIComponent(reference)}`);
  return payload.data;
}

export async function finalizeSuccessfulTransaction(
  transaction: any,
  fallback?: { userId: string; interval: BillingInterval },
): Promise<{ userId: string; interval: BillingInterval; reference: string }> {
  if (transaction?.status !== "success") throw new HttpError(409, "This payment has not completed yet.");
  const metadata = metadataObject(transaction?.metadata);
  if (!fallback && metadata.product !== "tapnation_business") {
    throw new HttpError(400, "This payment is not for TapNation Business.");
  }

  const userId = String(metadata.user_id || fallback?.userId || "");
  const interval = String(metadata.interval || fallback?.interval || "") as BillingInterval;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(userId)) throw new HttpError(400, "Payment owner is invalid.");
  const plan = businessPlan(interval);
  if (String(transaction?.currency || "").toUpperCase() !== "ZAR") throw new HttpError(400, "Payment currency did not match.");
  if (Number(transaction?.amount) !== plan.amountCents) throw new HttpError(400, "Payment amount did not match the selected plan.");

  const transactionPlanCode = transaction?.plan_object?.plan_code || transaction?.plan?.plan_code ||
    (typeof transaction?.plan === "string" ? transaction.plan : null);
  if (transactionPlanCode && transactionPlanCode !== plan.planCode) {
    throw new HttpError(400, "Payment plan did not match.");
  }

  const reference = String(transaction?.reference || "");
  if (!reference) throw new HttpError(400, "Payment reference is missing.");
  const paidAt = new Date(transaction?.paid_at || transaction?.paidAt || Date.now());
  const accessUntil = new Date(paidAt);
  accessUntil.setUTCDate(accessUntil.getUTCDate() + (interval === "annual" ? 370 : 35));

  await upsertPayment({
    user_id: userId,
    provider_reference: reference,
    billing_interval: interval,
    amount_cents: plan.amountCents,
    currency: "ZAR",
    status: "success",
    provider_payload: transaction,
    updated_at: new Date().toISOString(),
  });
  await patchProfile(userId, {
    plan: "business",
    business_status: "active",
    business_interval: interval,
    billing_email: transaction?.customer?.email || null,
    paystack_customer_code: customerCode(transaction),
    paystack_subscription_code: subscriptionCode(transaction),
    business_access_until: accessUntil.toISOString(),
  });

  return { userId, interval, reference };
}
