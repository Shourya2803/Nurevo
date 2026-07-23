from datetime import datetime
import time
import logging
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.notification import Notification
from app.repositories.notification import NotificationRepository
from app.utils.online_user_manager import online_user_manager
from app.utils.metrics import metrics_manager

logger = logging.getLogger("nuvero.notification_service")

class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = NotificationRepository(db)

    async def create_notification(
        self,
        recipient_id: str,
        workspace_id: str,
        type: str,
        title: str,
        message: str,
        sender_id: Optional[str] = None,
        team_id: Optional[str] = None,
        priority: str = "NORMAL",
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Creates, persists, and attempts real-time delivery of a notification.
        """
        # Record creation metrics
        metrics_manager.record_created(type)
        start_time = time.time()

        notification = Notification(
            recipient_id=recipient_id,
            sender_id=sender_id,
            workspace_id=workspace_id,
            team_id=team_id,
            type=type,
            title=title,
            message=message,
            priority=priority,
            status="PENDING",
            data=data or {},
            is_read=False
        )

        # 1. Save to MongoDB
        created = await self.repo.create(notification)
        
        # 2. Attempt WebSocket Delivery
        is_online = await online_user_manager.is_online(recipient_id)
        if is_online:
            payload = {
                "event": "notification",
                "notification": {
                    "id": str(created.id),
                    "recipient_id": str(created.recipient_id),
                    "sender_id": str(created.sender_id) if created.sender_id else None,
                    "workspace_id": str(created.workspace_id),
                    "team_id": str(created.team_id) if created.team_id else None,
                    "type": created.type,
                    "title": created.title,
                    "message": created.message,
                    "priority": created.priority,
                    "status": "DELIVERED",
                    "data": created.data,
                    "is_read": False,
                    "created_at": created.created_at.isoformat()
                }
            }
            
            # Send via WS
            sent = await online_user_manager.send(recipient_id, payload)
            if sent:
                # Update status to DELIVERED and track delivery duration
                delivery_time_ms = (time.time() - start_time) * 1000.0
                metrics_manager.record_delivered(delivery_time_ms)
                
                await self.repo.update(str(created.id), {
                    "status": "DELIVERED",
                    "updated_at": datetime.utcnow()
                })
                created.status = "DELIVERED"
                
        return created

    async def get_user_notifications(
        self,
        recipient_id: str,
        workspace_id: str,
        is_read: Optional[bool] = None,
        priority: Optional[str] = None,
        notification_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Notification]:
        return await self.repo.get_user_notifications(
            recipient_id=recipient_id,
            workspace_id=workspace_id,
            is_read=is_read,
            priority=priority,
            notification_type=notification_type,
            skip=skip,
            limit=limit
        )

    async def get_unread_count(self, recipient_id: str, workspace_id: str) -> int:
        return await self.repo.get_unread_count(recipient_id, workspace_id)

    async def mark_as_read(self, notification_id: str, recipient_id: str) -> Optional[Notification]:
        # Track metrics
        metrics_manager.record_read()
        return await self.repo.mark_as_read(notification_id, recipient_id)

    async def mark_all_as_read(self, recipient_id: str, workspace_id: str) -> int:
        count = await self.repo.mark_all_as_read(recipient_id, workspace_id)
        # Update metrics for each read notification
        for _ in range(count):
            metrics_manager.record_read()
        return count

    async def delete_notification(self, notification_id: str, recipient_id: str) -> bool:
        return await self.repo.delete_notification(notification_id, recipient_id)

    async def clear_all_notifications(self, recipient_id: str, workspace_id: str) -> int:
        return await self.repo.delete_all_notifications(recipient_id, workspace_id)

    async def broadcast_announcement(
        self,
        sender_id: str,
        workspace_id: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> List[Notification]:
        """
        Creates and sends announcements to all users in a workspace.
        """
        # Find all active users in the workspace
        cursor = self.db["users"].find({
            "workspace_id": ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id,
            "status": "active"
        })
        
        notifications = []
        async for user_doc in cursor:
            recipient_id = str(user_doc["_id"])
            # Skip sending notification to the sender themselves
            if recipient_id == sender_id:
                continue
                
            n = await self.create_notification(
                recipient_id=recipient_id,
                sender_id=sender_id,
                workspace_id=workspace_id,
                type="ANNOUNCEMENT",
                title=title,
                message=message,
                priority="NORMAL",
                data=data
            )
            notifications.append(n)
            
        return notifications
