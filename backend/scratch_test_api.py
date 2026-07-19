import asyncio
import sys
import os
import httpx

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.utils.config import settings
from app.utils.db import db_manager
from app.utils.security import create_access_token
from app.repositories.user import UserRepository

async def main():
    print("Connecting to DB...")
    db_manager.connect_to_database()
    db = db_manager.db
    
    user_repo = UserRepository(db)
    # Get the last registered user in the DB
    users = await user_repo.get_all({}, limit=5, sort=[("_id", -1)])
    if not users:
        print("No users found in database.")
        db_manager.close_database_connection()
        return
        
    user = users[0]
    print(f"Found user: ID={user.id}, email={user.email}, role={user.role}, status={user.status}")
    
    # Generate access token
    token = create_access_token(user.id)
    print(f"Generated access token: {token}")
    
    # Make GET request to /api/v1/teams
    print("Requesting GET /api/v1/teams...")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get("http://localhost:8000/api/v1/teams", headers=headers, timeout=5.0)
            print(f"Status: {res.status_code}")
            print(f"Body: {res.text}")
        except Exception as e:
            print(f"Request failed: {e}")
            
    db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(main())
