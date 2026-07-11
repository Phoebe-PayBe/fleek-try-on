"""Google Gemini calls: try-on image generation + buyer summary text."""

import base64
import json
import re
from typing import Any, Optional, Tuple

import httpx

import config

BASE = config.GEMINI_API_BASE


_SIZE_BUILD = {
    "S": "slim, size S build",
    "M": "average, size M build",
    "L": "broad, size L build",
    "XL": "plus, size XL build",
}


def _model_description(profile: dict[str, Any]) -> str:
    # New profiles carry a garment-style size (S/M/L/XL); older ones may still
    # have heightCm/weightKg — support both.
    size = profile.get("size")
    if size in _SIZE_BUILD:
        build = _SIZE_BUILD[size]
    else:
        height = int(profile.get("heightCm", 170))
        weight = int(profile.get("weightKg", 62))
        bmi = weight / ((height / 100) ** 2)
        build = "slim" if bmi < 19 else "average" if bmi < 25 else "curvy / broad" if bmi < 30 else "plus-size"
        build = f"approximately {height} cm tall, {weight} kg ({build} build)"
    return f"{profile.get('ethnicity', 'Asian')} {profile.get('gender', 'male').lower()} fashion model, {build}"


def _inline_part(data: bytes, mime: str) -> dict[str, Any]:
    return {"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode()}}


async def generate_tryon(
    garment: dict[str, Any],
    profile: dict[str, Any],
    item_image: Optional[Tuple[bytes, str]],
    template_image: Optional[Tuple[bytes, str]],
    stock_model_image: Optional[Tuple[bytes, str]] = None,
) -> Tuple[bytes, str]:
    """Returns (image_bytes, mime_type). Raises RuntimeError with a readable message."""
    if not config.GEMINI_API_KEY:
        raise RuntimeError("no-api-key")

    prompt = "Photorealistic full-body e-commerce fashion photograph. "
    if stock_model_image:
        prompt += (
            "Dress the model shown in the FIRST attached photo (our stock model — keep their "
            "identity, face, body and pose exactly as photographed) in EXACTLY the garment shown "
            "in the next attached product photo — reproduce its colours, fabric texture, seams, "
            "prints and proportions faithfully. "
        )
    else:
        prompt += (
            f"A {_model_description(profile)} is wearing EXACTLY the garment shown in the attached "
            "product photo — reproduce its colours, fabric texture, seams, prints and proportions "
            "faithfully. "
        )
    if template_image:
        prompt += (
            "The last attached image is the garment's technical spec sheet (paper template); "
            "use it to get the cut, collar, pockets and proportions right. "
        )
    prompt += (
        f"The garment is \"{garment.get('name', '')}\" ({garment.get('category', '')}), "
        f"fabric: {garment.get('fabric') or 'unknown'}. "
        "Neutral warm studio background, soft daylight, natural relaxed pose, whole outfit visible "
        "head to toe. No text, no watermark, single model only."
    )

    parts: list[dict[str, Any]] = [{"text": prompt}]
    if stock_model_image:
        parts.append(_inline_part(*stock_model_image))
    if item_image:
        parts.append(_inline_part(*item_image))
    if template_image:
        parts.append(_inline_part(*template_image))

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{BASE}/{config.GEMINI_IMAGE_MODEL}:generateContent",
            params={"key": config.GEMINI_API_KEY},
            json={"contents": [{"role": "user", "parts": parts}]},
        )
    if r.status_code != 200:
        raise RuntimeError(f"Gemini image API error {r.status_code}: {r.text[:300]}")
    for part in r.json().get("candidates", [{}])[0].get("content", {}).get("parts", []):
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            return base64.b64decode(inline["data"]), mime
    raise RuntimeError("Gemini returned no image — try again or adjust the photos")


