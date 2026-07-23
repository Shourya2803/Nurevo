from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.notification import Notification
from app.repositories.base import BaseRepository

class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "notifications", Notification)

    async def get_user_notifications(
        self,
        recipient_id: str,
        workspace_id: str,
        is_read: Optional[bool] = None,
        priority: Optional[str] = None,
        notification_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        sort_dir: int = -1  # -1 for DESC, 1 for ASC
    ) -> List[Notification]:
        """
        Retrieves user notifications with robust filtering, sorting, and pagination.
        """
        query = {
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id,
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id
        }

        if is_read is not None:
            query["is_read"] = is_read

        if priority:
            query["priority"] = priority

        if notification_type:
            query["type"] = notification_type

        sort_list = [(sort_by, sort_dir)]
        
        return await self.get_all(query, skip=skip, limit=limit, sort=sort_list)

    async def get_unread_count(self, recipient_id: str, workspace_id: str) -> int:
        """
        Get the count of unread notifications for a user in a specific workspace.
        """
        query = {
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id,
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id,
            "is_read": False
        }
        return await self.count(query)

    async def mark_as_read(self, notification_id: str, recipient_id: str) -> Optional[Notification]:
        """
        Mark a specific notification as read, ensuring it belongs to the requesting recipient.
        """
        if not ObjectId.is_valid(notification_id):
            return None
            
        query = {
            "_id": ObjectId(notification_id),
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id
        }
        
        # Check if already read to avoid redundant writes
        doc = await self.collection.find_one(query)
        if not doc:
            return None
        if doc.get("is_read"):
            return self.model_class.model_validate(doc)
            
        update_data = {
            "is_read": True,
            "read_at": datetime.utcnow(),
            "status": "READ",
            "updated_at": datetime.utcnow()
        }
        
        updated_doc = await self.collection.find_one_and_update(
            query,
            {"$set": update_data},
            return_document=True
        )
        if updated_doc:
            return self.model_class.model_validate(updated_doc)
        return None

    async def mark_all_as_read(self, recipient_id: str, workspace_id: str) -> int:
        """
        Mark all notifications as read for a recipient inside a specific workspace.
        """
        query = {
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id,
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id,
            "is_read": False
        }
        update_data = {
            "is_read": True,
            "read_at": datetime.utcnow(),
            "status": "READ",
            "updated_at": datetime.utcnow()
        }
        result = await self.collection.update_many(query, {"$set": update_data})
        return result.modified_count

    async def delete_notification(self, notification_id: str, recipient_id: str) -> bool:
        """
        Delete a notification, ensuring it belongs to the requesting recipient.
        """
        if not ObjectId.is_valid(notification_id):
            return False
            
        query = {
            "_id": ObjectId(notification_id),
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id
        }
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0

    async def delete_all_notifications(self, recipient_id: str, workspace_id: str) -> int:
        """
        Deletes all notifications for a recipient in a specific workspace.
        """
        query = {
            "recipient_id": ObjectId(recipient_id) if ObjectId.is_valid(recipient_id) else recipient_id,
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id
        }
        result = await self.collection.delete_many(query)
        return result.deleted_count
