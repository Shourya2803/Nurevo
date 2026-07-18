from typing import Annotated, Any
from bson import ObjectId
from pydantic import BeforeValidator, PlainSerializer, BaseModel, Field
from datetime import datetime

# Custom validator to serialize and validate MongoDB ObjectId as strings
PyObjectId = Annotated[
    str,
    BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v),
    PlainSerializer(lambda v: str(v), return_type=str),
]

class MongoBaseModel(BaseModel):
    """
    Base model for all MongoDB collections.
    Provides standard helper schemas for ObjectId mapping and timestamps.
    """
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
    }

    def to_mongo(self) -> dict:
        """
        Converts the model to a MongoDB-friendly dict.
        Maps the 'id' field to '_id' and converts string representation back to ObjectId where appropriate.
        """
        data = self.model_dump(by_alias=True)
        if "_id" in data and isinstance(data["_id"], str):
            data["_id"] = ObjectId(data["_id"])
        # Recursively map nested strings to ObjectIds if they are valid ObjectIds and end with _id
        for k, v in data.items():
            if (k == "workspace_id" or k == "team_id" or k == "user_id" or k.endswith("_id")) and isinstance(v, str) and ObjectId.is_valid(v):
                data[k] = ObjectId(v)
            elif isinstance(v, list):
                new_list = []
                for item in v:
                    if isinstance(item, str) and ObjectId.is_valid(item):
                        new_list.append(ObjectId(item))
                    else:
                        new_list.append(item)
                data[k] = new_list
        return data
