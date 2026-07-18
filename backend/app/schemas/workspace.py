from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, EmailStr

class WorkspaceSettingsUpdate(BaseModel):
    settings: Dict[str, Any] = Field(..., description="Key-value pairs of workspace settings (e.g. custom theme, brand preferences).")

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str
    settings: Dict[str, Any]
    created_at: str
    updated_at: str

class WorkspaceInviteMember(BaseModel):
    email: EmailStr
    full_name: str
    role: str = Field(..., description="lead | member")
    team_id: Optional[str] = None

class MemberRoleUpdate(BaseModel):
    role: str = Field(..., description="owner | lead | member")
    status: Optional[str] = Field(None, description="active | inactive | pending")
