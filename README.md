# TapNation

TapNation is a static NFC-card website and customer dashboard backed by Supabase. A physical card is programmed once with a permanent URL such as:

```text
https://tapnation.pages.dev/?c=A1B2C3D4E5
```

When tapped, the website resolves the card slug in Supabase, counts the tap, and opens the destination the owner currently selected. The destination can change without rewriting the NFC tag.

## What this version includes

- Full responsive marketing-site redesign
- Storefront for Original, custom-branded and bulk NFC cards
- Address-based delivery quotes with a Bob Go live-rate path and clearly labelled R99 launch fallback
- Secure logo intake plus order references and invoice/payment-link follow-up
- Email signup/login and secure card claiming
- Guided presets for any URL, Instagram, TikTok, YouTube, WhatsApp, Google Reviews, LinkedIn, Facebook, email, phone and Google Maps
- Clear platform-specific instructions and examples
- Four visual card-preview themes
- Starter dashboard with lifetime counts
- Business dashboard with 7, 30 and 90-day trends plus per-card rankings
- Paystack Business subscriptions at R99/month or R999/year
- Protected `/admin` control room with inventory totals, linked/activated counts, recent orders, batch card generation and CSV export
- One-click Shop navigation from the signed-in account dashboard
- Print-ready PNG and SVG QR generation from the same permanent URL used by each NFC tag
- Privacy-light analytics (timestamp + card only; no IP, fingerprint or precise location)
- Cloudflare Pages-ready static hosting

## Files

- `index.html` — landing page, auth, customer dashboard, analytics and admin UI
- `style.css` — responsive visual system
- `app.js` — Supabase auth, routing, destination builder, analytics and inventory tools
- `supabase.sql` — idempotent database install/upgrade
- `supabase/functions/` — store orders, delivery quotes, authenticated checkout, direct verification and signed Paystack webhook handling
- `supabase/migrations/` — deployed storefront/order/admin database changes
- `CARD_DESIGN_GUIDE.md` — production-ready physical card design guidance
- `generate_qr_codes.py` — generates matching print/test QR artwork from a slug, URL or admin CSV
- `requirements-qr.txt` — the small Python QR dependency
- `_headers` — Cloudflare Pages security headers

## 1. Upgrade Supabase first

The website already contains your public Supabase project URL and publishable key. Do not replace the publishable key with a `service_role` key; the browser bundle is public.

In Supabase:

1. Open **SQL Editor → New query**.
2. Paste all of `supabase.sql`.
3. Click **Run**.

The script preserves the existing `cards` rows and adds profiles, plans, tap events, expanded destinations, analytics RPCs and the admin card generator.

### Give yourself the admin inventory tool

After your TapNation account exists, run this once in the SQL Editor with your real login email:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict (user_id) do nothing;
```

Log out and back in, then open `/admin`. The control room can generate 1–100 cards at a time and download their card name, slug, customer access code and permanent NFC URL as CSV.

The slug is written to the NFC tag. The separate claim code goes into the customer pack. Never print the claim code on the public face of the card or encode it in the NFC tag.

### Enable Business manually for a test/customer account

The real checkout uses Paystack. For a free internal test account, an owner can still grant Business manually:

```sql
update public.profiles
set plan = 'business', updated_at = now()
where id = (select id from auth.users where email = 'CUSTOMER_EMAIL_HERE');
```

The next login unlocks the same daily analytics as a paid account.

## 2. Paystack Business billing

The browser calls `tapnation-business-checkout`; only an authenticated user can start checkout. The secret key stays in Supabase Edge Function secrets. On return, `tapnation-business-verify` verifies the transaction directly with Paystack. The webhook independently validates Paystack's SHA-512 signature, verifies the transaction again, records it idempotently, and only then updates `profiles.plan`.

Required TapNation Edge Function secrets:

```text
PAYSTACK_SECRET_KEY
PAYSTACK_BUSINESS_MONTHLY_PLAN
PAYSTACK_BUSINESS_ANNUAL_PLAN
SITE_URL
CORS_ORIGINS
```

Create two recurring ZAR plans in Paystack:

| Plan | Amount | Interval |
|---|---:|---|
| TapNation Business Monthly | R99 | Monthly |
| TapNation Business Annual | R999 | Annually |

This Paystack business already uses the Kompo Nation webhook URL. Do not replace it. The Kompo webhook safely routes references beginning `TN-BUS-` and the two TapNation plan codes to:

```text
https://dqyqkeqdvsidmffaanys.supabase.co/functions/v1/tapnation-paystack-webhook
```

Paystack is currently in Test mode. Switch the TapNation secret and plan codes to their live equivalents only after Paystack approves the business and the complete test checkout succeeds.

## 3. Store checkout and Bob Go

`tapnation-store-order` is a public Edge Function with strict server-side pricing and validation. It calculates delivery, saves the order without exposing the orders table, and stores custom logos in a private `order-logos` bucket. Until a live gateway is ready, checkout takes no payment and tells the customer that a secure Yoco payment link or EFT invoice will follow.

The deployed launch fallback is R99 and is explicitly labelled as an estimate. Add these Edge Function secrets to switch the same checkout to live Bob Go rates:

```text
BOBGO_API_TOKEN
BOBGO_API_BASE_URL
BOBGO_COLLECTION_STREET
BOBGO_COLLECTION_AREA
BOBGO_COLLECTION_CITY
BOBGO_COLLECTION_PROVINCE
BOBGO_COLLECTION_POSTAL
BOBGO_COLLECTION_PHONE
BOBGO_COLLECTION_EMAIL
BOBGO_COLLECTION_NAME
```

The collection address and contacts must describe the real parcel pickup location. Do not commit them to this repository.

## 4. Authentication URL and email settings

After you know the final Pages address, open **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://YOUR-PROJECT-NAME.pages.dev`
- **Redirect URLs:** add `https://YOUR-PROJECT-NAME.pages.dev/**`
- For local testing, also add `http://localhost:5500/**`

