"""Thin async wrapper over Supabase PostgREST + Storage REST APIs."""

from typing import Any, Optional, Tuple

import httpx

import config


def _headers(extra: Optional[dict] = None) -> dict:
    h = {
        "apikey": config.SUPABASE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_KEY}",
    }
    if extra:
        h.update(extra)
    return h


async def list_garments() -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{config.SUPABASE_URL}/rest/v1/{config.GARMENTS_TABLE}",
            params={"select": "*", "order": "created_at.desc"},
            headers=_headers(),
        )
        r.raise_for_status()
        return r.json()


async def upsert_garment(row: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{config.SUPABASE_URL}/rest/v1/{config.GARMENTS_TABLE}",
            params={"on_conflict": "id"},
            headers=_headers(
                {
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates,return=representation",
                }
            ),
            json=row,
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if isinstance(data, list) and data else row


async def delete_garment(garment_id: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{config.SUPABASE_URL}/rest/v1/{config.GARMENTS_TABLE}",
            params={"id": f"eq.{garment_id}"},
            headers=_headers(),
        )
        r.raise_for_status()


async def upload_image(path: str, data: bytes, content_type: str) -> str:
    """Upload to the public bucket and return the public URL."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{config.SUPABASE_URL}/storage/v1/object/{config.STORAGE_BUCKET}/{path}",
            headers=_headers({"Content-Type": content_type, "x-upsert": "true"}),
            content=data,
        )
        r.raise_for_status()
    return f"{config.SUPABASE_URL}/storage/v1/object/public/{config.STORAGE_BUCKET}/{path}"


async def list_objects(prefix: str) -> list[dict]:
    """List objects in the bucket under a prefix (e.g. 'stock-models/')."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{config.SUPABASE_URL}/storage/v1/object/list/{config.STORAGE_BUCKET}",
            headers=_headers({"Content-Type": "application/json"}),
            json={"prefix": prefix, "limit": 100, "sortBy": {"column": "updated_at", "order": "desc"}},
        )
        r.raise_for_status()
        return r.json()


async def fetch_bytes(url: str) -> Tuple[bytes, str]:
    """Download an image (e.g. a stored garment photo) for AI calls."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content, r.headers.get("content-type", "image/jpeg")
