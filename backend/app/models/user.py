from typing import Optional
from pydantic import Field, EmailStr
from app.models.base import MongoBaseModel, PyObjectId

class User(MongoBaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="member", description="owner | lead | member")
    status: str = Field(default="pending", description="pending | active | inactive")
    workspace_id: PyObjectId
    password_hash: Optional[str] = None
    avatar_url: Optional[str] = None
    clerk_id: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "email": "jane@example.com",
                "full_name": "Jane Doe",
                "role": "member",
                "status": "pending",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "avatar_url": None
            }
        }
    }