async def generate_summary(
    garment: dict[str, Any],
    item_image: Optional[Tuple[bytes, str]],
    template_image: Optional[Tuple[bytes, str]],
) -> dict[str, str]:
    if not config.GEMINI_API_KEY:
        return _fallback_summary(garment)

    prompt = (
        "You are writing product intelligence for B2B wholesale buyers (secondhand / vintage / upcycled "
        "fashion retailers) sourcing on Fleek. The garment is upcycled: custom-made from reclaimed fabric "
        "scraps.\n\n"
        f"Garment: {garment.get('name', '')}\nCategory: {garment.get('category', '')}\n"
        f"Sizes: {garment.get('size_range', '')}\nFabric: {garment.get('fabric', '')}\n"
        f"Upcycled source: {garment.get('upcycled_source', '')}\n"
        f"Wholesale price: {garment.get('wholesale_price', '')}\n"
        f"Quantity available: {garment.get('quantity', '')}\n\n"
        "Attached: product photo and/or technical spec sheet. Respond with STRICT JSON only:\n"
        '{"feel": "2-3 sentences on how the fabric feels to wear — texture, weight, drape, breathability",\n'
        ' "styleNotes": "2-3 sentences on the overall style — era, silhouette, how to style it",\n'
        ' "buyerNotes": "2-3 sentences for the retail buyer — who it sells to, merchandising angle, the upcycled story"}'
    )
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if item_image:
        parts.append(_inline_part(*item_image))
    if template_image:
        parts.append(_inline_part(*template_image))

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{BASE}/{config.GEMINI_TEXT_MODEL}:generateContent",
            params={"key": config.GEMINI_API_KEY},
            json={
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
        )
    if r.status_code != 200:
        raise RuntimeError(f"Gemini text API error {r.status_code}: {r.text[:300]}")
    text = "".join(
        p.get("text", "")
        for p in r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
    )
    try:
        parsed = json.loads(re.sub(r"^```json?\s*|```\s*$", "", text.strip()))
        return {
            "feel": str(parsed.get("feel", "")),
            "styleNotes": str(parsed.get("styleNotes", "")),
            "buyerNotes": str(parsed.get("buyerNotes", "")),
        }
    except (json.JSONDecodeError, AttributeError):
        return {"feel": text, "styleNotes": "", "buyerNotes": ""}


_FEEL_BY_FABRIC = [
    (re.compile(r"denim", re.I),
     "Sturdy mid-to-heavyweight handle with the familiar dry, crisp denim grain. It softens noticeably "
     "with wear and holds structure well — expect a broken-in feel within a few wears."),
    (re.compile(r"cotton|poplin|jersey", re.I),
     "Soft, breathable cotton handle with a smooth, dry touch. Lightweight enough for all-day wear, with "
     "a natural drape that relaxes against the body rather than holding a rigid shape."),
    (re.compile(r"fleece|sweat", re.I),
     "Plush brushed-back interior with a cosy, insulating feel. Medium-heavy weight that drapes with a "
     "relaxed slouch — comfortable straight out of the box."),
    (re.compile(r"wool|knit", re.I),
     "Warm, textured knit handle with gentle stretch. Insulating without being stifling, and drapes with "
     "a soft, structured fall."),
    (re.compile(r"silk|satin", re.I),
     "Fluid, cool-to-the-touch handle with a subtle sheen. Very light on the body with an elegant, "
     "liquid drape."),
    (re.compile(r"leather", re.I),
     "Substantial, structured feel with a smooth-grain surface that develops character over time. Holds "
     "its silhouette firmly."),
]


def _fallback_summary(g: dict[str, Any]) -> dict[str, str]:
    fabric = g.get("fabric", "") or ""
    feel = next(
        (text for pattern, text in _FEEL_BY_FABRIC if pattern.search(fabric)),
        "Balanced mid-weight handle typical of quality reclaimed fabric — soft where it touches the skin, "
        "with enough body to keep its shape on the rail and on the customer.",
    )
    category = (g.get("category", "piece") or "piece").lower().rstrip("s")
    return {
        "feel": feel,
        "styleNotes": (
            f"A one-of-a-kind upcycled {category} with visible craft value — panel mixing and reworked "
            "construction give it an elevated streetwear / vintage crossover look. Styles easily over "
            "basics; the contrast panelling does the talking."
        ),
        "buyerNotes": (
            "Strong fit for secondhand, vintage and sustainability-led retailers: each piece is custom-made "
            f"from fabric saved from landfill ({g.get('upcycled_source') or 'reclaimed off-cuts'}), so "
            "scarcity and story justify a premium retail markup. Merchandise around the upcycled narrative — "
            f"\"no two pieces alike\" — at {g.get('wholesale_price') or 'the listed wholesale price'} with "
            f"{g.get('quantity') or 'limited'} available."
        ),
    }
