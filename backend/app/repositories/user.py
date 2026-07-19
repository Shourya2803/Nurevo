from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users", User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by their email address.
        """
        return await self.get_one({"email": email.strip().lower()})

    async def get_by_clerk_id(self, clerk_id: str) -> Optional[User]:
        """
        Find a user by their Clerk ID.
        """
        return await self.get_one({"clerk_id": clerk_id.strip()})
