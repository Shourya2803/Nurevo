from typing import List, Optional
from pydantic import BaseModel, Field

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=1000)
    content: str
    tags: List[str] = Field(default_factory=list)
    team_id: Optional[str] = None
    attachment_url: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    team_id: Optional[str] = None
    attachment_url: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    description: str
    content: str
    tags: List[str]
    attachment_url: Optional[str] = None
    status: str
    workspace_id: str
    team_id: Optional[str] = None
    author_id: str
    view_count: int
    created_at: str
    updated_at: str
