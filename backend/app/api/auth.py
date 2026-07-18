from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.db import get_database
from app.services.auth import AuthService
from app.schemas.auth import OwnerSignUpRequest, MagicLoginRequest, TokenSchema, UserSchemaOut, WorkspaceSchemaOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuthService:
    return AuthService(db)

@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as Workspace Owner"
)
async def signup_owner(
    payload: OwnerSignUpRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Initializes workspace creation and registers the Owner user in a 'pending' state.
    Triggers an email with a Magic Login link.
    """
    await auth_service.sign_up_owner(payload)
    return {
        "message": "Workspace creation initiated. Please check your email to activate your account."
    }

@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    summary="Request a Magic Login Link"
)
async def request_login(
    payload: MagicLoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Sends a magic login link to the user's email if the email is registered and active.
    """
    await auth_service.send_login_magic_link(payload.email)
    return {
        "message": "If the email is registered, we have sent a login link. Please check your inbox."
    }

@router.get(
    "/verify",
    response_model=TokenSchema,
    status_code=status.HTTP_200_OK,
    summary="Verify Magic Link Token"
)
async def verify_token(
    token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verifies the magic link token, activates pending accounts, and returns a JWT access token.
    """
    access_token, user, workspace = await auth_service.verify_magic_link(token)
    return TokenSchema(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        workspace_id=str(workspace.id),
        role=user.role
    )
