from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import secrets
from datetime import datetime, timedelta

from app.models.workspace import Workspace
from app.models.user import User
from app.models.invitation import Invitation
from app.repositories.workspace import WorkspaceRepository
from app.repositories.user import UserRepository
from app.repositories.invitation import InvitationRepository
from app.repositories.team import TeamRepository
from app.utils.config import settings
from app.utils.email import send_email

class WorkspaceService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.workspace_repo = WorkspaceRepository(db)
        self.user_repo = UserRepository(db)
        self.invite_repo = InvitationRepository(db)
        self.team_repo = TeamRepository(db)

    async def get_workspace_by_id(self, workspace_id: str) -> Optional[Workspace]:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found."
            )
        return workspace

    async def get_workspace_by_slug(self, slug: str) -> Optional[Workspace]:
        workspace = await self.workspace_repo.get_by_slug(slug)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found."
            )
        return workspace

    async def update_settings(self, workspace_id: str, owner_id: str, new_settings: Dict[str, Any]) -> Workspace:
        workspace = await self.get_workspace_by_id(workspace_id)
        if str(workspace.owner_id) != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the workspace owner can update workspace settings."
            )
        
        current_settings = workspace.settings or {}
        current_settings.update(new_settings)
        
        updated_workspace = await self.workspace_repo.update(workspace_id, {"settings": current_settings})
        if not updated_workspace:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update workspace settings."
            )
        return updated_workspace

    async def invite_member(self, workspace_id: str, invited_by: str, email: str, full_name: str, role: str, team_id: Optional[str] = None) -> Invitation:
        """
        Invites a user to the workspace. Sets a non-expiring token (100 years), creates a pending User model,
        and emails the magic join link.
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        
        # 1. Domain Check
        allowed_domains = workspace.settings.get("allowed_domains", [])
        if allowed_domains:
            email_domain = email.split("@")[-1].lower()
            if email_domain not in [d.lower() for d in allowed_domains]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Registration restricted to domains: {', '.join(allowed_domains)}."
                )

        # 2. Check if user already exists
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered in this platform."
            )

        # 3. Create Pending User
        user_id = ObjectId()
        pending_user = User(
            _id=user_id,
            email=email,
            full_name=full_name,
            role=role,
            status="pending",
            workspace_id=ObjectId(workspace_id)
        )
        await self.user_repo.create(pending_user)

        # 4. Generate Non-expiring invitation (100 years)
        token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(days=365 * 100) # 100 years

        invitation = Invitation(
            email=email,
            workspace_id=ObjectId(workspace_id),
            invited_by=ObjectId(invited_by),
            team_id=ObjectId(team_id) if team_id else None,
            role=role,
            token=token,
            status="pending",
            expires_at=expiry
        )
        created_invite = await self.invite_repo.create(invitation)

        # 5. Send Invite Magic Link
        join_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"
        subject = f"Invitation to join {workspace.name} on Nurevo"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                <h2 style="color: #6F4E37;">Join {workspace.name}!</h2>
                <p>Hello {full_name},</p>
                <p>You have been invited to join the <strong>{workspace.name}</strong> workspace as a <strong>{role}</strong>.</p>
                <p>Click the button below to join immediately (no credentials required):</p>
                <div style="margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #6F4E37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p>Or copy and paste this URL into your browser:</p>
                <p style="word-break: break-all;"><a href="{join_url}">{join_url}</a></p>
                <br/>
                <p style="font-size: 12px; color: #777;">This magic join link is exclusive to your email and is valid indefinitely.</p>
            </body>
        </html>
        """
        await send_email(email, subject, html_content)
        return created_invite

    async def list_members(self, workspace_id: str) -> List[User]:
        """
        Lists all users in a workspace.
        """
        return await self.user_repo.get_all({"workspace_id": ObjectId(workspace_id)})

    async def update_member_role_or_status(self, workspace_id: str, member_id: str, role: str, status_value: Optional[str] = None, updated_by: Optional[str] = None) -> User:
        """
        Allows Workspace Owner to update roles (lead | member) or toggle status (active | inactive).
        """
        user = await self.user_repo.get_by_id(member_id)
        if not user or str(user.workspace_id) != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in this workspace."
            )

        old_role = user.role
        updates: Dict[str, Any] = {"role": role}
        if status_value:
            updates["status"] = status_value

        updated_user = await self.user_repo.update(member_id, updates)

        if role != old_role:
            from app.utils.event_bus import event_bus
            await event_bus.publish("member_role_updated", {
                "workspace_id": workspace_id,
                "user_id": member_id,
                "old_role": old_role,
                "new_role": role,
                "updated_by": updated_by
            })

        return updated_user

    async def remove_member(self, workspace_id: str, member_id: str) -> None:
        """
        Removes a member from the workspace and unlinks them from all teams they belonged to.
        """
        user = await self.user_repo.get_by_id(member_id)
        if not user or str(user.workspace_id) != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in this workspace."
            )
        if user.role == "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace Owner cannot be deleted from the workspace."
            )

        # Remove user from all teams using TeamService
        from app.services.team import TeamService
        team_service = TeamService(self.db)
        
        teams = await self.team_repo.get_all({
            "workspace_id": ObjectId(workspace_id),
            "member_ids": ObjectId(member_id)
        })
        for team in teams:
            try:
                await team_service.remove_member(str(team.id), workspace_id, member_id)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to remove user {member_id} from team {team.id}: {e}")

        # Delete all invitation records for this user's email in this workspace
        if user.email:
            await self.invite_repo.collection.delete_many({
                "workspace_id": ObjectId(workspace_id),
                "email": user.email
            })

        # Delete user record
        await self.user_repo.delete(member_id)
