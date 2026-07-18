from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class DocumentRequest(MongoBaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., max_length=1000)
    assign_user_id: Optional[PyObjectId] = None
    assign_team_id: Optional[PyObjectId] = None
    priority: str = Field(default="medium", description="low | medium | high | urgent")
    status: str = Field(default="pending", description="pending | assigned | completed | closed")
    requester_id: PyObjectId
    workspace_id: PyObjectId

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "title": "Need Auth Flow Documentation",
                "description": "Please create a walkthrough of the Magic Link auth logic.",
                "assign_user_id": None,
                "assign_team_id": "60c72b2f9b1d8b2d88888890",
                "priority": "high",
                "status": "pending",
                "requester_id": "60c72b2f9b1d8b2d88888889",
                "workspace_id": "60c72b2f9b1d8b2d88888888"
            }
        }
    }
