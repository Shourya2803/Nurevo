from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PollOptionCreate(BaseModel):
    id: str
    text: str

class PollCreate(BaseModel):
    question: str
    options: List[PollOptionCreate]

class EventDetailsCreate(BaseModel):
    date: str
    time: str
    location: str
    meet_url: Optional[str] = None

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(...)
    cover_image: Optional[str] = None
    priority: str = Field(default="normal", description="critical | important | normal | info")
    audience: str = Field(default="everyone", description="everyone | team | role")
    target_team_id: Optional[str] = None
    target_role: Optional[str] = None
    is_pinned: bool = False
    template_type: Optional[str] = None
    attachments: Optional[List[Dict[str, str]]] = None
    poll: Optional[PollCreate] = None
    event_details: Optional[EventDetailsCreate] = None
    expires_at: Optional[str] = None
    scheduled_at: Optional[str] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    priority: Optional[str] = None
    audience: Optional[str] = None
    target_team_id: Optional[str] = None
    target_role: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_hidden: Optional[bool] = None
    attachments: Optional[List[Dict[str, str]]] = None
    poll: Optional[PollCreate] = None
    event_details: Optional[EventDetailsCreate] = None
    expires_at: Optional[str] = None

class ReactionToggle(BaseModel):
    emoji: str

class PollVote(BaseModel):
    option_id: str
