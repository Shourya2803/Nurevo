import logging
from bson import ObjectId
from app.utils.event_bus import event_bus
from app.utils.db import get_database
from app.services.notification import NotificationService
from app.repositories.user import UserRepository
from app.repositories.team import TeamRepository
from app.repositories.document import DocumentRepository

logger = logging.getLogger("nuvero.notification_handlers")

def get_services():
    db = get_database()
    return NotificationService(db), UserRepository(db), TeamRepository(db), DocumentRepository(db)

# 1. Document Submitted
async def handle_document_submitted(data: dict):
    try:
        notify_service, user_repo, team_repo, _ = get_services()
        document_id = data["document_id"]
        workspace_id = data["workspace_id"]
        team_id = data.get("team_id")
        author_id = data["author_id"]
        title = data["title"]

        author = await user_repo.get_by_id(author_id)
        author_name = author.full_name if author else "A member"

        notify_owners = False
        leads = set()

        if team_id:
            team = await team_repo.get_by_id(team_id)
            if team:
                if team.team_lead_id:
                    leads.add(str(team.team_lead_id))
                if team.lead_ids:
                    for l in team.lead_ids:
                        leads.add(str(l))
            
            if not team or not leads:
                notify_owners = True
        else:
            notify_owners = True

        if notify_owners:
            # Notify all workspace Owners (Admins)
            owners = await user_repo.get_all({"workspace_id": ObjectId(workspace_id), "role": "owner"})
            for owner in owners:
                if str(owner.id) == author_id:
                    continue
                await notify_service.create_notification(
                    recipient_id=str(owner.id),
                    sender_id=author_id,
                    workspace_id=workspace_id,
                    team_id=team_id,
                    type="DOCUMENT_SUBMITTED",
                    title="New Workspace Document Submission",
                    message=f"{author_name} submitted a new document '{title}' for approval.",
                    priority="NORMAL",
                    data={
                        "document_id": document_id,
                        "workspace_id": workspace_id,
                        "redirect_url": f"/dashboard/documents?id={document_id}"
                    }
                )
        else:
            # Notify the assigned team leads
            for lead_id in leads:
                if lead_id == author_id:
                    continue
                await notify_service.create_notification(
                    recipient_id=lead_id,
                    sender_id=author_id,
                    workspace_id=workspace_id,
                    team_id=team_id,
                    type="DOCUMENT_SUBMITTED",
                    title="New Document Submission",
                    message=f"{author_name} submitted a new document '{title}' for approval.",
                    priority="NORMAL",
                    data={
                        "document_id": document_id,
                        "workspace_id": workspace_id,
                        "redirect_url": f"/dashboard/documents?id={document_id}"
                    }
                )
    except Exception as e:
        logger.error(f"Error in handle_document_submitted: {e}")

# 2. Document Approved
async def handle_document_approved(data: dict):
    try:
        notify_service, user_repo, team_repo, _ = get_services()
        document_id = data["document_id"]
        workspace_id = data["workspace_id"]
        team_id = data.get("team_id")
        author_id = data["author_id"]
        approver_id = data["approver_id"]
        approver_role = data["approver_role"]
        new_status = data["new_status"]
        title = data["title"]

        if new_status == "pending_admin":
            # Document approved by Team Lead, pending Admin
            # Notify Workspace Admins (Owners)
            owners = await user_repo.get_all({"workspace_id": ObjectId(workspace_id), "role": "owner"})
            for owner in owners:
                if str(owner.id) == approver_id:
                    continue
                await notify_service.create_notification(
                    recipient_id=str(owner.id),
                    sender_id=approver_id,
                    workspace_id=workspace_id,
                    team_id=team_id,
                    type="DOCUMENT_APPROVED",
                    title="Document Pending Admin Approval",
                    message=f"Document '{title}' approved by Team Lead and is pending your final approval.",
                    priority="NORMAL",
                    data={
                        "document_id": document_id,
                        "workspace_id": workspace_id,
                        "redirect_url": f"/dashboard/documents?id={document_id}"
                    }
                )
        elif new_status == "approved":
            # Approved by Admin. Notify Author
            await notify_service.create_notification(
                recipient_id=author_id,
                sender_id=approver_id,
                workspace_id=workspace_id,
                team_id=team_id,
                type="DOCUMENT_APPROVED",
                title="Document Approved",
                message=f"Your document '{title}' has been approved.",
                priority="NORMAL",
                data={
                    "document_id": document_id,
                    "workspace_id": workspace_id,
                    "redirect_url": f"/dashboard/documents?id={document_id}"
                }
            )

            # Notify Team Lead if there is one
            if team_id:
                team = await team_repo.get_by_id(team_id)
                if team:
                    leads = set()
                    if team.team_lead_id:
                        leads.add(str(team.team_lead_id))
                    if team.lead_ids:
                        for l in team.lead_ids:
                            leads.add(str(l))
                    for lead_id in leads:
                        if lead_id == approver_id:
                            continue
                        await notify_service.create_notification(
                            recipient_id=lead_id,
                            sender_id=approver_id,
                            workspace_id=workspace_id,
                            team_id=team_id,
                            type="DOCUMENT_APPROVED",
                            title="Document Approved by Admin",
                            message=f"Admin approved the document '{title}'.",
                            priority="NORMAL",
                            data={
                                "document_id": document_id,
                                "workspace_id": workspace_id,
                                "redirect_url": f"/dashboard/documents?id={document_id}"
                            }
                        )
    except Exception as e:
        logger.error(f"Error in handle_document_approved: {e}")

