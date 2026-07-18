from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import os
import uuid

from app.utils.db import get_database
from app.auth.dependencies import get_current_user, RequireRoles, enforce_workspace_isolation
from app.models.user import User
from app.services.document import DocumentService
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.utils.supabase import upload_file_to_supabase

router = APIRouter(prefix="/documents", tags=["Documents"])

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
            "view_count": doc.view_count,
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
    return [
        {
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
            "view_count": d.view_count,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat()
        } for d in docs
    ]

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
        "view_count": doc.view_count,
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
        user_role=current_user.role
    )
    return {
        "message": "Document approved successfully.",
        "status": doc.status
    }

@router.post(
    "/{document_id}/reject",
    summary="Reject a Document"
)
async def reject_document(
    document_id: str,
    current_user: User = Depends(RequireRoles(["owner", "lead"])),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Rejects a pending document. Restricted to Owner or Leads.
    """
    doc = await doc_service.reject_document(
        document_id=document_id,
        workspace_id=str(current_user.workspace_id),
        user_role=current_user.role
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
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path)
