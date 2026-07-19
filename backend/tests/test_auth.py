import pytest
from httpx import AsyncClient
from app.utils.db import get_database

@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_owner_signup_and_login_flow(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # 1. Sign Up
    signup_payload = {
        "full_name": "Alex Owner",
        "email": "alex@acme.com",
        "workspace_name": "Acme Corp",
        "workspace_slug": "acme",
        "password": "securepassword"
    }
    signup_response = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_response.status_code == 201
    
    signup_data = signup_response.json()
    assert "access_token" in signup_data
    assert signup_data["role"] == "owner"
    assert signup_data["email"] == "alex@acme.com"

    # Assert workspace and owner created in DB
    workspace = await db["workspaces"].find_one({"slug": "acme"})
    assert workspace is not None
    assert workspace["name"] == "Acme Corp"
    
    user = await db["users"].find_one({"email": "alex@acme.com"})
    assert user is not None
    assert user["role"] == "owner"
    assert user["status"] == "active"
    assert str(user["workspace_id"]) == str(workspace["_id"])
    assert user["password_hash"] is not None

    # 2. Login (Success)
    login_payload = {
        "email": "alex@acme.com",
        "password": "securepassword"
    }
    login_response = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["role"] == "owner"
    assert login_data["workspace_id"] == str(workspace["_id"])

    # 3. Login (Fail)
    fail_payload = {
        "email": "alex@acme.com",
        "password": "wrongpassword"
    }
    fail_response = await client.post("/api/v1/auth/login", json=fail_payload)
    assert fail_response.status_code == 401

@pytest.mark.asyncio
async def test_workspace_isolation_and_rbac(client: AsyncClient, test_db_clean):
    # Create Owner 1 (Acme Workspace)
    owner1_payload = {
        "full_name": "Owner One",
        "email": "owner1@acme.com",
        "workspace_name": "Acme Workspace",
        "workspace_slug": "acme1",
        "password": "securepassword1"
    }
    res1 = await client.post("/api/v1/auth/signup", json=owner1_payload)
    assert res1.status_code == 201
    token1 = res1.json()["access_token"]
    w1_id = res1.json()["workspace_id"]

    # Create Owner 2 (Beta Workspace)
    owner2_payload = {
        "full_name": "Owner Two",
        "email": "owner2@beta.com",
        "workspace_name": "Beta Workspace",
        "workspace_slug": "beta",
        "password": "securepassword2"
    }
    res2 = await client.post("/api/v1/auth/signup", json=owner2_payload)
    assert res2.status_code == 201
    token2 = res2.json()["access_token"]
    w2_id = res2.json()["workspace_id"]

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
        "workspace_slug": "acme",
        "password": "securepassword"
    }
    res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert res.status_code == 201
    token = res.json()["access_token"]
    workspace_id = res.json()["workspace_id"]
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
        workspace_id=ObjectId(workspace_id)
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

from unittest.mock import patch

class MockResponse:
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json_data = json_data

    def json(self):
        return self._json_data

@pytest.mark.asyncio
async def test_clerk_login_flow(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # 1. Login attempt for unregistered user
    login_res = await client.post("/api/v1/auth/clerk", json={"token": "mock_clerk_token"})
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["registered"] is False
    assert login_data["email"] == "clerk_user@acme.com"
    assert login_data["full_name"] == "Clerk User"

    # 2. Complete Signup
    signup_payload = {
        "token": "mock_clerk_token",
        "workspace_name": "Clerk Workspace",
        "workspace_slug": "clerk-slug"
    }
    signup_res = await client.post("/api/v1/auth/clerk/signup", json=signup_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert "access_token" in signup_data
    assert signup_data["role"] == "owner"
    assert signup_data["workspace_slug"] == "clerk-slug"

    # Assert db records
    workspace = await db["workspaces"].find_one({"slug": "clerk-slug"})
    assert workspace is not None
    assert workspace["name"] == "Clerk Workspace"

    user = await db["users"].find_one({"email": "clerk_user@acme.com"})
    assert user is not None
    assert user["role"] == "owner"
    assert user["status"] == "active"
    assert user["clerk_id"] == "user_mockclerk12345"
    assert user["avatar_url"] == "https://lh3.googleusercontent.com/avatar"

    # 3. Login attempt for now-registered user
    login_res2 = await client.post("/api/v1/auth/clerk", json={"token": "mock_clerk_token"})
    assert login_res2.status_code == 200
    login_data2 = login_res2.json()
    assert login_data2["registered"] is True
    assert "access_token" in login_data2["token"]
    assert login_data2["token"]["workspace_slug"] == "clerk-slug"
