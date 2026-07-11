"""Fleek Supplier Studio API.

React frontend ⇄ this FastAPI service ⇄ Supabase (catalogue + image storage)
                                       ⇄ Google Gemini (try-on renders + buyer summaries)

Run:  uvicorn main:app --reload --port 8000
"""

import base64
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import config
import gemini
import supabase_client as sb

app = FastAPI(title="Fleek Supplier Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon: frontend may run on any port
    allow_methods=["*"],
    allow_headers=["*"],
)


class GarmentIn(BaseModel):
    id: str
    name: str = ""
    category: str = "Shirts"
    size_range: str = ""
    fabric: str = ""
    upcycled_source: str = ""
    wholesale_price: str = ""
    quantity: str = ""
    template_url: str | None = None
    item_url: str | None = None
    tryon_url: str | None = None
    tryon_is_demo: bool = False
    model_profile: dict[str, Any] = {}
    summary: dict[str, Any] | None = None
    status: str = "draft"


class ImageIn(BaseModel):
    kind: str  # template | item | tryon
    data_url: str  # data:image/...;base64,....


class TryOnIn(BaseModel):
    model_profile: dict[str, Any]


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "supabase": config.SUPABASE_URL,
        "gemini": bool(config.GEMINI_API_KEY),
    }


@app.get("/api/proxy-image")
async def proxy_image(url: str) -> Response:
    """Fetch a stored garment image server-side for browsers that can't reach
    Supabase storage directly (CORS / restricted networks). Locked to our own
    storage host to prevent SSRF."""
    if not url.startswith(f"{config.SUPABASE_URL}/storage/v1/object/public/"):
        raise HTTPException(400, "Only Supabase storage URLs can be proxied")
    try:
        data, mime = await sb.fetch_bytes(url)
    except Exception as e:
        raise HTTPException(502, f"Fetch failed: {e}")
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/garments")
async def list_garments() -> list[dict[str, Any]]:
    try:
        return await sb.list_garments()
    except Exception as e:  # pragma: no cover
        raise HTTPException(502, f"Supabase error: {e}")


@app.post("/api/garments")
async def upsert_garment(g: GarmentIn) -> dict[str, Any]:
    try:
        return await sb.upsert_garment(g.model_dump())
    except Exception as e:
        raise HTTPException(502, f"Supabase error: {e}")


@app.delete("/api/garments/{garment_id}")
async def delete_garment(garment_id: str) -> dict[str, bool]:
    try:
        await sb.delete_garment(garment_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(502, f"Supabase error: {e}")


def _decode_data_url(data_url: str) -> tuple[bytes, str, str]:
    try:
        head, b64 = data_url.split(",", 1)
        mime = head.split(":", 1)[1].split(";", 1)[0]
        ext = {"image/png": "png", "image/webp": "webp"}.get(mime, "jpg")
        return base64.b64decode(b64), mime, ext
    except Exception:
        raise HTTPException(400, "Invalid data URL")


@app.post("/api/garments/{garment_id}/image")
async def upload_image(garment_id: str, body: ImageIn) -> dict[str, str]:
    if body.kind not in ("template", "item", "tryon"):
        raise HTTPException(400, "kind must be template | item | tryon")
    data, mime, ext = _decode_data_url(body.data_url)
    # timestamp busts CDN caches when a garment image is replaced
    path = f"{garment_id}/{body.kind}-{int(time.time())}.{ext}"
    try:
        url = await sb.upload_image(path, data, mime)
        return {"url": url}
    except Exception as e:
        raise HTTPException(502, f"Storage error: {e}")


async def _load_garment(garment_id: str) -> dict[str, Any]:
    rows = [g for g in await sb.list_garments() if g["id"] == garment_id]
    if not rows:
        raise HTTPException(404, "Garment not found")
    return rows[0]


async def _image_pair(garment: dict[str, Any]) -> tuple[tuple[bytes, str] | None, tuple[bytes, str] | None]:
    item = await sb.fetch_bytes(garment["item_url"]) if garment.get("item_url") else None
    template = await sb.fetch_bytes(garment["template_url"]) if garment.get("template_url") else None
    return item, template


@app.post("/api/garments/{garment_id}/tryon")
async def tryon(garment_id: str, body: TryOnIn) -> dict[str, Any]:
    """Generate the try-on render server-side. Returns {demo: true} when no
    Gemini key is configured so the frontend can use its local demo renderer."""
    if not config.GEMINI_API_KEY:
        return {"demo": True}
    garment = await _load_garment(garment_id)
    item, template = await _image_pair(garment)
    if not item and not template:
        raise HTTPException(400, "Garment has no images to work from")
    try:
        img, mime = await gemini.generate_tryon(garment, body.model_profile, item, template)
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    ext = "png" if mime == "image/png" else "jpg"
    url = await sb.upload_image(f"{garment_id}/tryon-{int(time.time())}.{ext}", img, mime)
    row = await sb.upsert_garment(
        {**_row_fields(garment), "tryon_url": url, "tryon_is_demo": False,
         "model_profile": body.model_profile,
         "status": garment["status"] if garment["status"] == "published" else "preview"}
    )
    return {"demo": False, "url": url, "garment": row}


@app.post("/api/garments/{garment_id}/summary")
async def summary(garment_id: str) -> dict[str, Any]:
    garment = await _load_garment(garment_id)
    item, template = await _image_pair(garment)
    try:
        result = await gemini.generate_summary(garment, item, template)
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    await sb.upsert_garment({**_row_fields(garment), "summary": result})
    return result


def _row_fields(garment: dict[str, Any]) -> dict[str, Any]:
    """Strip PostgREST metadata down to writable columns."""
    keys = (
        "id name category size_range fabric upcycled_source wholesale_price quantity "
        "template_url item_url tryon_url tryon_is_demo model_profile summary status"
    ).split()
    return {k: garment.get(k) for k in keys}
