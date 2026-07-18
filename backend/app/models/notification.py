from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId

class Notification(MongoBaseModel):
    user_id: PyObjectId
    type: str = Field(..., description="document_uploaded | document_approved | document_rejected | mention | invitation_accepted | role_changed | status_changed")
    title: str = Field(..., max_length=200)
    content: str = Field(..., max_length=1000)
    is_read: bool = Field(default=False)
    reference_id: Optional[PyObjectId] = None  # Reference to document, chat room, request, etc.

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "user_id": "60c72b2f9b1d8b2d88888889",
                "type": "document_approved",
                "title": "Document Approved",
                "content": "Your document 'API Guide' was approved by the admin.",
                "is_read": False,
                "reference_id": "60c72b2f9b1d8b2d88888891"
            }
        }
    }
