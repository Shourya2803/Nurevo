from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException, Request
from fastapi.responses import Response, FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import os
import uuid
import httpx

from app.utils.db import get_database
from app.auth.dependencies import get_current_user, RequireRoles, enforce_workspace_isolation
from app.utils.security import decode_access_token
from app.repositories.user import UserRepository
from app.models.user import User
from app.services.document import DocumentService
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.utils.supabase import upload_file_to_supabase

router = APIRouter(prefix="/documents", tags=["Documents"])

async def get_current_user_from_header_or_query(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "token" in request.query_params:
        token = request.query_params["token"]
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token.")
    
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(payload.get("sub"))
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="User unauthorized or inactive.")
    return user

def get_document_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> DocumentService:
    return DocumentService(db)

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Document"
)
async def create_document(
    payload: DocumentCreate,
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Creates a new document. Autoproved if author is Admin/Lead. Pending approval if Member.
    """
    doc = await doc_service.create_document(
        workspace_id=str(current_user.workspace_id),
        author_id=str(current_user.id),
        author_role=current_user.role,
        data=payload
    )
    return {
        "message": "Document created successfully.",
        "document": {
            "id": str(doc.id),
            "title": doc.title,
            "description": doc.description,
            "content": doc.content,
            "tags": doc.tags,
            "attachment_url": doc.attachment_url,
            "status": doc.status,
            "workspace_id": str(doc.workspace_id),
            "team_id": str(doc.team_id) if doc.team_id else None,
            "author_id": str(doc.author_id),
            "author_name": current_user.full_name,
            "approved_by": str(doc.approved_by) if getattr(doc, "approved_by", None) else None,
            "approved_by_name": current_user.full_name if getattr(doc, "approved_by", None) else None,
            "created_at": doc.created_at.isoformat(),
            "updated_at": doc.updated_at.isoformat()
        }
    }

@router.get(
    "",
    summary="List Workspace Documents"
)
async def list_documents(
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Lists workspace documents based on RBAC access policies.
    """
    docs = await doc_service.list_documents(
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    
    from app.repositories.user import UserRepository
    user_repo = UserRepository(doc_service.db)
    user_cache = {}

    async def get_user_name(uid: str) -> str:
        if not uid:
            return ""
        if uid not in user_cache:
            u = await user_repo.get_by_id(uid)
            user_cache[uid] = u.full_name if u else "Unknown"
        return user_cache[uid]

    result = []
    for d in docs:
        author_name = await get_user_name(str(d.author_id))
        if author_name == "Unknown":
            author_name = "Workspace Member"

        approved_by_name = None
        if getattr(d, "approved_by", None):
            approved_by_name = await get_user_name(str(d.approved_by))
            if approved_by_name == "Unknown":
                approved_by_name = "Workspace Administrator"
        
        if d.status == "approved" and not approved_by_name:
            # Fallback for approved docs without an explicit approver name
            author_user = await user_repo.get_by_id(str(d.author_id))
            if author_user and author_user.role in ["owner", "lead"]:
                approved_by_name = author_name
            else:
                owners = await user_repo.get_all({"workspace_id": d.workspace_id, "role": "owner"})
                if owners:
                    approved_by_name = owners[0].full_name
                else:
                    approved_by_name = "Workspace Owner"

        result.append({
            "id": str(d.id),
            "title": d.title,
            "description": d.description,
            "content": d.content,
            "tags": d.tags,
            "attachment_url": d.attachment_url,
            "status": d.status,
            "workspace_id": str(d.workspace_id),
            "team_id": str(d.team_id) if d.team_id else None,
            "author_id": str(d.author_id),
            "author_name": author_name,
            "approved_by": str(d.approved_by) if getattr(d, "approved_by", None) else None,
            "approved_by_name": approved_by_name,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat()
        })
    return result

@router.get(
    "/search",
    summary="Full-Text Search Documents"
)
async def search_documents(
    q: str,
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Performs full-text search using MongoDB $text index with textScore ranking and RBAC enforcement.
    """
    docs = await doc_service.search_documents(
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role,
        query_str=q
    )
    
    from app.repositories.user import UserRepository
    user_repo = UserRepository(doc_service.db)
    result = []
    for d in docs:
        author_user = await user_repo.get_by_id(str(d.author_id))
        result.append({
            "id": str(d.id),
            "title": d.title,
            "description": d.description,
            "content": d.content,
            "tags": d.tags,
            "status": d.status,
            "author_name": author_user.full_name if author_user else "Member",
            "created_at": d.created_at.isoformat()
        })
    return {"query": q, "count": len(result), "documents": result}

@router.get(
    "/analytics",
    summary="Get Workspace Document Analytics (Aggregation Pipeline)"
)
async def get_document_analytics(
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Uses MongoDB Aggregation Pipelines ($facet, $group) for real-time document metrics.
    """
    analytics = await doc_service.get_workspace_document_analytics(str(current_user.workspace_id))
    return {
        "workspace_id": str(current_user.workspace_id),
        "analytics": analytics
    }

@router.get(
    "/explain",
    summary="MongoDB Explain Plan Diagnostics"
)
async def explain_query_plan(
    query_type: str = "list",
    q: str = None,
    current_user: User = Depends(RequireRoles(["owner"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Runs MongoDB Explain Plan (executionStats) to inspect index strategy (IXSCAN vs COLLSCAN) and execution metrics.
    """
    plan = await doc_service.explain_document_query(
        workspace_id=str(current_user.workspace_id),
        query_type=query_type,
        search_query=q
    )
    return {
        "workspace_id": str(current_user.workspace_id),
        "explain_diagnostics": plan
    }

@router.get(
    "/hidden",
    summary="List Hidden Documents (Owner Only)"
)
async def list_hidden_documents(

    current_user: User = Depends(RequireRoles(["owner"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Lists all hidden documents (is_deleted=True) in the workspace. Restricted to Owners.
    """
    from bson import ObjectId
    docs_cursor = doc_service.db["documents"].find({
        "workspace_id": ObjectId(str(current_user.workspace_id)),
        "is_deleted": True
    })
    docs = await docs_cursor.to_list(1000)
    
    from app.repositories.user import UserRepository
    user_repo = UserRepository(doc_service.db)
    result = []
    user_cache = {}

    async def get_user_name(uid: str) -> str:
        if not uid:
            return ""
        if uid not in user_cache:
            u = await user_repo.get_by_id(uid)
            user_cache[uid] = u.full_name if u else "Unknown"
        return user_cache[uid]

    for d in docs:
        author_id = str(d.get("author_id", ""))
        author_name = await get_user_name(author_id)
        if author_name == "Unknown":
            author_name = "Workspace Member"

        approved_by = d.get("approved_by")
        approved_by_str = str(approved_by) if approved_by else None
        approved_by_name = None
        if approved_by_str:
            approved_by_name = await get_user_name(approved_by_str)
            if approved_by_name == "Unknown":
                approved_by_name = "Workspace Administrator"

        status = d.get("status")
        if status == "approved" and not approved_by_name:
            # Fallback for approved docs without an explicit approver name
            author_user = await user_repo.get_by_id(author_id)
            if author_user and author_user.role in ["owner", "lead"]:
                approved_by_name = author_name
            else:
                owners = await user_repo.get_all({"workspace_id": d.get("workspace_id"), "role": "owner"})
                if owners:
                    approved_by_name = owners[0].full_name
                else:
                    approved_by_name = "Workspace Owner"

        result.append({
            "id": str(d["_id"]),
            "title": d.get("title"),
            "description": d.get("description"),
            "content": d.get("content"),
            "tags": d.get("tags", []),
            "attachment_url": d.get("attachment_url"),
            "status": status,
            "workspace_id": str(d.get("workspace_id")),
            "team_id": str(d.get("team_id")) if d.get("team_id") else None,
            "author_id": author_id,
            "author_name": author_name,
            "approved_by": approved_by_str,
            "approved_by_name": approved_by_name,
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None,
        })
    return result

@router.get(
    "/{document_id}/attachment",
    summary="Securely Proxy & Stream Document Attachment"
)
async def get_document_attachment(
    document_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Securely streams document attachment without exposing Supabase signed URLs or token parameters to the client.
    """
    current_user = await get_current_user_from_header_or_query(request, db)
    
    doc = await doc_service.get_document_details(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    if not doc or not doc.attachment_url:
        raise HTTPException(status_code=404, detail="No attachment found for this document.")

    url = doc.attachment_url
    ext = ".pdf"
    clean_url = url.split("?")[0]
    _, raw_ext = os.path.splitext(clean_url)
    if raw_ext:
        ext = raw_ext.lower()

    safe_title = "".join([c for c in (doc.title or "Document") if c.isalnum() or c in (" ", "_", "-")]).strip() or "Document"
    safe_filename = f"{safe_title}{ext}"

    if url.startswith("http://") or url.startswith("https://"):
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Attachment file not found.")
            
            content_type = resp.headers.get("content-type", "application/octet-stream")
            return Response(
                content=resp.content, 
                media_type=content_type,
                headers={
                    "Content-Disposition": f'inline; filename="{safe_filename}"'
                }
            )
    else:
        filename = os.path.basename(url)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, "uploads", filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found.")
        return FileResponse(file_path, filename=safe_filename)

@router.get(
    "/{document_id}",
    summary="Get Document Details"
)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Retrieves document content and increments view count.
    """
    doc = await doc_service.get_document_details(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    from app.repositories.user import UserRepository
    user_repo = UserRepository(doc_service.db)
    
    author_user = await user_repo.get_by_id(str(doc.author_id))
    author_name = author_user.full_name if author_user else "Workspace Member"
    
    approved_by_str = str(doc.approved_by) if getattr(doc, "approved_by", None) else None
    approved_by_name = None
    if approved_by_str:
        app_user = await user_repo.get_by_id(approved_by_str)
        approved_by_name = app_user.full_name if app_user else "Workspace Administrator"
        
    if doc.status == "approved" and not approved_by_name:
        # Fallback for approved docs without an explicit approver name
        if author_user and author_user.role in ["owner", "lead"]:
            approved_by_name = author_name
        else:
            owners = await user_repo.get_all({"workspace_id": doc.workspace_id, "role": "owner"})
            if owners:
                approved_by_name = owners[0].full_name
            else:
                approved_by_name = "Workspace Owner"

    return {
        "id": str(doc.id),
        "title": doc.title,
        "description": doc.description,
        "content": doc.content,
        "tags": doc.tags,
        "attachment_url": doc.attachment_url,
        "status": doc.status,
        "workspace_id": str(doc.workspace_id),
        "team_id": str(doc.team_id) if doc.team_id else None,
        "author_id": str(doc.author_id),
        "author_name": author_name,
        "approved_by": approved_by_str,
        "approved_by_name": approved_by_name,
        "rejection_reason": getattr(doc, "rejection_reason", None),
        "created_at": doc.created_at.isoformat(),
        "updated_at": doc.updated_at.isoformat()
    }

@router.put(
    "/{document_id}",
    summary="Update Document"
)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Updates document content. Resets to pending approval if updated by a Member.
    """
    doc = await doc_service.update_document(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role,
        data=payload
    )
    return {
        "message": "Document updated successfully.",
        "document": {
            "id": str(doc.id),
            "status": doc.status
        }
    }

@router.post(
    "/{document_id}/approve",
    summary="Approve a Document"
)
async def approve_document(
    document_id: str,
    current_user: User = Depends(RequireRoles(["owner", "lead"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Approves a pending document. Restricted to Owner or Leads.
    """
    doc = await doc_service.approve_document(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        user_role=current_user.role
    )
    return {
        "message": "Document approved successfully.",
        "status": doc.status
    }

from pydantic import BaseModel

class RejectPayload(BaseModel):
    reason: str

@router.post(
    "/{document_id}/reject",
    summary="Reject a Document"
)
async def reject_document(
    document_id: str,
    payload: RejectPayload,
    current_user: User = Depends(RequireRoles(["owner", "lead"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Rejects a pending document with a mandatory reason. Restricted to Owner or Leads.
    """
    doc = await doc_service.reject_document(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        user_role=current_user.role,
        reason=payload.reason
    )
    return {
        "message": "Document rejected successfully.",
        "status": doc.status
    }

@router.delete(
    "/{document_id}",
    summary="Delete a Document"
)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Soft deletes a document.
    """
    await doc_service.delete_document(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    return {
        "message": "Document deleted successfully."
    }

@router.patch(
    "/{document_id}/hide",
    summary="Hide a Document (Admin Only)"
)
async def hide_document(
    document_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Marks a document as hidden (is_deleted=True) without removing it from DB. Owner only.
    """
    from app.repositories.document import DocumentRepository
    doc_repo = DocumentRepository(doc_service.db)
    doc = await doc_repo.get_by_id(document_id)
    if not doc or str(doc.workspace_id) != str(current_user.workspace_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found.")
    await doc_repo.update(document_id, {"is_deleted": True})
    return {"message": "Document hidden successfully.", "id": document_id}



@router.patch(
    "/{document_id}/unhide",
    summary="Unhide a Document (Owner Only)"
)
async def unhide_document(
    document_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Marks a hidden document as active (is_deleted=False). Restricted to Owners.
    """
    from app.repositories.document import DocumentRepository
    doc_repo = DocumentRepository(doc_service.db)
    # Get all documents including hidden ones to find the target document
    # We bypass base repository get_by_id if it automatically filters out is_deleted (wait, get_by_id usually doesn't filter is_deleted in base repository? Let's check)
    # Let's query directly to bypass any get_by_id soft-delete filters
    from bson import ObjectId
    doc_dict = await doc_service.db["documents"].find_one({
        "_id": ObjectId(document_id),
        "workspace_id": ObjectId(str(current_user.workspace_id))
    })
    if not doc_dict:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found.")
    await doc_repo.update(document_id, {"is_deleted": False})
    return {"message": "Document unhidden successfully.", "id": document_id}

@router.post(
    "/upload",
    summary="Upload Document Attachment"
)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a file to Supabase (or local storage fallback) and returns the access URL.
    """
    contents = await file.read()
    
    # Generate unique filename to avoid collision in private bucket
    file_ext = os.path.splitext(file.filename or "")[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    url = upload_file_to_supabase(
        file_bytes=contents,
        filename=unique_filename,
        content_type=file.content_type or "application/octet-stream"
    )
    
    return {
        "message": "File uploaded successfully.",
        "url": url
    }

@router.get(
    "/uploads/{filename}",
    summary="Serve Local Upload Fallback"
)
async def serve_upload(filename: str):
    """
    Serves files from local filesystem storage fallback.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(base_dir, "uploads", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
