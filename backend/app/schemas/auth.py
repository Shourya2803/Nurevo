from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, field_validator
import re

class OwnerSignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    workspace_name: str = Field(..., min_length=2, max_length=100)
    workspace_slug: str = Field(..., min_length=2, max_length=100)

    @field_validator("workspace_slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Workspace slug must only contain lowercase alphanumeric characters and hyphens.")
        return v

class MagicLoginRequest(BaseModel):
    email: EmailStr

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    workspace_id: str
    role: str

class UserSchemaOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    status: str
    workspace_id: str
    avatar_url: Optional[str] = None

class WorkspaceSchemaOut(BaseModel):
    id: str
    name: str
    slug: str
    settings: Dict[str, Any]
