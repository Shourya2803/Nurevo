from typing import List, Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Document(MongoBaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=1000)
    content: str = Field(...)
    tags: List[str] = Field(default_factory=list)
    attachment_url: Optional[str] = None
    status: str = Field(default="draft", description="draft | pending_approval | approved | published | archived")
    workspace_id: PyObjectId
    team_id: Optional[PyObjectId] = None
    author_id: PyObjectId
    approved_by: Optional[PyObjectId] = None
    view_count: int = Field(default=0)
    is_deleted: bool = Field(default=False)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "title": "API Integration Guide",
                "description": "Explains how to integrate with the new auth flows.",
                "content": "Markdown or HTML content goes here...",
                "tags": ["api", "auth", "docs"],
                "attachment_url": None,
                "status": "draft",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "team_id": "60c72b2f9b1d8b2d88888890",
                "author_id": "60c72b2f9b1d8b2d88888889",
                "view_count": 0,
                "is_deleted": False
            }
        }
    }

class DocumentVersion(MongoBaseModel):
    document_id: PyObjectId
    version_number: int
    title: str
    content: str
    description: str
    updated_by: PyObjectId
    change_summary: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "document_id": "60c72b2f9b1d8b2d88888891",
                "version_number": 1,
                "title": "API Integration Guide v1",
                "content": "Initial revision...",
                "description": "Explains how to integrate with the new auth flows.",
                "updated_by": "60c72b2f9b1d8b2d88888889",
                "change_summary": "Initial draft check-in"
            }
        }
    }
