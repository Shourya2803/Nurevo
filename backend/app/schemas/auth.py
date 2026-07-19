from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, field_validator
import re

class OwnerSignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    workspace_name: str = Field(..., min_length=2, max_length=100)
    workspace_slug: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

    @field_validator("workspace_slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Workspace slug must only contain lowercase alphanumeric characters and hyphens.")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: EmailStr
    full_name: str
    role: str
    workspace_id: str
    workspace_name: str
    workspace_slug: str
    workspace_settings: Dict[str, Any] = Field(default_factory=dict)

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

class ClerkLoginRequest(BaseModel):
    token: str

class ClerkSignUpRequest(BaseModel):
    token: str
    workspace_name: str = Field(..., min_length=2, max_length=100)
    workspace_slug: str = Field(..., min_length=2, max_length=100)

    @field_validator("workspace_slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Workspace slug must only contain lowercase alphanumeric characters and hyphens.")
        return v

class ClerkAuthResponse(BaseModel):
    registered: bool
    token: Optional[TokenSchema] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
