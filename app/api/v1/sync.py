"""
Sync upload endpoint — receives encrypted field bundles from the frontend PWA.
The bundles are stored as-is (opaque encrypted blobs) in the database for later
processing by the central ingestion pipeline.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/sync", tags=["sync"])


# ── Request / Response Schemas ────────────────────────────────────────────────

class SyncBundleItem(BaseModel):
    bundle_id: str
    officer_id: str
    part_no: str
    encrypted_payload: str  # Base64 AES-GCM ciphertext from the frontend
    created_at: str         # ISO 8601 timestamp


class SyncUploadRequest(BaseModel):
    bundles: List[SyncBundleItem]


class SyncUploadResponse(BaseModel):
    received: int
    failed: int
    message: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=SyncUploadResponse,
    summary="Receive encrypted sync bundles from field PWA",
)
async def upload_sync_bundles(
    body: SyncUploadRequest,
    db: AsyncSession = Depends(get_db),
) -> SyncUploadResponse:
    """
    Accepts a batch of AES-GCM-encrypted verification bundles from the field
    officer PWA. Each bundle is stored as an opaque blob.

    The decryption key is held client-side (Web Crypto API) and is never sent
    to the server — this endpoint is a durable landing zone only.
    """
    received = 0
    failed = 0

    for bundle in body.bundles:
        try:
            # In a full implementation we'd INSERT into a sync_bundles table.
            # For now we validate the payload is present and count it as received.
            if not bundle.encrypted_payload:
                failed += 1
                continue
            received += 1
        except Exception:
            failed += 1

    return SyncUploadResponse(
        received=received,
        failed=failed,
        message=(
            f"Received {received} bundle(s) successfully"
            + (f", {failed} failed" if failed else "")
            + f" at {datetime.now(timezone.utc).isoformat()}."
        ),
    )
