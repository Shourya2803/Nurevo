from fastapi import APIRouter, Depends, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.utils.db import get_database
from app.auth.dependencies import get_current_user, RequireRoles, enforce_workspace_isolation
from app.models.user import User
from app.services.team import TeamService
from app.schemas.team import TeamCreate, TeamUpdate, TeamAssignLead, TeamAddMember, TeamRemoveMember

router = APIRouter(prefix="/teams", tags=["Teams"])

def get_team_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> TeamService:
    return TeamService(db)

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Team"
)
async def create_team(
    payload: TeamCreate,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Creates a new team within the owner's workspace.
    """
    team = await team_service.create_team(str(current_user.workspace_id), payload)
    return {
        "message": "Team created successfully.",
        "team": {
            "id": str(team.id),
            "name": team.name,
            "description": team.description,
            "workspace_id": str(team.workspace_id),
            "member_ids": [str(m) for m in team.member_ids],
            "team_lead_id": str(team.team_lead_id) if team.team_lead_id else None
        }
    }

@router.get(
    "",
    summary="List Workspace Teams"
)
async def list_teams(
    current_user: User = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Lists teams in the workspace.
    Owners see all teams; Leads and Members see only their assigned teams.
    """
    teams = await team_service.list_teams(
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "description": t.description,
            "workspace_id": str(t.workspace_id),
            "member_ids": [str(m) for m in t.member_ids],
            "team_lead_id": str(t.team_lead_id) if t.team_lead_id else None,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat()
        } for t in teams
    ]

@router.get(
    "/{team_id}",
    summary="Get Team Details"
)
async def get_team_details(
    team_id: str,
    current_user: User = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Retrieves details for a team. User must have access to that team.
    """
    team = await team_service.get_team_by_id(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        user_id=str(current_user.id),
        role=current_user.role
    )
    return {
        "id": str(team.id),
        "name": team.name,
        "description": team.description,
        "workspace_id": str(team.workspace_id),
        "member_ids": [str(m) for m in team.member_ids],
        "team_lead_id": str(team.team_lead_id) if team.team_lead_id else None,
        "created_at": team.created_at.isoformat(),
        "updated_at": team.updated_at.isoformat()
    }

@router.put(
    "/{team_id}",
    summary="Update Team Details"
)
async def update_team(
    team_id: str,
    payload: TeamUpdate,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Updates team name and description. Restricted to Owners.
    """
    team = await team_service.update_team(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        data=payload
    )
    return {
        "message": "Team details updated successfully.",
        "team": {
            "id": str(team.id),
            "name": team.name,
            "description": team.description
        }
    }

@router.post(
    "/{team_id}/lead",
    summary="Assign a Team Lead"
)
async def assign_team_lead(
    team_id: str,
    payload: TeamAssignLead,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Assigns an active user as the Team Lead. Restricted to Owners.
    """
    team = await team_service.assign_lead(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        lead_id=payload.team_lead_id
    )
    return {
        "message": "Team lead assigned successfully.",
        "team_lead_id": str(team.team_lead_id)
    }

@router.post(
    "/{team_id}/members",
    summary="Add a member to the Team"
)
async def add_team_member(
    team_id: str,
    payload: TeamAddMember,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Registers a workspace user to the team. Restricted to Owners.
    """
    team = await team_service.add_member(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        user_id=payload.user_id
    )
    return {
        "message": "Member added to team successfully.",
        "member_ids": [str(m) for m in team.member_ids]
    }

@router.post(
    "/{team_id}/members/remove",
    summary="Remove a member from the Team"
)
async def remove_team_member(
    team_id: str,
    payload: TeamRemoveMember,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Removes a member from the team. Restricted to Owners.
    """
    team = await team_service.remove_member(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        user_id=payload.user_id
    )
    return {
        "message": "Member removed from team successfully.",
        "member_ids": [str(m) for m in team.member_ids]
    }

@router.delete(
    "/{team_id}",
    summary="Delete a Team"
)
async def delete_team(
    team_id: str,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Deletes the team and resets references in documents/chats. Restricted to Owners.
    """
    await team_service.delete_team(team_id=team_id, workspace_id=str(current_user.workspace_id))
    return {
        "message": "Team deleted successfully."
    }
