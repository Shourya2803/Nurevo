from typing import List, Optional
from pydantic import BaseModel, Field

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., max_length=500)

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class TeamAssignLead(BaseModel):
    team_lead_id: str = Field(..., description="The user ID of the member to assign as Team Lead.")

class TeamAddMember(BaseModel):
    user_id: str = Field(..., description="The user ID of the member to add to this team.")

class TeamRemoveMember(BaseModel):
    user_id: str = Field(..., description="The user ID of the member to remove from this team.")

class TeamResponse(BaseModel):
    id: str
    name: str
    description: str
    workspace_id: str
    team_lead_id: Optional[str] = None
    lead_ids: List[str] = []
    member_ids: List[str] = []
    created_at: str
    updated_at: str
