import {
  HttpError,
  adminRest,
  assertAllowedOrigin,
  authenticatedUser,
  errorResponse,
  jsonResponse,
  optionsResponse,
  requiredEnv,
} from "../_shared/runtime.ts";

function clean(value: unknown, maximum = 200) {
  return String(value || "").trim().slice(0, maximum);
}

async function restJson(path: string, init: RequestInit = {}) {
  const response = await adminRest(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(502, payload?.message || "Database request failed.");
  return payload;
}

function mapAddress(address: any, company = "") {
  return {
    company,
    street_address: clean(address?.streetAddress, 180),
    local_area: clean(address?.localArea, 100),
    city: clean(address?.city, 100),
    zone: clean(address?.province, 60),
    country: "ZA",
    code: clean(address?.postalCode, 10),
  };
}

function parcels(order: any) {
  const names: Record<string, string> = {
    original: "Cardence Original",
    custom: "Cardence Custom Branded",
    bulk: "Cardence Bulk Cards",
  };
  const result = [];
  for (let start = 0; start < Number(order.quantity); start += 25) {
    const count = Math.min(25, Number(order.quantity) - start);
    result.push({
      description: `${count} x ${names[order.product_type] || "Cardence card"}`,
      submitted_length_cm: 24,
      submitted_width_cm: 16,
      submitted_height_cm: 6,
      submitted_weight_kg: Number((0.2 + count * 0.01).toFixed(3)),
      custom_parcel_reference: `${order.public_reference}-P${result.length + 1}`,
    });
  }
  return result;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  try {
    assertAllowedOrigin(request);
    if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const user = await authenticatedUser(request);
    const admins = await restJson(`app_admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if (!admins?.length) throw new HttpError(403, "Admin access required.");
    const body = await request.json();
    const orderId = clean(body?.orderId, 80);
    if (!orderId) throw new HttpError(400, "Choose an order to ship.");
    const rows = await restJson(`store_orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`);
    const order = rows?.[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.delivery_method !== "courier") throw new HttpError(409, "In-person orders do not need a courier.");
    if (order.payment_status !== "paid") throw new HttpError(409, "Wait for confirmed payment before booking delivery.");
    if (order.fulfilment_status !== "ready_to_ship") throw new HttpError(409, "Mark the order ready to ship before booking Bob Go.");
    if (order.tracking_reference || order.tracking_url) {
      return jsonResponse(request, { ok: true, alreadyBooked: true, trackingReference: order.tracking_reference, trackingUrl: order.tracking_url });
    }

    const collectionAddress = {
      streetAddress: requiredEnv("BOBGO_COLLECTION_STREET"),
      localArea: Deno.env.get("BOBGO_COLLECTION_AREA") || "",
      city: requiredEnv("BOBGO_COLLECTION_CITY"),
      province: requiredEnv("BOBGO_COLLECTION_PROVINCE"),
      postalCode: requiredEnv("BOBGO_COLLECTION_POSTAL"),
    };
    const quote = order.shipping_quote || {};
    if (!quote.providerSlug || !quote.serviceLevelCode) throw new HttpError(409, "This order has no valid Bob Go quote.");
    const payload = {
      collection_address: mapAddress(collectionAddress, "Cardence"),
      collection_contact_name: Deno.env.get("BOBGO_COLLECTION_NAME") || "Cardence",
      collection_contact_mobile_number: requiredEnv("BOBGO_COLLECTION_PHONE"),
      collection_contact_email: requiredEnv("BOBGO_COLLECTION_EMAIL"),
      delivery_address: mapAddress(order.delivery_address, order.customer_company || ""),
      delivery_contact_name: order.customer_name,
      delivery_contact_mobile_number: order.customer_phone,
      delivery_contact_email: order.customer_email,
      parcels: parcels(order),
      declared_value: Number(order.merchandise_total_cents) / 100,
      timeout: 20000,
      custom_order_number: order.public_reference,
      service_level_code: quote.serviceLevelCode,
      provider_slug: quote.providerSlug,
    };
    const base = (Deno.env.get("BOBGO_API_BASE_URL") || "https://api.bobgo.co.za/v2").replace(/\/$/, "");
    const response = await fetch(`${base}/shipments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${requiredEnv("BOBGO_API_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const shipment = await response.json().catch(() => ({}));
    if (!response.ok) throw new HttpError(502, shipment?.message || shipment?.error || "Bob Go did not accept the booking.");
    const shipmentId = shipment.id || shipment.shipment_id;
    if (!shipmentId) throw new HttpError(502, "Bob Go returned no shipment identity.");
    const trackingReference = shipment.tracking_reference || shipment.tracking_number || String(shipmentId);
    const trackingUrl = shipment.tracking_url || null;
    await restJson(`store_orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        fulfilment_status: "shipped",
        tracking_reference: trackingReference,
        tracking_url: trackingUrl,
        courier_name: shipment.provider_name || shipment.courier_name || order.courier_name,
        courier_service: shipment.service_level_name || order.courier_service,
        updated_at: new Date().toISOString(),
      }),
    });
    return jsonResponse(request, { ok: true, alreadyBooked: false, trackingReference, trackingUrl });
  } catch (error) {
    return errorResponse(request, error);
  }
});
