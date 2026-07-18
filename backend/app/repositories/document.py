from typing import List, Optional
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
        return await self.get_many({"workspace_id": workspace_id, "is_deleted": False})

    async def get_by_team(self, workspace_id: str, team_id: str) -> List[Document]:
        """
        Retrieves all documents associated with a specific team.
        """
        return await self.get_many({
            "workspace_id": workspace_id,
            "team_id": team_id,
            "is_deleted": False
        })
