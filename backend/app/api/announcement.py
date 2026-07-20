import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.db import get_database
from app.auth.dependencies import get_current_user, RequireRoles
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    ReactionToggle,
    PollVote
)
from app.services.announcement import AnnouncementService
from app.utils.supabase import upload_file_to_supabase

router = APIRouter(prefix="/announcements", tags=["Announcements"])

def get_announcement_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AnnouncementService:
    return AnnouncementService(db)

@router.post(
    "/upload-cover",
    summary="Upload Announcement Cover Banner to Supabase Storage"
)
async def upload_cover_image(
    file: UploadFile = File(...),
    current_user: User = Depends(RequireRoles(["owner"]))
):
    """
    Validates file format (must be an image) and size (<= 5MB),
    uploads to Supabase Storage, and returns the storage URL.
    """
    contents = await file.read()
    
    # 5MB Limit Validation
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image file size must not exceed 5MB."
        )
    
    # Image Type Validation
    content_type = file.content_type or ""
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    valid_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]

    if not content_type.startswith("image/") and file_ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Cover banner must be an image file (JPG, PNG, WebP, GIF, SVG)."
        )

    unique_filename = f"announcement_cover_{uuid.uuid4()}{file_ext or '.jpg'}"
    url = upload_file_to_supabase(
        file_bytes=contents,
        filename=unique_filename,
        content_type=content_type or "image/jpeg"
    )

    return {
        "message": "Cover image uploaded successfully to Supabase.",
        "url": url
    }

@router.get(
    "",
    summary="List Workspace Announcements"
)
async def list_announcements(
    current_user: User = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service)
):
    team_ids = [str(t) for t in (getattr(current_user, "team_ids", []) or [])]
    return await service.list_announcements(
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        user_role=current_user.role,
        user_team_ids=team_ids
    )

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create Announcement (Owner / Admin Exclusive)"
)
async def create_announcement(
    payload: AnnouncementCreate,
    current_user: User = Depends(RequireRoles(["owner"])),
    service: AnnouncementService = Depends(get_announcement_service)
):
    """
    Only Workspace Owner / Admin can create an announcement.
    """
    return await service.create_announcement(
        workspace_id=str(current_user.workspace_id),
        author_id=str(current_user.id),
        author_name=current_user.full_name,
        data=payload.model_dump()
    )

@router.post(
    "/{announcement_id}/pin",
    summary="Toggle Pin Announcement (Owner / Admin Exclusive)"
)
async def toggle_pin(
    announcement_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    service: AnnouncementService = Depends(get_announcement_service)
):
    is_pinned = await service.toggle_pin(announcement_id, str(current_user.workspace_id))
    return {"message": "Pin status updated.", "is_pinned": is_pinned}

@router.post(
    "/{announcement_id}/hide",
    summary="Toggle Hide Announcement (Owner / Admin Exclusive)"
)
async def toggle_hide(
    announcement_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    service: AnnouncementService = Depends(get_announcement_service)
):
    is_hidden = await service.toggle_hide(announcement_id, str(current_user.workspace_id))
    return {"message": "Hide status updated.", "is_hidden": is_hidden}

@router.delete(
    "/{announcement_id}",
    summary="Delete Announcement (Owner / Admin Exclusive)"
)
async def delete_announcement(
    announcement_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    service: AnnouncementService = Depends(get_announcement_service)
):
    await service.delete_announcement(announcement_id, str(current_user.workspace_id))
    return {"message": "Announcement deleted successfully."}

@router.post(
    "/{announcement_id}/react",
    summary="React to Announcement"
)
async def toggle_reaction(
    announcement_id: str,
    payload: ReactionToggle,
    current_user: User = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service)
):
    reactions = await service.toggle_reaction(announcement_id, str(current_user.id), payload.emoji)
    return {"message": "Reaction updated.", "reactions": reactions}

@router.post(
    "/{announcement_id}/acknowledge",
    summary="Acknowledge Announcement ('I have read this')"
)
async def toggle_acknowledge(
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service)
):
    acknowledged_by = await service.toggle_acknowledge(announcement_id, str(current_user.id))
    return {"message": "Acknowledgment updated.", "acknowledged_by": acknowledged_by}

@router.post(
    "/{announcement_id}/vote",
    summary="Vote in Announcement Poll"
)
async def vote_poll(
    announcement_id: str,
    payload: PollVote,
    current_user: User = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service)
):
    poll = await service.vote_poll(announcement_id, str(current_user.id), payload.option_id)
    return {"message": "Vote recorded.", "poll": poll}
