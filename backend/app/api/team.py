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
            "lead_ids": [str(l) for l in getattr(team, 'lead_ids', [])],
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
            "lead_ids": [str(l) for l in getattr(t, 'lead_ids', [])],
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
        "lead_ids": [str(l) for l in getattr(team, 'lead_ids', [])],
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
    "/{team_id}/lead/remove",
    summary="Remove a Team Lead"
)
async def remove_team_lead(
    team_id: str,
    payload: TeamAssignLead,
    current_user: User = Depends(RequireRoles(["owner"])),
    team_service: TeamService = Depends(get_team_service)
):
    """
    Removes a user as the Team Lead. Restricted to Owners.
    """
    await team_service.remove_lead(
        team_id=team_id,
        workspace_id=str(current_user.workspace_id),
        lead_id=payload.team_lead_id
    )
    return {
        "message": "Team lead removed successfully."
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

@router.get(
    "/{team_id}/documents",
    summary="List Documents for a Team"
)
async def list_team_documents(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Returns all non-deleted documents associated with this team.
    Leads and owners see all statuses; members see only approved/published docs.
    """
    from bson import ObjectId
    from app.repositories.user import UserRepository
    from app.repositories.team import TeamRepository

    team_repo = TeamRepository(db)
    team = await team_repo.get_by_id(team_id)
    if not team or str(team.workspace_id) != str(current_user.workspace_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Team not found.")

    # Build query
    query = {
        "team_id": ObjectId(team_id),
        "is_deleted": False,
        "workspace_id": ObjectId(str(current_user.workspace_id))
    }
    # Members only see approved/published docs
    is_lead = str(current_user.id) in [str(l) for l in (team.lead_ids or [])]
    if current_user.role == "member" and not is_lead:
        query["status"] = {"$in": ["approved", "published"]}

    docs_cursor = db["documents"].find(query).sort("created_at", -1)
    docs = await docs_cursor.to_list(200)

    # Enrich with author names
    user_repo = UserRepository(db)
    result = []
    author_cache: dict = {}
    for d in docs:
        author_id = str(d.get("author_id", ""))
        if author_id not in author_cache:
            u = await user_repo.get_by_id(author_id)
            author_cache[author_id] = u.full_name if u else "Unknown"
        result.append({
            "id": str(d["_id"]),
            "title": d.get("title"),
            "description": d.get("description"),
            "content": d.get("content"),
            "tags": d.get("tags", []),
            "attachment_url": d.get("attachment_url"),
            "status": d.get("status"),
            "author_id": author_id,
            "author_name": author_cache[author_id],
            "view_count": d.get("view_count", 0),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None,
        })
    return result

@router.get(
    "/{team_id}/members-detail",
    summary="List Team Members with Full Details"
)
async def list_team_members_detail(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Returns enriched member info (name, email, role) for all members of a team,
    including their lead status within the team.
    """
    from bson import ObjectId
    from app.repositories.user import UserRepository
    from app.repositories.team import TeamRepository

    team_repo = TeamRepository(db)
    team = await team_repo.get_by_id(team_id)
    if not team or str(team.workspace_id) != str(current_user.workspace_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Team not found.")

    user_repo = UserRepository(db)
    lead_ids_str = [str(l) for l in (team.lead_ids or [])]
    result = []

    # Always include the workspace owner
    owner = await db["users"].find_one({
        "workspace_id": ObjectId(str(current_user.workspace_id)),
        "role": "owner"
    })
    if owner:
        result.append({
            "id": str(owner["_id"]),
            "full_name": owner.get("full_name"),
            "email": owner.get("email"),
            "workspace_role": owner.get("role"),
            "team_role": "owner",
            "status": owner.get("status"),
        })

    for member_id in team.member_ids:
        mid_str = str(member_id)
        # skip owner already added
        if owner and mid_str == str(owner["_id"]):
            continue
        u = await user_repo.get_by_id(mid_str)
        if not u:
            continue
        result.append({
            "id": mid_str,
            "full_name": u.full_name,
            "email": u.email,
            "workspace_role": u.role,
            "team_role": "lead" if mid_str in lead_ids_str else "member",
            "status": u.status,
        })
    return result

