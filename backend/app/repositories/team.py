from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.models.team import Team
from app.repositories.base import BaseRepository

class TeamRepository(BaseRepository[Team]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "teams", Team)

    async def list_by_workspace(self, workspace_id: str) -> List[Team]:
        """
        List all teams in a workspace.
        """
        return await self.get_all({"workspace_id": workspace_id})

    async def list_by_member(self, workspace_id: str, user_id: str) -> List[Team]:
        """
        List teams in a workspace where the user is a member or lead.
        """
        # Checks if user_id is in member_ids OR is the team_lead_id
        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        query = {
            "workspace_id": workspace_id,
            "$or": [
                {"team_lead_id": user_obj_id},
                {"member_ids": user_obj_id}
            ]
        }
        return await self.get_all(query)
