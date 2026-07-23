from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Notification(MongoBaseModel):
    recipient_id: PyObjectId
    sender_id: Optional[PyObjectId] = None
    workspace_id: PyObjectId
    team_id: Optional[PyObjectId] = None
    type: str = Field(..., description="DOCUMENT_SUBMITTED | DOCUMENT_APPROVED | DOCUMENT_REJECTED | DOCUMENT_COMMENT | DOCUMENT_RESUBMITTED | ANNOUNCEMENT | TEAM | WORKSPACE | SYSTEM | SECURITY")
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    priority: str = Field(default="NORMAL", description="LOW | NORMAL | HIGH | URGENT")
    status: str = Field(default="PENDING", description="PENDING | DELIVERED | READ")
    data: Dict[str, Any] = Field(default_factory=dict, description="e.g., {document_id, workspace_id, redirect_url, comment, metadata}")
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "recipient_id": "60c72b2f9b1d8b2d88888889",
                "sender_id": "60c72b2f9b1d8b2d88888888",
                "workspace_id": "60c72b2f9b1d8b2d88888887",
                "team_id": None,
                "type": "DOCUMENT_APPROVED",
                "title": "Document Approved",
                "message": "Your document has been approved by the Admin.",
                "priority": "NORMAL",
                "status": "PENDING",
                "data": {
                    "document_id": "60c72b2f9b1d8b2d88888891",
                    "workspace_id": "60c72b2f9b1d8b2d88888887",
                    "redirect_url": "/dashboard/documents/60c72b2f9b1d8b2d88888891",
                    "comment": "Good work!",
                    "metadata": {}
                },
                "is_read": False,
                "read_at": None
            }
        }
    }
