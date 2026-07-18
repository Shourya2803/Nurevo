from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.db import get_database
from app.auth.dependencies import get_current_user, RequireRoles, enforce_workspace_isolation
from app.models.user import User
from app.services.workspace import WorkspaceService
from app.schemas.workspace import WorkspaceSettingsUpdate, WorkspaceResponse, WorkspaceInviteMember, MemberRoleUpdate

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

def get_workspace_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> WorkspaceService:
    return WorkspaceService(db)

@router.get(
    "/by-slug/{slug}",
    status_code=status.HTTP_200_OK,
    summary="Get Workspace Details by Slug (Public)"
)
async def get_workspace_by_slug(
    slug: str,
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Public lookup for workspace metadata using its slug (subdomain).
    Allows client-side dynamic branding prior to authentication.
    """
    workspace = await workspace_service.get_workspace_by_slug(slug)
    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "slug": workspace.slug,
        "settings": workspace.settings
    }

@router.get(
    "/{workspace_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Workspace details"
)
async def get_workspace_details(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Retrieves full details of a workspace. Restricted to authenticated users belonging to that workspace.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    workspace = await workspace_service.get_workspace_by_id(workspace_id)
    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "slug": workspace.slug,
        "owner_id": str(workspace.owner_id),
        "settings": workspace.settings,
        "created_at": workspace.created_at.isoformat(),
        "updated_at": workspace.updated_at.isoformat()
    }

@router.put(
    "/{workspace_id}/settings",
    status_code=status.HTTP_200_OK,
    summary="Update Workspace settings"
)
async def update_workspace_settings(
    workspace_id: str,
    payload: WorkspaceSettingsUpdate,
    current_user: User = Depends(RequireRoles(["owner"])),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Updates the workspace configurations. Restrictive to Workspace Owners.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    workspace = await workspace_service.update_settings(
        workspace_id=workspace_id,
        owner_id=str(current_user.id),
        new_settings=payload.settings
    )
    return {
        "message": "Workspace settings updated successfully.",
        "settings": workspace.settings
    }

@router.post(
    "/{workspace_id}/invitations",
    status_code=status.HTTP_201_CREATED,
    summary="Invite a new member to the Workspace"
)
async def invite_member(
    workspace_id: str,
    payload: WorkspaceInviteMember,
    current_user: User = Depends(RequireRoles(["owner"])),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Invites a member to join the workspace. Dispatches a magic invite link.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    invite = await workspace_service.invite_member(
        workspace_id=workspace_id,
        invited_by=str(current_user.id),
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        team_id=payload.team_id
    )
    return {
        "message": f"Invitation email successfully sent to {payload.email}.",
        "invitation": {
            "id": str(invite.id),
            "email": invite.email,
            "role": invite.role,
            "status": invite.status
        }
    }

@router.get(
    "/{workspace_id}/members",
    summary="List Workspace Members"
)
async def list_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Retrieves all members of a workspace.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    members = await workspace_service.list_members(workspace_id)
    return [
        {
            "id": str(m.id),
            "full_name": m.full_name,
            "email": m.email,
            "role": m.role,
            "status": m.status,
            "created_at": m.created_at.isoformat()
        } for m in members
    ]

@router.patch(
    "/{workspace_id}/members/{user_id}/role",
    summary="Update Member Role or Status"
)
async def update_member_role(
    workspace_id: str,
    user_id: str,
    payload: MemberRoleUpdate,
    current_user: User = Depends(RequireRoles(["owner"])),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Updates the workspace member role/status. Restricted to Owner.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    updated_user = await workspace_service.update_member_role_or_status(
        workspace_id=workspace_id,
        member_id=user_id,
        role=payload.role,
        status_value=payload.status
    )
    return {
        "message": "User membership updated successfully.",
        "user": {
            "id": str(updated_user.id),
            "role": updated_user.role,
            "status": updated_user.status
        }
    }

@router.delete(
    "/{workspace_id}/members/{user_id}",
    summary="Delete a Workspace Member"
)
async def delete_member(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    workspace_service: WorkspaceService = Depends(get_workspace_service)
):
    """
    Deletes a member from the workspace. Unlinks them from all teams. Restricted to Owners.
    """
    enforce_workspace_isolation(workspace_id, current_user)
    await workspace_service.remove_member(workspace_id, user_id)
    return {
        "message": "Member deleted from workspace successfully."
    }
