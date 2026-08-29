# Cardence

TapNation is a static NFC-card website and customer dashboard backed by Supabase. A physical card is programmed once with a permanent URL such as:

```text
https://cardence.pages.dev/?c=A1B2C3D4E5
```

When tapped, the website resolves the card slug in Supabase, counts the tap, and opens either the owner's live contact profile or one secure external link. Details can change without rewriting the NFC tag or its matching QR code.

## What this version includes

- Focused account creation and login experience with no public storefront
- One default living contact template per account
- Name, phone, public email, headline, bio, company and location fields
- Instagram, Facebook, WhatsApp, LinkedIn, TikTok, YouTube, X and website links
- Instagram and TikTok fields accept either an `@username` or a copied profile-share URL, then normalize usernames to their canonical web profile pages
- Automatic hiding of every empty contact or social field
- Interactive public actions for calling, WhatsApp, email, link sharing and vCard contact saving
- Live profile preview while the owner edits their details
- Two clear card routes: **Contact profile** or **Other link**
- Email signup/login and secure physical-card claiming
- Account dashboard with card and lifetime-tap totals
- Protected `/admin` control room with inventory totals, linked/activated counts, saved batch history and production status
- Batch tools for 1 to 500 cards, permanent URLs, access codes, matching QR codes, artwork exports and cross-device copy actions
- Print-ready activation packs with iPhone and Android placement diagrams, dashed cutlines, an instruction card and one cut-out label per card
- Generic and custom card design studio with logo upload, automatic colour-skin selection and downloadable front/back artwork
- Privacy-light analytics (timestamp + card only; no IP, fingerprint or precise location)
- Cloudflare Pages-ready static hosting

## Files

- `index.html`: account/login entry experience, profile editor, public contact page and admin UI
- `style.css`: responsive visual system
- `app.js`: Supabase auth, live profiles, two-route card control and inventory tools
- `supabase.sql`: idempotent database install/upgrade
- `supabase/functions/`: store orders, delivery quotes, authenticated checkout, direct verification and signed Paystack webhook handling
- `supabase/migrations/`: deployed database changes, including living contact profiles and persistent admin batches
- `CARD_DESIGN_GUIDE.md`: production-ready physical card design guidance
- `generate_qr_codes.py`: generates matching print/test QR artwork from a slug, URL or admin CSV
- `requirements-qr.txt`: the small Python QR dependency
- `_headers`: Cloudflare Pages security headers

## 1. Upgrade Supabase first

The website already contains your public Supabase project URL and publishable key. Do not replace the publishable key with a `service_role` key; the browser bundle is public.

In Supabase:

1. Open **SQL Editor → New query**.
2. Paste all of `supabase.sql`.
3. Click **Run**.

The script preserves existing cards and URLs, converts legacy destination presets into the new two-route model, and adds the contact-profile fields and secure RPCs.

### Give yourself the admin inventory tool

