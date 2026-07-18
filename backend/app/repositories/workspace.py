from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.workspace import Workspace
from app.repositories.base import BaseRepository

class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "workspaces", Workspace)

    async def get_by_slug(self, slug: str) -> Optional[Workspace]:
        """
        Find a workspace by its unique slug.
        """
        return await self.get_one({"slug": slug.strip().lower()})
