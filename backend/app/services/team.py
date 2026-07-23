import logging
from typing import List, Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.team import Team
from app.repositories.team import TeamRepository
from app.repositories.user import UserRepository
from app.schemas.team import TeamCreate, TeamUpdate

logger = logging.getLogger(__name__)

class TeamService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.team_repo = TeamRepository(db)
        self.user_repo = UserRepository(db)

    async def create_team(self, workspace_id: str, data: TeamCreate) -> Team:
        """
        Creates a new team inside a workspace.
        """
        # Validate if team name already exists in this workspace
        existing_teams = await self.team_repo.list_by_workspace(workspace_id)
        if any(t.name.lower() == data.name.lower() for t in existing_teams):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A team named '{data.name}' already exists in this workspace."
            )

        new_team = Team(
            name=data.name,
            description=data.description,
            workspace_id=ObjectId(workspace_id)
        )
        return await self.team_repo.create(new_team)

    async def list_teams(self, workspace_id: str, user_id: str, role: str) -> List[Team]:
        """
        Lists teams in the workspace. Owners see all; leads/members see only their assigned teams.
        """
        if role == "owner":
            return await self.team_repo.list_by_workspace(workspace_id)
        return await self.team_repo.list_by_member(workspace_id, user_id)

    async def get_team_by_id(self, team_id: str, workspace_id: str, user_id: str, role: str) -> Team:
        """
        Gets team details. Asserts team belongs to workspace and user is authorized to view it.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found."
            )
        
        # Enforce Team Isolation for Members
        if role not in ["owner", "lead"]:
            is_lead = str(team.team_lead_id) == str(user_id) or str(user_id) in [str(l) for l in (team.lead_ids or [])]
            is_member = str(user_id) in [str(m) for m in team.member_ids]
            if not is_lead and not is_member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not belong to this team."
                )
        return team

    async def update_team(self, team_id: str, workspace_id: str, data: TeamUpdate) -> Team:
        """
        Updates basic team metadata (name/description). Owner access only.
        """
        # Validate team exists
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found."
            )

        update_payload = {}
        if data.name is not None:
            update_payload["name"] = data.name
        if data.description is not None:
            update_payload["description"] = data.description

        if not update_payload:
            return team

        updated = await self.team_repo.update(team_id, update_payload)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update team."
            )
        return updated

    async def assign_lead(self, team_id: str, workspace_id: str, lead_id: str, assigned_by_id: Optional[str] = None) -> Team:
        """
        Assigns a Team Lead. Lead must be an active member of the workspace.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

        lead_user = await self.user_repo.get_by_id(lead_id)
        if not lead_user or str(lead_user.workspace_id) != workspace_id or lead_user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid lead user. User must be an active member of this workspace."
            )

        # Update role to lead if it is currently member
        if lead_user.role == "member":
            await self.user_repo.update(lead_id, {"role": "lead"})

        # Update lead and ensure lead is in member_ids and lead_ids
        updated = await self.team_repo.update(
            team_id, 
            {
                "$set": {"team_lead_id": ObjectId(lead_id)},
                "$addToSet": {
                    "member_ids": ObjectId(lead_id),
                    "lead_ids": ObjectId(lead_id)
                }
            }
        )

        from app.utils.event_bus import event_bus
        await event_bus.publish("team_lead_assigned", {
            "team_id": team_id,
            "workspace_id": workspace_id,
            "lead_id": lead_id,
            "assigned_by_id": assigned_by_id or str(team.workspace_id),
            "team_name": team.name
        })

        return updated

    async def remove_lead(self, team_id: str, workspace_id: str, lead_id: str) -> Team:
        """
        Removes a Team Lead role from a member of the team.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

        lead_oid = ObjectId(lead_id)
        update_op = {"$pull": {"lead_ids": lead_oid}}
        if team.team_lead_id and str(team.team_lead_id) == str(lead_id):
            update_op["$set"] = {"team_lead_id": None}

        updated = await self.team_repo.update(team_id, update_op)

        # Check if the user is still a lead on any other team in this workspace
        remaining_leads = await self.team_repo.get_all({
            "workspace_id": ObjectId(workspace_id),
            "lead_ids": lead_oid
        })
        if not remaining_leads:
            # If not a lead on any team, demote workspace role back to member
            lead_user = await self.user_repo.get_by_id(lead_id)
            if lead_user and lead_user.role == "lead":
                await self.user_repo.update(lead_id, {"role": "member"})

        return updated

    async def add_member(self, team_id: str, workspace_id: str, user_id: str, added_by_id: Optional[str] = None) -> Team:
        """
        Adds a user to a team. User must belong to the workspace.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

        member_user = await self.user_repo.get_by_id(user_id)
        if not member_user or str(member_user.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not exist in this workspace.")

        user_obj_id = ObjectId(user_id)
        # Check if user is already a member using string comparison
        member_ids_str = [str(m) for m in team.member_ids]
        if str(user_id) in member_ids_str:
            return team  # Already a member

        updated = await self.team_repo.update(team_id, {"$addToSet": {"member_ids": user_obj_id}})

        from app.utils.event_bus import event_bus
        await event_bus.publish("team_member_added", {
            "team_id": team_id,
            "workspace_id": workspace_id,
            "member_id": user_id,
            "added_by_id": added_by_id or str(team.workspace_id),
            "team_name": team.name
        })

        return updated

    async def remove_member(self, team_id: str, workspace_id: str, user_id: str, removed_by_id: Optional[str] = None) -> Team:
        """
        Removes a member from the team and resets lead assignment if the user was the lead.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

        user_obj_id = ObjectId(user_id)
        update_op = {
            "$pull": {
                "member_ids": user_obj_id,
                "lead_ids": user_obj_id
            }
        }
        
        # If removed member is the lead, unassign lead
        if team.team_lead_id and str(team.team_lead_id) == str(user_id):
            update_op["$set"] = {"team_lead_id": None}

        updated = await self.team_repo.update(team_id, update_op)

        from app.utils.event_bus import event_bus
        await event_bus.publish("team_member_removed", {
            "team_id": team_id,
            "workspace_id": workspace_id,
            "member_id": user_id,
            "removed_by_id": removed_by_id or str(team.workspace_id),
            "team_name": team.name
        })

        return updated

    async def delete_team(self, team_id: str, workspace_id: str) -> bool:
        """
        Deletes a team and cleans up document associations and chat rooms.
        Implements transaction logic with a standalone dev fallback.
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team or str(team.workspace_id) != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found."
            )

        client = self.db.client
        team_oid = ObjectId(team_id)
        try:
            # Attempt multi-document transaction (requires Replica Set)
            async with await client.start_session() as session:
                async with session.start_transaction():
                    # 1. Delete Team
                    await self.db["teams"].delete_one({"_id": team_oid}, session=session)
                    # 2. Update Documents referencing the team
                    await self.db["documents"].update_many(
                        {"team_id": team_oid},
                        {"$set": {"team_id": None}},
                        session=session
                    )
                    # 3. Delete team chats
                    await self.db["conversations"].delete_many(
                        {"team_id": team_oid},
                        session=session
                    )
            logger.info(f"Team {team_id} successfully deleted via transaction.")
            return True
        except Exception as e:
            # Fallback if standalone MongoDB without replica set or if using mock clients (like mongomock)
            err_str = str(e)
            if "Transaction numbers are only allowed" in err_str or "transient" in err_str.lower() or "session" in err_str.lower():
                logger.warning("Replica Set not available or mock database in use. Performing team deletion sequentially.")
                await self.team_repo.delete(team_id)
                await self.db["documents"].update_many(
                    {"team_id": team_oid},
                    {"$set": {"team_id": None}}
                )
                await self.db["conversations"].delete_many(
                    {"team_id": team_oid}
                )
                return True
            else:
                logger.error(f"Failed to delete team {team_id} inside transaction: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="An error occurred while deleting the team."
                )