Keep email confirmation enabled for public launch.

### Remove Supabase's two-email-per-hour limit

Supabase's built-in sender is a trial service capped at two messages per hour. Configure custom SMTP under **Authentication → Email → SMTP Settings**, then raise **Authentication → Rate Limits → Email sent** to a sensible launch value such as 100/hour.

Resend is a practical starting point for transactional email. It provides an SMTP relay and lets you verify a sender domain before production launch:

| Supabase field | Resend value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | Resend API key (`re_...`) |
| Sender email | A sender verified in Resend |
| Sender name | `TapNation` |

Do not paste SMTP credentials into this repository or browser JavaScript. Configure CAPTCHA before raising signup limits aggressively.

## 5. Preview locally

From this folder:

```powershell
python -m http.server 5500
```

Open `http://localhost:5500`. Do not test by double-clicking `index.html`; authentication, redirects and clipboard behaviour are more reliable through a local server.

### Generate the matching QR fallback

Install the QR dependency once:

```powershell
python -m pip install -r requirements-qr.txt
```

Generate one QR from a card slug:

```powershell
python generate_qr_codes.py --slug A1B2C3D4E5 --name "Reception Card"
```

Or generate a complete batch from the CSV downloaded in `/admin`:

```powershell
python generate_qr_codes.py --csv .\tapnation-card-batch-2026-08-29.csv
```

The `qr_codes` folder receives a high-resolution PNG, a print-friendly SVG and `qr_manifest.csv`. The encoded address is the permanent `https://tapnation.pages.dev/?c=SLUG` card link—not the current destination—so NFC taps and QR scans use the same Supabase redirect and tap counter.

## 6. Cloudflare Pages production

This repository is already connected to:

```text
https://github.com/Junior-py0/TapNation.git
```

The live project is already connected at `https://tapnation.pages.dev`. Pushing to `main` triggers its production deployment. For a new Cloudflare project:

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Choose **Create application → Pages → Connect to Git** (the wording may also appear as **Import an existing Git repository**).
4. Authorize GitHub and select `Junior-py0/TapNation`.
5. Use these build settings:

| Setting | Value |
|---|---|
| Project name | `tapnation-sa` (or any available name you want) |
| Production branch | `main` |
| Framework preset | None |
| Build command | `exit 0` (blank also works for a no-build static site) |
| Build output directory | `/` |
| Root directory | Leave blank |

6. Click **Save and Deploy**.

Cloudflare uses the project name for the hostname, so the example above becomes:

```text
https://tapnation-sa.pages.dev
```

The exact `tapnation.pages.dev` name is only available if nobody has already claimed that Cloudflare Pages project name. The name does not come from GitHub Pages; GitHub is simply the source repository. Every push to `main` will trigger a new production deployment, and other branches can receive preview deployments.

After deployment, update the Supabase authentication URLs described above. Test signup, login, claiming and one real `?c=SLUG` redirect on the new domain before encoding physical cards.

### Important if tags already contain the old URL

The permanent URL stored on an NFC tag does not change itself. If cards already contain the long GitHub Pages URL, either:

- rewrite those NFC tags to the new `https://...pages.dev/?c=SLUG` URL, or
- keep the old GitHub-hosted redirect working permanently.

Do not lock tags until the final production URL has been tested on iPhone and Android.

## 7. Customer flow

1. Customer creates an account.
2. They claim the activation code from their pack.
3. They open the card and choose a destination preset.
4. TapNation explains exactly what link, username, email or phone number to enter.
5. They save. The next tap uses the new destination immediately.

## 8. Business analytics behaviour

Each successful route increments `cards.tap_count` and inserts a row in `tap_events`. Business analytics aggregates those events by Johannesburg date and by owned card. Raw events are not exposed to customers.

The lifetime count from the previous MVP remains intact, but historical daily events did not exist before this upgrade. Daily charts begin accumulating from the moment the upgraded `resolve_card()` function is installed.

## 9. Pre-launch checklist

- Run the complete `supabase.sql` upgrade
- Add your account to `app_admins`
- Open `/admin` and generate a one-card test CSV
- Generate its QR artwork and confirm the QR opens the same destination as the NFC URL
- Set the real Bob Go collection secrets before advertising live courier pricing
- Create Yoco payment links or send EFT invoices for launch orders while Paystack remains under review
- Deploy to Cloudflare Pages and configure Supabase auth URLs
- Configure custom SMTP and test a confirmation email
- Complete one Paystack test subscription and verify automatic Business unlock
- Finish Paystack activation before accepting live payments
- Generate a small test batch and download its CSV
- Claim one test card as a normal customer
- Save and test every destination type you plan to advertise
- Confirm a tap increments the total and Business daily chart
- Test invalid, unclaimed and inactive card behaviour
- Test mobile layout on iPhone and Android
- Program final `.pages.dev/?c=SLUG` links into NFC tags
- Keep claim codes separate from public card artwork
- Do not permanently lock tags during early production testing

## Official Cloudflare references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Deploying static HTML to Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
