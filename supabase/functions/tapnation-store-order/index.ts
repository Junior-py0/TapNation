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

type Customer = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
};

const productNames: Record<string, string> = {
  original: "TapNation Original",
  custom: "TapNation Custom Branded",
  bulk: "TapNation Bulk Cards",
};

function clean(value: unknown, maximum = 200): string {
  return String(value || "").trim().slice(0, maximum);
}

function unitPrice(productType: string, quantity: number): number {
  if (productType === "custom") return 44900;
  if (productType === "bulk") {
    if (quantity >= 50) return 19900;
    if (quantity >= 25) return 22900;
    return 24900;
  }
  return 29900;
}

function validatedOrder(body: any) {
  const productType = clean(body?.productType, 20);
  if (!productNames[productType]) throw new HttpError(400, "Choose a valid TapNation card.");
  const minimum = productType === "bulk" ? 10 : 1;
  const quantity = Math.floor(Number(body?.quantity));
  if (!Number.isInteger(quantity) || quantity < minimum || quantity > 100) {
    throw new HttpError(400, `Choose between ${minimum} and 100 cards.`);
  }

  const customer: Customer = {
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
  if (!address.streetAddress || !address.localArea || !address.city || !address.province || !address.postalCode) {
    throw new HttpError(400, "Complete the South African delivery address.");
  }
  return { productType, quantity, customer, address, notes: clean(body?.notes, 1000) };
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
  const capacity = 25;
  for (let start = 0; start < quantity; start += capacity) {
    const cardCount = Math.min(capacity, quantity - start);
    result.push({
      description: `${cardCount} × ${productNames[productType]}`,
      submitted_length_cm: 24,
      submitted_width_cm: 16,
      submitted_height_cm: 6,
      submitted_weight_kg: Number((0.2 + cardCount * 0.01).toFixed(3)),
      custom_parcel_reference: `TAP-${start / capacity + 1}`,
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
        .map((service: any) => ({
          live: true,
          amountCents: Math.round(Number(service.rate_amount) * 100),
          providerSlug: clean(provider.provider_slug, 80),
          courierName: clean(provider.provider_name || provider.provider_slug || "Courier", 100),
          serviceLevelCode: clean(service.service_level_code, 100),
          serviceName: clean(service?.service_level?.name || service.service_level_name || service.service_level_code || "Courier delivery", 120),
          collectionCutoffTime: clean(service?.service_level?.collection_cut_off_time, 50),
        }));
    })
    .filter((rate: any) => rate.providerSlug && rate.serviceLevelCode && rate.amountCents > 0)
    .sort((left: any, right: any) => left.amountCents - right.amountCents);
}

async function deliveryQuote(order: ReturnType<typeof validatedOrder>) {
  const token = Deno.env.get("BOBGO_API_TOKEN")?.trim();
  const collection: Address = {
    streetAddress: clean(Deno.env.get("BOBGO_COLLECTION_STREET"), 180),
    localArea: clean(Deno.env.get("BOBGO_COLLECTION_AREA"), 100),
    city: clean(Deno.env.get("BOBGO_COLLECTION_CITY"), 100),
    province: clean(Deno.env.get("BOBGO_COLLECTION_PROVINCE"), 60),
    postalCode: clean(Deno.env.get("BOBGO_COLLECTION_POSTAL"), 10),
    country: "ZA",
  };
  const collectionPhone = clean(Deno.env.get("BOBGO_COLLECTION_PHONE"), 40);
  const collectionEmail = clean(Deno.env.get("BOBGO_COLLECTION_EMAIL"), 180);
  const collectionName = clean(Deno.env.get("BOBGO_COLLECTION_NAME") || "TapNation", 100);
  const configComplete = token && collection.streetAddress && collection.city && collection.province && collection.postalCode && collectionPhone && collectionEmail;

  if (configComplete) {
    const unitPriceCents = unitPrice(order.productType, order.quantity);
    const payload = {
      collection_address: mapAddress(collection, "TapNation"),
      delivery_address: mapAddress(order.address, order.customer.company),
      parcels: parcels(order.productType, order.quantity),
      collection_contact_mobile_number: collectionPhone,
      collection_contact_email: collectionEmail,
      collection_contact_full_name: collectionName,
      delivery_contact_mobile_number: order.customer.phone,
      delivery_contact_email: order.customer.email,
      delivery_contact_full_name: order.customer.fullName,
      declared_value: unitPriceCents * order.quantity / 100,
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

  return {
    live: false,
    amountCents: Math.max(0, Number(Deno.env.get("DEFAULT_DELIVERY_CENTS") || 9900)),
    providerSlug: "launch-estimate",
    courierName: "Nationwide courier",
    serviceLevelCode: "standard",
    serviceName: "Standard tracked delivery",
    collectionCutoffTime: "",
    quotedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function decodeLogo(logo: any): { bytes: Uint8Array; mime: string; extension: string } {
  const dataUrl = clean(logo?.dataUrl, 4_300_000);
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new HttpError(400, "Upload a valid logo file.");
  const allowed: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
  };
  const mime = match[1].toLowerCase();
  if (!allowed[mime]) throw new HttpError(400, "Use a PNG, JPG, WebP, SVG or PDF logo.");
  const binary = atob(match[2]);
  if (binary.length > 3 * 1024 * 1024) throw new HttpError(400, "The logo file must be 3 MB or smaller.");
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { bytes, mime, extension: allowed[mime] };
}

async function uploadLogo(orderId: string, logo: any): Promise<string> {
  const file = decodeLogo(logo);
  const path = `${orderId}/logo.${file.extension}`;
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${requiredEnv("SUPABASE_URL")}/storage/v1/object/order-logos/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.mime,
      "x-upsert": "false",
    },
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
  return `TN-${date}-${suffix}`;
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
    if (body?.action !== "order") throw new HttpError(400, "Choose a valid store action.");
    if (order.productType === "custom" && !body?.logo?.dataUrl) throw new HttpError(400, "Upload the business logo for this custom card.");

    const id = crypto.randomUUID();
    const reference = orderReference();
    const logoPath = body?.logo?.dataUrl ? await uploadLogo(id, body.logo) : null;
    const unitPriceCents = unitPrice(order.productType, order.quantity);
    const merchandiseTotalCents = unitPriceCents * order.quantity;
    const insert = await adminRest("store_orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id,
        public_reference: reference,
        customer_name: order.customer.fullName,
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
        customer_company: order.customer.company || null,
        product_type: order.productType,
        quantity: order.quantity,
        unit_price_cents: unitPriceCents,
        merchandise_total_cents: merchandiseTotalCents,
        shipping_amount_cents: quote.amountCents,
        total_cents: merchandiseTotalCents + quote.amountCents,
        delivery_address: order.address,
        shipping_quote: quote,
        order_notes: order.notes || null,
        logo_path: logoPath,
        courier_name: quote.courierName,
        courier_service: quote.serviceName,
      }),
    });
    const inserted = await insert.json().catch(() => ({}));
    if (!insert.ok) throw new HttpError(502, inserted?.message || "The order could not be saved.");
    return jsonResponse(request, {
      ok: true,
      reference,
      totalCents: merchandiseTotalCents + quote.amountCents,
      paymentStatus: "pending",
    }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
});

