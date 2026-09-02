# Cardence

Cardence sells NFC and QR smart cards backed by a living contact profile or one other secure link. A card is encoded once with a permanent address such as:

```text
https://cardence.co.za/?c=A1B2C3D4E5
```

The owner can change what opens without rewriting the NFC tag or replacing its matching QR code.

## Current product

- Public retail storefront with unbranded and branded cards
- Unbranded pricing from R100 and branded pricing from R150
- Automatic server-enforced bulk discounts at 10, 25 and 50 cards
- Live Bob Go delivery quote at checkout
- The same delivery pricing rule as Kompo Nation
- Secure Yoco Checkout payment with a signed webhook
- Protected in-person handover using short-lived, limited-use admin codes
- Custom logo upload and live colour preview
- Account creation, email confirmation, card claiming and profile editing
- Contact profile or other-link routing
- Instagram and TikTok username or profile-link normalisation
- Permanent NFC and QR URLs with tap counting
- Protected `/admin` inventory, artwork, sales, revenue and fulfilment controls
- Bob Go shipment booking after payment and production are complete

## Pricing rules

The Edge Function is the source of truth. Browser totals mirror these rules:

| Quantity | Unbranded each | Branded each |
|---:|---:|---:|
| 1 to 9 | R100 | R150 |
| 10 to 24 | R90 | R135 |
| 25 to 49 | R85 | R125 |
| 50 to 100 | R75 | R110 |

Delivery uses Kompo Nation's customer pricing rule:

- Courier cost at or below R100: customer pays R100
- Courier cost above R100 and below R160: add 10%, capped at R160
- Courier cost at or above R160: customer pays the courier cost

The signed Yoco amount is calculated from the server-side merchandise price plus the server-side Bob Go delivery price.

## Admin sales accounting

Every Cardence checkout uses a reference beginning with `CD-`. The admin dashboard reports:

- Cardence Yoco received
- Card merchandise received
- Shipping received
- Paid order count
- Refunded value

These are revenue figures, not profit. They only include Cardence orders confirmed by the signed Yoco webhook, which makes them separable from other sales in the same Yoco merchant account.

The admin can also see the exact product, quantity, colour, uploaded logo, customer, delivery address, payment status, fulfilment status and tracking details for every order.

## Protected handovers

Free handover is not a public nationwide delivery option. The admin creates a short-lived code while the buyer is physically present. A code has an expiry and limited number of uses, and it is consumed when checkout is created. The buyer still pays through Yoco.

## Supabase deployment

Apply migrations:

```powershell
supabase db push --linked
```

Deploy the commerce functions:

```powershell
supabase functions deploy tapnation-store-order --project-ref dqyqkeqdvsidmffaanys
supabase functions deploy cardence-yoco-webhook --project-ref dqyqkeqdvsidmffaanys
supabase functions deploy cardence-book-shipment --project-ref dqyqkeqdvsidmffaanys
```

Required function secrets:

```text
SITE_URL=https://cardence.co.za
CORS_ORIGINS=https://cardence.co.za,https://www.cardence.co.za,https://cardence.pages.dev
YOCO_SECRET_KEY
YOCO_WEBHOOK_SECRET
BOBGO_API_TOKEN
BOBGO_API_BASE_URL=https://api.bobgo.co.za/v2
BOBGO_COLLECTION_STREET
BOBGO_COLLECTION_AREA
BOBGO_COLLECTION_CITY
BOBGO_COLLECTION_PROVINCE
BOBGO_COLLECTION_POSTAL
BOBGO_COLLECTION_PHONE
BOBGO_COLLECTION_EMAIL
BOBGO_COLLECTION_NAME
```

On the production computer, the guided activation script securely prompts for the Yoco live key, Bob Go token and collection details, tests Yoco, registers the Cardence webhook and saves the encrypted Supabase secrets:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\activate-cardence-commerce.ps1
```

Register the Yoco webhook at:

```text
https://dqyqkeqdvsidmffaanys.supabase.co/functions/v1/cardence-yoco-webhook
```

Save the one-time webhook signing secret as `YOCO_WEBHOOK_SECRET`. Do not place payment, webhook, Bob Go or Supabase service-role secrets in browser JavaScript or commit them to this repository.

## Admin production workflow

1. Generate a batch of 1 to 500 cards.
2. Copy permanent card URLs to NFC tags.
3. Use the matching QR artwork on the printed card.
4. Download the double-sided print PDF and print at 100% using long-edge duplex.
5. Print the activation guide and private claim-code labels.
6. Move each card through Created, Encoded, Printed, Packed and Shipped.
7. For store orders, wait for Yoco confirmation before production or handover.
8. Mark courier orders Ready to ship, then use Book Bob Go.

## Local preview

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Use `?preview=dashboard` for the local account and admin demonstration.

## Production hosting

The GitHub repository is connected to Cloudflare Pages. A push to `main` deploys to:

```text
https://cardence.pages.dev
https://cardence.co.za
```

The custom domain should be the Supabase Authentication Site URL. Add these redirect patterns in Supabase Authentication URL Configuration:

```text
https://cardence.co.za/**
https://www.cardence.co.za/**
https://cardence.pages.dev/**
http://127.0.0.1:4173/**
```

## Email production setup

Keep email confirmation enabled. Supabase's built-in email sender is only suitable for testing. Configure the existing custom SMTP provider, verify the Cardence sender domain, then set a reasonable email rate limit and enable CAPTCHA before advertising heavily.

## Key files

- `index.html`: storefront, account, admin and checkout UI
- `style.css`: responsive Cardence retail and dashboard design
- `app.js`: authentication, storefront, checkout, admin and artwork behaviour
- `supabase/migrations/`: deployed schema and secure RPC changes
- `supabase/functions/tapnation-store-order/`: prices, Bob Go quote and Yoco checkout
- `supabase/functions/cardence-yoco-webhook/`: signed Yoco payment confirmation
- `supabase/functions/cardence-book-shipment/`: admin-only Bob Go booking
- `CARD_DESIGN_GUIDE.md`: physical-card production guidance
- `generate_qr_codes.py`: matching QR export utility
