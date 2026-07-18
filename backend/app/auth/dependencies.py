from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils.db import get_database
from app.utils.security import decode_access_token
from app.repositories.user import UserRepository
from app.models.user import User

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    """
    Validates the bearer token, retrieves the corresponding user record, and asserts active status.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please check your verification status.",
        )
        
    return user

class RequireRoles:
    """
    RBAC dependency factory that asserts user belongs to allowed roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Insufficient permissions."
            )
        return current_user

def enforce_workspace_isolation(requested_workspace_id: str, current_user: User = Depends(get_current_user)) -> None:
    """
    Validates that the authenticated user belongs to the workspace they are requesting.
    """
    if str(current_user.workspace_id) != requested_workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access forbidden. You cannot view resources of this workspace."
        )
