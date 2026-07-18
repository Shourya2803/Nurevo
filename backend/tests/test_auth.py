import pytest
from httpx import AsyncClient
from app.utils.db import get_database

@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_owner_signup_and_magic_link_flow(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # 1. Sign Up
    signup_payload = {
        "full_name": "Alex Owner",
        "email": "alex@acme.com",
        "workspace_name": "Acme Corp",
        "workspace_slug": "acme"
    }
    signup_response = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_response.status_code == 201
    assert "Workspace creation initiated" in signup_response.json()["message"]

    # Assert pending workspace and owner created in DB
    workspace = await db["workspaces"].find_one({"slug": "acme"})
    assert workspace is not None
    assert workspace["name"] == "Acme Corp"
    
    user = await db["users"].find_one({"email": "alex@acme.com"})
    assert user is not None
    assert user["role"] == "owner"
    assert user["status"] == "pending"
    assert str(user["workspace_id"]) == str(workspace["_id"])

    # Assert magic link created in DB
    magic_link = await db["magic_links"].find_one({"email": "alex@acme.com"})
    assert magic_link is not None
    assert magic_link["used"] is False
    assert magic_link["action"] == "signup"

    # 2. Verify Magic Link
    token = magic_link["token"]
    verify_response = await client.get(f"/api/v1/auth/verify?token={token}")
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert "access_token" in verify_data
    assert verify_data["role"] == "owner"
    assert verify_data["workspace_id"] == str(workspace["_id"])

    # Assert user status is now active and link is marked used
    user_updated = await db["users"].find_one({"email": "alex@acme.com"})
    assert user_updated["status"] == "active"
    magic_link_updated = await db["magic_links"].find_one({"token": token})
    assert magic_link_updated["used"] is True

    # 3. Request login magic link for existing user
    login_response = await client.post("/api/v1/auth/login", json={"email": "alex@acme.com"})
    assert login_response.status_code == 200
    assert "login link" in login_response.json()["message"]

    # Verify new login magic link
    new_magic_link = await db["magic_links"].find_one({"email": "alex@acme.com", "used": False})
    assert new_magic_link is not None
    assert new_magic_link["action"] == "login"

    verify_login_response = await client.get(f"/api/v1/auth/verify?token={new_magic_link['token']}")
    assert verify_login_response.status_code == 200
    assert "access_token" in verify_login_response.json()


@pytest.mark.asyncio
async def test_workspace_isolation_and_rbac(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # Create Owner 1 (Acme Workspace)
    owner1_payload = {
        "full_name": "Owner One",
        "email": "owner1@acme.com",
        "workspace_name": "Acme Workspace",
        "workspace_slug": "acme1"
    }
    await client.post("/api/v1/auth/signup", json=owner1_payload)
    ml1 = await db["magic_links"].find_one({"email": "owner1@acme.com"})
    v1 = await client.get(f"/api/v1/auth/verify?token={ml1['token']}")
    token1 = v1.json()["access_token"]
    w1_id = v1.json()["workspace_id"]

    # Create Owner 2 (Beta Workspace)
    owner2_payload = {
        "full_name": "Owner Two",
        "email": "owner2@beta.com",
        "workspace_name": "Beta Workspace",
        "workspace_slug": "beta"
    }
    await client.post("/api/v1/auth/signup", json=owner2_payload)
    ml2 = await db["magic_links"].find_one({"email": "owner2@beta.com"})
    v2 = await client.get(f"/api/v1/auth/verify?token={ml2['token']}")
    token2 = v2.json()["access_token"]
    w2_id = v2.json()["workspace_id"]

    # 1. Public endpoint lookup
    public_res = await client.get("/api/v1/workspaces/by-slug/acme1")
    assert public_res.status_code == 200
    assert public_res.json()["name"] == "Acme Workspace"

    # 2. Access own workspace (Should succeed)
    headers1 = {"Authorization": f"Bearer {token1}"}
    res_own = await client.get(f"/api/v1/workspaces/{w1_id}", headers=headers1)
    assert res_own.status_code == 200

    # 3. Access other workspace (Should fail with 403)
    res_other = await client.get(f"/api/v1/workspaces/{w2_id}", headers=headers1)
    assert res_other.status_code == 403
    assert "Cross-tenant access forbidden" in res_other.json()["detail"]

    # 4. Owner 1 updates settings (Should succeed)
    settings_payload = {"settings": {"theme": "dark", "primary_color": "#6F4E37"}}
    settings_res = await client.put(f"/api/v1/workspaces/{w1_id}/settings", json=settings_payload, headers=headers1)
    assert settings_res.status_code == 200
    assert settings_res.json()["settings"]["theme"] == "dark"


@pytest.mark.asyncio
async def test_team_crud_and_transactional_deletion(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # Setup Acme Owner
    owner_payload = {
        "full_name": "Acme Owner",
        "email": "owner@acme.com",
        "workspace_name": "Acme Corp",
        "workspace_slug": "acme"
    }
    await client.post("/api/v1/auth/signup", json=owner_payload)
    ml = await db["magic_links"].find_one({"email": "owner@acme.com"})
    v = await client.get(f"/api/v1/auth/verify?token={ml['token']}")
    token = v.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Team
    team_payload = {
        "name": "Backend Engineering",
        "description": "API, Database, and devops infrastructure team."
    }
    create_res = await client.post("/api/v1/teams", json=team_payload, headers=headers)
    assert create_res.status_code == 201
    team_data = create_res.json()["team"]
    team_id = team_data["id"]
    assert team_data["name"] == "Backend Engineering"

    # 2. List Teams
    list_res = await client.get("/api/v1/teams", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == team_id

    # 3. Create a member user in the workspace
    from bson import ObjectId
    user_id = ObjectId()
    from app.models.user import User
    new_user = User(
        _id=user_id,
        email="dev@acme.com",
        full_name="Alex Developer",
        role="member",
        status="active",
        workspace_id=ObjectId(v.json()["workspace_id"])
    )
    await db["users"].insert_one(new_user.to_mongo())

    # 4. Add user to the team
    member_payload = {"user_id": str(user_id)}
    add_member_res = await client.post(f"/api/v1/teams/{team_id}/members", json=member_payload, headers=headers)
    assert add_member_res.status_code == 200
    assert str(user_id) in add_member_res.json()["member_ids"]

    # 5. Assign member as lead
    lead_payload = {"team_lead_id": str(user_id)}
    assign_lead_res = await client.post(f"/api/v1/teams/{team_id}/lead", json=lead_payload, headers=headers)
    assert assign_lead_res.status_code == 200
    assert assign_lead_res.json()["team_lead_id"] == str(user_id)

    # Assert user's role updated to 'lead' in DB
    updated_user = await db["users"].find_one({"_id": user_id})
    assert updated_user["role"] == "lead"

    # 6. Delete Team and check cascade/cleanup
    delete_res = await client.delete(f"/api/v1/teams/{team_id}", headers=headers)
    assert delete_res.status_code == 200

    # Assert team deleted from DB
    deleted_team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    assert deleted_team is None
