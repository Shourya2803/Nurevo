from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException

class AnnouncementService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["announcements"]

    async def list_announcements(
        self,
        workspace_id: str,
        user_id: str,
        user_role: str,
        user_team_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all announcements relevant to the user.
        Owner / Lead can see hidden ones if needed; members see non-hidden and non-expired.
        Pinned items returned first.
        """
        ws_obj_id = ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id
        query: Dict[str, Any] = {"workspace_id": {"$in": [ws_obj_id, str(workspace_id)]}}

        # Non-owners only see non-hidden announcements
        if user_role not in ["owner"]:
            query["is_hidden"] = False

        cursor = self.collection.find(query).sort([("is_pinned", -1), ("created_at", -1)])
        docs = await cursor.to_list(length=100)

        result = []
        for d in docs:
            # Filter audience relevance
            audience = d.get("audience", "everyone")
            target_team_id = str(d.get("target_team_id")) if d.get("target_team_id") else None
            target_role = d.get("target_role")

            if user_role != "owner":
                if audience == "team" and target_team_id and target_team_id not in user_team_ids:
                    continue
                if audience == "role" and target_role and target_role != user_role:
                    continue

            # Format MongoDB doc
            poll = d.get("poll")
            if poll and "options" in poll:
                for opt in poll["options"]:
                    opt["votes"] = opt.get("votes", [])

            result.append({
                "id": str(d["_id"]),
                "workspace_id": str(d["workspace_id"]),
                "author_id": str(d["author_id"]),
                "author_name": d.get("author_name", "Workspace Admin"),
                "title": d.get("title"),
                "content": d.get("content"),
                "cover_image": d.get("cover_image"),
                "priority": d.get("priority", "normal"),
                "audience": audience,
                "target_team_id": target_team_id,
                "target_role": target_role,
                "is_pinned": d.get("is_pinned", False),
                "is_hidden": d.get("is_hidden", False),
                "template_type": d.get("template_type"),
                "attachments": d.get("attachments", []),
                "reactions": d.get("reactions", {}),
                "acknowledged_by": d.get("acknowledged_by", []),
                "poll": poll,
                "event_details": d.get("event_details"),
                "expires_at": d.get("expires_at"),
                "scheduled_at": d.get("scheduled_at"),
                "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at")),
            })
        return result

    async def create_announcement(
        self,
        workspace_id: str,
        author_id: str,
        author_name: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Creates a new announcement record (Admin / Owner only).
        """
        ws_id = ObjectId(workspace_id) if ObjectId.is_valid(workspace_id) else workspace_id
        auth_id = ObjectId(author_id) if ObjectId.is_valid(author_id) else author_id
        target_team = data.get("target_team_id")
        target_team_id = ObjectId(target_team) if target_team and ObjectId.is_valid(str(target_team)) else None

        doc = {
            "workspace_id": ws_id,
            "author_id": auth_id,
            "author_name": author_name,
            "title": data["title"],
            "content": data["content"],
            "cover_image": data.get("cover_image"),
            "priority": data.get("priority", "normal"),
            "audience": data.get("audience", "everyone"),
            "target_team_id": target_team_id,
            "target_role": data.get("target_role"),
            "is_pinned": data.get("is_pinned", False),
            "is_hidden": False,
            "template_type": data.get("template_type"),
            "attachments": data.get("attachments") or [],
            "reactions": {},
            "acknowledged_by": [],
            "poll": data.get("poll"),
            "event_details": data.get("event_details"),
            "expires_at": data.get("expires_at"),
            "scheduled_at": data.get("scheduled_at"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        res = await self.collection.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)
        doc["workspace_id"] = str(doc["workspace_id"])
        doc["author_id"] = str(doc["author_id"])
        if doc.get("target_team_id"):
            doc["target_team_id"] = str(doc["target_team_id"])
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        return doc

    async def toggle_pin(self, announcement_id: str, workspace_id: str) -> bool:
        doc = await self.collection.find_one({
            "_id": ObjectId(announcement_id),
            "workspace_id": ObjectId(workspace_id)
        })
        if not doc:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        new_pinned = not doc.get("is_pinned", False)
        await self.collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": {"is_pinned": new_pinned, "updated_at": datetime.utcnow()}}
        )
        return new_pinned

    async def toggle_hide(self, announcement_id: str, workspace_id: str) -> bool:
        doc = await self.collection.find_one({
            "_id": ObjectId(announcement_id),
            "workspace_id": ObjectId(workspace_id)
        })
        if not doc:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        new_hidden = not doc.get("is_hidden", False)
        await self.collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": {"is_hidden": new_hidden, "updated_at": datetime.utcnow()}}
        )
        return new_hidden

    async def delete_announcement(self, announcement_id: str, workspace_id: str) -> bool:
        res = await self.collection.delete_one({
            "_id": ObjectId(announcement_id),
            "workspace_id": ObjectId(workspace_id)
        })
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        return True

    async def toggle_reaction(self, announcement_id: str, user_id: str, emoji: str) -> Dict[str, Any]:
        doc = await self.collection.find_one({"_id": ObjectId(announcement_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Announcement not found.")

        reactions = doc.get("reactions", {})
        user_list = reactions.get(emoji, [])
        if user_id in user_list:
            user_list.remove(user_id)
        else:
            user_list.append(user_id)

        reactions[emoji] = user_list
        await self.collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": {f"reactions.{emoji}": user_list}}
        )
        return reactions

    async def toggle_acknowledge(self, announcement_id: str, user_id: str) -> List[str]:
        doc = await self.collection.find_one({"_id": ObjectId(announcement_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Announcement not found.")

        acknowledged_by = doc.get("acknowledged_by", [])
        if user_id in acknowledged_by:
            acknowledged_by.remove(user_id)
        else:
            acknowledged_by.append(user_id)

        await self.collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": {"acknowledged_by": acknowledged_by}}
        )
        return acknowledged_by

    async def vote_poll(self, announcement_id: str, user_id: str, option_id: str) -> Dict[str, Any]:
        doc = await self.collection.find_one({"_id": ObjectId(announcement_id)})
        if not doc or not doc.get("poll"):
            raise HTTPException(status_code=404, detail="Poll not found.")

        poll = doc["poll"]
        for opt in poll.get("options", []):
            votes = opt.get("votes", [])
            if opt["id"] == option_id:
                if user_id not in votes:
                    votes.append(user_id)
            else:
                # Single choice: remove user from other options
                if user_id in votes:
                    votes.remove(user_id)
            opt["votes"] = votes

        await self.collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": {"poll": poll}}
        )
        return poll