# 3. Document Rejected
async def handle_document_rejected(data: dict):
    try:
        notify_service, user_repo, team_repo, _ = get_services()
        document_id = data["document_id"]
        workspace_id = data["workspace_id"]
        team_id = data.get("team_id")
        author_id = data["author_id"]
        rejecter_id = data["rejecter_id"]
        rejecter_role = data["rejecter_role"]
        reason = data["reason"]
        title = data["title"]

        # Notify Author (Uploader)
        await notify_service.create_notification(
            recipient_id=author_id,
            sender_id=rejecter_id,
            workspace_id=workspace_id,
            team_id=team_id,
            type="DOCUMENT_REJECTED",
            title="Document Rejected",
            message=f"Your document '{title}' was rejected. Reason: {reason}",
            priority="HIGH",
            data={
                "document_id": document_id,
                "workspace_id": workspace_id,
                "comment": reason,
                "redirect_url": f"/dashboard/documents?id={document_id}"
            }
        )

        # If rejected by Admin, also notify Team Lead
        if rejecter_role == "owner" and team_id:
            team = await team_repo.get_by_id(team_id)
            if team:
                leads = set()
                if team.team_lead_id:
                    leads.add(str(team.team_lead_id))
                if team.lead_ids:
                    for l in team.lead_ids:
                        leads.add(str(l))
                for lead_id in leads:
                    if lead_id == rejecter_id:
                        continue
                    await notify_service.create_notification(
                        recipient_id=lead_id,
                        sender_id=rejecter_id,
                        workspace_id=workspace_id,
                        team_id=team_id,
                        type="DOCUMENT_REJECTED",
                        title="Document Rejected by Admin",
                        message=f"Admin rejected the document '{title}'. Reason: {reason}",
                        priority="NORMAL",
                        data={
                            "document_id": document_id,
                            "workspace_id": workspace_id,
                            "comment": reason,
                            "redirect_url": f"/dashboard/documents?id={document_id}"
                        }
                    )
    except Exception as e:
        logger.error(f"Error in handle_document_rejected: {e}")

# 4. Document Resubmitted
async def handle_document_resubmitted(data: dict):
    try:
        notify_service, user_repo, team_repo, _ = get_services()
        document_id = data["document_id"]
        workspace_id = data["workspace_id"]
        team_id = data.get("team_id")
        author_id = data["author_id"]
        title = data["title"]

        author = await user_repo.get_by_id(author_id)
        author_name = author.full_name if author else "A member"

        if team_id:
            team = await team_repo.get_by_id(team_id)
            if team:
                leads = set()
                if team.team_lead_id:
                    leads.add(str(team.team_lead_id))
                if team.lead_ids:
                    for l in team.lead_ids:
                        leads.add(str(l))
                for lead_id in leads:
                    if lead_id == author_id:
                        continue
                    await notify_service.create_notification(
                        recipient_id=lead_id,
                        sender_id=author_id,
                        workspace_id=workspace_id,
                        team_id=team_id,
                        type="DOCUMENT_RESUBMITTED",
                        title="Document Resubmitted",
                        message=f"{author_name} resubmitted the corrected document '{title}'.",
                        priority="NORMAL",
                        data={
                            "document_id": document_id,
                            "workspace_id": workspace_id,
                            "redirect_url": f"/dashboard/documents?id={document_id}"
                        }
                    )
    except Exception as e:
        logger.error(f"Error in handle_document_resubmitted: {e}")

