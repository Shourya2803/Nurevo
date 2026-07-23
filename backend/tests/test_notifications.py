import pytest
import asyncio
from httpx import AsyncClient
from app.utils.db import get_database
from app.utils.event_bus import event_bus
from app.utils.metrics import metrics_manager
from app.utils.security import create_access_token
from bson import ObjectId
from app.models.user import User
from app.services.notification_handlers import register_notification_handlers

@pytest.mark.asyncio
async def test_notification_lifecycle_and_api(client: AsyncClient, test_db_clean):
    db = test_db_clean
    
    # Explicitly register notification handlers for tests
    register_notification_handlers()

    # 1. Setup a Workspace, an Owner and a Team Lead
    owner_payload = {
        "full_name": "Workspace Owner",
        "email": "owner@notificationtest.com",
        "workspace_name": "Notification Workspace",
        "workspace_slug": "notif-ws",
        "password": "securepassword"
    }
    signup_res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    owner_token = signup_res.json()["access_token"]
    workspace_id = signup_res.json()["workspace_id"]
    owner_id = signup_res.json()["user_id"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # Create a Member/Lead
    lead_id = ObjectId()
    lead_user = User(
        _id=lead_id,
        email="lead@notificationtest.com",
        full_name="Team Lead",
        role="lead",
        status="active",
        workspace_id=ObjectId(workspace_id)
    )
    await db["users"].insert_one(lead_user.to_mongo())
    lead_token = create_access_token(str(lead_id))
    lead_headers = {"Authorization": f"Bearer {lead_token}"}

    # Create a Member
    member_id = ObjectId()
    member_user = User(
        _id=member_id,
        email="member@notificationtest.com",
        full_name="Team Member",
        role="member",
        status="active",
        workspace_id=ObjectId(workspace_id)
    )
    await db["users"].insert_one(member_user.to_mongo())

    # Create a Team
    team_payload = {
        "name": "Testing Team",
        "description": "Team for notification testing"
    }
    team_res = await client.post("/api/v1/teams", json=team_payload, headers=owner_headers)
    assert team_res.status_code == 201
    team_id = team_res.json()["team"]["id"]

    # Assign lead
    assign_lead_res = await client.post(
        f"/api/v1/teams/{team_id}/lead", 
        json={"team_lead_id": str(lead_id)}, 
        headers=owner_headers
    )
    assert assign_lead_res.status_code == 200

    # Add member
    add_member_res = await client.post(
        f"/api/v1/teams/{team_id}/members",
        json={"user_id": str(member_id)},
        headers=owner_headers
    )
    assert add_member_res.status_code == 200

    # Give the background tasks a moment to process the team lead/member events
    await asyncio.sleep(0.3)

    # 2. Check if team notifications were created
    notifications_cursor = db["notifications"].find({"workspace_id": ObjectId(workspace_id)})
    notifications = await notifications_cursor.to_list(length=100)
    assert len(notifications) > 0

    # Clean notifications for next step
    await db["notifications"].delete_many({})

    # 3. Simulate a Document Lifecycle Event (Submitted -> Approved -> Rejected)
    # Publish document_submitted
    doc_id = str(ObjectId())
    await event_bus.publish("document_submitted", {
        "document_id": doc_id,
        "workspace_id": workspace_id,
        "team_id": team_id,
        "author_id": str(member_id),
        "title": "Confidential Report"
    })
    
    # Allow background event handler to save notification
    await asyncio.sleep(0.3)

    # Check notification for Team Lead
    notif_list = await db["notifications"].find({"workspace_id": ObjectId(workspace_id)}).to_list(100)
    recipients = [str(n["recipient_id"]) for n in notif_list]
    assert str(lead_id) in recipients

    # Check unread count API endpoint for lead
    unread_res = await client.get("/api/v1/notifications/unread-count", headers=lead_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1

    # List notifications endpoint for lead
    list_res = await client.get("/api/v1/notifications", headers=lead_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    notif_id = list_res.json()[0]["id"]

    # Try accessing lead's notification using owner credentials (should fail with 404/Forbidden)
    forbidden_read_res = await client.patch(f"/api/v1/notifications/{notif_id}/read", headers=owner_headers)
    assert forbidden_read_res.status_code == 404

    # Mark as read endpoint for lead
    read_res = await client.patch(f"/api/v1/notifications/{notif_id}/read", headers=lead_headers)
    assert read_res.status_code == 200
    assert read_res.json()["notification_id"] == notif_id

    # Verify unread count is now 0 for lead
    unread_res = await client.get("/api/v1/notifications/unread-count", headers=lead_headers)
    assert unread_res.json()["unread_count"] == 0

    # Mark all as read endpoint for lead
    mark_all_res = await client.patch("/api/v1/notifications/read-all", headers=lead_headers)
    assert mark_all_res.status_code == 200
    assert mark_all_res.json()["count"] >= 0

    # Delete notification endpoint for lead
    delete_res = await client.delete(f"/api/v1/notifications/{notif_id}", headers=lead_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["notification_id"] == notif_id

    # 4. Check Metrics Endpoint
    metrics_res = await client.get("/api/v1/notifications/metrics/json")
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "notifications_created" in metrics_data
    assert metrics_data["notifications_created"] > 0

    # Check Prometheus format metrics
    prom_res = await client.get("/api/v1/notifications/metrics/prometheus")
    assert prom_res.status_code == 200
    assert "nurevo_notifications_created_total" in prom_res.text


@pytest.mark.asyncio
async def test_websocket_authentication(client: AsyncClient, test_db_clean):
    # Setup owner and headers
    owner_payload = {
        "full_name": "WS Owner",
        "email": "wsowner@notificationtest.com",
        "workspace_name": "WS Workspace",
        "workspace_slug": "ws-notif",
        "password": "securepassword"
    }
    signup_res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    owner_token = signup_res.json()["access_token"]

    from fastapi.testclient import TestClient
    from starlette.websockets import WebSocketDisconnect
    from main import app
    
    with TestClient(app) as test_client:
        # Invalid token should fail/disconnect
        with test_client.websocket_connect("/api/v1/notifications/ws?token=invalid_token") as websocket:
            with pytest.raises(WebSocketDisconnect):
                websocket.receive_json()
        
        # Valid token should connect
        with test_client.websocket_connect(f"/api/v1/notifications/ws?token={owner_token}") as websocket:
            # Send ping
            websocket.send_json({"type": "ping"})
            data = websocket.receive_json()
            assert data["type"] == "pong"


@pytest.mark.asyncio
async def test_member_promotion_notification(client: AsyncClient, test_db_clean):
    db = test_db_clean
    register_notification_handlers()

    owner_payload = {
        "full_name": "Workspace Owner",
        "email": "owner_promo@notificationtest.com",
        "workspace_name": "Promo Workspace",
        "workspace_slug": "promo-ws",
        "password": "securepassword"
    }
    signup_res = await client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    owner_token = signup_res.json()["access_token"]
    workspace_id = signup_res.json()["workspace_id"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    member_id = ObjectId()
    member_user = User(
        _id=member_id,
        email="member_promo@notificationtest.com",
        full_name="Promo Member",
        role="member",
        status="active",
        workspace_id=ObjectId(workspace_id)
    )
    await db["users"].insert_one(member_user.to_mongo())

    promo_payload = {
        "role": "lead",
        "status": "active"
    }
    promo_res = await client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{str(member_id)}/role",
        json=promo_payload,
        headers=owner_headers
    )
    assert promo_res.status_code == 200

    await asyncio.sleep(0.3)

    notif = await db["notifications"].find_one({
        "recipient_id": member_id,
        "type": "ROLE_UPDATED"
    })
    assert notif is not None
    assert notif["title"] == "Role Promoted"
    assert "lead" in notif["message"].lower()
