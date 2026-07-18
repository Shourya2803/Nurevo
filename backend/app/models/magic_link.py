from datetime import datetime
from pydantic import Field, EmailStr
from app.models.base import MongoBaseModel, PyObjectId

class MagicLink(MongoBaseModel):
    token: str = Field(...)
    email: EmailStr
    user_id: PyObjectId
    workspace_id: PyObjectId
    action: str = Field(default="login", description="login | signup | invitation")
    used: bool = Field(default=False)
    expires_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "token": "xyz123abc456",
                "email": "owner@company.com",
                "user_id": "60c72b2f9b1d8b2d88888889",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "action": "login",
                "used": False,
                "expires_at": "2026-07-18T10:07:45Z"
            }
        }
    }