# 5. Announcement Created
async def handle_announcement_created(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        announcement_id = data["announcement_id"]
        workspace_id = data["workspace_id"]
        title = data["title"]
        message = data["message"]
        sender_id = data.get("sender_id")

        await notify_service.broadcast_announcement(
            sender_id=sender_id,
            workspace_id=workspace_id,
            title=title,
            message=message,
            data={
                "announcement_id": announcement_id,
                "workspace_id": workspace_id,
                "redirect_url": f"/dashboard/announcements?id={announcement_id}"
            }
        )
    except Exception as e:
        logger.error(f"Error in handle_announcement_created: {e}")

# 6. Invitation Accepted
async def handle_invitation_accepted(data: dict):
    try:
        notify_service, user_repo, _, _ = get_services()
        workspace_id = data["workspace_id"]
        user_id = data["user_id"]

        user = await user_repo.get_by_id(user_id)
        user_name = user.full_name if user else "New Member"

        # Notify Workspace Admin (Owner)
        owners = await user_repo.get_all({"workspace_id": ObjectId(workspace_id), "role": "owner"})
        for owner in owners:
            await notify_service.create_notification(
                recipient_id=str(owner.id),
                sender_id=user_id,
                workspace_id=workspace_id,
                type="WORKSPACE",
                title="Invitation Accepted",
                message=f"{user_name} has accepted your invitation and joined the workspace.",
                priority="NORMAL",
                data={
                    "workspace_id": workspace_id,
                    "redirect_url": f"/dashboard/teams"
                }
            )
    except Exception as e:
        logger.error(f"Error in handle_invitation_accepted: {e}")

# 7. Team Lead Assigned
async def handle_team_lead_assigned(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        team_id = data["team_id"]
        workspace_id = data["workspace_id"]
        lead_id = data["lead_id"]
        assigned_by_id = data["assigned_by_id"]
        team_name = data["team_name"]

        await notify_service.create_notification(
            recipient_id=lead_id,
            sender_id=assigned_by_id,
            workspace_id=workspace_id,
            team_id=team_id,
            type="TEAM",
            title="Assigned as Team Lead",
            message=f"You have been assigned as the Lead for team '{team_name}'.",
            priority="NORMAL",
            data={
                "team_id": team_id,
                "workspace_id": workspace_id,
                "redirect_url": f"/dashboard/teams"
            }
        )
    except Exception as e:
        logger.error(f"Error in handle_team_lead_assigned: {e}")

# 8. Team Member Added
async def handle_team_member_added(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        team_id = data["team_id"]
        workspace_id = data["workspace_id"]
        member_id = data["member_id"]
        added_by_id = data["added_by_id"]
        team_name = data["team_name"]

        await notify_service.create_notification(
            recipient_id=member_id,
            sender_id=added_by_id,
            workspace_id=workspace_id,
            team_id=team_id,
            type="TEAM",
            title="Added to Team",
            message=f"You have been added to the team '{team_name}'.",
            priority="NORMAL",
            data={
                "team_id": team_id,
                "workspace_id": workspace_id,
                "redirect_url": f"/dashboard/teams"
            }
        )
    except Exception as e:
        logger.error(f"Error in handle_team_member_added: {e}")

# 9. Team Member Removed
async def handle_team_member_removed(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        team_id = data["team_id"]
        workspace_id = data["workspace_id"]
        member_id = data["member_id"]
        removed_by_id = data["removed_by_id"]
        team_name = data["team_name"]

        await notify_service.create_notification(
            recipient_id=member_id,
            sender_id=removed_by_id,
            workspace_id=workspace_id,
            team_id=team_id,
            type="TEAM",
            title="Removed from Team",
            message=f"You have been removed from the team '{team_name}'.",
            priority="NORMAL",
            data={
                "team_id": team_id,
                "workspace_id": workspace_id,
                "redirect_url": f"/dashboard/teams"
            }
        )
    except Exception as e:
        logger.error(f"Error in handle_team_member_removed: {e}")

# 10. Security Events (Password, Email, Suspicious Login)
async def handle_security_event(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        user_id = data["user_id"]
        workspace_id = data["workspace_id"]
        event_subtype = data["subtype"]  # password_changed | email_changed | suspicious_login

        if event_subtype == "password_changed":
            await notify_service.create_notification(
                recipient_id=user_id,
                workspace_id=workspace_id,
                type="SECURITY",
                title="Security Alert: Password Changed",
                message="Your account password was recently changed. If this wasn't you, please contact support immediately.",
                priority="HIGH",
                data={
                    "workspace_id": workspace_id,
                    "redirect_url": f"/dashboard/settings"
                }
            )
        elif event_subtype == "email_changed":
            await notify_service.create_notification(
                recipient_id=user_id,
                workspace_id=workspace_id,
                type="SECURITY",
                title="Security Alert: Email Changed",
                message="Your account email address was recently updated.",
                priority="HIGH",
                data={
                    "workspace_id": workspace_id,
                    "redirect_url": f"/dashboard/settings"
                }
            )
        elif event_subtype == "suspicious_login":
            ip = data.get("ip_address", "Unknown")
            device = data.get("device", "Unknown device")
            await notify_service.create_notification(
                recipient_id=user_id,
                workspace_id=workspace_id,
                type="SECURITY",
                title="Security Alert: Suspicious Login Detected",
                message=f"We detected a suspicious login attempt from IP {ip} using {device}.",
                priority="URGENT",
                data={
                    "workspace_id": workspace_id,
                    "redirect_url": f"/dashboard/settings",
                    "metadata": {"ip": ip, "device": device}
                }
            )
    except Exception as e:
        logger.error(f"Error in handle_security_event: {e}")

# 11. Member Role Updated (Promotion / Demotion)
async def handle_member_role_updated(data: dict):
    try:
        notify_service, _, _, _ = get_services()
        workspace_id = data["workspace_id"]
        user_id = data["user_id"]
        old_role = data["old_role"]
        new_role = data["new_role"]
        updated_by = data.get("updated_by")

        role_names = {
            "owner": "Workspace Owner",
            "lead": "Team Lead",
            "member": "Team Member"
        }
        old_display = role_names.get(old_role, old_role)
        new_display = role_names.get(new_role, new_role)

        title = "Role Promoted" if (new_role == "lead" or (new_role == "owner" and old_role != "owner")) else "Role Updated"
        message = f"Your role has been updated from {old_display} to {new_display}."

        await notify_service.create_notification(
            recipient_id=user_id,
            sender_id=updated_by,
            workspace_id=workspace_id,
            type="ROLE_UPDATED",
            title=title,
            message=message,
            priority="HIGH",
            data={
                "workspace_id": workspace_id,
                "old_role": old_role,
                "new_role": new_role,
                "redirect_url": "/dashboard/settings"
            }
        )
    except Exception as e:
        logger.error(f"Error in handle_member_role_updated: {e}")

# Register all handlers to EventBus
def register_notification_handlers():
    event_bus.subscribe("document_submitted", handle_document_submitted)
    event_bus.subscribe("document_approved", handle_document_approved)
    event_bus.subscribe("document_rejected", handle_document_rejected)
    event_bus.subscribe("document_resubmitted", handle_document_resubmitted)
    event_bus.subscribe("announcement_created", handle_announcement_created)
    event_bus.subscribe("invitation_accepted", handle_invitation_accepted)
    event_bus.subscribe("team_lead_assigned", handle_team_lead_assigned)
    event_bus.subscribe("team_member_added", handle_team_member_added)
    event_bus.subscribe("team_member_removed", handle_team_member_removed)
    event_bus.subscribe("security_event", handle_security_event)
    event_bus.subscribe("member_role_updated", handle_member_role_updated)
    logger.info("Notification event handlers registered to EventBus successfully.")
