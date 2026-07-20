from typing import List, Optional, Dict, Any
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class PollOption(MongoBaseModel):
    id: str
    text: str
    votes: List[str] = Field(default_factory=list) # List of user IDs

class Poll(MongoBaseModel):
    question: str
    options: List[PollOption] = Field(default_factory=list)

class EventDetails(MongoBaseModel):
    date: str
    time: str
    location: str
    meet_url: Optional[str] = None

class AttachmentItem(MongoBaseModel):
    filename: str
    url: str

class Announcement(MongoBaseModel):
    workspace_id: PyObjectId
    author_id: PyObjectId
    author_name: str
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(...)
    cover_image: Optional[str] = None
    priority: str = Field(default="normal", description="critical | important | normal | info")
    audience: str = Field(default="everyone", description="everyone | team | role")
    target_team_id: Optional[PyObjectId] = None
    target_role: Optional[str] = None
    is_pinned: bool = Field(default=False)
    is_hidden: bool = Field(default=False)
    template_type: Optional[str] = None
    attachments: List[Dict[str, str]] = Field(default_factory=list) # [{ filename, url }]
    reactions: Dict[str, List[str]] = Field(default_factory=dict) # { emoji: [user_ids] }
    acknowledged_by: List[str] = Field(default_factory=list) # List of user IDs
    poll: Optional[Dict[str, Any]] = None # { question, options: [{ id, text, votes }] }
    event_details: Optional[Dict[str, Any]] = None # { date, time, location, meet_url }
    expires_at: Optional[str] = None
    scheduled_at: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "title": "Company All-Hands Q3",
                "content": "Join us for our quarterly review meeting.",
                "priority": "critical",
                "audience": "everyone",
                "is_pinned": True,
                "author_name": "Admin User"
            }
        }
    }
