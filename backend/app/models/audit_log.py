from typing import Optional, Dict, Any
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class AuditLog(MongoBaseModel):
    user_id: Optional[PyObjectId] = None
    action: str = Field(..., description="login | logout | create_team | invite_user | upload_document | approve_document | reject_document | delete_document | role_change | status_change")
    workspace_id: Optional[PyObjectId] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "user_id": "60c72b2f9b1d8b2d88888889",
                "action": "approve_document",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0...",
                "payload": {"document_id": "60c72b2f9b1d8b2d88888891"}
            }
        }
    }
