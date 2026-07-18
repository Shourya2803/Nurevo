import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.user import User
from app.models.workspace import Workspace
from app.models.magic_link import MagicLink
from app.repositories.user import UserRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.magic_link import MagicLinkRepository
from app.repositories.invitation import InvitationRepository
from app.repositories.team import TeamRepository
from app.schemas.auth import OwnerSignUpRequest
from app.utils.config import settings
from app.utils.email import send_email
from app.utils.security import create_access_token

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.user_repo = UserRepository(db)
        self.workspace_repo = WorkspaceRepository(db)
        self.magic_repo = MagicLinkRepository(db)
        self.invite_repo = InvitationRepository(db)

    async def sign_up_owner(self, req: OwnerSignUpRequest) -> Tuple[User, Workspace]:
        """
        Creates a Workspace and its Owner user account in a pending state,
        then dispatches a verification Magic Link.
        """
        # 1. Validation Checks
        existing_slug = await self.workspace_repo.get_by_slug(req.workspace_slug)
        if existing_slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace slug is already taken."
            )

        existing_user = await self.user_repo.get_by_email(req.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email is already registered."
            )

        # 2. Sequential Creation with Rollback Cleanup on failure
        workspace_id = ObjectId()
        owner_id = ObjectId()

        new_workspace = Workspace(
            _id=workspace_id,
            name=req.workspace_name,
            slug=req.workspace_slug,
            owner_id=owner_id
        )

        new_user = User(
            _id=owner_id,
            email=req.email,
            full_name=req.full_name,
            role="owner",
            status="pending",
            workspace_id=workspace_id
        )

        try:
            # Insert workspace
            created_workspace = await self.workspace_repo.create(new_workspace)
            # Insert user
            created_user = await self.user_repo.create(new_user)
            
            # 3. Generate and send verification Magic Link
            await self.send_magic_link(created_user, created_workspace, action="signup")
            
            return created_user, created_workspace

        except Exception as e:
            logger.error(f"Error during owner signup database transactions: {e}")
            # Manual rollback
            await self.user_repo.delete(str(owner_id))
            await self.workspace_repo.delete(str(workspace_id))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Sign up failed. Please try again later."
            )

    async def send_login_magic_link(self, email: str) -> bool:
        """
        Generates and sends a login magic link for an existing active user.
        Always returns True to prevent user enumeration attacks.
        """
        user = await self.user_repo.get_by_email(email)
        if not user:
            logger.warning(f"Login request for unregistered email: {email}")
            return True

        if user.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owners can log in using this form. Members and Team Leads must access the workspace using their workspace invite link."
            )

        if user.status == "inactive":
            logger.warning(f"Login request for inactive user: {email}")
            return True

        workspace = await self.workspace_repo.get_by_id(str(user.workspace_id))
        if not workspace:
            logger.error(f"User {user.email} associated with missing workspace: {user.workspace_id}")
            return True

        await self.send_magic_link(user, workspace, action="login")
        return True

    async def send_magic_link(self, user: User, workspace: Workspace, action: str) -> None:
        """
        Helper method to generate, save, and email a magic login/signup link.
        """
        token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(minutes=settings.MAGIC_LINK_EXPIRE_MINUTES)

        magic_link = MagicLink(
            token=token,
            email=user.email,
            user_id=user.id,
            workspace_id=workspace.id,
            action=action,
            expires_at=expiry
        )
        
        await self.magic_repo.create(magic_link)

        # Build absolute magic link callback URL (frontend routes handle the validation callback)
        callback_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"
        
        # Email Template
        subject = f"Verify your access to {workspace.name}" if action == "signup" else "Magic Login Link for your workspace"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                <h2 style="color: #6F4E37;">Welcome to {workspace.name}!</h2>
                <p>Hello {user.full_name},</p>
                <p>You requested a magic sign-in link to access your workspace. Click the button below to authenticate:</p>
                <div style="margin: 30px 0;">
                    <a href="{callback_url}" style="background-color: #6F4E37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In to Workspace</a>
                </div>
                <p style="font-size: 12px; color: #777;">This link is valid for {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes and can only be used once.</p>
                <p style="font-size: 12px; color: #999;">If you did not request this email, you can safely ignore it.</p>
            </body>
        </html>
        """
        await send_email(user.email, subject, html_content)

    async def verify_magic_link(self, token: str) -> Tuple[str, User, Workspace]:
        """
        Validates the magic token, marks it used, activates user accounts, and returns access tokens.
        Supports both login links and invitation tokens.
        """
        # 1. Check Magic Link Repository
        magic_link = await self.magic_repo.get_by_token(token)
        user = None
        workspace = None
        
        if magic_link:
            if magic_link.expires_at < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Magic link has expired."
                )

            # Mark link as used
            await self.magic_repo.update(str(magic_link.id), {"used": True})

            # Fetch user
            user = await self.user_repo.get_by_id(str(magic_link.user_id))
            if not user or user.status == "inactive":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User account is inactive or not found."
                )

            # Activate user if pending
            if user.status == "pending":
                user = await self.user_repo.update(str(user.id), {"status": "active"})

            # Fetch workspace
            workspace = await self.workspace_repo.get_by_id(str(magic_link.workspace_id))

        else:
            # 2. Check Invitation Repository
            invitation = await self.invite_repo.get_by_token(token)
            if not invitation or invitation.status not in ["pending", "accepted"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired magic join token."
                )

            # Mark invitation accepted if it was pending
            if invitation.status == "pending":
                await self.invite_repo.update(str(invitation.id), {"status": "accepted"})

            # Fetch pending user by email
            user = await self.user_repo.get_by_email(invitation.email)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Associated invitation account not found."
                )

            # Activate user
            user = await self.user_repo.update(str(user.id), {"status": "active"})

            # Fetch workspace
            workspace = await self.workspace_repo.get_by_id(str(invitation.workspace_id))

            # Add to team if invitation specified team_id
            if invitation.team_id:
                team_repo = TeamRepository(self.db)
                team_data = await team_repo.get_by_id(str(invitation.team_id))
                if team_data and user.id not in team_data.member_ids:
                    await team_repo.add_member(str(invitation.team_id), str(invitation.workspace_id), str(user.id))

        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated workspace not found."
            )

        # Generate JWT access token
        access_token = create_access_token(user.id)
        
        return access_token, user, workspace
