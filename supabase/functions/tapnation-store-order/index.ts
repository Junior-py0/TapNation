import {
  HttpError,
  adminRest,
  assertAllowedOrigin,
  errorResponse,
  jsonResponse,
  optionsResponse,
  requiredEnv,
} from "../_shared/runtime.ts";

type Address = {
  streetAddress: string;
  localArea: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const productNames: Record<string, string> = {
  original: "Cardence Unbranded Card",
  custom: "Cardence Branded Card",
  bulk: "Cardence Bulk Cards",
};
const skins = new Set(["aubergine", "porcelain", "coral", "cobalt", "monochrome", "navy", "forest", "burgundy", "sand", "slate"]);

function clean(value: unknown, maximum = 200): string {
  return String(value || "").trim().slice(0, maximum);
}

function unitPrice(productType: string, quantity: number): number {
  const branded = productType === "custom";
  if (quantity >= 50) return branded ? 11000 : 7500;
  if (quantity >= 25) return branded ? 12500 : 8500;
  if (quantity >= 10) return branded ? 13500 : 9000;
  if (productType === "bulk") return 9000;
  return branded ? 15000 : 10000;
}

function customerDeliveryPrice(courierCostCents: number): number {
  if (courierCostCents <= 10000) return 10000;
  if (courierCostCents < 16000) return Math.min(16000, Math.round(courierCostCents * 1.10));
  return courierCostCents;
}

function validatedOrder(body: any) {
  const productType = clean(body?.productType, 20);
  if (!productNames[productType]) throw new HttpError(400, "Choose a valid Cardence card.");
  const minimum = productType === "bulk" ? 10 : 1;
  const quantity = Math.floor(Number(body?.quantity));
  if (!Number.isInteger(quantity) || quantity < minimum || quantity > 100) {
    throw new HttpError(400, `Choose between ${minimum} and 100 cards.`);
  }
  const deliveryMethod = clean(body?.deliveryMethod, 20) === "pickup" ? "pickup" : "courier";
  const customer = {
    fullName: clean(body?.customer?.fullName, 100),
    email: clean(body?.customer?.email, 180).toLowerCase(),
    phone: clean(body?.customer?.phone, 40),
    company: clean(body?.customer?.company, 120),
  };
  const address: Address = {
    streetAddress: clean(body?.address?.streetAddress, 180),
    localArea: clean(body?.address?.localArea, 100),
    city: clean(body?.address?.city, 100),
    province: clean(body?.address?.province, 60),
    postalCode: clean(body?.address?.postalCode, 10),
    country: "ZA",
  };
  if (!customer.fullName || !customer.phone || !/^\S+@\S+\.\S+$/.test(customer.email)) {
    throw new HttpError(400, "Enter a valid name, email address and phone number.");
  }
  if (deliveryMethod === "courier" && (!address.streetAddress || !address.localArea || !address.city || !address.province || !address.postalCode)) {
    throw new HttpError(400, "Complete the South African delivery address.");
  }
  return {
    productType,
    quantity,
    deliveryMethod,
    customer,
    address,
    pickupCode: clean(body?.pickupCode, 20).toUpperCase(),
    notes: clean(body?.notes, 1000),
    cardSkin: skins.has(clean(body?.cardSkin, 30)) ? clean(body?.cardSkin, 30) : "aubergine",
    brandName: clean(body?.brandName, 100),
    tagline: clean(body?.tagline, 140),
  };
}

function mapAddress(address: Address, company = "") {
  return {
    company,
    street_address: address.streetAddress,
    local_area: address.localArea,
    city: address.city,
    zone: address.province,
    country: "ZA",
    code: address.postalCode,
  };
}

function parcels(productType: string, quantity: number) {
  const result: any[] = [];
  for (let start = 0; start < quantity; start += 25) {
    const cardCount = Math.min(25, quantity - start);
    result.push({
      description: `${cardCount} x ${productNames[productType]}`,
      submitted_length_cm: 24,
      submitted_width_cm: 16,
      submitted_height_cm: 6,
      submitted_weight_kg: Number((0.2 + cardCount * 0.01).toFixed(3)),
      custom_parcel_reference: `CAR-${start / 25 + 1}`,
    });
  }
  return result;
}

function bobGoRateOptions(payload: any) {
  return (Array.isArray(payload?.provider_rate_requests) ? payload.provider_rate_requests : [])
    .flatMap((provider: any) => {
      if (provider?.status !== "success") return [];
      return (Array.isArray(provider?.responses) ? provider.responses : [])
        .filter((service: any) => service?.status === "success" && Number(service?.rate_amount) > 0)
        .map((service: any) => {
          const courierCostCents = Math.round(Number(service.rate_amount) * 100);
          const amountCents = customerDeliveryPrice(courierCostCents);
          return {
            live: true,
            amountCents,
            courierCostCents,
            logisticsFeeCents: amountCents - courierCostCents,
            providerSlug: clean(provider.provider_slug, 80),
            courierName: clean(provider.provider_name || provider.provider_slug || "Courier", 100),
            serviceLevelCode: clean(service.service_level_code, 100),
            serviceName: clean(service?.service_level?.name || service.service_level_name || service.service_level_code || "Courier delivery", 120),
            collectionCutoffTime: clean(service?.service_level?.collection_cut_off_time, 50),
          };
        });
    })
    .filter((rate: any) => rate.providerSlug && rate.serviceLevelCode && rate.amountCents > 0)
    .sort((left: any, right: any) => left.amountCents - right.amountCents);
}

function collectionDetails() {
  const address: Address = {
    streetAddress: clean(Deno.env.get("BOBGO_COLLECTION_STREET"), 180),
    localArea: clean(Deno.env.get("BOBGO_COLLECTION_AREA"), 100),
    city: clean(Deno.env.get("BOBGO_COLLECTION_CITY"), 100),
    province: clean(Deno.env.get("BOBGO_COLLECTION_PROVINCE"), 60),
    postalCode: clean(Deno.env.get("BOBGO_COLLECTION_POSTAL"), 10),
    country: "ZA",
  };
  const phone = clean(Deno.env.get("BOBGO_COLLECTION_PHONE"), 40);
  const email = clean(Deno.env.get("BOBGO_COLLECTION_EMAIL"), 180);
  const name = clean(Deno.env.get("BOBGO_COLLECTION_NAME") || "Cardence", 100);
  if (!address.streetAddress || !address.city || !address.province || !address.postalCode || !phone || !email) {
    throw new HttpError(503, "Courier checkout is being configured. Please try again shortly.");
  }
  return { address, phone, email, name };
}

async function deliveryQuote(order: ReturnType<typeof validatedOrder>) {
  if (order.deliveryMethod === "pickup") {
    if (!order.pickupCode) throw new HttpError(400, "Enter the handover code provided in person.");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(order.pickupCode));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const response = await adminRest(`store_pickup_codes?select=id,active,max_uses,used_count,expires_at&code_hash=eq.${hash}&limit=1`);
    const rows = await response.json().catch(() => []);
    const code = rows?.[0];
    if (!response.ok || !code || !code.active || Number(code.used_count) >= Number(code.max_uses) || new Date(code.expires_at).getTime() <= Date.now()) {
      throw new HttpError(400, "That handover code is invalid or has expired.");
    }
    return {
      live: true,
      amountCents: 0,
      providerSlug: "in-person",
      courierName: "In-person handover",
      serviceLevelCode: "owner-handover",
      serviceName: "Cardence will arrange the handover",
      quotedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  const token = requiredEnv("BOBGO_API_TOKEN");
  const collection = collectionDetails();
  const payload = {
    collection_address: mapAddress(collection.address, "Cardence"),
    delivery_address: mapAddress(order.address, order.customer.company),
    parcels: parcels(order.productType, order.quantity),
    collection_contact_mobile_number: collection.phone,
    collection_contact_email: collection.email,
    collection_contact_full_name: collection.name,
    delivery_contact_mobile_number: order.customer.phone,
    delivery_contact_email: order.customer.email,
    delivery_contact_full_name: order.customer.fullName,
    declared_value: unitPrice(order.productType, order.quantity) * order.quantity / 100,
    timeout: 10000,
  };
  const base = (Deno.env.get("BOBGO_API_BASE_URL") || "https://api.bobgo.co.za/v2").replace(/\/$/, "");
  const response = await fetch(`${base}/rates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ratePayload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, ratePayload?.message || ratePayload?.error || "The courier could not quote this address.");
  const selected = bobGoRateOptions(ratePayload)[0];
  if (!selected) throw new HttpError(422, "No courier service is available for this address.");
  return { ...selected, quotedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}

function decodeLogo(logo: any): { bytes: Uint8Array; mime: string; extension: string } {
  const dataUrl = clean(logo?.dataUrl, 4_300_000);
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new HttpError(400, "Upload a valid logo file.");
  const allowed: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg",
  };
  const mime = match[1].toLowerCase();
  if (!allowed[mime]) throw new HttpError(400, "Use a PNG, JPG, WebP or SVG logo.");
  const binary = atob(match[2]);
  if (binary.length > 3 * 1024 * 1024) throw new HttpError(400, "The logo file must be 3 MB or smaller.");
  return { bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)), mime, extension: allowed[mime] };
}

async function uploadLogo(orderId: string, logo: any): Promise<string> {
  const file = decodeLogo(logo);
  const path = `${orderId}/logo.${file.extension}`;
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${requiredEnv("SUPABASE_URL")}/storage/v1/object/order-logos/${path}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": file.mime, "x-upsert": "false" },
    body: file.bytes,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new HttpError(502, payload?.message || "The logo could not be uploaded.");
  }
  return path;
}

function orderReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `CD-${date}-${suffix}`;
}

async function consumePickupCode(code: string, orderId: string) {
  const response = await adminRest("rpc/consume_store_pickup_code", {
    method: "POST",
    body: JSON.stringify({ p_code: code, p_order_id: orderId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(400, payload?.message || "That handover code is invalid or has expired.");
}

async function initializeYoco(order: any) {
  const siteUrl = requiredEnv("SITE_URL").replace(/\/$/, "");
  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("YOCO_SECRET_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": order.public_reference,
    },
    body: JSON.stringify({
      amount: order.total_cents,
      currency: "ZAR",
      successUrl: `${siteUrl}/?payment=success&reference=${encodeURIComponent(order.public_reference)}`,
      cancelUrl: `${siteUrl}/?payment=cancelled&reference=${encodeURIComponent(order.public_reference)}`,
      failureUrl: `${siteUrl}/?payment=failed&reference=${encodeURIComponent(order.public_reference)}`,
      clientReferenceId: order.public_reference,
      externalId: order.id,
      metadata: {
        orderId: order.id,
        publicReference: order.public_reference,
        paymentKind: "cardence_store",
        productType: order.product_type,
        deliveryMethod: order.delivery_method,
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id || !payload?.redirectUrl) {
    throw new HttpError(502, payload?.message || payload?.error || "Yoco could not open checkout.");
  }
  return payload;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  try {
    assertAllowedOrigin(request);
    if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const body = await request.json();
    if (clean(body?.website, 30)) return jsonResponse(request, { ok: true });
    const order = validatedOrder(body);
    const quote = await deliveryQuote(order);
    if (body?.action === "quote") return jsonResponse(request, { ok: true, quote });
    if (body?.action !== "checkout") throw new HttpError(400, "Choose a valid store action.");
    if (order.productType === "custom" && !body?.logo?.dataUrl) throw new HttpError(400, "Upload the business logo for this custom card.");

    const id = crypto.randomUUID();
    const reference = orderReference();
    const logoPath = body?.logo?.dataUrl ? await uploadLogo(id, body.logo) : null;
    const unitPriceCents = unitPrice(order.productType, order.quantity);
    const merchandiseTotalCents = unitPriceCents * order.quantity;
    const totalCents = merchandiseTotalCents + quote.amountCents;
    const row = {
      id, public_reference: reference,
      customer_name: order.customer.fullName, customer_email: order.customer.email,
      customer_phone: order.customer.phone, customer_company: order.customer.company || null,
      product_type: order.productType, quantity: order.quantity, unit_price_cents: unitPriceCents,
      merchandise_total_cents: merchandiseTotalCents, shipping_amount_cents: quote.amountCents, total_cents: totalCents,
      delivery_address: order.deliveryMethod === "courier" ? order.address : {}, shipping_quote: quote,
      order_notes: order.notes || null, logo_path: logoPath, delivery_method: order.deliveryMethod,
      card_skin: order.cardSkin, brand_name: order.brandName || null, tagline: order.tagline || null,
      payment_method: "yoco", payment_status: "pending",
      fulfilment_status: order.productType === "custom" ? "designing" : "new",
      courier_name: quote.courierName, courier_service: quote.serviceName,
    };

    const insert = await adminRest("store_orders", {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row),
    });
    const inserted = await insert.json().catch(() => ({}));
    if (!insert.ok) throw new HttpError(502, inserted?.message || "The order could not be saved.");

    try {
      if (order.deliveryMethod === "pickup") await consumePickupCode(order.pickupCode, id);
      const checkout = await initializeYoco(row);
      const update = await adminRest(`store_orders?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          yoco_checkout_id: checkout.id,
          yoco_processing_mode: clean(checkout.processingMode || checkout.mode, 40) || null,
          payment_payload: { initialization: checkout }, updated_at: new Date().toISOString(),
        }),
      });
      if (!update.ok) throw new Error("Checkout opened but the order could not be linked.");
      return jsonResponse(request, { ok: true, reference, totalCents, authorizationUrl: checkout.redirectUrl }, 201);
    } catch (error) {
      await adminRest(`store_orders?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          payment_status: "failed",
          payment_payload: { initializationError: error instanceof Error ? error.message : "Checkout failed" },
          updated_at: new Date().toISOString(),
        }),
      });
      throw error;
    }
  } catch (error) {
    return errorResponse(request, error);
  }
});
