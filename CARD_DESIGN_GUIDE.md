# Cardence physical card design guide

This guide is for a standard CR80 PVC card, the familiar bank-card format.

## Production canvas

| Item | Size |
|---|---|
| Final trimmed card | 85.60 × 53.98 mm |
| Bleed | 3 mm on every edge |
| Artwork canvas with bleed | 91.60 × 59.98 mm |
| Recommended safe margin | At least 4 mm inside the trim edge |
| Raster size at 300 dpi | About 1082 × 709 px including bleed |

Ask the chosen printer for its exact template before final export; its corner radius, colour profile, magnetic stripe or chip requirements may differ.

## Recommended front layout

Use one unmistakable action rather than filling the card with explanations:

```text
┌─────────────────────────────────────┐
│ Cardence                         ))) │
│                                     │
│                                     │
│       TAP HERE                      │
│       One tap. Anywhere.            │
└─────────────────────────────────────┘
```

- Keep the Cardence mark in the top-left.
- Put a familiar contactless/NFC glyph near the actual tap area.
- Make **TAP HERE** the largest message.
- Use one supporting line at most.
- Preserve empty space; it makes the card feel premium and improves comprehension.

## Recommended back layout

The back can carry the explanation and fallback:

- A short line: “Hold near the top of your phone.”
- A QR code using the same permanent `https://...pages.dev/?c=SLUG` URL.
- A short support or product website address.
- A tiny card identifier for your own inventory, if needed.

Do not place the customer claim code on the public card face. Put it on a removable sticker, sleeve or insert so a stranger cannot claim an unsold card.

## Three strong visual directions

### 1. Midnight (recommended launch design)

- Deep near-black green background (`#07120F`)
- Acid-lime accent (`#C9FF4A`)
- Warm white text (`#FFFEF9`)
- Soft-touch matte lamination with selective gloss on the NFC rings if the printer supports it

This is the closest match to the revamped website and has the clearest brand recognition.

### 2. Citrus

- Acid-lime full background
- Near-black typography
- Small white or holographic detail

This is highly visible in a wallet or on a counter. Keep the back dark so the two sides still feel premium.

### 3. Cobalt business edition

- Saturated cobalt (`#6179FF`)
- Warm white text
- Lime NFC accent
- Optional employee name or role on the back

This creates an obvious Business-tier product without changing the TapNation layout system.

## Type and legibility

- Use Manrope ExtraBold or another geometric sans for the main action.
- Keep essential printed text at 7 pt or larger.
- Maintain strong contrast; do not place lime text over white or pale photography.
- Convert fonts to outlines only in the final printer copy, while keeping an editable source file.
- Avoid thin hairlines and tiny low-contrast text near the edge.

## NFC and material rules

- Use standard 0.76 mm PVC unless the supplier specifies another construction.
- Ask the supplier where the antenna/inlay sits, then align the printed contactless target with that zone.
- Avoid metallic foil directly over or around the NFC antenna unless the manufacturer confirms it will work.
- A metal card needs an NFC construction specifically designed for metal; a normal inlay can fail against metal.
- Test the actual printed and laminated sample on several iPhones and Android phones before ordering the full batch.

## QR fallback

Generate each QR from that card’s permanent NFC URL, not its current destination. That preserves the ability to reroute later. Use high error correction, a clear quiet zone, and test the final printed size. Around 18 to 22 mm square is a practical starting point, but always test the printer proof.

This project includes `generate_qr_codes.py`. It accepts one slug or the batch CSV downloaded from `/admin`, then creates a high-resolution PNG for testing and an SVG for the print layout. For example:

```powershell
python -m pip install -r requirements-qr.txt
python generate_qr_codes.py --csv .\cardence-card-batch-2026-08-29.csv
```

Match every generated filename and manifest row to the same physical card slug before printing or encoding. Never generate the QR from a customer’s current Instagram, WhatsApp or website destination; that would bypass Cardence and could not be rerouted later.

The `/admin` activation-pack export repeats the same placement guidance on the printed instruction card. Hold the top of an iPhone or the back of an Android phone over the contactless target, or scan the matching QR code with the camera. Test the final laminated sample before producing a full batch.

## Printer export checklist

- CMYK using the printer’s requested colour profile
- 300 dpi images at final size
- 3 mm bleed included
- Crop marks outside the bleed if requested
- Text and logo inside the safe zone
- PDF/X-1a or the printer’s requested PDF standard
- Fonts embedded or outlined in the final production copy
- Unique QR/NFC slug correctly matched to the inventory CSV
- Physical proof tested before locking or producing the full batch
