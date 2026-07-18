import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Force setting environment to test prior to any other loads
import os
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGO_DB_NAME"] = "nurevo_test_db"

from app.utils.config import settings
from app.utils.db import db_manager, get_database, init_db_indexes
from main import app

@pytest.fixture(scope="session")
def event_loop():
    """
    Creates a session-wide event loop for running asynchronous database fixtures.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Session-wide fixture that connects to a mocked in-memory MongoDB database.
    """
    from mongomock_motor import AsyncMongoMockClient
    mock_client = AsyncMongoMockClient()
    db_manager.client = mock_client
    db_manager.db = mock_client[settings.MONGO_DB_NAME]
    
    # Disable actual network connection commands
    db_manager.connect_to_database = lambda: None
    db_manager.close_database_connection = lambda: None
    
    db = db_manager.db
    # Initialize indexes in mock database
    await init_db_indexes()
    
    yield db
    
    # Cleanup DB after run
    await db_manager.client.drop_database(settings.MONGO_DB_NAME)

@pytest.fixture
async def client():
    """
    Asynchronous httpx Client fixture to execute API requests against the FastAPI app.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_db_clean():
    """
    Cleans collections between tests to prevent pollution.
    """
    db = get_database()
    collections = await db.list_collection_names()
    for col in collections:
        if not col.startswith("system."):
            await db[col].delete_many({})
    yield db
