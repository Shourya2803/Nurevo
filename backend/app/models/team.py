from typing import List, Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Team(MongoBaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., max_length=500)
    workspace_id: PyObjectId
    team_lead_id: Optional[PyObjectId] = None
    lead_ids: List[PyObjectId] = Field(default_factory=list)
    member_ids: List[PyObjectId] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "name": "Backend Team",
                "description": "Handles API, database, and logic workflows.",
                "workspace_id": "60c72b2f9b1d8b2d88888888",
                "team_lead_id": "60c72b2f9b1d8b2d88888889",
                "member_ids": ["60c72b2f9b1d8b2d88888890"]
            }
        }
    }
