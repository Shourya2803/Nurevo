from fastapi import APIRouter, Depends, status, HTTPException, Query, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
import logging
import json

from app.utils.db import get_database
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.notification import NotificationService
from app.utils.metrics import metrics_manager
from app.utils.online_user_manager import online_user_manager
from fastapi.responses import PlainTextResponse

logger = logging.getLogger("nuvero.notification_router")

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def get_notification_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> NotificationService:
    return NotificationService(db)

@router.get("", summary="Get user notifications")
async def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    priority: Optional[str] = Query(None, description="Filter by priority level"),
    type: Optional[str] = Query(None, description="Filter by notification type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    notifications = await service.get_user_notifications(
        recipient_id=str(current_user.id),
        workspace_id=str(current_user.workspace_id),
        is_read=is_read,
        priority=priority,
        notification_type=type,
        skip=skip,
        limit=limit
    )
    
    return [
        {
            "id": str(n.id),
            "recipient_id": str(n.recipient_id),
            "sender_id": str(n.sender_id) if n.sender_id else None,
            "workspace_id": str(n.workspace_id),
            "team_id": str(n.team_id) if n.team_id else None,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "priority": n.priority,
            "status": n.status,
            "data": n.data,
            "is_read": n.is_read,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat()
        }
        for n in notifications
    ]

@router.get("/unread-count", summary="Get unread notification count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    count = await service.get_unread_count(
        recipient_id=str(current_user.id),
        workspace_id=str(current_user.workspace_id)
    )
    return {"unread_count": count}

@router.patch("/{id}/read", summary="Mark notification as read")
async def mark_read(
    id: str,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    updated = await service.mark_as_read(notification_id=id, recipient_id=str(current_user.id))
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"message": "Notification marked as read.", "notification_id": id}

@router.patch("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    count = await service.mark_all_as_read(
        recipient_id=str(current_user.id),
        workspace_id=str(current_user.workspace_id)
    )
    return {"message": "All notifications marked as read.", "count": count}

@router.delete("/{id}", summary="Delete a notification")
async def delete_notification(
    id: str,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    success = await service.delete_notification(notification_id=id, recipient_id=str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"message": "Notification deleted successfully.", "notification_id": id}

@router.delete("/clear", summary="Clear all user notifications")
async def clear_notifications(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    count = await service.clear_all_notifications(
        recipient_id=str(current_user.id),
        workspace_id=str(current_user.workspace_id)
    )
    return {"message": "All notifications cleared.", "count": count}

# Grafana Prometheus Metrics endpoint
@router.get("/metrics/prometheus", response_class=PlainTextResponse, include_in_schema=False)
async def get_metrics_prometheus():
    local_connected_users = len(online_user_manager._connections)
    local_websocket_sessions = sum(len(ws_set) for ws_set in online_user_manager._connections.values())
    
    return metrics_manager.to_prometheus_format(
        connected_users=local_connected_users,
        websocket_connections=local_websocket_sessions
    )

@router.get("/metrics/json", include_in_schema=False)
async def get_metrics_json():
    local_connected_users = len(online_user_manager._connections)
    local_websocket_sessions = sum(len(ws_set) for ws_set in online_user_manager._connections.values())
    
    return metrics_manager.get_summary(
        connected_users=local_connected_users,
        websocket_connections=local_websocket_sessions
    )

# WebSocket connection endpoint
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    WebSocket endpoint for real-time notification push delivery.
    Requires token authentication passed in the query parameter.
    """
    await websocket.accept()
    
    if not token:
        logger.warning("WebSocket connection attempt missing token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user_id = None
    try:
        from app.utils.security import decode_access_token
        from app.repositories.user import UserRepository
        
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            logger.warning("WebSocket token decoding failed.")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(payload.get("sub"))
        if not user or user.status != "active":
            logger.warning(f"WebSocket connect request rejected for inactive/missing user: {payload.get('sub')}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        user_id = str(user.id)
        workspace_id = str(user.workspace_id)
        
        # Connect user
        await online_user_manager.connect(user_id, websocket)
        online_user_manager.register_user_workspace(user_id, workspace_id)
        
        # Maintain connection and listen for heartbeat/pings
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except (json.JSONDecodeError, TypeError):
                # Ignore invalid formatting from client, just keep socket alive
                pass
                
    except WebSocketDisconnect:
        if user_id:
            await online_user_manager.disconnect(user_id, websocket)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.exception(f"WebSocket error for user {user_id}: {e}")
        if user_id:
            await online_user_manager.disconnect(user_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
