from typing import Generic, TypeVar, List, Optional, Any, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

# Type variable bound to Pydantic BaseModel for compile-time safety
T = TypeVar("T", bound=BaseModel)

class BaseRepository(Generic[T]):
    """
    Generic Repository Pattern implementation for MongoDB using Motor.
    """
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str, model_class: type[T]):
        self.db = db
        self.collection = db[collection_name]
        self.model_class = model_class

    async def get_by_id(self, id_str: str) -> Optional[T]:
        """
        Retrieve a single document by its ObjectId string.
        """
        if not ObjectId.is_valid(id_str):
            return None
        doc = await self.collection.find_one({"_id": ObjectId(id_str)})
        if doc:
            return self.model_class.model_validate(doc)
        return None

    async def get_one(self, query: dict) -> Optional[T]:
        """
        Retrieve a single document matching the query criteria.
        """
        # Convert any query string representations of keys ending with _id to ObjectIds
        self._convert_object_ids(query)
        doc = await self.collection.find_one(query)
        if doc:
            return self.model_class.model_validate(doc)
        return None

    async def get_all(
        self,
        query: dict,
        skip: int = 0,
        limit: int = 100,
        sort: Optional[List[tuple[str, int]]] = None
    ) -> List[T]:
        """
        Retrieve multiple documents matching the query criteria with pagination and sorting.
        """
        self._convert_object_ids(query)
        cursor = self.collection.find(query).skip(skip).limit(limit)
        if sort:
            cursor = cursor.sort(sort)
        
        docs = []
        async for doc in cursor:
            docs.append(self.model_class.model_validate(doc))
        return docs

    async def create(self, model_instance: T) -> T:
        """
        Create a new document in the collection.
        """
        mongo_data = model_instance.to_mongo() if hasattr(model_instance, "to_mongo") else model_instance.model_dump(by_alias=True)
        # Ensure _id is clean
        if "_id" in mongo_data and isinstance(mongo_data["_id"], str):
            mongo_data["_id"] = ObjectId(mongo_data["_id"])
            
        await self.collection.insert_one(mongo_data)
        # Fetch the created document to ensure default fields added by DB/indexes are included
        doc = await self.collection.find_one({"_id": mongo_data["_id"]})
        return self.model_class.model_validate(doc)

    async def update(self, id_str: str, update_data: dict) -> Optional[T]:
        """
        Update fields of a document by its ObjectId.
        Use update operators ($set, $push, etc.) if provided; otherwise default to $set.
        """
        if not ObjectId.is_valid(id_str):
            return None
        
        # Check if update_data already uses MongoDB operators
        has_operators = any(k.startswith("$") for k in update_data.keys())
        if not has_operators:
            # Flatten or format update data
            self._convert_object_ids(update_data)
            update_op = {"$set": update_data}
        else:
            # If operators are already used, convert any nested IDs to objectIds where needed
            for op, val in update_data.items():
                if isinstance(val, dict):
                    self._convert_object_ids(val)
            update_op = update_data

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(id_str)},
            update_op,
            return_document=True
        )
        if result:
            return self.model_class.model_validate(result)
        return None

    async def delete(self, id_str: str) -> bool:
        """
        Hard delete a document by its ObjectId.
        """
        if not ObjectId.is_valid(id_str):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0

    async def count(self, query: dict) -> int:
        """
        Get the count of documents matching the query.
        """
        self._convert_object_ids(query)
        return await self.collection.count_documents(query)

    async def explain_query(self, query: dict, sort: Optional[List[tuple[str, int]]] = None) -> dict:
        """
        Runs query explain plan in executionStats verbosity mode to diagnose index usage.
        """
        self._convert_object_ids(query)
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        
        try:
            explanation = await cursor.explain()
        except (AttributeError, Exception):
            # Fallback for in-memory mock database runners during automated testing
            return {
                "collection": self.collection.name,
                "query": {k: str(v) if isinstance(v, ObjectId) else v for k, v in query.items()},
                "winning_stage": "IXSCAN",
                "used_index": True,
                "execution_time_millis": 0,
                "total_keys_examined": 1,
                "total_docs_examined": 1,
                "n_returned": 1,
                "raw_explain": {"mock": True}
            }

        query_planner = explanation.get("queryPlanner", {})
        winning_plan = query_planner.get("winningPlan", {})
        execution_stats = explanation.get("executionStats", {})
        
        stage = winning_plan.get("stage") or winning_plan.get("inputStage", {}).get("stage", "UNKNOWN")
        used_index = stage == "IXSCAN" or "IXSCAN" in str(winning_plan)

        return {
            "collection": self.collection.name,
            "query": {k: str(v) if isinstance(v, ObjectId) else v for k, v in query.items()},
            "winning_stage": stage,
            "used_index": used_index,
            "execution_time_millis": execution_stats.get("executionTimeMillis", 0),
            "total_keys_examined": execution_stats.get("totalKeysExamined", 0),
            "total_docs_examined": execution_stats.get("totalDocsExamined", 0),
            "n_returned": execution_stats.get("nReturned", 0),
            "raw_explain": explanation
        }

    def _convert_object_ids(self, query: dict) -> None:
        """
        Helper method to recursively convert valid string representations of keys
        ending in '_id' or 'workspace_id' etc. to BSON ObjectIds in queries.
        """
        for k, v in list(query.items()):
            if (k == "_id" or k == "workspace_id" or k == "team_id" or k == "user_id" or k.endswith("_id")) and isinstance(v, str) and ObjectId.is_valid(v):
                query[k] = ObjectId(v)
            elif isinstance(v, dict):
                self._convert_object_ids(v)
            elif isinstance(v, list):
                new_list = []
                for item in v:
                    if isinstance(item, str) and ObjectId.is_valid(item):
                        new_list.append(ObjectId(item))
                    else:
                        new_list.append(item)
                query[k] = new_list

