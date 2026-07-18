from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Comment(MongoBaseModel):
    document_id: PyObjectId
    user_id: PyObjectId
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[PyObjectId] = None
    is_edited: bool = Field(default=False)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "document_id": "60c72b2f9b1d8b2d88888891",
                "user_id": "60c72b2f9b1d8b2d88888889",
                "content": "Can we expand on section 3?",
                "parent_id": None,
                "is_edited": False
            }
        }
    }
