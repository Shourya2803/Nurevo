from typing import List, Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Conversation(MongoBaseModel):
    workspace_id: PyObjectId
    team_id: Optional[PyObjectId] = None  # Present if it's a team chat channel
    participant_ids: List[PyObjectId] = Field(default_factory=list)
    is_group: bool = Field(default=False)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "team_id": "60c72b2f9b1d8b2d88888890",
                "participant_ids": [],
                "is_group": True
            }
        }
    }

class Message(MongoBaseModel):
    conversation_id: PyObjectId
    sender_id: PyObjectId
    message_type: str = Field(default="text", description="text | link")
    content: str = Field(..., min_length=1, max_length=5000)
    mentions: List[PyObjectId] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "conversation_id": "60c72b2f9b1d8b2d88888892",
                "sender_id": "60c72b2f9b1d8b2d88888889",
                "message_type": "text",
                "content": "Hi team, please review this documentation.",
                "mentions": []
            }
        }
    }
