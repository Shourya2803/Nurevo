from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.db import get_database
from app.services.auth import AuthService
from app.schemas.auth import (
    OwnerSignUpRequest,
    LoginRequest,
    TokenSchema,
    UserSchemaOut,
    WorkspaceSchemaOut,
    ClerkLoginRequest,
    ClerkSignUpRequest,
    ClerkAuthResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuthService:
    return AuthService(db)

@router.post(
    "/signup",
    response_model=TokenSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as Workspace Owner"
)
async def signup_owner(
    payload: OwnerSignUpRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Registers the Owner user, creates their workspace, and returns a JWT access token immediately.
    """
    access_token, user, workspace = await auth_service.sign_up_owner(payload)
    return TokenSchema(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=str(workspace.id),
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        workspace_settings=workspace.settings
    )

@router.post(
    "/login",
    response_model=TokenSchema,
    status_code=status.HTTP_200_OK,
    summary="Login with Email and Password"
)
async def login_user(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticates a user via email and password, returning a JWT token and profile details.
    """
    access_token, user, workspace = await auth_service.authenticate_user(payload.email, payload.password)
    return TokenSchema(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=str(workspace.id),
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        workspace_settings=workspace.settings
    )

@router.post(
    "/clerk",
    response_model=ClerkAuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with Clerk Session Token"
)
async def clerk_login(
    payload: ClerkLoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verifies the Clerk token and logs the user in if they already have an account.
    If they do not exist, returns registered=False and their profile info so they can select a workspace.
    """
    registered, access_token, user, workspace, clerk_payload = await auth_service.authenticate_clerk_user(payload.token)
    if registered:
        token_data = TokenSchema(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            workspace_id=str(workspace.id),
            workspace_name=workspace.name,
            workspace_slug=workspace.slug,
            workspace_settings=workspace.settings
        )
        return ClerkAuthResponse(registered=True, token=token_data)
    else:
        emails = clerk_payload.get("email_addresses", [])
        email = emails[0].get("email_address") if emails else None
        first_name = clerk_payload.get("first_name") or ""
        last_name = clerk_payload.get("last_name") or ""
        full_name = f"{first_name} {last_name}".strip() or "Clerk User"
        return ClerkAuthResponse(
            registered=False,
            email=email,
            full_name=full_name
        )

@router.post(
    "/clerk/signup",
    response_model=TokenSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create Workspace and Owner Account via Clerk Signup"
)
async def clerk_signup(
    payload: ClerkSignUpRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verifies Clerk ID token and creates a new workspace and owner user account.
    """
    access_token, user, workspace = await auth_service.sign_up_clerk_owner(payload)
    return TokenSchema(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=str(workspace.id),
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        workspace_settings=workspace.settings
    )

@router.get(
    "/verify/status",
    status_code=status.HTTP_200_OK,
    summary="Check Invitation/Magic Link Token Status"
)
async def check_token_status(
    token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Checks if a token is valid and returns its type and status.
    """
    return await auth_service.check_token_status(token)

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
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=str(workspace.id),
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        workspace_settings=workspace.settings
    )
