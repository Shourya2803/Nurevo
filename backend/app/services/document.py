from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from app.models.document import Document
from app.repositories.document import DocumentRepository
from app.repositories.team import TeamRepository
from app.schemas.document import DocumentCreate, DocumentUpdate

class DocumentService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.team_repo = TeamRepository(db)

    async def create_document(self, workspace_id: str, author_id: str, author_role: str, data: DocumentCreate) -> Document:
        """
        Creates a new document. If author is Owner/Lead, it is auto-approved. If Member, it starts as pending_approval.
        """
        # Verify team belongs to the workspace
        team_oid = None
        if data.team_id:
            team = await self.team_repo.get_by_id(data.team_id)
            if not team or str(team.workspace_id) != workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid team ID specified for this workspace."
                )
            team_oid = ObjectId(data.team_id)

        # Set default status based on role
        initial_status = "approved" if author_role in ["owner", "lead"] else "pending_approval"

        doc = Document(
            title=data.title,
            description=data.description,
            content=data.content,
            tags=data.tags,
            attachment_url=data.attachment_url,
            status=initial_status,
            workspace_id=ObjectId(workspace_id),
            team_id=team_oid,
            author_id=ObjectId(author_id)
        )

        return await self.doc_repo.create(doc)

    async def list_documents(self, workspace_id: str, user_id: str, role: str) -> List[Document]:
        """
        Lists documents based on user roles and permissions:
        - Owner: Sees all documents.
        - Lead: Sees all documents of teams they lead/belong to, or approved workspace documents.
        - Member: Sees all approved documents for their teams, and their own authored documents.
        """
        all_docs = await self.doc_repo.get_by_workspace(workspace_id)
        
        if role == "owner":
            return all_docs

        # Fetch teams user belongs to
        user_teams = await self.team_repo.get_all({
            "workspace_id": ObjectId(workspace_id),
            "member_ids": ObjectId(user_id)
        })
        user_team_ids = {str(t.id) for t in user_teams}
        
        # Add teams they lead
        lead_teams = await self.team_repo.get_all({
            "workspace_id": ObjectId(workspace_id),
            "team_lead_id": ObjectId(user_id)
        })
        lead_team_ids = {str(t.id) for t in lead_teams}
        
        accessible_teams = user_team_ids.union(lead_team_ids)

        filtered = []
        for doc in all_docs:
            doc_team_id = str(doc.team_id) if doc.team_id else None
            is_author = str(doc.author_id) == user_id

            if role == "lead":
                # Leads can see their own, team docs, or any approved doc
                if is_author or doc_team_id in accessible_teams or doc.status == "approved":
                    filtered.append(doc)
            else:
                # Members can see their own (even if pending) or approved team docs
                if is_author or (doc_team_id in accessible_teams and doc.status == "approved"):
                    filtered.append(doc)

        return filtered

    async def get_document_details(self, document_id: str, workspace_id: str, user_id: str, role: str) -> Document:
        """
        Fetches document and checks access permissions. Increment view count.
        """
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc or str(doc.workspace_id) != workspace_id or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        # RBAC Check
        if role != "owner":
            doc_team_id = str(doc.team_id) if doc.team_id else None
            is_author = str(doc.author_id) == user_id
            
            # Fetch teams they belong to
            user_teams = await self.team_repo.get_all({
                "workspace_id": ObjectId(workspace_id),
                "member_ids": ObjectId(user_id)
            })
            accessible_teams = {str(t.id) for t in user_teams}
            
            if not is_author and doc_team_id not in accessible_teams and doc.status != "approved":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this document."
                )

        # Increment view count
        await self.doc_repo.update(document_id, {"view_count": doc.view_count + 1})
        doc.view_count += 1
        return doc

    async def update_document(self, document_id: str, workspace_id: str, user_id: str, role: str, data: DocumentUpdate) -> Document:
        """
        Updates document details. If modified by a Member, resets status to pending_approval.
        """
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc or str(doc.workspace_id) != workspace_id or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        # Permission check
        is_author = str(doc.author_id) == user_id
        if role != "owner" and not is_author:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author or owner can update this document."
            )

        updates: Dict[str, Any] = {}
        if data.title is not None:
            updates["title"] = data.title
        if data.description is not None:
            updates["description"] = data.description
        if data.content is not None:
            updates["content"] = data.content
        if data.tags is not None:
            updates["tags"] = data.tags
        if data.attachment_url is not None:
            updates["attachment_url"] = data.attachment_url
        if data.team_id is not None:
            updates["team_id"] = ObjectId(data.team_id) if data.team_id else None

        # Reset status if user is member
        if role == "member":
            updates["status"] = "pending_approval"

        updates["updated_at"] = datetime.utcnow()

        updated_doc = await self.doc_repo.update(document_id, updates)
        if not updated_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update document."
            )
        return updated_doc

    async def approve_document(self, document_id: str, workspace_id: str, user_role: str) -> Document:
        """
        Approves a document. Allowed only for Owner (Admin) or Team Leads.
        """
        if user_role not in ["owner", "lead"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owners or team leads can approve documents."
            )

        doc = await self.doc_repo.get_by_id(document_id)
        if not doc or str(doc.workspace_id) != workspace_id or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        updated_doc = await self.doc_repo.update(document_id, {"status": "approved", "updated_at": datetime.utcnow()})
        return updated_doc

    async def reject_document(self, document_id: str, workspace_id: str, user_role: str) -> Document:
        """
        Rejects a document. Allowed only for Owner (Admin) or Team Leads.
        """
        if user_role not in ["owner", "lead"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owners or team leads can reject documents."
            )

        doc = await self.doc_repo.get_by_id(document_id)
        if not doc or str(doc.workspace_id) != workspace_id or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        updated_doc = await self.doc_repo.update(document_id, {"status": "rejected", "updated_at": datetime.utcnow()})
        return updated_doc

    async def delete_document(self, document_id: str, workspace_id: str, user_id: str, role: str) -> None:
        """
        Soft deletes a document.
        """
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc or str(doc.workspace_id) != workspace_id or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        is_author = str(doc.author_id) == user_id
        if role != "owner" and not is_author:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )

        await self.doc_repo.update(document_id, {"is_deleted": True})