After your TapNation account exists, run this once in the SQL Editor with your real login email:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict (user_id) do nothing;
```

Log out and back in, then open `/admin`. The control room can generate 1 to 500 cards at a time and download their card name, slug, customer access code and permanent NFC URL as CSV.

The slug is written to the NFC tag. The separate claim code goes into the customer pack. Never print the claim code on the public face of the card or encode it in the NFC tag.

The current `/admin` workflow is designed for production packing:

1. Create a batch, choose a quantity, and optionally upload a customer logo.
2. Download the CSV, copy any permanent URL, or open a QR image from any signed-in device.
3. Use **Download artwork pack** for front/back card artwork with the matching QR code.
4. Use **Download print PDF** for a single production document with eight card faces per A4 sheet. The front and mirrored back sheets are paired for 100% scale, long-edge duplex printing, with bleed, trim marks and an NFC tap-zone alignment marker.
5. Use **Print activation pack** for one polished instruction card per requested copy plus removable code labels with dashed cutlines.
6. Move each card through Created, Encoded, Printed, Packed and Shipped as you prepare the order.

For a multiple-card order, include one instruction card and tape the matching removable code label to each card. The label identifies the card by its position and claim code without exposing the code on the public card face.

### Legacy Business access

The earlier Business plan data is preserved for compatibility, but the streamlined account/profile website no longer presents an upgrade flow. An owner can still grant the legacy flag manually if older analytics tooling needs it:

```sql
update public.profiles
set plan = 'business', updated_at = now()
where id = (select id from auth.users where email = 'CUSTOMER_EMAIL_HERE');
```

The next login unlocks the same daily analytics as a paid account.

## 2. Retained payment backend

The Paystack Edge Functions remain in the repository so previous work is not destroyed, but the streamlined website does not call or display them.

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

## 3. Retained store and Bob Go backend

`tapnation-store-order` and the private order/logo data remain deployed for compatibility and record preservation. There is no store surface in the current website.

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

The `qr_codes` folder receives a high-resolution PNG, a print-friendly SVG and `qr_manifest.csv`. The encoded address is the permanent `https://cardence.pages.dev/?c=SLUG` card link, not the current destination. This ensures NFC taps and QR scans use the same Supabase redirect and tap counter.

## 6. Cloudflare Pages production

This repository is already connected to:

```text
https://github.com/Junior-py0/TapNation.git
```

The live project is connected at `https://cardence.pages.dev`. Pushing to `main` triggers its production deployment. For a new Cloudflare project:

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Choose **Create application → Pages → Connect to Git** (the wording may also appear as **Import an existing Git repository**).
4. Authorize GitHub and select `Junior-py0/TapNation`.
5. Use these build settings:

| Setting | Value |
|---|---|
| Project name | `cardence` (or any available name you want) |
| Production branch | `main` |
| Framework preset | None |
| Build command | `exit 0` (blank also works for a no-build static site) |
| Build output directory | `/` |
| Root directory | Leave blank |

6. Click **Save and Deploy**.

Cloudflare uses the project name for the hostname, so the example above becomes:

```text
https://cardence.pages.dev
```

The exact `cardence.pages.dev` name is attached to the Cloudflare Pages project named `cardence`. The name does not come from GitHub Pages; GitHub is simply the source repository. Every push to `main` will trigger a new production deployment, and other branches can receive preview deployments.

After deployment, update the Supabase authentication URLs described above. Test signup, login, claiming and one real `?c=SLUG` redirect on the new domain before encoding physical cards.

### Important if tags already contain the old URL

The permanent URL stored on an NFC tag does not change itself. If cards already contain the long GitHub Pages URL, either:

- rewrite those NFC tags to the new `https://...pages.dev/?c=SLUG` URL, or
- keep the old GitHub-hosted redirect working permanently.

Do not lock tags until the final production URL has been tested on iPhone and Android.

## 7. Customer setup flow

1. Customer creates an account.
2. They confirm their email and log in.
3. They choose **Add card**, enter the removable activation code, and claim the card.
4. They choose **Contact profile** to add only the details they want shown, or **Other link** to route the card to another URL.
5. The setup guide explains the correct place to hold an iPhone or Android phone and includes QR scanning as a fallback.
6. They save. The next tap or scan uses the new destination immediately.

The profile is a living page rather than a stale contact sheet. Empty name, phone, email and social fields stay hidden, and every saved change is available on the next tap without rewriting the NFC tag.

## 8. Business analytics behaviour

Each successful route increments `cards.tap_count` and inserts a row in `tap_events`. Business analytics aggregates those events by Johannesburg date and by owned card. Raw events are not exposed to customers.

The lifetime count from the previous MVP remains intact, but historical daily events did not exist before this upgrade. Daily charts begin accumulating from the moment the upgraded `resolve_card()` function is installed.

## 9. Pre-launch checklist

- Run the complete `supabase.sql` upgrade, or apply the latest migration in `supabase/migrations/`
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
- Print one activation pack and verify the dashed cutlines, code order and phone placement diagrams
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
