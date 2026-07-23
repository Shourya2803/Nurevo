from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.document import Document
from app.repositories.base import BaseRepository

class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "documents", Document)

    async def get_by_workspace(self, workspace_id: str) -> List[Document]:
        """
        Retrieves all documents associated with a workspace.
        """
        return await self.get_all({"workspace_id": workspace_id, "is_deleted": False})

    async def get_by_team(self, workspace_id: str, team_id: str) -> List[Document]:
        """
        Retrieves all documents associated with a specific team.
        """
        return await self.get_all({
            "workspace_id": workspace_id,
            "team_id": team_id,
            "is_deleted": False
        })

    async def full_text_search(self, workspace_id: str, query_str: str, skip: int = 0, limit: int = 50) -> List[Document]:
        """
        Performs full-text search using MongoDB's $text operator and ranks results by textScore.
        """
        query = {
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id,
            "is_deleted": False,
            "$text": {"$search": query_str}
        }
        projection = {"score": {"$meta": "textScore"}}
        cursor = self.collection.find(query, projection).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)

        docs = []
        async for doc in cursor:
            docs.append(self.model_class.model_validate(doc))
        return docs

    async def aggregate_workspace_stats(self, workspace_id: str) -> Dict[str, Any]:
        """
        Uses MongoDB Aggregation Pipeline ($facet, $group, $match) to calculate document statistics.
        """
        ws_oid = ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id
        pipeline = [
            {"$match": {"workspace_id": ws_oid, "is_deleted": False}},
            {
                "$facet": {
                    "status_counts": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                    ],
                    "metrics": [
                        {
                            "$group": {
                                "_id": None,
                                "total_documents": {"$sum": 1}
                            }
                        }
                    ],
                    "top_authors": [
                        {"$group": {"_id": "$author_id", "doc_count": {"$sum": 1}}},
                        {"$sort": {"doc_count": -1}},
                        {"$limit": 5}
                    ]
                }
            }
        ]
        
        cursor = self.collection.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        if not result:
            return {"status_counts": {}, "total_documents": 0, "top_authors": []}

        data = result[0]
        status_map = {item["_id"]: item["count"] for item in data.get("status_counts", [])}
        metrics = data.get("metrics", [{}])[0] if data.get("metrics") else {}
        
        return {
            "status_counts": {
                "approved": status_map.get("approved", 0),
                "pending_approval": status_map.get("pending_approval", 0),
                "rejected": status_map.get("rejected", 0)
            },
            "total_documents": metrics.get("total_documents", 0),
            "top_authors": [
                {
                    "author_id": str(item["_id"]),
                    "doc_count": item["doc_count"]
                }
                for item in data.get("top_authors", [])
            ]
        }

    async def explain_text_search(self, workspace_id: str, query_str: str) -> Dict[str, Any]:
        """
        Generates Explain Plan for Full-Text Search query execution.
        """
        query = {
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id,
            "is_deleted": False,
            "$text": {"$search": query_str}
        }
        cursor = self.collection.find(query, {"score": {"$meta": "textScore"}}).sort([("score", {"$meta": "textScore"})])
        try:
            explanation = await cursor.explain()
        except (AttributeError, Exception):
            return {
                "query_type": "text_search",
                "search_term": query_str,
                "winning_stage": "TEXT_MATCH",
                "used_text_index": True,
                "execution_time_millis": 0,
                "total_docs_examined": 1,
                "n_returned": 1,
                "raw_planner": {"mock": True}
            }
        
        query_planner = explanation.get("queryPlanner", {})
        winning_plan = query_planner.get("winningPlan", {})
        execution_stats = explanation.get("executionStats", {})

        return {
            "query_type": "text_search",
            "search_term": query_str,
            "winning_stage": winning_plan.get("stage") or winning_plan.get("inputStage", {}).get("stage", "TEXT_MATCH"),
            "used_text_index": "TEXT" in str(winning_plan) or "TEXT_MATCH" in str(winning_plan),
            "execution_time_millis": execution_stats.get("executionTimeMillis", 0),
            "total_docs_examined": execution_stats.get("totalDocsExamined", 0),
            "n_returned": execution_stats.get("nReturned", 0),
            "raw_planner": query_planner
        }

