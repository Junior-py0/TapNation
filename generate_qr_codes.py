"""Generate print-ready QR codes for TapNation permanent card links.

The QR contains the exact same ``?c=SLUG`` URL programmed into the NFC tag.
Both tapping and scanning therefore use TapNation's existing resolve-and-redirect flow.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

try:
    import qrcode
    import qrcode.image.svg
except ImportError as exc:  # pragma: no cover - gives a useful setup message
    raise SystemExit(
        "Missing QR dependency. Run: python -m pip install -r requirements-qr.txt"
    ) from exc


DEFAULT_BASE_URL = "https://tapnation.pages.dev/"
SLUG_PATTERN = re.compile(r"^[A-Z0-9]{6,32}$")


def clean_slug(value: str) -> str:
    slug = re.sub(r"[^A-Z0-9]", "", value.upper())
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError(f"Invalid TapNation slug: {value!r}")
    return slug


def card_url_from_slug(slug: str, base_url: str = DEFAULT_BASE_URL) -> str:
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("The base URL must be a complete HTTPS address.")
    return urlunparse((parsed.scheme, parsed.netloc, "/", "", urlencode({"c": clean_slug(slug)}), ""))


def validate_card_url(value: str) -> tuple[str, str]:
    parsed = urlparse(value.strip())
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"Card URL must use HTTPS: {value!r}")
    slug_values = parse_qs(parsed.query).get("c", [])
    if len(slug_values) != 1:
        raise ValueError(f"Card URL needs exactly one ?c=SLUG value: {value!r}")
    return value.strip(), clean_slug(slug_values[0])


def safe_name(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", value.strip()).strip("-")
    return (cleaned or fallback)[:70]


def create_qr_pair(url: str, slug: str, label: str, output_dir: Path) -> tuple[Path, Path]:
    stem = safe_name(f"{label}-{slug}", slug)
    png_path = output_dir / f"{stem}.png"
    svg_path = output_dir / f"{stem}.svg"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=4,
    )
    qr.add_data(url, optimize=0)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").save(png_path)
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(svg_path)
    return png_path, svg_path


def entries_from_csv(csv_path: Path, base_url: str) -> list[tuple[str, str, str]]:
    entries: list[tuple[str, str, str]] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for line_number, row in enumerate(reader, start=2):
            try:
                raw_url = (row.get("nfc_url") or "").strip()
                raw_slug = (row.get("slug") or "").strip()
                if raw_url:
                    url, slug = validate_card_url(raw_url)
                elif raw_slug:
                    slug = clean_slug(raw_slug)
                    url = card_url_from_slug(slug, base_url)
                else:
                    raise ValueError("row has neither nfc_url nor slug")
                label = (row.get("card_name") or "TapNation-Card").strip()
                entries.append((url, slug, label))
            except ValueError as exc:
                raise ValueError(f"CSV line {line_number}: {exc}") from exc
    if not entries:
        raise ValueError("The CSV contains no card rows.")
    return entries


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--slug", help="Card slug, for example A1B2C3D4E5")
    source.add_argument("--url", help="Complete permanent TapNation ?c= URL")
    source.add_argument("--csv", type=Path, help="Admin CSV containing nfc_url or slug")
    parser.add_argument("--name", default="TapNation-Card", help="Filename label for one QR")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="HTTPS site URL used with --slug")
    parser.add_argument("--output", type=Path, default=Path("qr_codes"), help="Output directory")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.csv:
            entries = entries_from_csv(args.csv, args.base_url)
        elif args.url:
            url, slug = validate_card_url(args.url)
            entries = [(url, slug, args.name)]
        else:
            slug = clean_slug(args.slug)
            entries = [(card_url_from_slug(slug, args.base_url), slug, args.name)]

        args.output.mkdir(parents=True, exist_ok=True)
        manifest_rows: list[dict[str, str]] = []
        for url, slug, label in entries:
            png_path, svg_path = create_qr_pair(url, slug, label, args.output)
            manifest_rows.append(
                {"card_name": label, "slug": slug, "nfc_url": url, "png": png_path.name, "svg": svg_path.name}
            )

        manifest_path = args.output / "qr_manifest.csv"
        with manifest_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["card_name", "slug", "nfc_url", "png", "svg"])
            writer.writeheader()
            writer.writerows(manifest_rows)

        print(f"Created {len(entries)} QR code pair(s) in {args.output.resolve()}")
        print("Use SVG for print layouts and PNG for quick testing.")
        return 0
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

