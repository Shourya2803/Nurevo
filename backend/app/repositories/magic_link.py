from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.magic_link import MagicLink
from app.repositories.base import BaseRepository

class MagicLinkRepository(BaseRepository[MagicLink]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "magic_links", MagicLink)

    async def get_by_token(self, token: str) -> Optional[MagicLink]:
        """
        Find a magic link by its unique token.
        """
        return await self.get_one({"token": token, "used": False})
