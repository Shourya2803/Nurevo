from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.invitation import Invitation
from app.repositories.base import BaseRepository

class InvitationRepository(BaseRepository[Invitation]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "invitations", Invitation)

    async def get_by_token(self, token: str) -> Optional[Invitation]:
        """
        Find an invitation by its unique token.
        """
        return await self.get_one({"token": token})
