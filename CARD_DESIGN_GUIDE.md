# Cardence physical card design guide

This guide is for the 86 × 54 mm business-card lamination pouches currently used for Cardence production.

## Production canvas

| Item | Size |
|---|---|
| Lamination pouch (finished outer size) | 86 × 54 mm |
| Final trimmed printed insert | 84 × 52 mm |
| Clear pouch edge | 1 mm on every edge |
| Artwork canvas with 3 mm bleed | 90 × 58 mm |
| Recommended safe margin | At least 4 mm inside the trim edge |
| Raster size at 300 dpi | About 1063 × 685 px including bleed |

Print the production PDF at 100%. Each artwork tile is 90 × 58 mm because it includes 3 mm of printer bleed on every side. The exporter preserves the original card-design proportions. Cut on the inner dashed contour to produce the finished 84 × 52 mm paper insert, then centre it inside the 86 × 54 mm pouch so 1 mm of clear laminate remains around every edge.

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

The `/admin` activation-pack export repeats the same placement guidance on the printed instruction card. Hold the top of an iPhone or the back of an Android phone over the contactless target, or scan the matching QR code with the camera. The **Download print PDF** export lays out eight card faces per A4 sheet, mirrors the back columns, and adds matching sheet-registration crosshairs. Print the front and back sheets at 100%, turn the back sheet print-side out, align the crosshairs, paste the full sheets together, and only then cut the individual cards. Test the first finished laminated sample before producing a full batch.

## Printer export checklist

- CMYK using the printer’s requested colour profile
- 300 dpi images at final size
- 3 mm bleed included
- Printed insert trimmed to exactly 84 × 52 mm on the inner dashed contour
- Insert centred in the full 86 × 54 mm pouch with an even 1 mm clear edge on every side
- Front and mirrored-back sheets pasted together using the matching registration crosshairs before cutting
- Pouch kept untrimmed after lamination so the seal remains intact
- Crop marks outside the bleed if requested
- Text and logo inside the safe zone
- PDF/X-1a or the printer’s requested PDF standard
- Fonts embedded or outlined in the final production copy
- Unique QR/NFC slug correctly matched to the inventory CSV
- Physical proof tested before locking or producing the full batch


---

## Current Cardence Production Dimensions

The current physical production setup is:

| Component | Dimensions |
|---|---:|
| Lamination pouch | 86 × 54 mm |
| Finished paper card / trim size | 84 × 52 mm |
| Clear laminate edge | 1 mm on every side |
| Printer bleed | 3 mm per side |
| Artwork including 3 mm bleed | 90 × 58 mm |

### Important

The **86 × 54 mm measurement is the lamination pouch size**, not the paper card size.

The paper insert must be cut to exactly:

**84 × 52 mm**

When centred inside the pouch, this leaves:

**1 mm of clear laminate around all four edges.**

For artwork that uses 3 mm printer bleed:

**90 × 58 mm artwork → cut to 84 × 52 mm → laminate inside 86 × 54 mm pouch**

Do not export or cut the paper card at 86 × 54 mm because the laminate requires a clear border in order to seal correctly.

At 300 DPI, the approximate finished card raster dimensions are:

- Width: 992 px
- Height: 614 px

The physical millimetre dimensions take precedence over pixel dimensions.
