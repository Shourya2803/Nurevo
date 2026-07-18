from typing import Optional
from datetime import datetime
from pydantic import Field, EmailStr
from app.models.base import MongoBaseModel, PyObjectId

class Invitation(MongoBaseModel):
    email: EmailStr
    workspace_id: PyObjectId
    invited_by: PyObjectId
    team_id: Optional[PyObjectId] = None
    role: str = Field(..., description="lead | member")
    token: str = Field(...)
    status: str = Field(default="pending", description="pending | accepted | expired")
    expires_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "email": "invitee@example.com",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "invited_by": "60c72b2f9b1d8b2d88888889",
                "team_id": "60c72b2f9b1d8b2d88888890",
                "role": "member",
                "token": "a1b2c3d4e5f6g7h8i9j0",
                "status": "pending",
                "expires_at": "2026-07-25T09:00:00Z"
            }
        }
    }
