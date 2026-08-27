# TapRoute MVP

A static HTML/CSS/JavaScript NFC-card dashboard backed by Supabase.

## How the NFC system works

Every physical NFC card is programmed ONCE with a permanent TapRoute URL:

    https://YOURNAME.github.io/YOUR-REPO/?c=ABC123XYZ

When somebody taps the NFC card:

1. `index.html` loads.
2. `app.js` reads the `?c=` card slug.
3. It calls the Supabase `resolve_card()` RPC.
4. Supabase returns the destination currently assigned to that card.
5. The browser redirects to Instagram, TikTok, WhatsApp, a website, etc.

The physical NFC card therefore never needs to be reprogrammed when its destination changes.

## Files

- `index.html` — landing page, login, dashboard and card editor
- `style.css` — complete responsive styling
- `app.js` — authentication, claiming, card editing and redirect logic
- `supabase.sql` — database, Row Level Security and RPC setup
- `README.md` — this guide

## 1. Create Supabase project

Create a new Supabase project manually.

Open:

    SQL Editor -> New Query

Paste the complete contents of `supabase.sql` and run it.

### Email confirmation

For a very fast in-person MVP, you can temporarily disable email confirmation:

    Authentication -> Providers -> Email

This means a new buyer can create an account and immediately claim the card.

For a larger public launch, turn email confirmation back on.

## 2. Get Supabase public credentials

In Supabase:

    Project Settings -> API

Copy:

- Project URL
- anon/public key

Open `app.js` and replace:

    const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
    const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

NEVER put the `service_role` key in this project. GitHub Pages is public.

## 3. Preview locally

Because the project loads Supabase from a CDN, a local web server is more reliable than double-clicking `index.html`.

From the project folder:

    python -m http.server 5500

Then open:

    http://localhost:5500

If Python is unavailable and you use VS Code, Live Server also works.

## 4. Create your test cards

The provided SQL automatically creates four unclaimed test cards.

After you know your final GitHub Pages URL, run:

    select slug, claim_code
    from public.cards
    where owner_id is null
    order by created_at;

For each NFC tag, program this URL:

    https://YOURNAME.github.io/YOUR-REPO/?c=SLUG

Example:

    https://kg123.github.io/taproute/?c=8A2B91D4EF

The `claim_code` is separate. Give that code to the buyer.

DO NOT put the claim code into the NFC tag.

## 5. Customer flow

Buyer receives the card.

They visit your normal site:

    https://YOURNAME.github.io/YOUR-REPO/

Then:

1. Create account.
2. Click `Claim a card`.
3. Enter activation code.
4. Choose `Any URL` or `WhatsApp`.
5. Save.

From that moment, tapping their physical card opens that destination.

They can log in later and change the destination without reprogramming the card.

## 6. WhatsApp

The dashboard accepts a South African number such as:

    072 123 4567

It automatically becomes:

    https://wa.me/27721234567

## 7. Social-profile links

Instagram:
    Profile -> Share profile -> Copy link

TikTok:
    Profile -> Share -> Copy link

Facebook:
    Profile/Page -> Share -> Copy link

LinkedIn:
    Profile -> Share profile / Copy link

YouTube:
    Channel -> Share -> Copy link

For almost anything else, simply paste the full `https://...` address.

## 8. GitHub Pages

Create a completely NEW folder/repository for TapRoute. Do not initialise Git inside another project.

Suggested folder:

    C:\Users\YOURNAME\Desktop\TapRoute

Then copy these files into that folder.

After creating a new EMPTY GitHub repository named `taproute`, commands are:

    cd "C:\Users\YOURNAME\Desktop\TapRoute"
    git init
    git branch -M main
    git add .
    git commit -m "Launch TapRoute MVP"
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/taproute.git
    git push -u origin main

Then in GitHub:

    Repository -> Settings -> Pages
    Source: Deploy from a branch
    Branch: main
    Folder: / (root)

IMPORTANT:
If `git remote -v` shows a remote before you add the new one, STOP. You are probably inside an existing Git repository.

## 9. Program the NFC

Use any trusted NFC-writing app.

For each tag:

1. Add a URL/URI record.
2. Paste its permanent `?c=SLUG` URL.
3. Write.
4. Test.
5. Only then print/laminate the finished card.

Do NOT permanently lock the NFC tag during early testing.

## 10. Before selling

Test all of these:

- New account creation
- Login
- Claim code
- URL destination
- WhatsApp destination
- Change destination
- Tap redirect on Android
- Tap redirect on iPhone
- NFC after lamination
- Invalid/unclaimed card
- Mobile dashboard

## Important MVP limitation

This version counts every successful NFC resolution as a tap. It does not yet include:
- advanced analytics
- custom profile pages
- multiple buttons per card
- Google Review mode
- admin dashboard
- PayFast checkout
- card transfer/reassignment
- lost-card replacement
- custom domains

Those should come after the basic product proves it can sell.
