import pytest
from httpx import AsyncClient
from bson import ObjectId
from app.utils.db import get_database

@pytest.mark.asyncio
async def test_document_lead_approval_and_hidden_endpoints(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # 1. Sign Up Owner to establish workspace
    owner_payload = {
        "full_name": "Alice Owner",
        "email": "alice@owner.com",
        "workspace_name": "Orion Corp",
        "workspace_slug": "orion",
        "password": "securepassword"
    }
    signup_res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    owner_token = signup_data["access_token"]
    workspace_id = signup_data["workspace_id"]
    owner_user = await db["users"].find_one({"email": "alice@owner.com"})
    owner_id = str(owner_user["_id"])
    headers_owner = {"Authorization": f"Bearer {owner_token}"}

    # 2. Create two teams: Team A and Team B
    team_a_res = await client.post("/api/v1/teams", json={"name": "Team A", "description": "Team A Desc"}, headers=headers_owner)
    assert team_a_res.status_code == 201
    team_a_id = team_a_res.json()["team"]["id"]

    team_b_res = await client.post("/api/v1/teams", json={"name": "Team B", "description": "Team B Desc"}, headers=headers_owner)
    assert team_b_res.status_code == 201
    team_b_id = team_b_res.json()["team"]["id"]

    # 3. Create two users to be leads: Lead A and Lead B
    # We will simulate invite/signup or create them directly in the DB for speed
    lead_a_id = str(ObjectId())
    lead_b_id = str(ObjectId())
    
    await db["users"].insert_many([
        {
            "_id": ObjectId(lead_a_id),
            "email": "lead_a@orion.com",
            "full_name": "Lead A",
            "role": "lead",
            "workspace_id": ObjectId(workspace_id),
            "status": "active"
        },
        {
            "_id": ObjectId(lead_b_id),
            "email": "lead_b@orion.com",
            "full_name": "Lead B",
            "role": "lead",
            "workspace_id": ObjectId(workspace_id),
            "status": "active"
        }
    ])

    # Assign Lead A as lead of Team A, and Lead B as lead of Team B
    await db["teams"].update_one({"_id": ObjectId(team_a_id)}, {"$set": {"team_lead_id": ObjectId(lead_a_id), "lead_ids": [ObjectId(lead_a_id)]}})
    await db["teams"].update_one({"_id": ObjectId(team_b_id)}, {"$set": {"team_lead_id": ObjectId(lead_b_id), "lead_ids": [ObjectId(lead_b_id)]}})

    # Generate login tokens for Lead A and Lead B
    from app.utils.security import create_access_token
    token_lead_a = create_access_token(subject=lead_a_id)
    token_lead_b = create_access_token(subject=lead_b_id)
    headers_lead_a = {"Authorization": f"Bearer {token_lead_a}"}
    headers_lead_b = {"Authorization": f"Bearer {token_lead_b}"}

    # 4. Create a document for Team A with status "pending_approval"
    doc_a_payload = {
        "title": "Doc Team A",
        "description": "Doc Team A description",
        "content": "Secret Team A Content",
        "tags": ["team-a"],
        "team_id": team_a_id
    }
    
    # We create it from Owner (which auto-approves by default in service unless status is set manually,
    # or we can insert directly into DB to test approval endpoint)
    # Let's insert it directly into the database as pending_approval
    doc_a_id = str(ObjectId())
    await db["documents"].insert_one({
        "_id": ObjectId(doc_a_id),
        "title": "Doc Team A",
        "description": "Doc Team A description",
        "content": "Secret Team A Content",
        "tags": ["team-a"],
        "status": "pending_approval",
        "workspace_id": ObjectId(workspace_id),
        "team_id": ObjectId(team_a_id),
        "author_id": ObjectId(owner_id),
        "is_deleted": False,
        "created_at": getattr(pytest, "utcnow", lambda: None)() or ObjectId(doc_a_id).generation_time,
        "updated_at": getattr(pytest, "utcnow", lambda: None)() or ObjectId(doc_a_id).generation_time
    })

    # 5. Lead B tries to approve Team A's document (Should be 403 Forbidden)
    res_approve_fail = await client.post(f"/api/v1/documents/{doc_a_id}/approve", headers=headers_lead_b)
    assert res_approve_fail.status_code == 403
    assert "not a lead of this document's team" in res_approve_fail.json()["detail"]

    # 6. Lead A tries to approve Team A's document (Should succeed 200)
    res_approve_ok = await client.post(f"/api/v1/documents/{doc_a_id}/approve", headers=headers_lead_a)
    assert res_approve_ok.status_code == 200
    assert res_approve_ok.json()["status"] == "approved"

    # Reset doc to pending_approval for reject test
    await db["documents"].update_one({"_id": ObjectId(doc_a_id)}, {"$set": {"status": "pending_approval"}})

    # 7. Lead B tries to reject Team A's document (Should be 403 Forbidden)
    res_reject_fail = await client.post(f"/api/v1/documents/{doc_a_id}/reject", headers=headers_lead_b)
    assert res_reject_fail.status_code == 403

    # 8. Lead A tries to reject Team A's document (Should succeed 200)
    res_reject_ok = await client.post(f"/api/v1/documents/{doc_a_id}/reject", headers=headers_lead_a)
    assert res_reject_ok.status_code == 200
    assert res_reject_ok.json()["status"] == "rejected"

    # 9. Test Hidden Documents endpoints
    # Hide document using Owner
    hide_res = await client.patch(f"/api/v1/documents/{doc_a_id}/hide", headers=headers_owner)
    assert hide_res.status_code == 200

    # Retrieve hidden documents list using Owner (Should contain doc_a)
    hidden_list_res = await client.get("/api/v1/documents/hidden", headers=headers_owner)
    assert hidden_list_res.status_code == 200
    hidden_docs = hidden_list_res.json()
    assert len(hidden_docs) == 1
    assert hidden_docs[0]["id"] == doc_a_id

    # Try listing hidden documents using Lead A (Should be 403 Forbidden)
    hidden_list_lead_res = await client.get("/api/v1/documents/hidden", headers=headers_lead_a)
    assert hidden_list_lead_res.status_code == 403

    # Unhide document using Owner (Should succeed)
    unhide_res = await client.patch(f"/api/v1/documents/{doc_a_id}/unhide", headers=headers_owner)
    assert unhide_res.status_code == 200

    # Retrieve hidden documents list again (Should be empty now)
    hidden_list_res2 = await client.get("/api/v1/documents/hidden", headers=headers_owner)
    assert hidden_list_res2.status_code == 200
    assert len(hidden_list_res2.json()) == 0


@pytest.mark.asyncio
async def test_mongodb_optimization_features(client: AsyncClient, test_db_clean):
    db = test_db_clean

    # 1. Signup owner
    owner_payload = {
        "full_name": "Bob Optimizer",
        "email": "bob@optim.com",
        "workspace_name": "Optim Corp",
        "workspace_slug": "optim",
        "password": "securepassword123"
    }
    signup_res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    headers_owner = {"Authorization": f"Bearer {signup_data['access_token']}"}
    workspace_id = signup_data["workspace_id"]

    # 2. Create documents with search terms
    doc1_payload = {
        "title": "Quantum Architecture Deep Dive",
        "description": "High performance computing and quantum algorithms",
        "content": "MongoDB aggregation pipelines optimize data processing.",
        "tags": ["quantum", "database"]
    }
    create_res1 = await client.post("/api/v1/documents", json=doc1_payload, headers=headers_owner)
    assert create_res1.status_code == 201

    # 3. Test Aggregation Pipeline Analytics endpoint
    analytics_res = await client.get("/api/v1/documents/analytics", headers=headers_owner)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()["analytics"]
    assert analytics_data["total_documents"] >= 1
    assert "status_counts" in analytics_data
    assert "top_authors" in analytics_data

    # 4. Test Explain Plan Diagnostics endpoint
    explain_res = await client.get("/api/v1/documents/explain?query_type=list", headers=headers_owner)
    assert explain_res.status_code == 200
    explain_data = explain_res.json()["explain_diagnostics"]
    assert "winning_stage" in explain_data
    assert "used_index" in explain_data
    assert "execution_time_millis" in explain_data

    # 5. Test Transaction Context Manager Helper
    from app.utils.db import transaction_session
    async with transaction_session() as session:
        # Performs operations safely (with or without transaction session)
        await db["notifications"].insert_one(
            {"user_id": ObjectId(), "message": "Optimization active", "is_read": False},
            session=session
        )

