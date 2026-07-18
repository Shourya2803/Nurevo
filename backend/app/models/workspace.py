from typing import Dict, Any, Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Workspace(MongoBaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    owner_id: Optional[PyObjectId] = None
    settings: Dict[str, Any] = Field(default_factory=dict)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "name": "Acme Corp",
                "slug": "acme",
                "settings": {}
            }
        }
    }
