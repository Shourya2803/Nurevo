from abc import ABC, abstractmethod
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger("nuvero.online_user_manager")

class OnlineUserManager(ABC):
    """
    Abstract interface for managing active WebSocket connections and user online presence.
    Enables future swapping with Redis Pub/Sub for scale-out architectures.
    """
    @abstractmethod
    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Register a new active WebSocket connection for a user."""
        pass

    @abstractmethod
    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """Deregister a WebSocket connection for a user."""
        pass

    @abstractmethod
    async def is_online(self, user_id: str) -> bool:
        """Check if a user has at least one active WebSocket session."""
        pass

    @abstractmethod
    async def send(self, user_id: str, message: Dict[str, Any]) -> bool:
        """Send a JSON payload to all active WebSocket connections for a user."""
        pass

    @abstractmethod
    async def broadcast(self, workspace_id: str, message: Dict[str, Any], db: Any = None) -> int:
        """Broadcast a JSON payload to all online users in a specific workspace."""
        pass


class DictionaryOnlineUserManager(OnlineUserManager):
    """
    Development-grade implementation storing active WebSocket sessions in-memory.
    """
    def __init__(self):
        # Maps user_id (str) -> Set of active WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        # Reverse map to verify which workspace a user belongs to for workspace-scoped broadcasts
        # (Can map user_id -> workspace_id for fast lookups)
        self._user_workspaces: Dict[str, str] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total sessions: {len(self._connections[user_id])}")

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self._connections:
            self._connections[user_id].discard(websocket)
            if not self._connections[user_id]:
                del self._connections[user_id]
                self._user_workspaces.pop(user_id, None)
            logger.info(f"User {user_id} disconnected.")

    async def is_online(self, user_id: str) -> bool:
        return user_id in self._connections and len(self._connections[user_id]) > 0

    async def send(self, user_id: str, message: Dict[str, Any]) -> bool:
        """
        Send JSON payload to all active sockets of a user.
        Returns True if at least one socket successfully received it.
        """
        if not await self.is_online(user_id):
            return False
            
        success = False
        dead_sockets = set()
        
        # Make a copy of connections to iterate safely (in case disconnect happens concurrently)
        sockets = list(self._connections[user_id])
        
        for ws in sockets:
            try:
                await ws.send_text(json.dumps(message))
                success = True
            except Exception as e:
                logger.warning(f"Failed to send websocket message to user {user_id}: {e}")
                dead_sockets.add(ws)
                
        # Clean up any closed/errored sockets
        for ws in dead_sockets:
            await self.disconnect(user_id, ws)
            
        return success

    async def broadcast(self, workspace_id: str, message: Dict[str, Any], db: Any = None) -> int:
        """
        Broadcast to all online users within a workspace.
        """
        count = 0
        
        # If db is provided, we can find all active users belonging to the workspace
        # otherwise we fall back to our locally cached user workspaces.
        if db is not None:
            active_online_users = []
            for uid in list(self._connections.keys()):
                # Fetch user details from DB or cache if needed
                user_doc = await db["users"].find_one({"_id": ObjectId(uid)}) if ObjectId.is_valid(uid) else None
                if user_doc and str(user_doc.get("workspace_id")) == workspace_id:
                    active_online_users.append(uid)
        else:
            active_online_users = [
                uid for uid, ws_id in self._user_workspaces.items() 
                if ws_id == workspace_id and uid in self._connections
            ]
            
        for uid in active_online_users:
            if await self.send(uid, message):
                count += 1
                
        return count

    def register_user_workspace(self, user_id: str, workspace_id: str):
        """Helper to cache user-to-workspace mapping for local broadcast routing."""
        self._user_workspaces[user_id] = workspace_id


# Instantiate global online user manager
online_user_manager = DictionaryOnlineUserManager()
